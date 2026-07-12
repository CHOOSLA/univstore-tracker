// 랜덤 100개 상품 최저가 매칭 검증. dashboard 컨테이너에서 실행(NAVER/EMBED env 사용).
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const strip = s => s.replace(/<[^>]+>/g, '').trim();
const cleanTitle = s => s.replace(/[\[\(【][^\]\)】]*[\]\)】]/g, ' ').replace(/\s+/g, ' ').trim();
const GENERIC = new Set(['블루투스','무선','유선','이어폰','헤드폰','이어버드','노트북','태블릿','스마트폰','모니터','키보드','마우스','충전기','케이블','스피커','정품','공식','모델','단품','세트','블랙','화이트','실버','골드','그레이','그라파이트','블루','레드','퍼플','핑크','그린','네이비','베이지','브라운','옐로우','로즈','미드나이트','박스','1박스']);
const tok = s => s.replace(/[^0-9A-Za-z가-힣]+/g, ' ').split(/\s+/).map(t => t.toLowerCase()).filter(t => t.length >= 2);
const isRealCode = c => !!c && /[A-Za-z]/.test(c) && c.replace(/[^0-9A-Za-z]/g, '').length >= 4;
const buildQuery = (title, brand) => { const t = tok(title).filter(x => !GENERIC.has(x)).slice(0, 5); return [...new Set([(brand||'').toLowerCase(), ...t])].filter(Boolean).join(' ').trim(); };
function specTokens(title) { const s=[]; const up=title.toUpperCase(); for (const m of up.matchAll(/(\d+)\s?(TB|GB)\b/g)) s.push(m[1]+m[2]); for (const m of title.matchAll(/(\d+(?:\.\d+)?)\s?(인치|INCH|"|cm)/gi)) { const u=/인치|inch|"/i.test(m[2])?'IN':'CM'; s.push(m[1].replace(/\.0$/,'')+u);} return [...new Set(s)]; }
const MIN_SIM=0.55, MARGIN=0.12;

async function fetchNaver(q) {
  if (!q) return [];
  const r = await fetch(`https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(q)}&display=30&sort=sim`, { headers: { 'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID, 'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET } });
  if (!r.ok) return [];
  return (await r.json()).items || [];
}
async function rerank(q, cands) {
  if (!cands.length) return [];
  const r = await fetch(`${process.env.EMBED_URL}/rerank`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, candidates: cands }) });
  return r.ok ? (await r.json()).scores : [];
}

async function compare(code, rawTitle, cur, orig, brand) {
  const base = Math.max(cur||0, orig||0); if (base<=0) return {matched:false};
  const lo = Math.min(cur||base, orig||base)*0.5, hi = base*1.4;
  const title = cleanTitle(rawTitle);
  const codeQuery = isRealCode(code) ? [(brand||'').toLowerCase(), code].filter(Boolean).join(' ') : '';
  const raw = await fetchNaver(codeQuery || buildQuery(title, brand));
  if (raw.length < 8) raw.push(...(await fetchNaver(buildQuery(title, brand))));
  const seen = new Set();
  const cands = raw.map(it => ({ mall: it.mallName, price: +it.lprice, title: strip(it.title) }))
    .filter(m => m.price>=lo && m.price<=hi)
    .filter(m => { const k=m.title+m.mall; if(seen.has(k))return false; seen.add(k); return true; });
  if (!cands.length) return { matched:false, reason:'no-band' };
  const scores = await rerank(title, cands.map(c => c.title));
  if (scores.length !== cands.length) return { matched:false, reason:'embed-fail' };
  cands.forEach((c,i)=>c.sim=scores[i]);
  const top = Math.max(...scores);
  if (top < MIN_SIM) return { matched:false, reason:'low-sim', top:top.toFixed(2) };
  let kept = cands.filter(c => c.sim >= Math.max(MIN_SIM, top-MARGIN));
  const ws = specTokens(title);
  if (ws.length) { const sm = kept.filter(c => { const cs=specTokens(c.title); return cs.length && ws.every(s=>cs.includes(s)); }); if (sm.length) kept=sm; }
  if (isRealCode(code)) { const norm=s=>s.toUpperCase().replace(/[^0-9A-Z]/g,''); const nc=norm(code); const cm=kept.filter(c=>norm(c.title).includes(nc)); if(cm.length)kept=cm; }
  kept.sort((a,b)=>a.price-b.price);
  return { matched:true, top:top.toFixed(2), best:kept[0], nkept:kept.length };
}

(async () => {
  const total = await prisma.product.count({ where: { stockStatus: 'In Stock', imageUrl: { not: null } } });
  const sample = [];
  const picks = new Set();
  while (picks.size < 100) picks.add(Math.floor(Math.random()*total));
  const rows = await prisma.product.findMany({ where: { stockStatus:'In Stock', imageUrl:{not:null} }, select:{ id:true, title:true, brand:true, currentPrice:true, originalPrice:true }, orderBy:{ id:'asc' } });
  const chosen = [...picks].map(i => rows[i]).filter(Boolean);

  let matched=0, unmatched=0, suspicious=0;
  const bad=[];
  for (const p of chosen) {
    let code=''; try { const r=await fetch(`https://web-api.univstore.com/api/v1/items/${p.id}`,{headers:{Referer:`https://www.univstore.com/item/${p.id}`}}); if(r.ok) code=(await r.json())?.result?.item?.code||''; } catch{}
    const res = await compare(code, p.title, Number(p.currentPrice||0), Number(p.originalPrice||0), p.brand||'');
    if (!res.matched) { unmatched++; continue; }
    matched++;
    // 의심 판정: 최고 매칭 타이틀이 상품 브랜드/핵심토큰과 안 겹치면 오매칭 의심
    const ptoks = new Set(tok(cleanTitle(p.title)+' '+(p.brand||'')));
    const overlap = tok(res.best.title).some(t => ptoks.has(t));
    if (!overlap || res.top < 0.6) { suspicious++; bad.push(`${p.id} sim${res.top} | ${p.title.slice(0,28)} → ${res.best.title.slice(0,32)} ₩${res.best.price.toLocaleString()}`); }
  }
  console.log(`\n===== 검증 결과 (${chosen.length}개) =====`);
  console.log(`매칭 표시: ${matched} | 숨김(미매칭): ${unmatched}`);
  console.log(`매칭 중 의심(토큰불일치/저유사도): ${suspicious}`);
  console.log(`\n의심 사례:`); bad.slice(0,20).forEach(b=>console.log(' ⚠ '+b));
  await prisma.$disconnect(); process.exit(0);
})();

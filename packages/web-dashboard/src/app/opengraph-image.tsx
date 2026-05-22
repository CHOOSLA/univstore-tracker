import { ImageResponse } from 'next/og';
import fs from 'node:fs';
import path from 'node:path';

// 로고 SVG를 빌드 시점에 base64 data URL로 한 번만 인라인 (런타임 fetch 비용 0)
const logoSvgBuffer = fs.readFileSync(path.join(process.cwd(), 'public', 'logo.svg'));
const LOGO_DATA_URL = `data:image/svg+xml;base64,${logoSvgBuffer.toString('base64')}`;

export const runtime = 'nodejs';
export const alt = 'UnivWatch — 대학생 폐쇄몰 실시간 가격 트래커';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#09090b',
          padding: '72px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top: Logo + Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_DATA_URL}
            width={64}
            height={64}
            alt="UnivWatch logo"
            style={{ borderRadius: '14px' }}
          />
          <span style={{ fontSize: '28px', fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>
            UnivWatch.
          </span>
        </div>

        {/* Center: Main Copy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              display: 'flex',
              fontSize: '72px',
              fontWeight: 900,
              color: 'white',
              lineHeight: 1.05,
              letterSpacing: '-3px',
            }}
          >
            <span>Real-Time&nbsp;</span>
            <span style={{ color: '#3b82f6', fontStyle: 'italic' }}>Insights</span>
          </div>
          <div
            style={{
              fontSize: '72px',
              fontWeight: 900,
              color: 'white',
              lineHeight: 1.05,
              letterSpacing: '-3px',
            }}
          >
            From UnivStore.
          </div>
          <div style={{ fontSize: '24px', color: '#71717a', fontWeight: 500, letterSpacing: '-0.5px' }}>
            33,000+ 상품의 가격 변동을 실시간 추적하는 마켓 인텔리전스 플랫폼
          </div>
        </div>

        {/* Bottom: Stats Row */}
        <div style={{ display: 'flex', gap: '48px', alignItems: 'flex-end' }}>
          {[
            { label: 'PRODUCTS TRACKED', value: '33,000+' },
            { label: 'DATA PIPELINE', value: 'Live' },
            { label: 'PRICE ALERTS', value: 'Active' },
          ].map((stat) => (
            <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 900, color: '#3f3f46', letterSpacing: '2px' }}>
                {stat.label}
              </span>
              <span style={{ fontSize: '28px', fontWeight: 900, color: stat.value === 'Live' ? '#22c55e' : 'white', letterSpacing: '-1px' }}>
                {stat.value}
              </span>
            </div>
          ))}

          {/* Right: URL */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#3f3f46', letterSpacing: '0.5px' }}>
              {process.env.NEXT_PUBLIC_SITE_URL?.replace('https://', '') ?? 'localhost:3000'}
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

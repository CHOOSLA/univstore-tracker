"""
상품명 의미 유사도 리랭크 서비스.
네이버 검색 결과 title들을 유니브 상품명과 임베딩 유사도로 비교 → 같은 상품만 남긴다.
규칙(액세서리 키워드/토큰겹침) 대신 의미 유사도로 매칭.
"""
import os
import torch
from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer, util

MODEL_NAME = os.environ.get("EMBED_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
device = "cuda" if torch.cuda.is_available() else "cpu"

app = FastAPI()
model = None


@app.on_event("startup")
def load():
    global model
    model = SentenceTransformer(MODEL_NAME, device=device)


class RerankReq(BaseModel):
    query: str
    candidates: list[str]


class EmbedReq(BaseModel):
    texts: list[str]


@app.post("/embed")
def embed(req: EmbedReq):
    """텍스트 배치 → 정규화 임베딩 벡터(list[float]) 반환."""
    if not req.texts:
        return {"vectors": []}
    vecs = model.encode(req.texts, convert_to_numpy=True, normalize_embeddings=True, batch_size=64)
    return {"vectors": vecs.tolist()}


@app.get("/health")
def health():
    return {"ok": model is not None, "device": device, "model": MODEL_NAME}


@app.post("/rerank")
def rerank(req: RerankReq):
    """query와 각 candidate의 코사인 유사도(0~1) 반환."""
    if not req.candidates:
        return {"scores": []}
    embs = model.encode([req.query] + req.candidates, convert_to_tensor=True, normalize_embeddings=True)
    q = embs[0:1]
    cands = embs[1:]
    sims = util.cos_sim(q, cands)[0].tolist()
    return {"scores": sims}

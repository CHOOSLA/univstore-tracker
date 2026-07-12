# GTX 1060 (Pascal, compute 6.1) 지원 위해 PyTorch CUDA 런타임 사용 (TEI는 Turing+ 필요라 미사용)
FROM pytorch/pytorch:2.2.2-cuda11.8-cudnn8-runtime

WORKDIR /app

RUN pip install --no-cache-dir \
    "fastapi==0.111.0" "uvicorn[standard]==0.30.1" \
    "sentence-transformers==2.7.0"

COPY app.py .

# 모델 캐시는 볼륨(/root/.cache)로 유지 → 재시작 시 재다운로드 없음
ENV HF_HOME=/root/.cache/huggingface

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]

# Serves Kev-4B (Kev 1.0) as a local System One-compatible inference server.
# Kev is installed from its GitHub source at a pinned ref: the PyPI package named
# `kev` is an unrelated K.E.V. ORM and must not be used.
ARG KEV_GIT_REF=kev-1.0

FROM python:3.13-slim-bookworm
ARG KEV_GIT_REF
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates libgomp1 \
 && rm -rf /var/lib/apt/lists/*

RUN pip install uv==0.9.14 \
 && git clone --depth 1 --branch "${KEV_GIT_REF}" https://github.com/jaredpalmer/kev.git /kev \
 && cd /kev \
 && uv sync --locked --extra serve

# Fused Qwen3.5 serving kernels (optional but measured; kev pins this exact version).
RUN cd /kev && uv pip install flash-linear-attention==0.5.2

ENV HF_HOME=/models/huggingface \
    KEV_TRUNCATE_STATES=0
EXPOSE 8009
WORKDIR /kev

# --device cuda fails instead of falling back to CPU (kev.serve --device semantics).
CMD ["uv", "run", "--extra", "serve", "--no-dev", "python", "-m", "kev.serve", \
     "--run", "jaredpalmer/kev-4b@v1.0", "--device", "cuda", "--host", "0.0.0.0", "--port", "8009"]

HEALTHCHECK --interval=30s --timeout=10s --retries=20 --start-period=30m \
 CMD ["python", "-c", "import json,os,urllib.request; headers=({'Authorization':'Bearer '+os.environ.get('KEV_API_KEY')} if os.environ.get('KEV_API_KEY') else {}); request=urllib.request.Request('http://127.0.0.1:8009/v1/models', headers=headers); json.load(urllib.request.urlopen(request, timeout=9))"]

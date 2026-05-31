FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    coreutils \
    findutils \
    grep \
    python3 \
    sed \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

RUN groupadd --system sandbox \
  && useradd --system --gid sandbox --home-dir /workspace --shell /usr/sbin/nologin sandbox \
  && chown sandbox:sandbox /workspace

USER sandbox

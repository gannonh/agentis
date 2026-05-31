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

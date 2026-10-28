FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl git build-essential ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install \
    --no-cache-dir \
    --default-timeout=300 \
    --retries=10 \
    -r requirements.txt

# Compilers Slither can switch between (see app/services/solc_selector.py).
# One RUN per version so a failed download is obvious in the build log.
RUN for v in 0.8.26 0.8.24 0.8.20 0.7.6 0.6.12 0.5.17 0.4.26; do solc-select install $v; done \
    && solc-select use 0.8.20

RUN curl -L https://foundry.paradigm.xyz | bash
ENV PATH="/root/.foundry/bin:${PATH}"
RUN /root/.foundry/bin/foundryup

COPY . .

RUN mkdir -p /app/exploit-engine/lib && \
    git clone --depth 1 https://github.com/foundry-rs/forge-std.git \
    /app/exploit-engine/lib/forge-std

# Warm the Foundry compiler cache so the first "Prove exploit" click is not a
# multi-minute compiler download (and so it works without outbound network).
RUN cd /app/exploit-engine && forge build || true

EXPOSE 8001
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD curl -fs http://localhost:8001/health || exit 1
CMD ["sh", "-c", "python -m app.init_db && uvicorn app.main:app --host 0.0.0.0 --port 8001"]

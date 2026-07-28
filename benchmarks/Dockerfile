# syntax=docker/dockerfile:1
FROM node:20-slim

LABEL maintainer="Academic Universe Research Team"
LABEL description="Benchmark & Evaluation Framework for DIC Document Intelligence Research"

# System deps: Tesseract OCR + poppler (pdf-to-image)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    poppler-utils \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/benchmarks

# Copy dependency manifests first (Docker layer caching)
COPY benchmarks/package.json benchmarks/package-lock.json* ./

# Install benchmark dependencies
RUN npm install --frozen-lockfile 2>/dev/null || npm install

# Copy full benchmark source
COPY benchmarks/ ./

# Verify Tesseract is available
RUN tesseract --version

# Default: run doctor check; override CMD for actual benchmark runs
CMD ["npm", "run", "doctor"]

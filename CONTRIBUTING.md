# Contributing to ADBG v1.0 & AU DIC Framework

We welcome contributions to the Academic Document Benchmark Generator (ADBG) and AU DIC Evaluation Subsystem!

## How to Contribute

1. **Fork the Repository**: Create a personal fork on GitHub.
2. **Create a Feature Branch**: `git checkout -b feature/new-credential-template`.
3. **Deterministic Seed Test**: Ensure all synthetic generation tests retain 100% deterministic pixel-exact reproducibility (`npm test`).
4. **Canonical Normalizer Test**: If adding new entity fields, verify that normalizer rules pass unit test suites without breaking existing rules.
5. **Submit a Pull Request**: Provide a clear description of changes and rationale.

## Code Standards
- **TypeScript**: Strict type checking enabled (`tsconfig.json`).
- **Python**: PEP 8 compliance for benchmark utility scripts.
- **Read-Only Invariance**: The evaluation pipeline must never mutate database state or ground truth files (`allowMockFallback: false`).

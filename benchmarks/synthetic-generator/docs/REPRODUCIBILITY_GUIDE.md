# Synthetic Generator — Reproducibility & Research Methodology Guide

## Deterministic PRNG Principles

The generator relies on the **Mulberry32** pseudo-random number generator (PRNG). Given an integer seed $S$, the output sequence of floats $f_1, f_2, \dots, f_k$ is completely deterministic across Node.js runtimes and operating systems.

$$\text{State}_{n+1} = \text{State}_n + \text{\texttt{0x6d2b79f5}}$$

## Reproducibility Guarantee

1. **Identical Parameters $\to$ Identical Hashes:**
   Generating a dataset with `--seed 42 --count 100` twice will produce:
   - Identical document IDs (`SYNTH_MS_001`, `SYNTH_CERT_002`, ...)
   - Identical student names, course codes, and SGPA/CGPA numbers
   - Identical PDF file bytes & SHA-256 checksums
   - Identical `manifest.json` SHA-256 hash

2. **Seed Sensitivity:**
   Changing the seed (e.g. from `42` to `43`) changes all generated student profiles, assigned categories, and document layouts.

3. **Ground Truth Consistency Guarantee:**
   Ground Truth JSON schemas are constructed directly from the same in-memory data structures used to render the PDF vector paths, guaranteeing 100% ground truth fidelity with zero annotation noise.

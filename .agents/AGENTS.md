# Project Rules — AU DIC Benchmark System

## Benchmark Artifact Storage Directive
- **Single Self-Contained Folder Rule**: Every benchmark evaluation run must store all of its artifact files (`metrics.json`, `comparisons.json`, `predictions.json`, `paired_field_observations.csv`, `statistical_results.json`, `summary.md`, `execution.log`) strictly inside its own dedicated run directory under `backend/benchmark_reports/<runId>/`.
- Do NOT scatter benchmark output files randomly across the workspace root or unorganized directories.

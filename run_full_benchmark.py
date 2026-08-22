#!/usr/bin/env python3
"""
run_full_benchmark.py — Single-Command Reproducibility Entry Point (Task 10)

Runs the complete Option A benchmark pipeline end-to-end:
  Step 1: Generate ground truth JSONs (if missing)
  Step 2: Build TypeScript benchmark runner
  Step 3: Launch live Groq inference benchmark
  Step 4: Generate paired field observation dataset
  Step 5: Run statistical tests
  Step 6: Generate paper tables and figures

Usage:
  python run_full_benchmark.py                 # Full 360-sample live run
  python run_full_benchmark.py --calibrate     # 30-sample calibration first
  python run_full_benchmark.py --dry-run       # Mock run (no API calls)
  python run_full_benchmark.py --from-existing # Skip inference, use latest run

All outputs are reproducible given the same seed (42) and Groq API key.
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
ADBG_DIR = ROOT / "ADBG" / "AU_DIC_Benchmark_v1.0"
STATS_DIR = ROOT / "research" / "statistics"
RESULTS_DIR = STATS_DIR / "results"

def run(cmd: list[str], cwd: Path = ROOT, env: dict | None = None) -> int:
    print(f"\n$ {' '.join(cmd)}")
    proc = subprocess.run(cmd, cwd=str(cwd), env=env)
    return proc.returncode

def step(n: int, msg: str):
    print(f"\n{'='*60}")
    print(f" STEP {n}: {msg}")
    print('='*60)

def main():
    parser = argparse.ArgumentParser(description="AU DIC Full Benchmark Pipeline")
    parser.add_argument("--calibrate",    action="store_true", help="Run 30-sample calibration only")
    parser.add_argument("--dry-run",      action="store_true", help="Mock run (no API calls)")
    parser.add_argument("--from-existing",action="store_true", help="Skip inference, use latest completed run")
    args = parser.parse_args()

    print("╔══════════════════════════════════════════════════════════╗")
    print("║  AU DIC BENCHMARK PIPELINE v1.0 — Full Reproducibility   ║")
    print("╚══════════════════════════════════════════════════════════╝")

    # ── Step 1: Generate GT JSONs ─────────────────────────────────────────────
    step(1, "Generate Ground Truth JSONs")
    gt_dir = ADBG_DIR / "groundtruth"
    flat_gts = list(gt_dir.glob("DOC-*_clean.json")) if gt_dir.exists() else []
    if len(flat_gts) >= 90:
        print(f"  ✅ {len(flat_gts)} per-profile GT files already exist — skipping generation.")
    else:
        print("  Generating GT JSONs from ADBG with seed=42...")
        env = os.environ.copy()
        env["PYTHONPATH"] = str(ROOT / "ADBG")
        rc = run([sys.executable, str(ROOT / "ADBG" / "scripts" / "generate_au_dic_benchmark_v1.py")], cwd=ROOT, env=env)
        if rc != 0:
            print("FAIL: GT generation failed."); sys.exit(1)
        rc = run([sys.executable, str(ROOT / "ADBG" / "scripts" / "create_perprofile_gt.py")], cwd=ROOT, env=env)
        if rc != 0:
            print("FAIL: Per-profile GT creation failed."); sys.exit(1)

    # ── Step 2: TypeScript check ──────────────────────────────────────────────
    step(2, "TypeScript Compilation Check")
    rc = run(["npx", "tsc", "--noEmit"], cwd=BACKEND)
    if rc != 0:
        print("FAIL: TypeScript compilation errors. Fix before proceeding."); sys.exit(1)
    print("  ✅ TypeScript: zero errors.")

    # ── Step 3: Run Benchmark ─────────────────────────────────────────────────
    step(3, "Run Benchmark Inference")

    if args.from_existing:
        print("  Skipping inference — using latest completed run.")
    elif args.dry_run:
        print("  DRY-RUN mode: using mock predictions.")
        rc = run(["npx", "ts-node", "--project", "tsconfig.json",
                  "src/benchmark/runner/run_dryrun_benchmark.ts"], cwd=BACKEND)
        if rc != 0:
            print("FAIL: Dry-run benchmark failed."); sys.exit(1)
    elif args.calibrate:
        print("  CALIBRATION mode: 30 samples only.")
        rc = run(["npx", "ts-node", "--project", "tsconfig.json",
                  "src/benchmark/runner/run_calibration_benchmark.ts"], cwd=BACKEND)
        if rc != 0:
            print("FAIL: Calibration benchmark failed."); sys.exit(1)
    else:
        print("  FULL mode: 360 samples (live Groq inference).")
        rc = run(["npx", "ts-node", "--project", "tsconfig.json",
                  "src/benchmark/runner/run_live_benchmark.ts"], cwd=BACKEND)
        if rc != 0:
            print("FAIL: Live benchmark failed."); sys.exit(1)

    # ── Step 4: Generate Field Dataset ───────────────────────────────────────
    step(4, "Generate Paired Field Observation Dataset")
    rc = run([sys.executable, str(STATS_DIR / "generate_field_dataset.py")], cwd=ROOT)
    if rc != 0:
        print("FAIL: Field dataset generation failed."); sys.exit(1)

    csv_path = RESULTS_DIR / "paired_field_observations.csv"
    if csv_path.exists():
        import csv
        with open(csv_path, newline="", encoding="utf-8") as f:
            rows = list(csv.reader(f))
        print(f"  ✅ Dataset: {len(rows)-1} field observations.")
    else:
        print("  WARNING: CSV not produced. Check for errors above.")

    # ── Step 5: Statistical Tests ─────────────────────────────────────────────
    step(5, "Run Statistical Tests")
    stat_script = STATS_DIR / "run_statistical_tests.py"
    if stat_script.exists():
        rc = run([sys.executable, str(stat_script)], cwd=ROOT)
        if rc != 0:
            print("WARNING: Statistical tests produced errors (may be due to insufficient data).")
    else:
        print("  WARNING: run_statistical_tests.py not found — skipping.")

    # ── Step 6: Generate Paper Artifacts ─────────────────────────────────────
    step(6, "Generate Paper Tables & Figures")
    artifact_script = STATS_DIR / "generate_paper_artifacts.py"
    if artifact_script.exists():
        rc = run([sys.executable, str(artifact_script)], cwd=ROOT)
        if rc != 0:
            print("WARNING: Paper artifact generation had errors.")
    else:
        print("  INFO: generate_paper_artifacts.py not yet created — skipping.")

    print("\n╔══════════════════════════════════════════════════════════╗")
    print("║  PIPELINE COMPLETE                                        ║")
    print(f"║  Results: {str(RESULTS_DIR)[:48]}  ║")
    print("╚══════════════════════════════════════════════════════════╝")

if __name__ == "__main__":
    main()

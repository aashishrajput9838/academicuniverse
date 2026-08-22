from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
easy_read_dir = workspace / "docs" / "paper" / "easy_read"

easy_read_dir.mkdir(parents=True, exist_ok=True)

print(f"[SUCCESS] Created Easy-Read Guide output directory: {easy_read_dir.relative_to(workspace)}")

import os
import docx
import re
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
pipeline_script = workspace / "scratch" / "generate_paperv5_from_v4_baseline.py"

assert pipeline_script.exists(), "pipeline_script missing!"

print("=== RESTRUCTURING SECTION 4.3 IN PIPELINE SCRIPT ===")

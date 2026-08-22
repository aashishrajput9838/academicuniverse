import re
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v5_md_path = workspace / "docs" / "paper" / "Paper_V5.md"

with open(v5_md_path, "r", encoding="utf-8") as f:
    text = f.read()

# Replace misplaced ## References or add ## References before [1]
if "## References\n\n[1]" not in text:
    text = re.sub(r"## References\n+", "", text)
    text = re.sub(r"(\n)(\[1\] Y\. Zhou)", r"\1## References\n\n\2", text)

with open(v5_md_path, "w", encoding="utf-8") as f:
    f.write(text)

print("[SUCCESS] Synchronized ## References section header in Paper_V5.md")

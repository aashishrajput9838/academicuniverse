import os
from pathlib import Path
from PIL import Image

workspace = Path(__file__).resolve().parents[1]
logo_path = workspace / "public" / "new_logo_2.png"

assert logo_path.exists(), f"Error: Logo file missing at {logo_path}"

img = Image.open(logo_path)
width, height = img.size

print("=== SHARDA UNIVERSITY LOGO IMAGE INSPECTION ===")
print(f"Path:   {logo_path}")
print(f"Format: {img.format}")
print(f"Size:   {width} x {height} px")
print(f"Aspect Ratio: {width / height:.2f}")

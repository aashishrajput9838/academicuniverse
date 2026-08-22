from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
script_path = workspace / "scratch" / "generate_paperv5_from_v4_baseline.py"

with open(script_path, "r", encoding="utf-8") as f:
    code = f.read()

# Replace malformed multiline strings with clean raw text
code = code.replace(
    '("4.3.1 Category Classification Accuracy",\n             "The proportion of document specimens where the predicted document category (\u0177_i) matches the ground truth category (y_i) across N total evaluated specimens:",\n             "Acc_cat = (1 / N) * sum_{i=1}^N I(\u0177_i = y_i)   (1)\nwhere N represents the total count of evaluated document specimens.")',
    '("4.3.1 Category Classification Accuracy",\n             "The proportion of document specimens where the predicted document category (y_hat) matches the ground truth category (y) across N total evaluated specimens:",\n             "Acc_cat = (1 / N) * sum_{i=1}^N I(y_hat_i = y_i)   (1)\\nwhere N represents the total count of evaluated document specimens.")'
)

with open(script_path, "w", encoding="utf-8") as f:
    f.write(code)

print("[SUCCESS] Fixed syntax in generate_paperv5_from_v4_baseline.py!")

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
cm_dir = workspace / "results" / "confusion_matrices"

assert cm_dir.exists(), "Confusion matrix directory missing!"

def create_composite(model_prefix, title_prefix, save_path):
    splits = ["60_40", "70_30", "80_20"]
    split_labels = ["60:40 Split", "70:30 Split", "80:20 Split"]
    
    fig, axes = plt.subplots(1, 3, figsize=(13, 4.2), dpi=200)
    
    for idx, (split, label) in enumerate(zip(splits, split_labels)):
        img_path = cm_dir / f"{model_prefix}_{split}.png"
        assert img_path.exists(), f"Missing {img_path}"
        
        img = Image.open(img_path)
        axes[idx].imshow(img)
        axes[idx].axis('off')
        axes[idx].set_title(f"{title_prefix} ({label})", fontsize=11, fontweight='bold', pad=8)
        
    fig.tight_layout()
    fig.savefig(save_path, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    print(f"[SUCCESS] Saved composite figure: {save_path.relative_to(workspace)}")

dt_path = cm_dir / "dt_composite.png"
rf_path = cm_dir / "rf_composite.png"

create_composite("dt", "Decision Tree", dt_path)
create_composite("rf", "Random Forest", rf_path)

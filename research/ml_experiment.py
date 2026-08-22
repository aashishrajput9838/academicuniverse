#!/usr/bin/env python3
"""
research/ml_experiment.py

Machine Learning Experiment Engine for AU DIC Benchmark Framework.
Evaluates Random Forest (RF) and Decision Tree (DT) classifiers across
60:40, 70:30, and 80:20 train-test splits on the benchmark field observation dataset.

Calculates:
- Accuracy, Precision, Recall, F1-Score, Specificity, NPV, MCC, FPR, FNR, FDR, FOR
- High-resolution prediction time (via time.perf_counter())
- Confusion matrix plots saved to results/confusion_matrices/
- Summary reports saved to results/train_test_comparison.csv, .xlsx, and experiment_summary.md

Strictly avoids data leakage by utilizing scikit-learn Pipelines with transformers fitted exclusively on train data.
"""

import os
import sys
import time
import json
from pathlib import Path

import matplotlib
matplotlib.use('Agg')  # Headless non-interactive backend
import matplotlib.pyplot as plt

import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import confusion_matrix

WORKSPACE_DIR = Path(__file__).resolve().parents[1]
RESULTS_DIR = WORKSPACE_DIR / "results"
CM_DIR = RESULTS_DIR / "confusion_matrices"

def ensure_directories():
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    CM_DIR.mkdir(parents=True, exist_ok=True)

def dataframe_to_markdown(df):
    headers = [df.index.name or ""] + list(df.columns)
    lines = ["| " + " | ".join(headers) + " |"]
    lines.append("| " + " | ".join([":---"] + [":---:"] * len(df.columns)) + " |")
    for idx, row in df.iterrows():
        str_vals = [f"{v:.6f}" if isinstance(v, (float, np.floating)) else str(v) for v in row]
        lines.append("| " + " | ".join([str(idx)] + str_vals) + " |")
    return "\n".join(lines)

def load_dataset(csv_path=None):
    if csv_path is None:
        candidate_paths = [
            WORKSPACE_DIR / "backend" / "benchmark_reports" / "run_canonical_v4_verify" / "paired_field_observations.csv",
            WORKSPACE_DIR / "research" / "statistics" / "results" / "paired_field_observations.csv",
        ]
        for p in candidate_paths:
            if p.exists():
                csv_path = p
                break

    if csv_path is None or not Path(csv_path).exists():
        raise FileNotFoundError(f"Dataset not found at {csv_path}. Please verify benchmark observations CSV location.")

    df = pd.read_csv(csv_path)
    return df, Path(csv_path)

def preprocess_features(df):
    """
    Extracts features and target without data leakage.
    Target: exact_match (0 or 1)
    Features: document_type, quality_profile, field_name, expected_len, predicted_len, is_missing
    """
    df = df.copy()
    
    # Target
    y = df['exact_match'].astype(int).values
    
    # Engineered features
    expected_len = df['expected_value'].fillna('').astype(str).str.len()
    predicted_len = df['predicted_value'].fillna('').astype(str).str.len()
    is_missing = df['predicted_value'].isnull().astype(int)
    
    X = pd.DataFrame({
        'document_type': df['document_type'].astype(str),
        'quality_profile': df['quality_profile'].astype(str),
        'field_name': df['field_name'].astype(str),
        'expected_len': expected_len,
        'predicted_len': predicted_len,
        'is_missing': is_missing
    })
    
    return X, y

def compute_binary_metrics(y_true, y_pred, pred_time_sec):
    """
    Calculates confusion matrix derived binary classification metrics cleanly and safely.
    Labels: 0 = mismatch (Negative), 1 = exact match (Positive).
    """
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()
    
    total = float(tp + tn + fp + fn)
    
    accuracy = float(tp + tn) / total if total > 0 else 0.0
    precision = float(tp) / float(tp + fp) if (tp + fp) > 0 else 0.0
    recall = float(tp) / float(tp + fn) if (tp + fn) > 0 else 0.0
    f1 = float(2 * precision * recall) / float(precision + recall) if (precision + recall) > 0 else 0.0
    specificity = float(tn) / float(tn + fp) if (tn + fp) > 0 else 0.0
    npv = float(tn) / float(tn + fn) if (tn + fn) > 0 else 0.0
    
    # MCC Calculation
    denom_sq = float(tp + fp) * float(tp + fn) * float(tn + fp) * float(tn + fn)
    if denom_sq > 0:
        mcc = float((tp * tn) - (fp * fn)) / np.sqrt(denom_sq)
    else:
        mcc = 0.0
        
    fpr = float(fp) / float(fp + tn) if (fp + tn) > 0 else 0.0
    fnr = float(fn) / float(fn + tp) if (fn + tp) > 0 else 0.0
    fdr = float(fp) / float(fp + tp) if (fp + tp) > 0 else 0.0
    for_rate = float(fn) / float(fn + tn) if (fn + tn) > 0 else 0.0
    
    return {
        "TN": int(tn),
        "FP": int(fp),
        "FN": int(fn),
        "TP": int(tp),
        "Accuracy": round(accuracy, 6),
        "Precision": round(precision, 6),
        "Recall": round(recall, 6),
        "F1-Score": round(f1, 6),
        "Specificity": round(specificity, 6),
        "NPV": round(npv, 6),
        "MCC": round(mcc, 6),
        "FPR": round(fpr, 6),
        "FNR": round(fnr, 6),
        "FDR": round(fdr, 6),
        "FOR": round(for_rate),
        "Prediction Time": round(pred_time_sec, 6)
    }

def plot_and_save_confusion_matrix(cm, model_name, split_name, save_path):
    """
    Generates and saves a confusion matrix heatmap plot.
    """
    fig, ax = plt.subplots(figsize=(5, 4), dpi=150)
    im = ax.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    ax.figure.colorbar(im, ax=ax)
    
    classes = ['Mismatch (0)', 'Match (1)']
    tick_marks = np.arange(len(classes))
    ax.set_xticks(tick_marks)
    ax.set_xticklabels(classes)
    ax.set_yticks(tick_marks)
    ax.set_yticklabels(classes)
    
    ax.set_xlabel('Predicted Label', fontsize=10, fontweight='bold')
    ax.set_ylabel('True Label', fontsize=10, fontweight='bold')
    ax.set_title(f'Confusion Matrix: {model_name} ({split_name})', fontsize=11, fontweight='bold')
    
    # Loop over data dimensions and create text annotations.
    thresh = cm.max() / 2.
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, f"{cm[i, j]:,}",
                    ha="center", va="center",
                    color="white" if cm[i, j] > thresh else "black",
                    fontsize=12, fontweight='bold')
            
    fig.tight_layout()
    fig.savefig(save_path, bbox_inches='tight')
    plt.close(fig)

def build_model_pipeline(model_type, random_state=42):
    categorical_cols = ['document_type', 'quality_profile', 'field_name']
    numerical_cols = ['expected_len', 'predicted_len', 'is_missing']
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_cols),
            ('num', StandardScaler(), numerical_cols)
        ]
    )
    
    if model_type.upper() == 'RF':
        classifier = RandomForestClassifier(
            n_estimators=100,
            max_depth=15,
            criterion='gini',
            random_state=random_state
        )
    elif model_type.upper() == 'DT':
        classifier = DecisionTreeClassifier(
            max_depth=15,
            criterion='gini',
            random_state=random_state
        )
    else:
        raise ValueError(f"Unknown model_type: {model_type}")
        
    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', classifier)
    ])
    
    return pipeline

def run_experiments(csv_path=None, random_state=42):
    ensure_directories()
    df, used_csv = load_dataset(csv_path)
    X, y = preprocess_features(df)
    
    splits = [
        ("60:40", 0.40),
        ("70:30", 0.30),
        ("80:20", 0.20)
    ]
    
    models = ["RF", "DT"]
    
    results_list = []
    comparison_dict = {}
    
    print(f"Loaded dataset: {used_csv.relative_to(WORKSPACE_DIR)}")
    print(f"Dataset Shape: {X.shape[0]} samples, {X.shape[1]} raw features")
    print(f"Target Distribution: Match(1)={sum(y==1)}, Mismatch(0)={sum(y==0)}")
    print("=" * 70)
    
    for split_name, test_size in splits:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state, stratify=y
        )
        
        for model_type in models:
            exp_key = f"{model_type} {split_name}"
            print(f"Running Experiment: [{exp_key}] (Train={len(X_train)}, Test={len(X_test)})...")
            
            pipeline = build_model_pipeline(model_type, random_state=random_state)
            
            # Train model
            pipeline.fit(X_train, y_train)
            
            # Measure ONLY prediction / inference time
            t0 = time.perf_counter()
            y_pred = pipeline.predict(X_test)
            t1 = time.perf_counter()
            pred_time_sec = t1 - t0
            
            # Compute performance metrics
            metrics = compute_binary_metrics(y_test, y_pred, pred_time_sec)
            
            # Generate and save confusion matrix
            cm = confusion_matrix(y_test, y_pred, labels=[0, 1])
            cm_filename = f"{model_type.lower()}_{split_name.replace(':', '_')}.png"
            cm_path = CM_DIR / cm_filename
            plot_and_save_confusion_matrix(cm, model_type, split_name, cm_path)
            
            # Get model parameters
            clf = pipeline.named_steps['classifier']
            params = clf.get_params()
            
            # Record detailed result entry
            record = {
                "model": model_type,
                "split": split_name,
                "train_samples": len(X_train),
                "test_samples": len(X_test),
                "random_state": random_state,
                "confusion_matrix_path": str(cm_path.relative_to(WORKSPACE_DIR)),
                "model_parameters": json.dumps(params)
            }
            record.update(metrics)
            results_list.append(record)
            
            # Store in comparison column dict
            comparison_dict[exp_key] = metrics

    # Build Final Comparison Table DataFrame
    metric_rows = [
        "Accuracy", "Precision", "Recall", "F1-Score", "Specificity",
        "NPV", "MCC", "FPR", "FNR", "FDR", "FOR", "Prediction Time"
    ]
    
    col_order = ["RF 60:40", "RF 70:30", "RF 80:20", "DT 60:40", "DT 70:30", "DT 80:20"]
    
    comp_df = pd.DataFrame(index=metric_rows, columns=col_order)
    for col in col_order:
        for m in metric_rows:
            comp_df.loc[m, col] = comparison_dict[col][m]
            
    comp_df.index.name = "Metric"
    
    # Save CSV & XLSX
    csv_out = RESULTS_DIR / "train_test_comparison.csv"
    xlsx_out = RESULTS_DIR / "train_test_comparison.xlsx"
    comp_df.to_csv(csv_out)
    comp_df.to_excel(xlsx_out)
    
    # Save detailed consolidated results CSV
    results_df = pd.DataFrame(results_list)
    consolidated_csv = RESULTS_DIR / "consolidated_experiment_results.csv"
    results_df.to_csv(consolidated_csv, index=False)
    
    # Identify Best Model by Accuracy and F1
    best_acc_col = comp_df.loc["Accuracy"].astype(float).idxmax()
    best_acc_val = comp_df.loc["Accuracy", best_acc_col]
    best_f1_col = comp_df.loc["F1-Score"].astype(float).idxmax()
    best_f1_val = comp_df.loc["F1-Score", best_f1_col]
    
    # Generate Summary Markdown Document
    summary_md_path = RESULTS_DIR / "experiment_summary.md"
    with open(summary_md_path, "w", encoding="utf-8") as f:
        f.write("# Machine Learning Experiment Summary & Model Comparison\n\n")
        f.write(f"**Dataset File:** `{used_csv.relative_to(WORKSPACE_DIR)}`  \n")
        f.write(f"**Dataset Shape:** `{X.shape[0]} samples` x `{X.shape[1]} features`  \n")
        f.write(f"**Target Column:** `exact_match` (Binary: 0=Mismatch, 1=Exact Match)  \n")
        f.write(f"**Fixed Random State:** `{random_state}`  \n")
        f.write(f"**Python Version:** `{sys.version.split()[0]}`  \n")
        f.write(f"**scikit-learn Version:** `{pd.__version__}`  \n\n")
        
        f.write("## 1. Final Comparison Table\n\n")
        f.write(dataframe_to_markdown(comp_df))
        f.write("\n\n")
        
        f.write("## 2. Best-Performing Model & Split\n\n")
        f.write(f"- **Best by Accuracy:** `{best_acc_col}` ({best_acc_val * 100:.2f}%)\n")
        f.write(f"- **Best by F1-Score:** `{best_f1_col}` ({best_f1_val * 100:.2f}%)\n\n")
        
        f.write("## 3. Ambiguity & Note Parameter Inspection Report\n\n")
        f.write("### K-Fold Cross-Validation (Requirement 9)\n")
        f.write("- **Inspection Finding:** No specified $K$ value for K-Fold Cross-Validation exists in the repository documentation or code.\n")
        f.write("- **Handling:** K-Fold is maintained as a separate optional module (`run_optional_kfold`). The primary 60:40, 70:30, and 80:20 stratified split evaluation is reported above.\n\n")
        
        f.write("### Epochs, Batch Size & 'K = 8 GB' (Requirement 10)\n")
        f.write("- **Epochs (10/15/20) & Batch Sizes (64/128/256):** These hyperparameters belong to neural network / Vision-Language Model fine-tuning (e.g. Donut/Florence-2 encoder training) and do **NOT** apply to tree-based classifiers (Random Forest / Decision Tree).\n")
        f.write("- **'K = 8 GB':** Refers to GPU VRAM hardware allocation for running local 7B/8B GGUF quantized models in Ollama, not K-Fold CV.\n")
        f.write("- **'Batch Size = 500':** Refers to synthetic dataset specimen generation batch sizes (`synthetic-dataset-500`), not ML tree training.\n\n")
        
        f.write("## 4. Model Hyperparameters\n\n")
        f.write("- **Random Forest (RF):** `n_estimators=100`, `max_depth=15`, `criterion='gini'`, `random_state=42`\n")
        f.write("- **Decision Tree (DT):** `max_depth=15`, `criterion='gini'`, `random_state=42`\n\n")
        
        f.write("## 5. Generated Artifacts\n\n")
        f.write(f"- Comparison Table CSV: `{csv_out.relative_to(WORKSPACE_DIR)}`  \n")
        f.write(f"- Comparison Table Excel: `{xlsx_out.relative_to(WORKSPACE_DIR)}`  \n")
        f.write(f"- Consolidated Results CSV: `{consolidated_csv.relative_to(WORKSPACE_DIR)}`  \n")
        f.write(f"- Confusion Matrices: `{CM_DIR.relative_to(WORKSPACE_DIR)}/*.png`  \n")

    print("=" * 70)
    print(f"[SUCCESS] Experiment Execution Completed Successfully.")
    print(f"  - Comparison CSV: {csv_out.relative_to(WORKSPACE_DIR)}")
    print(f"  - Comparison Excel: {xlsx_out.relative_to(WORKSPACE_DIR)}")
    print(f"  - Summary Markdown: {summary_md_path.relative_to(WORKSPACE_DIR)}")
    print(f"  - Confusion Matrices: {CM_DIR.relative_to(WORKSPACE_DIR)}")

    return comp_df, results_df

def run_optional_kfold(csv_path=None, k=5, random_state=42):
    """
    Optional Stratified K-Fold evaluation provided for completeness.
    """
    df, _ = load_dataset(csv_path)
    X, y = preprocess_features(df)
    
    skf = StratifiedKFold(n_splits=k, shuffle=True, random_state=random_state)
    print(f"\n=== RUNNING OPTIONAL STRATIFIED {k}-FOLD CROSS VALIDATION ===")
    
    kfold_results = []
    for fold, (train_idx, test_idx) in enumerate(skf.split(X, y), 1):
        X_tr, X_te = X.iloc[train_idx], X.iloc[test_idx]
        y_tr, y_te = y[train_idx], y[test_idx]
        
        pipeline = build_model_pipeline("RF", random_state=random_state)
        pipeline.fit(X_tr, y_tr)
        
        t0 = time.perf_counter()
        y_pred = pipeline.predict(X_te)
        t1 = time.perf_counter()
        
        m = compute_binary_metrics(y_te, y_pred, t1 - t0)
        m['Fold'] = fold
        kfold_results.append(m)
        
    kfold_df = pd.DataFrame(kfold_results)
    print(f"Mean Accuracy across {k} Folds: {kfold_df['Accuracy'].mean():.4f} +/- {kfold_df['Accuracy'].std():.4f}")
    return kfold_df

if __name__ == "__main__":
    run_experiments()

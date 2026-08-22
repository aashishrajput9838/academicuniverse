import os
import pytest
import numpy as np
import pandas as pd
from pathlib import Path

from research.ml_experiment import compute_binary_metrics, run_experiments, RESULTS_DIR, CM_DIR

def test_compute_binary_metrics_exact_values():
    # Known test case:
    # TP=80, TN=90, FP=10, FN=20
    # y_true: 80 ones + 20 ones (FN) = 100 ones; 90 zeros + 10 zeros (FP) = 100 zeros
    y_true = np.array([1]*100 + [0]*100)
    # y_pred: 80 correctly predicted ones, 20 predicted as zeros; 10 zeros predicted as ones, 90 correctly predicted zeros
    y_pred = np.array([1]*80 + [0]*20 + [1]*10 + [0]*90)
    
    metrics = compute_binary_metrics(y_true, y_pred, pred_time_sec=0.015)
    
    assert metrics["TP"] == 80
    assert metrics["TN"] == 90
    assert metrics["FP"] == 10
    assert metrics["FN"] == 20
    
    # Expected calculations:
    # Accuracy = (80 + 90) / 200 = 0.85
    # Precision = 80 / 90 = 0.888889
    # Recall = 80 / 100 = 0.80
    # Specificity = 90 / 100 = 0.90
    # NPV = 90 / 110 = 0.818182
    # FPR = 10 / 100 = 0.10
    # FNR = 20 / 100 = 0.20
    # FDR = 10 / 90 = 0.111111
    # FOR = 20 / 110 = 0.181818
    
    assert round(metrics["Accuracy"], 4) == 0.8500
    assert round(metrics["Recall"], 4) == 0.8000
    assert round(metrics["Specificity"], 4) == 0.9000
    assert round(metrics["FPR"], 4) == 0.1000
    assert round(metrics["FNR"], 4) == 0.2000
    assert round(metrics["Prediction Time"], 3) == 0.015

def test_compute_binary_metrics_zero_denominators():
    # Edge case: All predictions are 0 (TP=0, FP=0)
    y_true = np.array([1, 1, 0, 0])
    y_pred = np.array([0, 0, 0, 0])
    
    metrics = compute_binary_metrics(y_true, y_pred, pred_time_sec=0.001)
    
    assert metrics["TP"] == 0
    assert metrics["FP"] == 0
    assert metrics["Precision"] == 0.0
    assert metrics["F1-Score"] == 0.0
    assert metrics["FDR"] == 0.0
    assert not np.isnan(metrics["MCC"])

def test_end_to_end_ml_experiment_execution():
    comp_df, results_df = run_experiments()
    
    assert isinstance(comp_df, pd.DataFrame)
    assert isinstance(results_df, pd.DataFrame)
    
    # Check 6 combinations
    expected_cols = ["RF 60:40", "RF 70:30", "RF 80:20", "DT 60:40", "DT 70:30", "DT 80:20"]
    for col in expected_cols:
        assert col in comp_df.columns
        
    expected_metrics = [
        "Accuracy", "Precision", "Recall", "F1-Score", "Specificity",
        "NPV", "MCC", "FPR", "FNR", "FDR", "FOR", "Prediction Time"
    ]
    for m in expected_metrics:
        assert m in comp_df.index
        
    # Check generated files
    assert (RESULTS_DIR / "train_test_comparison.csv").exists()
    assert (RESULTS_DIR / "train_test_comparison.xlsx").exists()
    assert (RESULTS_DIR / "experiment_summary.md").exists()
    
    for filename in ["rf_60_40.png", "rf_70_30.png", "rf_80_20.png", "dt_60_40.png", "dt_70_30.png", "dt_80_20.png"]:
        assert (CM_DIR / filename).exists()

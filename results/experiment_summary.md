# Machine Learning Experiment Summary & Model Comparison

**Dataset File:** `backend\benchmark_reports\run_canonical_v4_verify\paired_field_observations.csv`  
**Dataset Shape:** `24480 samples` x `6 features`  
**Target Column:** `exact_match` (Binary: 0=Mismatch, 1=Exact Match)  
**Fixed Random State:** `42`  
**Python Version:** `3.14.6`  
**scikit-learn Version:** `3.0.5`  

## 1. Final Comparison Table

| Metric | RF 60:40 | RF 70:30 | RF 80:20 | DT 60:40 | DT 70:30 | DT 80:20 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Accuracy | 0.874898 | 0.875817 | 0.878676 | 0.934947 | 0.935185 | 0.936887 |
| Precision | 0.856389 | 0.857299 | 0.860137 | 0.927326 | 0.925498 | 0.928059 |
| Recall | 1.000000 | 1.000000 | 1.000000 | 0.990418 | 0.993064 | 0.992335 |
| F1-Score | 0.922640 | 0.923168 | 0.924810 | 0.957834 | 0.958091 | 0.959122 |
| Specificity | 0.507439 | 0.510992 | 0.522124 | 0.772014 | 0.765147 | 0.773934 |
| NPV | 1.000000 | 1.000000 | 1.000000 | 0.964824 | 0.974061 | 0.971717 |
| MCC | 0.659215 | 0.661871 | 0.670148 | 0.824745 | 0.825867 | 0.830344 |
| FPR | 0.492561 | 0.489008 | 0.477876 | 0.227986 | 0.234853 | 0.226066 |
| FNR | 0.000000 | 0.000000 | 0.000000 | 0.009582 | 0.006936 | 0.007665 |
| FDR | 0.143611 | 0.142701 | 0.139863 | 0.072674 | 0.074502 | 0.071941 |
| FOR | 0 | 0 | 0 | 0 | 0 | 0 |
| Prediction Time | 0.167798 | 0.146718 | 0.120588 | 0.025032 | 0.018994 | 0.016724 |

## 2. Best-Performing Model & Split

- **Best by Accuracy:** `DT 80:20` (93.69%)
- **Best by F1-Score:** `DT 80:20` (95.91%)

## 3. Ambiguity & Note Parameter Inspection Report

### K-Fold Cross-Validation (Requirement 9)
- **Inspection Finding:** No specified $K$ value for K-Fold Cross-Validation exists in the repository documentation or code.
- **Handling:** K-Fold is maintained as a separate optional module (`run_optional_kfold`). The primary 60:40, 70:30, and 80:20 stratified split evaluation is reported above.

### Epochs, Batch Size & 'K = 8 GB' (Requirement 10)
- **Epochs (10/15/20) & Batch Sizes (64/128/256):** These hyperparameters belong to neural network / Vision-Language Model fine-tuning (e.g. Donut/Florence-2 encoder training) and do **NOT** apply to tree-based classifiers (Random Forest / Decision Tree).
- **'K = 8 GB':** Refers to GPU VRAM hardware allocation for running local 7B/8B GGUF quantized models in Ollama, not K-Fold CV.
- **'Batch Size = 500':** Refers to synthetic dataset specimen generation batch sizes (`synthetic-dataset-500`), not ML tree training.

## 4. Model Hyperparameters

- **Random Forest (RF):** `n_estimators=100`, `max_depth=15`, `criterion='gini'`, `random_state=42`
- **Decision Tree (DT):** `max_depth=15`, `criterion='gini'`, `random_state=42`

## 5. Generated Artifacts

- Comparison Table CSV: `results\train_test_comparison.csv`  
- Comparison Table Excel: `results\train_test_comparison.xlsx`  
- Consolidated Results CSV: `results\consolidated_experiment_results.csv`  
- Confusion Matrices: `results\confusion_matrices/*.png`  

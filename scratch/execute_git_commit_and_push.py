import subprocess
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]

commit_msg = """style(paper): update Abstract and Index Terms to exact final required text

- Update Abstract in scratch/generate_paperv5_from_v4_baseline.py and docs/paper/Paper_V5.md to exact single-paragraph continuous text
- Ensure 0 citations/references inside Abstract
- Preserve exact canonical V5 empirical values: 24,480 field observations, 75.23% F1, 74.60% raw EM, 82.18% normalized EM, 11.35% CER, and 100.00% category classification accuracy
- Update Index Terms to exactly 8 keywords: Academic Document Intelligence, Document Extraction, Synthetic Benchmark Generation, Information Extraction, Semantic Normalization, OCR Error Analysis, Optical Degradation, Document Evaluation
- Regenerate PaperV5_Ollama_Primary.docx (35 Pages) and PaperV5_Ollama_Primary.pdf (35 Pages)
"""

print("=== COMMITTING AND PUSHING ABSTRACT & INDEX TERMS UPDATE TO MAIN BRANCH ===")

try:
    subprocess.run(["git", "add", "docs/paper/", "scratch/generate_paperv5_from_v4_baseline.py", "scratch/update_pipeline_abstract.py"], cwd=str(workspace), check=True)
    commit_res = subprocess.run(["git", "commit", "-m", commit_msg], cwd=str(workspace), capture_output=True, text=True, check=True)
    print(commit_res.stdout)
    
    push_res = subprocess.run(["git", "push", "origin", "main"], cwd=str(workspace), capture_output=True, text=True, check=True)
    print(push_res.stdout)
    print("SUCCESSFULLY PUSHED ALL ABSTRACT & INDEX TERMS CHANGES TO MAIN BRANCH!")
except subprocess.CalledProcessError as e:
    print(f"Git Error Output:\nSTDOUT:\n{e.stdout}\nSTDERR:\n{e.stderr}")

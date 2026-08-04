"""
IEEE Publication Workflow Figure Generator v2.0
==============================================
Generates enhanced high-readability publication graphics for Figure 2:
1. methodology_workflow.dot (Graphviz DOT Source)
2. methodology_workflow.svg (Pure Vector SVG)
3. methodology_workflow.pdf (Vector PDF Export)
4. methodology_workflow_600dpi.png (High-Res 600 DPI Publication PNG)
"""

import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches

ROOT_DIR = r"c:\github\academicuniverse.com\academicuniverse"
REPORT_DIR = os.path.join(ROOT_DIR, r"docs\reports")
BRAIN_DIR = r"C:\Users\elitebook840g89319\.gemini\antigravity-ide\brain\bb9b3069-0e60-4209-b2b8-d0321ac491db"

# 1. Write methodology_workflow.dot
dot_content = """digraph G {
    graph [rankdir=TB, nodesep=0.5, ranksep=0.6, fontname="Times-Roman", fontsize=11, compound=true];
    node [shape=box, style="rounded,filled", fillcolor="#F8F9FA", color="#003366", penwidth=1.5, fontname="Times-Roman", fontsize=10.5];
    edge [color="#003366", penwidth=1.5, arrowsize=0.9];

    // Start / End nodes
    start [label="START", shape=oval, fillcolor="#003366", fontcolor="#FFFFFF", style=filled, width=1.6, height=0.6];
    end [label="END", shape=oval, fillcolor="#003366", fontcolor="#FFFFFF", style=filled, width=1.6, height=0.6];

    // Main Workflow Nodes
    config [label="Research Configuration"];
    seed [label="Deterministic Seed Initialization\\n(PrngSeedGenerator)"];
    adbg [label="ADBG Synthetic Academic Document Generation"];
    typst [label="Typst Vector PDF Compilation"];
    gt_json [label="Ground Truth JSON Generation & Assembly"];
    raster [label="Raster Image Conversion (300 DPI PNG)"];
    
    degradation [label="Controlled Optical Degradation Matrix\\n(clean | scanner_copy | mobile_camera | rotated_90)", shape=diamond, style=filled, fillcolor="#EDF2F7", color="#2B6CB0"];
    
    dataset [label="AU_DIC_Benchmark_v1.0 Dataset Assembly\\n(N = 360 Specimen Suite)"];
    runner [label="Benchmark Runner Engine Initialization\\n(isReadOnly: true, allowMockFallback: false)"];
    inference [label="Live Vision-Language / OCR Model Inference\\n(Groq Cloud Llama 3.1 8B Instant)"];
    prediction [label="Raw Prediction Extraction & JSON Parsing"];
    normalizer [label="Six-Stage Semantic Canonical Normalization\\n(CanonicalNormalizer)"];
    comparator [label="Field-Level Candidate Comparison"];
    taxonomy [label="Nine-Class Structured OCR Error Taxonomy\\n(ErrorTaxonomist)"];
    metrics [label="Multi-Task Metric Computation"];
    stats [label="Statistical Significance & Uncertainty Analysis"];
    artifacts [label="Publication Artifact Generation"];
    conclusions [label="Research Conclusions & Reproducibility Certification"];

    // Callout / Annotation Boxes
    norm_callout [label="Canonical Normalization Stages:\\n• ISO Date Standardizer (YYYY-MM-DD)\\n• Identifier Hyphen & Space Stripper\\n• Honorific & Whitespace Normalizer\\n• Case Standardization (UPPER/lower)\\n• Degree & University Alias Mapper\\n• Two-Decimal Numeric Standardizer", shape=box, style="dashed,filled", fillcolor="#FEFCBF", color="#D69E2E", fontname="Courier", fontsize=9];
    
    metric_callout [label="Computed Quantitative Metrics:\\n• Category Classification Accuracy (%)\\n• Field Extraction Precision (P)\\n• Field Extraction Recall (R)\\n• Field Extraction F1 Score (F1)\\n• Character Error Rate (CER %)\\n• Word Error Rate (WER %)\\n• Joint Record Exact Match (EM)", shape=box, style="dashed,filled", fillcolor="#EBF8FF", color="#3182CE", fontname="Courier", fontsize=9];
    
    stats_callout [label="Statistical Hypothesis Tests:\\n• McNemar's χ² Test (p < 0.0001)\\n• Wilcoxon Signed-Rank Test\\n• Paired Student's t-Test\\n• Non-Parametric 95% Bootstrap CIs\\n• Two-Pass Pass A vs. Pass B Ablation", shape=box, style="dashed,filled", fillcolor="#F0FFF4", color="#38A169", fontname="Courier", fontsize=9];

    artifact_callout [label="Generated Publication Artifacts:\\n• metrics.json (Global Payload)\\n• predictions.json (Live Inference Logs)\\n• comparisons.json (Field Diagnostics)\\n• 300/600 DPI High-Res Figures\\n• Formatted IEEE LaTeX Tables", shape=box, style="dashed,filled", fillcolor="#FAF5FF", color="#805AD5", fontname="Courier", fontsize=9];

    // Sequential Flow Connections
    start -> config -> seed -> adbg;
    adbg -> typst;
    adbg -> gt_json;
    typst -> raster -> degradation;
    gt_json -> dataset;
    degradation -> dataset -> runner -> inference -> prediction -> normalizer -> comparator -> taxonomy -> metrics -> stats -> artifacts -> conclusions -> end;

    // Callout Dotted Connections
    normalizer -> norm_callout [style=dotted, arrowhead=none, constraint=false];
    metrics -> metric_callout [style=dotted, arrowhead=none, constraint=false];
    stats -> stats_callout [style=dotted, arrowhead=none, constraint=false];
    artifacts -> artifact_callout [style=dotted, arrowhead=none, constraint=false];
}
"""

with open(os.path.join(ROOT_DIR, "methodology_workflow.dot"), "w", encoding="utf-8") as f:
    f.write(dot_content)
with open(os.path.join(BRAIN_DIR, "methodology_workflow.dot"), "w", encoding="utf-8") as f:
    f.write(dot_content)

# 2. Render 600 DPI PNG, SVG, and Vector PDF via Matplotlib
fig, ax = plt.subplots(figsize=(13, 23), dpi=600)
ax.set_xlim(0, 100)
ax.set_ylim(0, 195)
ax.axis("off")

# Title Banner
title_box = patches.FancyBboxPatch((4, 183), 92, 8.5, boxstyle="round,pad=0.3", fc="#003366", ec="#003366", lw=1.5)
ax.add_patch(title_box)
ax.text(50, 187.2, "AU DIC Framework — End-to-End Methodological Workflow", color="white", fontsize=14.5, fontweight="bold", ha="center", va="center", fontfamily="serif")

nodes = [
    ("start", "START", "oval", 50, 176, 18, 4.5, "#003366", "#003366", "white"),
    ("config", "Research Configuration", "process", 50, 167, 36, 4.8, "#F8F9FA", "#003366", "black"),
    ("seed", "Deterministic Seed Initialization\n(PrngSeedGenerator)", "process", 50, 157, 40, 5.2, "#F8F9FA", "#003366", "black"),
    ("adbg", "ADBG Synthetic Academic Document Generation", "process", 50, 146, 44, 5.2, "#F8F9FA", "#003366", "black"),
    ("typst", "Typst Vector PDF Compilation", "process", 31, 135, 32, 4.8, "#F8F9FA", "#003366", "black"),
    ("gt_json", "Ground Truth JSON Assembly", "process", 69, 135, 32, 4.8, "#F8F9FA", "#003366", "black"),
    ("raster", "Raster Image Conversion (300 DPI)", "process", 31, 124, 32, 4.8, "#F8F9FA", "#003366", "black"),
    ("degradation", "Controlled Degradation Matrix\n(clean | scanner | camera | rotated)", "diamond", 31, 112, 34, 6.5, "#EDF2F7", "#2B6CB0", "#1A202C"),
    ("dataset", "AU_DIC_Benchmark_v1.0 Dataset Assembly\n(N = 360 Specimen Suite)", "process", 50, 100, 46, 5.2, "#E6FFFA", "#234E52", "#1A202C"),
    ("runner", "Benchmark Runner Engine Initialization\n(isReadOnly: true, allowMockFallback: false)", "process", 50, 90, 46, 5.2, "#F8F9FA", "#003366", "black"),
    ("inference", "Live Vision-Language / OCR Model Inference\n(Groq Cloud Llama 3.1 8B Instant)", "process", 50, 80, 46, 5.2, "#F8F9FA", "#003366", "black"),
    ("prediction", "Raw Prediction Extraction & JSON Parsing", "process", 50, 70, 44, 4.8, "#F8F9FA", "#003366", "black"),
    ("normalizer", "Six-Stage Semantic Canonical Normalization\n(CanonicalNormalizer)", "process", 50, 60, 46, 5.2, "#FEFCBF", "#744210", "#744210"),
    ("comparator", "Field-Level Candidate Comparison", "process", 50, 50, 42, 4.8, "#F8F9FA", "#003366", "black"),
    ("taxonomy", "Nine-Class Structured OCR Error Taxonomy\n(ErrorTaxonomist)", "process", 50, 40, 44, 5.2, "#F8F9FA", "#003366", "black"),
    ("metrics", "Multi-Task Metric Computation", "process", 50, 30, 40, 4.8, "#EBF8FF", "#2B6CB0", "#2B6CB0"),
    ("stats", "Statistical Significance & Uncertainty Analysis", "process", 50, 20, 44, 4.8, "#F0FFF4", "#22543D", "#22543D"),
    ("artifacts", "Publication Artifact Generation", "process", 50, 10, 40, 4.8, "#FAF5FF", "#553C9A", "#553C9A"),
    ("end", "END", "oval", 50, 2, 18, 4.5, "#003366", "#003366", "white"),
]

node_dict = {}
for nid, lbl, ntype, x, y, w, h, bg, border, tc in nodes:
    node_dict[nid] = (x, y, w, h)
    if ntype == "oval":
        patch = patches.FancyBboxPatch((x - w/2, y - h/2), w, h, boxstyle="circle,pad=0.2", fc=bg, ec=border, lw=1.5)
        ax.add_patch(patch)
        ax.text(x, y, lbl, color=tc, fontsize=10.5, fontweight="bold", ha="center", va="center", fontfamily="serif")
    elif ntype == "process":
        patch = patches.FancyBboxPatch((x - w/2, y - h/2), w, h, boxstyle="round,pad=0.3", fc=bg, ec=border, lw=1.5)
        ax.add_patch(patch)
        ax.text(x, y, lbl, color=tc, fontsize=9.2, fontweight="bold", ha="center", va="center", fontfamily="serif")
    elif ntype == "diamond":
        diamond_pts = [[x, y + h/2], [x + w/2, y], [x, y - h/2], [x - w/2, y]]
        patch = patches.Polygon(diamond_pts, closed=True, fc=bg, ec=border, lw=1.5)
        ax.add_patch(patch)
        ax.text(x, y, lbl, color=tc, fontsize=8.5, fontweight="bold", ha="center", va="center", fontfamily="serif")

# Callout Annotations
callouts = [
    ("normalizer", "Canonical Normalization Callout:\n• ISO Date (YYYY-MM-DD)\n• Hyphen/Space Stripping\n• Case & Whitespace Trim\n• Honorific Prefix Stripper\n• Degree/University Aliases\n• 2-Decimal Float Format", 85, 60, "#FFFBEB", "#D97706"),
    ("metrics", "Computed Metrics Callout:\n• Category Accuracy (%)\n• Precision, Recall, F1\n• Character Error Rate\n• Word Error Rate\n• Joint Exact Match Rate", 85, 30, "#EFF6FF", "#2563EB"),
    ("stats", "Statistical Analysis Callout:\n• McNemar χ² (p < 0.0001)\n• Wilcoxon Signed-Rank\n• Paired t-Test\n• 95% Bootstrap CIs\n• Pass A vs B Ablation", 85, 20, "#ECFDF5", "#059669"),
    ("artifacts", "Publication Callout:\n• metrics.json payload\n• predictions.json logs\n• comparisons.json diffs\n• 600 DPI High-Res Figs\n• Formatted LaTeX Tables", 85, 10, "#F5F3FF", "#7C3AED")
]

for target_id, ctext, cx, cy, cbg, cborder in callouts:
    tx, ty, tw, th = node_dict[target_id]
    cbox = patches.FancyBboxPatch((cx - 12.5, cy - 4), 25, 8, boxstyle="round,pad=0.25", fc=cbg, ec=cborder, lw=1.3, ls="--")
    ax.add_patch(cbox)
    ax.text(cx, cy, ctext, color="#1F2937", fontsize=8.2, fontfamily="monospace", ha="center", va="center")
    ax.annotate("", xy=(cx - 12.5, cy), xytext=(tx + tw/2, ty), arrowprops=dict(arrowstyle="-", color=cborder, linestyle=":", lw=1.3))

# Connectors
connections = [
    ("start", "config"),
    ("config", "seed"),
    ("seed", "adbg"),
    ("adbg", "typst"),
    ("adbg", "gt_json"),
    ("typst", "raster"),
    ("raster", "degradation"),
    ("degradation", "dataset"),
    ("gt_json", "dataset"),
    ("dataset", "runner"),
    ("runner", "inference"),
    ("inference", "prediction"),
    ("prediction", "normalizer"),
    ("normalizer", "comparator"),
    ("comparator", "taxonomy"),
    ("taxonomy", "metrics"),
    ("metrics", "stats"),
    ("stats", "artifacts"),
    ("artifacts", "end"),
]

for src, dst in connections:
    sx, sy, sw, sh = node_dict[src]
    dx, dy, dw, dh = node_dict[dst]
    
    if src == "adbg" and dst == "typst":
        ax.annotate("", xy=(dx, dy + dh/2), xytext=(sx - sw/4, sy - sh/2), arrowprops=dict(arrowstyle="->", color="#003366", lw=1.4))
    elif src == "adbg" and dst == "gt_json":
        ax.annotate("", xy=(dx, dy + dh/2), xytext=(sx + sw/4, sy - sh/2), arrowprops=dict(arrowstyle="->", color="#003366", lw=1.4))
    elif src == "gt_json" and dst == "dataset":
        ax.annotate("", xy=(dx + dw/4, dy + dh/2), xytext=(sx, sy - sh/2), arrowprops=dict(arrowstyle="->", color="#003366", lw=1.4))
    elif src == "degradation" and dst == "dataset":
        ax.annotate("", xy=(dx - dw/4, dy + dh/2), xytext=(sx, sy - sh/2), arrowprops=dict(arrowstyle="->", color="#003366", lw=1.4))
    else:
        ax.annotate("", xy=(dx, dy + dh/2), xytext=(sx, sy - sh/2), arrowprops=dict(arrowstyle="->", color="#003366", lw=1.4))

plt.tight_layout()

# Save PNG 600 DPI
png_path = os.path.join(ROOT_DIR, "methodology_workflow_600dpi.png")
fig.savefig(png_path, dpi=600, bbox_inches="tight")
fig.savefig(os.path.join(BRAIN_DIR, "methodology_workflow_600dpi.png"), dpi=600, bbox_inches="tight")

# Save SVG Vector
svg_path = os.path.join(ROOT_DIR, "methodology_workflow.svg")
fig.savefig(svg_path, format="svg", bbox_inches="tight")
fig.savefig(os.path.join(BRAIN_DIR, "methodology_workflow.svg"), format="svg", bbox_inches="tight")

# Save Vector PDF
pdf_path = os.path.join(ROOT_DIR, "methodology_workflow.pdf")
fig.savefig(pdf_path, format="pdf", bbox_inches="tight")
fig.savefig(os.path.join(BRAIN_DIR, "methodology_workflow.pdf"), format="pdf", bbox_inches="tight")
plt.close(fig)

print("Enhanced Figure 2 assets rendered successfully!")

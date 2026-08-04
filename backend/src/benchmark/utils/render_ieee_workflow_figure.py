"""
IEEE Publication Workflow Figure Generator v6.0 (+10pt Additional Boost -> Total +25pt Boost)
========================================================================================
Increases every text size by +10 points more (Total +25pt from baseline):
- Title Banner: 29.5 pt -> 39.5 pt
- Start/End Ovals: 25.5 pt -> 35.5 pt
- Main Process Nodes: 24.2 pt -> 34.2 pt
- Decision Diamond: 23.5 pt -> 33.5 pt
- Annotation Callouts: 23.2 pt -> 33.2 pt

Generates:
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

# 1. Write methodology_workflow.dot with +10pt boosted 36pt font sizes
dot_content = """digraph G {
    graph [rankdir=TB, nodesep=1.2, ranksep=1.4, fontname="Times-Roman", fontsize=36, compound=true];
    node [shape=box, style="rounded,filled", fillcolor="#F8F9FA", color="#003366", penwidth=3.0, fontname="Times-Roman", fontsize=34.5];
    edge [color="#003366", penwidth=3.0, arrowsize=1.6];

    // Start / End nodes
    start [label="START", shape=oval, fillcolor="#003366", fontcolor="#FFFFFF", style=filled, width=3.8, height=1.5];
    end [label="END", shape=oval, fillcolor="#003366", fontcolor="#FFFFFF", style=filled, width=3.8, height=1.5];

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
    norm_callout [label="Canonical Normalization Stages:\\n• ISO Date Standardizer (YYYY-MM-DD)\\n• Identifier Hyphen & Space Stripper\\n• Honorific & Whitespace Normalizer\\n• Case Standardization (UPPER/lower)\\n• Degree & University Alias Mapper\\n• Two-Decimal Numeric Standardizer", shape=box, style="dashed,filled", fillcolor="#FEFCBF", color="#D69E2E", fontname="Courier", fontsize=33.2];
    
    metric_callout [label="Computed Quantitative Metrics:\\n• Category Classification Accuracy (%)\\n• Field Extraction Precision (P)\\n• Field Extraction Recall (R)\\n• Field Extraction F1 Score (F1)\\n• Character Error Rate (CER %)\\n• Word Error Rate (WER %)\\n• Joint Record Exact Match (EM)", shape=box, style="dashed,filled", fillcolor="#EBF8FF", color="#3182CE", fontname="Courier", fontsize=33.2];
    
    stats_callout [label="Statistical Hypothesis Tests:\\n• McNemar's χ² Test (p < 0.0001)\\n• Wilcoxon Signed-Rank Test\\n• Paired Student's t-Test\\n• Non-Parametric 95% Bootstrap CIs\\n• Two-Pass Pass A vs. Pass B Ablation", shape=box, style="dashed,filled", fillcolor="#F0FFF4", color="#38A169", fontname="Courier", fontsize=33.2];

    artifact_callout [label="Generated Publication Artifacts:\\n• metrics.json (Global Payload)\\n• predictions.json (Live Inference Logs)\\n• comparisons.json (Field Diagnostics)\\n• 300/600 DPI High-Res Figures\\n• Formatted IEEE LaTeX Tables", shape=box, style="dashed,filled", fillcolor="#FAF5FF", color="#805AD5", fontname="Courier", fontsize=33.2];

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

# 2. Render 600 DPI PNG, SVG, and Vector PDF via Matplotlib with expanded canvas (34 x 64 inches)
fig, ax = plt.subplots(figsize=(34, 64), dpi=600)
ax.set_xlim(0, 220)
ax.set_ylim(-110, 360)
ax.axis("off")

# Title Banner (29.5 + 10 = 39.5 pt)
title_box = patches.FancyBboxPatch((5, 335), 210, 22, boxstyle="round,pad=0.8", fc="#003366", ec="#003366", lw=3.0)
ax.add_patch(title_box)
ax.text(110, 346, "AU DIC Framework — End-to-End Methodological Workflow", color="white", fontsize=39.5, fontweight="bold", ha="center", va="center", fontfamily="serif")

# Nodes data: (id, label, type, x, y, width, height, fill, border, tc)
# Y-positions spaced out from y=315 (START) down to y=-90 (END)
nodes = [
    ("start", "START", "oval", 110, 315, 42, 12.0, "#003366", "#003366", "white"),
    ("config", "Research Configuration", "process", 110, 292, 90, 13.0, "#F8F9FA", "#003366", "black"),
    ("seed", "Deterministic Seed Initialization\n(PrngSeedGenerator)", "process", 110, 267, 102, 14.5, "#F8F9FA", "#003366", "black"),
    ("adbg", "ADBG Synthetic Academic Document Generation", "process", 110, 241, 110, 14.5, "#F8F9FA", "#003366", "black"),
    ("typst", "Typst Vector PDF Compilation", "process", 60, 215, 78, 13.0, "#F8F9FA", "#003366", "black"),
    ("gt_json", "Ground Truth JSON Assembly", "process", 160, 215, 78, 13.0, "#F8F9FA", "#003366", "black"),
    ("raster", "Raster Image Conversion (300 DPI)", "process", 60, 190, 78, 13.0, "#F8F9FA", "#003366", "black"),
    ("degradation", "Controlled Degradation Matrix\n(clean | scanner | camera | rotated)", "diamond", 60, 160, 82, 16.5, "#EDF2F7", "#2B6CB0", "#1A202C"),
    ("dataset", "AU_DIC_Benchmark_v1.0 Dataset Assembly\n(N = 360 Specimen Suite)", "process", 110, 135, 114, 14.5, "#E6FFFA", "#234E52", "#1A202C"),
    ("runner", "Benchmark Runner Engine Initialization\n(isReadOnly: true, allowMockFallback: false)", "process", 110, 110, 114, 14.5, "#F8F9FA", "#003366", "black"),
    ("inference", "Live Vision-Language / OCR Model Inference\n(Groq Cloud Llama 3.1 8B Instant)", "process", 110, 85, 114, 14.5, "#F8F9FA", "#003366", "black"),
    ("prediction", "Raw Prediction Extraction & JSON Parsing", "process", 110, 60, 102, 13.0, "#F8F9FA", "#003366", "black"),
    ("normalizer", "Six-Stage Semantic Canonical Normalization\n(CanonicalNormalizer)", "process", 110, 35, 114, 14.5, "#FEFCBF", "#744210", "#744210"),
    ("comparator", "Field-Level Candidate Comparison", "process", 110, 10, 96, 13.0, "#F8F9FA", "#003366", "black"),
    ("taxonomy", "Nine-Class Structured OCR Error Taxonomy\n(ErrorTaxonomist)", "process", 110, -15, 106, 14.5, "#F8F9FA", "#003366", "black"),
    ("metrics", "Multi-Task Metric Computation", "process", 110, -40, 92, 13.0, "#EBF8FF", "#2B6CB0", "#2B6CB0"),
    ("stats", "Statistical Significance & Uncertainty Analysis", "process", 110, -65, 102, 13.0, "#F0FFF4", "#22543D", "#22543D"),
    ("artifacts", "Publication Artifact Generation", "process", 110, -90, 92, 13.0, "#FAF5FF", "#553C9A", "#553C9A"),
    ("end", "END", "oval", 110, -112, 42, 12.0, "#003366", "#003366", "white"),
]

node_dict = {}
for nid, lbl, ntype, x, y, w, h, bg, border, tc in nodes:
    node_dict[nid] = (x, y, w, h)
    if ntype == "oval":
        patch = patches.FancyBboxPatch((x - w/2, y - h/2), w, h, boxstyle="circle,pad=0.6", fc=bg, ec=border, lw=3.0)
        ax.add_patch(patch)
        # Font size boosted to 35.5pt (+10pt more)
        ax.text(x, y, lbl, color=tc, fontsize=35.5, fontweight="bold", ha="center", va="center", fontfamily="serif")
    elif ntype == "process":
        patch = patches.FancyBboxPatch((x - w/2, y - h/2), w, h, boxstyle="round,pad=0.8", fc=bg, ec=border, lw=3.0)
        ax.add_patch(patch)
        # Font size boosted to 34.2pt (+10pt more)
        ax.text(x, y, lbl, color=tc, fontsize=34.2, fontweight="bold", ha="center", va="center", fontfamily="serif")
    elif ntype == "diamond":
        diamond_pts = [[x, y + h/2], [x + w/2, y], [x, y - h/2], [x - w/2, y]]
        patch = patches.Polygon(diamond_pts, closed=True, fc=bg, ec=border, lw=3.0)
        ax.add_patch(patch)
        # Font size boosted to 33.5pt (+10pt more)
        ax.text(x, y, lbl, color=tc, fontsize=33.5, fontweight="bold", ha="center", va="center", fontfamily="serif")

# Callout Annotations boosted to 33.2pt (+10pt more)
callouts = [
    ("normalizer", "Canonical Normalization Callout:\n• ISO Date (YYYY-MM-DD)\n• Hyphen/Space Stripping\n• Case & Whitespace Trim\n• Honorific Prefix Stripper\n• Degree/University Aliases\n• 2-Decimal Float Format", 188, 35, "#FFFBEB", "#D97706"),
    ("metrics", "Computed Metrics Callout:\n• Category Accuracy (%)\n• Precision, Recall, F1\n• Character Error Rate\n• Word Error Rate\n• Joint Exact Match Rate", 188, -40, "#EFF6FF", "#2563EB"),
    ("stats", "Statistical Analysis Callout:\n• McNemar χ² (p < 0.0001)\n• Wilcoxon Signed-Rank\n• Paired t-Test\n• 95% Bootstrap CIs\n• Pass A vs B Ablation", 188, -65, "#ECFDF5", "#059669"),
    ("artifacts", "Publication Callout:\n• metrics.json payload\n• predictions.json logs\n• comparisons.json diffs\n• 600 DPI High-Res Figs\n• Formatted LaTeX Tables", 188, -90, "#F5F3FF", "#7C3AED")
]

for target_id, ctext, cx, cy, cbg, cborder in callouts:
    tx, ty, tw, th = node_dict[target_id]
    cbox = patches.FancyBboxPatch((cx - 28, cy - 9.0), 56, 18, boxstyle="round,pad=0.6", fc=cbg, ec=cborder, lw=2.5, ls="--")
    ax.add_patch(cbox)
    # Font size boosted to 33.2pt (+10pt more)
    ax.text(cx, cy, ctext, color="#1F2937", fontsize=33.2, fontfamily="monospace", ha="center", va="center")
    ax.annotate("", xy=(cx - 28, cy), xytext=(tx + tw/2, ty), arrowprops=dict(arrowstyle="-", color=cborder, linestyle=":", lw=2.5))

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
        ax.annotate("", xy=(dx, dy + dh/2), xytext=(sx - sw/4, sy - sh/2), arrowprops=dict(arrowstyle="->", color="#003366", lw=3.0))
    elif src == "adbg" and dst == "gt_json":
        ax.annotate("", xy=(dx, dy + dh/2), xytext=(sx + sw/4, sy - sh/2), arrowprops=dict(arrowstyle="->", color="#003366", lw=3.0))
    elif src == "gt_json" and dst == "dataset":
        ax.annotate("", xy=(dx + dw/4, dy + dh/2), xytext=(sx, sy - sh/2), arrowprops=dict(arrowstyle="->", color="#003366", lw=3.0))
    elif src == "degradation" and dst == "dataset":
        ax.annotate("", xy=(dx - dw/4, dy + dh/2), xytext=(sx, sy - sh/2), arrowprops=dict(arrowstyle="->", color="#003366", lw=3.0))
    else:
        ax.annotate("", xy=(dx, dy + dh/2), xytext=(sx, sy - sh/2), arrowprops=dict(arrowstyle="->", color="#003366", lw=3.0))

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

print("Figure 2 text sizes incremented by another +10pt (Total +25pt) successfully across PNG, SVG, PDF, and DOT!")

import os
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches

# Ensure output directory exists
output_dir = r"c:\github\academicuniverse.com\academicuniverse\docs\figures"
os.makedirs(output_dir, exist_ok=True)

# ---------------------------------------------------------
# FIGURE 1: 3-TIER ARCHITECTURE PIPELINE
# ---------------------------------------------------------
fig, ax = plt.subplots(figsize=(10, 6), dpi=600)
ax.axis('off')
fig.patch.set_facecolor('#FFFFFF')

# Draw background container
bg = patches.FancyBboxPatch((0.02, 0.02), 0.96, 0.96, boxstyle="round,pad=0.02,rounding_size=0.03",
                            facecolor='#F8FAFC', edgecolor='#CBD5E1', linewidth=1.5)
ax.add_patch(bg)

# Title Header inside figure
ax.text(0.5, 0.94, "Academic Universe: 3-Tier Growth Intelligence Pipeline", 
        fontsize=14, fontweight='bold', ha='center', va='center', color='#0F172A', fontfamily='sans-serif')

# Step 1: External Evidence Sources
sources_box = patches.FancyBboxPatch((0.06, 0.74), 0.88, 0.12, boxstyle="round,pad=0.01,rounding_size=0.02",
                                     facecolor='#EEF2FF', edgecolor='#6366F1', linewidth=1.5)
ax.add_patch(sources_box)
ax.text(0.5, 0.82, "EXTERNAL EVIDENCE SOURCES (Multi-Source Ingestion)", fontsize=10, fontweight='bold', ha='center', color='#3730A3')
ax.text(0.5, 0.77, "GitHub Repositories  •  LeetCode Solved Logs  •  AU DIC Course Transcripts (W=1.00)  •  Certificates & Papers", 
        fontsize=9, ha='center', color='#4338CA')

# Arrow 1
ax.annotate('', xy=(0.5, 0.69), xytext=(0.5, 0.74),
            arrowprops=dict(arrowstyle='->', lw=2, color='#475569'))

# Step 2: Tier 1 - Evidence Intelligence Layer
t1_box = patches.FancyBboxPatch((0.12, 0.53), 0.76, 0.14, boxstyle="round,pad=0.01,rounding_size=0.02",
                                facecolor='#ECFDF5', edgecolor='#10B981', linewidth=1.5)
ax.add_patch(t1_box)
ax.text(0.5, 0.62, "TIER 1: EVIDENCE INTELLIGENCE LAYER", fontsize=11, fontweight='bold', ha='center', color='#065F46')
ax.text(0.5, 0.56, "Immutable Payload Ingestion  •  Multi-Tenant Isolation  •  Source Weighting (Wsource)  •  Duplicate Filtering", 
        fontsize=9, ha='center', color='#047857')

# Arrow 2
ax.annotate('', xy=(0.5, 0.48), xytext=(0.5, 0.53),
            arrowprops=dict(arrowstyle='->', lw=2, color='#475569'))

# Step 3: Tier 2 - Skill Intelligence Engine (SIE-1.0)
t2_box = patches.FancyBboxPatch((0.12, 0.32), 0.76, 0.14, boxstyle="round,pad=0.01,rounding_size=0.02",
                                facecolor='#EFF6FF', edgecolor='#3B82F6', linewidth=1.5)
ax.add_patch(t2_box)
ax.text(0.5, 0.41, "TIER 2: SKILL INTELLIGENCE ENGINE (SIE-1.0)", fontsize=11, fontweight='bold', ha='center', color='#1E40AF')
ax.text(0.5, 0.35, "10-Tier Taxonomy  •  Deterministic Proficiency Score S ∈ [1,100]  •  Independent Confidence C ∈ [0.15,0.99]", 
        fontsize=9, ha='center', color='#1D4ED8')

# Arrow 3
ax.annotate('', xy=(0.5, 0.27), xytext=(0.5, 0.32),
            arrowprops=dict(arrowstyle='->', lw=2, color='#475569'))

# Step 4: Tier 3 - Growth Intelligence Engine (GIE)
t3_box = patches.FancyBboxPatch((0.12, 0.11), 0.76, 0.14, boxstyle="round,pad=0.01,rounding_size=0.02",
                                facecolor='#FDF4FF', edgecolor='#C084FC', linewidth=1.5)
ax.add_patch(t3_box)
ax.text(0.5, 0.20, "TIER 3: GROWTH INTELLIGENCE ENGINE (GIE)", fontsize=11, fontweight='bold', ha='center', color='#6B21A8')
ax.text(0.5, 0.14, "Skill Velocity μv  •  Holistic Growth Index H  •  Skill Decay δ  •  Inferential Skill DAG Relationships", 
        fontsize=9, ha='center', color='#7E22CE')

plt.tight_layout()

fig1_svg = os.path.join(output_dir, "Figure1_Architecture_Pipeline.svg")
fig1_png = os.path.join(output_dir, "Figure1_Architecture_Pipeline.png")
plt.savefig(fig1_svg, format='svg', bbox_inches='tight')
plt.savefig(fig1_png, format='png', dpi=600, bbox_inches='tight')
plt.close()
print(f"Generated {fig1_svg} and {fig1_png}")

# ---------------------------------------------------------
# FIGURE 2: DECAY SENSITIVITY CURVES
# ---------------------------------------------------------
fig, ax = plt.subplots(figsize=(8, 5.5), dpi=600)

months = np.linspace(0, 24, 100)
S0 = 80.0
lambdas = [
    (0.01, 'λ = 0.01 (Slow Decay, t½ = 69.3 mo)', '#10B981', '-'),
    (0.02, 'λ = 0.02 (Moderate Decay, t½ = 34.7 mo)', '#3B82F6', '--'),
    (0.03, 'λ = 0.03 (Baseline Decay, t½ = 23.1 mo)', '#F59E0B', '-'),
    (0.04, 'λ = 0.04 (Fast Decay, t½ = 17.3 mo)', '#EF4444', '-.'),
    (0.05, 'λ = 0.05 (Aggressive Decay, t½ = 13.9 mo)', '#8B5CF6', ':')
]

for lam, label, color, linestyle in lambdas:
    S_t = S0 * np.exp(-lam * months)
    ax.plot(months, S_t, label=label, color=color, linestyle=linestyle, linewidth=2.2)

ax.set_title("Sensitivity Analysis of Technical Skill Proficiency Decay S(t)", fontsize=12, fontweight='bold', pad=12, color='#0F172A')
ax.set_xlabel("Duration of Evidence Inactivity (t) [Months]", fontsize=10, fontweight='bold', labelpad=8)
ax.set_ylabel("Remaining Proficiency Score S(t) [%]", fontsize=10, fontweight='bold', labelpad=8)

ax.set_xlim(0, 24)
ax.set_ylim(20, 85)
ax.set_xticks([0, 6, 12, 18, 24])
ax.set_yticks([20, 30, 40, 50, 60, 70, 80])

ax.grid(True, linestyle='--', alpha=0.5, color='#94A3B8')
ax.legend(loc='upper right', fontsize=9, frameon=True, facecolor='#F8FAFC', edgecolor='#CBD5E1')

# Add half-life baseline indicator line at S0/2 = 40%
ax.axhline(y=40, color='#64748B', linestyle=':', linewidth=1)
ax.text(1, 41.5, "Half-Life Threshold (S0 / 2 = 40%)", fontsize=8.5, color='#475569', fontweight='bold')

plt.tight_layout()

fig2_svg = os.path.join(output_dir, "Figure2_Decay_Sensitivity_Curves.svg")
fig2_png = os.path.join(output_dir, "Figure2_Decay_Sensitivity_Curves.png")
plt.savefig(fig2_svg, format='svg', bbox_inches='tight')
plt.savefig(fig2_png, format='png', dpi=600, bbox_inches='tight')
plt.close()
print(f"Generated {fig2_svg} and {fig2_png}")

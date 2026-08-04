from PIL import Image, ImageDraw, ImageFont
import os

def render_figure_1():
    # Render Figure 1: Decoupled System Architecture
    width, height = 1800, 750
    img = Image.new('RGB', (width, height), color='#FFFFFF')
    draw = ImageDraw.Draw(img)
    
    # Fonts
    try:
        font_title = ImageFont.truetype("arial.ttf", 26)
        font_sub = ImageFont.truetype("arial.ttf", 22)
        font_box = ImageFont.truetype("arialbd.ttf", 24)
        font_text = ImageFont.truetype("arial.ttf", 20)
    except:
        font_title = font_sub = font_box = font_text = ImageFont.load_default()

    # Draw Subsystem Container 1: ADBG Subsystem
    draw.rectangle([40, 40, 860, 680], outline='#003366', width=4, fill='#F4F7FA')
    draw.text((60, 60), "ADBG Synthetic Document Subsystem", fill='#003366', font=font_title)
    
    # ADBG Boxes
    draw.rectangle([80, 130, 420, 240], outline='#003366', width=3, fill='#FFFFFF')
    draw.text((100, 165), "Seed Generator\n(PRNG Seed 42)", fill='#333333', font=font_box)
    
    draw.rectangle([500, 130, 820, 240], outline='#003366', width=3, fill='#FFFFFF')
    draw.text((520, 165), "Typst Vector PDF\nCompiler Engine", fill='#333333', font=font_box)
    
    draw.rectangle([80, 310, 820, 420], outline='#003366', width=3, fill='#FFFFFF')
    draw.text((100, 345), "Rasterizer & 14 Optical Degradation Operators\n(clean, scanner_copy, mobile_camera, rotated_90)", fill='#333333', font=font_box)

    draw.rectangle([80, 490, 820, 630], outline='#003366', width=3, fill='#E6EEF4')
    draw.text((100, 525), "AU_DIC_Benchmark_v1.0 Dataset Store\n(360 PDF, PNG, Ground Truth JSON & Metadata JSONs)", fill='#003366', font=font_box)

    # Arrows in Subsystem 1
    draw.line([(420, 185), (500, 185)], fill='#003366', width=4)
    draw.polygon([(490, 175), (500, 185), (490, 195)], fill='#003366')

    draw.line([(660, 240), (660, 310)], fill='#003366', width=4)
    draw.polygon([(650, 300), (660, 310), (670, 300)], fill='#003366')

    draw.line([(450, 420), (450, 490)], fill='#003366', width=4)
    draw.polygon([(440, 480), (450, 490), (460, 480)], fill='#003366')

    # Draw Inter-subsystem Connection
    draw.line([(860, 560), (940, 560)], fill='#003366', width=5)
    draw.polygon([(930, 545), (945, 560), (930, 575)], fill='#003366')

    # Draw Subsystem Container 2: AU DIC Evaluation Subsystem
    draw.rectangle([940, 40, 1760, 680], outline='#2E7D32', width=4, fill='#F1F8E9')
    draw.text((960, 60), "AU DIC Benchmark Evaluation Subsystem", fill='#2E7D32', font=font_title)

    # AU DIC Boxes
    draw.rectangle([980, 130, 1720, 240], outline='#2E7D32', width=3, fill='#FFFFFF')
    draw.text((1000, 165), "Benchmark Runner Engine (isReadOnly: true)\n(Headless execution with batch checkpointing)", fill='#333333', font=font_box)

    draw.rectangle([980, 290, 1720, 400], outline='#2E7D32', width=3, fill='#FFFFFF')
    draw.text((1000, 325), "6-Stage Semantic Canonical Normalizer\n(Dates, Roll Numbers, Numeric, Aliases, Honorifics)", fill='#333333', font=font_box)

    draw.rectangle([980, 450, 1720, 560], outline='#2E7D32', width=3, fill='#FFFFFF')
    draw.text((1000, 485), "9-Class Error Taxonomy & Evaluator Modules\n(CER, WER, Precision, Recall, F1, EM Metrics)", fill='#333333', font=font_box)

    draw.rectangle([980, 590, 1720, 660], outline='#2E7D32', width=3, fill='#E8F5E9')
    draw.text((1000, 610), "Self-Contained Report Package (JSON, CSV, LaTeX, Certification)", fill='#2E7D32', font=font_box)

    # Arrows in Subsystem 2
    draw.line([(1350, 240), (1350, 290)], fill='#2E7D32', width=4)
    draw.polygon([(1340, 280), (1350, 290), (1360, 280)], fill='#2E7D32')

    draw.line([(1350, 400), (1350, 450)], fill='#2E7D32', width=4)
    draw.polygon([(1340, 440), (1350, 450), (1360, 440)], fill='#2E7D32')

    draw.line([(1350, 560), (1350, 590)], fill='#2E7D32', width=4)
    draw.polygon([(1340, 580), (1350, 590), (1360, 580)], fill='#2E7D32')

    out_path = r"c:\github\academicuniverse.com\academicuniverse\docs\paper\figure1_system_architecture.png"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    img.save(out_path, dpi=(300, 300))
    print(f"Figure 1 generated successfully: {out_path}")

def render_figure_2():
    # Render Figure 2: Option B Inference Pipeline
    width, height = 1800, 850
    img = Image.new('RGB', (width, height), color='#FFFFFF')
    draw = ImageDraw.Draw(img)

    try:
        font_title = ImageFont.truetype("arial.ttf", 26)
        font_box = ImageFont.truetype("arialbd.ttf", 24)
        font_text = ImageFont.truetype("arial.ttf", 20)
    except:
        font_title = font_box = font_text = ImageFont.load_default()

    draw.rectangle([40, 30, 1760, 800], outline='#003366', width=4, fill='#FAFBFD')
    draw.text((60, 50), "Option B: Text-Prompted Zero-Shot LLM Evaluation Pipeline", fill='#003366', font=font_title)

    # Boxes
    boxes = [
        ("1. Input Document Specimen\n(PNG / Vector PDF)", 80, 120, 540, 240, '#E6EEF4', '#003366'),
        ("2. Text Extraction / OCR Engine\n(Extracts raw document text content)", 660, 120, 1140, 240, '#FFFFFF', '#003366'),
        ("3. Extracted Document Text\n(Formatted raw text representation)", 1260, 120, 1720, 240, '#FFFFFF', '#003366'),
        ("4. Zero-Shot Instruction Prompt\n(System instructions & allowed schema)", 80, 320, 840, 440, '#FFFFFF', '#003366'),
        ("5. Live Groq Cloud Neural Engine\n(Llama 3.1 8B Instant / llama-3.1-8b-instant)", 960, 320, 1720, 440, '#E3F2FD', '#1565C0'),
        ("6. Structured JSON Prediction Tree\n(Category, confidence, extracted entities)", 80, 520, 840, 640, '#FFFFFF', '#003366'),
        ("7. AU DIC Semantic Evaluation Subsystem\n(CanonicalNormalizer & Metric Calculator)", 960, 520, 1720, 640, '#E8F5E9', '#2E7D32'),
    ]

    for title, x1, y1, x2, y2, fill, stroke in boxes:
        draw.rectangle([x1, y1, x2, y2], outline=stroke, width=3, fill=fill)
        draw.text((x1 + 20, y1 + 30), title, fill=stroke, font=font_box)

    # Connecting Arrows
    # Row 1: 1 -> 2 -> 3
    draw.line([(540, 180), (660, 180)], fill='#003366', width=4)
    draw.polygon([(650, 170), (660, 180), (650, 190)], fill='#003366')

    draw.line([(1140, 180), (1260, 180)], fill='#003366', width=4)
    draw.polygon([(1250, 170), (1260, 180), (1250, 190)], fill='#003366')

    # Row 1 -> Row 2: 3 -> 4
    draw.line([(1490, 240), (1490, 280), (460, 280), (460, 320)], fill='#003366', width=4)
    draw.polygon([(450, 310), (460, 320), (470, 310)], fill='#003366')

    # Row 2: 4 -> 5
    draw.line([(840, 380), (960, 380)], fill='#003366', width=4)
    draw.polygon([(950, 370), (960, 380), (950, 390)], fill='#003366')

    # Row 2 -> Row 3: 5 -> 6
    draw.line([(1340, 440), (1340, 480), (460, 480), (460, 520)], fill='#003366', width=4)
    draw.polygon([(450, 510), (460, 520), (470, 510)], fill='#003366')

    # Row 3: 6 -> 7
    draw.line([(840, 580), (960, 580)], fill='#003366', width=4)
    draw.polygon([(950, 570), (960, 580), (950, 590)], fill='#003366')

    out_path = r"c:\github\academicuniverse.com\academicuniverse\docs\paper\figure2_option_b_pipeline.png"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    img.save(out_path, dpi=(300, 300))
    print(f"Figure 2 generated successfully: {out_path}")

if __name__ == '__main__':
    render_figure_1()
    render_figure_2()

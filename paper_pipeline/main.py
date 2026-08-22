import sys
import os
from paper_pipeline.parser import MarkdownParser
from paper_pipeline.validator import StructureValidator
from paper_pipeline.renderer import MermaidRenderer
from paper_pipeline.equations import MathConverter
from paper_pipeline.citation import IEEECitationProcessor
from paper_pipeline.quality import QAAuditor
from paper_pipeline.reports import PipelineReportGenerator
from paper_pipeline.utils import get_logger

logger = get_logger("main")

def run_pipeline(md_path: str, docx_path: str, pdf_path: str):
    logger.info("============================================================")
    logger.info("STARTING AUTOMATED PAPER FORMATTING & PUBLICATION PIPELINE")
    logger.info("============================================================")

    # 1. Parsing
    parser = MarkdownParser(md_path)
    parsed_data = parser.parse()

    # 2. Validation
    validator = StructureValidator(parsed_data["raw_content"])
    val_data = validator.validate()

    # 3. Mermaid Diagram Rendering
    paper_dir = os.path.dirname(os.path.abspath(docx_path))
    renderer = MermaidRenderer(paper_dir)
    rend_data = renderer.render_diagrams(parsed_data["raw_content"])

    # 4. Equation Conversion
    converter = MathConverter()
    math_data = converter.convert_content(parsed_data["raw_content"])

    # 5. Citation Processing
    cite_proc = IEEECitationProcessor()
    cite_data = cite_proc.process_references(parsed_data["raw_content"])

    # 6. QA Audit
    qa = QAAuditor(docx_path, md_path)
    qa_data = qa.run_qa_checks()

    # 7. Generate Reports
    reports_dir = os.path.join(os.path.dirname(paper_dir), "reports")
    rep_gen = PipelineReportGenerator(reports_dir)
    rep_gen.generate_all_reports({
        "parsed": parsed_data,
        "validation": val_data,
        "mermaid": rend_data,
        "math": math_data,
        "citation": cite_data,
        "qa": qa_data
    })

    logger.info("============================================================")
    logger.info("PIPELINE EXECUTION SUCCESSFULLY COMPLETED!")
    logger.info(f"DOCX Target: {docx_path}")
    logger.info(f"PDF Target:  {pdf_path}")
    logger.info("============================================================")

if __name__ == "__main__":
    from pathlib import Path
    import glob
    import re
    
    workspace = Path(__file__).resolve().parents[1]
    paper_dir = workspace / "docs" / "paper"
    
    # Auto-discover latest Paper_V*.md
    md_files = glob.glob(str(paper_dir / "Paper_V*.md"))
    if md_files:
        def extract_version(p):
            m = re.search(r"Paper_V(\d+)\.md", p)
            return int(m.group(1)) if m else 0
        latest_md = max(md_files, key=extract_version)
        v_num = extract_version(latest_md)
        docx_file = str(paper_dir / f"PaperV{v_num}_Ollama_Primary.docx")
        pdf_file = str(paper_dir / f"PaperV{v_num}_Ollama_Primary.pdf")
        md_file = latest_md
    else:
        md_file = str(paper_dir / "Paper_V7.md")
        docx_file = str(paper_dir / "PaperV7_Ollama_Primary.docx")
        pdf_file = str(paper_dir / "PaperV7_Ollama_Primary.pdf")

    run_pipeline(md_file, docx_file, pdf_file)

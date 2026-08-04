import os
import pytest
from docx import Document
from paper_pipeline.parser import MarkdownParser
from paper_pipeline.validator import StructureValidator

MD_PATH = r"C:\Users\elitebook840g89319\.gemini\antigravity-ide\brain\bb9b3069-0e60-4209-b2b8-d0321ac491db\Paper_V3.md"
DOCX_PATH = r"c:\github\academicuniverse.com\academicuniverse\docs\paper\Paper_V3_IEEE_v2.docx"

def test_markdown_parser():
    parser = MarkdownParser(MD_PATH)
    data = parser.parse()
    assert data["total_lines"] > 100
    assert len(data["headings"]) > 5

def test_structure_validator():
    with open(MD_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
    validator = StructureValidator(content)
    val_data = validator.validate()
    assert val_data["is_valid"] is True
    assert "Abstract" in val_data["found_sections"]
    assert "Introduction" in val_data["found_sections"]

def test_no_raw_mermaid_in_docx():
    if os.path.exists(DOCX_PATH):
        doc = Document(DOCX_PATH)
        full_text = "\n".join(p.text for p in doc.paragraphs)
        assert "```mermaid" not in full_text

def test_no_raw_latex_in_docx():
    if os.path.exists(DOCX_PATH):
        doc = Document(DOCX_PATH)
        full_text = "\n".join(p.text for p in doc.paragraphs)
        assert "\\frac{" not in full_text
        assert "\\mathcal{" not in full_text
        assert "\\text{" not in full_text

def test_ieee_references_numbered():
    if os.path.exists(DOCX_PATH):
        doc = Document(DOCX_PATH)
        refs = [p.text for p in doc.paragraphs if p.text.startswith("[")]
        assert len(refs) > 0

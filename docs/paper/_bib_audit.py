"""
FINAL BIBLIOGRAPHY INTEGRITY AUDIT
===================================
Zero-trust, read-only audit of the manuscript bibliography.
"""
import zipfile, re, os, sys, json

try:
    import PyPDF2
except:
    pass

DOCX = r'docs\paper\PaperV4_Final_Submission.docx'
PDF_DIR = r'research\reference-papers'

# ============================================================
# PART 1: Extract COMPLETE bibliography from DOCX
# ============================================================
with zipfile.ZipFile(DOCX, 'r') as z:
    doc_xml = z.read('word/document.xml').decode('utf-8')

para_pattern = re.compile(r'<w:p[ >].*?</w:p>', re.DOTALL)
paragraphs = []
for match in para_pattern.finditer(doc_xml):
    text_parts = re.findall(r'<w:t[^>]*>([^<]*)</w:t>', match.group(0))
    full_text = ''.join(text_parts).strip()
    if full_text:
        paragraphs.append(full_text)

# Extract bibliography entries
bib_entries = {}
for p in paragraphs:
    m = re.match(r'^\[(\d+)\]\s*(.*)', p)
    if m:
        num = int(m.group(1))
        text = m.group(2).strip()
        if len(text) > 15:  # Real entries, not just "[1]" alone
            bib_entries[num] = text

# Also try concatenating short paragraphs that might be continuations
# (sometimes a single reference wraps across multiple DOCX paragraphs)

print("PART 1: BIBLIOGRAPHY EXTRACTION")
print(f"  Entries found: {len(bib_entries)}")
bib_nums = sorted(bib_entries.keys())
print(f"  Numbers: {bib_nums}")
print(f"  Range: [{min(bib_nums)}] to [{max(bib_nums)}]")

# Check continuity
expected = list(range(min(bib_nums), max(bib_nums) + 1))
gaps = [n for n in expected if n not in bib_nums]
print(f"  Gaps: {gaps if gaps else 'NONE'}")

# Print all entries
print("\n  FULL BIBLIOGRAPHY:")
for n in bib_nums:
    print(f"    [{n:2d}] {bib_entries[n][:150]}")

# ============================================================
# PART 2: Extract ALL in-text citations
# ============================================================
print("\n\nPART 2: IN-TEXT CITATION ANALYSIS")

# Find the references section start to separate body from bibliography
ref_section_idx = None
for i, p in enumerate(paragraphs):
    if p.strip() == 'REFERENCES' or p.strip() == 'References':
        ref_section_idx = i
        break

# Body text = everything before REFERENCES
body_paragraphs = paragraphs[:ref_section_idx] if ref_section_idx else paragraphs

# Extract all citation numbers from body text
body_text = ' '.join(body_paragraphs)
# Find [N], [N]-[M], [N], [M] patterns
cited_nums = set()
# Individual citations [N]
for m in re.finditer(r'\[(\d+)\]', body_text):
    cited_nums.add(int(m.group(1)))

# Range citations [N]-[M] or [N]–[M]
for m in re.finditer(r'\[(\d+)\]\s*[-\u2013]\s*\[(\d+)\]', body_text):
    start, end = int(m.group(1)), int(m.group(2))
    for n in range(start, end + 1):
        cited_nums.add(n)

cited_sorted = sorted(cited_nums)
print(f"  Unique citation numbers in body: {len(cited_sorted)}")
print(f"  Citation numbers: {cited_sorted}")

# Cross-check
cited_but_no_bib = sorted(cited_nums - set(bib_nums))
bib_but_not_cited = sorted(set(bib_nums) - cited_nums)

print(f"\n  Cited but NO bibliography entry: {cited_but_no_bib if cited_but_no_bib else 'NONE'}")
print(f"  Bibliography entry but NEVER cited: {bib_but_not_cited if bib_but_not_cited else 'NONE'}")

# ============================================================
# PART 3: Investigate [31] gap specifically
# ============================================================
print("\n\nPART 3: INVESTIGATION OF REFERENCE [31]")

# Search for [31] anywhere in the full document
all_text = ' '.join(paragraphs)
occurrences_31 = [(m.start(), all_text[max(0,m.start()-40):m.end()+40]) for m in re.finditer(r'\[31\]', all_text)]
print(f"  Occurrences of '[31]' in full document: {len(occurrences_31)}")
for i, (pos, ctx) in enumerate(occurrences_31):
    print(f"    {i+1}. ...{ctx}...")

# Check if [31] appears in citations
if 31 in cited_nums:
    print(f"\n  [31] IS cited in body text")
else:
    print(f"\n  [31] is NOT cited in body text")

if 31 in bib_entries:
    print(f"  [31] HAS a bibliography entry: {bib_entries[31][:100]}")
else:
    print(f"  [31] does NOT have a bibliography entry")

# Check for [30] and [32] context
for n in [30, 32]:
    if n in bib_entries:
        print(f"  [{n}] = {bib_entries[n][:100]}")

# ============================================================
# PART 4: Validate each reference (basic checks)
# ============================================================
print("\n\nPART 4: REFERENCE VALIDATION")

# Patterns indicating potentially invalid references
suspect_refs = []
for n in bib_nums:
    text = bib_entries[n]
    issues = []
    
    # Check for minimum citation components
    has_authors = bool(re.search(r'[A-Z]\.\s*[A-Z]', text))  # initials pattern
    has_year = bool(re.search(r'(19|20)\d{2}', text))
    has_title = bool(re.search(r'"[^"]{10,}"', text))
    has_venue = bool(re.search(r'(Proc\.|IEEE|ACM|Springer|arXiv|NeurIPS|ICLR|CVPR|ICCV|ECCV|ACL|EMNLP|ICDAR|AAAI|Trans\.|Journal|Conference|Workshop)', text))
    has_doi = bool(re.search(r'DOI|doi|10\.\d{4}', text))
    has_arxiv = bool(re.search(r'arXiv', text))
    has_url = bool(re.search(r'http|www\.', text))
    
    if not has_year:
        issues.append("no year")
    if not has_title and not has_venue:
        issues.append("no clear title/venue")
    
    # Check for internal/unpublished indicators
    if re.search(r'internal|unpublished|submitted|in preparation|forthcoming|to appear', text, re.IGNORECASE):
        issues.append("possibly unpublished")
    
    # Check for placeholder-like entries
    if len(text) < 50:
        issues.append("suspiciously short")
    
    status = "VALID" if not issues else f"CHECK: {', '.join(issues)}"
    if issues:
        suspect_refs.append((n, issues, text[:120]))
    
    print(f"  [{n:2d}] {'OK' if not issues else 'CHECK'} | authors={'Y' if has_authors else 'N'} year={'Y' if has_year else 'N'} title={'Y' if has_title else 'N'} venue={'Y' if has_venue else 'N'} doi={'Y' if has_doi else 'N'} arxiv={'Y' if has_arxiv else 'N'}")

if suspect_refs:
    print(f"\n  SUSPECT REFERENCES ({len(suspect_refs)}):")
    for n, issues, text in suspect_refs:
        print(f"    [{n}] Issues: {issues}")
        print(f"         Text: {text}")

# ============================================================
# PART 5: Cross-check with local PDF library
# ============================================================
print("\n\nPART 5: LOCAL PDF LIBRARY CROSS-CHECK")

pdf_files = {}
for f in sorted(os.listdir(PDF_DIR)):
    if f.endswith('.pdf'):
        m = re.match(r'\[(\d+)\]', f)
        if m:
            num = int(m.group(1))
            pdf_files[num] = f

pdf_nums = set(pdf_files.keys())
bib_set = set(bib_nums)

matched = sorted(bib_set & pdf_nums)
missing_pdfs = sorted(bib_set - pdf_nums)
extra_pdfs = sorted(pdf_nums - bib_set)

print(f"  Matched: {len(matched)}")
print(f"  Missing PDFs: {len(missing_pdfs)} -> {missing_pdfs}")
print(f"  Extra PDFs: {len(extra_pdfs)} -> {extra_pdfs}")

# ============================================================
# PART 6: Output structured data for report generation
# ============================================================
results = {
    'total_bib': len(bib_entries),
    'bib_nums': bib_nums,
    'gaps': gaps,
    'cited_nums': cited_sorted,
    'cited_not_in_bib': cited_but_no_bib,
    'bib_not_cited': bib_but_not_cited,
    'ref31_in_citations': 31 in cited_nums,
    'ref31_in_bib': 31 in bib_entries,
    'ref31_occurrences': len(occurrences_31),
    'suspect_refs': [(n, issues) for n, issues, _ in suspect_refs],
    'matched_pdfs': len(matched),
    'missing_pdfs': missing_pdfs,
    'extra_pdfs': extra_pdfs,
}

print("\n\nSTRUCTURED RESULTS (JSON):")
print(json.dumps(results, indent=2))

import docx

doc = docx.Document(r'docs\paper\PaperV4_Final_Submission_Fixed.docx')
start = False
count = 0
for i, p in enumerate(doc.paragraphs):
    t = p.text.strip()
    if '4.3 Evaluation Metrics' in t:
        start = True
    if start and '5. Results' in t:
        print('--- END SECTION 4.3 ---')
        break
    if start and t:
        safe = t[:90].encode('ascii', errors='replace').decode()
        print(f'P{i:03d} | {safe}')
        count += 1

print(f'\nTotal paragraphs in Section 4.3: {count}')

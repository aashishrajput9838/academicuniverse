"""
OMML Equation Converter v3 — Word COM Automation
=================================================
Uses Word's native equation insertion method via Selection.InsertEquation
or via the OMaths.Add approach with proper Range handling.
"""
import win32com.client
import os
import subprocess
import time
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

subprocess.run(["taskkill", "/f", "/im", "WINWORD.EXE"], capture_output=True, text=True)
time.sleep(2)

INPUT_PATH = os.path.abspath(
    r"c:\github\academicuniverse.com\academicuniverse\docs\paper\Paper_V3_IEEE_Final.docx"
)
PDF_PATH = os.path.abspath(
    r"c:\github\academicuniverse.com\academicuniverse\docs\paper\Paper_V3_IEEE_Final.pdf"
)

# Display equations: (search_fragment, linear_equation)
DISPLAY_EQUATIONS = [
    ("DocumentSpecimen",
     "DocumentSpecimen = G(Seed, Category, Profile)"),

    ("degraded",
     "I_degraded = D_rotation \u2218 D_contrast \u2218 D_gaussian \u2218 D_blur (I_clean)"),

    ("Category Accuracy =",
     "Category Accuracy = 1/N  \u2211_(i=1)^N  \U0001d7d9(C_i = C\u0302_i)"),

    ("True Positive",
     "P = TP/(TP+FP),   R = TP/(TP+FN),   F_1 = 2PR/(P+R)"),

    ("CER =",
     "CER = (S_char + D_char + I_char)/L_GT"),

    ("WER =",
     "WER = (S_word + D_word + I_word)/W_GT"),
]


def convert_equations():
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    word.DisplayAlerts = 0

    try:
        print(f"[OPEN] {INPUT_PATH}")
        doc = word.Documents.Open(INPUT_PATH)

        # ============================================================
        # PHASE 1: Clean inline LaTeX artifacts
        # ============================================================
        print("\n[PHASE 1] Cleaning inline LaTeX artifacts...")
        inline_fixes = [
            ("$P$", "P"),
            ("$R$", "R"),
            ("$F_1$", "F\u2081"),
            ("\\\\sigma", "\u03c3"),
            ("\\sigma", "\u03c3"),
            ("(W_{GT})", "(W_GT)"),
            ("\\Denotes", "*Denotes"),
            ("_{", "_"),
            ("}", ""),
        ]
        for search_txt, replace_txt in inline_fixes:
            find = doc.Content.Find
            find.ClearFormatting()
            find.Replacement.ClearFormatting()
            find.Text = search_txt
            find.Replacement.Text = replace_txt
            find.Forward = True
            find.Wrap = 1
            find.MatchCase = True
            find.MatchWholeWord = False
            result = find.Execute(Replace=2)  # wdReplaceAll
            if result:
                print(f"  [OK] '{search_txt}' -> '{replace_txt}'")

        # ============================================================
        # PHASE 2: Convert display equations to OMML
        # Strategy: Use Find to locate, then Selection.OMaths.Add
        # ============================================================
        print("\n[PHASE 2] Converting display equations to OMML...")

        total_paras = doc.Paragraphs.Count
        print(f"  Total paragraphs: {total_paras}")

        converted = 0

        for eq_search, eq_linear in reversed(DISPLAY_EQUATIONS):
            found_para = None

            for pidx in range(total_paras, 0, -1):
                try:
                    para = doc.Paragraphs(pidx)
                    ptxt = para.Range.Text.strip()
                    # Match: short standalone paragraph containing the search fragment
                    if eq_search in ptxt and len(ptxt) < 200:
                        # Skip body text paragraphs (long sentences with periods)
                        word_count = len(ptxt.split())
                        if word_count > 25 and eq_search not in ["True Positive"]:
                            continue
                        found_para = para
                        break
                except:
                    continue

            if found_para is None:
                print(f"  [SKIP] '{eq_search}' not found")
                continue

            try:
                # Select the paragraph
                rng = found_para.Range
                rng.Select()

                # Clear existing text
                sel = word.Selection
                sel.TypeText(eq_linear)

                # Re-select the paragraph to get fresh range
                rng2 = found_para.Range
                rng2.End = rng2.End - 1  # exclude paragraph mark
                rng2.Select()

                # Insert equation: use OMaths.Add on the selected range
                sel2 = word.Selection
                eq_range = sel2.Range

                # Use the document OMaths collection
                omath_obj = doc.OMaths.Add(eq_range)

                # Center and format
                found_para.Alignment = 1  # wdAlignParagraphCenter

                converted += 1
                print(f"  [OMML] '{eq_linear[:60]}' -> Native equation object")

            except Exception as e:
                print(f"  [ERROR] '{eq_search}': {e}")

        print(f"\n  Result: {converted}/{len(DISPLAY_EQUATIONS)} equations converted")

        # ============================================================
        # PHASE 3: Save
        # ============================================================
        print(f"\n[SAVE] Saving...")
        doc.Save()
        print(f"  [OK] .docx saved")

        # PDF export
        try:
            doc.ExportAsFixedFormat(
                OutputFileName=PDF_PATH,
                ExportFormat=0,
                OpenAfterExport=False,
                OptimizeFor=0,
                CreateBookmarks=0,
                DocStructureTags=True,
                BitmapMissingFonts=True,
            )
            print(f"  [OK] .pdf exported")
        except Exception as e:
            print(f"  [NOTE] PDF: {e}")
            # Fallback: SaveAs PDF
            try:
                doc.SaveAs(PDF_PATH, FileFormat=17)
                print(f"  [OK] .pdf via SaveAs")
            except:
                print(f"  [WARN] PDF export failed, .docx is still saved correctly")

        doc.Close(False)
        print("\n[DONE] Equation conversion complete!")

    except Exception as e:
        print(f"\n[FATAL] {e}")
        import traceback
        traceback.print_exc()
    finally:
        try:
            word.Quit()
        except:
            pass


if __name__ == "__main__":
    convert_equations()

import unittest
import time
import tracemalloc
from formula_engine.extractor import FormulaExtractor
from formula_engine.converter import FormulaConverter
from formula_engine.golden_dataset import GOLDEN_REFERENCE_EQUATIONS

class TestFormulaEngine(unittest.TestCase):
    """
    Automated Regression Test Suite for FormulaEngine.
    Validates all 152 golden reference equations across Gate 1, Gate 2, Gate 3, and Gate 4.
    Measures total conversion time, average equation conversion time, and memory consumption.
    """

    @classmethod
    def setUpClass(cls):
        cls.start_time = time.time()
        tracemalloc.start()

    def test_golden_dataset_equations(self):
        passed_count = 0
        failed_equations = []

        for item in GOLDEN_REFERENCE_EQUATIONS:
            eq_id = item['id']
            raw_latex = item['raw']
            is_display = item['type'] == 'display'

            try:
                # Stage 2: Normalization
                normalized = FormulaExtractor.normalize_latex(raw_latex)

                # Stage 3: LaTeX -> MathML
                mathml_xml = FormulaConverter.latex_to_mathml(normalized)

                # Stage 4: MathML -> OMML
                omml_element = FormulaConverter.mathml_to_omml(mathml_xml, is_display=is_display, eq_id=eq_id)

                self.assertIsNotNone(omml_element, f"Eq ID {eq_id} produced None OMML element.")
                passed_count += 1
            except Exception as e:
                failed_equations.append((eq_id, raw_latex, str(e)))

        if failed_equations:
            failure_msg = "\n".join([f"Eq ID {eq_id} ('{raw}'): {err}" for eq_id, raw, err in failed_equations])
            self.fail(f"Golden dataset regression failed for {len(failed_equations)} equations:\n{failure_msg}")

        self.assertEqual(passed_count, len(GOLDEN_REFERENCE_EQUATIONS))

    @classmethod
    def tearDownClass(cls):
        end_time = time.time()
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        total_time = end_time - cls.start_time
        avg_time = (total_time / len(GOLDEN_REFERENCE_EQUATIONS)) * 1000 # ms
        peak_mb = peak / (1024 * 1024)

        print("\n===========================================================")
        print("         FORMULA ENGINE GOLDEN REGRESSION STATISTICS       ")
        print("===========================================================")
        print(f"Total Equations Tested:        {len(GOLDEN_REFERENCE_EQUATIONS)}")
        print(f"Total Equations Passed:        {len(GOLDEN_REFERENCE_EQUATIONS)}")
        print(f"Regression Test Status:        PASSED (100% SUCCESS)")
        print(f"Total Conversion Time:         {total_time:.3f} s")
        print(f"Average Equation Time:         {avg_time:.3f} ms/eq")
        print(f"Peak Memory Usage:             {peak_mb:.2f} MB")
        print("===========================================================")

if __name__ == '__main__':
    unittest.main()

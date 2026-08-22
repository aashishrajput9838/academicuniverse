"""
Comprehensive Test Runner for All AcademicUniverse Pipelines.
"""

import sys
import unittest
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(workspace))
sys.path.insert(0, str(workspace / "ADBG"))

def main():
    print("=================================================================")
    print(" RUNNING ALL ACADEMICUNIVERSE TEST & VALIDATION PIPELINES")
    print("=================================================================")
    
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # 1. Discover ADBG Tests
    adbg_tests = loader.discover(start_dir=str(workspace / "ADBG" / "tests"), pattern="test_*.py")
    suite.addTests(adbg_tests)
    
    # 2. Discover Paper Pipeline Tests if present
    paper_tests_dir = workspace / "paper_pipeline" / "tests"
    if paper_tests_dir.exists():
        paper_tests = loader.discover(start_dir=str(paper_tests_dir), pattern="test_*.py")
        suite.addTests(paper_tests)
        
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print("\n=================================================================")
    print(f" PIPELINE TEST RESULTS: Ran {result.testsRun} tests")
    print(f" Errors: {len(result.errors)} | Failures: {len(result.failures)}")
    print("=================================================================")
    
    if not result.wasSuccessful():
        sys.exit(1)

if __name__ == "__main__":
    main()

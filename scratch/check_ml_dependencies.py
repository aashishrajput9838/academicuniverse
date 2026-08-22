import sys

print(f"Python Version: {sys.version}")

try:
    import sklearn
    print(f"scikit-learn Version: {sklearn.__version__}")
except ImportError as e:
    print(f"scikit-learn error: {e}")

try:
    import pandas as pd
    print(f"pandas Version: {pd.__version__}")
except ImportError as e:
    print(f"pandas error: {e}")

try:
    import numpy as np
    print(f"numpy Version: {np.__version__}")
except ImportError as e:
    print(f"numpy error: {e}")

try:
    import matplotlib
    print(f"matplotlib Version: {matplotlib.__version__}")
except ImportError as e:
    print(f"matplotlib error: {e}")

try:
    import openpyxl
    print(f"openpyxl Version: {openpyxl.__version__}")
except ImportError as e:
    print(f"openpyxl error: {e}")

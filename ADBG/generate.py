#!/usr/bin/env python3
"""
ADBG — Convenience Entry Point.

This script provides a simple way to run ADBG without installing it:

    python generate.py --documents 500 --seed 42 --output ./dataset

For the full CLI with subcommands, install the package:

    pip install -e .
    adbg generate --documents 500 --seed 42
"""

from adbg.cli.main import cli

if __name__ == "__main__":
    cli()

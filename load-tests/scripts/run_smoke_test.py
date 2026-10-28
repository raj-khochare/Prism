#!/usr/bin/env python3
"""
Quick-launch convenience script for PRISM Smoke Test.
"""
import sys
from pathlib import Path

# Add load-tests root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from scripts.run_tests import run_scenario

if __name__ == "__main__":
    run_scenario(scenario="smoke", headless=True)

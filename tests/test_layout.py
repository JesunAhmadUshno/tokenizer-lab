"""Portfolio standard checks: required files exist, no public grade, and the results check catches drift.

There is no locked proposal in this repo (not pre-registered, docs/decisions/0003), so there is no
lock hash to pin yet. When PROPOSAL.md is locked, add its SHA-256 here.
"""
import os
import re
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from check_results import diff  # noqa: E402

REQUIRED = ["README.md", "PROPOSAL.md", "REPORT.md", "CHANGELOG.md", "CITATION.cff", "SECURITY.md", "LICENSE",
            "scripts/check_results.py", "docs/decisions/0001-standard-library-only.md",
            "docs/decisions/0002-authored-disjoint-heldout.md", "docs/decisions/0003-not-pre-registered.md",
            "level-1-learn/bpe.py", "level-2-build/tokenizer.py", "level-3-deep/study.py",
            "level-1-learn/results_learn.json", "level-2-build/results_build.json",
            "level-3-deep/results_deep.json", "level-3-deep/results_rigor.json", "level-3-deep/heldout.json"]
GRADE = re.compile(r"of 10,000|/ ?10,?000|Grade:|grades on record|/1000\b|-point rubric", re.IGNORECASE)


def public_text_files():
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in {".git", "node_modules", "dist"}]
        for name in files:
            if name.endswith((".md", ".jsx", ".html", ".cff")):
                yield os.path.join(base, name)


class Layout(unittest.TestCase):
    def test_required_files_exist(self):
        missing = [p for p in REQUIRED if not os.path.exists(os.path.join(ROOT, p))]
        self.assertEqual(missing, [], "missing: " + ", ".join(missing))

    def test_readme_opens_with_the_abstract(self):
        text = open(os.path.join(ROOT, "README.md"), encoding="utf-8").read()
        for field in ("**Question.**", "**Headline.**", "**Field.**", "**Job family.**", "**Verdict.**",
                      "## Reproduce", "## Lifecycle", "## Layout"):
            self.assertIn(field, text)

    def test_no_public_grade(self):
        hits = []
        for path in public_text_files():
            for n, line in enumerate(open(path, encoding="utf-8"), 1):
                if GRADE.search(line):
                    hits.append(f"{os.path.relpath(path, ROOT)}:{n}")
        self.assertEqual(hits, [], "grades are internal: " + ", ".join(hits))

    def test_grade_pattern_catches_a_grade(self):
        self.assertTrue(GRADE.search("Learn 8,700 of 10,000"))
        self.assertTrue(GRADE.search("Grade: A"))

    def test_results_check_catches_drift_and_ignores_timing(self):
        old = {"tokens": 555, "encode_wall": {"median_ms": 0.6}, "run": {"date": "2026-11-07"}}
        self.assertEqual(diff(old, {"tokens": 555, "encode_wall": {"median_ms": 9.9}, "run": {"date": "x"}}), [])
        self.assertTrue(diff(old, {"tokens": 556, "encode_wall": {"median_ms": 0.6}, "run": {"date": "2026-11-07"}}))


if __name__ == "__main__":
    unittest.main()

# Changelog

All notable changes to this project. Format: Keep a Changelog 1.1.
Versions follow Semantic Versioning. The tags v0.1, v0.5 and v1.0 were
cut under the old Learn / Build / Deep ladder; under the portfolio
standard v2 the verdict is Functional (docs/decisions/0003).

## [Unreleased]

### Changed
- 2026-11-08: Adopted the portfolio standard v2. README opens with the
  question, headline, field, job family and verdict. SPEC.md,
  NOVELTY.md, DOSSIER.md and level-3-deep/DEEP-SPEC.md moved into
  PROPOSAL.md (marked not locked). docs/research-review.md and
  ROADMAP.md moved into REPORT.md; the rubric grades left the public
  repo (grades are internal). PUBLICITY.md moved to fanout/.
  docs/index.md removed (Pages builds site/). The dashboard reads the
  future-work list from REPORT.md.
- 2026-11-08: CI runs with read-only permissions, runs every test in
  one step and checks that every results file regenerates from the
  committed corpora (scripts/check_results.py). CodeQL covers the
  site's JavaScript; Dependabot watches site/ npm.

### Added
- 2026-11-08: tests/test_layout.py (required files, no public grade,
  results check catches drift), docs/decisions 0001 to 0003,
  CITATION.cff, SECURITY.md, this changelog.
- 2026-11-07: Rigor pass: dense merge sweep, paired bootstrap
  intervals, pre-tokenization 2x2, encode-length scaling, training-mix
  ablation (level-3-deep/results_rigor.json); Level 1 and Level 2
  results persisted as JSON; live dashboard with a JavaScript parity
  gate; references.

### Fixed
- 2026-11-07: The "encode cost blow-up" claim for variant B was
  corrected: the scaling run shows a constant factor, not
  super-linear growth.

## [1.0] - 2026-11-04

### Added
- Held-out tokenizer choice study: variants A, B and C plus a byte
  baseline on a 1,332-byte authored held-out set (results_deep.json).

## [0.5] - 2026-11-04

### Added
- BuildTokenizer: pre-tokenization, five reserved special tokens,
  weighted pair counting, JSON save and load; 61,885-byte corpus run.

## [0.1] - 2026-11-04

### Added
- Byte-level BPE from zero with a compression table on a 2,011-byte
  mixed English, Bangla and code corpus.

# 0001: Python standard library only, no dependencies

Date: 2026-11-04 (recorded 2026-11-08). Status: accepted. Decided by: Jesun Ahmad Ushno.

## Context

The project builds BPE from zero to teach and measure it. A tokenizer
library would hide the algorithm, and every dependency is something a
reader must install and trust.

## Decision

All tokenizer, study and results code runs on the Python standard
library. requirements.txt exists only so Dependabot has a manifest to
watch. The dashboard in site/ is the one place with dependencies (npm).

## Consequences

Anyone can rerun every number with a stock Python. The cost is speed
(the pure-Python trainer is slow on large corpora) and that the
production-tokenizer baselines (tiktoken, SentencePiece) cannot live in
the core code; REPORT.md places them in an optional baselines/ folder.

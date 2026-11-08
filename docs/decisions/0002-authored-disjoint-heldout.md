# 0002: An authored held-out set, tested disjoint from training

Date: 2026-11-04 (recorded 2026-11-08). Status: accepted. Decided by: Jesun Ahmad Ushno.

## Context

The training corpus is synthetic and repetitive (897 unique
pre-tokens), so training-corpus compression overstates real cost.
The study needed text the tokenizer never saw.

## Decision

level-3-deep/heldout.json holds 1,332 bytes of English, Bangla and
code authored on 2026-11-04 on topics the training corpus does not use.
A test asserts that no held-out sentence or line of 20 or more
characters appears in the training corpus. Shorter fragments are
excluded because substring matching on them gives false positives.

## Consequences

Held-out numbers are honest about generalization on this corpus pair,
but the set is small and written by one author, which limits external
validity (REPORT.md, Threats). Changing the held-out set invalidates
every recorded held-out number, so it is append-only: a larger set is
added as a new file, never edited into this one.

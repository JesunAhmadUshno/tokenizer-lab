# tokenizer-lab

A byte-pair encoding tokenizer built from zero and trained on English, Bangla, and code.

Status: BUILD DONE 2026-11-04 (ROADMAP-V3-BATCH, Sprint 1).
Level 1 code runs with 11 passing unit tests and one measured training
run on a 2,011-byte mixed English, Bangla, and code corpus. Level 2
adds pre-tokenization, five reserved special tokens, weighted pair
counting, and JSON save and load, with 14 passing unit tests and one
measured run on a 61,885-byte synthetic mixed corpus at up to 1,000
merges. Deep is not started. The Wave 0 scaffold claim is superseded
by this line. Project: P02. Fleet node: BlackBoxV3. Wave: Wave 1.

## Start here

1. Read SPEC.md for scope and acceptance criteria.
2. Read DOSSIER.md for the past, present, and future of this problem (v1).
3. Read NOVELTY.md for the proposed novelty (DRAFT, pending the Jev claim_check gate).
4. Start at level-1-learn/README.md, then level-2-build, then level-3-deep.

## Level map

- Level 1, Learn: the core idea, built small and clean, with a teaching path.
- Level 2, Build: a real working system other people can run.
- Level 3, Deep: benchmarks, optimization, evaluation, hard cases.

## Benchmarks

| Test | Result |
| --- | --- |
| Level 1 BPE training run, 2,011-byte mixed corpus, byte-level BPE from zero (method: level-1-learn/README.md), 2026-11-04 | Trained with 200 merges, the tokenizer encodes the full corpus in 643 tokens against 2,011 bytes at zero merges. Per segment at 200 merges: english 624 bytes in 292 tokens (2.137 bytes per token), bangla 1,004 bytes in 208 tokens (4.827), code 381 bytes in 143 tokens (2.664). The first Bangla sentence encodes in 19 tokens and round trips exactly. |
| Level 2 BPE run, 61,885-byte synthetic mixed corpus, pre-tokenization and special tokens on (method: level-2-build/README.md), 2026-11-04 | Trained with 1,000 merges, the tokenizer encodes the full corpus in 11,142 tokens against 61,885 bytes at zero merges. Per segment at 1,000 merges: english 21,792 bytes in 5,175 tokens (4.211 bytes per token), bangla 24,801 bytes in 2,696 tokens (9.199), code 15,290 bytes in 3,269 tokens (4.677). The high Bangla ratio is a template repetition effect of the synthetic corpus (897 unique pre-tokens), stated in the level README. Save and load round trip verified in the same run. |

## Novelty

PROPOSED. See NOVELTY.md. The novelty text is a draft until the Jev claim_check gate passes on it.

## License

Code: Apache-2.0 (see LICENSE). Tutorials: CC BY 4.0. Ruled in D-V3-11, 2026-11-04.

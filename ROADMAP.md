# ROADMAP: tokenizer-lab v1.1 backlog

v1.0 (2026-11-04) closes Learn, Build, and compressed Deep.
Compressed Deep delivered the single hardest Deep capability (the
tokenizer choice cost and quality study on held-out text: three
variants, controlled merge-count and pre-tokenization differences,
per-segment cost and quality-proxy tables, failure modes). The
items below are the rest of the v2 Deep scope, named here as the
v1.1 backlog. None of them is done, and none is claimed.

## v1.1 backlog

1. Natural corpus at scale: retrain all variants on a large natural
   mixed corpus (real English, Bangla, and code text, orders of
   magnitude beyond the 61,885-byte synthetic Build corpus) with a
   larger natural held-out set, and re-run the same study tables.
2. Normalization and digit splitting: add Unicode normalization,
   case handling, and a digit splitting rule as controlled variant
   dimensions, and measure their held-out effect per segment.
3. Learned downstream quality: score the variants with a real small
   model trained or fine-tuned per tokenizer (perplexity or a
   fixed task), replacing the round-trip and single-token-share
   proxies with a measured quality number.
4. Binary save format: a compact binary serialization beside the
   JSON format, with load-time and size benchmarks against JSON.
5. Faster encoding: a ranked merge table or cache so encoding stops
   rescanning sequences per merge step, benchmarked on the held-out
   set and on a long-text stress case, for both the pre-tokenized
   and the no-pre-token paths.
6. Training corpus mix as a dimension: vary the english, bangla,
   and code mix at fixed total size and measure which segment pays
   for each mix on held-out text.
7. Paper write-up: the Deep study is the paper track named in
   SPEC.md (quality and cost on one task, three tokenizers).
   Submission itself is Jesun's tap and is not part of any
   automated run.

## Standing rules for v1.1 work

- The held-out disjointness test stays green through every change:
  no training on held-out text, ever.
- Every new number in a README comes from a run executed in that
  cycle. Nothing is carried forward as if it were freshly measured.
- Compression numbers are always labelled cost, never quality.

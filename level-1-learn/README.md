# Level 1, Learn: tokenizer-lab

Status: DONE 2026-11-04 (ROADMAP-V3-BATCH, Sprint 1 under the December
Compression Protocol). Evidence: the code in this folder, 11 unit tests
in tests/test_learn_bpe.py, and the measured training run recorded
below. Build and Deep are not started.

## The idea in one paragraph

A model never sees text. It sees token ids, and the tokenizer decides
how many ids a piece of text costs. Byte pair encoding (BPE) learns
that decision from data: start with the 256 byte values as the whole
vocabulary, count which adjacent pair appears most often in a corpus,
merge that pair into one new token, and repeat. Frequent text gets
cheap. Rare text stays expensive, one byte at a time. This level builds
that algorithm from zero, trains it on a small mixed corpus of English,
Bangla, and code, and measures the compression it actually gets.

## How the code works

- bpe.py: get_stats counts adjacent pairs. merge_pair replaces every
  non-overlapping occurrence of one pair. BPETokenizer.train repeats
  count and merge, with ties broken on the smallest pair so training
  is deterministic. encode applies the learned merges in learn order.
  decode joins the byte string of each token and decodes UTF-8, so
  encode then decode is an exact round trip for any string, including
  scripts never seen in training, because bytes are the base units.
- corpus.txt: a small teaching corpus in three segments (English,
  Bangla, code), written for this level. Repetition in it is
  deliberate: BPE feeds on repetition, and a reader can see why each
  segment compresses the way it does.
- train_bpe.py: trains on the full corpus at several merge counts and
  prints the per-segment compression table.

## Run it

```text
python level-1-learn/train_bpe.py
python -m unittest discover -s tests -p "test_learn*.py" -v
```

No dependencies. Python 3.12 standard library only. The runner also
writes its numbers to results_learn.json in this folder, which the
live dashboard reads at build time.

## Measured results (2026-11-04, Muse VM, Python 3.12.3)

Merge sweep on the full corpus (2,011 UTF-8 bytes, segments joined
with newline separators):

| Merges | Vocab size | Tokens for the full corpus |
| --- | --- | --- |
| 0 | 256 | 2,011 |
| 25 | 281 | 1,269 |
| 50 | 306 | 1,060 |
| 100 | 356 | 859 |
| 200 | 456 | 643 |

Per-segment compression at 200 merges:

| Segment | UTF-8 bytes | Tokens | Bytes per token |
| --- | --- | --- | --- |
| english | 624 | 292 | 2.137 |
| bangla | 1,004 | 208 | 4.827 |
| code | 381 | 143 | 2.664 |
| total (segments) | 2,009 | 643 | 3.124 |

Summary claim: trained with 200 merges on this corpus, the tokenizer
encodes the full corpus in 643 tokens against 2,011 bytes at zero
merges. The first Bangla sentence encodes in 19 tokens and round trips
exactly.

Read the Bangla row honestly: at 4.827 bytes per token it compresses
best per byte on this corpus, even though one Bangla character costs
about 3 UTF-8 bytes before any merging. That is an effect of this
small, repetitive teaching corpus, where the same Bangla phrases
repeat often enough for their byte sequences to merge early. It is
not a general claim about Bangla tokenization in production models.
The production question (how tokenizer choice changes cost and quality
per language, on real text) is the Deep level study in PROPOSAL.md.

## Limits, stated plainly

- The corpus is 2,011 bytes and hand-written. It proves the algorithm
  and the counting, not a production vocabulary. Real training corpora
  are billions of bytes.
- Training is the naive recount-everything loop. It is exact and easy
  to verify, and far too slow for large corpora. Faster incremental
  counting is Build level work.
- No special tokens, no pre-tokenization regex, no normalization.
  Production BPE systems add all three, and each one changes the
  numbers. They are named here so nobody mistakes this for one.
- The run executed on the Muse VM, not the assigned BlackBoxV3 fleet
  node.

## Next

Level 2, Build: train on a larger mixed corpus, add pre-tokenization
and special tokens, save and load vocabularies, and publish the
compression table per segment at production merge counts.

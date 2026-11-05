# Tutorial: P02 tokenizer-lab, course module

Module: P02-tokenizer-lab
By Jesun Ahmad Ushno
Date: 2026-11-04
License for this tutorial: CC BY 4.0. Code in the repo: Apache-2.0.

## What you will do

You will clone the tokenizer-lab repo, run all three levels, run
the test suite for each level, and read your own results against
the recorded v1.0 numbers. Every command below exists in the repo
as shipped at v1.0 and was run by the author of this module on
2026-11-04 to verify it. The project needs Python 3.12 and uses
the standard library only. No external tokenizer library, no
model, no API, and no credential are needed.

All recorded numbers in this module come from the corpora named in
each step. The Build corpus is synthetic, and its Bangla ratio is
a template repetition effect. Read each step's notes before
quoting any number.

## Step 0: Clone and enter the repo

```text
git clone https://github.com/JesunAhmadUshno/tokenizer-lab.git
cd tokenizer-lab
```

## Step 1: Level 1, Learn, BPE from zero

Read level-1-learn/README.md first. It explains pair counting,
merge order, and why a byte base vocabulary makes encode then
decode an exact round trip for any string.

Run the Learn training runner:

```text
python level-1-learn/train_bpe.py
```

Run the Learn tests:

```text
python -m unittest discover -s tests -p "test_learn*.py" -v
```

Read your results:

- Expected corpus: 2,011 UTF-8 bytes in three segments (english
  624 bytes, bangla 1,004 bytes, code 381 bytes).
- Expected sweep: 200 merges encode the full corpus in 643 tokens.
- Expected per segment at 200 merges: english 2.137 bytes per
  token, bangla 4.827, code 2.664.
- Expected round trip line: the first Bangla sentence encodes in
  19 tokens and round trips exactly.
- Expected tests: 11 tests, all passing.

## Step 2: Level 2, Build, production features

Read level-2-build/README.md. The Build tokenizer adds
pre-tokenization (with the Bengali block and combining
diacriticals in the word class), five reserved special tokens at
ids 256 to 260, weighted pair counting over unique pre-tokens,
and JSON save and load.

Run the Build runner:

```text
python level-2-build/run_build.py
```

Run the Build tests:

```text
python -m unittest discover -s tests -p "test_build*.py" -v
```

Read your results:

- Expected corpus: 61,885 UTF-8 bytes, synthetic, in three
  segments (english 21,792 bytes, bangla 24,801 bytes, code
  15,290 bytes, plus two newline joins).
- Expected sweep: 1,000 merges encode the corpus in 11,142
  tokens with vocab 1,261; 500 merges encode it in 14,894 tokens
  with vocab 761.
- Expected special token check: the string for the eos token
  inside a sentence encodes as the single id 259.
- Expected save and load check: the tokenizer trained at 1,000
  merges saves to JSON, reloads, and encodes a probe text
  identically, with vocab size 1,261.
- Expected Bangla reading: 9.199 bytes per token at 1,000 merges,
  named in the level README as a template repetition effect of
  this synthetic corpus, which holds only 897 unique pre-tokens.
- Expected tests: 14 Build tests, all passing (25 in total with
  Learn).

## Step 3: Level 3, Deep, the held-out study

Read level-3-deep/README.md and level-3-deep/DEEP-SPEC.md. This
is a compressed Deep: the tokenizer choice cost and quality study
on held-out text. Three variants are trained on the Build corpus
and measured on a 1,332-byte authored held-out set that a test
proves disjoint from the training corpus. The rest of the v2 Deep
scope is the v1.1 backlog in ROADMAP.md at the repo root.

Run the Deep study:

```text
python level-3-deep/run_deep.py
```

Run the Deep tests:

```text
python -m unittest discover -s tests -p "test_deep*.py" -v
```

Read your results:

- Expected held-out totals: variant A (pre-tokenization on, 500
  merges) 555 tokens at 2.400 bytes per token; variant B
  (pre-tokenization off, 500 merges) 552 tokens at 2.413; variant
  C (pre-tokenization on, 100 merges) 749 tokens at 1.778; byte
  baseline 1,332 tokens.
- Expected speed reading: variant B encodes about 8 times slower
  than variant A per held-out pass in this implementation. The
  ratio is the finding; absolute millisecond values vary by
  machine and load.
- Expected cost reading: from 100 to 500 merges, tokens fall from
  749 to 555, a 25.9 percent reduction.
- Expected exactness: every variant round trips every held-out
  segment exactly, and the eos special token encodes as id 259
  under all three variants.
- Expected Bangla reading: the single-token word share on
  held-out Bangla is 0.000 for every variant.
- The runner writes level-3-deep/results_deep.json.
- Expected tests: 11 Deep tests, all passing (36 in total).

## Step 4: Run the full test suite

```text
python -m unittest discover -s tests -v
```

Expected: 36 tests in total (11 Learn, 14 Build, 11 Deep), all
passing. Note: tests/test_smoke.py is a scaffold smoke script run
directly by CI; unittest discovery counts the three level test
files, which is the 36 above.

## Step 5: Check your understanding

1. Why does the byte base vocabulary guarantee an exact round
   trip for text the tokenizer never trained on? (Answer: every
   byte value is a token from the start, so any UTF-8 string can
   be encoded byte by byte and decoded back, merges only ever
   shorten the sequence.)
2. The Build Bangla ratio is 9.199 bytes per token. Why is that
   not a claim about Bangla in production? (Answer: the corpus is
   synthetic and built from templates, with only 897 unique
   pre-tokens, so whole Bangla words repeat and merge early. The
   Deep held-out Bangla single-token share is 0.000.)
3. Pre-tokenization on or off barely changed the held-out token
   count (555 against 552). What did it change? (Answer: encode
   speed, about 8 times slower without it in this implementation,
   and token shape: without pre-tokenization, merges cross word
   and punctuation boundaries.)

## Limits to keep with the numbers

- The Learn corpus is 2,011 bytes and hand-written; the Build
  corpus is 61,885 bytes and synthetic; the held-out set is 1,332
  bytes and hand authored.
- Compression numbers are cost, never quality. No downstream
  model was run at any level in v1.0.
- No normalization, digit splitting, or binary save format
  exists in v1.0; all are v1.1 backlog in ROADMAP.md.

# Words Into Numbers, Measured Honestly: Building tokenizer-lab in the Open

By Jesun Ahmad Ushno
Date: 2026-11-04
Status: DRAFT, written fan-out for P02 tokenizer-lab v1.0. Not posted.

## The problem

A model never sees text. It sees token ids, and the tokenizer decides
how many ids a piece of text costs. That decision is not neutral: it
changes the token count for every segment, and token count is the
inference cost unit. A tokenizer trained mostly on one kind of text
can make another kind of text expensive, token by token.

This project, P02 in Roadmap v3, builds byte pair encoding (BPE)
from zero in the open: a core algorithm on a small teaching corpus,
then production features (pre-tokenization, special tokens, weighted
pair counting, JSON save and load) on a larger synthetic corpus, then
a controlled study of how tokenizer choice changes held-out cost.
All code runs with the Python 3.12 standard library only. No external
tokenizer library, no model, no API, and no credential are used
anywhere in this repo, and nothing here claims otherwise.

Repository: https://github.com/JesunAhmadUshno/tokenizer-lab

## Past, present, future (the dossier, condensed)

Past: production tokenizers in open libraries (tokenizers,
SentencePiece) already exist and are named as prior art in
DOSSIER.md and NOVELTY.md in the repo. The novelty claim there stays
marked PROPOSED. This post makes no novelty claim beyond the
measured work below.

Present: v1.0 closes three levels on 2026-11-04. Learn built the
core BPE loop small and checkable. Build added the production
features the Learn level named as missing and measured them at up
to 1,000 merges. Compressed Deep built the single hardest capability
in the SPEC Deep scope: the tokenizer choice cost and quality study
on held-out text, with three variants that differ only in
pre-tokenization and merge count.

Future: the rest of the v2 Deep scope is named in ROADMAP.md in the
repo as the v1.1 backlog. It includes a natural corpus at scale,
normalization and digit splitting, learned downstream quality with
a real model, a binary save format, faster encoding, and a training
corpus mix study. None of that is done, and none of it is claimed
here.

## Main results claim

At v1.0: Learn passed 11 tests on a 2,011-byte mixed English, Bangla, and code corpus, where 200 merges encode the full corpus in 643 tokens, with per segment bytes per token of 2.137 for english, 4.827 for bangla, and 2.664 for code, and the first Bangla sentence encodes in 19 tokens with an exact round trip; Build passed 14 tests (25 tests in total) on a 61,885-byte synthetic corpus, where 1,000 merges encode the corpus in 11,142 tokens with vocab 1,261, 500 merges encode it in 14,894 tokens with vocab 761, five special tokens are reserved at ids 256 to 260, save and load produce identical encodes, and Bangla reaches 9.199 bytes per token at 1,000 merges as a named template repetition effect of the synthetic corpus, which holds only 897 unique pre-tokens; compressed Deep passed 11 tests (36 tests in total) on a 1,332-byte held-out set disjoint from training, where variant A (pre-tokenization on, 500 merges) encodes in 555 tokens at 2.400 bytes per token, variant B (pre-tokenization off, 500 merges) encodes in 552 tokens at 2.413 bytes per token and encodes about 8 times slower than variant A, variant C (pre-tokenization on, 100 merges) encodes in 749 tokens at 1.778 bytes per token against a byte baseline of 1,332 tokens, merge count cuts tokens by 25.9 percent from 100 to 500 merges, all variants round trip exactly, and the Bangla single-token word share is 0.000 for every variant.

Every number in that claim comes from a run recorded in the level
READMEs in the repo. The Bangla ratios in particular carry their
synthetic and template repetition caveat, stated in the claim and
again in the limits below. Read the limits before quoting any of it.

## Results by level

### Level 1, Learn (release v0.1)

BPE from zero: start with the 256 byte values, count adjacent pairs,
merge the most frequent pair, repeat. Ties break on the smallest
pair, so training is deterministic. Encode applies the learned
merges in learn order, and decode is an exact round trip for any
string because bytes are the base units.

| Measure | Result |
| --- | --- |
| Corpus | 2,011 UTF-8 bytes, mixed english, bangla, and code |
| At 200 merges | 643 tokens for the full corpus, vocab 456 |
| English | 624 bytes in 292 tokens, 2.137 bytes per token |
| Bangla | 1,004 bytes in 208 tokens, 4.827 bytes per token |
| Code | 381 bytes in 143 tokens, 2.664 bytes per token |
| First Bangla sentence | 19 tokens, exact round trip |
| Tests | 11 |

Read the Bangla row honestly: it compresses best per byte on this
small, repetitive teaching corpus, where the same Bangla phrases
repeat often enough for their byte sequences to merge early. It is
not a general claim about Bangla tokenization in production models.
The Learn README states this in its own text.

### Level 2, Build (release v0.5)

Build adds pre-tokenization (with the Bengali block and combining
diacriticals added to the word class, for a measured reason recorded
in the level README), five reserved special tokens, weighted pair
counting over unique pre-tokens, and JSON save and load.

| Measure | Result |
| --- | --- |
| Corpus | 61,885 UTF-8 bytes, synthetic mixed corpus |
| At 1,000 merges | 11,142 tokens, vocab 1,261 |
| At 500 merges | 14,894 tokens, vocab 761 |
| Special tokens | 5 reserved, ids 256 to 260: pad, unk, bos, eos, mask |
| Save and load | Loaded tokenizer encodes a probe text identically |
| Bangla at 1,000 merges | 24,801 bytes in 2,696 tokens, 9.199 bytes per token |
| Tests | 14 Build tests, 25 in total with Learn |

The Bangla 9.199 figure is named in the Build README as a template
repetition effect: the synthetic corpus holds only 897 unique
pre-tokens, so whole Bangla words repeat often enough to merge into
single tokens. On natural Bangla text with a wide vocabulary the
number would be far lower. The Deep level tests exactly that gap.

### Level 3, Deep, compressed (release v1.0)

Three variants trained on the same Build corpus, measured on a
1,332-byte authored held-out set that a test proves disjoint from
the training corpus at the sentence level.

| Variant | Vocab | Tokens | Bytes per token |
| --- | --- | --- | --- |
| A, pre-tokenization on, 500 merges | 761 | 555 | 2.400 |
| B, pre-tokenization off, 500 merges | 761 | 552 | 2.413 |
| C, pre-tokenization on, 100 merges | 361 | 749 | 1.778 |
| Byte baseline | 256 | 1,332 | 1.000 |

What the numbers say, stated plainly:

- Merge count is the big held-out cost lever. From 100 to 500
  merges (C to A) cuts held-out tokens from 749 to 555, a 25.9
  percent reduction.
- Pre-tokenization barely moves held-out token count at 500 merges
  (555 against 552), and the direction flips by segment. What it
  changes decisively here is encode speed and token shape: variant
  B encodes about 8 times slower in this implementation, and its
  tokens can span word boundaries.
- All variants round trip every held-out segment exactly.
- The Bangla single-token word share is 0.000 for every variant:
  no held-out Bangla word survives as one token at these merge
  counts. That is the measured form of the Build warning. The
  synthetic template effect does not survive held-out text.
- Held-out compression is far weaker than training corpus
  compression, as it should be. Variant A scores 2.400 bytes per
  token on held-out text against 4.155 on the training corpus at
  the same 500 merges.

Tests: 11 Deep tests, 36 in total with Learn and Build.

## Honest limits

- The Learn corpus is 2,011 bytes and hand-written. The Build
  corpus is 61,885 bytes and synthetic, built from hand-written
  templates and word lists, with only 897 unique pre-tokens. Its
  template repetition inflates every compression ratio, most of
  all the Bangla ratio at 9.199 bytes per token. No production
  corpus claim is made or implied.
- The held-out set is 1,332 bytes and hand authored. It separates
  the three variants and proves disjointness, and it is far too
  small to rank production tokenizers.
- Compression is cost, never quality. This study measures no
  downstream model quality. The quality-adjacent measures are
  round-trip exactness and the single-token word share, labelled
  as proxies in the Deep README.
- Encode wall time is implementation cost on one machine under
  varying load. Only the A against B ratio (about 8 times) is
  reported as a finding, not the absolute millisecond values.
- No normalization, no digit splitting rule, and no binary save
  format exist in v1.0. All three are named v1.1 backlog.
- Compressed Deep is not the full v2 Deep scope. The remainder is
  the named v1.1 backlog in ROADMAP.md.
- The runs executed on the Muse VM, not the assigned BlackBoxV3
  fleet node.

## Where to go next

- Tutorial: fanout/tutorial.md in the repo, a step-by-step module
  that runs all three levels and the full test suite.
- Releases: v0.1 (Learn), v0.5 (Build), v1.0 (Learn, Build,
  compressed Deep) on the GitHub repo linked above.
- Book chapter: "Words Into Numbers" per SPEC.md, drafted as part
  of the fan-out set.
- License: code Apache-2.0, tutorials CC BY 4.0.

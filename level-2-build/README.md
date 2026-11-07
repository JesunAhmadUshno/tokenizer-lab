# Level 2, Build: tokenizer-lab

Status: DONE 2026-11-04 (ROADMAP-V3-BATCH, Sprint 1 under the December
Compression Protocol). Evidence: the code and corpus in this folder,
14 unit tests in tests/test_build_tokenizer.py (plus the 11 Learn
tests still passing), and the measured run recorded below. Deep is
not started.

## What was built

- tokenizer.py: BuildTokenizer, a byte-level BPE tokenizer with the
  production features the Learn level named as missing.
- Pre-tokenization: a documented regex splits text before any
  merging, and merges never cross a pre-token boundary. The word
  class adds the Bengali block (U+0980 to U+09FF) and combining
  diacriticals to the usual word characters for a measured reason:
  Python word matching does not cover Bengali vowel signs or the
  virama, so a plain pattern split one Bangla word into six
  fragments in testing. With the added ranges, each Bangla word is
  one pre-token, and the Bangla danda still splits as punctuation.
- Special tokens: five named tokens are reserved before training:
  <|pad|> id 256, <|unk|> id 257, <|bos|> id 258, <|eos|> id 259,
  <|mask|> id 260. Merges start at id 261. A special id never takes
  part in a merge, and a literal special string in the input
  encodes as its single reserved id.
- Faster pair counting: training counts pairs over unique
  pre-tokens, weighted by each pre-token frequency in the corpus,
  instead of recounting the whole corpus sequence on every merge
  as the Learn loop did. Ties still break on the smallest pair, so
  training stays deterministic.
- Save and load: save(path) writes one JSON file (format name,
  special tokens, the full vocabulary as byte lists, and the
  merges in learn order). BuildTokenizer.load(path) rebuilds the
  tokenizer, and a test plus the runner both prove the loaded
  tokenizer encodes identically to the saved one.
- corpus.txt: a larger mixed corpus, 61,885 UTF-8 bytes in three
  segments (english 21,792 bytes, bangla 24,801 bytes, code 15,290
  bytes, plus two newline joins). That is 30.8 times the 2,011-byte
  Learn corpus. The corpus is synthetic: hand-written paragraphs
  and sentences, expanded with hand-written templates and word
  lists combined systematically. No external text was copied. The
  corpus holds only 897 unique pre-tokens, and that fact matters
  for reading the Bangla number below.
- run_build.py: trains at 0, 100, 250, 500, and 1,000 merges,
  prints the per-segment compression tables at 500 and 1,000
  merges, and runs the round trip, special token, and save and
  load checks.

## Run it

```text
python level-2-build/run_build.py
python -m unittest discover -s tests -p "test_build*.py" -v
```

No dependencies. Python 3.12 standard library only. The runner also
writes its numbers to results_build.json in this folder, which the
live dashboard reads at build time.

## Measured results (2026-11-04, Muse VM, Python 3.12.3)

Merge sweep on the full corpus (61,885 UTF-8 bytes):

| Merges | Vocab size | Tokens for the full corpus |
| --- | --- | --- |
| 0 | 261 | 61,885 |
| 100 | 361 | 28,391 |
| 250 | 511 | 20,235 |
| 500 | 761 | 14,894 |
| 1,000 | 1,261 | 11,142 |

Per-segment compression at 500 merges:

| Segment | UTF-8 bytes | Tokens | Bytes per token |
| --- | --- | --- | --- |
| english | 21,792 | 6,681 | 3.262 |
| bangla | 24,801 | 4,097 | 6.053 |
| code | 15,290 | 4,114 | 3.717 |
| total (segments) | 61,883 | 14,892 | 4.155 |

Per-segment compression at 1,000 merges:

| Segment | UTF-8 bytes | Tokens | Bytes per token |
| --- | --- | --- | --- |
| english | 21,792 | 5,175 | 4.211 |
| bangla | 24,801 | 2,696 | 9.199 |
| code | 15,290 | 3,269 | 4.677 |
| total (segments) | 61,883 | 11,140 | 5.555 |

Checks from the same run: the first Bangla sentence encodes in 16
tokens and round trips exactly. The string <|eos|> inside a
sentence encodes as the single id 259. The tokenizer trained at
1,000 merges saved to JSON, reloaded, and encoded a probe text
identically (1,000 merges loaded, vocab size 1,261).

Read the Bangla row honestly: 9.199 bytes per token at 1,000 merges
is an effect of this synthetic corpus. Its Bangla sentences are
built from templates, so whole Bangla words repeat often enough to
merge into single tokens, and the whole corpus holds only 897
unique pre-tokens. On natural Bangla text with a wide vocabulary
the number would be far lower. The table proves the pipeline and
the counting at production-style merge counts. It is not a claim
about Bangla tokenization in production models. That question is
the Deep level study.

## Limits, stated plainly

- The corpus is 61,885 bytes and synthetic. It is 30.8 times the
  Learn corpus and still far below production training corpora,
  which are billions of bytes. Its template repetition inflates
  every compression ratio, most of all the Bangla one.
- No normalization (no case folding, no Unicode normalization) and
  no digit splitting rule. Both change the numbers in production
  systems and both are still absent here.
- Encoding still rescans a pre-token for its lowest-rank pair on
  each merge step. That is simple and correct, and slower than a
  ranked merge table lookup at large vocabularies.
- The save format is one JSON file per tokenizer. It is human
  readable and exact, and it is larger and slower to load than the
  binary formats production systems use.
- The run executed on the Muse VM, not the assigned BlackBoxV3
  fleet node (the standing pattern for this batch).

## Next

Level 3, Deep: the tokenizer choice cost and quality study. Train
and compare tokenizers under controlled differences (merge count,
pre-tokenization on and off, training corpus mix), measure cost and
quality per segment on held-out text that the training corpus does
not repeat, and write the failure modes section.

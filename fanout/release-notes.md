# Release notes draft: tokenizer-lab

Status: DRAFT notes for releases that already exist. Dated 2026-11-04.
These notes summarise the existing GitHub releases. No new release is
created by this file.

Releases verified with gh release list on 2026-11-04:
v0.1, v0.5, and v1.0, at the URLs below.

## v0.1, Learn: BPE from zero

URL: https://github.com/JesunAhmadUshno/tokenizer-lab/releases/tag/v0.1

- Byte-level byte pair encoding built from zero with the Python
  standard library only: pair counting, deterministic merge order
  (ties on the smallest pair), encode in learn order, and decode
  as an exact round trip for any string.
- Corpus: 2,011 UTF-8 bytes in three segments (english, Bangla,
  code), hand-written for teaching.
- Measured run: 200 merges encode the full corpus in 643 tokens
  against 2,011 bytes at zero merges. Per segment at 200 merges:
  english 624 bytes in 292 tokens (2.137 bytes per token), bangla
  1,004 bytes in 208 tokens (4.827), code 381 bytes in 143 tokens
  (2.664). The first Bangla sentence encodes in 19 tokens and
  round trips exactly.
- Tests: 11 unit tests in tests/test_learn_bpe.py.
- Limits carried in the release: tiny hand-written corpus, naive
  recount training, no special tokens, no pre-tokenization, no
  normalization.

## v0.5, Build: pre-tokenization, special tokens, save and load

URL: https://github.com/JesunAhmadUshno/tokenizer-lab/releases/tag/v0.5

- Production features on the Learn algorithm: pre-tokenization
  with a Bengali-aware word class (Bengali block and combining
  diacriticals added, for the measured reason in the level
  README), five reserved special tokens (pad id 256, unk 257,
  bos 258, eos 259, mask 260), weighted pair counting over unique
  pre-tokens, and JSON save and load with an identical-encode
  check.
- Corpus: 61,885 UTF-8 bytes, synthetic mixed corpus (english
  21,792 bytes, bangla 24,801 bytes, code 15,290 bytes), 897
  unique pre-tokens, no external text copied.
- Measured run: 1,000 merges encode the corpus in 11,142 tokens
  with vocab 1,261; 500 merges encode it in 14,894 tokens with
  vocab 761. Per segment at 1,000 merges: english 4.211 bytes per
  token, bangla 9.199, code 4.677. A literal eos string encodes
  as the single id 259, and a saved and reloaded tokenizer
  encodes a probe text identically.
- The Bangla 9.199 ratio is carried in the release as a template
  repetition effect of the synthetic corpus, not as a claim
  about Bangla tokenization in production models.
- Tests: 14 Build unit tests, 25 in total with Learn.
- Limits carried in the release: synthetic corpus only, no
  normalization or digit splitting, encoding rescans per merge
  step, JSON save format only.

## v1.0, Deep: tokenizer choice cost and quality study on held-out text

URL: https://github.com/JesunAhmadUshno/tokenizer-lab/releases/tag/v1.0

- Compressed Deep under the December Compression Protocol: the
  tokenizer choice cost and quality study named as the SPEC Deep
  scope and the SPEC paper angle, built on the Build tokenizer.
- Held-out set: 1,332 UTF-8 bytes (english 463, bangla 613, code
  254), authored for this study, with a test proving every
  held-out sentence of 20 or more characters is absent from the
  training corpus.
- Three variants trained on the Build corpus: A
  (pre-tokenization on, 500 merges, vocab 761) 555 tokens at
  2.400 bytes per token; B (pre-tokenization off, 500 merges,
  vocab 761) 552 tokens at 2.413, encoding about 8 times slower
  than A in this implementation, with tokens that can span word
  boundaries; C (pre-tokenization on, 100 merges, vocab 361) 749
  tokens at 1.778. Byte baseline: 1,332 tokens.
- Findings carried in the release: merge count cuts held-out
  tokens 25.9 percent from 100 to 500 merges; pre-tokenization
  changes encode speed and token shape, not count, on this set;
  every variant round trips every held-out segment exactly; the
  Bangla single-token word share is 0.000 for every variant.
- Failure modes written in the level README: boundary-crossing
  tokens, encode cost blow-up, merge starvation, Bangla
  single-token failure, and the held-out gap.
- Tests: 11 Deep unit tests, 36 in total with Learn and Build.
- The rest of the v2 Deep scope is the v1.1 backlog in
  ROADMAP.md. It is not part of v1.0 and is not claimed by these
  notes.

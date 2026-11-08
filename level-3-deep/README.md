# Level 3, Deep: tokenizer-lab

Status: DONE 2026-11-04 (ROADMAP-V3-BATCH, Sprint 1), as a COMPRESSED
Deep under the December Compression Protocol. Compressed means: the
single hardest capability in the SPEC Deep scope was built, tested,
and benchmarked in full, and the rest of the v2 Deep scope is named
as the v1.1 backlog in REPORT.md at the repo root, section Future work. It is not the
full v2 Deep scope, and this README does not claim it is.
Spec for this level: PROPOSAL.md at the repo root, section "Deep study design" (moved from level-3-deep/DEEP-SPEC.md on 2026-11-08).

## What was built

The tokenizer choice cost and quality study on held-out text, the
study the Build README named as the Deep question and the SPEC
paper angle (quality and cost on one task, three tokenizers).

1. A held-out set (heldout.json): three segments (english 463 bytes,
   bangla 613 bytes, code 254 bytes; 1,332 bytes total), sentences
   authored for this study on topics the training corpus does not
   use. A test asserts every held-out sentence or line of 20 or
   more characters is absent from the training corpus, so no
   held-out sentence is a repeat the tokenizer trained on.
2. Three variants trained on the same 61,885-byte Level 2 corpus
   (study.py):
   - A: BuildTokenizer, pre-tokenization on, 500 merges (vocab 761).
   - B: NoPreTokenizer, pre-tokenization off, 500 merges (vocab
     761). Training counts pairs over the whole corpus as one byte
     sequence and encoding treats each part as one sequence, so
     merges cross word and punctuation boundaries. It lives in
     Deep code only; Build code is untouched.
   - C: BuildTokenizer, pre-tokenization on, 100 merges (vocab 361).
   A byte baseline row (tokens equal bytes) sits in every table,
   labelled baseline. It is not a fourth variant.
3. Metrics per variant, per segment and total: tokens, bytes per
   token, tokens per word (fertility), round-trip exactness, share
   of held-out words encoded as a single token, special token
   handling, and encode wall time per held-out pass (mean of 20).
   run_deep.py prints the tables and writes results_deep.json.
   No number in this README is hand typed from anywhere else.

## Run it

```text
python level-3-deep/run_deep.py
python -m unittest discover -s tests -p "test_deep*.py" -v
```

No dependencies. Python 3.12 standard library only.

## Measured results (2026-11-04, Muse VM, Python 3.12.3)

Held-out totals (1,332 UTF-8 bytes, 160 whitespace words):

| Variant | Vocab | Tokens | Bytes per token | Tokens per word | Single-token word share | Encode wall per pass |
| --- | --- | --- | --- | --- | --- | --- |
| A pretoken, 500 merges | 761 | 555 | 2.400 | 3.469 | 0.175 | 1.569 ms |
| B no pretoken, 500 merges | 761 | 552 | 2.413 | 3.450 | 0.212 | 12.973 ms |
| C pretoken, 100 merges | 361 | 749 | 1.778 | 4.681 | 0.113 | 1.235 ms |
| Byte baseline | 256 | 1,332 | 1.000 | 8.325 | 0.075 | n/a |

Per segment, bytes per token (tokens in brackets):

| Variant | English, 463 B | Bangla, 613 B | Code, 254 B |
| --- | --- | --- | --- |
| A pretoken 500 | 1.830 (253) | 3.855 (159) | 1.801 (141) |
| B no pretoken 500 | 1.774 (261) | 3.831 (160) | 1.954 (130) |
| C pretoken 100 | 1.425 (325) | 2.482 (247) | 1.451 (175) |
| Byte baseline | 1.000 (463) | 1.000 (613) | 1.000 (254) |

Checks from the same run: every variant round trips every held-out
segment exactly (decode of encode equals the input, 3 of 3 segments
for A, B, and C), and the eos special token encodes as the single
id 259 with an exact round trip under all three variants.

What the numbers say, stated plainly:

- Merge count is the big cost lever on held-out text. Going from
  100 to 500 merges (C to A) cuts held-out tokens from 749 to 555,
  a 25.9 percent reduction, at the same pre-tokenization setting.
  Tokens are the inference cost unit, so that is the cost saving;
  no dollar figure is stated because no price is assumed.
- Pre-tokenization on or off barely moves held-out token count at
  500 merges (555 against 552 total), and the direction flips by
  segment: B is cheaper on code (130 against 141) and more
  expensive on english (261 against 253). What pre-tokenization
  changes decisively here is encode speed and token shape, not
  count: B encodes the held-out set about 8 times slower in this
  implementation (whole-sequence rescan against per pre-token
  rescan), and its tokens can span word boundaries, which the
  crafted-case test proves (a repeated two-word pattern collapses
  to 1 token under B and takes 12 tokens under A).
- Held-out compression is far weaker than training-corpus
  compression, as it should be. Variant A scores 2.400 bytes per
  token on held-out text against 4.155 on the training corpus at
  the same 500 merges (Build README). The Bangla held-out row
  (3.855) against the Bangla training row at 1,000 merges (9.199)
  confirms the Build warning in measured form: the synthetic
  corpus template effect does not survive held-out text.
- Quality, honestly: compression is not quality, and this study
  does not measure model quality. The quality-adjacent measures
  are round-trip exactness (perfect for all variants, because the
  byte base vocabulary is lossless by construction) and the
  single-token word share (A 0.175, B 0.212, C 0.113 overall;
  bangla 0.000 for every variant, because no held-out Bangla word
  survives as one token at these merge counts). A real downstream
  quality measurement needs a model and is v1.1 backlog.

## Failure modes

From the actual Deep runs and tests:

- Boundary-crossing tokens (variant B): without pre-tokenization,
  merges glue the end of one word to the start of the next (tokens
  such as ", and the " spanning a comma and two words appear in
  the B vocabulary). On repetitive text this collapses whole
  phrases into single tokens (crafted case: 1 token against 12).
  That overfits the training phrasing and wastes vocabulary on
  spans that will not repeat in new text.
- Encode cost blow-up (variant B): encoding rescans one long
  sequence for its lowest-rank pair on every merge step, so wall
  time grows with text length far faster than the pre-tokenized
  path (12.973 ms against 1.569 ms per held-out pass in the final
  run; the ratio, not the absolute value, is the finding, and it
  was about 8 in both recorded runs).
- Merge starvation (variant C): at 100 merges the vocabulary is
  too small for the held-out vocabulary. Fertility rises to 4.681
  tokens per word overall and 6.024 on bangla, so every downstream
  cost priced in tokens rises with it.
- Bangla single-token failure (all variants): the single-token
  word share on held-out bangla is 0.000 for A, B, and C. Held-out
  Bangla words are always split. Compression still reaches 3.855
  bytes per token under A through sub-word merges, but a reader
  who equates whole-word tokens with quality would score this
  zero, and the table reports it as measured.
- Held-out gap (all variants): every variant loses roughly half
  its training-corpus compression on held-out text. Any cost
  estimate quoted from training-corpus numbers alone overstates
  the saving by about that factor on this corpus pair.

## Limits, stated plainly

- Compressed Deep, by the protocol named above. The rest of the
  v2 Deep scope is in REPORT.md, Future work (natural corpus at scale,
  normalization and digit splitting, learned downstream quality
  with a real model, binary save format, faster encoding).
- The held-out set is 1,332 bytes and hand authored. It is large
  enough to separate the three variants and prove disjointness,
  and far too small to rank production tokenizers.
- The training corpus is still the 61,885-byte synthetic Build
  corpus. Both sides of the comparison inherit its limits.
- Encode wall time is implementation cost on one machine under
  varying load (variant A measured 1.569 ms and 4.842 ms in two
  runs the same day). Only the A against B ratio is reported as a
  finding.
- No downstream model was run. Cost is tokens and wall time;
  quality is round-trip exactness plus labelled proxies only.
- The run executed on the Muse VM, not the assigned BlackBoxV3
  fleet node (the standing pattern for this batch).

## Rigor additions (2026-11-07)

`python level-3-deep/run_rigor.py` (stdlib, well under a minute) writes
results_rigor.json. Numbers below are from that file; the run was on an
aarch64 machine, Python 3.12.3. The site's build-time parity gate
(site/src/bpe.check.mjs) re-derives every token count in it from an
independent JavaScript port.

- Dense held-out sweep, 0 to 1,000 merges in steps of 25. Variant A
  held-out tokens: the first 100 merges save 583, merges 100 to 500
  save 194, merges 500 to 1,000 save 74 (555 to 481). Diminishing
  returns, no plateau yet at 1,000. Variant B is cheaper than A at 21
  of the 41 steps, so neither pre-tokenization setting wins on count.
- Paired stratified bootstrap (1,000 replicates, seed 20261107) over
  20 held-out units (5 English sentences, 5 Bangla sentences, 10 code
  lines). C minus A: 194 tokens, 95 percent interval 171 to 217 (a
  26.2 percent cut, interval 23.1 to 29.7). A minus B: -19 tokens,
  interval -38 to 0. Encoded unit by unit A is slightly cheaper,
  while on whole segments B is (552 against 555), so the sign of the
  pre-tokenization effect depends on chunking and the claim stays
  "no meaningful count difference".
- Pre-tokenization 2x2 at 500 merges (held-out tokens, median encode
  ms over 15 repeats): merges learned inside pre-tokens with per
  pre-token encoding 555 / 0.67; same merges with whole-text encoding
  555 / 14.54; merges learned over the whole sequence with per
  pre-token encoding 654 / 0.55; whole-sequence both ways (variant B)
  552 / 16.36. The token count follows how merges were learned; the
  encode slowdown follows the encoder.
- Encode-length scaling (held-out text repeated 1, 2, 4, 8 times,
  median of 9): A 0.69 to 5.23 ms, B 16.38 to 129.61 ms. The B to A
  ratio stays at 23.7 to 24.8. Correction to the failure mode above:
  B's encode cost is a constant factor in this implementation, not a
  super-linear blow-up, because the number of whole-text rescans is
  bounded by the merges that apply, not by text length. The ratio
  also differs by machine (about 8 in the 2026-11-04 runs, about 24
  here), so only "several times slower" is a stable finding.
- Training-mix ablation, variant A at 500 merges, held-out tokens
  (bangla / code / english / total): full mix 159 / 141 / 253 / 555;
  without english 137 / 148 / 359 / 646; without bangla 613 / 141 /
  234 / 990; without code 152 / 200 / 259 / 613. Removing a language
  from training costs that language most; held-out Bangla falls back
  to one token per byte (613) when Bangla is left out.

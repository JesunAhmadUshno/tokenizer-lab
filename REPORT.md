# Report: tokenizer-lab

Status: REPORTED 2026-11-08, not pre-registered. Every number below is
read from a committed results file and regenerates with one command
(see Reproduce in README.md). The hypotheses in PROPOSAL.md were
written after the first run, so they are scored here as exploratory
findings, not confirmed ones. The full method write-ups stay beside
the code: level-1-learn/README.md, level-2-build/README.md and
level-3-deep/README.md.

## Background

A model never sees text. It sees token ids, and the tokenizer decides
how many ids a piece of text costs. Byte pair encoding (BPE) learns
that decision from data: start with the 256 byte values, merge the
most frequent adjacent pair into a new token, and repeat
(Gage 1994; Sennrich et al. 2016). Production libraries such as
SentencePiece (Kudo and Richardson 2018) do this at scale, and the
token cost of the same meaning differs widely between languages
(Petrov et al. 2023), which is why Bangla sits beside English and
code here. Full references: PROPOSAL.md, section "References".

## Method

- Tokenizers: level-1-learn/bpe.py (byte-level BPE from zero) and
  level-2-build/tokenizer.py (adds a documented pre-tokenization
  regex with the Bengali block, five reserved special tokens at ids
  256 to 260, weighted pair counting, JSON save and load).
- Training text: the 61,885-byte synthetic mixed corpus
  (level-2-build/corpus.txt, 897 unique pre-tokens).
- Held-out text: level-3-deep/heldout.json, 1,332 bytes authored for
  this study (English 463, Bangla 613, code 254); a test asserts no
  held-out sentence or line of 20 or more characters appears in the
  training corpus (docs/decisions/0002).
- Variants (level-3-deep/study.py): A pre-tokenization on, 500 merges;
  B pre-tokenization off, 500 merges; C pre-tokenization on, 100
  merges; a byte baseline row (tokens equal bytes).
- Rigor pass (level-3-deep/run_rigor.py): a dense held-out sweep every
  25 merges to 1,000; a paired stratified bootstrap (1,000 replicates,
  seed 20261107) over 20 held-out units (5 English sentences, 5
  Bangla sentences, 10 code lines); a 2x2 that separates how merges
  are learned from how text is encoded; encode-length scaling; a
  training-mix ablation.
- Compute: CPU only, Python standard library, under a minute for all
  runners. Recorded runs: 2026-11-04 (Python 3.12.3, the Muse VM) and
  2026-11-07 (Python 3.12.3, aarch64), stored in the results files.

## Results

| Result | Value | Evidence |
| --- | --- | --- |
| Learn corpus, 200 merges | 2,011 bytes encode in 643 tokens | level-1-learn/results_learn.json |
| Build corpus, 1,000 merges | 61,885 bytes encode in 11,142 tokens; save and load identical | level-2-build/results_build.json |
| Held-out totals, whole segments | A 555 tokens (2.400 bytes per token), B 552 (2.413), C 749 (1.778), bytes 1,332 | level-3-deep/results_deep.json, variants.*.total |
| Round trip | every variant reproduces every held-out segment exactly | results_deep.json, roundtrip_exact |
| C minus A, unit sums | 194 tokens, 95% interval 171 to 217 (a 26.2% cut, interval 23.1 to 29.7) | results_rigor.json, bootstrap.C_minus_A_tokens |
| A minus B, unit sums | -19 tokens, 95% interval -38 to 0 | results_rigor.json, bootstrap.A_minus_B_tokens |
| Dense sweep, variant A | first 100 merges save 583 tokens, 100 to 500 save 194, 500 to 1,000 save 74 (555 to 481) | results_rigor.json, sweep |
| 2x2 at 500 merges | count follows how merges are learned (555 vs 654 with the same per-word encoder); speed follows the encoder | results_rigor.json, factorial |
| Mix ablation, variant A | leaving Bangla out of training sends held-out Bangla from 159 tokens to 613 (one per byte); leaving code out sends code from 141 to 200 | results_rigor.json, mix_ablation |

Timings are machine-dependent and are reported as ratios only: B
encodes several times slower than A (about 8 times in the 2026-11-04
runs, 23.7 to 24.8 times in the 2026-11-07 scaling run).

## Hypotheses scored

| Hypothesis (PROPOSAL.md) | Outcome | Basis |
| --- | --- | --- |
| H1 merge count is a clear lever | Supported (exploratory) | C minus A 194, interval 171 to 217 excludes zero |
| H2 pre-tokenization barely changes count | Supported (exploratory) | A minus B -19, interval -38 to 0 touches zero; whole segments flip the sign (555 vs 552); B is cheaper than A at 21 of 41 sweep steps |
| H3 B's encode cost blows up super-linearly | Miss: refuted | Scaling run: the B to A ratio stays at 23.7 to 24.8 from 1 to 8 copies of the held-out text; the cost is a constant factor, because whole-text rescans are bounded by the merges that apply, not by text length |
| H4 quality measured only by proxies | Holds, and it is a gap | No downstream model was run; round-trip exactness is lossless by construction and carries no quality information |

## Misses and corrections

- H3 above: the first Deep write-up called B's encode cost a blow-up.
  The scaling run refuted it; the correction is recorded in
  level-3-deep/README.md and on the dashboard.
- The B to A timing ratio moved from about 8 to about 24 between
  machines, so only "several times slower" is kept as a finding.
- Bangla single-token word share is 0.000 for every variant: no
  held-out Bangla word survives as one token at these merge counts.
- The Bangla 9.199 bytes per token on the training corpus is a
  template artifact of the synthetic corpus; held-out Bangla is
  3.855 under variant A.

## Threats to validity

- Synthetic training corpus (61,885 bytes, 897 unique pre-tokens) and
  a one-author held-out set of 1,332 bytes, 160 words. External
  validity is low.
- Twenty bootstrap units is a small resampling base; the intervals
  are rough.
- No production tokenizer (GPT-2 byte-level BPE, tiktoken,
  SentencePiece) was measured on the same text, so no claim is made
  against them, and the prior-art row in PROPOSAL.md reads NO
  MEASUREMENT YET.
- Words are split on whitespace and no Unicode normalization is
  applied, which treats code and Bangla punctuation unevenly.
- Timing comes from one machine per run under varying load.

## Self-review against the ML research profile

Moved from docs/research-review.md (2026-11-07). The rubric letter
grades were removed; grades are internal.

| Criterion | Evidence and reasoning |
| --- | --- |
| Research question | Clear and operational: how do merge count and pre-tokenization change the token cost of held-out English, Bangla and code. The SPEC's "quality and cost" framing is only half answered (cost only). |
| Hypotheses | Implicit, not pre-registered: "merge count is the big lever", "pre-tokenization barely moves count". Both are tested with intervals, but they were stated after the first run. |
| Method | Controlled variants on one corpus, held-out disjointness tested, deterministic tie-breaking. The variant B confound (training style and encoding style changed together) is separated by the 2x2: count follows how merges are learned (555 vs 654 with the same per-word encoder), speed follows the encoder (0.67 ms vs 14.54 ms with the same merges). |
| Baselines | Only a byte baseline (1,332 tokens). No GPT-2 byte-level BPE, tiktoken or SentencePiece unigram on the same text. |
| Statistics and uncertainty | Paired stratified bootstrap, 1,000 replicates, fixed seed, over 20 held-out units. Timings report median and IQR. Twenty units is a small resampling base. |
| Reproducibility | Python standard library, no dependencies, fixed seeds, results written as JSON by the runners, CI regenerates every results file and compares it with the committed one (scripts/check_results.py), and a second implementation in JavaScript reproduces all recorded token counts at site build time (site/src/bpe.check.mjs). |
| Threats to validity | Named in the level READMEs, here and on the dashboard. The rigor pass corrected an over-claim (H3). |
| Related work | Gage 1994, Sennrich et al. 2016, Kudo and Richardson 2018 and Petrov et al. 2023 are cited. Not yet discussed against the findings; no comparison to Petrov et al.'s fertility numbers. |
| Limitations | Stated plainly, including that round-trip exactness is lossless by construction and carries no quality information. |
| External validity | Training text is 61,885 synthetic bytes; held-out is 1,332 bytes, 160 words. |
| Engineering rigor | Unit tests through the public interfaces, ruff in CI, save and load format versioned, special tokens reserved before training, truncation property tested so one long run stands in for many. |

Against METHOD section 4 (ML and AI research): ablations are present
(pre-tokenization, merge count, training mix) and uncertainty is
stated on the token-count differences; compute and versions are
recorded with each results file. Baselines a reviewer would expect
are missing. The profile is therefore not met.

## Remaining gaps and what each needs

| Gap | What closes it | Compute and data needed |
| --- | --- | --- |
| No real-tokenizer baseline | Encode heldout.json with GPT-2 byte-level BPE (tiktoken `gpt2`), `cl100k_base`, and a SentencePiece unigram model trained on the same 61,885-byte corpus; report the same table. | CPU only, seconds. Needs two pip packages (tiktoken, sentencepiece) and a one-time download of the tiktoken vocab files; breaks the stdlib-only rule (docs/decisions/0001), so it belongs in an optional `baselines/` folder. |
| Synthetic corpus, tiny held-out set | Retrain all variants on a natural mixed corpus and a held-out set of at least 50,000 words per language. | Data: for example Bangla and English Wikipedia dumps and a permissively licensed code sample (tens of MB). CPU: the pure-Python trainer needs an incremental pair-count update to stay under minutes at that size. |
| No downstream quality measure | Train one small language model per tokenizer on the same text and compare bits per byte on held-out text (bits per byte, not perplexity, so different vocabularies compare fairly). | GPU: about 1 to 4 GPU-hours per variant for a roughly 10M-parameter model on a few hundred MB of text; 3 variants plus baselines. |
| Small resampling base for intervals | Bootstrap over at least 200 held-out units per segment once the larger held-out set exists. | No extra compute; needs the larger held-out set above. |
| Unicode normalization and word splitting | Add NFC and NFKC as variant dimensions; split fertility words with a Unicode word segmenter that handles the danda and code identifiers. | CPU, seconds, stdlib `unicodedata` for normalization; a segmenter such as ICU (PyICU) for word boundaries. |
| Timing evidence | Repeat the scaling run on two or more idle machines with pinned CPU frequency and report per-machine ratios. | CPU minutes on each machine; no data. |
| Related work not discussed | Compare the Bangla fertility here with the cross-language disparities reported by Petrov et al. 2023, on the same metric. | Reading only, once the natural-corpus run exists. |
| Novelty unproven | The novelty claim in PROPOSAL.md stays DRAFT until the baseline table above exists. | Depends on the baseline row. |

Cheap gaps already closed in the 2026-11-07 rigor pass: the dense
sweep, bootstrap intervals, the 2x2, encode-length scaling with median
and IQR, the training-mix ablation, Level 1 and Level 2 results
persisted as JSON, the JavaScript parity gate, and the references.

## Future work

Moved from ROADMAP.md (the v1.1 backlog). None of these is done, and
none is claimed. A confirmatory cycle locks PROPOSAL.md first.

1. Natural corpus at scale: retrain all variants on a large natural mixed corpus (real English, Bangla, and code text, orders of magnitude beyond the 61,885-byte synthetic Build corpus) with a larger natural held-out set, and re-run the same study tables.
2. Normalization and digit splitting: add Unicode normalization, case handling, and a digit splitting rule as controlled variant dimensions, and measure their held-out effect per segment.
3. Learned downstream quality: score the variants with a real small model trained or fine-tuned per tokenizer (perplexity or a fixed task), replacing the round-trip and single-token-share proxies with a measured quality number.
4. Binary save format: a compact binary serialization beside the JSON format, with load-time and size benchmarks against JSON.
5. Faster encoding: a ranked merge table or cache so encoding stops rescanning sequences per merge step, benchmarked on the held-out set and on a long-text stress case, for both the pre-tokenized and the no-pre-token paths.
6. Training corpus mix as a dimension: vary the english, bangla, and code mix at fixed total size and measure which segment pays for each mix on held-out text.
7. Paper write-up: the Deep study is the paper track named in PROPOSAL.md (quality and cost on one task, three tokenizers). Submission itself is Jesun's tap and is not part of any automated run.

Standing rules for this work:

- The held-out disjointness test stays green through every change:
  no training on held-out text, ever.
- Every new number comes from a run executed in that cycle. Nothing
  is carried forward as if it were freshly measured.
- Compression numbers are always labelled cost, never quality.

## Conclusion

On this corpus pair, merge count is the token-cost lever and
pre-tokenization is not: it changes encode speed and token shape, not
count. The evidence is reproducible and cross-checked by a second
implementation, but it is exploratory (not pre-registered), the
corpus is synthetic and small, and no production tokenizer or
downstream model was measured. The verdict is Functional.

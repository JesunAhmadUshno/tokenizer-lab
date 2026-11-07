# Research review: tokenizer-lab

Reviewed 2026-11-07 against a doctoral-level research rubric. Every number cited
here is in a committed results file (level-1-learn/results_learn.json,
level-2-build/results_build.json, level-3-deep/results_deep.json,
level-3-deep/results_rigor.json) and is re-derived at site build time by an
independent JavaScript port (site/src/bpe.check.mjs, 180 known-answer checks).

Grades: A (publication standard), B (sound, minor gaps), C (workable, clear gaps),
D (weak), F (missing).

## Summary

A strong engineering reproduction and teaching artifact. The method is
deterministic, stdlib-only, CI-run and now cross-validated by a second
implementation. The 2026-11-07 rigor pass closed the cheap gaps: a dense
merge sweep, bootstrap intervals, a de-confounding 2x2, a scaling run, a mix
ablation and literature references. It remains short of a publishable study
because the corpus is synthetic, the held-out set is tiny, no real tokenizer is
measured as a baseline and no downstream model measures quality.

## Rubric

| Criterion | Grade | Evidence and reasoning |
| --- | --- | --- |
| Research question | B | Clear and operational: how do merge count and pre-tokenization change the token cost of held-out English, Bangla and code (level-3-deep/DEEP-SPEC.md). The SPEC's "quality and cost" framing is only half answered (cost only), and the README says so. |
| Hypotheses | C | Implicit, not pre-registered: "merge count is the big lever", "pre-tokenization barely moves count". Both are now tested with intervals, but they were stated after the first run. |
| Method | B+ | Controlled variants on one corpus, held-out disjointness tested, deterministic tie-breaking. The variant B confound (training style and encoding style changed together) is now separated by the 2x2: count follows how merges are learned (555 vs 654 with the same per-word encoder), speed follows the encoder (0.67 ms vs 14.54 ms with the same merges). |
| Baselines | D | Only a byte baseline (1,332 tokens). No GPT-2 byte-level BPE, tiktoken or SentencePiece unigram on the same text, so NOVELTY.md's prior-art row correctly reads NO MEASUREMENT YET. |
| Statistics and uncertainty | B- | Paired stratified bootstrap, 1,000 replicates, fixed seed, over 20 held-out units: C minus A 194 tokens (95% interval 171 to 217), A minus B -19 (interval -38 to 0). Timings now report median and IQR. Twenty units is a small resampling base, so intervals are rough. |
| Reproducibility | A | Python 3.12 stdlib, no dependencies, fixed seeds, results written as JSON by the runners, CI runs every runner, and a second implementation in JavaScript reproduces all recorded token counts exactly at build time. Wall times are machine-dependent and are reported as ratios only. |
| Threats to validity | B | Named in the level READMEs and on the dashboard: synthetic template corpus (897 unique pre-tokens), one-author held-out set, timing varies by machine (B to A ratio 8.3 on 2026-11-04, 23.7 on 2026-11-07). The rigor pass corrected an over-claim: B's encode cost is a steady factor, not a super-linear blow-up. |
| Related work | C | DOSSIER.md now cites Gage 1994, Sennrich et al. 2016, Kudo and Richardson 2018 and Petrov et al. 2023. Not yet discussed against the findings in prose; no comparison to Petrov et al.'s fertility numbers. |
| Limitations | A- | Stated plainly in every README and on the dashboard, including that round-trip exactness is lossless by construction and carries no quality information. |
| External validity | D | Training text is 61,885 synthetic bytes; held-out is 1,332 bytes, 160 words. Bangla 9.199 bytes per token on training is a template artifact (3.855 on held-out). |
| Engineering rigor | A- | 43 unit tests, ruff in CI, save/load format versioned, special tokens reserved before training, truncation property tested so one long run stands in for many. |

## Cheap gaps fixed in this pass

1. Dense held-out merge sweep, 0 to 1,000 every 25 merges (results_rigor.json).
   The first 100 merges save 583 held-out tokens, merges 100 to 500 save 194,
   merges 500 to 1,000 save 74: diminishing returns, no plateau by 1,000.
2. Bootstrap intervals for the A-B and C-A differences (above).
3. Variant B confound broken by the 2x2 (above).
4. Encode-length scaling with median and IQR: B to A ratio 23.7 to 24.8 from
   1,332 to 10,663 bytes, both roughly linear.
5. Training-mix ablation: removing Bangla from training sends held-out Bangla
   from 159 tokens to 613 (one per byte); removing code sends code from 141 to 200.
6. Level 1 and Level 2 results persisted as JSON instead of README-only tables.
7. JavaScript port parity gate in the site build (an independent second
   implementation).
8. References section in DOSSIER.md.

## Remaining gaps and exactly what each needs

| Gap | What closes it | Compute and data needed |
| --- | --- | --- |
| No real-tokenizer baseline | Encode heldout.json with GPT-2 byte-level BPE (tiktoken `gpt2`), `cl100k_base`, and a SentencePiece unigram model trained on the same 61,885-byte corpus; report the same table. | CPU only, seconds. Needs two pip packages (tiktoken, sentencepiece) and a one-time download of the tiktoken vocab files; breaks the stdlib-only rule, so it belongs in an optional `baselines/` folder. |
| Synthetic corpus, tiny held-out set | Retrain all variants on a natural mixed corpus and a held-out set of at least 50,000 words per language. | Data: for example Bangla and English Wikipedia dumps and a permissively licensed code sample (tens of MB). CPU: the pure-Python trainer needs an incremental pair-count update to stay under minutes at that size. |
| No downstream quality measure | Train one small language model per tokenizer on the same text and compare bits per byte on held-out text (bits per byte, not perplexity, so different vocabularies compare fairly). | GPU: about 1 to 4 GPU-hours per variant for a roughly 10M-parameter model on a few hundred MB of text; 3 variants plus baselines. |
| Small resampling base for intervals | Bootstrap over at least 200 held-out units per segment once the larger held-out set exists. | No extra compute; needs the larger held-out set above. |
| Unicode normalization and word splitting | Add NFC and NFKC as variant dimensions; split fertility words with a Unicode word segmenter that handles the danda and code identifiers. | CPU, seconds, stdlib `unicodedata` for normalization; a segmenter such as ICU (PyICU) for word boundaries. |
| Timing evidence | Repeat the scaling run on two or more idle machines with pinned CPU frequency and report per-machine ratios. | CPU minutes on each machine; no data. |
| Related work not discussed | Compare the Bangla fertility here with the cross-language disparities reported by Petrov et al. 2023, on the same metric. | Reading only, once the natural-corpus run exists. |
| Novelty unproven | NOVELTY.md stays DRAFT until the baseline table above exists. | Depends on the baseline row. |

# Proposal: tokenizer-lab

Status: NOT LOCKED, NOT PRE-REGISTERED. This file was assembled on
2026-11-08 from the planning documents the repo already had (SPEC.md,
NOVELTY.md, DOSSIER.md and level-3-deep/DEEP-SPEC.md, moved here
unchanged below). Git history shows SPEC.md (commit f5172d3) came
before any code, but it states scope only: no hypothesis, no pass
line, no analysis plan. DEEP-SPEC.md, which defines the study, was
committed in the same commit as its results (a073bd2). So no plan
here was fixed before a result existed, and the repo carries the
"not pre-registered" label (docs/decisions/0003).

A future confirmatory cycle starts by locking a new version of this
file (tag proposal-v1) before any run: hypotheses, pass lines and the
baselines named in REPORT.md, Future work.

## Question

How much do merge count and pre-tokenization change the token cost of
held-out English, Bangla and code text for a byte-level BPE tokenizer
built from zero?

## Hypotheses, as stated after the first run

These were never registered in advance. They are written here so
REPORT.md can score them, misses included.

- H1, merge count: going from 100 to 500 merges cuts held-out tokens
  by a clear margin (the paired bootstrap interval of the difference
  excludes zero).
- H2, pre-tokenization: turning pre-tokenization off at 500 merges
  does not change held-out token count meaningfully (interval of the
  difference includes zero or sits within 5 percent of variant A).
- H3, encode cost: without pre-tokenization, encode time grows
  super-linearly with text length (the "encode cost blow-up" in the
  first Deep write-up).
- H4, quality: the study measures cost only; quality is limited to
  labelled proxies (round-trip exactness, single-token word share).

## Deep study design (moved from level-3-deep/DEEP-SPEC.md)


### Objective
Close Deep in compressed form per the December Compression Protocol:
the single hardest capability in the SPEC Deep scope, built, tested,
benchmarked, with a failure modes section. That capability is the
tokenizer choice cost and quality study on held-out text: three
tokenizer variants trained on the same Level 2 corpus, compared per
segment on text the training corpus does not repeat. The rest of
the v2 Deep scope is the v1.1 backlog in the repo root ROADMAP.md,
named there, not silently dropped.

### Controlled differences
- A_pretoken_500: BuildTokenizer, pre-tokenization on, 500 merges.
- B_nopretoken_500: NoPreTokenizer (study.py), pre-tokenization off,
  500 merges. Merges can cross word and punctuation boundaries.
  Build code is untouched; the variant lives in Deep code only.
- C_pretoken_100: BuildTokenizer, pre-tokenization on, 100 merges.
- baseline_bytes: byte baseline row in every table (tokens equal
  UTF-8 bytes). Labelled baseline, not a fourth variant.

### Held-out set
heldout.json: three segments (english, bangla, code), sentences
authored for this study on 2026-11-04, on topics the training corpus
does not use. A test asserts every held-out sentence or line of 20
or more characters is absent from the training corpus text, and
that all segments are non-empty. Shorter generic fragments are
excluded from that check because substring matching on them false
positives (a code fragment like "return total" sits inside a longer
corpus identifier).

### Metrics
Per variant, per segment and total: UTF-8 bytes, tokens, bytes per
token, tokens per word (fertility, whitespace words), round-trip
exactness, share of held-out words encoded as a single token, and
encode wall time per held-out pass (mean of 20 passes). Tokens are
the inference cost unit; no dollar price is assumed or stated.
Compression is labelled as cost, not quality. Round-trip exactness
and the single-token word share are the quality-adjacent measures,
labelled proxies. No downstream model is run at this level.

### Commands
- Test: python -m unittest discover -s tests -p "test_deep*.py" -v
- Run: python level-3-deep/run_deep.py (writes results_deep.json)
- Full: python -m unittest discover -s tests -v

### Boundaries
- Always: stdlib only, deterministic training, held-out disjointness
  tested, numbers recorded exactly as measured.
- Never: an external call, a new credential, a spend, a dollar cost
  claim, or a claim that compression proxies are model quality.

### Success criteria
- All three variants round trip every held-out segment exactly.
- The merge-count effect and the pre-tokenization effect are both
  visible in measured tables, in whatever direction they fall.
- The pre-token-off variant provably differs on a crafted case.
- Failure modes are written from the measured results.

## Scope and acceptance criteria (moved from SPEC.md)


Phase skill: spec-driven-development (house engineering pipeline).
Status: Wave 0 scaffold spec, from Roadmap v2 text and the v3 decision pack. Scope and acceptance criteria below are the v2 section text, kept as the source of truth until the project's wave opens its own spec pass.

Fleet node: BlackBoxV3. Wave: Wave 1.
Hiring evidence: tokenization duties at 2 companies (the internal score is kept outside the repo).

### Project section text (Roadmap v2, or the v3 candidate text for P23 to P29)

tokenizer-lab: KEEP

Subject: NLP foundations. v1 levels carry over: BPE from zero; train on a mixed English, Bangla, and code corpus with compression numbers; Deep studies how tokenizer choice changes model quality and cost.
Fan-out: Book chapter "Words Into Numbers". Paper angle: the tokenizer choice cost study (quality and cost on one task, three tokenizers). Course module: P02-tokenizer-lab.

### Acceptance criteria (scaffold level)

- Learn closes when the level-1-learn code runs, its README teaches the idea, and a fresh-eyes reader can follow it.
- Build closes when the system runs end to end, tests pass, and one benchmark or result table with method is in the README.
- Deep closes when the Deep scope in the section text is done, the failure modes are written, and the dossier is updated to ship state.
- No level closes on a claim. Evidence only: code, tests, numbers, links.

## Prior work and novelty (moved from NOVELTY.md)


Status: DRAFT, PROPOSED. Not verified. This text does not move into any public post, paper, or profile until the Jev claim_check gate passes on the exact text.

### Proposed claim

Against production tokenizers in open libraries (tokenizers, SentencePiece): this project aims to differ in the way its SPEC.md section text defines (a from-zero or self-hosted build, measured in public, on a named home fleet, with the failure modes written down). The exact difference is stated at the project's wave, after the prior art is re-read.

### Prior art table

| Prior art | What it does | What this project does differently | Measured difference |
| --- | --- | --- | --- |
| production tokenizers in open libraries (tokenizers, SentencePiece) | See DOSSIER.md, Past | PROPOSED, see the claim above | NO MEASUREMENT YET |

### Honest size

If the novelty proves small, this file will say so and name the real value instead (a cleaner reproduction, a better benchmark, a first public dataset). No novelty is invented to fill this section.

## Past, present and future (moved from DOSSIER.md)


Written under the documentation and publishing standard (past, present, future). Updated at ship time.

### Past

Prior art for this project is named in NOVELTY.md (production tokenizers in open libraries (tokenizers, SentencePiece)). The history of the problem, the key papers and systems, and what was tried before are recorded in the Roadmap v2 section text in SPEC.md and will be expanded with dated sources at the project's wave, before Build opens.

### Present

Ship state, updated 2026-11-04 at v1.0: Learn, Build, and compressed Deep are done. Learn built byte-level BPE from zero on a 2,011-byte mixed English, Bangla, and code corpus (11 tests, 200 merges encode the corpus in 643 tokens). Build added pre-tokenization, five special tokens at ids 256 to 260, weighted pair counting, and JSON save and load on a 61,885-byte synthetic mixed corpus (14 tests, 25 total; 1,000 merges encode the corpus in 11,142 tokens, vocab 1,261; the Bangla 9.199 bytes per token at 1,000 merges is a named template repetition effect, 897 unique pre-tokens). Compressed Deep ran the tokenizer choice cost and quality study on a 1,332-byte held-out set disjoint from training (11 tests, 36 total): variant A (pre-tokenization on, 500 merges) 555 tokens at 2.400 bytes per token, variant B (pre-tokenization off, 500 merges) 552 tokens at 2.413 and about 8 times slower to encode, variant C (pre-tokenization on, 100 merges) 749 tokens at 1.778, all variants round trip exactly, Bangla single-token word share 0.000. Releases v0.1, v0.5, and v1.0 are live on GitHub. Tools pinned: Python 3.12 standard library only, no dependencies. Current demand evidence: tokenization duties at 2 companies. The Round 3 research (2026-11-04) found the market centre at post-training, evals, environments, and inference depth [confirmed as the research finding; the report is at ~/workspace/research_notes/roadmap-v3-revaluation-research-20261104-0949/report.md]. The written fan-out set is in fanout/ and the publicity log is PUBLICITY.md. The rest of the v2 Deep scope is the v1.1 backlog in ROADMAP.md.

### Future

Open problems and the project's next steps sit in the Deep level scope in SPEC.md. Any forecast about this field is [unverified] unless a dated primary source is added here at the wave update.

### References

Standard prior art for this project, added 2026-11-07. None of these was re-run here; they frame what the measurements can and cannot be compared with.

1. Philip Gage. "A New Algorithm for Data Compression." The C Users Journal 12(2), February 1994, pages 23 to 38. The original byte pair encoding compression algorithm.
2. Rico Sennrich, Barry Haddow, Alexandra Birch. "Neural Machine Translation of Rare Words with Subword Units." ACL 2016, pages 1715 to 1725. arXiv:1508.07909. BPE adapted to subword vocabularies.
3. Taku Kudo, John Richardson. "SentencePiece: A simple and language independent subword tokenizer and detokenizer for Neural Text Processing." EMNLP 2018, System Demonstrations, pages 66 to 71. arXiv:1808.06226. The library named as prior art in NOVELTY.md.
4. Aleksandar Petrov, Emanuele La Malfa, Philip H. S. Torr, Adel Bibi. "Language Model Tokenizers Introduce Unfairness Between Languages." NeurIPS 2023. arXiv:2305.15425. Cross-language token-count disparity, directly relevant to the Bangla fertility numbers here.

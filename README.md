# tokenizer-lab

**Question.** How much do merge count and pre-tokenization change the
token cost of held-out English, Bangla and code text for a byte-level
BPE tokenizer built from zero?

**Headline.** On a 1,332-byte held-out set of English, Bangla and code, cutting the tokenizer from 500 to 100 merges costs 194 more tokens (95% paired-bootstrap interval 171 to 217) while switching pre-tokenization off changes the count by only 19 (interval 0 to 38), so merge count, not pre-tokenization, is the cost lever; trained on a 61,885-byte synthetic corpus, with no production tokenizer measured as a baseline.

**Field.** ML and AI research. **Job family.** ML engineering
(NLP foundations: tokenization).

**Verdict.** Functional, not pre-registered. Tests pass in CI on
Python 3.11 and 3.12, one command reproduces every results file from
the committed corpora, and the full study has run end to end with its
evidence in the repo. No plan was locked before the results
(docs/decisions/0003), and the baselines a reviewer would expect are
missing, so the repo is capped at Functional.

Live dashboard: https://jesunahmadushno.github.io/tokenizer-lab/ (train
the tokenizer in your browser on the committed corpus, tokenize your
own text, and explore the recorded held-out study; the build fails
unless the JavaScript port reproduces every recorded Python token count).

## Reproduce

```text
python3 -m unittest discover -s tests -p "test_*.py" -v
python3 scripts/check_results.py
```

The second command reruns all four runners (level-1-learn/train_bpe.py,
level-2-build/run_build.py, level-3-deep/run_deep.py,
level-3-deep/run_rigor.py) and checks that every results file matches
the committed one, timings excepted. Python 3 standard library only,
CPU, under a minute. The dashboard: `cd site && npm ci && npm run build`.

## Lifecycle

- Question: DONE 2026-11-04
- Proposal: NOT PRE-REGISTERED 2026-11-08
- Baseline: DONE 2026-11-04
- Build: DONE 2026-11-04
- Evaluate: PARTIAL 2026-11-07
- Report: DONE 2026-11-08
- Review: OPEN
- Release: OPEN

## Layout

| Path | What it holds |
| --- | --- |
| PROPOSAL.md | Question, post-hoc hypotheses H1 to H4, study design, scope, prior work (not locked) |
| REPORT.md | Background, method, results, hypotheses scored, misses, threats, gaps, future work |
| level-1-learn/ | Byte-level BPE from zero (bpe.py), its corpus, runner and results_learn.json; README is the teaching path |
| level-2-build/ | BuildTokenizer (tokenizer.py), the 61,885-byte corpus, runner and results_build.json |
| level-3-deep/ | Study code (study.py, rigor.py), held-out set, runners, results_deep.json and results_rigor.json |
| scripts/check_results.py | Regenerates every results file and compares it with the committed copy |
| tests/ | Unit tests for every level and the layout test, run in CI |
| docs/decisions/ | Records of hard-to-reverse choices |
| site/ | The live dashboard, built from the corpora and results files |
| fanout/ | Dated 2026-11-04 drafts (blog, tutorial, paper brief, release notes) and the publicity log |
| CHANGELOG.md, CITATION.cff, SECURITY.md, LICENSE | Project records |

No separate src/, experiments/ or results/ folders: the code, its
evidence (corpora, held-out set) and its results files live together
in each level folder, because the tests, the dashboard and its parity
gate read them there. The results files are regenerated from the
corpora by one command and checked in CI.

## License

Code: Apache-2.0 (see LICENSE). Tutorials: CC BY 4.0. Ruled in D-V3-11, 2026-11-04.

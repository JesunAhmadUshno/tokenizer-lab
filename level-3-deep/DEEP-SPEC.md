# Deep Spec: tokenizer-lab Level 3 (compressed Deep)

## Objective
Close Deep in compressed form per the December Compression Protocol:
the single hardest capability in the SPEC Deep scope, built, tested,
benchmarked, with a failure modes section. That capability is the
tokenizer choice cost and quality study on held-out text: three
tokenizer variants trained on the same Level 2 corpus, compared per
segment on text the training corpus does not repeat. The rest of
the v2 Deep scope is the v1.1 backlog in the repo root ROADMAP.md,
named there, not silently dropped.

## Controlled differences
- A_pretoken_500: BuildTokenizer, pre-tokenization on, 500 merges.
- B_nopretoken_500: NoPreTokenizer (study.py), pre-tokenization off,
  500 merges. Merges can cross word and punctuation boundaries.
  Build code is untouched; the variant lives in Deep code only.
- C_pretoken_100: BuildTokenizer, pre-tokenization on, 100 merges.
- baseline_bytes: byte baseline row in every table (tokens equal
  UTF-8 bytes). Labelled baseline, not a fourth variant.

## Held-out set
heldout.json: three segments (english, bangla, code), sentences
authored for this study on 2026-11-04, on topics the training corpus
does not use. A test asserts every held-out sentence or line of 20
or more characters is absent from the training corpus text, and
that all segments are non-empty. Shorter generic fragments are
excluded from that check because substring matching on them false
positives (a code fragment like "return total" sits inside a longer
corpus identifier).

## Metrics
Per variant, per segment and total: UTF-8 bytes, tokens, bytes per
token, tokens per word (fertility, whitespace words), round-trip
exactness, share of held-out words encoded as a single token, and
encode wall time per held-out pass (mean of 20 passes). Tokens are
the inference cost unit; no dollar price is assumed or stated.
Compression is labelled as cost, not quality. Round-trip exactness
and the single-token word share are the quality-adjacent measures,
labelled proxies. No downstream model is run at this level.

## Commands
- Test: python -m unittest discover -s tests -p "test_deep*.py" -v
- Run: python level-3-deep/run_deep.py (writes results_deep.json)
- Full: python -m unittest discover -s tests -v

## Boundaries
- Always: stdlib only, deterministic training, held-out disjointness
  tested, numbers recorded exactly as measured.
- Never: an external call, a new credential, a spend, a dollar cost
  claim, or a claim that compression proxies are model quality.

## Success criteria
- All three variants round trip every held-out segment exactly.
- The merge-count effect and the pre-tokenization effect are both
  visible in measured tables, in whatever direction they fall.
- The pre-token-off variant provably differs on a crafted case.
- Failure modes are written from the measured results.

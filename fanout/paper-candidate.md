# Paper candidate brief: tokenizer choice cost and quality study on held-out text

Tracker row: no P02 row exists in the publications pipeline tracker
as checked on 2026-11-04 (the tracker lists P27, P26, P05, P06, P03,
P25, and P28 candidates, and no tokenizer-lab row). A row for this
candidate is a coordinator step outside this cycle; this brief does
not edit the tracker.
Project: P02 tokenizer-lab
Status: CANDIDATE, brief written 2026-11-04
Submission note: submission is Jesun's tap. Nothing is submitted by
this brief, and no venue has been contacted.

## Working title

Tokenizer choice on held-out text: pre-tokenization and merge count
as cost levers, measured on a mixed English, Bangla, and code study

## Abstract draft

Based only on the measured v1.0 results recorded in the repo.
Numbers below come from the corpora named in each sentence and are
stated as such.

Tokenizer choice sets the token count for every downstream cost,
yet small tokenizer builds are often reported with training corpus
compression only. This work presents an open, dependency-free byte
pair encoding stack and measures three variants on held-out text
the training corpus does not repeat. At Learn level, a byte-level
BPE built from zero was trained on a 2,011-byte mixed English,
Bangla, and code corpus: 200 merges encode the full corpus in 643
tokens, with per segment bytes per token of 2.137 for english,
4.827 for bangla, and 2.664 for code, the first Bangla sentence
encoding in 19 tokens with an exact round trip, and 11 unit tests.
At Build level, a production-feature tokenizer (pre-tokenization
with a Bengali-aware word class, five special tokens reserved at
ids 256 to 260, weighted pair counting, JSON save and load) was
trained on a 61,885-byte synthetic mixed corpus: 1,000 merges
encode the corpus in 11,142 tokens with vocab 1,261, 500 merges
encode it in 14,894 tokens with vocab 761, a saved and reloaded
tokenizer encodes identically, and the Bangla ratio of 9.199 bytes
per token at 1,000 merges is identified as a template repetition
effect of the synthetic corpus, which holds only 897 unique
pre-tokens, with 14 unit tests (25 in total). At Deep level, on a
1,332-byte authored held-out set proven disjoint from training at
the sentence level, variant A (pre-tokenization on, 500 merges)
encodes in 555 tokens at 2.400 bytes per token, variant B
(pre-tokenization off, 500 merges) encodes in 552 tokens at 2.413
bytes per token while encoding about 8 times slower than A in this
implementation, and variant C (pre-tokenization on, 100 merges)
encodes in 749 tokens at 1.778 bytes per token against a byte
baseline of 1,332 tokens. Merge count therefore cuts held-out
tokens by 25.9 percent from 100 to 500 merges, while
pre-tokenization changes encode speed and token shape rather than
count on this set. All variants round trip all held-out segments
exactly, and the Bangla single-token word share is 0.000 for every
variant. The stack ships with 36 unit tests. The training corpus
is synthetic, the held-out set is small and hand authored, and no
downstream model quality is measured; the paper claims the
held-out cost study and the template effect warning on these sets,
not production tokenization rankings.

## Method outline

1. Algorithm: byte-level BPE from zero. Start with 256 byte
   tokens, count adjacent pairs, merge the most frequent pair,
   ties broken on the smallest pair for determinism.
2. Build features: a documented pre-tokenization regex whose word
   class adds the Bengali block (U+0980 to U+09FF) and combining
   diacriticals, because plain word matching split one Bangla word
   into six fragments in testing; five special tokens reserved
   before training at ids 256 to 260; weighted pair counting over
   unique pre-tokens; JSON save and load with an identical-encode
   check.
3. Corpora: a 2,011-byte hand-written teaching corpus at Learn,
   and a 61,885-byte synthetic mixed corpus at Build (english
   21,792 bytes, bangla 24,801 bytes, code 15,290 bytes), built
   from hand-written templates and word lists, 897 unique
   pre-tokens, no external text copied.
4. Held-out set: 1,332 bytes (english 463, bangla 613, code 254),
   authored on topics the training corpus does not use. A unit
   test asserts every held-out sentence or line of 20 or more
   characters is absent from the training corpus.
5. Variants: A and C use the Build tokenizer (pre-tokenization
   on) at 500 and 100 merges; B removes pre-tokenization at 500
   merges, training and encoding over whole sequences so merges
   cross word and punctuation boundaries.
6. Metrics per variant and per segment: tokens, bytes per token,
   tokens per word, round-trip exactness, single-token word
   share, special token handling, and encode wall time per
   held-out pass (mean of 20). Only the A against B wall ratio is
   treated as a finding.

## Results table

Measured 2026-11-04, from the level READMEs in the repo.

| Level | Set | Headline numbers | Tests |
| --- | --- | --- | --- |
| Learn | 2,011-byte mixed corpus | 200 merges: 643 tokens; english 2.137, bangla 4.827, code 2.664 bytes per token; first Bangla sentence 19 tokens, exact round trip | 11 |
| Build | 61,885-byte synthetic corpus | 1,000 merges: 11,142 tokens, vocab 1,261; 500 merges: 14,894 tokens, vocab 761; 5 special tokens, ids 256 to 260; save and load identical; Bangla 9.199 at 1,000 merges (template effect, 897 unique pre-tokens) | 14 (25 total) |
| Deep, variant A | 1,332-byte held-out set | Pre-token on, 500 merges: 555 tokens, 2.400 bytes per token | 11 Deep (36 total) |
| Deep, variant B | Same held-out set | Pre-token off, 500 merges: 552 tokens, 2.413 bytes per token, about 8 times slower encode than A | 11 Deep (36 total) |
| Deep, variant C | Same held-out set | Pre-token on, 100 merges: 749 tokens, 1.778 bytes per token; byte baseline 1,332 | 11 Deep (36 total) |

Named findings the paper must carry as findings, not footnotes:
merge count cuts held-out tokens 25.9 percent from 100 to 500
merges; pre-tokenization changes encode speed and token shape,
not count, on this set; all variants round trip exactly; and the
Bangla single-token word share on held-out text is 0.000 for
every variant, against a 9.199 bytes per token training corpus
ratio that the synthetic template effect explains.

## Venue class note

Per SPEC.md, the paper angle for P02 is the tokenizer choice cost
study (quality and cost on one task, three tokenizers). Venue
class is a workshop or conference in NLP or tokenization, or a
journal of the AJSE class, per the publications pipeline tracker
rules. One venue at a time. No venue is named as submitted,
accepted, or contacted in this brief. Fees, if any, arise only
after acceptance and remain Jesun's call under the free-only
rule.

## Limits the paper must carry

- The Build training corpus is synthetic (61,885 bytes, 897
  unique pre-tokens). Its template repetition inflates training
  corpus compression, most of all the Bangla ratio. No natural
  corpus result exists in v1.0.
- The held-out set is 1,332 bytes and hand authored. It separates
  three variants and proves disjointness; it cannot rank
  production tokenizers.
- No downstream model was run. Cost is tokens and encode wall
  time; quality is round-trip exactness plus the labelled
  single-token word share proxy only.
- Encode wall time is implementation cost on one machine. Only
  the about 8 times A against B ratio is a finding.
- Compressed Deep only. The v1.1 backlog (natural corpus at
  scale, normalization and digit splitting, learned downstream
  quality, binary save format, faster encoding, corpus mix) is
  future work, named in ROADMAP.md in the repo.

## Submission gate

Submission is Jesun's tap and nothing is submitted. This brief is
the candidate only. No tracker row for P02 exists as of
2026-11-04; adding one is the coordinator's step, reported in the
delivery report for this fan-out cycle.

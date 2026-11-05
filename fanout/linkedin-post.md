# LinkedIn post draft: P02 tokenizer-lab v1.0

Status: DRAFT NOT POSTED
Date drafted: 2026-11-04
Author: Jesun Ahmad Ushno
Rule for this platform: the link goes in the first comment, not in
the post body. The first comment line is at the end of this file.

## Post body

Every model bill is paid in tokens, and the tokenizer sets the
price. So I built byte pair encoding from zero, and then measured
what tokenizer choice actually costs on text the tokenizer never
trained on.

tokenizer-lab v1.0 is done: Learn, Build, and a compressed Deep,
Python standard library only. No tokenizer library, no model, no
API.

Learn: BPE from zero on a 2,011-byte mixed English, Bangla, and
code corpus. 200 merges encode the full corpus in 643 tokens.
Per segment at 200 merges: english 2.137 bytes per token, Bangla
4.827, code 2.664. The first Bangla sentence encodes in 19 tokens
and round trips exactly. 11 tests.

Build: pre-tokenization, five special tokens reserved at ids 256
to 260, weighted pair counting, and JSON save and load, on a
61,885-byte synthetic corpus. 1,000 merges encode it in 11,142
tokens (vocab 1,261); 500 merges in 14,894 tokens (vocab 761).
Save and load encode identically. 14 tests, 25 in total.

Deep (compressed): three variants on a 1,332-byte held-out set
that a test proves disjoint from training. Variant A
(pre-tokenization on, 500 merges): 555 tokens at 2.400 bytes per
token. Variant B (pre-tokenization off, 500 merges): 552 tokens
at 2.413, and about 8 times slower to encode. Variant C
(pre-tokenization on, 100 merges): 749 tokens at 1.778. Merge
count cuts tokens 25.9 percent from 100 to 500 merges. All
variants round trip exactly. 11 tests, 36 in total.

The honest limits, in the post and not in a footnote: the Build
Bangla ratio of 9.199 bytes per token is a template repetition
effect of the synthetic corpus (only 897 unique pre-tokens), and
on held-out text the Bangla single-token word share is 0.000 for
every variant. The held-out set is 1,332 bytes, compression is
cost and not quality, and no downstream model was run. The rest
of the Deep scope is named as the v1.1 backlog in the repo, not
claimed as done.

If you work with multilingual models: where does your tokenizer
make text expensive?

## First comment (post this as the first comment, per the standing rule)

Repo, releases v0.1, v0.5, and v1.0, and the full tutorial: https://github.com/JesunAhmadUshno/tokenizer-lab

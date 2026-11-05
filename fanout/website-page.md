# Website project page copy: tokenizer-lab

Site: jesunahmadushno.com
Status: COPY ONLY, draft for the project page. Dated 2026-11-04.
Nothing on any website was changed by this file.

## Headline

tokenizer-lab: byte pair encoding from zero, and what tokenizer choice costs on held-out text

## Summary

tokenizer-lab is an open tokenization project built by Jesun
Ahmad Ushno as project P02 in Roadmap v3. It builds byte pair
encoding from zero in three levels: the core algorithm on a small
mixed English, Bangla, and code corpus, production features
(pre-tokenization, five special tokens, weighted pair counting,
JSON save and load) on a larger synthetic corpus, and a controlled
held-out study of tokenizer choice (pre-tokenization on and off,
100 against 500 merges). It runs on the Python 3.12 standard
library only, with no external tokenizer library, no model, no
API, and no credential.

Status: v1.0, 2026-11-04. Learn, Build, and compressed Deep are
done. Total tests: 36, all passing at v1.0.

## Results

All results below are measured runs recorded in the level
READMEs in the GitHub repo. The Build corpus is synthetic, and
its Bangla ratio carries the template repetition caveat stated
in the table. They prove the algorithm, the pipeline, and the
held-out cost study, not production tokenization quality.

| Level | Set | Headline result | Notes |
| --- | --- | --- | --- |
| Learn | 2,011-byte mixed corpus | 200 merges encode the corpus in 643 tokens; per segment bytes per token english 2.137, bangla 4.827, code 2.664; first Bangla sentence 19 tokens, exact round trip | 11 tests |
| Build | 61,885-byte synthetic corpus | 1,000 merges encode the corpus in 11,142 tokens, vocab 1,261; 500 merges in 14,894 tokens, vocab 761; 5 special tokens at ids 256 to 260; save and load encode identically | 14 tests, 25 total; Bangla 9.199 bytes per token at 1,000 merges is a template repetition effect (897 unique pre-tokens) |
| Deep (compressed) | 1,332-byte held-out set, disjoint from training | Variant A (pre-token on, 500 merges) 555 tokens at 2.400 bytes per token; B (pre-token off, 500) 552 tokens at 2.413 and about 8 times slower to encode; C (pre-token on, 100 merges) 749 tokens at 1.778; byte baseline 1,332; merge count cuts tokens 25.9 percent from 100 to 500 merges; all variants round trip exactly; Bangla single-token word share 0.000 | 11 tests, 36 total |

## Honest limits

- The corpora are small and, at Build, synthetic. Template
  repetition inflates compression ratios, most of all Bangla.
- The held-out set is 1,332 bytes and hand authored. It separates
  the variants; it does not rank production tokenizers.
- Compression is cost, never quality. No downstream model was
  run in v1.0.
- Compressed Deep is not the full v2 Deep scope. The remainder
  is the v1.1 backlog in the repo ROADMAP.md.

## Links

- GitHub repo: https://github.com/JesunAhmadUshno/tokenizer-lab
- Release v0.1 (Learn): https://github.com/JesunAhmadUshno/tokenizer-lab/releases/tag/v0.1
- Release v0.5 (Build): https://github.com/JesunAhmadUshno/tokenizer-lab/releases/tag/v0.5
- Release v1.0 (Learn, Build, compressed Deep): https://github.com/JesunAhmadUshno/tokenizer-lab/releases/tag/v1.0
- Tutorial: fanout/tutorial.md in the GitHub repo
- Blog post draft: fanout/blog-post.md in the GitHub repo

## License note

Code: Apache-2.0. Tutorials: CC BY 4.0.

# DOSSIER: tokenizer-lab (P02) v1, 2026-11-04

Written under the documentation and publishing standard (past, present, future). Updated at ship time.

## Past

Prior art for this project is named in NOVELTY.md (production tokenizers in open libraries (tokenizers, SentencePiece)). The history of the problem, the key papers and systems, and what was tried before are recorded in the Roadmap v2 section text in SPEC.md and will be expanded with dated sources at the project's wave, before Build opens.

## Present

Ship state, updated 2026-11-04 at v1.0: Learn, Build, and compressed Deep are done. Learn built byte-level BPE from zero on a 2,011-byte mixed English, Bangla, and code corpus (11 tests, 200 merges encode the corpus in 643 tokens). Build added pre-tokenization, five special tokens at ids 256 to 260, weighted pair counting, and JSON save and load on a 61,885-byte synthetic mixed corpus (14 tests, 25 total; 1,000 merges encode the corpus in 11,142 tokens, vocab 1,261; the Bangla 9.199 bytes per token at 1,000 merges is a named template repetition effect, 897 unique pre-tokens). Compressed Deep ran the tokenizer choice cost and quality study on a 1,332-byte held-out set disjoint from training (11 tests, 36 total): variant A (pre-tokenization on, 500 merges) 555 tokens at 2.400 bytes per token, variant B (pre-tokenization off, 500 merges) 552 tokens at 2.413 and about 8 times slower to encode, variant C (pre-tokenization on, 100 merges) 749 tokens at 1.778, all variants round trip exactly, Bangla single-token word share 0.000. Releases v0.1, v0.5, and v1.0 are live on GitHub. Tools pinned: Python 3.12 standard library only, no dependencies. Current demand evidence: hiring value 3 of 5 (tokenization duties at 2 companies) [confirmed, fleet and scoring pass 2026-11-04; for P23 to P29, the decision pack 2026-11-04]. The Round 3 research (2026-11-04) found the market centre at post-training, evals, environments, and inference depth [confirmed as the research finding; the report is at ~/workspace/research_notes/roadmap-v3-revaluation-research-20261104-0949/report.md]. The written fan-out set is in fanout/ and the publicity log is PUBLICITY.md. The rest of the v2 Deep scope is the v1.1 backlog in ROADMAP.md.

## Future

Open problems and the project's next steps sit in the Deep level scope in SPEC.md. Any forecast about this field is [unverified] unless a dated primary source is added here at the wave update.

## References

Standard prior art for this project, added 2026-11-07. None of these was re-run here; they frame what the measurements can and cannot be compared with.

1. Philip Gage. "A New Algorithm for Data Compression." The C Users Journal 12(2), February 1994, pages 23 to 38. The original byte pair encoding compression algorithm.
2. Rico Sennrich, Barry Haddow, Alexandra Birch. "Neural Machine Translation of Rare Words with Subword Units." ACL 2016, pages 1715 to 1725. arXiv:1508.07909. BPE adapted to subword vocabularies.
3. Taku Kudo, John Richardson. "SentencePiece: A simple and language independent subword tokenizer and detokenizer for Neural Text Processing." EMNLP 2018, System Demonstrations, pages 66 to 71. arXiv:1808.06226. The library named as prior art in NOVELTY.md.
4. Aleksandar Petrov, Emanuele La Malfa, Philip H. S. Torr, Adel Bibi. "Language Model Tokenizers Introduce Unfairness Between Languages." NeurIPS 2023. arXiv:2305.15425. Cross-language token-count disparity, directly relevant to the Bangla fertility numbers here.

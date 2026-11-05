# tokenizer-lab

A byte-level BPE tokenizer built from zero, with a cost and quality study of tokenizer choices on held-out text. Built in three levels with measured results at each level.

- Learn: byte-level BPE from zero. At 200 merges the full 2,011-byte teaching corpus encodes in 643 tokens.
- Build: pre-tokenization, 5 reserved special tokens, weighted pair counting, and JSON save and load. At 1,000 merges the 61,885-byte Build corpus encodes in 11,142 tokens.
- Deep (compressed): a held-out study of three variants. At 500 merges variant A encodes the 1,332-byte held-out set in 555 tokens (2.400 bytes per token) and variant C at 100 merges in 749 tokens; merge count is the large held-out cost lever.

Grades on record (of 10,000): Learn 8,700, Build 8,200, Deep 8,200, fan-out set 9,560.

Every number above is already published in this repo (README.md level write-ups) and reproduced by the runners in this repo, checked in CI. The full write-ups are in the level folders: level-1-learn, level-2-build, level-3-deep. The tutorial and blog post are in fanout/.

Releases: https://github.com/JesunAhmadUshno/tokenizer-lab/releases

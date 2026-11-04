"""Train the Build tokenizer on the larger mixed corpus and report.

Run: python level-2-build/run_build.py

Prints a merge sweep (0, 100, 250, 500, 1000 merges), a per-segment
compression table at 500 and at 1000 merges, and a save and load
round-trip check at 1000 merges. All numbers come from the corpus
in this folder. Nothing is estimated.
"""
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tokenizer import BuildTokenizer, compression_report, pre_tokenize

HERE = os.path.dirname(os.path.abspath(__file__))


def load_segments():
    with open(os.path.join(HERE, "corpus.txt"), encoding="utf-8") as fh:
        raw = fh.read()
    segments = {}
    current = None
    for line in raw.splitlines():
        if line.startswith("### "):
            current = line[4:].strip()
            segments[current] = []
        elif current is not None:
            segments[current].append(line)
    return {name: "\n".join(lines).strip() for name, lines in segments.items()}


def print_segment_table(tok, segments, merges):
    print(f"Per-segment compression at {merges} merges:")
    total_bytes = 0
    total_tokens = 0
    for row in compression_report(tok, segments):
        total_bytes += row["bytes"]
        total_tokens += row["tokens"]
        print(f"  {row['segment']:<8} bytes {row['bytes']:>5} tokens {row['tokens']:>5} "
              f"bytes/token {row['bytes_per_token']:.3f}")
    print(f"  {'total':<8} bytes {total_bytes:>5} tokens {total_tokens:>5} "
          f"bytes/token {total_bytes / total_tokens:.3f}")
    print()


def main():
    segments = load_segments()
    full = "\n".join(segments.values())
    print("Corpus segments:", ", ".join(
        f"{name} {len(text.encode('utf-8'))} bytes" for name, text in segments.items()))
    print(f"Full corpus: {len(full.encode('utf-8'))} UTF-8 bytes")
    print(f"Unique pre-tokens in full corpus: {len(set(pre_tokenize(full)))}")
    print()
    print("Merge sweep (whole corpus):")
    for num_merges in (0, 100, 250, 500, 1000):
        tok = BuildTokenizer().train(full, num_merges)
        n_tokens = len(tok.encode(full))
        print(f"  merges {num_merges:>4}: vocab {tok.vocab_size:>4}, tokens {n_tokens}")
    print()
    for merges in (500, 1000):
        tok = BuildTokenizer().train(full, merges)
        print_segment_table(tok, segments, merges)
    tok = BuildTokenizer().train(full, 1000)
    sample = segments["bangla"].split("।")[0] + "।"
    ids = tok.encode(sample)
    print(f"Round trip check (first Bangla sentence): {len(ids)} tokens, "
          f"exact: {tok.decode(ids) == sample}")
    special_ids = tok.encode("start <|eos|> end")
    print(f"Special token check: '<|eos|>' in 'start <|eos|> end' encodes as "
          f"one id {tok.special_tokens['<|eos|>']}, present: "
          f"{tok.special_tokens['<|eos|>'] in special_ids}")
    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, "tokenizer.json")
        tok.save(path)
        loaded = BuildTokenizer.load(path)
        probe = (segments["english"][:200] + segments["bangla"][:120]
                 + segments["code"][:200] + " <|eos|> unseen text 42")
        same = loaded.encode(probe) == tok.encode(probe)
        print(f"Save/load check: saved to JSON, reloaded, encodes identical "
              f"on probe text: {same}, merges loaded: {len(loaded.merges)}, "
              f"vocab size loaded: {loaded.vocab_size}")


if __name__ == "__main__":
    main()

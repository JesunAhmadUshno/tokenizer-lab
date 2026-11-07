"""Train the Learn BPE tokenizer on the mixed corpus and report numbers.

Run: python level-1-learn/train_bpe.py
Prints a merge sweep (token count for the whole corpus at 0, 25, 50,
100, and 200 merges) and a per-segment compression table at 200 merges,
and writes the same numbers to results_learn.json beside this file.
All numbers come from the corpus in this folder. Nothing is estimated.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bpe import BPETokenizer, compression_report

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


def main():
    segments = load_segments()
    full = "\n".join(segments.values())
    print("Corpus segments:", ", ".join(
        f"{name} {len(text.encode('utf-8'))} bytes" for name, text in segments.items()))
    print(f"Full corpus: {len(full.encode('utf-8'))} UTF-8 bytes")
    print()
    print("Merge sweep (whole corpus):")
    results = {"corpus_bytes": len(full.encode("utf-8")),
               "segment_bytes": {name: len(text.encode("utf-8")) for name, text in segments.items()},
               "sweep": []}
    for num_merges in (0, 25, 50, 100, 200):
        tok = BPETokenizer().train(full, num_merges)
        n_tokens = len(tok.encode(full))
        results["sweep"].append({"merges": num_merges, "vocab_size": tok.vocab_size, "tokens": n_tokens})
        print(f"  merges {num_merges:>3}: vocab {tok.vocab_size:>3}, tokens {n_tokens}")
    print()
    tok = BPETokenizer().train(full, 200)
    print("Per-segment compression at 200 merges:")
    total_bytes = 0
    total_tokens = 0
    results["per_segment_200"] = compression_report(tok, segments)
    for row in results["per_segment_200"]:
        total_bytes += row["bytes"]
        total_tokens += row["tokens"]
        print(f"  {row['segment']:<8} bytes {row['bytes']:>4} tokens {row['tokens']:>4} "
              f"bytes/token {row['bytes_per_token']:.3f}")
    print(f"  {'total':<8} bytes {total_bytes:>4} tokens {total_tokens:>4} "
          f"bytes/token {total_bytes / total_tokens:.3f}")
    print()
    sample = segments["bangla"].split("।")[0] + "।"
    ids = tok.encode(sample)
    ok = tok.decode(ids) == sample
    print(f"Round trip check (first Bangla sentence): {len(ids)} tokens, exact: {ok}")
    results["bangla_first_sentence"] = {"tokens": len(ids), "roundtrip_exact": ok}
    out = os.path.join(HERE, "results_learn.json")
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(results, fh, ensure_ascii=False, indent=1)
        fh.write("\n")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()

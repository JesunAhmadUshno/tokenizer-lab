"""Run the Deep tokenizer choice study and write results_deep.json.

Run: python level-3-deep/run_deep.py

Trains the three variants on the Level 2 corpus, measures cost and
quality proxies per segment on the held-out set in heldout.json,
prints the full tables, and writes results_deep.json beside this
file. Every number printed comes from this run.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from study import run_study

HERE = os.path.dirname(os.path.abspath(__file__))
ORDER = ["A_pretoken_500", "B_nopretoken_500", "C_pretoken_100",
         "baseline_bytes"]


def main():
    results = run_study()
    print(f"Training corpus: {results['training_corpus_bytes']} UTF-8 bytes")
    print("Held-out bytes: " + ", ".join(
        f"{k} {v}" for k, v in results["heldout_bytes"].items()))
    print()
    for name in ORDER:
        v = results["variants"][name]
        print(f"Variant {name}: {v['description']}")
        print(f"  vocab {v['vocab_size']}, merges {v['merges']}")
        for seg, row in v["per_segment"].items():
            print(f"  {seg:<8} bytes {row['bytes']:>4} tokens {row['tokens']:>4} "
                  f"bytes/token {row['bytes_per_token']:.3f} "
                  f"tokens/word {row['tokens_per_word']:.3f} "
                  f"single-word share {row['single_token_word_share']:.3f} "
                  f"roundtrip {row['roundtrip_exact']}")
        t = v["total"]
        print(f"  {'total':<8} bytes {t['bytes']:>4} tokens {t['tokens']:>4} "
              f"bytes/token {t['bytes_per_token']:.3f} "
              f"tokens/word {t['tokens_per_word']:.3f} "
              f"single-word share {t['single_token_word_share']:.3f} "
              f"roundtrip {t['roundtrip_exact']}")
        if v["encode_wall_seconds_per_pass"] is not None:
            print(f"  encode wall per held-out pass: "
                  f"{v['encode_wall_seconds_per_pass'] * 1000:.3f} ms "
                  f"(mean of 20 passes)")
        if v["special_handling"] is not None:
            sh = v["special_handling"]
            print(f"  special check: eos single token "
                  f"{sh['eos_is_single_token']}, roundtrip {sh['roundtrip_exact']}")
        print(f"  all segments round trip exact: {v['all_roundtrip_exact']}")
        print()
    out = os.path.join(HERE, "results_deep.json")
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(results, fh, ensure_ascii=False, indent=1)
        fh.write("\n")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()

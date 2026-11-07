"""Run the Deep rigor additions and write results_rigor.json.

Run: python level-3-deep/run_rigor.py   (well under a minute, stdlib only)

1. Dense held-out merge sweep, 0 to 1,000 merges in steps of 25, for
   variants A (pre-tokenization on) and B (off), per segment, plus
   variant A tokens on the training corpus at each step.
2. Paired stratified bootstrap (1,000 replicates, fixed seed) over
   held-out sentences and code lines for the A minus B and C minus A
   token differences.
3. The pre-tokenization 2x2 at 500 merges: training style crossed
   with encoding style, which variant B confounds.
4. Encode-length scaling: A and B on the held-out text repeated
   1, 2, 4 and 8 times, median and interquartile range of wall time.
5. Training-mix ablation: variant A at 500 merges retrained with one
   training segment left out, measured per held-out segment.

Every number written comes from this run. Wall times depend on the
machine; the run block records which one.
"""
import datetime
import json
import os
import platform
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rigor import bootstrap, factorial_cells, split_units, timed, truncate  # noqa: E402
from study import BuildTokenizer, NoPreTokenizer, load_heldout, load_training_text  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
STEPS = list(range(0, 1001, 25))


def heldout_tokens(tok, heldout):
    row = {seg: len(tok.encode(text)) for seg, text in heldout.items()}
    row["total"] = len(tok.encode("\n".join(heldout.values())))
    return row


def main():
    training_text, segments = load_training_text()
    heldout = load_heldout()
    a_long = BuildTokenizer().train(training_text, 1000)
    b_long = NoPreTokenizer().train(training_text, 1000)
    out = {"run": {"date": datetime.date.today().isoformat(), "python": platform.python_version(),
                   "machine": platform.machine()}}

    sweep = []
    for k in STEPS:
        a, b = truncate(a_long, k), truncate(b_long, k)
        sweep.append({"merges": k, "A": heldout_tokens(a, heldout), "B": heldout_tokens(b, heldout),
                      "A_train_tokens": len(a.encode(training_text))})
    out["sweep"] = {"steps": STEPS, "heldout_bytes": len("\n".join(heldout.values()).encode("utf-8")),
                    "train_bytes": len(training_text.encode("utf-8")), "rows": sweep}
    print("Dense sweep (held-out total tokens):")
    for r in sweep[::4]:
        print(f"  merges {r['merges']:>4}: A {r['A']['total']:>4}  B {r['B']['total']:>4}  "
              f"A on training corpus {r['A_train_tokens']}")

    a500, b500, c100 = truncate(a_long, 500), truncate(b_long, 500), truncate(a_long, 100)
    strata = []
    for seg, text in heldout.items():
        strata.append([(len(a500.encode(u)), len(b500.encode(u)), len(c100.encode(u)))
                       for u in split_units(seg, text)])
    boot = {"reps": 1000, "seed": 20261107, "units": {seg: len(s) for seg, s in zip(heldout, strata)},
            "note": "units encoded one by one, so totals are unit sums, close to but not equal to whole-text totals"}
    for key, stat in {
        "A_unit_sum": lambda xs: sum(x[0] for x in xs),
        "B_unit_sum": lambda xs: sum(x[1] for x in xs),
        "C_unit_sum": lambda xs: sum(x[2] for x in xs),
        "A_minus_B_tokens": lambda xs: sum(x[0] - x[1] for x in xs),
        "C_minus_A_tokens": lambda xs: sum(x[2] - x[0] for x in xs),
        "A_minus_B_percent_of_A": lambda xs: 100 * sum(x[0] - x[1] for x in xs) / sum(x[0] for x in xs),
        "C_to_A_cut_percent_of_C": lambda xs: 100 * sum(x[2] - x[0] for x in xs) / sum(x[2] for x in xs),
    }.items():
        point, lo, hi = bootstrap(strata, stat, reps=1000, seed=20261107)
        boot[key] = {"point": point, "ci95": [lo, hi]}
    out["bootstrap"] = boot
    print(f"\nBootstrap A-B tokens {boot['A_minus_B_tokens']}, C-A tokens {boot['C_minus_A_tokens']}")

    total_text = "\n".join(heldout.values())
    cells = factorial_cells(a500, b500)
    out["factorial"] = {name: {"heldout": heldout_tokens(tok, heldout),
                               "encode_wall": timed(lambda t=tok: t.encode(total_text), 15)}
                        for name, tok in cells.items()}
    print("\n2x2 at 500 merges (held-out total tokens, median encode ms):")
    for name, cell in out["factorial"].items():
        print(f"  {name:<20} {cell['heldout']['total']:>4}  {cell['encode_wall']['median_ms']:.3f} ms")

    scaling = []
    for times in (1, 2, 4, 8):
        text = "\n".join([total_text] * times)
        scaling.append({"copies": times, "bytes": len(text.encode("utf-8")),
                        "A": timed(lambda t=text: a500.encode(t), 9),
                        "B": timed(lambda t=text: b500.encode(t), 9)})
    out["scaling"] = scaling
    print("\nEncode-length scaling (median ms):")
    for s in scaling:
        print(f"  x{s['copies']} {s['bytes']:>6} bytes: A {s['A']['median_ms']:.2f}  B {s['B']['median_ms']:.2f}")

    mix = {"full": heldout_tokens(a500, heldout)}
    for drop in segments:
        kept = "\n".join(t for name, t in segments.items() if name != drop)
        mix["without_" + drop] = heldout_tokens(BuildTokenizer().train(kept, 500), heldout)
    out["mix_ablation"] = {"merges": 500, "rows": mix}
    print("\nTraining-mix ablation, variant A at 500 merges (held-out tokens):")
    for name, row in mix.items():
        print(f"  {name:<16} " + "  ".join(f"{k} {v}" for k, v in row.items()))

    path = os.path.join(HERE, "results_rigor.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
        fh.write("\n")
    print(f"\nWrote {path}")


if __name__ == "__main__":
    main()

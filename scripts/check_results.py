"""Regenerate every results file from the committed corpora and compare it with the committed copy.

Runs the four runners, then checks that each results_*.json matches the committed one in every
value except the ones that depend on the machine: wall times, the run date, the Python version and
the CPU name. Restores the committed files afterwards, so the working tree is left unchanged.
Exit code 1 and a list of differing paths if any recorded number moved.
"""
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUNS = [("level-1-learn/train_bpe.py", "level-1-learn/results_learn.json"),
        ("level-2-build/run_build.py", "level-2-build/results_build.json"),
        ("level-3-deep/run_deep.py", "level-3-deep/results_deep.json"),
        ("level-3-deep/run_rigor.py", "level-3-deep/results_rigor.json")]
VOLATILE = {"run", "encode_wall", "encode_wall_seconds_per_pass", "median_ms", "q1_ms", "q3_ms"}


def diff(old, new, path=""):
    if isinstance(old, dict) and isinstance(new, dict):
        out = []
        for k in sorted(set(old) | set(new)):
            if k in VOLATILE:
                continue
            if k not in old or k not in new:
                out.append(f"{path}/{k} (missing on one side)")
            else:
                out += diff(old[k], new[k], f"{path}/{k}")
        return out
    if isinstance(old, list) and isinstance(new, list):
        if len(old) != len(new):
            return [f"{path} (length {len(old)} vs {len(new)})"]
        return [d for i, (a, b) in enumerate(zip(old, new)) for d in diff(a, b, f"{path}[{i}]")]
    return [] if old == new else [f"{path}: {old!r} -> {new!r}"]


def main():
    problems = []
    for script, result in RUNS:
        path = os.path.join(ROOT, result)
        with open(path, encoding="utf-8") as fh:
            committed_text = fh.read()
        try:
            subprocess.run([sys.executable, os.path.join(ROOT, script)], check=True, cwd=ROOT,
                           stdout=subprocess.DEVNULL)
            with open(path, encoding="utf-8") as fh:
                problems += [result + d for d in diff(json.loads(committed_text), json.load(fh))]
        finally:
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(committed_text)
    if problems:
        print("results drifted from the committed evidence:")
        print("\n".join("  " + p for p in problems))
        return 1
    print("results reproduced:", len(RUNS), "files match the committed copies (timings excluded)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

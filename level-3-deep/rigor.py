"""Deep rigor additions: dense merge sweep, bootstrap intervals, the
pre-tokenization 2x2, encode-length scaling and a training-mix ablation.

Python standard library only. Imports study.py and the Build tokenizer
without modifying them. run_rigor.py runs everything and writes
results_rigor.json.
"""
import copy
import random
import re
import statistics
import time

from study import FIRST_MERGE_ID, BuildTokenizer, NoPreTokenizer


def truncate(tok, k):
    """Copy of tok that keeps only its first k merges.

    Training is greedy and deterministic, so the first k merges of a
    long run are exactly the merges a k-merge run learns (tested in
    tests/test_deep_rigor.py). That lets one 1,000-merge run stand in
    for 41 separate runs in the dense sweep.
    """
    out = copy.copy(tok)
    out.merges = {p: i for p, i in tok.merges.items() if i < FIRST_MERGE_ID + k}
    return out


def split_units(name, text):
    """Resampling units for the bootstrap: lines for code, sentences
    (split after . ! ? or the Bangla danda) for prose. Separating
    whitespace is dropped, so the units keep every word."""
    if name == "code":
        return [line for line in text.split("\n") if line.strip()]
    return [u for u in re.split(r"(?<=[.!?।])\s+", text) if u.strip()]


def bootstrap(strata, stat, reps=1000, seed=20261107):
    """Stratified percentile bootstrap.

    strata: list of lists of items. Each replicate resamples every
    stratum with replacement at its own size, concatenates, and
    applies stat. Returns (point, lo, hi) with a 95 percent
    percentile interval (2.5th and 97.5th of the sorted replicates).
    """
    rng = random.Random(seed)
    point = stat([x for s in strata for x in s])
    reps_out = []
    for _ in range(reps):
        sample = []
        for s in strata:
            sample.extend(rng.choice(s) for _ in s)
        reps_out.append(stat(sample))
    reps_out.sort()
    return point, reps_out[int(0.025 * reps)], reps_out[min(reps - 1, int(0.975 * reps))]


def factorial_cells(pretrained, seqtrained):
    """The 2x2 that separates how merges are learned from how text is
    encoded. pretrained is a BuildTokenizer (pairs counted inside
    pre-tokens), seqtrained a NoPreTokenizer (pairs counted over the
    whole corpus). The off-diagonal cells reuse one side's merges
    with the other side's encoder."""
    pre_seq = NoPreTokenizer()
    pre_seq.merges, pre_seq.vocab = pretrained.merges, pretrained.vocab
    seq_pre = BuildTokenizer()
    seq_pre.merges, seq_pre.vocab = seqtrained.merges, seqtrained.vocab
    return {
        "pretrain_preencode": pretrained,      # variant A
        "pretrain_seqencode": pre_seq,
        "seqtrain_preencode": seq_pre,
        "seqtrain_seqencode": seqtrained,      # variant B
    }


def timed(fn, repeats):
    """Median and interquartile range of fn() wall time, in ms."""
    times = []
    for _ in range(repeats):
        start = time.perf_counter()
        fn()
        times.append((time.perf_counter() - start) * 1000)
    q1, med, q3 = statistics.quantiles(times, n=4)
    return {"median_ms": statistics.median(times), "q1_ms": q1, "q3_ms": q3, "repeats": repeats}

"""Deep level study: tokenizer choice cost and quality on held-out text.

Python standard library only. Imports the Build tokenizer from
level-2-build without modifying it.

Three variants, all trained on the same Level 2 corpus:

- A_pretoken_500: BuildTokenizer, pre-tokenization on, 500 merges.
  This is the Build configuration at its mid sweep point.
- B_nopretoken_500: NoPreTokenizer, pre-tokenization off, 500 merges.
  Training counts pairs over the whole corpus as one byte sequence,
  and encoding treats each special-free part as one sequence, so
  merges can cross word and punctuation boundaries.
- C_pretoken_100: BuildTokenizer, pre-tokenization on, 100 merges.
  The merge-count difference against variant A.

A byte baseline row (tokens equal UTF-8 bytes, bytes per token 1.0)
is reported in every table, labelled baseline. It is not a variant.

Metrics per variant, per segment and in total: UTF-8 bytes, tokens,
bytes per token, tokens per word (fertility, words are whitespace
separated pieces), round-trip exactness, the share of held-out words
encoded as a single token (a quality-adjacent proxy), and encode
wall time over the held-out set (the cost proxy beside token count).
Tokens themselves are the inference cost unit: a text that takes
twice the tokens costs roughly twice as much to process, at any
price. No dollar figure is stated, because no price is assumed.

Honest framing: compression is not quality. Bytes per token and
fertility measure cost. Round-trip exactness measures losslessness.
The single-token word share is only a proxy for how often a whole
word survives as one unit, which correlates with cleaner downstream
inputs in some setups and proves nothing on its own. No downstream
model was run; that measurement is v1.1 backlog (ROADMAP.md).
"""
import json
import os
import sys
import time
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(REPO, "level-2-build"))
from tokenizer import (FIRST_MERGE_ID, SPECIAL_TOKENS, BuildTokenizer,
                       merge_pair)

CORPUS_PATH = os.path.join(REPO, "level-2-build", "corpus.txt")
HELDOUT_PATH = os.path.join(HERE, "heldout.json")


def load_training_text():
    """Full Level 2 corpus text, segments joined as in run_build."""
    with open(CORPUS_PATH, encoding="utf-8") as fh:
        raw = fh.read()
    segments = {}
    current = None
    for line in raw.splitlines():
        if line.startswith("### "):
            current = line[4:].strip()
            segments[current] = []
        elif current is not None:
            segments[current].append(line)
    ordered = {name: "\n".join(lines).strip()
               for name, lines in segments.items()}
    return "\n".join(ordered.values()), ordered


def load_heldout():
    with open(HELDOUT_PATH, encoding="utf-8") as fh:
        return json.load(fh)


class NoPreTokenizer(BuildTokenizer):
    """Build BPE with pre-tokenization off.

    Training counts adjacent pairs over the whole corpus byte
    sequence (Learn style counting, Build vocab and special token
    layout). Encoding encodes each special-free part as one whole
    sequence with the same lowest-rank-first rule, so a learned
    token may span a space or a punctuation boundary.
    """

    def train(self, text, num_merges):
        ids = list(text.encode("utf-8"))
        for step in range(num_merges):
            if len(ids) < 2:
                break
            counts = Counter(zip(ids, ids[1:]))
            best = min(counts, key=lambda p: (-counts[p], p))
            new_id = FIRST_MERGE_ID + step
            ids = merge_pair(ids, best, new_id)
            self.merges[best] = new_id
            self.vocab[new_id] = self.vocab[best[0]] + self.vocab[best[1]]
        return self

    def _encode_sequence(self, text):
        ids = list(text.encode("utf-8"))
        while len(ids) >= 2:
            best_pair = None
            best_rank = None
            for pair in zip(ids, ids[1:]):
                rank = self.merges.get(pair)
                if rank is not None and (best_rank is None or rank < best_rank):
                    best_pair = pair
                    best_rank = rank
            if best_pair is None:
                break
            ids = merge_pair(ids, best_pair, self.merges[best_pair])
        return ids

    def encode(self, text):
        import re
        from tokenizer import _SPECIAL_RE
        out = []
        for part in _SPECIAL_RE.split(text):
            if not part:
                continue
            if part in self.special_tokens:
                out.append(self.special_tokens[part])
                continue
            out.extend(self._encode_sequence(part))
        return out


def summarize_counts(n_bytes, n_tokens, n_words, single_token_words,
                     roundtrip_ok):
    """Pure metric arithmetic, hand-checkable. Returns one row dict."""
    return {
        "bytes": n_bytes,
        "tokens": n_tokens,
        "bytes_per_token": (n_bytes / n_tokens) if n_tokens else 0.0,
        "words": n_words,
        "tokens_per_word": (n_tokens / n_words) if n_words else 0.0,
        "single_token_word_share": (
            single_token_words / n_words) if n_words else 0.0,
        "roundtrip_exact": bool(roundtrip_ok),
    }


def segment_metrics(tokenizer, text):
    """Measure one segment of held-out text under one tokenizer."""
    ids = tokenizer.encode(text)
    words = text.split()
    single = sum(1 for w in words if len(tokenizer.encode(w)) == 1)
    return summarize_counts(
        n_bytes=len(text.encode("utf-8")),
        n_tokens=len(ids),
        n_words=len(words),
        single_token_words=single,
        roundtrip_ok=(tokenizer.decode(ids) == text),
    )


def byte_baseline_metrics(text):
    n_bytes = len(text.encode("utf-8"))
    words = text.split()
    # At byte level no multi-byte word is a single token, and a
    # one-byte word is. Counted honestly, not assumed zero.
    single = sum(1 for w in words if len(w.encode("utf-8")) == 1)
    return summarize_counts(n_bytes, n_bytes, len(words), single, True)


def encode_wall_seconds(tokenizer, segments, repeats=20):
    """Mean wall seconds to encode the whole held-out set, per pass."""
    texts = list(segments.values())
    start = time.perf_counter()
    for _ in range(repeats):
        for text in texts:
            tokenizer.encode(text)
    return (time.perf_counter() - start) / repeats


def special_handling_check(tokenizer):
    probe = "start <|eos|> end"
    ids = tokenizer.encode(probe)
    return {
        "probe": probe,
        "eos_id": SPECIAL_TOKENS["<|eos|>"],
        "eos_is_single_token": ids.count(SPECIAL_TOKENS["<|eos|>"]) == 1,
        "roundtrip_exact": tokenizer.decode(ids) == probe,
    }


def train_variants(training_text):
    return {
        "A_pretoken_500": BuildTokenizer().train(training_text, 500),
        "B_nopretoken_500": NoPreTokenizer().train(training_text, 500),
        "C_pretoken_100": BuildTokenizer().train(training_text, 100),
    }


VARIANT_DESCRIPTIONS = {
    "A_pretoken_500": "BuildTokenizer, pre-tokenization on, 500 merges",
    "B_nopretoken_500": "NoPreTokenizer, pre-tokenization off, 500 merges",
    "C_pretoken_100": "BuildTokenizer, pre-tokenization on, 100 merges",
    "baseline_bytes": "Byte baseline, no merges (not a variant)",
}


def run_study(repeats=20):
    training_text, _ = load_training_text()
    heldout = load_heldout()
    variants = train_variants(training_text)
    results = {
        "training_corpus_bytes": len(training_text.encode("utf-8")),
        "heldout_bytes": {name: len(t.encode("utf-8"))
                          for name, t in heldout.items()},
        "variants": {},
    }
    for name, tok in variants.items():
        per_segment = {seg: segment_metrics(tok, text)
                       for seg, text in heldout.items()}
        total_text = "\n".join(heldout.values())
        total = segment_metrics(tok, total_text)
        results["variants"][name] = {
            "description": VARIANT_DESCRIPTIONS[name],
            "vocab_size": tok.vocab_size,
            "merges": len(tok.merges),
            "per_segment": per_segment,
            "total": total,
            "encode_wall_seconds_per_pass": encode_wall_seconds(
                tok, heldout, repeats=repeats),
            "special_handling": special_handling_check(tok),
            "all_roundtrip_exact": all(
                row["roundtrip_exact"] for row in per_segment.values()),
        }
    baseline_segments = {seg: byte_baseline_metrics(text)
                         for seg, text in heldout.items()}
    baseline_total = byte_baseline_metrics("\n".join(heldout.values()))
    results["variants"]["baseline_bytes"] = {
        "description": VARIANT_DESCRIPTIONS["baseline_bytes"],
        "vocab_size": 256,
        "merges": 0,
        "per_segment": baseline_segments,
        "total": baseline_total,
        "encode_wall_seconds_per_pass": None,
        "special_handling": None,
        "all_roundtrip_exact": True,
    }
    return results

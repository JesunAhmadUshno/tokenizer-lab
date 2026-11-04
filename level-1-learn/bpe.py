"""Byte-level BPE tokenizer built from zero. Python standard library only.

Learn level design:
- Base vocabulary is the 256 byte values. Any text, in any script,
  encodes losslessly because UTF-8 bytes are the atoms.
- Training counts adjacent token pairs in the corpus, merges the most
  frequent pair into a new token, and repeats. Ties break on the
  smallest pair, so training is fully deterministic.
- Encoding applies the learned merges in the order they were learned
  (lowest merge rank first), which is the standard BPE rule.
- Decoding concatenates the byte strings of the tokens and decodes
  UTF-8. Encode then decode is an exact round trip for any string.
"""


def get_stats(ids):
    """Count adjacent pairs. Returns a dict mapping (int, int) to count."""
    counts = {}
    for pair in zip(ids, ids[1:]):
        counts[pair] = counts.get(pair, 0) + 1
    return counts


def merge_pair(ids, pair, new_id):
    """Replace every non-overlapping occurrence of pair with new_id."""
    out = []
    i = 0
    while i < len(ids):
        if i < len(ids) - 1 and ids[i] == pair[0] and ids[i + 1] == pair[1]:
            out.append(new_id)
            i += 2
        else:
            out.append(ids[i])
            i += 1
    return out


class BPETokenizer:
    def __init__(self):
        self.merges = {}  # (int, int) -> new token id, in learn order
        self.vocab = {i: bytes([i]) for i in range(256)}

    @property
    def vocab_size(self):
        return 256 + len(self.merges)

    def train(self, text, num_merges):
        """Learn up to num_merges merges from text. Returns self."""
        ids = list(text.encode("utf-8"))
        for step in range(num_merges):
            stats = get_stats(ids)
            if not stats:
                break
            # Most frequent pair; tie-break on the smallest pair so the
            # result does not depend on dict ordering.
            best = min(stats, key=lambda p: (-stats[p], p))
            new_id = 256 + step
            ids = merge_pair(ids, best, new_id)
            self.merges[best] = new_id
            self.vocab[new_id] = self.vocab[best[0]] + self.vocab[best[1]]
        return self

    def encode(self, text):
        ids = list(text.encode("utf-8"))
        while len(ids) >= 2:
            stats = get_stats(ids)
            # The pair with the lowest merge rank (learned earliest)
            # merges first. Pairs never seen in training have no rank.
            pair = min(stats, key=lambda p: self.merges.get(p, float("inf")))
            if pair not in self.merges:
                break
            ids = merge_pair(ids, pair, self.merges[pair])
        return ids

    def decode(self, ids):
        raw = b"".join(self.vocab[i] for i in ids)
        return raw.decode("utf-8", errors="replace")


def compression_report(tokenizer, segments):
    """Per-segment compression numbers for a trained tokenizer.

    segments: dict of name -> text. Returns a list of dicts with the
    UTF-8 byte count, the token count, bytes per token, and the
    compression ratio (bytes divided by tokens).
    """
    rows = []
    for name, text in segments.items():
        n_bytes = len(text.encode("utf-8"))
        n_tokens = len(tokenizer.encode(text))
        rows.append({
            "segment": name,
            "bytes": n_bytes,
            "tokens": n_tokens,
            "bytes_per_token": (n_bytes / n_tokens) if n_tokens else 0.0,
            "ratio": (n_bytes / n_tokens) if n_tokens else 0.0,
        })
    return rows

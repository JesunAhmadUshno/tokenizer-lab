"""Build level BPE tokenizer. Python standard library only.

Extends the Learn byte-level BPE with three production features:

1. Pre-tokenization. Text is split first by a documented regex, and
   merges never cross a pre-token boundary. The pattern is:

       " ?[\\w\\u0980-\\u09ff\\u0300-\\u036f]+"
       "| ?[^\\s\\w\\u0980-\\u09ff\\u0300-\\u036f]+|\\s+"

   In words: an optional single space followed by one or more word
   characters, or an optional single space followed by one or more
   punctuation or symbol characters, or a run of whitespace on its
   own. Joining the pieces reproduces the input exactly. This keeps
   words separate from punctuation, like production BPE systems do,
   and it stops a merge from gluing the end of one word to the
   start of the next. The word class adds the Bengali block
   (U+0980 to U+09FF) and the combining diacriticals block on top
   of \\w for a measured reason: Python \\w does not match Bengali
   vowel signs or the virama, so a plain \\w pattern splits a word
   like the Bangla word for Bangla into six fragments. The added
   ranges keep each Bangla word in one pre-token. The danda full
   stop used in Bangla sits outside those ranges and still splits
   as punctuation, as it should.

2. Special tokens. Five named tokens are reserved before training
   starts: <|pad|>, <|unk|>, <|bos|>, <|eos|>, <|mask|>. They own
   ids 256 to 260. Merges start at id 261. A special id never
   appears in a merge pair and is never produced by merging, because
   training only ever sees byte ids and merge ids. When encoding,
   a literal special token string in the input is recognised first
   and emitted as its single reserved id. Decoding maps that id
   back to its name.

3. Save and load. A trained tokenizer saves to one JSON file with
   its format name, its special tokens, its full vocabulary (each
   entry as a list of byte values), and its merges in learn order.
   Loading that file rebuilds a tokenizer that encodes identically.

Training speed: Learn recounted pairs over the whole corpus
sequence on every merge. Build counts pairs over unique pre-tokens
weighted by how often each pre-token occurs in the corpus. On a
repetitive corpus most occurrences repeat a small set of unique
pre-tokens, so each merge step touches far fewer sequences. The
result is identical in spirit and deterministic: ties break on
the smallest pair, exactly as in Learn.
"""
import json
import re
from collections import Counter

SPECIAL_TOKENS = {
    "<|pad|>": 256,
    "<|unk|>": 257,
    "<|bos|>": 258,
    "<|eos|>": 259,
    "<|mask|>": 260,
}
FIRST_MERGE_ID = max(SPECIAL_TOKENS.values()) + 1  # 261

PRE_TOKEN_PATTERN = (r" ?[\w\u0980-\u09ff\u0300-\u036f]+"
                     r"| ?[^\s\w\u0980-\u09ff\u0300-\u036f]+|\s+")
_PRE_TOKEN_RE = re.compile(PRE_TOKEN_PATTERN)
_SPECIAL_RE = re.compile(
    "(" + "|".join(re.escape(name) for name in
                   sorted(SPECIAL_TOKENS, key=len, reverse=True)) + ")"
)

FORMAT_NAME = "tokenizer-lab-build-v1"


def pre_tokenize(text):
    """Split text into pre-tokens. Joining them returns text."""
    return _PRE_TOKEN_RE.findall(text)


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


def _weighted_stats(sequences):
    """Count adjacent pairs over (ids, weight) sequences."""
    counts = {}
    for ids, weight in sequences:
        for pair in zip(ids, ids[1:]):
            counts[pair] = counts.get(pair, 0) + weight
    return counts


class BuildTokenizer:
    def __init__(self):
        self.special_tokens = dict(SPECIAL_TOKENS)
        self.special_ids = {v: k for k, v in SPECIAL_TOKENS.items()}
        self.merges = {}  # (int, int) -> new token id, in learn order
        self.vocab = {i: bytes([i]) for i in range(256)}
        for name, idx in SPECIAL_TOKENS.items():
            self.vocab[idx] = name.encode("utf-8")

    @property
    def vocab_size(self):
        return 256 + len(self.special_tokens) + len(self.merges)

    def train(self, text, num_merges):
        """Learn up to num_merges merges from text. Returns self.

        Pairs are counted inside pre-tokens only, weighted by the
        frequency of each unique pre-token in the corpus.
        """
        chunks = Counter(pre_tokenize(text))
        # Each unique pre-token becomes one weighted byte sequence.
        sequences = [[list(chunk.encode("utf-8")), count]
                     for chunk, count in chunks.items()]
        for step in range(num_merges):
            stats = _weighted_stats(sequences)
            if not stats:
                break
            best = min(stats, key=lambda p: (-stats[p], p))
            new_id = FIRST_MERGE_ID + step
            for entry in sequences:
                if len(entry[0]) >= 2 and best[0] in entry[0]:
                    entry[0] = merge_pair(entry[0], best, new_id)
            self.merges[best] = new_id
            self.vocab[new_id] = self.vocab[best[0]] + self.vocab[best[1]]
        return self

    def _encode_chunk(self, chunk):
        ids = list(chunk.encode("utf-8"))
        while len(ids) >= 2:
            # Lowest merge rank (learned earliest) merges first.
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
        """Encode text. Literal special token strings become one id."""
        out = []
        for part in _SPECIAL_RE.split(text):
            if not part:
                continue
            if part in self.special_tokens:
                out.append(self.special_tokens[part])
                continue
            for chunk in pre_tokenize(part):
                out.extend(self._encode_chunk(chunk))
        return out

    def decode(self, ids):
        raw = b"".join(self.vocab[i] for i in ids)
        return raw.decode("utf-8", errors="replace")

    def save(self, path):
        """Save vocab, merges, and special tokens to one JSON file."""
        data = {
            "format": FORMAT_NAME,
            "special_tokens": self.special_tokens,
            "vocab": {str(idx): list(raw) for idx, raw in
                      sorted(self.vocab.items())},
            "merges": [[a, b, new_id] for (a, b), new_id in
                        self.merges.items()],
        }
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=1)
            fh.write("\n")
        return path

    @classmethod
    def load(cls, path):
        """Load a tokenizer saved by save(). Encodes identically."""
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        if data.get("format") != FORMAT_NAME:
            raise ValueError("unknown tokenizer format: %r" % data.get("format"))
        tok = cls()
        if data["special_tokens"] != tok.special_tokens:
            raise ValueError("special token table does not match this build")
        tok.vocab = {int(idx): bytes(raw) for idx, raw in data["vocab"].items()}
        tok.merges = {(a, b): new_id for a, b, new_id in data["merges"]}
        return tok


def compression_report(tokenizer, segments):
    """Per-segment compression numbers, same shape as Learn level."""
    rows = []
    for name, text in segments.items():
        n_bytes = len(text.encode("utf-8"))
        n_tokens = len(tokenizer.encode(text))
        rows.append({
            "segment": name,
            "bytes": n_bytes,
            "tokens": n_tokens,
            "bytes_per_token": (n_bytes / n_tokens) if n_tokens else 0.0,
        })
    return rows

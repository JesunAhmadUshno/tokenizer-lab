"""Deep level tests for the tokenizer choice study.

Run: python -m unittest discover -s tests -p "test_deep*.py" -v
"""
import json
import os
import re
import sys
import unittest

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "level-3-deep"))
sys.path.insert(0, os.path.join(REPO, "level-2-build"))
from study import (NoPreTokenizer, load_heldout, load_training_text,
                   segment_metrics, summarize_counts, train_variants)
from tokenizer import BuildTokenizer

_cache = {}


def variants():
    if "v" not in _cache:
        text, _ = load_training_text()
        _cache["v"] = train_variants(text)
        _cache["train"] = text
    return _cache["v"]


class TestHeldoutDisjoint(unittest.TestCase):
    def test_segments_present_and_nonempty(self):
        held = load_heldout()
        self.assertEqual(set(held), {"english", "bangla", "code"})
        for name, text in held.items():
            self.assertGreater(len(text.strip()), 50, name)
            self.assertGreater(len(text.split()), 10, name)

    def test_no_heldout_sentence_appears_in_training_corpus(self):
        training, _ = load_training_text()
        with open(os.path.join(REPO, "level-2-build", "corpus.txt"),
                  encoding="utf-8") as fh:
            raw_corpus = fh.read()
        held = load_heldout()
        checked = 0
        for name, text in held.items():
            pieces = []
            for line in text.splitlines():
                pieces.extend(p.strip() for p in
                              re.split(r"(?<=[.!?।])\s+", line) if p.strip())
            for sentence in pieces:
                # Pieces under 20 chars are generic fragments, not
                # sentences: substring matching on them false
                # positives (the code fragment "return total" sits
                # inside the corpus line "return total_token").
                if len(sentence) < 20:
                    continue
                checked += 1
                self.assertNotIn(sentence, training, (name, sentence))
                self.assertNotIn(sentence, raw_corpus, (name, sentence))
        self.assertGreater(checked, 10)


class TestVariantTraining(unittest.TestCase):
    def test_variant_shapes(self):
        v = variants()
        self.assertEqual(v["A_pretoken_500"].vocab_size, 761)
        self.assertEqual(len(v["A_pretoken_500"].merges), 500)
        self.assertEqual(v["B_nopretoken_500"].vocab_size, 761)
        self.assertEqual(len(v["B_nopretoken_500"].merges), 500)
        self.assertEqual(v["C_pretoken_100"].vocab_size, 361)
        self.assertEqual(len(v["C_pretoken_100"].merges), 100)

    def test_training_is_deterministic(self):
        text, _ = load_training_text()
        first = BuildTokenizer().train(text, 100).merges
        second = BuildTokenizer().train(text, 100).merges
        self.assertEqual(first, second)
        first_b = NoPreTokenizer().train(text, 100).merges
        second_b = NoPreTokenizer().train(text, 100).merges
        self.assertEqual(first_b, second_b)

    def test_more_merges_compress_heldout_better(self):
        v = variants()
        held = load_heldout()
        total = "\n".join(held.values())
        self.assertLess(len(v["A_pretoken_500"].encode(total)),
                        len(v["C_pretoken_100"].encode(total)))


class TestRoundTripAndSpecials(unittest.TestCase):
    def test_roundtrip_all_variants_all_segments(self):
        held = load_heldout()
        for name, tok in variants().items():
            for seg, text in held.items():
                self.assertEqual(tok.decode(tok.encode(text)), text,
                                 (name, seg))

    def test_special_handling_all_variants(self):
        for name, tok in variants().items():
            ids = tok.encode("start <|eos|> end")
            self.assertEqual(ids.count(259), 1, name)
            self.assertEqual(tok.decode(ids), "start <|eos|> end", name)


class TestMetricArithmetic(unittest.TestCase):
    def test_summarize_counts_hand_computed(self):
        # Hand computed: 100 bytes, 25 tokens gives 4.0 bytes per
        # token. 20 words gives 25/20 = 1.25 tokens per word. 10 of
        # 20 words single-token gives share 0.5.
        row = summarize_counts(100, 25, 20, 10, True)
        self.assertEqual(row["bytes_per_token"], 4.0)
        self.assertEqual(row["tokens_per_word"], 1.25)
        self.assertEqual(row["single_token_word_share"], 0.5)
        self.assertTrue(row["roundtrip_exact"])

    def test_segment_metrics_on_stub(self):
        class Stub:
            def encode(self, text):
                return [0] * len(text.split())

            def decode(self, ids):
                return "x"
        row = segment_metrics(Stub(), "one two three four")
        self.assertEqual(row["tokens"], 4)
        self.assertEqual(row["words"], 4)
        self.assertEqual(row["tokens_per_word"], 1.0)
        self.assertEqual(row["single_token_word_share"], 1.0)
        self.assertFalse(row["roundtrip_exact"])


class TestPreTokenOffDiffers(unittest.TestCase):
    def test_crafted_case_differs(self):
        craft = "ab cd ab cd ab cd ab cd ab cd ab cd"
        pre = BuildTokenizer().train(craft, 30)
        nopre = NoPreTokenizer().train(craft, 30)
        # Pre-tokenization caps every token inside one pre-token, so
        # the craft takes many tokens. Without it, merges cross the
        # space and the whole repeated string collapses to one token
        # (measured 2026-11-04: 12 tokens against 1).
        self.assertEqual(len(nopre.encode(craft)), 1)
        self.assertGreater(len(pre.encode(craft)), 5)
        self.assertNotEqual(pre.encode(craft), nopre.encode(craft))
        # No pre-token token may contain bytes from both sides of
        # the space inside the craft pattern as a mid-token span of
        # the form letter-space-letter learned across the boundary
        # in the no-pre sense: the whole-string token proves it.
        self.assertIn(craft.encode("utf-8"),
                      [nopre.vocab[i] for i in nopre.encode(craft)])

    def test_results_file_shape(self):
        path = os.path.join(REPO, "level-3-deep", "results_deep.json")
        if not os.path.exists(path):
            self.skipTest("results_deep.json not generated yet")
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        self.assertIn("baseline_bytes", data["variants"])
        for name in ("A_pretoken_500", "B_nopretoken_500", "C_pretoken_100"):
            self.assertTrue(data["variants"][name]["all_roundtrip_exact"])


if __name__ == "__main__":
    unittest.main()

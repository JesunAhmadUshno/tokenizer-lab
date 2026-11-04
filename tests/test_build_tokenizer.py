"""Build level tests for the production-style BPE tokenizer.

Run: python -m unittest discover -s tests -p "test_build*.py" -v
"""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))), "level-2-build"))
from tokenizer import (FIRST_MERGE_ID, SPECIAL_TOKENS, BuildTokenizer,
                       pre_tokenize)


def trained(merges=100):
    corpus = ("the tokenizer turns text into numbers. the tokenizer "
              "counts pairs and merges frequent pairs. " * 6
              + "আমি প্রতিদিন বাংলা পড়ি এবং লিখি। বাংলা ভাষা সুন্দর। " * 5
              + "def count_pairs(ids):\n    return pairs\n" * 5)
    return BuildTokenizer().train(corpus, merges)


class TestSpecialTokens(unittest.TestCase):
    def test_special_ids_are_reserved_in_order(self):
        self.assertEqual(SPECIAL_TOKENS, {
            "<|pad|>": 256, "<|unk|>": 257, "<|bos|>": 258,
            "<|eos|>": 259, "<|mask|>": 260})
        self.assertEqual(FIRST_MERGE_ID, 261)

    def test_first_merge_id_is_not_a_special_id(self):
        tok = trained(10)
        self.assertGreater(len(tok.merges), 0)
        self.assertEqual(min(tok.merges.values()), FIRST_MERGE_ID)

    def test_special_tokens_are_never_merged(self):
        tok = trained(100)
        special = set(SPECIAL_TOKENS.values())
        for pair, new_id in tok.merges.items():
            self.assertNotIn(pair[0], special)
            self.assertNotIn(pair[1], special)
            self.assertNotIn(new_id, special)

    def test_special_string_encodes_as_one_id(self):
        tok = trained(20)
        self.assertEqual(tok.encode("<|eos|>"), [SPECIAL_TOKENS["<|eos|>"]])
        ids = tok.encode("start <|eos|> end")
        self.assertEqual(ids.count(SPECIAL_TOKENS["<|eos|>"]), 1)
        self.assertEqual(tok.decode(ids), "start <|eos|> end")

    def test_vocab_size_counts_specials(self):
        tok = trained(10)
        self.assertEqual(tok.vocab_size, 256 + 5 + len(tok.merges))


class TestPreTokenization(unittest.TestCase):
    def test_joining_pretokens_reproduces_input(self):
        for text in ("hello, world!", "আমি বাংলা পড়ি।",
                     "def f(x):\n    return x + 1",
                     "costs 42 tokens (or 43)  today"):
            self.assertEqual("".join(pre_tokenize(text)), text)

    def test_words_and_punctuation_split(self):
        self.assertEqual(pre_tokenize("hello, world!"),
                         ["hello", ",", " world", "!"])

    def test_bangla_word_is_one_pretoken(self):
        parts = pre_tokenize("বাংলা পড়ি")
        self.assertEqual(parts, ["বাংলা", " পড়ি"])

    def test_merges_do_not_cross_pretoken_boundary(self):
        # Train hard on a pattern that spans a comma boundary. The
        # comma starts its own pre-token, so no learned token may
        # contain bytes from both sides of it.
        tok = BuildTokenizer().train("ab,ab,ab,ab,ab,ab,ab,ab", 50)
        for new_id, pair in [(v, k) for k, v in tok.merges.items()]:
            raw = tok.vocab[new_id]
            self.assertFalse(b"a" in raw and b"," in raw)


class TestSaveLoad(unittest.TestCase):
    def test_round_trip_through_json_file(self):
        tok = trained(80)
        probe = "the tokenizer counts pairs <|eos|> আমি বাংলা পড়ি 42"
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "tok.json")
            tok.save(path)
            with open(path, encoding="utf-8") as fh:
                data = json.load(fh)
            self.assertEqual(data["format"], "tokenizer-lab-build-v1")
            self.assertEqual(len(data["merges"]), len(tok.merges))
            loaded = BuildTokenizer.load(path)
        self.assertEqual(loaded.merges, tok.merges)
        self.assertEqual(loaded.vocab, tok.vocab)
        self.assertEqual(loaded.encode(probe), tok.encode(probe))
        self.assertEqual(loaded.decode(loaded.encode(probe)), probe)

    def test_load_rejects_wrong_format(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "bad.json")
            with open(path, "w", encoding="utf-8") as fh:
                json.dump({"format": "nope"}, fh)
            with self.assertRaises(ValueError):
                BuildTokenizer.load(path)


class TestCompressionAndRoundTrip(unittest.TestCase):
    def test_more_merges_compress_better(self):
        corpus_path = os.path.join(os.path.dirname(os.path.dirname(
            os.path.abspath(__file__))), "level-2-build", "corpus.txt")
        with open(corpus_path, encoding="utf-8") as fh:
            full = fh.read()
        few = BuildTokenizer().train(full, 100)
        many = BuildTokenizer().train(full, 1000)
        self.assertLess(len(many.encode(full)), len(few.encode(full)))

    def test_round_trip_unseen_text_with_bangla(self):
        tok = trained(60)
        for text in ("a completely new sentence about token budgets",
                     "ঢাকা শহরে আজ বৃষ্টি হচ্ছে, আমি ছাতা নিয়ে বের হলাম",
                     "for item in unseen_items:\n    print(item, 99)"):
            self.assertEqual(tok.decode(tok.encode(text)), text)

    def test_empty_and_special_only(self):
        tok = trained(10)
        self.assertEqual(tok.encode(""), [])
        self.assertEqual(tok.decode([]), "")
        self.assertEqual(tok.decode(tok.encode("<|bos|><|eos|>")),
                         "<|bos|><|eos|>")


if __name__ == "__main__":
    unittest.main()

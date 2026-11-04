"""Learn level tests for the byte-level BPE tokenizer.

Expected values are hand-computed on tiny inputs, noted per test.
Run: python -m unittest discover -s tests -p "test_learn*.py" -v
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))), "level-1-learn"))
from bpe import BPETokenizer, get_stats, merge_pair


class TestPairCounting(unittest.TestCase):
    def test_get_stats_hand_computed(self):
        # ids for "aab aab" as bytes: a a b space a a b
        ids = list("aab aab".encode("utf-8"))
        stats = get_stats(ids)
        # pairs: (a,a) twice, (a,b) twice, (b,space) once, (space,a) once
        self.assertEqual(stats[(97, 97)], 2)
        self.assertEqual(stats[(97, 98)], 2)
        self.assertEqual(stats[(98, 32)], 1)
        self.assertEqual(stats[(32, 97)], 1)
        self.assertEqual(len(stats), 4)

    def test_merge_pair_non_overlapping(self):
        # "aaaa" -> merging (a,a) gives two merged tokens, not three
        self.assertEqual(merge_pair([97, 97, 97, 97], (97, 97), 256), [256, 256])
        # odd tail stays: "aaa" -> [256, 97]
        self.assertEqual(merge_pair([97, 97, 97], (97, 97), 256), [256, 97])

    def test_first_merge_is_most_frequent(self):
        # In "aaabdaaabac" the pairs are: (a,a) four times, (a,b) twice,
        # and (b,d), (d,a), (b,a), (a,c) once each. The most frequent
        # pair is (a,a), so merge 1 must be (a,a) -> token 256.
        tok = BPETokenizer().train("aaabdaaabac", 1)
        self.assertEqual(tok.merges, {(97, 97): 256})
        self.assertEqual(tok.vocab[256], b"aa")


class TestRoundTrip(unittest.TestCase):
    def setUp(self):
        corpus = ("the tokenizer turns text into numbers. " * 4
                  + "ঢাকা বাংলাদেশের রাজধানী। " * 3
                  + "def f(x):\n    return x + 1\n" * 3)
        self.tok = BPETokenizer().train(corpus, 50)

    def test_round_trip_english(self):
        text = "token counts decide price and speed"
        self.assertEqual(self.tok.decode(self.tok.encode(text)), text)

    def test_round_trip_bangla(self):
        text = "আমি প্রতিদিন বাংলা পড়ি"
        self.assertEqual(self.tok.decode(self.tok.encode(text)), text)

    def test_round_trip_code_and_empty(self):
        text = "for step in range(10):\n    print(step)"
        self.assertEqual(self.tok.decode(self.tok.encode(text)), text)
        self.assertEqual(self.tok.encode(""), [])
        self.assertEqual(self.tok.decode([]), "")

    def test_unseen_text_still_round_trips(self):
        # Byte base vocabulary: text with characters never in the
        # training corpus still encodes and decodes exactly.
        text = "Zurich cafe: 42!"
        self.assertEqual(self.tok.decode(self.tok.encode(text)), text)


class TestTraining(unittest.TestCase):
    def test_vocab_size_grows_with_merges(self):
        tok = BPETokenizer().train("aaaa bbbb aaaa bbbb " * 5, 10)
        self.assertEqual(tok.vocab_size, 256 + len(tok.merges))
        self.assertLessEqual(len(tok.merges), 10)
        self.assertGreater(len(tok.merges), 0)

    def test_training_is_deterministic(self):
        text = "aab aab cab aab cab " * 4
        first = BPETokenizer().train(text, 20).merges
        second = BPETokenizer().train(text, 20).merges
        self.assertEqual(first, second)

    def test_repetition_compresses(self):
        # A highly repetitive string must take fewer tokens than bytes
        # after enough merges.
        text = "the cat sat. " * 20
        tok = BPETokenizer().train(text, 50)
        self.assertLess(len(tok.encode(text)), len(text.encode("utf-8")))

    def test_zero_merges_is_byte_tokenizer(self):
        tok = BPETokenizer().train("anything at all", 0)
        text = "বাংলা"  # 5 chars, 15 UTF-8 bytes (3 bytes per char here)
        ids = tok.encode(text)
        self.assertEqual(len(ids), len(text.encode("utf-8")))
        self.assertEqual(tok.decode(ids), text)


if __name__ == "__main__":
    unittest.main()

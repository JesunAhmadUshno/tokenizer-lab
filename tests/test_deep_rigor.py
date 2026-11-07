"""Tests for the Deep rigor additions (level-3-deep/rigor.py).

Run: python -m unittest discover -s tests -p "test_deep*.py" -v
"""
import os
import sys
import unittest

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "level-3-deep"))
sys.path.insert(0, os.path.join(REPO, "level-2-build"))
from rigor import bootstrap, factorial_cells, split_units, truncate  # noqa: E402
from study import NoPreTokenizer, load_heldout, load_training_text  # noqa: E402
from tokenizer import BuildTokenizer  # noqa: E402


class TestTruncate(unittest.TestCase):
    def test_prefix_of_long_run_equals_short_run(self):
        # The dense sweep trains once to 1,000 merges and truncates.
        # That is only valid if the first k merges of a long run are
        # exactly the merges of a k-merge run (greedy, deterministic).
        text, _ = load_training_text()
        long_a = BuildTokenizer().train(text, 120)
        self.assertEqual(truncate(long_a, 40).merges, BuildTokenizer().train(text, 40).merges)
        long_b = NoPreTokenizer().train(text, 60)
        short_b = truncate(long_b, 25)
        self.assertIsInstance(short_b, NoPreTokenizer)
        self.assertEqual(short_b.merges, NoPreTokenizer().train(text, 25).merges)

    def test_truncate_zero_is_byte_level(self):
        text, _ = load_training_text()
        tok = truncate(BuildTokenizer().train(text, 30), 0)
        self.assertEqual(len(tok.encode("hello")), 5)


class TestSplitUnits(unittest.TestCase):
    def test_units_keep_every_word(self):
        held = load_heldout()
        for name, text in held.items():
            units = split_units(name, text)
            self.assertGreater(len(units), 4, name)
            self.assertEqual(" ".join(units).split(), text.split(), name)

    def test_code_splits_on_lines(self):
        self.assertEqual(split_units("code", "a = 1\n\nb = 2\n"), ["a = 1", "b = 2"])


class TestBootstrap(unittest.TestCase):
    def test_constant_values_give_degenerate_interval(self):
        point, lo, hi = bootstrap([[2, 2, 2], [5, 5]], sum, reps=200, seed=1)
        self.assertEqual((point, lo, hi), (16, 16, 16))

    def test_deterministic_for_seed_and_brackets_point(self):
        strata = [[1, 4, 9, 2, 7], [3, 3, 8]]
        first = bootstrap(strata, sum, reps=500, seed=7)
        self.assertEqual(first, bootstrap(strata, sum, reps=500, seed=7))
        point, lo, hi = first
        self.assertEqual(point, 37)
        self.assertLessEqual(lo, point)
        self.assertGreaterEqual(hi, point)
        self.assertLess(lo, hi)


class TestFactorial(unittest.TestCase):
    def test_cells_reuse_merges_and_stay_lossless(self):
        text, _ = load_training_text()
        a = BuildTokenizer().train(text, 50)
        b = NoPreTokenizer().train(text, 50)
        cells = factorial_cells(a, b)
        self.assertEqual(set(cells), {"pretrain_preencode", "pretrain_seqencode",
                                      "seqtrain_preencode", "seqtrain_seqencode"})
        self.assertIs(cells["pretrain_preencode"], a)
        self.assertIs(cells["seqtrain_seqencode"], b)
        self.assertEqual(cells["pretrain_seqencode"].merges, a.merges)
        self.assertEqual(cells["seqtrain_preencode"].merges, b.merges)
        probe = "On a cold morning, Maya walked home. <|eos|> x = [1, 2]"
        for name, tok in cells.items():
            self.assertEqual(tok.decode(tok.encode(probe)), probe, name)


if __name__ == "__main__":
    unittest.main()

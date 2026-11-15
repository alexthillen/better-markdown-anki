import json
import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from generate_deck_fixtures import make_decks  # noqa: E402


class DemoDeckTest(unittest.TestCase):
    def test_fixture_matches_generated_examples(self):
        fixture = ROOT / "frontend/src/fixtures/deck-fixtures.json"
        self.assertEqual(json.loads(fixture.read_text(encoding="utf-8")), make_decks())

    def test_card_types_and_cloze_ordinals(self):
        decks = make_decks()
        self.assertEqual({note["type"] for deck in decks for note in deck["notes"]}, {"basic", "cloze"})
        for deck in decks:
            for note in deck["notes"]:
                self.assertTrue(note["cards"])
                for card in note["cards"]:
                    self.assertIn(card["deckId"], deck["decks"])
                    if note["type"] == "cloze":
                        numbers = {int(n) for n in re.findall(r"{{c(\d+)::", note["fields"]["Text"])}
                        self.assertIn(card["ordinal"] + 1, numbers)
                    else:
                        self.assertEqual(card["ordinal"], 0)

    def test_multiple_cloze_cards_are_represented(self):
        self.assertTrue(any(len(note["cards"]) > 1 for deck in make_decks() for note in deck["notes"]))


if __name__ == "__main__":
    unittest.main()

import json
import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).parents[1] / "scripts"))
from extract_deck_fixtures import extract_all  # noqa: E402


class ExternalDecksTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.decks = extract_all()

    def test_basic_and_cloze_decks_are_supported(self):
        self.assertEqual(len(self.decks), 2)
        self.assertEqual(
            {(deck["notes"][0]["type"], len(deck["notes"])) for deck in self.decks},
            {("basic", 10), ("cloze", 10)},
        )

    def test_every_note_has_at_least_one_card(self):
        for deck in self.decks:
            for note in deck["notes"]:
                self.assertTrue(note["cards"], f"note {note['id']} has no cards")

    def test_decks_do_not_reference_missing_media(self):
        for deck in self.decks:
            for note in deck["notes"]:
                for value in note["fields"].values():
                    self.assertNotIn('<img src="', value)

    def test_generated_browser_fixture_is_current(self):
        fixture = Path(__file__).parents[1] / "frontend" / "src" / "fixtures" / "deck-fixtures.json"
        self.assertEqual(json.loads(fixture.read_text(encoding="utf-8")), self.decks)


if __name__ == "__main__":
    unittest.main()

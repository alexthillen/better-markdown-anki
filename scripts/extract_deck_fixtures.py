#!/usr/bin/env python3
import json
import sqlite3
import tempfile
import zipfile
from pathlib import Path


ROOT = Path(__file__).parents[1]
DECK_DIR = ROOT / "_external_decks"
OUTPUT = ROOT / "frontend" / "src" / "fixtures" / "deck-fixtures.json"


def read_deck(path: Path) -> dict:
    with zipfile.ZipFile(path) as archive:
        database = archive.read("collection.anki2")

    with tempfile.NamedTemporaryFile() as temporary:
        temporary.write(database)
        temporary.flush()
        connection = sqlite3.connect(temporary.name)
        collection = connection.execute("SELECT models, decks FROM col").fetchone()
        models = json.loads(collection[0])
        decks = json.loads(collection[1])
        notes = connection.execute(
            "SELECT id, mid, flds, tags FROM notes ORDER BY id"
        ).fetchall()
        cards = connection.execute(
            "SELECT id, nid, did, ord FROM cards ORDER BY id"
        ).fetchall()

    cards_by_note = {}
    for card_id, note_id, deck_id, ordinal in cards:
        cards_by_note.setdefault(note_id, []).append(
            {"id": card_id, "deckId": str(deck_id), "ordinal": ordinal}
        )

    rendered_notes = []
    for note_id, model_id, raw_fields, tags in notes:
        model = models[str(model_id)]
        values = raw_fields.split("\x1f")
        rendered_notes.append(
            {
                "id": note_id,
                "model": model["name"],
                "type": "cloze" if model["type"] == 1 else "basic",
                "fields": {
                    field["name"]: values[field["ord"]]
                    for field in model["flds"]
                },
                "tags": tags.strip().split(),
                "cards": cards_by_note[note_id],
            }
        )

    named_decks = {str(deck_id): deck["name"] for deck_id, deck in decks.items()}
    return {
        "file": path.name,
        "decks": named_decks,
        "notes": rendered_notes,
    }


def extract_all() -> list[dict]:
    return [read_deck(path) for path in sorted(DECK_DIR.glob("*.apkg"))]


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(extract_all(), indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

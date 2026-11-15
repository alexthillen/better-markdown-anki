"""Generate fictional data for the browser preview; never reads an Anki collection."""
import json
from pathlib import Path

OUTPUT = Path(__file__).resolve().parents[1] / "frontend/src/fixtures/deck-fixtures.json"

BASIC_EXAMPLES = [
    ("What is the area of a circle?", "$A = \\pi r^2$", "Here $r$ is the radius."),
    ("How do you reverse a list in Python?", "```python\nitems[::-1]\n```", "The slice creates a new list."),
    ("Which HTTP status indicates a missing resource?", "**404 Not Found**", "The response can include a helpful explanation."),
    ("What does a stack's pop operation do?", "Removes and returns the top item.", "| Operation | Result |\n| --- | --- |\n| push | add to top |\n| pop | remove from top |"),
    ("What is the derivative of $x^2$?", "$2x$", "Apply the power rule."),
]
CLOZE_EXAMPLES = [
    ("A triangle has {{c1::three}} sides.", "A polygon with three vertices."),
    ("Water freezes at {{c1::0°C}} at standard pressure.", "Temperature depends on pressure."),
    ("The binary digits are {{c1::0}} and {{c2::1}}.", "Each digit is called a bit."),
    ("For $f(x)=x^2$, $f'(x)={{c1::2x}}$.", "The power rule gives the derivative."),
    ("Python uses {{c1::indentation::whitespace}} to delimit blocks.", "Use a consistent indentation style."),
]


def make_decks():
    basic = []
    for i, (front, back, extra) in enumerate(BASIC_EXAMPLES, 1):
        basic.append({"id": i, "model": "Better Markdown : Basic", "type": "basic",
                      "fields": {"Front": front, "Back": back, "Extra": extra, "Difficulty": ""},
                      "tags": ["example"], "cards": [{"id": i, "deckId": "1", "ordinal": 0}]})
    cloze = []
    for i, (text, extra) in enumerate(CLOZE_EXAMPLES, 1):
        ordinals = [0, 1] if "{{c2::" in text else [0]
        cloze.append({"id": i + 100, "model": "Better Markdown : Cloze", "type": "cloze",
                      "fields": {"Text": text, "Back Extra": extra, "Difficulty": ""},
                      "tags": ["example"], "cards": [{"id": 1000 + i * 10 + ordinal,
                          "deckId": "2", "ordinal": ordinal} for ordinal in ordinals]})
    return [{"file": "Basic examples", "decks": {"1": "Basic examples"}, "notes": basic},
            {"file": "Cloze examples", "decks": {"2": "Cloze examples"}, "notes": cloze}]


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(make_decks(), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

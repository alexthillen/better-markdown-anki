"""Public, general-purpose authoring guidance exposed through MCP."""
CARD_GUIDANCE = '''# Writing Better Markdown flashcards

## Choose a note type
- Basic: one focused, self-contained question on Front, its concise answer on Back,
  and optional explanation, examples, references, or exceptions in Extra.
- Cloze: put a meaningful deletion in Text, e.g. `TCP provides {{c1::reliable}} delivery.`
  Use `{{c1::answer::hint}}` for a useful hint and add optional context in Back Extra.
- Prefer one testable idea per card. Define the context needed to answer it; avoid
  prompts whose answer depends on the deck name or surrounding conversation.
- Keep the answer short enough to review comfortably. Put detail in Extra rather
  than making recall depend on a long paragraph. Split unrelated facts into cards.

## Markdown and media
- The MCP create/update tools accept plain Markdown strings, not pre-escaped HTML.
  Use `**bold**`, lists, tables, and fenced code blocks when they improve clarity.
- Put code inside triple-backtick fences with a language, e.g. ` ```python `.
  Enter literal `<`, `>`, and `&` in code; the MCP tools safely encode field text
  for Anki. Do not manually encode these characters as HTML entities.
- Use `$...$` for inline math and `$$...$$` for display math. Keep cloze syntax
  outside math delimiters: `{{c1::$x^2$::expression}}`, not `${{c1::x^2}}$`.
- Markdown images use `![description](filename.png)` and must already exist in the
  profile's collection.media folder. Experimental local HTML walkthroughs use
  `![description](_walkthrough.html)`; use trusted, self-contained files. Test
  playback and media sync on each target client before depending on a walkthrough.
- Choose an existing deck supplied by the user. Tags are optional and should be
  useful to that user; do not assume a deck structure, topic, or tag convention.
- Validate facts and source attribution when needed. Do not invent citations.

## Adding an interactive HTML walkthrough
1. Create a self-contained HTML document with its CSS and JavaScript inline.
   Use only trusted content; do not assume external assets or storage will work.
2. Call `store_html_walkthrough` with `filename` such as `_walkthrough.html` and
   the complete HTML source in `html`. The filename must begin with `_`. For
   example, use arguments:
   `{"filename":"_walkthrough.html","html":"<!doctype html><button onclick=this.remove()>Next</button>"}`
3. Copy the tool's returned `markdown` into the Back or Extra field passed to
   `create_note` or `update_note`. Use the returned filename: Anki may rename it.
4. Open the card in Anki and test the controls. The embedded frame uses a sandbox;
   client support, media sync, and deck export must be checked on target devices.
   References within HTML are not automatically packaged as separate media files.

## Validation
- Call `validate_note` with `note_type` and complete `fields` before creation.
  Fix errors; review warnings in context. Create and update also validate supplied
  fields automatically and return warnings. Validation is best-effort and does
  not prove that equations, code, clozes, or media render correctly in Anki.
- Preview the result in Anki, especially after using math, clozes or walkthroughs.

## Example
Front: `Why does a database use a write-ahead log?`
Back: `**It records changes before data pages are written, enabling recovery.**`
Extra: `After a crash, the database can replay committed changes from the log.`

Use list_decks to choose an existing deck, then create_note with note_type `basic`
or `cloze` and the matching fields. Use get_note before updating a note. Updates
replace only the explicitly supplied fields; review their current values first.
'''

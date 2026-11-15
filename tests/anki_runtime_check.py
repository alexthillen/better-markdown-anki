"""Optional integration check with Anki's own Python: uses a temporary collection.

Run with Anki's bundled Python, or a Python environment with the anki package.
"""
import importlib.util
import sys
import tempfile
import types
from pathlib import Path

from anki.collection import Collection

root = Path(__file__).resolve().parents[1] / 'better-markdown-anki'
package = types.ModuleType('bma_runtime_check')
package.__path__ = [str(root)]
sys.modules[package.__name__] = package
spec = importlib.util.spec_from_file_location('bma_runtime_check.mcp_server', root / 'mcp_server.py')
mcp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mcp)
fenced_spec = importlib.util.spec_from_file_location('bma_runtime_check.fenced_code', root / 'fenced_code.py')
fenced = importlib.util.module_from_spec(fenced_spec)
fenced_spec.loader.exec_module(fenced)


def make_model(col, name, fields, is_cloze=False):
    model = col.models.new(name)
    if is_cloze: model['type'] = 1
    for field in fields: col.models.add_field(model, col.models.new_field(field))
    template = col.models.new_template('Card 1')
    template['qfmt'] = '{{cloze:Text}}' if is_cloze else '{{Front}}'
    template['afmt'] = '{{cloze:Text}}' if is_cloze else '{{Back}}'
    col.models.add_template(model, template)
    col.models.add(model)


def main():
    with tempfile.TemporaryDirectory() as folder:
        col = Collection(str(Path(folder) / 'collection.anki2'))
        try:
            make_model(col, 'Better Markdown : Basic', ['Front', 'Back', 'Extra', 'Difficulty'])
            make_model(col, 'Better Markdown : Cloze', ['Text', 'Back Extra', 'Difficulty'], True)
            basic = mcp.call_tool('create_note', {'deck':'Default', 'note_type':'basic', 'fields':{
                'Front':'Why?', 'Back':'```cpp\nif (a < b && b > 0) {}\n```\n\n$x^2$'}}, col)
            saved = mcp.call_tool('get_note', {'note_id':basic['note_id']}, col)
            assert 'a &lt; b &amp;&amp; b &gt; 0' in saved['fields']['Back']
            assert basic['note_id'] in mcp.call_tool('find_notes', {'query':'Why'}, col)['note_ids']
            mcp.call_tool('update_note', {'note_id':basic['note_id'], 'fields':{'Extra':'Example'}}, col)
            assert mcp.call_tool('get_note', {'note_id':basic['note_id']}, col)['fields']['Extra'] == 'Example'
            cloze = mcp.call_tool('create_note', {'deck':'Default', 'note_type':'cloze', 'fields':{
                'Text':'A {{c1::value::hint}} and `x < y`.'}}, col)
            cards = col.get_note(cloze['note_id']).cards()
            assert len(cards) == 1
            assert '[hint]' in cards[0].question()
            assert 'value' in cards[0].answer()
            code_note = col.new_note(col.models.by_name('Better Markdown : Cloze'))
            code_note['Text'] = '```text\nBefore {{c1::a &lt; b::hint}} after\n```'
            col.add_note(code_note, col.decks.id('Default'))
            code_card = code_note.cards()[0]
            question = fenced.protect_review_html(code_card.question(), code_card, 'reviewQuestion')
            answer = fenced.protect_review_html(code_card.answer(), code_card, 'reviewAnswer')
            assert '<span class="cloze"' in question and '[hint]</span>' in question
            assert '<span class="cloze"' in answer and 'a &lt; b</span>' in answer
            media = mcp.call_tool('store_html_walkthrough', {'filename':'_walkthrough.html', 'html':'<button>Next</button>'}, col)
            assert media['filename'].startswith('_walkthrough')
            assert Path(col.media.dir(), media['filename']).is_file()
            print('Temporary Anki collection: Basic, Cloze, search, update, and HTML media passed.')
        finally:
            col.close()

if __name__ == '__main__': main()

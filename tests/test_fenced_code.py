import importlib.util
import json
import unittest
from pathlib import Path
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location('fenced_code', Path(__file__).parents[1] / 'better-markdown-anki' / 'fenced_code.py')
fenced = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fenced)

class FencedCodeTest(unittest.TestCase):
    def test_comparisons_and_entities_survive_before_html_parsing(self):
        text = 'before <img src="a.png">\n```text\na <val && b > 1\n```\nafter'
        self.assertEqual(fenced.protect_fenced_code(text), 'before <img src="a.png">\n```text\na &lt;val &amp;&amp; b &gt; 1\n```\nafter')

    def test_html_code_tags_remain_literal(self):
        text = '```html\n<div>Hello<br></div></span>\n```'
        self.assertEqual(fenced.protect_fenced_code(text), '```html\n&lt;div&gt;Hello&lt;br&gt;&lt;/div&gt;&lt;/span&gt;\n```')

    def test_existing_entities_and_anki_breaks_are_preserved(self):
        text = '```cpp<br>vector&lt;int&gt; &amp; x<br>```'
        self.assertEqual(fenced.protect_fenced_code(text), text)

    def test_cloze_spans_are_preserved(self):
        text = '```text\n<span class="cloze" data-ordinal="1">a < b</span>\n```'
        self.assertIn('<span class="cloze" data-ordinal="1">a &lt; b</span>', fenced.protect_fenced_code(text, preserve_rendered_clozes=True))

    def test_literal_cloze_html_is_escaped_in_editor_and_review(self):
        text = '```html\n<span class="cloze">literal</span>\n```'
        expected = '```html\n&lt;span class="cloze"&gt;literal&lt;/span&gt;\n```'
        self.assertEqual(fenced.protect_fenced_code(text), expected)
        self.assertEqual(fenced.protect_fenced_code(text, preserve_rendered_clozes=True), expected)
        source_with_attributes = '```html\n<span class="cloze" data-ordinal="1">literal</span>\n```'
        self.assertIn('&lt;span', fenced.protect_fenced_code(source_with_attributes))

    def test_generated_cloze_with_literal_nested_span(self):
        text = '```html\n<span class="cloze" data-cloze="value">[<span>hint</span>]</span>\n```'
        result = fenced.protect_fenced_code(text, preserve_rendered_clozes=True)
        self.assertIn('<span class="cloze" data-cloze="value">[&lt;span&gt;hint&lt;/span&gt;]</span>', result)

    def test_editor_payload_preserves_unrelated_script_and_fields(self):
        fields = [['Front', 'hi'], ['Back', '```\na <val\n```']]
        js = 'saveSession();setFields(' + json.dumps(fields) + ');setTags([]);'
        note = SimpleNamespace(note_type=lambda: {'name': 'Better Markdown : Basic'})
        result = fenced.protect_editor_fields(js, note, None)
        self.assertIn('a &lt;val', result)
        self.assertTrue(result.endswith(');setTags([]);'))
        self.assertEqual(fenced.protect_editor_fields(js, SimpleNamespace(note_type=lambda: {'name':'Basic'}), None), js)

if __name__ == '__main__': unittest.main()

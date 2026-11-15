import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('markdown_validation', Path(__file__).parents[1] / 'better-markdown-anki' / 'markdown_validation.py')
validation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validation)

class CardSyntaxTest(unittest.TestCase):
    def check(self, kind, fields, valid, message=None, severity=None):
        result = validation.validate_card(kind, fields)
        self.assertEqual(result['valid'], valid, result)
        if message:
            self.assertTrue(any(message in issue['message'] and (not severity or issue['severity'] == severity) for issue in result['issues']), result)
        return result

    def test_valid_basic_code_math_table_and_html_example(self):
        fields = {'Front':'Why?', 'Back':'**Answer**\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n```cpp\nif (a < b && b > 0) { return a; }\n// $ not math\n```\n\n$x^2$ and $$y = 1$$\n\n![Demo](_walkthrough.html)'}
        result = self.check('basic', fields, True)
        self.assertEqual(result['issues'], [])

    def test_unclosed_fences_are_blocking_and_tildes_supported(self):
        self.check('basic', {'Front':'Q','Back':'```python\nprint(1)'}, False, 'Unclosed fenced', 'error')
        self.check('basic', {'Front':'Q','Back':'~~~js\nx < 1\n~~~'}, True)
        self.check('basic', {'Front':'Q','Back':'````text\n```\n````'}, True)

    def test_cloze_nesting_hints_and_code_are_supported(self):
        for text in ('The {{c1::answer::hint}}.', '{{c1::outer {{c2::inner}} value}}', '```text\n{{c1::x < y}}\n```'):
            with self.subTest(text=text): self.check('cloze', {'Text':text}, True)

    def test_malformed_clozes_are_blocking(self):
        for text in ('No deletion', '{{c1::unfinished', '{{c0::value}}', '{{c1::}}', '{{c1::::hint}}'):
            with self.subTest(text=text): self.check('cloze', {'Text':text}, False)

    def test_math_warnings_do_not_block(self):
        self.check('basic', {'Front':'Q','Back':'$x + 1'}, True, 'Unpaired inline math', 'warning')
        self.check('basic', {'Front':'Q','Back':'$$x + 1'}, True, 'Unpaired display math', 'warning')
        self.check('cloze', {'Text':'${{c1::x}}$'}, True, 'outside math', 'warning')
        self.assertEqual(self.check('basic', {'Front':'Q','Back':'Price \\$5 and `$x`'}, True)['issues'], [])

    def test_missing_and_unknown_fields_are_blocking(self):
        self.check('basic', {'Front':'Q'}, False, 'Required field', 'error')
        self.check('basic', {'Front':'Q','Back':'A','Unexpected':'x'}, False, 'Unknown field', 'error')

if __name__ == '__main__': unittest.main()

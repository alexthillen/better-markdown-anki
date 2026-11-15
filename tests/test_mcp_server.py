import http.client
import importlib.util
import json
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import Mock

ROOT = Path(__file__).parents[1] / 'better-markdown-anki'
package = types.ModuleType('bma_mcp_test')
package.__path__ = [str(ROOT)]
sys.modules[package.__name__] = package
spec = importlib.util.spec_from_file_location('bma_mcp_test.mcp_server', ROOT / 'mcp_server.py')
mcp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mcp)


class Note:
    def __init__(self, model):
        self.model = model
        self.values = {field: '' for field in model['fields']}
        self.tags = []
        self.id = 42
    def note_type(self): return self.model
    def items(self): return self.values.items()
    def __setitem__(self, key, value): self.values[key] = value


class ToolsTest(unittest.TestCase):
    def setUp(self):
        self.model = {'name': 'Better Markdown : Basic', 'fields': ('Front', 'Back', 'Extra', 'Difficulty')}
        self.col = Mock()
        self.col.models.by_name.return_value = self.model
        self.col.decks.by_name.return_value = {'id': 123}
        self.note = Note(self.model)
        self.col.new_note.return_value = self.note
        self.col.get_note.return_value = self.note

    def test_create_safely_encodes_fenced_code_and_does_not_change_tag(self):
        result = mcp.call_tool('create_note', {'deck': 'Learning', 'note_type': 'basic',
            'fields': {'Front': 'What?', 'Back': '```text\na <val && b > 1\n```'}, 'tags': ['example']}, self.col)
        self.assertEqual(result['note_id'], 42)
        self.assertIn('a &lt;val &amp;&amp; b &gt; 1', self.note.values['Back'])
        self.assertEqual(self.note.tags, ['example'])
        self.col.add_note.assert_called_once_with(self.note, 123)

    def test_update_modifies_only_supplied_fields(self):
        self.note.values['Front'] = 'Existing question'
        mcp.call_tool('update_note', {'note_id': 42, 'fields': {'Back': 'x < y'}}, self.col)
        self.assertEqual(self.note.values['Front'], 'Existing question')
        self.assertEqual(self.note.values['Back'], 'x &lt; y')
        self.col.update_note.assert_called_once_with(self.note)

    def test_reject_bad_fields_and_non_bma_notes(self):
        with self.assertRaises(ValueError):
            mcp.call_tool('create_note', {'deck': 'Learning', 'note_type': 'basic', 'fields': {'Front': 'Q', 'Back': 'A', 'Other': 'x'}}, self.col)
        self.model['name'] = 'Other'
        with self.assertRaises(ValueError): mcp.call_tool('get_note', {'note_id': 42}, self.col)

    def test_syntax_errors_do_not_write(self):
        invalid = {'deck': 'Learning', 'note_type': 'basic', 'fields': {'Front': 'Q', 'Back': '```python\nprint(1)'}}
        with self.assertRaisesRegex(ValueError, 'Unclosed fenced'):
            mcp.call_tool('create_note', invalid, self.col)
        self.col.add_note.assert_not_called()
        with self.assertRaisesRegex(ValueError, 'Required field'):
            mcp.call_tool('update_note', {'note_id': 42, 'fields': {'Front': ''}}, self.col)
        self.col.update_note.assert_not_called()

    def test_validation_tool_reports_warnings_and_errors(self):
        result = mcp.call_tool('validate_note', {'note_type': 'cloze', 'fields': {'Text': '${{c1::x}}$'}}, None)
        self.assertTrue(result['valid'])
        self.assertTrue(any(issue['severity'] == 'warning' for issue in result['issues']))
        invalid = mcp.call_tool('validate_note', {'note_type': 'cloze', 'fields': {'Text': '{{c1::oops'}}, None)
        self.assertFalse(invalid['valid'])

    def test_store_walkthrough_rejects_paths(self):
        with self.assertRaises(ValueError):
            mcp.call_tool('store_html_walkthrough', {'filename': '../unsafe.html', 'html': '<p>x</p>'}, self.col)
        self.col.media.write_data.return_value = '_example.html'
        result = mcp.call_tool('store_html_walkthrough', {'filename': '_example.html', 'html': '<button>Next</button>'}, self.col)
        self.assertIn('_example.html', result['markdown'])

    def test_public_guide_leaves_deck_choices_to_users(self):
        guide = mcp.call_tool('card_authoring_guide', {}, None)
        self.assertIn('do not assume a deck structure', guide.lower())
        for phrase in ('Cloze', 'Markdown', 'Front', 'Back', 'Extra'):
            self.assertIn(phrase, guide)


class ProtocolTest(unittest.TestCase):
    def setUp(self):
        self.mw = Mock()
        self.mw.taskman.run_on_main.side_effect = lambda callback: callback()
        self.server = mcp.MCPServer(self.mw, 0)
        self.server.start()
        self.port = self.server.port
    def tearDown(self): self.server.stop()
    def request(self, payload, headers=None, method='POST'):
        conn = http.client.HTTPConnection('127.0.0.1', self.port, timeout=2)
        head = {'Content-Type': 'application/json'}
        head.update(headers or {})
        conn.request(method, '/mcp', body=json.dumps(payload), headers=head)
        response = conn.getresponse(); data = response.read(); status = response.status
        conn.close()
        return status, json.loads(data) if data else None
    def test_initialize_list_call_and_notification(self):
        status, body = self.request({'jsonrpc':'2.0','id':1,'method':'initialize','params':{'protocolVersion':mcp.PROTOCOL}})
        self.assertEqual(status, 200); self.assertEqual(body['result']['protocolVersion'], mcp.PROTOCOL)
        status, body = self.request({'jsonrpc':'2.0','id':2,'method':'tools/list'}, {'MCP-Protocol-Version':mcp.PROTOCOL})
        self.assertIn('create_note', [t['name'] for t in body['result']['tools']])
        status, body = self.request({'jsonrpc':'2.0','id':3,'method':'tools/call','params':{'name':'card_authoring_guide','arguments':{}}})
        self.assertFalse(body['result']['isError']); self.assertIn('Cloze',body['result']['content'][0]['text'])
        status, body = self.request({'jsonrpc':'2.0','method':'notifications/initialized'})
        self.assertEqual((status, body), (202, None))
    def test_host_origin_and_protocol_are_enforced(self):
        request = {'jsonrpc':'2.0','id':1,'method':'tools/list'}
        for headers, expected in [({'Host':'evil.test'},421),
                                  ({'Origin':'https://evil.test'},403), ({'MCP-Protocol-Version':'invalid'},400)]:
            self.assertEqual(self.request(request, headers)[0], expected)
    def test_unknown_tool_returns_error_not_success(self):
        _, body = self.request({'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':'not_real','arguments':{}}})
        self.assertTrue(body['result']['isError'])

if __name__ == '__main__': unittest.main()

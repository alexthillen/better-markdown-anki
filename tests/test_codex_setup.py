import importlib.util
import os
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('codex_setup', Path(__file__).parents[1] / 'better-markdown-anki' / 'codex_setup.py')
setup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(setup)

class CodexSetupTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / '.codex' / 'config.toml'
    def tearDown(self): self.tmp.cleanup()
    def test_creates_private_config_and_updates_without_duplicates(self):
        setup.configure_codex(self.path, 19176)
        data = self.path.read_text()
        self.assertIn('[mcp_servers.better-markdown-anki]', data)
        self.assertNotIn('Authorization', data)
        self.assertEqual(os.stat(self.path).st_mode & 0o777, 0o600)
        setup.configure_codex(self.path, 19177)
        updated = self.path.read_text()
        self.assertEqual(updated.count('[mcp_servers.better-markdown-anki]'), 1)
        self.assertIn('127.0.0.1:19177/mcp', updated)
    def test_preserves_unrelated_settings_and_replaces_old_token_env(self):
        self.path.parent.mkdir(parents=True)
        self.path.write_text('model = "example"\n\n[mcp_servers.better-markdown-anki]\nurl = "http://127.0.0.1:19176/mcp"\nbearer_token_env_var = "BMA_MCP_TOKEN"\ntool_timeout_sec = 25\n\n[mcp_servers.other]\nurl = "https://example.org/mcp"\n')
        setup.configure_codex(self.path, 19176)
        data = self.path.read_text()
        self.assertIn('model = "example"', data)
        self.assertIn('tool_timeout_sec = 25', data)
        self.assertIn('[mcp_servers.other]', data)
        self.assertNotIn('bearer_token_env_var', data)
    def test_refuses_custom_headers_without_changes(self):
        self.path.parent.mkdir(parents=True)
        original='[mcp_servers.better-markdown-anki]\nhttp_headers = { "X-Custom" = "keep" }\n'
        self.path.write_text(original)
        with self.assertRaises(ValueError): setup.configure_codex(self.path, 19176)
        self.assertEqual(self.path.read_text(), original)
    def test_refuses_nested_table_and_invalid_port(self):
        self.path.parent.mkdir(parents=True)
        original='[mcp_servers.better-markdown-anki.http_headers]\nX-Custom = "keep"\n'
        self.path.write_text(original)
        with self.assertRaises(ValueError): setup.configure_codex(self.path, 19176)
        with self.assertRaises(ValueError): setup.configure_codex(self.path, 42)
        self.assertEqual(self.path.read_text(), original)

if __name__ == '__main__': unittest.main()

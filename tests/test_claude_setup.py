import importlib.util
import subprocess
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

spec = importlib.util.spec_from_file_location('claude_setup', Path(__file__).parents[1] / 'better-markdown-anki' / 'claude_setup.py')
setup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(setup)


class ClaudeSetupTest(unittest.TestCase):
    @patch.object(setup.subprocess, 'run')
    @patch.object(setup.shutil, 'which', return_value='/example/claude')
    def test_adds_http_server_at_user_scope(self, which, run):
        run.return_value = Mock(returncode=0)
        setup.configure_claude(19176)
        self.assertEqual(run.call_args.args[0], ['/example/claude', 'mcp', 'add', '--transport', 'http', '--scope', 'user', 'better-markdown-anki', 'http://127.0.0.1:19176/mcp'])
        self.assertNotIn('shell', run.call_args.kwargs)

    @patch.object(setup.subprocess, 'run')
    @patch.object(setup.shutil, 'which', return_value='/example/claude')
    def test_existing_or_failed_entry_is_not_replaced(self, which, run):
        run.return_value = Mock(returncode=1)
        with self.assertRaisesRegex(ValueError, 'may already exist'):
            setup.configure_claude(19176)
        run.assert_called_once()

    @patch.object(setup.subprocess, 'run', side_effect=subprocess.TimeoutExpired('claude', 20))
    @patch.object(setup.shutil, 'which', return_value='/example/claude')
    def test_timeout_is_reported(self, which, run):
        with self.assertRaisesRegex(ValueError, 'could not complete'):
            setup.configure_claude(19176)


if __name__ == '__main__': unittest.main()

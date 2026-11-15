"""Add the local MCP server using Claude Code's supported CLI."""
import os
from pathlib import Path
import shutil
import subprocess


def configure_claude(port):
    if isinstance(port, bool) or not isinstance(port, int) or not 1024 <= port <= 65535:
        raise ValueError('Invalid MCP port')
    executable = shutil.which('claude')
    if not executable:
        for candidate in (Path.home() / '.local' / 'bin' / 'claude',
                          Path('/opt/homebrew/bin/claude'), Path('/usr/local/bin/claude')):
            if candidate.is_file() and os.access(candidate, os.X_OK):
                executable = str(candidate)
                break
    if not executable:
        raise ValueError('Claude Code was not found. Install it or use the setup guide.')
    try:
        result = subprocess.run(
            [executable, 'mcp', 'add', '--transport', 'http', '--scope', 'user',
             'better-markdown-anki', 'http://127.0.0.1:%d/mcp' % port],
            capture_output=True, text=True, timeout=20, check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise ValueError('Claude Code could not complete setup. See the setup guide.') from exc
    if result.returncode:
        raise ValueError('Claude Code could not add the connection. It may already exist; '
                         'run `claude mcp get better-markdown-anki` to check.')

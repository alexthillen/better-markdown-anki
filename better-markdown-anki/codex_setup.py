"""Configure Codex's local MCP connection."""
import os
from pathlib import Path
import re
import tempfile

SERVER_NAME = 'better-markdown-anki'
SECTION = '[mcp_servers.%s]' % SERVER_NAME


def configure_codex(path, port):
    """Write the connection, preserving unrelated configuration.

    Refuse ambiguous or complex pre-existing MCP entries instead of risking
    damage to a user's configuration. Return no token or full configuration.
    """
    if isinstance(port, bool) or not isinstance(port, int) or not 1024 <= port <= 65535:
        raise ValueError('The Anki MCP port is invalid')
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_symlink():
        raise ValueError('Codex config is a symlink; configure it manually to avoid replacing the link')
    original = path.read_text(encoding='utf-8') if path.exists() else ''
    # Support the standard bare key and reject alternate/nested TOML tables
    # for this server; those may contain custom headers we must not overwrite.
    pattern = r'(?ms)^\[mcp_servers\.better-markdown-anki\][ \t]*(?:\#[^\n]*)?\n.*?(?=^\[|\Z)'
    matches = list(re.finditer(pattern, original))
    if len(matches) > 1:
        raise ValueError('Multiple Codex entries for this server; configure it manually')
    unusual = list(re.finditer(r'(?m)^\[.*mcp_servers.*better[-_]markdown[-_]anki.*\]', original))
    if any(not matches or item.start() != matches[0].start() for item in unusual):
        raise ValueError('Existing Codex settings use a custom table; configure them manually')
    if matches:
        match = matches[0]
        section = match.group()
        # We own only url and the bearer header. Do not erase custom HTTP
        # headers or multi-line configuration that would be hard to preserve.
        lines = section.splitlines()
        retained = [lines[0]]
        for line in lines[1:]:
            if re.match(r'^\s*(url|bearer_token_env_var)\s*=', line):
                continue
            if re.match(r'^\s*http_headers\s*=', line):
                if not re.fullmatch(r'\s*http_headers\s*=\s*\{\s*(?:Authorization|"Authorization")\s*=\s*"Bearer [A-Za-z0-9_-]+"\s*\}\s*(?:#.*)?', line):
                    raise ValueError('Existing Codex HTTP headers need manual configuration')
                continue
            if re.match(r'^\s*(env_http_headers|http_headers_helper|auth)\s*=', line):
                raise ValueError('Existing Codex authentication settings need manual configuration')
            retained.append(line)
        before, after = original[:match.start()], original[match.end():]
    else:
        before, after = original, ''
        if before and not before.endswith('\n'): before += '\n'
        if before and not before.endswith('\n\n'): before += '\n'
        retained = [SECTION]
    retained = '\n'.join(retained).rstrip()
    new_section = retained + '\nurl = "http://127.0.0.1:%d/mcp"\n\n' % port
    updated = before + new_section + after
    try:
        import tomllib
    except ImportError:
        tomllib = None
    if tomllib is not None:
        try: tomllib.loads(updated)
        except ValueError as exc: raise ValueError('Codex configuration could not be safely updated') from exc
    fd, temp_name = tempfile.mkstemp(prefix='.bma-config-', dir=str(path.parent))
    try:
        if hasattr(os, 'fchmod'):
            os.fchmod(fd, 0o600)
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(updated)
            f.flush()
            os.fsync(f.fileno())
        os.replace(temp_name, path)
    except BaseException:
        try: os.unlink(temp_name)
        except OSError: pass
        raise

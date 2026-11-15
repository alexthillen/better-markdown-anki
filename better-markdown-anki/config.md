# Better Markdown MCP settings

The MCP server is off by default. Open an Anki profile and select **Tools →
Connect Better Markdown to Codex** or **Tools → Enable Better Markdown MCP**.
The server listens only on `127.0.0.1` at `mcp_port`. Local programs can read
and change the open collection while the server is enabled. To turn it off,
set `mcp_enabled` to `false` and restart Anki. Port changes require a restart.

# Better Markdown MCP settings

The MCP server starts by default when an Anki profile opens. The server listens
only on `127.0.0.1` at `mcp_port`. Local programs can read and change the open
collection while the server is enabled. To turn it off, set `mcp_enabled` to
`false` and restart Anki. Port changes require a restart. Choose **Tools →
Better Anki Markdown: Connect Codex** to configure Codex automatically.

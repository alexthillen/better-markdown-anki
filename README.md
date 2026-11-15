# Better Markdown for Anki

Write Anki cards in Markdown, with math, code, clozes, and interactive HTML. Connect an AI agent through the built-in local MCP server to create and edit cards in your own collection.

[Explore the website](https://alexthillen.github.io/better-markdown-anki/) · [Run it locally](website/README.md) · [AnkiWeb add-on](https://ankiweb.net/shared/info/2100166052) · [Releases](https://github.com/alexthillen/better-markdown-anki/releases)

## What it does

- Render Markdown, LaTeX math, tables, and syntax-highlighted code in Anki.
- Create Basic and Cloze notes, with an editor preview, tags, and difficulty.
- Embed a self-contained HTML walkthrough in a card and expand it while reviewing.
- Copy the available card fields and embedded walkthrough source for a chat.
- Connect an MCP-compatible agent to search, validate, create, and update cards, or add an HTML walkthrough.

The MCP server runs inside Anki Desktop. No separate MCP server, API key, or cloud account is needed. It starts by default when Anki opens a profile.

## Install

In Anki Desktop, choose **Tools → Add-ons → Get Add-ons**, enter `2100166052`, and restart Anki. You can also install a `.ankiaddon` file with **Tools → Add-ons → Install from file**. The latest AnkiWeb release may not yet contain the features on this branch.

The add-on creates **Better Markdown : Basic** and **Better Markdown : Cloze** note types. Select one when adding a note:

| Note type | Fields |
| --- | --- |
| Basic | Front, Back, Extra, Difficulty |
| Cloze | Text, Back Extra, Difficulty |

For a small interactive tour and examples, [run the guide locally](website/README.md).

## Connect an agent

### Codex

With your Anki profile open, select **Tools → Better Anki Markdown: Connect Codex**. Restart Codex and open a new chat. Anki enables the server and adds the connection to your Codex configuration.

To configure Codex from a terminal instead, open an Anki profile and run:

```sh
codex mcp add better-markdown-anki --url http://127.0.0.1:19176/mcp
```

### Claude Code

With your Anki profile open, select **Tools → Better Anki Markdown: Connect Claude** and start a new Claude Code session. Claude Code must be installed. Alternatively, run:

```sh
claude mcp add --transport http --scope user better-markdown-anki http://127.0.0.1:19176/mcp
```

This configures Claude Code; the Claude Desktop chat app uses separate settings. See the [Claude Code MCP guide](https://code.claude.com/docs/en/mcp).

### Other MCP clients

Open an Anki profile, then add a Streamable HTTP server at `http://127.0.0.1:19176/mcp` (or the port in the add-on configuration).

For GitHub Copilot CLI:

```sh
copilot mcp add --transport http better-markdown-anki http://127.0.0.1:19176/mcp
```

For Google Antigravity, open the agent panel menu → **MCP Servers → Manage MCP Servers → View raw config** and merge this into `mcp_config.json`:

```json
{
  "mcpServers": {
    "better-markdown-anki": {
      "serverUrl": "http://127.0.0.1:19176/mcp"
    }
  }
}
```

Other MCP clients can use the same URL. The client and Anki must run on the same machine: `127.0.0.1` on a remote machine refers to that machine. See the [Copilot setup guide](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers) and [Antigravity MCP guide](https://antigravity.google/docs/mcp).

The server binds to localhost and requires no token. **While it is enabled, local programs can read and change your open Anki collection.** It does not start a sync; changes follow your usual Anki sync. To disable it, set `mcp_enabled` to `false` in the add-on's Config and restart Anki. Do not expose the port to the public internet.

### Writing cards with an agent

Ask your agent to call `card_authoring_guide` for the supported fields, formatting, and HTML walkthrough instructions. It can call `validate_note` before saving; validation catches common issues but does not replace previewing the card in Anki.

For example, ask: “Create a Basic card in my chosen deck explaining why a database uses a write-ahead log. Include a short example in Extra.” The agent can list available decks, then use `create_note` with Markdown fields. `get_note` returns Anki's stored HTML; `update_note` accepts Markdown and changes only the supplied fields.

## Interactive HTML walkthroughs

Place a trusted, self-contained `.html` file in the profile's `collection.media` folder and reference its filename using image syntax:

```markdown
![Interactive walkthrough](_walkthrough.html)
```

The card renders the file in a sandboxed frame. An agent can also use `store_html_walkthrough`, which stores the file and returns Markdown to embed it. This feature is experimental: test playback, media sync, and exports on your devices. The sandbox restricts links, forms, storage, and separately loaded resources. See [Anki's media documentation](https://docs.ankiweb.net/media.html).

## Development

```sh
cd frontend
npm ci
npm run fixtures
npm run dev
# Open http://localhost:5173/deck-preview.html

npm test
npm run lint
npm run build
cd ..
python3 -m unittest discover -s tests -v
```

The fixture generator uses invented examples and does not read an Anki collection. `npm run build` produces both the desktop and mobile renderer assets. To view the guide locally, run `python3 website/server.py` from the repository root.

The add-on preserves existing card templates when a profile opens. It updates only recognized older loader blocks for mobile compatibility and adds missing note-type fields when needed. On desktop, fenced-code protection runs when loading the editor and displaying a card; it cannot recover text already saved in a corrupted form.

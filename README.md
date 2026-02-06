# Markshift

Convert between markdown formats in the browser. No data leaves your machine.

**Live at [markshift.net](https://markshift.net)**

## Supported Formats (16)

- GitHub Flavored Markdown (GFM)
- Linear
- Slack mrkdwn
- Obsidian
- Notion
- Google Docs (HTML paste)
- Discord
- Reddit
- GitBook
- Joplin
- Mattermost
- Trello
- Claude
- ChatGPT
- Gemini
- Grok

## How It Works

Paste content in any format, and Markshift auto-detects the source. Click a target format button to convert and copy to clipboard.

All conversion happens client-side using [mdast](https://github.com/syntax-tree/mdast) as an intermediate representation. Each format has a parser (text -> AST) and a serializer (AST -> text), so adding N formats requires N modules instead of N^2 converters.

## Development

```bash
bun install
bun run dev        # Start dev server
bun run test:run   # Run tests (653 tests)
bun run check      # Type check
bun run build      # Production build
bun run deploy     # Build + deploy to Cloudflare
```

## Tech Stack

- Svelte 5 + Vite + TypeScript
- Tailwind CSS v4
- unified/remark ecosystem
- Deployed on Cloudflare Workers

## License

[MIT](LICENSE)

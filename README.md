# ADO Companion

Chrome/Edge browser extension that surfaces Azure DevOps pull requests and pipeline progress at a glance.

## Features

- **Running Pipelines** — task-level progress for your active builds with job breakdown
- **Pull Requests** — track your open PRs across configured projects
- **Bookmark Management** — optionally sync PRs to a browser bookmark folder
- **Hybrid Polling** — faster refresh when builds are active, slower when idle
- **PAT Authentication** — works with 7-day personal access tokens

## Stack

React · TypeScript · Tailwind CSS · Vite · Manifest V3 · Vitest

## Getting Started

```bash
pnpm install
pnpm dev:harness   # Dev harness at localhost:5174
pnpm build          # Production build → dist/
pnpm test           # Run tests
```

### Load in Chrome/Edge

1. Run `pnpm build`
2. Go to `chrome://extensions` (or `edge://extensions`)
3. Enable **Developer mode**
4. Click **Load unpacked** → select the `dist/` folder
5. Click the extension icon → **Options** to configure your org + PAT

## Development

| Command | Description |
|---------|-------------|
| `pnpm dev:harness` | Dev harness with mock data and HMR |
| `pnpm dev` | Build extension in watch mode |
| `pnpm build` | Production build |
| `pnpm test` | Run Vitest tests |
| `pnpm test:watch` | Vitest in watch mode |

The **dev harness** (`pnpm dev:harness`) renders the popup and options page outside the extension context with mock Chrome APIs and scenario switching (connected, disconnected, PAT expired, etc.).

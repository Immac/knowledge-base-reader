# Knowledge Base Reader

A standalone Node.js web app for browsing the pi knowledge base as a wiki-style reader. It renders markdown articles, supports tag-based filtering and ranking, shows section outlines, and exposes a tag DAG graph for exploration.

![JavaScript](https://img.shields.io/badge/JavaScript-ESM-yellow?style=flat-square&logo=javascript)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js)
![MIT License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Web App](https://img.shields.io/badge/app-standalone-blue?style=flat-square)

## Features

- 🔍 Browse markdown articles from a local or pi knowledge base directory
- 🏷️ Filter by title, slug, excerpt, or exact `key:value` tags
- 📚 Read articles with a sidebar section outline and multiple layouts/themes
- ✨ See ranked related articles with compact match indicators and explanations
- 🕸️ Explore the tag DAG on a dedicated graph page with pan/zoom controls
- 🎨 Switch between distinct light and dark themes
- 🧭 Start on a landing page that highlights the latest updates

## API and UI

| Route / UI | Description |
| --- | --- |
| `/` | Landing page with latest updates and article cards |
| `#/article/:slug` | Article reader view |
| `#/graph` | Tag DAG graph page |
| `GET /api/status` | Data source and article count |
| `GET /api/articles` | List all articles |
| `GET /api/articles/:slug` | Return a rendered article payload |
| `GET /api/tags/graph` | Return the tag DAG graph |

## Quick Start

```bash
git clone git@github.com:Immac/knowledge-base-reader.git
cd knowledge-base-reader
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:4173/
```

## Usage Examples

### Open a specific article

```text
http://127.0.0.1:4173/#/article/knowledge-base-repository-overview
```

### Filter by tag

Type a tag query into the sidebar filter:

```text
language:javascript
```

### Point the reader at another knowledge base directory

```bash
KB_WIKI_DATA_DIR=/path/to/articles npm run dev
```

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install
```

### Run locally

```bash
npm run dev
```

### Test

```bash
npm test
```

### Notes

- This project is plain JavaScript ESM; there is no build step.
- Core runtime dependencies are `gray-matter` for frontmatter parsing and `marked` for Markdown rendering.
- The app is intentionally lightweight so it can be inspected easily by humans and LLMs.

## Resources

- [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- [`RELATIONSHIP_RANKING_PLAN.md`](./RELATIONSHIP_RANKING_PLAN.md)
- [`src/server.mjs`](./src/server.mjs)
- [`src/data-source.mjs`](./src/data-source.mjs)
- [`src/tag-model.mjs`](./src/tag-model.mjs)
- [`src/tag-network.mjs`](./src/tag-network.mjs)
- [`src/relevance.mjs`](./src/relevance.mjs)
- [`tests/smoke.mjs`](./tests/smoke.mjs)

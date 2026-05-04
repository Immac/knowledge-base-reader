# Knowledge Base Reader

A companion web app for browsing the pi knowledge base. It discovers markdown articles, renders them as a searchable wiki, and ranks related articles by tag overlap.

![JavaScript](https://img.shields.io/badge/JavaScript-ESM-yellow?style=flat-square&logo=javascript)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js)
![MIT License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Pi Companion](https://img.shields.io/badge/pi-companion-orange?style=flat-square)

## Features

- 🔍 Browse articles from local or pi knowledge base sources
- 🏷️ Filter by title, slug, or `key:value` tags
- 📚 View article sections in a sidebar outline
- ✨ See ranked related articles with compact match indicators
- 🎨 Switch between multiple styles and layouts
- 🧭 Use a landing page that highlights latest changes

## Tools & Commands

| Command / Route | Description |
| --- | --- |
| `npm run dev` | Start the web app on `http://127.0.0.1:4173/` |
| `npm start` | Start the server in production mode |
| `npm test` | Run smoke tests |
| `GET /api/status` | Return the active data source and article count |
| `GET /api/articles` | List all discovered articles |
| `GET /api/articles/:slug` | Return a single article, rendered HTML, headings, and related items |

## Quick Start

```bash
git clone git@github.com:Immac/knowledge-base-reader.git
cd knowledge-base-reader
npm install
npm run dev
```

Then open:

```text
http://127.0.0.1:4173/
```

## Usage Examples

### Open an article

```text
http://127.0.0.1:4173/#/article/knowledge-base-repository-overview
```

### Filter by tag

Type a tag query in the sidebar filter:

```text
language:javascript
```

### Point at a different knowledge base directory

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

### Run

```bash
npm run dev
```

### Test

```bash
npm test
```

### Notes

- The app is plain JavaScript ESM; there is no build step.
- Dependencies are `gray-matter` for frontmatter parsing and `marked` for Markdown rendering.

## Resources

- [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- [`RELATIONSHIP_RANKING_PLAN.md`](./RELATIONSHIP_RANKING_PLAN.md)
- [`src/server.mjs`](./src/server.mjs)
- [`src/data-source.mjs`](./src/data-source.mjs)
- [`tests/smoke.mjs`](./tests/smoke.mjs)
- Repository: `git@github.com:Immac/knowledge-base-reader.git`

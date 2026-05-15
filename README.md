# Knowledge Base Reader

A standalone Node.js web app for browsing the pi knowledge base as a wiki-style reader. Renders markdown articles, supports tag-based filtering, shows section outlines, ranks related articles by semantic tag overlap, and exposes a tag DAG graph for exploration.

![JavaScript](https://img.shields.io/badge/JavaScript-ESM-yellow?style=flat-square&logo=javascript)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js)
![MIT License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Pi Extension](https://img.shields.io/badge/pi--extension-orange?style=flat-square)

## Features

- 🔍 Browse markdown articles from a local or pi knowledge base directory
- 🏷️ Filter by title, slug, excerpt, or exact `key:value` tags
- 📚 Read articles with a sidebar section outline and five distinct layouts (dashboard, focus, cards, magazine, notebook)
- ✨ See ranked related articles with compact match indicators and tag-based explanations
- 🕸️ Explore the tag DAG on a dedicated graph page with pan, zoom, reset, and fit controls
- 🎨 Switch between six themes: Dark, Calm, Violet, Forest, Warm, Mint
- 🆕 Landing page highlights newest and recently edited articles with badges

## API

| Route | Description |
| --- | --- |
| `GET /api/status` | Data source path and article count |
| `GET /api/articles` | List all articles (slug, title, tags, excerpt) |
| `GET /api/articles/:slug` | Full article payload (HTML, headings, semantic tags, related articles) |
| `GET /api/tags/graph` | Tag DAG graph with layered layout and edge paths |

## Quick Start

```bash
git clone git@github.com:Immac/knowledge-base-reader.git
cd knowledge-base-reader
npm install
npm run dev
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173)

### Point at another knowledge base

```bash
KB_WIKI_DATA_DIR=/path/to/articles npm run dev
```

The reader auto-discovers articles in this order:
1. `$KB_WIKI_DATA_DIR` environment variable
2. `./knowledge-base` (relative)
3. `~/.pi/knowledge-base/`
4. `./knowledge-base/articles/` (bundled fallback)

## Usage

### Open a specific article

```
http://127.0.0.1:4173/#/article/knowledge-base-repository-overview
```

### Filter by tag

Type into the sidebar filter input:

```
language:python
```

### Browse the tag graph

Click the graph icon in the header or navigate to `#/graph`.

## Data Source Layout

The reader supports two article directory layouts:

**Folder-based** (preferred):
```
<KB_WIKI_DATA_DIR>/articles/<slug>/ARTICLE.md
```

**Flat files** (legacy):
```
<KB_WIKI_DATA_DIR>/<slug>.md
<KB_WIKI_DATA_DIR>/articles/<slug>.md
```

### Block references

Articles can embed reusable blocks from other articles using `!block:` syntax:

```markdown
See the overview in !block:architecture/high-level-design
```

- `!block:name` — resolves to `articles/{current-slug}/{name}.md`
- `!block:other-article/name` — resolves to `articles/{other-article}/{name}.md`

## Tag Model

Tags are `key:value` pairs. The reader distinguishes three categories:

| Category | Source | Used For |
| --- | --- | --- |
| **Display tags** | Article frontmatter `tags` field | Filtering and display on cards |
| **Semantic tags** | Display tags + relationship-derived tags | Relevance scoring and graph |
| **Relationships** | Article frontmatter `relationships` field | DAG edges and derived semantic tags |

## Relevance Ranking

Related articles are scored using exact semantic-tag overlap with IDF-style rarity weighting:

- **Precision**: weighted shared tags / candidate tag weight
- **Recall**: weighted shared tags / source article tag weight
- **F1 score**: combined into a `relevancePercent` (0–100)
- Rare tags carry more weight than common ones
- The heuristic uses **tags only** — no title or body text similarity

Enable debug logging: `KB_RELEVANCE_DEBUG=1 npm run dev`

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup & run

```bash
npm install
npm run dev       # start server on port 4173
npm test          # run smoke tests
```

### Project structure

```
├── public/
│   ├── index.html       # SPA shell
│   ├── app.js           # Client-side router, renderer, graph interaction
│   └── styles.css       # All themes, layouts, responsive design
├── src/
│   ├── server.mjs       # HTTP server and API routes
│   ├── data-source.mjs  # Article discovery, parsing, block resolution
│   ├── tag-model.mjs    # Tag normalization, semantic tag derivation
│   ├── tag-network.mjs  # DAG construction and layered layout
│   └── relevance.mjs    # IDF-weighted F1 relevance scoring
├── tests/
│   └── smoke.mjs        # API and graph integration tests
├── ARCHITECTURE.md
├── RELATIONSHIP_RANKING_PLAN.md
└── package.json
```

### Notes

- Plain JavaScript ESM with **no build step**
- Core dependencies: `gray-matter` (frontmatter), `marked` (Markdown rendering)
- Designed to be lightweight and easily inspectable by humans and LLMs

## Resources

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system components, data flow, design rationale
- [`RELATIONSHIP_RANKING_PLAN.md`](./RELATIONSHIP_RANKING_PLAN.md) — detailed ranking design and implementation status
- [`src/server.mjs`](./src/server.mjs) — HTTP server and route definitions
- [`src/data-source.mjs`](./src/data-source.mjs) — article discovery, parsing, block references
- [`src/tag-model.mjs`](./src/tag-model.mjs) — tag/relationship normalization and semantic tag derivation
- [`src/tag-network.mjs`](./src/tag-network.mjs) — DAG construction, layering, and layout
- [`src/relevance.mjs`](./src/relevance.mjs) — IDF-weighted relevance scoring with debug aspect

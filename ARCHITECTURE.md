# Architecture

## Purpose

Knowledge Base Reader is a small standalone web app for browsing a markdown-based knowledge base as a wiki-style interface. It focuses on deterministic rendering, low setup overhead, and easy inspection by humans and LLMs.

## System Components

| Component | File(s) | Responsibility |
| --- | --- | --- |
| HTTP server | `src/server.mjs` | Serves the app, exposes API routes, and returns static assets |
| Data source | `src/data-source.mjs` | Discovers articles, parses frontmatter, strips redundant titles, and prepares article payloads |
| Tag model | `src/tag-model.mjs` | Normalizes display tags, semantic tags, and relationships |
| Tag graph | `src/tag-network.mjs` | Builds the corpus DAG of tags and their relationships |
| Relevance ranking | `src/relevance.mjs` | Scores related articles using exact semantic-tag overlap and rarity weighting |
| Frontend | `public/app.js` | Renders the landing page, article view, graph page, sidebar, filters, and related rail |
| Styles | `public/styles.css` | Controls layout, themes, cards, graph controls, sidebar outline, and match visuals |
| Smoke tests | `tests/smoke.mjs` | Verifies the API and article routes |

## Key Principles

- **Markdown-first**: articles are stored as `.md` files with frontmatter.
- **No build step**: the app runs directly on Node.js and serves static assets.
- **Deterministic ranking**: related articles are based on exact semantic tag overlap, not fuzzy similarity.
- **Clear data separation**: display tags, semantic tags, and tag relationships are modeled separately.
- **Client-side navigation**: the UI swaps between landing, article, and graph views without a full reload.

## Data Flow

1. The server starts and resolves the active article directory.
2. The frontend calls `GET /api/articles` to render the landing page.
3. Clicking an article calls `GET /api/articles/:slug`.
4. `src/data-source.mjs` parses the article, strips the leading H1, renders Markdown, extracts headings, and derives both display tags and semantic tags.
5. `src/tag-network.mjs` builds a DAG of tag nodes and corpus-derived edges.
6. `src/relevance.mjs` scores related articles from the semantic tag set, weighting rarer exact tags more heavily.
7. The frontend renders:
   - article content
   - sidebar section outline
   - display tags on cards and article headers
   - related article cards with match indicators and compact match explanations
   - the special tag graph page

## Interaction Model

The frontend is intentionally lightweight:

- hash routing keeps navigation simple
- graph interactions are handled entirely in the browser
- the graph page supports pan, zoom, reset, fit, and mouse dragging
- settings and layout controls update the active view without a page reload

## Why This Shape

This structure keeps the app easy to reason about:

- the server is responsible for I/O and routing
- the data layer is responsible for parsing and ranking
- the frontend is responsible for presentation and interaction

That separation makes the app straightforward to test, debug, and extend.

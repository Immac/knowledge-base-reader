# Architecture

## Purpose

Knowledge Base Reader is a small companion web app for browsing a markdown-based knowledge base. It is optimized for deterministic rendering, low setup overhead, and easy inspection by LLMs and humans alike.

## System Components

| Component | File(s) | Responsibility |
| --- | --- | --- |
| HTTP server | `src/server.mjs` | Serves the app, exposes API routes, and returns static assets |
| Data source | `src/data-source.mjs` | Discovers articles, parses frontmatter, renders Markdown, and prepares related articles |
| Relevance ranking | `src/relevance.mjs` | Scores related articles using tag-only heuristics |
| Frontend | `public/app.js` | Renders the landing page, article view, sidebar, filters, and related rail |
| Styles | `public/styles.css` | Controls layout, themes, cards, sidebar outline, and related match visuals |
| Smoke tests | `tests/smoke.mjs` | Verifies the API and article routes |

## Key Principles

- **Markdown-first**: articles are stored as `.md` files with frontmatter.
- **No build step**: the app runs directly on Node.js and serves static assets.
- **Deterministic ranking**: related articles are based on tag overlap, not semantic similarity.
- **Multiple data sources**: the reader looks for a local or pi knowledge base directory in a fixed order.
- **Client-side navigation**: the UI swaps between landing and article views without a full reload.

## Data Flow

1. The server starts and resolves the active article directory.
2. The frontend calls `GET /api/articles` to render the landing page.
3. Clicking an article calls `GET /api/articles/:slug`.
4. `src/data-source.mjs` parses the article, strips the leading H1, renders Markdown, extracts headings, and computes related articles.
5. The frontend renders:
   - article content
   - sidebar section outline
   - related article cards with match indicators

## Related Article Ranking

Related articles are scored from tag overlap only.

- exact tag matches score highest
- shared tag keys with different values score lower
- the current article is excluded from the candidate set
- the UI shows a compact visual match indicator instead of a numeric percentage

## Why This Shape

This structure keeps the app easy to reason about:

- the server is responsible for I/O and routing
- the data layer is responsible for parsing and ranking
- the frontend is responsible for presentation and interaction

That separation makes the app straightforward to test, debug, and extend.

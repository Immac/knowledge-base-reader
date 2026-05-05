# Architecture

## Purpose

Knowledge Base Reader is a small companion web app for browsing a markdown-based knowledge base. It is optimized for deterministic rendering, low setup overhead, and easy inspection by LLMs and humans alike.

## System Components

| Component | File(s) | Responsibility |
| --- | --- | --- |
| HTTP server | `src/server.mjs` | Serves the app, exposes API routes, and returns static assets |
| Data source | `src/data-source.mjs` | Discovers articles, parses frontmatter, normalizes tag models, and prepares related articles |
| Tag model | `src/tag-model.mjs` | Normalizes display tags, semantic tags, and relationships |
| Relevance ranking | `src/relevance.mjs` | Scores related articles using exact-tag semantic heuristics |
| Frontend | `public/app.js` | Renders the landing page, article view, sidebar, filters, and related rail |
| Styles | `public/styles.css` | Controls layout, themes, cards, sidebar outline, and related match visuals |
| Smoke tests | `tests/smoke.mjs` | Verifies the API and article routes |

## Key Principles

- **Markdown-first**: articles are stored as `.md` files with frontmatter.
- **No build step**: the app runs directly on Node.js and serves static assets.
- **Deterministic ranking**: related articles are based on exact `key:value` overlap over the semantic tag set, not fuzzy semantic similarity.
- **Multiple data sources**: the reader looks for a local or pi knowledge base directory in a fixed order.
- **Client-side navigation**: the UI swaps between landing and article views without a full reload.

## Data Flow

1. The server starts and resolves the active article directory.
2. The frontend calls `GET /api/articles` to render the landing page.
3. Clicking an article calls `GET /api/articles/:slug`.
4. `src/data-source.mjs` parses the article, strips the leading H1, renders Markdown, extracts headings, and derives both display tags and semantic tags.
5. `src/relevance.mjs` scores related articles from the semantic tag set, weighting rarer exact tags more heavily.
6. The frontend renders:
   - article content
   - sidebar section outline
   - display tags on the article header and cards
   - related article cards with match indicators and compact match explanations

## Related Article Ranking

Related articles are scored from exact `key:value` overlap in the semantic tag set only.

- display tags stay separate from semantic tags
- DAG-derived relationship tags can participate in ranking
- exact tag matches are weighted by corpus rarity
- tags that appear in many articles contribute less
- the current article is excluded from the candidate set
- the UI shows a compact visual match indicator plus a short match explanation instead of a numeric percentage

## Why This Shape

This structure keeps the app easy to reason about:

- the server is responsible for I/O and routing
- the data layer is responsible for parsing and ranking
- the frontend is responsible for presentation and interaction

That separation makes the app straightforward to test, debug, and extend.

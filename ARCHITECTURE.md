# Architecture

## Purpose

Knowledge Base Reader is a small standalone web app for browsing a markdown-based knowledge base as a wiki-style interface. It focuses on deterministic rendering, low setup overhead, and easy inspection by humans and LLMs.

## System Components

| Component | File | Responsibility |
| --- | --- | --- |
| HTTP server | `src/server.mjs` | Serves the SPA, exposes JSON API routes, returns static assets |
| Data source | `src/data-source.mjs` | Discovers articles, parses frontmatter, resolves block references, strips leading H1, prepares article payloads with rendered HTML, headings, and related rankings |
| Tag model | `src/tag-model.mjs` | Normalizes `key:value` display tags, relationship entries, and derives semantic tags from relationships |
| Tag network | `src/tag-network.mjs` | Builds the corpus DAG — nodes are exact semantic tags, edges are co-occurrence across articles — with layered layout and SVG path generation |
| Relevance | `src/relevance.mjs` | Scores related articles using IDF-weighted exact semantic-tag overlap (F1) with a debug aspect wrapper |
| Frontend | `public/app.js` | Client-side SPA: hash-based routing, landing page, article view, graph page, sidebar filter, settings panel, theme/layout switching |
| Styles | `public/styles.css` | Six themes, five layouts, responsive design, graph controls, tag chips, related rail, article card grid |
| Smoke tests | `tests/smoke.mjs` | Verifies API endpoints, article routes, tag graph builder, and 404 handling |

## Key Principles

- **Markdown-first**: articles are stored as `.md` files with YAML frontmatter. No database.
- **No build step**: the app runs directly on Node.js 18+ using native ESM and serves static assets.
- **Deterministic ranking**: related articles are scored using exact semantic-tag overlap with IDF weighting, not fuzzy similarity or embeddings.
- **Clear data separation**: display tags, semantic tags, and relationships are modeled as distinct but related concepts.
- **Client-side navigation**: hash-based routing (`#/article/:slug`, `#/graph`) swaps views without full page reloads.
- **LLM-friendly**: plain JS, no build tools, small dependency footprint, easy to read and reason about.

## Data Flow

```
Browser                          Server
  │                                │
  ├─ GET / ───────────────────────►│  serve public/index.html
  │◄──── index.html ───────────────┤
  │                                │
  ├─ GET /api/articles ───────────►│  resolveDataSource() → listArticleSlugs()
  │                                │  for each slug: matter(raw) → normalize tags
  │◄──── [{slug, title, tags,      │  sort by modified date
  │       excerpt, modified}] ─────┤
  │                                │
  ├─ GET /api/articles/:slug ─────►│  readArticleRaw(slug) → matter(raw)
  │                                │  resolveBlockReferences() if !block: found
  │                                │  stripLeadingHeading() → marked.parse(html)
  │                                │  extractHeadings() for sidebar outline
  │                                │  rankRelatedArticles() via tag overlap
  │◄──── {slug, title, html,       │
  │       headings, tags,          │
  │       semanticTags,            │
  │       related[]} ──────────────┤
  │                                │
  ├─ GET /api/tags/graph ─────────►│  buildTagDagGraph(articles)
  │                                │  → createNodeMap(), createEdgeMap()
  │                                │  → assignLayers(), layoutGraph()
  │◄──── {nodes[], edges[],        │
  │       layers[], width, height} ─┤
```

## Tag Model

```
┌─────────────────────────────────────────────────┐
│                 Article                         │
├─────────────────────────────────────────────────┤
│ frontmatter.tags: ["lang:js", "topic:graph"]    │  → displayTags
│ frontmatter.relationships: [                    │
│   "rel:depends-on@topic:sorting"                │
│ ]                                               │
├─────────────────────────────────────────────────┤
│ semanticTags = displayTags + relationship-derived │
│   (e.g., "rel:depends-on", "topic:sorting")      │
└─────────────────────────────────────────────────┘
```

**normalizeArticleTagModel(article)**: parses `tags` into normalized `displayTags`, parses `relationships`, then merges both into `semanticTags` for the relevance engine and graph.

## Relevance Scoring

The `relevance.mjs` module uses an IDF-weighted F1 approach:

1. **Build corpus stats**: count how many articles each exact `key:value` tag appears in.
2. **IDF weight**: `log((totalArticles + 1) / (tagCount + 1)) + 1` — rare tags carry more weight.
3. **Score article A vs B**: compute weighted precision and recall over their semantic tag sets, combine via F1.
4. **Rank**: sort candidates by `relevancePercent` descending, filter out articles with zero matches.

A debug aspect wrapper (`withDebugAspect`) logs entry/exit timing when `KB_RELEVANCE_DEBUG=1` is set.

## Tag DAG Graph

The graph builder in `tag-network.mjs`:

1. **createNodeMap**: every unique semantic tag across all articles becomes a node, annotated with article count and membership list.
2. **createEdgeMap**: for each article, every pair of its tags gets an edge. Edge weight = number of articles sharing that tag pair.
3. **assignLayers**: topological layering — nodes with only outgoing edges (broader tags) are in layer 0; deeper layers point toward more specific tags.
4. **layoutGraph**: positions nodes in column-per-layer format with SVG paths using cubic Bézier curves.

The DAG is directional: edges point from the alphabetically/count-sorted first tag toward the second, producing a consistent orientation.

## Layouts

Five CSS class-based layouts switch between column counts and responsive grid behavior:

| Layout | Description |
| --- | --- |
| `dashboard` | 3-column article grid, wide content |
| `focus` | Single narrow column, minimal chrome |
| `cards` | Compact card grid with tighter spacing |
| `magazine` | 2-column magazine-style layout |
| `notebook` | Single column with notebook margins |

## Block Reference System

The `!block:` directive in article content resolves to shared markdown blocks:

- `!block:name` → `articles/{currentSlug}/{name}.md`
- `!block:other-article/name` → `articles/{other-article}/{name}.md`

Resolution happens server-side during `getArticle()` before Markdown rendering. Unresolvable references render as the raw `!block:` text (fail-open).

## Interaction Model

The frontend is intentionally lightweight:

- Hash routing keeps navigation simple and bookmarkable.
- Graph interactions (pan, zoom, drag, fit, reset) are handled entirely in the browser via SVG transforms and pointer events.
- Settings panel toggles without page reload.
- Article sidebar shows a nested section outline for quick heading navigation.
- Related articles rail updates automatically when an article loads.

## Design Rationale

This structure keeps the app easy to reason about:

- **Server** owns I/O and routing — reads the filesystem, resolves blocks, serves data.
- **Data layer** owns parsing and ranking — tag normalization, graph construction, relevance scoring.
- **Frontend** owns presentation and interaction — rendering, themes, layouts, graph interaction.

This separation makes the app straightforward to test, debug, and extend. Each module has a single responsibility and can be verified independently.

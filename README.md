# Knowledge Base Reader

A wiki-style browser for the knowledge base, built as a pi extension companion.

Repository: git@github.com:Immac/knowledge-base-reader.git

## Quick Start

```bash
npm run dev
```

Then open http://127.0.0.1:4173/ in your browser.

## Data Source

The app auto-discovers articles from:

1. `KB_WIKI_DATA_DIR` environment variable
2. `./knowledge-base` (local)
3. `~/.pi/knowledge-base` (global)
4. Sibling `knowledge-base` extension's articles

## Usage

- **Browse articles** - The landing page shows latest changes and all articles
- **Badges** - New items and recently edited items are marked on cards
- **Filter** - Type in the filter box to search by title, slug, or tag (e.g., `language:javascript`)
- **Navigate** - Articles support hash-based URLs (`/#/article/my-slug`)
- **Sections** - Article headings are shown as an outline in the sidebar
- **Style** - Choose from Dark, Calm, Violet, Forest, Warm, or Mint themes
- **Layout** - Choose from Dashboard, Focus, Cards, Magazine, or Notebook layouts

## Commands

```bash
npm run dev    # Start development server
npm start     # Start production server
npm test      # Run smoke tests
```

## Architecture

- `src/server.mjs` - HTTP server and routing
- `src/data-source.mjs` - Article loading and processing
- `public/` - Static frontend files
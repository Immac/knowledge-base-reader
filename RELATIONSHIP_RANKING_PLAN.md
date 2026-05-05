# Relationship Ranking Plan

## Goal
Rank how relevant one article is to another in a way that is:
- deterministic for the current app
- based on tags only for the heuristic layer
- compatible with future LLM-generated tags
- separated from a future RAG/semantic ranking system

## Scope
This plan covers the **tag-based heuristic relevance system** only.

It does **not** include title or body-text similarity in the heuristic layer, because those signals are intended for a separate RAG-based ranking system later.

The reader distinguishes between:
- **display tags**: the article’s own frontmatter tags
- **semantic tags**: display tags plus DAG-derived relationship tags

## Design Principle
Use two independent ranking systems:

1. **Heuristic relevance**
   - Uses only tags
   - Works on article metadata
   - Fast, explainable, and deterministic

2. **RAG relevance**
   - Uses title/content/chunks/embeddings later
   - Separate scoring path
   - No double-counting of title or body text in the heuristic layer

## Heuristic Inputs
The heuristic should use only tag data from article metadata and any DAG-derived semantic tags.

Recommended tag sources:
- human-authored frontmatter tags
- future LLM-generated tags
- relationship-derived semantic tags
- any normalized tag variants that are stored as tags

Recommended tag shape:
- `key:value` pairs treated as a single tag unit
- optional support for tag groups later, if needed

## Heuristic Scoring Model
Score article A against article B using only exact tag overlap from the semantic tag set.

Suggested scoring rules:
- **Exact key:value match**: the only match type
- **Corpus rarity**: repeated tags across many articles count less
- **Normalization**: compare case-insensitively and trim whitespace

Example weighting formula:
- compute tag rarity with an IDF-style weight across the corpus
- aggregate exact semantic-tag overlap with a weighted F1-style score
- use the weighted score for ranking and display

## Ranking Output
Return a ranked list of related articles with:
- `slug`
- `title`
- `score`
- `matchedTags`
- `reason`
- `scoreBreakdown`

## Data Model Notes
Keep generated tags separate from source metadata if helpful, but expose them through a unified tag set for heuristic scoring.

Possible future structure:
- `tags.source` -> author tags
- `tags.generated` -> LLM tags
- `tags.all` -> merged set used by the heuristic

If separation is not needed yet, keep a single merged tag object and preserve provenance elsewhere.

## Implementation Phases

### Phase 1: Define tag-only relevance
- add a scoring helper for tag overlap
- normalize tags before scoring
- rank related articles by descending score
- expose the matched tags in the result
- checkpoint commit: backend relevance helper and article ranking

### Phase 2: Add generated tags as first-class inputs
- allow generated tags to be merged into the same heuristic input
- keep them distinct in storage if needed
- ensure generated tags do not introduce duplicate scoring for the same semantic signal
- checkpoint commit: data model updates for generated tags

### Phase 3: Add explainability
- show why an article is related
- display matched tags in the UI
- optionally show score only in debug mode
- use an aspect-style debug wrapper so logs only appear when enabled
- checkpoint commit: UI presentation and debug-only tracing

### Phase 4: Build a separate RAG ranking layer
- use title/content/chunk embeddings
- keep the RAG score independent from the tag heuristic
- combine results only if a future product decision requires it

## Suggested API Shape
A future internal helper could look like:

```js
scoreArticleRelevance(articleA, articleB) -> {
  score,
  matchedTags,
  scoreBreakdown,
}
```

And a ranking wrapper could look like:

```js
rankRelatedArticles(article, candidates) -> [
  {
    slug,
    title,
    score,
    matchedTags,
  }
]
```

## UI Behavior
For the related rail:
- show related articles sorted by heuristic score
- defensively exclude the current article if it appears in the returned data
- show only a few matched tags per item
- show a `+N` overflow counter when there are more matched tags than can be displayed
- keep the UI compact and readable

## Acceptance Criteria
- Related articles are ranked by tag relevance
- The heuristic uses tags only
- Generated tags can participate in the same heuristic later
- Title/content similarity is not used in the heuristic layer
- RAG remains a separate future ranking path
- The UI can explain the match through shared tags

## Open Questions
- Should generated tags be displayed differently from human tags?
- Should heuristic scores be normalized by article tag count?
- Should the UI show the score to users or keep it internal?

## Implementation Status
- Phase 1 is implemented: tag relevance scoring, ranking, normalization, and debug-only aspect logging live in `src/relevance.mjs` and `src/data-source.mjs`.
- Phase 2 is implemented: the related rail consumes ranked matches and renders small shared tag pills with overflow counts.
- Phase 3 remains future work if the UI needs stronger explainability or score surfacing.
- Phase 4 remains future work for the separate RAG ranking layer.

## Recommended Next Step
If generated tags are introduced later, merge them into the same tag heuristic without feeding title or body text into that layer.

const DEBUG_RELEVANCE = process.env.KB_RELEVANCE_DEBUG === '1';

function normalizeToken(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function createTagIndex(tags = {}) {
  const entries = [];
  const bySignature = new Map();
  const byKey = new Map();

  for (const [rawKey, rawValue] of Object.entries(tags || {})) {
    const key = normalizeToken(rawKey);
    const value = normalizeToken(rawValue);

    if (!key || !value) continue;

    const entry = { key, value, rawKey, rawValue };
    entries.push(entry);

    const signature = `${key}\u0000${value}`;
    bySignature.set(signature, entry);

    if (!byKey.has(key)) {
      byKey.set(key, new Set());
    }
    byKey.get(key).add(value);
  }

  return { entries, bySignature, byKey };
}

function withDebugAspect(name, fn) {
  return (...args) => {
    if (!DEBUG_RELEVANCE) {
      return fn(...args);
    }

    const start = Date.now();
    console.debug(`[relevance:${name}] enter`, {
      aTags: Object.keys(args[0] || {}).length,
      bTags: Object.keys(args[1] || {}).length,
    });

    try {
      const result = fn(...args);
      console.debug(`[relevance:${name}] exit`, {
        ms: Date.now() - start,
        score: result?.score ?? null,
        exactMatches: result?.matchedTags?.length ?? 0,
        relatedKeys: result?.matchedKeys?.length ?? 0,
      });
      return result;
    } catch (error) {
      console.debug(`[relevance:${name}] error`, {
        ms: Date.now() - start,
        message: error?.message || String(error),
      });
      throw error;
    }
  };
}

function scoreArticleRelevanceImpl(articleTags, candidateTags) {
  const articleIndex = createTagIndex(articleTags);
  const candidateIndex = createTagIndex(candidateTags);
  const matchedTags = [];
  const matchedKeys = new Set();
  let score = 0;
  let exactMatchCount = 0;
  let partialMatchCount = 0;

  for (const candidate of candidateIndex.entries) {
    const signature = `${candidate.key}\u0000${candidate.value}`;
    if (articleIndex.bySignature.has(signature)) {
      matchedTags.push({ key: candidate.rawKey, value: candidate.rawValue });
      score += 10;
      exactMatchCount += 1;
      continue;
    }

    if (articleIndex.byKey.has(candidate.key)) {
      matchedKeys.add(candidate.rawKey);
      score += 2;
      partialMatchCount += 1;
    }
  }

  const articleTagCount = articleIndex.entries.length;
  const candidateTagCount = candidateIndex.entries.length;
  const exactPrecision = candidateTagCount > 0 ? exactMatchCount / candidateTagCount : 0;
  const exactRecall = articleTagCount > 0 ? exactMatchCount / articleTagCount : 0;
  const partialPrecision = candidateTagCount > 0 ? partialMatchCount / candidateTagCount : 0;
  const partialRecall = articleTagCount > 0 ? partialMatchCount / articleTagCount : 0;
  const exactF1 = exactMatchCount > 0 ? (2 * exactPrecision * exactRecall) / (exactPrecision + exactRecall) : 0;
  const partialF1 = partialMatchCount > 0 ? (2 * partialPrecision * partialRecall) / (partialPrecision + partialRecall) : 0;
  const relevancePercent = Math.round(Math.max(0, Math.min(100, (exactF1 * 85) + (partialF1 * 15))));

  return {
    score,
    relevancePercent,
    matchedTags,
    matchedKeys: [...matchedKeys],
  };
}

function isSameArticle(article, candidate) {
  if (!article || !candidate) return false;
  const articleTitle = normalizeToken(article.title);
  const candidateTitle = normalizeToken(candidate.title);
  return Boolean(
    (article.slug && candidate.slug && candidate.slug === article.slug) ||
    (articleTitle && candidateTitle && candidateTitle === articleTitle)
  );
}

function rankRelatedArticlesImpl(article, candidates) {
  const ranked = candidates
    .filter(candidate => !isSameArticle(article, candidate))
    .map(candidate => {
      const result = scoreArticleRelevanceImpl(article?.tags || {}, candidate?.tags || {});
      return {
        slug: candidate.slug,
        title: candidate.title,
        score: result.score,
        relevancePercent: result.relevancePercent,
        matchedTags: result.matchedTags,
        matchedKeys: result.matchedKeys,
      };
    })
    .filter(item => item.matchedTags.length > 0)
    .sort((a, b) => {
      if ((b.relevancePercent || 0) !== (a.relevancePercent || 0)) return (b.relevancePercent || 0) - (a.relevancePercent || 0);
      if (b.score !== a.score) return b.score - a.score;
      if (b.matchedTags.length !== a.matchedTags.length) return b.matchedTags.length - a.matchedTags.length;
      return a.title.localeCompare(b.title) || a.slug.localeCompare(b.slug);
    });

  return ranked;
}

export const scoreArticleRelevance = withDebugAspect('scoreArticleRelevance', scoreArticleRelevanceImpl);
export const rankRelatedArticles = withDebugAspect('rankRelatedArticles', rankRelatedArticlesImpl);
export { normalizeToken, createTagIndex };

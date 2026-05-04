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

function buildCorpusStats(articles = []) {
  const signatureCounts = new Map();
  const uniqueArticles = new Set();

  for (const article of articles || []) {
    if (!article) continue;
    const articleId = article.slug || article.title || JSON.stringify(article.tags || {});
    if (uniqueArticles.has(articleId)) continue;
    uniqueArticles.add(articleId);

    const index = createTagIndex(article.tags || {});
    const seenSignatures = new Set();

    for (const entry of index.entries) {
      const signature = `${entry.key}\u0000${entry.value}`;
      if (seenSignatures.has(signature)) continue;
      seenSignatures.add(signature);
      signatureCounts.set(signature, (signatureCounts.get(signature) || 0) + 1);
    }
  }

  return {
    totalArticles: uniqueArticles.size,
    signatureCounts,
  };
}

function inverseDocumentFrequency(count, total) {
  if (!total || !count) return 1;
  return Math.log((total + 1) / (count + 1)) + 1;
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

function scoreArticleRelevanceImpl(articleTags, candidateTags, corpusStats = {}) {
  const articleIndex = createTagIndex(articleTags);
  const candidateIndex = createTagIndex(candidateTags);
  const matchedTags = [];

  const totalArticles = corpusStats.totalArticles || 0;
  const signatureCounts = corpusStats.signatureCounts || new Map();

  let matchedWeight = 0;
  let articleWeight = 0;
  let candidateWeight = 0;

  for (const entry of articleIndex.entries) {
    const signature = `${entry.key}\u0000${entry.value}`;
    articleWeight += inverseDocumentFrequency(signatureCounts.get(signature) || 0, totalArticles);
  }

  for (const candidate of candidateIndex.entries) {
    const signature = `${candidate.key}\u0000${candidate.value}`;
    const weight = inverseDocumentFrequency(signatureCounts.get(signature) || 0, totalArticles);
    candidateWeight += weight;

    if (articleIndex.bySignature.has(signature)) {
      matchedTags.push({ key: candidate.rawKey, value: candidate.rawValue });
      matchedWeight += weight;
    }
  }

  const precision = candidateWeight > 0 ? matchedWeight / candidateWeight : 0;
  const recall = articleWeight > 0 ? matchedWeight / articleWeight : 0;
  const relevanceScore = matchedWeight > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const relevancePercent = Math.round(relevanceScore * 100);

  return {
    score: relevanceScore,
    relevancePercent,
    matchedTags,
    scoreBreakdown: {
      matchedWeight,
      articleWeight,
      candidateWeight,
    },
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
  const corpusStats = buildCorpusStats([article, ...(candidates || [])]);
  const ranked = candidates
    .filter(candidate => !isSameArticle(article, candidate))
    .map(candidate => {
      const result = scoreArticleRelevanceImpl(article?.tags || {}, candidate?.tags || {}, corpusStats);
      return {
        slug: candidate.slug,
        title: candidate.title,
        score: result.score,
        relevancePercent: result.relevancePercent,
        matchedTags: result.matchedTags,
        scoreBreakdown: result.scoreBreakdown,
      };
    })
    .filter(item => item.matchedTags.length > 0)
    .sort((a, b) => {
      if ((b.relevancePercent || 0) !== (a.relevancePercent || 0)) return (b.relevancePercent || 0) - (a.relevancePercent || 0);
      if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
      if (b.matchedTags.length !== a.matchedTags.length) return b.matchedTags.length - a.matchedTags.length;
      return a.title.localeCompare(b.title) || a.slug.localeCompare(b.slug);
    });

  return ranked;
}

export const scoreArticleRelevance = withDebugAspect('scoreArticleRelevance', scoreArticleRelevanceImpl);
export const rankRelatedArticles = withDebugAspect('rankRelatedArticles', rankRelatedArticlesImpl);
export { normalizeToken, createTagIndex };

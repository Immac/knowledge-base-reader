import { normalizeTagCollection, tagSignature } from './tag-model.mjs';

const DEBUG_RELEVANCE = process.env.KB_RELEVANCE_DEBUG === '1';

function normalizeToken(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function createTagIndex(tags = []) {
  const entries = normalizeTagCollection(tags);
  const bySignature = new Map();

  for (const entry of entries) {
    bySignature.set(tagSignature(entry), entry);
  }

  return { entries, bySignature };
}

function buildCorpusStats(articles = []) {
  const signatureCounts = new Map();
  const uniqueArticles = new Set();

  for (const article of articles || []) {
    if (!article) continue;
    const articleId = article.slug || article.title || JSON.stringify(article.semanticTags || article.displayTags || article.tags || []);
    if (uniqueArticles.has(articleId)) continue;
    uniqueArticles.add(articleId);

    const index = createTagIndex(article.semanticTags ?? article.displayTags ?? article.tags ?? []);
    const seenSignatures = new Set();

    for (const entry of index.entries) {
      const signature = tagSignature(entry);
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
      aTags: (args[0]?.semanticTags || args[0]?.displayTags || args[0]?.tags || []).length,
      bTags: (args[1]?.semanticTags || args[1]?.displayTags || args[1]?.tags || []).length,
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

function scoreArticleRelevanceImpl(article, candidate, corpusStats = {}) {
  const articleIndex = createTagIndex(article?.semanticTags ?? article?.displayTags ?? article?.tags ?? []);
  const candidateIndex = createTagIndex(candidate?.semanticTags ?? candidate?.displayTags ?? candidate?.tags ?? []);
  const matchedTags = [];

  const totalArticles = corpusStats.totalArticles || 0;
  const signatureCounts = corpusStats.signatureCounts || new Map();

  let matchedWeight = 0;
  let articleWeight = 0;
  let candidateWeight = 0;

  for (const entry of articleIndex.entries) {
    articleWeight += inverseDocumentFrequency(signatureCounts.get(tagSignature(entry)) || 0, totalArticles);
  }

  for (const candidateTag of candidateIndex.entries) {
    const signature = tagSignature(candidateTag);
    const weight = inverseDocumentFrequency(signatureCounts.get(signature) || 0, totalArticles);
    candidateWeight += weight;

    if (articleIndex.bySignature.has(signature)) {
      matchedTags.push({ key: candidateTag.key, value: candidateTag.value });
      matchedWeight += weight;
    }
  }

  const precision = candidateWeight > 0 ? matchedWeight / candidateWeight : 0;
  const recall = articleWeight > 0 ? matchedWeight / articleWeight : 0;
  const relevanceScore = matchedWeight > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const relevancePercent = Math.round(relevanceScore * 100);
  const reasonTags = matchedTags.slice(0, 3).map((tag) => `${tag.key}:${tag.value}`);
  const reason = matchedTags.length > 0
    ? `Matched on ${matchedTags.length} tag${matchedTags.length === 1 ? '' : 's'}${reasonTags.length > 0 ? `: ${reasonTags.join(' · ')}` : ''}`
    : '';

  return {
    score: relevanceScore,
    relevancePercent,
    matchedTags,
    reason,
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
      const result = scoreArticleRelevanceImpl(article, candidate, corpusStats);
      return {
        slug: candidate.slug,
        title: candidate.title,
        score: result.score,
        relevancePercent: result.relevancePercent,
        matchedTags: result.matchedTags,
        reason: result.reason,
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

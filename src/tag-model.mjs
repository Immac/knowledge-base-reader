function normalizeToken(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseTagEntry(tag) {
  if (typeof tag === 'string') {
    const index = tag.indexOf(':');
    if (index === -1) return null;
    const key = tag.slice(0, index).trim();
    const value = tag.slice(index + 1).trim();
    if (!key || !value) return null;
    return { key, value };
  }

  if (tag && typeof tag === 'object') {
    const objectTag = tag;
    const directKey = typeof objectTag.key === 'string' ? objectTag.key.trim() : '';
    const directValue = typeof objectTag.value === 'string' ? objectTag.value.trim() : '';
    if (directKey) {
      return { key: directKey, value: directValue };
    }

    const entries = Object.entries(objectTag);
    for (const [key, value] of entries) {
      if (typeof value === 'string') {
        return { key: key.trim(), value: value.trim() };
      }
    }
  }

  return null;
}

export function tagSignature(tag) {
  return `${normalizeToken(tag?.key)}\u0000${normalizeToken(tag?.value)}`;
}

export function normalizeTagCollection(tags = []) {
  const input = Array.isArray(tags) ? tags : Object.entries(tags || {});
  const result = [];
  const seen = new Set();

  for (const item of input) {
    if (Array.isArray(item)) {
      const [key, value] = item;
      if (typeof value === 'string' && /^\d+$/.test(String(key)) && value.includes(':')) {
        const parsed = parseTagEntry(value);
        if (parsed) {
          const normalized = { key: parsed.key, value: parsed.value };
          const signature = tagSignature(normalized);
          if (normalized.key && normalized.value && !seen.has(signature)) {
            seen.add(signature);
            result.push(normalized);
          }
        }
        continue;
      }

      if (typeof value === 'string') {
        const normalized = { key: String(key).trim(), value: value.trim() };
        const signature = tagSignature(normalized);
        if (normalized.key && normalized.value && !seen.has(signature)) {
          seen.add(signature);
          result.push(normalized);
        }
        continue;
      }

      if (Array.isArray(value)) {
        for (const entry of value) {
          if (typeof entry !== 'string') continue;
          const normalized = { key: String(key).trim(), value: entry.trim() };
          const signature = tagSignature(normalized);
          if (!normalized.key || !normalized.value || seen.has(signature)) continue;
          seen.add(signature);
          result.push(normalized);
        }
        continue;
      }

      if (value && typeof value === 'object') {
        const nested = parseTagEntry({ key, value });
        if (nested) {
          const normalized = { key: nested.key, value: nested.value };
          const signature = tagSignature(normalized);
          if (normalized.key && normalized.value && !seen.has(signature)) {
            seen.add(signature);
            result.push(normalized);
          }
        }
        continue;
      }
    }

    const parsed = parseTagEntry(item);
    if (!parsed) continue;

    const normalized = {
      key: parsed.key,
      value: parsed.value,
    };
    const signature = tagSignature(normalized);
    if (seen.has(signature)) continue;
    seen.add(signature);
    result.push(normalized);
  }

  return result;
}

function parseRelationshipEntry(relationship) {
  if (typeof relationship === 'string') {
    const index = relationship.indexOf(':');
    if (index === -1) return null;
    const predicate = relationship.slice(0, index).trim();
    const target = relationship.slice(index + 1).trim();
    if (!predicate || !target) return null;
    return { predicate, target, qualifiers: [] };
  }

  if (!relationship || typeof relationship !== 'object') return null;

  const relation = relationship;
  const predicate = typeof relation.predicate === 'string'
    ? relation.predicate.trim()
    : typeof relation.key === 'string'
      ? relation.key.trim()
      : '';
  const target = typeof relation.target === 'string'
    ? relation.target.trim()
    : typeof relation.value === 'string'
      ? relation.value.trim()
      : '';

  if (!predicate || !target) return null;

  const qualifiers = normalizeTagCollection(relation.qualifiers ?? relation.tags ?? []);
  return { predicate, target, qualifiers };
}

export function normalizeRelationshipCollection(relations = []) {
  const input = Array.isArray(relations) ? relations : [relations];
  const result = [];
  const seen = new Set();

  for (const relation of input) {
    const parsed = parseRelationshipEntry(relation);
    if (!parsed) continue;

    const qualifierKey = parsed.qualifiers.map(tagSignature).join('|');
    const signature = `${normalizeToken(parsed.predicate)}\u0000${normalizeToken(parsed.target)}\u0000${qualifierKey}`;
    if (seen.has(signature)) continue;
    seen.add(signature);
    result.push(parsed);
  }

  return result;
}

export function semanticTagsForArticle(article) {
  const displayTags = normalizeTagCollection(article?.displayTags ?? article?.tags ?? []);
  const relationships = normalizeRelationshipCollection(article?.relationships ?? []);
  const semanticTags = [...displayTags];
  const seen = new Set(displayTags.map(tagSignature));

  for (const relation of relationships) {
    const relationTag = { key: relation.predicate, value: relation.target };
    const relationSignature = tagSignature(relationTag);
    if (!seen.has(relationSignature)) {
      seen.add(relationSignature);
      semanticTags.push(relationTag);
    }

    for (const qualifier of relation.qualifiers ?? []) {
      const qualifierSignature = tagSignature(qualifier);
      if (seen.has(qualifierSignature)) continue;
      seen.add(qualifierSignature);
      semanticTags.push(qualifier);
    }
  }

  return semanticTags;
}

export function normalizeArticleTagModel(article) {
  const displayTags = normalizeTagCollection(article?.displayTags ?? article?.tags ?? []);
  const relationships = normalizeRelationshipCollection(article?.relationships ?? []);
  const semanticTags = semanticTagsForArticle({ displayTags, relationships });

  return {
    displayTags,
    semanticTags,
    relationships,
  };
}

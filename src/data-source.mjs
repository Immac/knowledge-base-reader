import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { marked } from 'marked';
import { rankRelatedArticles } from './relevance.mjs';
import { normalizeArticleTagModel } from './tag-model.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_SOURCE_ORDER = [
  process.env.KB_WIKI_DATA_DIR,
  './knowledge-base',
  path.join(process.env.HOME || '~', '.pi', 'knowledge-base'),
  path.join(__dirname, '..', 'knowledge-base', 'articles'),
];

export function resolveDataSource() {
  for (const src of DATA_SOURCE_ORDER) {
    if (src && fs.existsSync(src)) {
      return src;
    }
  }
  return null;
}

// ── Block reference resolution ──────────────────────────────────

const BLOCK_REF_RE = /!block:([a-z0-9-]+(?:\/[a-z0-9-]+)?)/g;

/**
 * Resolve !block: references in article content.
 * Same-article:  !block:name  → articles/{slug}/{name}.md
 * Cross-article: !block:other/name → articles/{other}/{name}.md
 * Falls back to returning the raw !block: text if the block file isn't found.
 */
function resolveBlockReferences(content, articleSlug, articlesDir) {
  return content.replace(BLOCK_REF_RE, (raw, ref) => {
    let blockSlug = articleSlug;
    let blockName = ref;

    const slashIndex = ref.indexOf('/');
    if (slashIndex !== -1) {
      blockSlug = ref.slice(0, slashIndex);
      blockName = ref.slice(slashIndex + 1);
    }

    const blockPath = path.join(articlesDir, blockSlug, `${blockName}.md`);
    if (!fs.existsSync(blockPath)) return raw;

    try {
      const rawBlock = fs.readFileSync(blockPath, 'utf-8');
      const parsed = matter(rawBlock);
      return parsed.content;
    } catch {
      return raw;
    }
  });
}

// ── Article helpers ─────────────────────────────────────────────

function isMarkdownFile(name) {
  return name.endsWith('.md');
}

/** Check if a data source uses the new folder-per-article layout */
function hasFolderArticles(sourceDir) {
  const articlesDir = path.join(sourceDir, 'articles');
  return fs.existsSync(articlesDir) && fs.statSync(articlesDir).isDirectory();
}

/** Get the articles subfolder path */
function getArticlesDir(sourceDir) {
  return path.join(sourceDir, 'articles');
}

/** Read the raw frontmatter + content from either folder-based or flat article */
function readArticleRaw(sourceDir, slug) {
  // 1. Try folder-based: articles/{slug}/ARTICLE.md
  if (hasFolderArticles(sourceDir)) {
    const folderPath = path.join(getArticlesDir(sourceDir), slug, 'ARTICLE.md');
    if (fs.existsSync(folderPath)) {
      const raw = fs.readFileSync(folderPath, 'utf-8');
      return { raw, filePath: folderPath, isFolder: true };
    }
  }

  // 2. Try legacy flat: {slug}.md (at sourceDir or articles/ as a flat directory)
  const legacyPaths = [
    path.join(sourceDir, `${slug}.md`),
    path.join(getArticlesDir(sourceDir), `${slug}.md`),
  ];

  for (const legacyPath of legacyPaths) {
    if (fs.existsSync(legacyPath)) {
      const raw = fs.readFileSync(legacyPath, 'utf-8');
      return { raw, filePath: legacyPath, isFolder: false };
    }
  }

  return null;
}

/** List all article slugs from a data source */
function listArticleSlugs(sourceDir) {
  if (hasFolderArticles(sourceDir)) {
    const articlesDir = getArticlesDir(sourceDir);
    return fs.readdirSync(articlesDir)
      .filter(entry => {
        const statPath = path.join(articlesDir, entry);
        return fs.statSync(statPath).isDirectory();
      });
  }

  // Legacy flat files
  return fs.readdirSync(sourceDir)
    .filter(f => isMarkdownFile(f))
    .map(f => f.replace(/\.md$/, ''));
}

// ── Public API ──────────────────────────────────────────────────

export function listArticles() {
  const sourceDir = resolveDataSource();
  if (!sourceDir) return [];

  const slugs = listArticleSlugs(sourceDir);
  const articles = [];

  for (const slug of slugs) {
    const result = readArticleRaw(sourceDir, slug);
    if (!result) continue;

    const parsed = matter(result.raw);
    const data = parsed.data;
    const content = parsed.content;
    const excerpt = content.slice(0, 200).replace(/[#*`]/g, '').trim() + '...';

    const tagModel = normalizeArticleTagModel({
      tags: data.tags || [],
      relationships: data.relationships || [],
    });

    articles.push({
      slug,
      title: data.title || slug,
      tags: tagModel.displayTags,
      displayTags: tagModel.displayTags,
      semanticTags: tagModel.semanticTags,
      relationships: tagModel.relationships,
      excerpt,
      created: data.created,
      modified: data.modified,
    });
  }

  return articles;
}

function stripLeadingHeading(content) {
  const lines = content.split('\n');
  let index = 0;

  while (index < lines.length && lines[index].trim() === '') {
    index += 1;
  }

  if (index < lines.length && /^#\s+/.test(lines[index])) {
    lines.splice(index, 1);

    while (index < lines.length && lines[index].trim() === '') {
      lines.splice(index, 1);
    }
  }

  return lines.join('\n').trimStart();
}

function extractHeadings(content) {
  const headings = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2],
      });
    }
  }
  return headings;
}

export function getArticle(slug) {
  const sourceDir = resolveDataSource();
  if (!sourceDir) return null;

  const result = readArticleRaw(sourceDir, slug);
  if (!result) return null;

  const parsed = matter(result.raw);
  const data = parsed.data;
  let content = parsed.content;
  const tagModel = normalizeArticleTagModel({
    tags: data.tags || [],
    relationships: data.relationships || [],
  });

  // Resolve !block: references when the article lives under articles/
  const articlesDir = getArticlesDir(sourceDir);
  const articlesDirExists = fs.existsSync(articlesDir);
  if (articlesDirExists && content.includes('!block:')) {
    content = resolveBlockReferences(content, slug, articlesDir);
  }

  const bodyContent = stripLeadingHeading(content);
  const html = marked.parse(bodyContent);
  const headings = extractHeadings(bodyContent);

  const allArticles = listArticles();
  const related = rankRelatedArticles(
    { slug, semanticTags: tagModel.semanticTags, displayTags: tagModel.displayTags },
    allArticles
  );

  return {
    slug,
    title: data.title || slug,
    tags: tagModel.displayTags,
    displayTags: tagModel.displayTags,
    semanticTags: tagModel.semanticTags,
    relationships: tagModel.relationships,
    content,
    html,
    headings,
    related,
    created: data.created,
    modified: data.modified,
  };
}

export function getSourceInfo() {
  const sourceDir = resolveDataSource();
  if (!sourceDir) return { path: null, count: 0 };

  const count = listArticles().length;
  return { path: sourceDir, count };
}

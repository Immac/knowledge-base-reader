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

export function listArticles() {
  const sourceDir = resolveDataSource();
  if (!sourceDir) {
    return [];
  }

  const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.md'));
  const articles = [];

  for (const file of files) {
    const filePath = path.join(sourceDir, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = matter(raw);
    const data = parsed.data;
    const content = parsed.content;
    const slug = file.replace(/\.md$/, '');

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
  if (!sourceDir) {
    return null;
  }

  const filePath = path.join(sourceDir, `${slug}.md`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = matter(raw);
  const data = parsed.data;
  const content = parsed.content;
  const tagModel = normalizeArticleTagModel({
    tags: data.tags || [],
    relationships: data.relationships || [],
  });

  const bodyContent = stripLeadingHeading(content);
  const html = marked.parse(bodyContent);
  const headings = extractHeadings(bodyContent);

  const allArticles = listArticles();
  const related = rankRelatedArticles({ slug, semanticTags: tagModel.semanticTags, displayTags: tagModel.displayTags }, allArticles);

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
  if (!sourceDir) {
    return { path: null, count: 0 };
  }

  const count = listArticles().length;
  return { path: sourceDir, count };
}
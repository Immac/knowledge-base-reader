// Generate deterministic tag colors from tag text
function generateTagColor(key, value, isDark) {
  // Hash function that considers both key and value
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i) + (i + 1) * 7;
  }
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i) + (i + 1) * 13;
  }
  hash = Math.abs(hash);

  const h = hash % 360;
  
  if (isDark) {
    // Dark theme: brighter, more saturated for visibility on dark bg
    const s = 60 + (hash % 25); // 60-85%
    const l = 50 + (hash % 20); // 50-70%
    return `hsl(${h}, ${s}%, ${l}%)`;
  } else {
    // Light theme: softer, less saturated for readability
    const s = 40 + (hash % 30); // 40-70%
    const l = 35 + (hash % 20); // 35-55%
    return `hsl(${h}, ${s}%, ${l}%)`;
  }
}

function isDarkStyle(style) {
  return ['calm', 'violet', 'forest'].includes(style);
}

// State
let articles = [];
let currentArticle = null;
let style = localStorage.getItem('kb-reader-style') || 'calm';
let layout = localStorage.getItem('kb-reader-layout') || 'focus';

// DOM elements
const filterInput = document.getElementById('filter');
const articleListEl = document.getElementById('article-list');
const overviewEl = document.getElementById('overview');
const articleViewEl = document.getElementById('article-view');
const articleCardsEl = document.getElementById('article-cards');
const articleTitleEl = document.getElementById('article-title');
const articleMetaEl = document.getElementById('article-meta');
const tagChipsEl = document.getElementById('tag-chips');
const sectionsEl = document.getElementById('sections');
const sectionListEl = document.getElementById('section-list');
const articleBodyEl = document.getElementById('article-body');
const relatedRailEl = document.getElementById('related-rail');
const relatedListEl = document.getElementById('related-list');
const sidebarEl = document.getElementById('sidebar');
const settingsPanelEl = document.getElementById('settings-panel');
const hamburgerEl = document.getElementById('hamburger');
const settingsBtnEl = document.getElementById('settings-btn');
const styleOptionsEl = document.getElementById('style-options');
const layoutOptionsEl = document.getElementById('layout-options');

function applyStyle() {
  document.documentElement.setAttribute('data-style', style);
  localStorage.setItem('kb-reader-style', style);
}

function applyLayout() {
  document.documentElement.classList.remove('layout-focus', 'layout-cards', 'layout-magazine', 'layout-notebook', 'layout-dashboard');
  document.documentElement.classList.add(`layout-${layout}`);
  localStorage.setItem('kb-reader-layout', layout);
}

function renderTagChips(container, tags, clickable = false) {
  container.innerHTML = '';
  const tagEntries = Object.entries(tags);
  const dark = isDarkStyle(style);

  for (const [key, value] of tagEntries) {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.textContent = `${key}:${value}`;
    chip.style.background = generateTagColor(key, value, dark);

    if (clickable) {
      chip.addEventListener('click', () => {
        filterInput.value = `${key}:${value}`;
        filterArticles();
      });
    }

    container.appendChild(chip);
  }
}

function renderArticlesList(items) {
  articleListEl.innerHTML = '';
  for (const article of items) {
    const li = document.createElement('li');
    li.textContent = article.title;
    li.addEventListener('click', () => navigateTo(article.slug));
    articleListEl.appendChild(li);
  }
}

function renderArticleCards(items) {
  articleCardsEl.innerHTML = '';
  for (const article of items) {
    const card = document.createElement('div');
    card.className = 'article-card';
    card.innerHTML = `
      <h3>${article.title}</h3>
      <p class="excerpt">${article.excerpt}</p>
      <div class="tag-chips"></div>
    `;

    const chips = card.querySelector('.tag-chips');
    renderTagChips(chips, article.tags, true);

    card.addEventListener('click', () => navigateTo(article.slug));
    articleCardsEl.appendChild(card);
  }
}

function renderSections(headings) {
  if (!headings || headings.length === 0) {
    sectionsEl.classList.add('hidden');
    return;
  }

  sectionsEl.classList.remove('hidden');
  sectionListEl.innerHTML = '';

  for (const h of headings) {
    const li = document.createElement('li');
    li.textContent = h.text;
    li.style.paddingLeft = `${(h.level - 1) * 0.5 + 0.25}rem`;
    li.addEventListener('click', () => {
      const el = document.getElementById(`section-${h.text.toLowerCase().replace(/\s+/g, '-')}`);
      el?.scrollIntoView({ behavior: 'smooth' });
    });
    sectionListEl.appendChild(li);
  }
}

function renderRelated(related) {
  if (!related || related.length === 0) {
    relatedRailEl.classList.add('hidden');
    return;
  }

  relatedRailEl.classList.remove('hidden');
  relatedListEl.innerHTML = '';

  for (const r of related) {
    const li = document.createElement('li');
    li.textContent = r.title;
    li.addEventListener('click', () => navigateTo(r.slug));
    relatedListEl.appendChild(li);
  }
}

function renderTagFilterQuery(tag) {
  filterInput.value = tag;
  filterArticles();
}

function filterArticles() {
  const query = filterInput.value.toLowerCase();
  let filtered = articles;

  if (query) {
    // Check for key:value pattern
    if (query.includes(':')) {
      const [key, value] = query.split(':');
      filtered = articles.filter(a => {
        const tags = Object.entries(a.tags);
        return tags.some(
          ([k, v]) => k.toLowerCase().includes(key) && v.toLowerCase().includes(value)
        );
      });
    } else {
      // Search in title or content
      filtered = articles.filter(
        a =>
          a.title.toLowerCase().includes(query) ||
          a.excerpt.toLowerCase().includes(query)
      );
    }
  }

  renderArticlesList(filtered);
  renderArticleCards(filtered);
}

async function loadArticle(slug) {
  const res = await fetch(`/api/articles/${slug}`);
  const data = await res.json();

  if (!data.ok) {
    articleViewEl.innerHTML = '<p>Article not found</p>';
    return;
  }

  currentArticle = data.article;
  overviewEl.classList.add('hidden');
  articleViewEl.classList.remove('hidden');

  articleTitleEl.textContent = currentArticle.title;
  articleMetaEl.textContent = `Last modified: ${new Date(currentArticle.modified).toLocaleDateString()}`;

  renderTagChips(tagChipsEl, currentArticle.tags);
  renderSections(currentArticle.headings);

  articleBodyEl.innerHTML = currentArticle.html;

  // Add IDs to headings for navigation
  articleBodyEl.querySelectorAll('h1, h2, h3').forEach(h => {
    h.id = `section-${h.textContent.toLowerCase().replace(/\s+/g, '-')}`;
  });

  renderRelated(currentArticle.related);
}

function navigateTo(slug) {
  window.location.hash = `/article/${slug}`;
}

function navigateToOverview() {
  window.location.hash = '';
}

async function loadArticles() {
  const res = await fetch('/api/articles');
  const data = await res.json();

  if (!data.ok) {
    articleCardsEl.innerHTML = '<p>No articles found</p>';
    return;
  }

  articles = data.articles;
  filterArticles();
}

function setupEventListeners() {
  // Navigation
  hamburgerEl.addEventListener('click', () => {
    sidebarEl.classList.toggle('open');
  });

  settingsBtnEl.addEventListener('click', () => {
    settingsPanelEl.classList.toggle('hidden');
  });

  // Filter
  filterInput.addEventListener('input', filterArticles);

  // Style picker
  styleOptionsEl.addEventListener('click', e => {
    if (e.target.classList.contains('style-btn')) {
      styleOptionsEl.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      style = e.target.dataset.style;
      applyStyle();
    }
  });

  // Layout picker
  layoutOptionsEl.addEventListener('click', e => {
    if (e.target.classList.contains('layout-btn')) {
      layoutOptionsEl.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      layout = e.target.dataset.layout;
      applyLayout();
    }
  });

  // Hash routing
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith('/article/')) {
      const slug = hash.slice(9);
      loadArticle(slug);
    } else {
      currentArticle = null;
      overviewEl.classList.remove('hidden');
      articleViewEl.classList.add('hidden');
    }
  });
}

function init() {
  applyStyle();
  applyLayout();

  styleOptionsEl.querySelector(`[data-style="${style}"]`)?.classList.add('active');
  layoutOptionsEl.querySelector(`[data-layout="${layout}"]`)?.classList.add('active');

  setupEventListeners();
  loadArticles();

  // Handle initial hash
  const hash = window.location.hash.slice(1);
  if (hash.startsWith('/article/')) {
    const slug = hash.slice(9);
    loadArticle(slug);
  }
}

init();
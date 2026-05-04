// Generate deterministic tag colors from tag text
function generateTagColor(key, value, isDark) {
  // Split influence: key affects hue, value modifies saturation/lightness
  let keyHash = 0;
  for (let i = 0; i < key.length; i++) {
    keyHash = ((keyHash << 5) - keyHash) + key.charCodeAt(i);
  }

  let valueHash = 0;
  for (let i = 0; i < value.length; i++) {
    valueHash = ((valueHash << 5) - valueHash) + value.charCodeAt(i);
  }

  // Key determines start hue, value determines end hue
  let startH = Math.abs(keyHash) % 360;
  let endH = Math.abs(valueHash) % 360;
  const valueMod = Math.abs(valueHash) % 30;

  let s, l;
  if (isDark) {
    // Dark theme: keep colors readable against dark bg with white text
    s = 50 + (valueMod % 20); // 50-70%
    l = 35 + (valueMod % 15); // 35-50%
  } else {
    // Light theme: softer for readability
    s = 35 + (valueMod % 35); // 35-70%
    l = 30 + (valueMod % 30); // 30-60%
  }

  // Calculate shortest path around wheel (avoid going through 0/360 which is gray)
  let diff = endH - startH;
  if (Math.abs(diff) > 180) {
    // If crossing center (gray), go the other way around
    if (diff > 0) {
      endH -= 360;
    } else {
      endH += 360;
    }
  }
  const midH = startH + (endH - startH) * 0.5; // midpoint on shortest path

  // Normalize all hue values to 0-360 for CSS
  const normalizeHue = h => ((h % 360) + 360) % 360;
  const gradient = `linear-gradient(90deg, hsl(${normalizeHue(startH)}, ${s}%, ${l}%) 0%, hsl(${normalizeHue(midH)}, ${s - 10}%, ${l + 5}%) 50%, hsl(${normalizeHue(endH)}, ${s}%, ${l}%) 100%)`;

  // Always use white text on dark themes (guaranteed readable)
  // Use dark text only on light themes
  const textColor = isDark ? '#ffffff' : '#1a1a1a';

  return { bg: gradient, text: textColor };
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
    const colors = generateTagColor(key, value, dark);
    chip.style.background = colors.bg;
    chip.style.color = colors.text;

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
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  
  for (const article of items) {
    const card = document.createElement('div');
    card.className = 'article-card';
    
    const modified = new Date(article.modified).getTime();
    const daysAgo = (now - modified) / DAY_MS;
    const isNew = daysAgo < 7;
    const isRecent = daysAgo < 30;
    
    let badges = '';
    if (isNew) {
      badges += `<span class="badge badge-new">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"></circle></svg>
        New
      </span>`;
    } else if (isRecent) {
      badges += `<span class="badge badge-edited">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 013 3"></path></svg>
        Edited
      </span>`;
    }
    
    card.innerHTML = `<h3>${article.title}</h3><p class="excerpt">${article.excerpt}</p><div class="badges">${badges}</div><div class="tag-chips"></div>`;

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
    if (query.includes(':')) {
      const [key, value] = query.split(':');
      filtered = articles.filter(a => {
        const tags = Object.entries(a.tags);
        return tags.some(([k, v]) => k.toLowerCase().includes(key) && v.toLowerCase().includes(value));
      });
    } else {
      filtered = articles.filter(a => a.title.toLowerCase().includes(query) || a.excerpt.toLowerCase().includes(query));
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
  hamburgerEl.addEventListener('click', () => {
    sidebarEl.classList.toggle('hidden');
  });

  settingsBtnEl.addEventListener('click', () => {
    settingsPanelEl.classList.toggle('hidden');
  });

  filterInput.addEventListener('input', filterArticles);

  styleOptionsEl.addEventListener('click', e => {
    if (e.target.classList.contains('style-btn')) {
      styleOptionsEl.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      style = e.target.dataset.style;
      applyStyle();
    }
  });

  layoutOptionsEl.addEventListener('click', e => {
    if (e.target.classList.contains('layout-btn')) {
      layoutOptionsEl.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      layout = e.target.dataset.layout;
      applyLayout();
    }
  });

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

  const hash = window.location.hash.slice(1);
  if (hash.startsWith('/article/')) {
    const slug = hash.slice(9);
    loadArticle(slug);
  }
}

init();
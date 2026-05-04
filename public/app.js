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
    if (diff > 0) {
      endH -= 360;
    } else {
      endH += 360;
    }
  }
  const midH = startH + (endH - startH) * 0.5;

  // Normalize all hue values to 0-360 for CSS
  const normalizeHue = h => ((h % 360) + 360) % 360;
  const gradient = `linear-gradient(90deg, hsl(${normalizeHue(startH)}, ${s}%, ${l}%) 0%, hsl(${normalizeHue(midH)}, ${s - 10}%, ${l + 5}%) 50%, hsl(${normalizeHue(endH)}, ${s}%, ${l}%) 100%)`;

  const textColor = isDark ? '#ffffff' : '#1a1a1a';
  return { bg: gradient, text: textColor };
}

function isDarkStyle(name) {
  return ['dark', 'calm', 'violet', 'forest'].includes(name);
}

function parseDateLike(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function daysAgo(value) {
  const ms = Date.now() - parseDateLike(value).getTime();
  return ms / (24 * 60 * 60 * 1000);
}

function articleBadgeMarkup(article) {
  const age = daysAgo(article.modified);

  if (age < 7) {
    return `<span class="badge badge-new"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"></circle></svg>New</span>`;
  }

  if (age < 30) {
    return `<span class="badge badge-edited"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 013 3"></path></svg>Edited</span>`;
  }

  return '';
}

// State
let articles = [];
let currentArticle = null;
let style = localStorage.getItem('kb-reader-style') || 'dark';
let layout = localStorage.getItem('kb-reader-layout') || 'focus';
let currentFilter = '';

// DOM elements
const filterInput = document.getElementById('filter');
const articleListEl = document.getElementById('article-list');
const landingPageEl = document.getElementById('landing-page');
const landingStatsEl = document.getElementById('landing-stats');
const latestArticleCardsEl = document.getElementById('latest-article-cards');
const allArticleCardsEl = document.getElementById('article-cards');
const articleViewEl = document.getElementById('article-view');
const articleTitleEl = document.getElementById('article-title');
const articleMetaEl = document.getElementById('article-meta');
const tagChipsEl = document.getElementById('tag-chips');
const sidebarSectionsEl = document.getElementById('sidebar-sections');
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
const showAllBtnEl = document.getElementById('show-all-btn');

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
  const dark = isDarkStyle(style);

  for (const [key, value] of Object.entries(tags || {})) {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.textContent = `${key}:${value}`;
    const colors = generateTagColor(key, value, dark);
    chip.style.background = colors.bg;
    chip.style.color = colors.text;

    if (clickable) {
      chip.addEventListener('click', evt => {
        evt.stopPropagation();
        filterInput.value = `${key}:${value}`;
        currentFilter = filterInput.value;
        filterArticles();
        showLandingPage();
      });
    }

    container.appendChild(chip);
  }
}

function createArticleCard(article) {
  const card = document.createElement('div');
  card.className = 'article-card';
  const badges = articleBadgeMarkup(article);
  card.innerHTML = `
    <h3>${article.title}</h3>
    <p class="excerpt">${article.excerpt}</p>
    <div class="badges">${badges}</div>
    <div class="tag-chips"></div>
  `;

  renderTagChips(card.querySelector('.tag-chips'), article.tags, true);
  card.addEventListener('click', () => navigateTo(article.slug));
  return card;
}

function renderArticleCards(container, items) {
  container.innerHTML = '';
  for (const article of items) {
    container.appendChild(createArticleCard(article));
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

function renderLandingPage(items = articles) {
  const sorted = [...items].sort((a, b) => parseDateLike(b.modified) - parseDateLike(a.modified));
  const latest = sorted.slice(0, 6);

  landingStatsEl.innerHTML = `
    <div class="landing-stat"><strong>${items.length}</strong><span>Articles</span></div>
    <div class="landing-stat"><strong>${latest.length}</strong><span>Latest updates</span></div>
    <div class="landing-stat"><strong>${Math.max(0, items.filter(a => daysAgo(a.modified) < 7).length)}</strong><span>New this week</span></div>
  `;

  renderArticleCards(latestArticleCardsEl, latest);
  renderArticleCards(allArticleCardsEl, items);
}

function showLandingPage() {
  landingPageEl.classList.remove('hidden');
  articleViewEl.classList.add('hidden');
  articleListEl.classList.remove('hidden');
  sidebarSectionsEl.classList.add('hidden');
}

function showArticlePage() {
  landingPageEl.classList.add('hidden');
  articleViewEl.classList.remove('hidden');
  articleListEl.classList.add('hidden');
  sidebarSectionsEl.classList.remove('hidden');
}

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function createSectionItem(heading) {
  const li = document.createElement('li');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'section-link';
  button.textContent = heading.text;
  button.addEventListener('click', () => {
    const el = document.getElementById(`section-${slugify(heading.text)}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  li.appendChild(button);
  return li;
}

function renderSections(headings) {
  if (!headings || headings.length === 0) {
    sidebarSectionsEl.classList.add('hidden');
    sectionListEl.innerHTML = '';
    return;
  }

  sidebarSectionsEl.classList.remove('hidden');
  sectionListEl.innerHTML = '';

  const root = sectionListEl;
  const stack = [{ level: 0, list: root }];

  for (const heading of headings) {
    while (stack.length > 1 && heading.level <= stack[stack.length - 1].level) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];
    const li = createSectionItem(heading);
    parent.list.appendChild(li);

    const nextHeading = headings[headings.indexOf(heading) + 1];
    if (nextHeading && nextHeading.level > heading.level) {
      const nested = document.createElement('ul');
      li.appendChild(nested);
      stack.push({ level: heading.level, list: nested });
    }
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

function filterArticles() {
  const query = currentFilter.trim().toLowerCase();
  let filtered = articles;

  if (query) {
    if (query.includes(':')) {
      const [key, value] = query.split(':');
      filtered = articles.filter(a => Object.entries(a.tags || {}).some(([k, v]) => k.toLowerCase().includes(key) && v.toLowerCase().includes(value)));
    } else {
      filtered = articles.filter(a => a.title.toLowerCase().includes(query) || a.slug.toLowerCase().includes(query) || (a.excerpt || '').toLowerCase().includes(query));
    }
  }

  renderArticlesList(filtered);
  renderLandingPage(filtered);
}

async function loadArticle(slug) {
  const res = await fetch(`/api/articles/${slug}`);
  const data = await res.json();

  if (!data.ok) {
    articleTitleEl.textContent = 'Article not found';
    articleMetaEl.textContent = '';
    tagChipsEl.innerHTML = '';
    articleBodyEl.innerHTML = '<p>We could not find that article.</p>';
    sidebarSectionsEl.classList.add('hidden');
    relatedRailEl.classList.add('hidden');
    showArticlePage();
    return;
  }

  currentArticle = data.article;
  showArticlePage();

  articleTitleEl.textContent = currentArticle.title;
  articleMetaEl.textContent = `Last modified: ${new Date(currentArticle.modified).toLocaleDateString()}`;
  renderTagChips(tagChipsEl, currentArticle.tags);
  renderSections(currentArticle.headings);
  articleBodyEl.innerHTML = currentArticle.html;

  articleBodyEl.querySelectorAll('h1, h2, h3').forEach(h => {
    h.id = `section-${slugify(h.textContent)}`;
  });

  renderRelated(currentArticle.related);
}

function navigateTo(slug) {
  window.location.hash = `/article/${slug}`;
}

function navigateToLanding() {
  window.location.hash = '';
}

async function loadArticles() {
  const res = await fetch('/api/articles');
  const data = await res.json();

  if (!data.ok) {
    allArticleCardsEl.innerHTML = '<p>No articles found</p>';
    latestArticleCardsEl.innerHTML = '<p>No articles found</p>';
    return;
  }

  articles = [...data.articles].sort((a, b) => parseDateLike(b.modified) - parseDateLike(a.modified));
  currentFilter = filterInput.value;
  filterArticles();
}

function setupEventListeners() {
  hamburgerEl.addEventListener('click', () => {
    sidebarEl.classList.toggle('hidden');
  });

  settingsBtnEl.addEventListener('click', () => {
    settingsPanelEl.classList.toggle('hidden');
  });

  filterInput.addEventListener('input', () => {
    currentFilter = filterInput.value;
    filterArticles();
  });

  showAllBtnEl?.addEventListener('click', () => {
    filterInput.value = '';
    currentFilter = '';
    filterArticles();
    landingPageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  styleOptionsEl.addEventListener('click', e => {
    if (e.target.classList.contains('style-btn')) {
      styleOptionsEl.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      style = e.target.dataset.style;
      applyStyle();
      renderLandingPage();
      if (currentArticle) loadArticle(currentArticle.slug);
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
      loadArticle(hash.slice(9));
    } else {
      currentArticle = null;
      showLandingPage();
    }
  });
}

function init() {
  applyStyle();
  applyLayout();

  styleOptionsEl.querySelectorAll('.style-btn').forEach(button => button.classList.remove('active'));
  layoutOptionsEl.querySelectorAll('.layout-btn').forEach(button => button.classList.remove('active'));

  styleOptionsEl.querySelector(`[data-style="${style}"]`)?.classList.add('active');
  layoutOptionsEl.querySelector(`[data-layout="${layout}"]`)?.classList.add('active');

  setupEventListeners();
  loadArticles();

  const hash = window.location.hash.slice(1);
  if (hash.startsWith('/article/')) {
    loadArticle(hash.slice(9));
  } else {
    showLandingPage();
  }
}

init();
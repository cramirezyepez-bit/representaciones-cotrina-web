import { PROJECTS } from './projects-data.js';

// ---------- state ----------
let activeCat = 'todos';
let searchTerm = '';
let currentProject = null;
let activeService = 'todas';
let lbItems = [];
let lbIndex = 0;

// ---------- elements ----------
const viewProjects = document.getElementById('viewProjects');
const viewProject = document.getElementById('viewProject');

const catFilters = document.getElementById('catFilters');
const projectGrid = document.getElementById('projectGrid');
const emptyStateEl = document.getElementById('emptyState');

const factSheet = document.getElementById('factSheet');
const serviceFilters = document.getElementById('serviceFilters');
const projectGallery = document.getElementById('projectGallery');

const btnSearchToggle = document.getElementById('btnSearchToggle');
const searchRow = document.getElementById('searchRow');
const searchInput = document.getElementById('searchInput');
const searchClose = document.getElementById('searchClose');

const lightbox = document.getElementById('lightbox');
const lbImage = document.getElementById('lbImage');
const lbTitle = document.getElementById('lbTitle');
const lbCount = document.getElementById('lbCount');
const lbClose = document.getElementById('lbClose');
const lbPrev = document.getElementById('lbPrev');
const lbNext = document.getElementById('lbNext');

const btnShare = document.getElementById('btnShare');
const toast = document.getElementById('toast');
const btnMenu = document.getElementById('btnMenu');
const menuDropdown = document.getElementById('menuDropdown');
const menuShare = document.getElementById('menuShare');

document.getElementById('year').textContent = new Date().getFullYear();

// ============================================================
// ROUTING — #/  (grid)   |   #/proyecto/<slug>  (detail)
// ============================================================
function parseHash() {
  const h = window.location.hash.replace(/^#\/?/, '');
  const parts = h.split('/').filter(Boolean);
  if (parts[0] === 'proyecto' && parts[1]) return { view: 'project', slug: parts[1] };
  return { view: 'grid' };
}

function render() {
  const route = parseHash();
  if (route.view === 'project') {
    const project = PROJECTS.find(p => p.slug === route.slug);
    if (!project) { window.location.hash = '#/'; return; }
    showProjectView(project);
  } else {
    showGridView();
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);

// ============================================================
// GRID VIEW
// ============================================================
function showGridView() {
  viewProjects.hidden = false;
  viewProject.hidden = true;
  applyGridFilters();
}

catFilters.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  activeCat = btn.dataset.cat;
  [...catFilters.children].forEach(b => b.classList.toggle('is-active', b === btn));
  applyGridFilters();
});

function applyGridFilters() {
  const term = searchTerm.trim().toLowerCase();
  const filtered = PROJECTS.filter(p => {
    const matchesCat = activeCat === 'todos' || p.group === activeCat;
    const matchesSearch = !term ||
      p.name.toLowerCase().includes(term) ||
      p.district.toLowerCase().includes(term) ||
      p.location.toLowerCase().includes(term) ||
      p.groupLabel.toLowerCase().includes(term) ||
      p.usageType.toLowerCase().includes(term) ||
      p.services.some(s => s.toLowerCase().includes(term));
    return matchesCat && matchesSearch;
  });
  renderProjectGrid(filtered);
}

function renderProjectGrid(list) {
  projectGrid.innerHTML = '';
  emptyStateEl.hidden = list.length > 0;

  list.forEach((p, i) => {
    const card = document.createElement('a');
    card.href = `#/proyecto/${p.slug}`;
    card.className = 'project-card';
    card.style.animationDelay = `${Math.min(i, 12) * 40}ms`;

    card.innerHTML = `
      <div class="pc-image">
        <picture>
          <source srcset="${p.coverWebp}" type="image/webp">
          <img src="${p.cover}" alt="${p.name} — Cotrina Proyectos" loading="lazy" decoding="async" width="900" height="675">
        </picture>
        <span class="pc-badge">${p.groupLabel}</span>
        <div class="pc-overlay-name"><h3 class="pc-name">${p.name.toUpperCase()}</h3></div>
      </div>
    `;
    projectGrid.appendChild(card);
  });
}

// ============================================================
// PROJECT DETAIL VIEW
// ============================================================
function showProjectView(project) {
  currentProject = project;
  activeService = 'todas';
  viewProjects.hidden = true;
  viewProject.hidden = false;

  renderFactSheet(project);
  renderServiceFilters(project);
  applyServiceFilter();
}

function renderFactSheet(p) {
  const rows = [
    ['Ubicación', p.location],
    ['Tipo de proyecto', p.type],
    ['Servicios realizados', p.services.join(', ')],
    p.area ? ['Área', p.area] : null,
    p.architect ? ['Arquitecto', p.architect] : null,
    p.builder ? ['Constructora', p.builder] : null,
  ].filter(Boolean);

  factSheet.innerHTML = `
    <div class="fs-image" style="background-image:url('${p.coverFull}')"></div>
    <div class="fs-body">
      <span class="pc-badge fs-badge">${p.groupLabel}</span>
      <h1 class="fs-name">${p.name}</h1>
      <p class="fs-desc">${p.description}</p>
      <dl class="fs-grid">
        ${rows.map(([k, v]) => `<div class="fs-row"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}
      </dl>
    </div>
  `;
}

function renderServiceFilters(p) {
  serviceFilters.innerHTML = '';
  const todas = document.createElement('button');
  todas.className = 'filter-btn is-active';
  todas.dataset.service = 'todas';
  todas.textContent = 'Todas';
  serviceFilters.appendChild(todas);

  p.services.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.service = s;
    btn.textContent = s;
    serviceFilters.appendChild(btn);
  });
}

serviceFilters.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  activeService = btn.dataset.service;
  [...serviceFilters.children].forEach(b => b.classList.toggle('is-active', b === btn));
  applyServiceFilter();
});

function applyServiceFilter() {
  if (!currentProject) return;
  const items = activeService === 'todas'
    ? currentProject.items
    : currentProject.items.filter(i => i.service === activeService);
  renderProjectGallery(items);
}

function renderProjectGallery(items) {
  projectGallery.innerHTML = '';
  lbItems = items;

  items.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'gallery-item';
    el.style.animationDelay = `${Math.min(i, 12) * 30}ms`;

    el.innerHTML = `
      <picture>
        <source srcset="${item.thumbWebp}" type="image/webp">
        <img src="${item.thumb}" alt="${item.title} — ${currentProject.name}" loading="lazy" decoding="async" width="900" height="675">
      </picture>
      <div class="overlay"><span class="item-cat">${item.service}</span></div>
    `;
    el.addEventListener('click', () => openLightbox(i));
    projectGallery.appendChild(el);
  });
}

// ============================================================
// LIGHTBOX
// ============================================================
function openLightbox(index) {
  lbIndex = index;
  showLightboxItem();
  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.style.overflow = '';
}

function showLightboxItem() {
  const item = lbItems[lbIndex];
  lbImage.src = item.full;
  lbImage.alt = `${item.title} — ${currentProject ? currentProject.name : ''}`;
  lbTitle.textContent = `${currentProject ? currentProject.name + ' · ' : ''}${item.service}`;
  lbCount.textContent = `${lbIndex + 1} / ${lbItems.length}`;
}

function nextItem() { lbIndex = (lbIndex + 1) % lbItems.length; showLightboxItem(); }
function prevItem() { lbIndex = (lbIndex - 1 + lbItems.length) % lbItems.length; showLightboxItem(); }

lbClose.addEventListener('click', closeLightbox);
lbNext.addEventListener('click', nextItem);
lbPrev.addEventListener('click', prevItem);
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

document.addEventListener('keydown', (e) => {
  if (lightbox.hidden) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowRight') nextItem();
  if (e.key === 'ArrowLeft') prevItem();
});

let touchStartX = 0;
lightbox.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
lightbox.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) { dx < 0 ? nextItem() : prevItem(); }
}, { passive: true });

// ============================================================
// SEARCH (compact icon -> expandable row)
// ============================================================
btnSearchToggle.addEventListener('click', () => {
  const isHidden = searchRow.hidden;
  searchRow.hidden = !isHidden;
  btnSearchToggle.setAttribute('aria-expanded', String(isHidden));
  if (isHidden) searchInput.focus();
});

searchClose.addEventListener('click', () => {
  searchRow.hidden = true;
  btnSearchToggle.setAttribute('aria-expanded', 'false');
  searchInput.value = '';
  searchTerm = '';
  applyGridFilters();
});

searchInput.addEventListener('input', (e) => {
  searchTerm = e.target.value;
  if (window.location.hash.startsWith('#/proyecto/')) window.location.hash = '#/';
  applyGridFilters();
});

// ============================================================
// SHARE
// ============================================================
async function sharePortfolio() {
  const url = window.location.href;
  const title = currentProject ? `${currentProject.name} — Cotrina Proyectos` : 'Cotrina Proyectos — Portafolio de Proyectos';
  const text = currentProject
    ? `Mira el proyecto ${currentProject.name} de Cotrina Proyectos.`
    : 'Mira el portafolio de proyectos de Cotrina Proyectos.';

  if (navigator.share) {
    try { await navigator.share({ title, text, url }); return; } catch (err) { /* fall through */ }
  }
  try {
    await navigator.clipboard.writeText(url);
    showToast();
  } catch (err) {
    const tmp = document.createElement('input');
    tmp.value = url;
    document.body.appendChild(tmp);
    tmp.select();
    document.execCommand('copy');
    document.body.removeChild(tmp);
    showToast();
  }
}

function showToast() {
  toast.classList.add('is-visible');
  setTimeout(() => toast.classList.remove('is-visible'), 2400);
}

btnShare.addEventListener('click', sharePortfolio);
menuShare.addEventListener('click', () => {
  sharePortfolio();
  menuDropdown.hidden = true;
  btnMenu.setAttribute('aria-expanded', 'false');
});

btnMenu.addEventListener('click', (e) => {
  e.stopPropagation();
  const expanded = btnMenu.getAttribute('aria-expanded') === 'true';
  btnMenu.setAttribute('aria-expanded', String(!expanded));
  menuDropdown.hidden = expanded;
});

document.addEventListener('click', (e) => {
  if (!menuDropdown.hidden && !menuDropdown.contains(e.target) && e.target !== btnMenu) {
    menuDropdown.hidden = true;
    btnMenu.setAttribute('aria-expanded', 'false');
  }
});

// ---------- init ----------
render();

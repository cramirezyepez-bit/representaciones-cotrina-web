import { CATEGORIES, ITEMS } from './data.js';

// ---------- state ----------
let activeCat = 'todos';
let searchTerm = '';
let filtered = ITEMS.slice();
let lbIndex = 0;

// ---------- elements ----------
const filtersEl = document.getElementById('filters');
const galleryEl = document.getElementById('gallery');
const emptyStateEl = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');

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

// ---------- build category filter buttons ----------
CATEGORIES.forEach(cat => {
  const btn = document.createElement('button');
  btn.className = 'filter-btn';
  btn.dataset.cat = cat.slug;
  btn.textContent = cat.label;
  filtersEl.appendChild(btn);
});

filtersEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  activeCat = btn.dataset.cat;
  [...filtersEl.children].forEach(b => b.classList.toggle('is-active', b === btn));
  applyFilters();
});

searchInput.addEventListener('input', (e) => {
  searchTerm = e.target.value.trim().toLowerCase();
  applyFilters();
});

function applyFilters() {
  filtered = ITEMS.filter(item => {
    const matchesCat = activeCat === 'todos' || item.category === activeCat;
    const matchesSearch = !searchTerm ||
      item.title.toLowerCase().includes(searchTerm) ||
      catLabel(item.category).toLowerCase().includes(searchTerm);
    return matchesCat && matchesSearch;
  });
  renderGallery();
}

function catLabel(slug) {
  const c = CATEGORIES.find(c => c.slug === slug);
  return c ? c.label : slug;
}

// ---------- render grid ----------
function renderGallery() {
  galleryEl.innerHTML = '';
  emptyStateEl.hidden = filtered.length > 0;

  filtered.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'gallery-item';
    el.style.animationDelay = `${Math.min(i, 12) * 40}ms`;
    el.dataset.id = item.id;

    const img = document.createElement('img');
    img.src = item.thumb;
    img.alt = `${item.title} — Cotrina Proyectos`;
    img.loading = 'lazy';
    img.decoding = 'async';

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
      <span class="item-title">${item.title}</span>
      <span class="item-cat">${catLabel(item.category)}</span>
    `;

    el.appendChild(img);
    el.appendChild(overlay);
    el.addEventListener('click', () => openLightbox(item.id));
    galleryEl.appendChild(el);
  });
}

// ---------- lightbox ----------
function openLightbox(id) {
  lbIndex = filtered.findIndex(i => i.id === id);
  if (lbIndex === -1) return;
  showLightboxItem();
  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.style.overflow = '';
}

function showLightboxItem() {
  const item = filtered[lbIndex];
  lbImage.src = item.full;
  lbImage.alt = `${item.title} — Cotrina Proyectos`;
  lbTitle.textContent = `${item.title} · ${catLabel(item.category)}`;
  lbCount.textContent = `${lbIndex + 1} / ${filtered.length}`;
}

function nextItem() {
  lbIndex = (lbIndex + 1) % filtered.length;
  showLightboxItem();
}

function prevItem() {
  lbIndex = (lbIndex - 1 + filtered.length) % filtered.length;
  showLightboxItem();
}

lbClose.addEventListener('click', closeLightbox);
lbNext.addEventListener('click', nextItem);
lbPrev.addEventListener('click', prevItem);

lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});

document.addEventListener('keydown', (e) => {
  if (lightbox.hidden) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowRight') nextItem();
  if (e.key === 'ArrowLeft') prevItem();
});

// simple swipe support for mobile lightbox
let touchStartX = 0;
lightbox.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].clientX;
}, { passive: true });

lightbox.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) {
    dx < 0 ? nextItem() : prevItem();
  }
}, { passive: true });

// ---------- share ----------
async function sharePortfolio() {
  const url = window.location.href;
  const shareData = {
    title: 'Cotrina Proyectos — Portafolio de Proyectos',
    text: 'Mira el portafolio de proyectos de Cotrina Proyectos: sistemas de vidrio y aluminio de alta gama.',
    url,
  };
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (err) {
      // user cancelled or share failed — fall through to copy
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    showToast();
  } catch (err) {
    // fallback for older browsers
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

// mobile hamburger -> dropdown with share / whatsapp
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
applyFilters();

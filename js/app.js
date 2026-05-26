import { on, start, navigate } from './router.js';
import { CATEGORIES }          from './categories.js';
import { renderHome }          from './views/home.js';
import { renderCollection }    from './views/collection.js';
import { renderForm }          from './views/form.js';
import { renderDetail }        from './views/detail.js';
import { toast }               from './components/toast.js';

// ── DOM-referencer ──────────────────────────────────────
const backBtn    = document.getElementById('back-btn');
const pageTitle  = document.getElementById('page-title');
const headerActs = document.getElementById('header-actions');
const navItems   = document.querySelectorAll('.nav-item');
const overlay    = document.getElementById('sheet-overlay');
const sheet      = document.getElementById('bottom-sheet');
const sheetBody  = document.getElementById('sheet-content');

// ── Header-hjælpere (sendes ind i hvert view) ───────────
const headerAPI = {
  setTitle:   (t)    => { pageTitle.textContent = t; },
  setBack:    (show) => { backBtn.classList.toggle('hidden', !show); },
  setActions: (html) => { headerActs.innerHTML = html; },
};

backBtn.addEventListener('click', () => history.back());

// ── Bottom-sheet ────────────────────────────────────────
export function showSheet(html) {
  sheetBody.innerHTML = html;
  overlay.classList.remove('hidden');
  sheet.classList.remove('hidden');
  requestAnimationFrame(() => {
    overlay.classList.add('visible');
    sheet.classList.add('visible');
  });
}

export function hideSheet() {
  overlay.classList.remove('visible');
  sheet.classList.remove('visible');
  overlay.addEventListener('transitionend', () => {
    overlay.classList.add('hidden');
    sheet.classList.add('hidden');
    sheetBody.innerHTML = '';
  }, { once: true });
}

overlay.addEventListener('click', hideSheet);

// ── Kategori-vælger (bottom sheet) ──────────────────────
function showCategoryPicker() {
  const grid = CATEGORIES.map((cat) => `
    <div class="category-picker-item" data-cat="${cat.id}">
      <span class="category-picker-item-icon">${cat.icon}</span>
      <span class="category-picker-item-name">${cat.label}</span>
    </div>
  `).join('');

  showSheet(`
    <div class="category-picker-title">Hvad vil du tilføje?</div>
    <div class="category-picker-grid">${grid}</div>
  `);

  sheetBody.querySelectorAll('.category-picker-item').forEach((item) => {
    item.addEventListener('click', () => {
      hideSheet();
      navigate(`add/${item.dataset.cat}`);
    });
  });
}

// ── Aktiv kategori (sættes når man er inde i en samling/detalje) ──
let activeCategoryId = null;

// ── Nav-aktivering ───────────────────────────────────────
function updateNav(route) {
  navItems.forEach((item) => {
    item.classList.toggle('active', item.dataset.route === route);
  });
}

// ── Tilføj-knap i nav: gå direkte til aktiv kategori, ellers vis vælger ──
const addNavBtn = document.querySelector('.nav-item[data-route="add"]');
addNavBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  if (activeCategoryId) {
    navigate(`add/${activeCategoryId}`);
  } else {
    navigate('add');
  }
});

// ── Ruter ────────────────────────────────────────────────
on('home', () => {
  activeCategoryId = null;
  updateNav('home');
  renderHome(headerAPI);
});

on('add', () => {
  updateNav('add');
  showCategoryPicker();
  renderHome(headerAPI);
});

on('add/:categoryId', ({ categoryId }) => {
  updateNav('add');
  renderForm({ categoryId, editId: null, ...headerAPI });
});

on('edit/:id', ({ id }) => {
  updateNav('');
  renderForm({ categoryId: null, editId: id, ...headerAPI });
});

on('collection/:categoryId', ({ categoryId }) => {
  activeCategoryId = categoryId;
  updateNav('home');
  renderCollection({ categoryId, ...headerAPI });
});

on('detail/:id', async ({ id }) => {
  updateNav('home');
  renderDetail({ id, ...headerAPI });
});

// ── PWA: Registrer Service Worker ────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// ── Persistent storage: bed browseren om ALDRIG at slette data ──
if (navigator.storage?.persist) {
  navigator.storage.persist().then((granted) => {
    if (!granted) console.info('Persistent storage ikke tildelt — data kan slettes af browseren ved pladsmangel.');
  });
}

// ── Start ─────────────────────────────────────────────────
start();

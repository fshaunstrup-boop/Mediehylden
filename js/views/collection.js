import { getCategoryById }    from '../categories.js';
import { getItemsByCategory } from '../db.js';
import { navigate }           from '../router.js';
import { mediaCard }          from '../components/mediaCard.js';
import { sortBar, sortItems } from '../components/sortBar.js';

export async function renderCollection({ categoryId, setTitle, setBack, setActions }) {
  const cat = getCategoryById(categoryId);
  if (!cat) { navigate('home'); return; }

  setTitle(`${cat.icon} ${cat.label}`);
  setBack(true);

  setActions(`
    <button class="icon-btn" id="hdr-add-btn" aria-label="Tilføj ${cat.label}">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>
  `);

  document.getElementById('hdr-add-btn')?.addEventListener('click', () => {
    if (activeTab) sessionStorage.setItem('mh_defaultStatus', activeTab);
    else           sessionStorage.removeItem('mh_defaultStatus');
    navigate(`add/${categoryId}`);
  });

  const main = document.getElementById('app-main');
  main.scrollTop = 0;
  main.replaceChildren();

  let items      = await getItemsByCategory(categoryId);
  let filterText = '';
  let sortField  = 'dateAdded';
  let sortDir    = 'desc';
  let activeTab  = null;   // null = Alle

  // ── Søgefelt ───────────────────────────────────────────
  const searchWrap = document.createElement('div');
  searchWrap.style.cssText = 'padding: var(--sp-4) var(--sp-4) 0; background: var(--bg-base);';
  searchWrap.innerHTML = `
    <div class="collection-search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input type="search" placeholder="Søg i ${cat.label.toLowerCase()}..." id="col-search">
    </div>
  `;

  // ── Status-faner (kun hvis kategorien har statusTabs) ──
  let tabsEl = null;
  if (cat.statusTabs?.length) {
    tabsEl = document.createElement('div');
    tabsEl.className = 'status-tabs';

    function renderTabs() {
      tabsEl.innerHTML = cat.statusTabs.map(tab => `
        <button type="button" class="status-tab${activeTab === tab.value ? ' active' : ''}" data-val="${tab.value ?? ''}">
          ${tab.label}
        </button>
      `).join('');

      tabsEl.querySelectorAll('.status-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          activeTab = btn.dataset.val === '' ? null : btn.dataset.val;
          renderTabs();
          renderGrid();
        });
      });
    }

    renderTabs();
  }

  // ── Sort-bar ───────────────────────────────────────────
  const { el: sortEl } = sortBar({
    field: sortField, direction: sortDir,
    onChange: (f, d) => { sortField = f; sortDir = d; renderGrid(); },
    extraOptions: cat.sortOptions ?? [],
  });

  // ── Grid ───────────────────────────────────────────────
  const gridWrap = document.createElement('div');
  gridWrap.style.cssText = 'padding: var(--sp-4);';

  function renderGrid() {
    let filtered = items.filter(item =>
      item.title.toLowerCase().includes(filterText) ||
      Object.values(item).some(v => typeof v === 'string' && v.toLowerCase().includes(filterText))
    );

    // Filtrer på aktiv fane
    if (activeTab !== null) {
      filtered = filtered.filter(item => item.status === activeTab);
    }

    const sorted = sortItems(filtered, sortField, sortDir);

    if (sorted.length === 0) {
      const tabLabel = cat.statusTabs?.find(t => t.value === activeTab)?.label;
      gridWrap.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${cat.icon}</div>
          <div class="empty-state-title">${filterText ? 'Ingen resultater' : `Ingen ${tabLabel ? tabLabel.toLowerCase() : 'medier endnu'}`}</div>
          <div class="empty-state-text">${
            filterText
              ? `Ingen ${cat.label.toLowerCase()} matcher din søgning.`
              : activeTab
                ? `Sæt status til "${activeTab}" når du tilføjer et medie.`
                : `Tryk på + for at tilføje din første.`
          }</div>
        </div>
      `;
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'media-grid' + (cat.cardImageRatio === '1/1' ? ' media-grid--square' : '');
    for (const item of sorted) grid.appendChild(mediaCard(item));
    gridWrap.replaceChildren(grid);
  }

  renderGrid();

  // Sæt alt ind i main
  main.appendChild(searchWrap);
  if (tabsEl) main.appendChild(tabsEl);
  main.appendChild(sortEl);
  main.appendChild(gridWrap);

  // Søg med debounce
  const searchInput = searchWrap.querySelector('#col-search');
  let debounce;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      filterText = searchInput.value.toLowerCase().trim();
      renderGrid();
    }, 200);
  });
}

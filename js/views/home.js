import { CATEGORIES }  from '../categories.js';
import { getStats }    from '../db.js';
import { navigate }    from '../router.js';

export async function renderHome({ setTitle, setBack, setActions }) {
  setTitle('Mediehylden');
  setBack(false);
  setActions('');

  const stats = await getStats();
  const main  = document.getElementById('app-main');

  const page = document.createElement('div');
  page.className = 'page';

  // Hilsen + samlet tæller
  const totalText = stats.total === 0
    ? 'Ingen medier endnu — tilføj noget!'
    : `${stats.total} ${stats.total === 1 ? 'medie' : 'medier'} i din samling`;

  const avgText = stats.avgRating
    ? ` · Gns. ★ ${stats.avgRating}`
    : '';

  page.innerHTML = `
    <div class="home-greeting">
      <div class="home-greeting-title">Din samling</div>
      <div class="home-greeting-sub">${totalText}${avgText}</div>
    </div>
    <div class="section-title">Kategorier</div>
    <div class="category-grid" id="cat-grid"></div>
  `;

  const grid = page.querySelector('#cat-grid');

  for (const cat of CATEGORIES) {
    const count  = stats.byCategory[cat.id] ?? 0;
    const card   = document.createElement('div');
    card.className = 'category-card';
    card.style.setProperty('--cat-color', cat.color);

    card.innerHTML = `
      <div class="category-card-icon">${cat.icon}</div>
      <div class="category-card-body">
        <div class="category-card-count">${count}</div>
        <div class="category-card-name">${cat.label}</div>
        <div class="category-card-stats">${count === 1 ? '1 medie' : `${count} medier`}</div>
      </div>
    `;

    card.addEventListener('click', () => navigate(`collection/${cat.id}`));
    grid.appendChild(card);
  }

  main.replaceChildren(page);
}

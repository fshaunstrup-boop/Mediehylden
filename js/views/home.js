import { CATEGORIES }  from '../categories.js';
import { getStats, getAllItems } from '../db.js';
import { navigate }    from '../router.js';

export async function renderHome({ setTitle, setBack, setActions }) {
  setTitle('Mediehylden');
  setBack(false);
  setActions('');

  const stats = await getStats();
  const main  = document.getElementById('app-main');
  const page  = document.createElement('div');
  page.className = 'page';

  const totalText = stats.total === 0
    ? 'Ingen medier endnu — tilføj noget!'
    : `${stats.total} ${stats.total === 1 ? 'medie' : 'medier'} i din samling`;
  const avgText = stats.avgRating ? ` · Gns. ★ ${stats.avgRating}` : '';

  page.innerHTML = `
    <div class="home-greeting">
      <div class="home-greeting-title">Din samling</div>
      <div class="home-greeting-sub">${totalText}${avgText}</div>
    </div>
    <div class="section-title">Kategorier</div>
    <div class="category-grid" id="cat-grid"></div>
    <div style="margin-top:32px;padding-bottom:16px;">
      <button id="btn-export" style="width:100%;padding:14px;background:#1e1e2e;border:1px solid #333;border-radius:12px;color:#fff;font-size:15px;cursor:pointer;">⬇️ Eksportér data</button>
    </div>
  `;

  const grid = page.querySelector('#cat-grid');
  for (const cat of CATEGORIES) {
    const count = stats.byCategory[cat.id] ?? 0;
    const card  = document.createElement('div');
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

  page.querySelector('#btn-export').addEventListener('click', async () => {
    try {
      const all  = await getAllItems();
      const json = JSON.stringify({ version: 1, exported: Date.now(), items: all }, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `mediehylden-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Eksport fejlede'); }
  });

  main.replaceChildren(page);
}

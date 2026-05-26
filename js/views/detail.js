import { getCategoryById, getSubtitle } from '../categories.js';
import { getItem, deleteItem }          from '../db.js';
import { navigate }                     from '../router.js';
import { toast }                        from '../components/toast.js';
import { showSheet, hideSheet }         from '../app.js';

export async function renderDetail({ id, setTitle, setBack, setActions }) {
  const item = await getItem(id);
  if (!item) { navigate('home'); return; }

  const cat = getCategoryById(item.category);
  if (!cat) { navigate('home'); return; }

  setTitle(cat.label);
  setBack(true);

  setActions(`
    <button class="icon-btn" id="hdr-edit-btn" aria-label="Rediger">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </button>
  `);

  document.getElementById('hdr-edit-btn')?.addEventListener('click', () =>
    navigate(`edit/${id}`)
  );

  const subtitle = getSubtitle(item);
  const main = document.getElementById('app-main');
  main.scrollTop = 0;

  const page = document.createElement('div');

  // ── Hero-billede ───────────────────────────────────────
  const hero = document.createElement('div');
  hero.className = 'detail-hero';
  if (item.image) {
    hero.innerHTML = `<img src="${item.image}" alt="${escHtml(item.title)}">`;
  } else {
    hero.innerHTML = `<div class="detail-hero-placeholder">${cat.icon}</div>`;
  }
  page.appendChild(hero);

  // ── Body ───────────────────────────────────────────────
  const body = document.createElement('div');
  body.className = 'detail-body';

  // Titel + undertitel + samlet score
  body.innerHTML = `
    <div class="detail-header">
      <div class="detail-title">${escHtml(item.title)}</div>
      ${subtitle ? `<div class="detail-subtitle">${escHtml(subtitle)}</div>` : ''}
      ${item.rating != null
        ? `<div class="detail-rating">
             <span class="detail-rating-number">★ ${item.rating.toFixed(1)}</span>
             <span class="detail-rating-label">/ 10</span>
           </div>`
        : `<div class="detail-rating" style="opacity:0.5">
             <span class="detail-rating-label">Ikke bedømt</span>
           </div>`
      }
    </div>
  `;

  // ── Rating-nedbrydning ─────────────────────────────────
  const ratings = item.ratings;
  if (ratings) {
    const breakdown = document.createElement('div');
    breakdown.className = 'detail-rating-breakdown';

    // Kategorier (film, spil, musik)
    const cats = ratings.categories ?? {};
    if (Object.keys(cats).length) {
      const sec = document.createElement('div');
      sec.className = 'breakdown-section';
      sec.innerHTML = `<div class="breakdown-title">Kategorier</div>` +
        Object.entries(cats).map(([name, score]) => breakdownRow(name, score)).join('');
      breakdown.appendChild(sec);
    }

    // Sæsoner (serier)
    const scoredSeasons = (ratings.seasons ?? []).filter(s => s.score != null);
    if (scoredSeasons.length) {
      const sec = document.createElement('div');
      sec.className = 'breakdown-section';
      sec.innerHTML = `<div class="breakdown-title">Sæsoner</div>` +
        scoredSeasons.map(s => {
          const subRows = Object.entries(s.categories ?? {})
            .map(([n, v]) => breakdownRow(n, v, true)).join('');
          return breakdownRow(`Sæson ${s.number}`, s.score) + subRows;
        }).join('');
      breakdown.appendChild(sec);
    }

    // Numre (musik)
    const scoredTracks = (ratings.tracks ?? []).filter(t => t.score != null);
    if (scoredTracks.length) {
      const sec = document.createElement('div');
      sec.className = 'breakdown-section';
      sec.innerHTML = `<div class="breakdown-title">Numre</div>` +
        scoredTracks.map((t, i) => breakdownRow(t.title, t.score, false, i + 1)).join('');
      breakdown.appendChild(sec);
    }

    if (breakdown.children.length) body.appendChild(breakdown);
  }

  // ── Metadata-tabel ─────────────────────────────────────
  const metaRows = cat.fields
    .filter((f) => f.type !== 'textarea' && item[f.id] != null && item[f.id] !== '')
    .map((f) => `
      <div class="detail-meta-row">
        <span class="detail-meta-key">${f.label}</span>
        <span class="detail-meta-value">${escHtml(String(item[f.id]))}</span>
      </div>
    `).join('');

  const dateStr = new Date(item.dateAdded).toLocaleDateString('da-DK', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const metaExtra = `
    <div class="detail-meta-row">
      <span class="detail-meta-key">Tilføjet</span>
      <span class="detail-meta-value">${dateStr}</span>
    </div>
  `;

  if (metaRows || metaExtra) {
    const meta = document.createElement('div');
    meta.className = 'detail-meta';
    meta.innerHTML = metaRows + metaExtra;
    body.appendChild(meta);
  }

  // Beskrivelse
  const desc = item.description || '';
  if (desc) {
    const descEl = document.createElement('p');
    descEl.className = 'detail-description';
    descEl.textContent = desc;
    body.appendChild(descEl);
  }

  // ── Handlingsknapper ───────────────────────────────────
  const actions = document.createElement('div');
  actions.className = 'detail-actions';
  actions.innerHTML = `
    <button class="btn btn-secondary" id="det-edit-btn">Rediger</button>
    <button class="btn btn-danger"    id="det-del-btn">Slet</button>
  `;
  body.appendChild(actions);

  const spacer = document.createElement('div');
  spacer.style.height = 'var(--sp-8)';
  body.appendChild(spacer);

  page.appendChild(body);
  main.replaceChildren(page);

  document.getElementById('det-edit-btn').addEventListener('click', () =>
    navigate(`edit/${id}`)
  );

  document.getElementById('det-del-btn').addEventListener('click', () => {
    showSheet(`
      <div class="confirm-sheet">
        <div class="confirm-sheet-title">Slet "${escHtml(item.title)}"?</div>
        <div class="confirm-sheet-msg">Dette kan ikke fortrydes. Mediet fjernes permanent fra din samling.</div>
        <div class="confirm-sheet-actions">
          <button class="btn btn-danger"    id="conf-del-yes">Ja, slet</button>
          <button class="btn btn-secondary" id="conf-del-no">Annuller</button>
        </div>
      </div>
    `);

    document.getElementById('conf-del-yes').addEventListener('click', async () => {
      await deleteItem(id);
      hideSheet();
      toast(`${cat.icon} "${item.title}" slettet`, '🗑️');
      navigate(`collection/${item.category}`);
    });
    document.getElementById('conf-del-no').addEventListener('click', hideSheet);
  });
}

// ── Hjælpefunktioner ──────────────────────────────────────
function breakdownRow(name, score, isSub = false, num = null) {
  const pct = ((score / 10) * 100).toFixed(0);
  return `
    <div class="breakdown-row${isSub ? ' breakdown-subrow' : ''}">
      ${num != null ? `<span class="breakdown-num">${num}</span>` : ''}
      <span class="breakdown-name">${escHtml(String(name))}</span>
      <span class="breakdown-bar-wrap">
        <span class="breakdown-bar" style="width:${pct}%"></span>
      </span>
      <span class="breakdown-val">${score.toFixed(1)}</span>
    </div>
  `;
}

function escHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

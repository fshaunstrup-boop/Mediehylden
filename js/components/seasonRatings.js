/**
 * Sæson-bedømmelse til serier.
 * Hver sæson har sine egne kategori-slidere.
 * Samlet score = gennemsnit af sæsonernes scores.
 *
 * Brug:
 *   const comp = seasonRatings(categoryNames, initialSeasons)
 *   comp.getSeasons()  // [{ number, categories, score }]
 *   comp.getAvg()      // number | null
 */
import { categoryRatings } from './categoryRatings.js';

export function seasonRatings(categoryNames, initialSeasons = []) {
  const el = document.createElement('div');
  el.className = 'season-ratings';

  // Intern tilstand
  const seasons = initialSeasons.map(s => ({
    number:     s.number,
    categories: { ...s.categories },
    score:      s.score ?? null,
    expanded:   false,
  }));

  function getAvg() {
    const vals = seasons.filter(s => s.score != null).map(s => s.score);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  function addSeason() {
    seasons.push({ number: seasons.length + 1, categories: {}, score: null, expanded: true });
    render();
  }

  function removeSeason(idx) {
    seasons.splice(idx, 1);
    seasons.forEach((s, i) => { s.number = i + 1; });
    render();
  }

  function toggleExpand(idx) {
    seasons[idx].expanded = !seasons[idx].expanded;
    render();
  }

  function updateOverallAvg() {
    const avg = getAvg();
    const el2 = el.querySelector('.season-overall-val');
    if (el2) {
      el2.textContent = avg != null ? avg.toFixed(1) : '—';
      el2.classList.toggle('has-value', avg != null);
    }
  }

  function render() {
    const overall = getAvg();

    el.innerHTML = `
      <div class="season-ratings-header">
        <span class="season-ratings-label">Sæsoner</span>
        <span class="season-overall-val${overall != null ? ' has-value' : ''}">${overall != null ? overall.toFixed(1) : '—'}</span>
      </div>
    `;

    // Byg sæson-rækker
    seasons.forEach((season, idx) => {
      const item = document.createElement('div');
      item.className = `season-item${season.expanded ? ' expanded' : ''}`;

      // Header-linje
      const hdr = document.createElement('div');
      hdr.className = 'season-item-header';
      hdr.innerHTML = `
        <button type="button" class="season-expand-btn" data-idx="${idx}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="${season.expanded ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}"/>
          </svg>
        </button>
        <span class="season-item-title">Sæson ${season.number}</span>
        <span class="season-item-score${season.score != null ? ' has-value' : ''}">
          ${season.score != null ? season.score.toFixed(1) : '—'}
        </span>
        <button type="button" class="season-remove-btn" data-idx="${idx}" aria-label="Fjern sæson">×</button>
      `;
      item.appendChild(hdr);

      // Kategori-ratings (vises kun når expanded)
      if (season.expanded) {
        const catComp = categoryRatings(categoryNames, season.categories, (cats, avg) => {
          season.categories = cats;
          season.score = avg;
          // Opdater sæsonens score-display
          const scoreEl = item.querySelector('.season-item-score');
          if (scoreEl) {
            scoreEl.textContent = avg != null ? avg.toFixed(1) : '—';
            scoreEl.classList.toggle('has-value', avg != null);
          }
          updateOverallAvg();
        });
        catComp.el.classList.add('season-cat-ratings');
        item.appendChild(catComp.el);
      }

      el.appendChild(item);
    });

    // "Tilføj sæson"-knap
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-secondary btn-sm season-add-btn';
    addBtn.textContent = '+ Tilføj sæson';
    addBtn.addEventListener('click', addSeason);
    el.appendChild(addBtn);

    // Bind knapper
    el.querySelectorAll('.season-expand-btn').forEach(btn => {
      btn.addEventListener('click', () => toggleExpand(+btn.dataset.idx));
    });
    el.querySelectorAll('.season-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => removeSeason(+btn.dataset.idx));
    });
  }

  render();

  return {
    el,
    getSeasons: () => seasons.map(({ number, categories, score }) => ({ number, categories, score })),
    getAvg,
  };
}

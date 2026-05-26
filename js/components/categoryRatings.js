/**
 * Kategori-bedømmelse — chip-toggles + slidere
 *
 * Brug:
 *   const comp = categoryRatings(names, initial, onChange)
 *   page.appendChild(comp.el)
 *   comp.getCategories()  // { 'Instruktion': 8.5, ... } — kun aktive
 *   comp.getAvg()         // number | null
 */
export function categoryRatings(names, initial = {}, onChange = null) {
  const el = document.createElement('div');
  el.className = 'cat-ratings';

  if (!names?.length) return { el, getCategories: () => ({}), getAvg: () => null };

  // Tilstand per kategori
  const state = names.map(name => ({
    name,
    active: initial[name] != null,
    value: initial[name] ?? null,
  }));

  function getAvg() {
    const vals = state.filter(s => s.active && s.value != null).map(s => s.value);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  function getCategories() {
    const out = {};
    for (const s of state) {
      if (s.active && s.value != null) out[s.name] = s.value;
    }
    return out;
  }

  function notify() {
    onChange?.(getCategories(), getAvg());
  }

  function updateAvgDisplay() {
    const avg = getAvg();
    const el2 = el.querySelector('.cat-avg-val');
    if (el2) {
      el2.textContent = avg != null ? avg.toFixed(1) : '—';
      el2.classList.toggle('has-value', avg != null);
    }
  }

  function render() {
    const avg = getAvg();
    const activeItems = state.filter(s => s.active);

    el.innerHTML = `
      <div class="cat-ratings-header">
        <span class="cat-ratings-label">Kategorier</span>
        <span class="cat-avg-val${avg != null ? ' has-value' : ''}">${avg != null ? avg.toFixed(1) : '—'}</span>
      </div>
      <div class="cat-chips">
        ${state.map((s, i) => `
          <button type="button" class="cat-chip${s.active ? ' active' : ''}" data-idx="${i}">
            ${s.name}
          </button>
        `).join('')}
      </div>
      ${activeItems.length ? `
        <div class="cat-sliders">
          ${activeItems.map(s => {
            const i = state.indexOf(s);
            const v = s.value ?? 7;
            return `
              <div class="cat-slider-row">
                <span class="cat-slider-name">${s.name}</span>
                <span class="cat-slider-val" data-idx="${i}">${v.toFixed(1)}</span>
                <input type="range" class="cat-slider rating-slider"
                  min="1" max="10" step="0.5"
                  value="${v}"
                  data-idx="${i}">
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
    `;

    // Chip-klik → toggle + re-render
    el.querySelectorAll('.cat-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = +btn.dataset.idx;
        state[idx].active = !state[idx].active;
        if (state[idx].active && state[idx].value == null) state[idx].value = 7.0;
        render();
        notify();
      });
    });

    // Slider → opdater value + display (ingen re-render)
    el.querySelectorAll('.cat-slider').forEach(slider => {
      slider.addEventListener('input', () => {
        const idx = +slider.dataset.idx;
        state[idx].value = parseFloat(slider.value);
        el.querySelector(`.cat-slider-val[data-idx="${idx}"]`).textContent =
          state[idx].value.toFixed(1);
        updateAvgDisplay();
        notify();
      });
    });
  }

  render();

  return { el, getCategories, getAvg };
}

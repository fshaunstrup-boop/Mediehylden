/**
 * Album track-bedømmelse med MusicBrainz-integration
 *
 * Brug:
 *   const comp = trackRatings(initialTracks, getSearchInfo)
 *   // getSearchInfo = () => ({ title, artist })
 *   comp.getTracks()   // [{ id, title, score }] — kun scorede
 *   comp.getAllTracks() // alle numre (inkl. u-scorede)
 *   comp.getAvg()      // number | null
 */

const MB_BASE = 'https://musicbrainz.org/ws/2';
const MB_UA   = 'Mediehylden/1.0 (mediehylden@example.com)';

export function trackRatings(initialTracks = [], getSearchInfo = () => ({})) {
  const el = document.createElement('div');
  el.className = 'track-ratings';

  let tracks    = initialTracks.length ? initialTracks.map(t => ({ ...t })) : [];
  let loading   = false;
  let fetchError = null;
  const hasSaved = initialTracks.length > 0;

  function getAvg() {
    const vals = tracks.filter(t => t.score != null).map(t => t.score);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  function updateAvgDisplay() {
    const avg = getAvg();
    const el2 = el.querySelector('.track-avg-val');
    if (el2) {
      el2.textContent = avg != null ? avg.toFixed(1) : '—';
      el2.classList.toggle('has-value', avg != null);
    }
  }

  async function fetchTracks() {
    const { title, artist } = getSearchInfo();
    if (!title) {
      fetchError = 'Udfyld titlen på albummet først.';
      render();
      return;
    }
    loading    = true;
    fetchError = null;
    render();

    try {
      // 1. Søg efter release
      const q   = `release:${encodeURIComponent(title)}${artist ? ` AND artist:${encodeURIComponent(artist)}` : ''}`;
      const res = await fetch(`${MB_BASE}/release?query=${q}&fmt=json&limit=5`, {
        headers: { 'User-Agent': MB_UA },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { releases } = await res.json();
      const release = releases?.[0];
      if (!release) throw new Error('Ingen udgivelse fundet');

      // 2. Hent recordings
      const res2 = await fetch(`${MB_BASE}/release/${release.id}?inc=recordings&fmt=json`, {
        headers: { 'User-Agent': MB_UA },
      });
      if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
      const data = await res2.json();

      const fetched = (data.media ?? []).flatMap(m =>
        (m.tracks ?? []).map(t => ({ id: t.recording?.id ?? t.id, title: t.title, score: 7 }))
      );

      if (!fetched.length) throw new Error('Ingen numre fundet');

      // Bevar evt. eksisterende scores hvis id matcher
      tracks = fetched.map(t => {
        const existing = initialTracks.find(e => e.id === t.id);
        return existing ? { ...t, score: existing.score ?? 7 } : t;
      });
    } catch (err) {
      fetchError = `Kunne ikke hente trackliste: ${err.message}`;
      console.warn('[trackRatings]', err);
    }

    loading = false;
    render();
  }

  function render() {
    const avg = getAvg();
    if (loading) {
      el.innerHTML = `
        <div class="track-ratings-header">
          <span class="track-ratings-label">Numre</span>
        </div>
        <div class="track-fetch-row">
          <span class="track-fetch-status">Henter trackliste fra MusicBrainz…</span>
        </div>
      `;
      return;
    }

    el.innerHTML = `
      <div class="track-ratings-header">
        <span class="track-ratings-label">Numre</span>
        <span class="track-avg-val${avg != null ? ' has-value' : ''}">${avg != null ? avg.toFixed(1) : '—'}</span>
      </div>
      ${fetchError ? `<p class="track-fetch-error">${escHtml(fetchError)}</p>` : ''}
      ${tracks.length ? `
        <div class="track-list">
          ${tracks.map((t, i) => `
            <div class="track-row">
              <span class="track-num">${i + 1}</span>
              <span class="track-title">${escHtml(t.title)}</span>
              <span class="track-val has-value" data-idx="${i}">
                ${(t.score ?? 7).toFixed(1)}
              </span>
              <input type="range" class="track-slider rating-slider"
                min="1" max="10" step="0.5"
                value="${t.score ?? 7}"
                data-idx="${i}">
            </div>
          `).join('')}
        </div>
      ` : ''}
      <button type="button" class="btn btn-secondary btn-sm track-fetch-btn">
        ${tracks.length ? '🔄 Opdater fra MusicBrainz' : '🎵 Hent numre automatisk'}
      </button>
    `;

    el.querySelector('.track-fetch-btn').addEventListener('click', fetchTracks);

    el.querySelectorAll('.track-slider').forEach(slider => {
      slider.addEventListener('input', () => {
        const idx = +slider.dataset.idx;
        tracks[idx].score = parseFloat(slider.value);
        el.querySelector(`.track-val[data-idx="${idx}"]`).textContent =
          tracks[idx].score.toFixed(1);
        el.querySelector(`.track-val[data-idx="${idx}"]`).classList.add('has-value');
        updateAvgDisplay();
      });
    });
  }

  // Auto-hent kun ved redigering (gemte numre mangler)
  if (hasSaved || (!hasSaved && false)) {
    render();
  } else {
    render();
  }

  return {
    el,
    getTracks:    () => tracks.filter(t => t.score != null),
    getAllTracks:  () => [...tracks],
    getAvg,
  };
}

function escHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

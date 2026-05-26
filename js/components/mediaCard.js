// Medie-kort — genbrugeligt kort til samlings-grid
// item: { id, title, image, rating, category, ...fields }

import { getCategoryById, getSubtitle } from '../categories.js';
import { navigate }                      from '../router.js';

export function mediaCard(item) {
  const el   = document.createElement('div');
  el.dataset.id = item.id;

  const cat      = getCategoryById(item.category);
  const isSquare = cat?.cardImageRatio === '1/1';
  el.className   = 'media-card' + (isSquare ? ' media-card--square' : '');
  const subtitle = getSubtitle(item);
  const rating   = item.rating;

  // Byg ekstra meta-linje fra cat.cardFields hvis defineret
  const metaParts = (cat?.cardFields ?? [])
    .map(fieldId => {
      const val = item[fieldId];
      if (val == null || val === '') return null;
      const fieldDef = cat.fields.find(f => f.id === fieldId);
      // Datofelt → formater pænt
      if (fieldDef?.type === 'date') {
        const d = new Date(val);
        if (isNaN(d)) return null;
        return 'Afsluttet ' + d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' });
      }
      return String(val);
    })
    .filter(Boolean);

  const metaLine = metaParts.length
    ? `<div class="media-card-meta">${metaParts.map(escHtml).join(' · ')}</div>`
    : '';

  el.innerHTML = `
    <div class="media-card-image">
      ${item.image
        ? `<img src="${item.image}" alt="${escHtml(item.title)}" loading="lazy">`
        : `<div class="media-card-placeholder">${categoryIcon(item.category)}</div>`
      }
      ${rating != null
        ? `<div class="media-card-rating">★ ${rating.toFixed(1)}</div>`
        : ''
      }
      <div class="media-card-info">
        <div class="media-card-title">${escHtml(item.title)}</div>
        ${subtitle ? `<div class="media-card-subtitle">${escHtml(subtitle)}</div>` : ''}
        ${metaLine}
      </div>
    </div>
  `;

  el.addEventListener('click', () => navigate(`detail/${item.id}`));

  return el;
}

function categoryIcon(id) {
  const icons = {
    music: '🎵', film: '🎬', series: '📺',
    games: '🎮', books: '📚', podcasts: '🎙️',
    escape: '🔐', concerts: '🎤',
  };
  return icons[id] ?? '📄';
}

function escHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

import { getCategoryById }              from '../categories.js';
import { addItem, getItem, updateItem } from '../db.js';
import { navigate }                     from '../router.js';
import { imagePicker }                  from '../components/imagePicker.js';
import { ratingInput }                  from '../components/ratingInput.js';
import { categoryRatings }              from '../components/categoryRatings.js';
import { trackRatings }                 from '../components/trackRatings.js';
import { seasonRatings }                from '../components/seasonRatings.js';
import { computeRating }                from '../utils/scoring.js';
import { toast }                        from '../components/toast.js';

export async function renderForm({ categoryId, editId, setTitle, setBack, setActions }) {
  const isEdit = !!editId;
  let existing = null;

  if (isEdit) {
    existing = await getItem(editId);
    if (!existing) { navigate('home'); return; }
    categoryId = existing.category;
  }

  const cat = getCategoryById(categoryId);
  if (!cat) { navigate('home'); return; }

  // Læs tab-kontekst (sat af collection.js når "+" klikkes fra en fane)
  const defaultStatus = sessionStorage.getItem('mh_defaultStatus') ?? null;
  sessionStorage.removeItem('mh_defaultStatus');

  const singularLabel = cat.singular || cat.label;
  setTitle(isEdit ? `Rediger ${singularLabel}` : `Tilføj ${singularLabel}`);
  setBack(true);
  setActions('');

  const main = document.getElementById('app-main');
  main.scrollTop = 0;
  const page = document.createElement('div');
  page.className = 'page';

  // ── Billede-picker ─────────────────────────────────────
  const picker = imagePicker(existing?.image ?? null, cat.imageFormat ?? {});
  page.appendChild(picker.el);

  // ── Titel ──────────────────────────────────────────────
  const titleGroup = document.createElement('div');
  titleGroup.className = 'form-group';
  titleGroup.style.marginTop = 'var(--sp-4)';
  titleGroup.innerHTML = `
    <label class="form-label" for="field-title">Titel <span class="required">*</span></label>
    <input class="form-input" id="field-title" type="text" placeholder="${cat.placeholder}" value="${esc(existing?.title ?? '')}">
  `;
  page.appendChild(titleGroup);

  const titleInput = titleGroup.querySelector('#field-title');
  titleInput.addEventListener('input', () => {
    picker.setQuery(`${titleInput.value} ${cat.imageQuery || cat.label}`);
  });
  picker.setQuery(`${existing?.title ?? ''} ${cat.imageQuery || cat.label}`);

  // ── Hurtig-tilstand: kun titel + billede + status ──────
  const hasQuickMode = !!cat.quickAddStatuses?.length;

  // Aktuel status — bruges til at afgøre om vi er i hurtig-tilstand
  let currentStatus = existing?.status ?? defaultStatus ?? null;

  // Sektion til detaljerede felter + bedømmelse (kan skjules)
  const detailSection = document.createElement('div');

  function isQuickMode() {
    return hasQuickMode && cat.quickAddStatuses.includes(currentStatus);
  }

  function updateVisibility() {
    detailSection.style.display = isQuickMode() ? 'none' : '';
  }

  // ── Kategori-specifikke felter ─────────────────────────
  // Statusfeltet separeres ud og vises altid (ved quick-mode kategorier)
  const statusField = cat.fields.find(f => f.id === 'status');
  const otherFields = cat.fields.filter(f => !hasQuickMode || f.id !== 'status');

  // Status vises altid øverst når quick-mode er aktiv
  if (hasQuickMode && statusField) {
    const opts = statusField.options.map(o =>
      `<option value="${esc(o)}" ${currentStatus === o ? 'selected' : ''}>${esc(o)}</option>`
    ).join('');
    const group = document.createElement('div');
    group.className = 'form-group';
    group.innerHTML = `
      <label class="form-label" for="field-status">Status</label>
      <select class="form-input" id="field-status">
        <option value="">Vælg...</option>
        ${opts}
      </select>
    `;
    page.appendChild(group);

    group.querySelector('#field-status').addEventListener('change', (e) => {
      currentStatus = e.target.value || null;
      updateVisibility();
    });
  }

  // ── Detaljerede felter (skjules i quick-mode) ──────────
  for (const field of otherFields) {
    const group = document.createElement('div');
    group.className = 'form-group';
    const req = field.required ? '<span class="required">*</span>' : '';

    if (field.type === 'textarea') {
      group.innerHTML = `
        <label class="form-label" for="field-${field.id}">${field.label} ${req}</label>
        <textarea class="form-input form-textarea" id="field-${field.id}" placeholder="${field.placeholder ?? ''}">${esc(existing?.[field.id] ?? '')}</textarea>
      `;
    } else if (field.type === 'select') {
      const opts = field.options.map(o =>
        `<option value="${esc(o)}" ${existing?.[field.id] === o ? 'selected' : ''}>${esc(o)}</option>`
      ).join('');
      group.innerHTML = `
        <label class="form-label" for="field-${field.id}">${field.label} ${req}</label>
        <select class="form-input" id="field-${field.id}">
          <option value="">Vælg...</option>
          ${opts}
        </select>
      `;
    } else {
      group.innerHTML = `
        <label class="form-label" for="field-${field.id}">${field.label} ${req}</label>
        <input class="form-input" id="field-${field.id}" type="${field.type}" placeholder="${field.placeholder ?? ''}" value="${esc(existing?.[field.id] ?? '')}">
      `;
    }

    detailSection.appendChild(group);
  }

  // ── Rating-sektion ─────────────────────────────────────
  const savedRatings = existing?.ratings ?? {};
  let catComp    = null;
  let trackComp  = null;
  let seasonComp = null;
  let legacyComp = null;

  const ratingSection = document.createElement('div');
  ratingSection.className = 'rating-section';
  const ratingDivider = document.createElement('div');
  ratingDivider.className = 'section-title';
  ratingDivider.textContent = 'Bedømmelse';
  ratingSection.appendChild(ratingDivider);

  if (cat.ratingCategories?.length) {
    if (cat.hasSeasons) {
      seasonComp = seasonRatings(cat.ratingCategories, savedRatings.seasons ?? []);
      ratingSection.appendChild(seasonComp.el);
    } else {
      catComp = categoryRatings(cat.ratingCategories, savedRatings.categories ?? {});
      ratingSection.appendChild(catComp.el);
      if (cat.hasTracks) {
        trackComp = trackRatings(
          savedRatings.tracks ?? [],
          () => ({
            title:  titleInput.value.trim(),
            artist: page.querySelector('#field-artist')?.value.trim() ?? '',
          })
        );
        ratingSection.appendChild(trackComp.el);
      }
    }
  } else {
    legacyComp = ratingInput(existing?.rating ?? null);
    ratingSection.appendChild(legacyComp.el);
  }

  detailSection.appendChild(ratingSection);

  page.appendChild(detailSection);
  updateVisibility();  // anvend initial tilstand

  // ── Gem-knap ───────────────────────────────────────────
  const saveBtn = document.createElement('button');
  saveBtn.className  = 'btn btn-primary';
  saveBtn.style.marginTop = 'var(--sp-4)';
  saveBtn.textContent = isEdit ? 'Gem ændringer' : `Tilføj ${singularLabel} til samling`;

  saveBtn.addEventListener('click', async () => {
    const title = titleInput.value.trim();
    if (!title) {
      titleInput.focus();
      titleInput.style.borderColor = 'var(--error)';
      setTimeout(() => { titleInput.style.borderColor = ''; }, 1500);
      toast('Titel er påkrævet', '⚠️');
      return;
    }

    const data = { title, category: categoryId, image: picker.getImage() };

    // Status (fra det altid-synlige felt)
    if (hasQuickMode) {
      const statusEl = page.querySelector('#field-status');
      data.status = statusEl?.value || null;
    }

    // Øvrige felter (kun hvis synlige)
    if (!isQuickMode()) {
      for (const field of otherFields) {
        const el = detailSection.querySelector(`#field-${field.id}`);
        if (!el) continue;
        const raw = el.value.trim();
        data[field.id] = field.type === 'number' ? (raw ? parseFloat(raw) : null) : (raw || null);
      }
    }

    // Ratings (kun hvis detaljerne er synlige)
    if (!isQuickMode()) {
      const ratingsData = {};
      let computedScore = null;

      if (cat.ratingCategories?.length) {
        if (cat.hasSeasons && seasonComp) {
          ratingsData.seasons = seasonComp.getSeasons();
          computedScore = seasonComp.getAvg();
        } else {
          if (catComp)   ratingsData.categories = catComp.getCategories();
          if (trackComp) ratingsData.tracks = trackComp.getAllTracks();
          computedScore = computeRating(categoryId, ratingsData);
        }
        data.ratings = ratingsData;
        data.rating  = computedScore;
      } else if (legacyComp) {
        data.rating = legacyComp.getValue();
      }
    }

    saveBtn.disabled    = true;
    saveBtn.textContent = 'Gemmer...';

    try {
      if (isEdit) {
        await updateItem(editId, data);
        toast('Ændringer gemt', '✅');
        navigate(`detail/${editId}`);
      } else {
        await addItem(data);
        toast(`${cat.icon} Tilføjet til ${cat.label}!`, '✅');
        navigate(`collection/${categoryId}`);
      }
    } catch (err) {
      console.error(err);
      toast('Noget gik galt — prøv igen', '❌');
      saveBtn.disabled    = false;
      saveBtn.textContent = isEdit ? 'Gem ændringer' : 'Tilføj til samling';
    }
  });

  page.appendChild(saveBtn);

  const spacer = document.createElement('div');
  spacer.style.height = 'var(--sp-8)';
  page.appendChild(spacer);

  main.replaceChildren(page);
}

function esc(str) {
  return String(str ?? '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

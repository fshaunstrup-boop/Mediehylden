// Billede-picker med crop-modal
//
// Flow:
//   1. Bruger trykker Google / URL / Upload
//   2. Et billede vælges
//   3. Crop-modal åbner — brugeren justerer med træk og klem
//   4. Bekræft → canvas renderer det synlige udsnit → gemmes som base64
//
// imageFormat = { ratio, outputSize }
//   ratio:      bredde/højde — 2/3 = portræt (default), 1 = kvadrat (album)
//   outputSize: outputbredde i pixels — 600 (default), 3000 (album)

const DEFAULTS = { ratio: 2 / 3, outputSize: 600 };

export function imagePicker(initial = null, imageFormat = {}) {
  const { ratio, outputSize } = { ...DEFAULTS, ...imageFormat };

  const wrapper = document.createElement('div');
  wrapper.className = 'image-picker-wrapper';

  let savedImage = initial;
  let urlVisible = false;

  // ── Render hoved-UI ──────────────────────────────────────
  function render() {
    const hasImg = !!savedImage;
    // Beregn aspect-ratio-streng til CSS (fx "2/3" eller "1/1")
    const cssRatio = ratio === 1 ? '1/1' : '2/3';

    wrapper.innerHTML = `
      ${hasImg ? `
        <div class="img-preview has-image" style="aspect-ratio:${cssRatio}">
          <img src="${savedImage}" alt="Valgt billede" style="object-position:${ratio === 1 ? 'center' : 'top center'}">
          <button class="img-edit-overlay" id="img-change-btn" type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Skift billede
          </button>
        </div>
      ` : ''}

      <div class="img-actions">
        <button class="btn btn-secondary btn-sm" id="img-google-btn" type="button">🔍 Google</button>
        <button class="btn btn-secondary btn-sm" id="img-url-btn"    type="button">🔗 URL</button>
        <button class="btn btn-secondary btn-sm" id="img-upload-btn" type="button">📁 Upload</button>
      </div>

      ${urlVisible ? `
        <div class="img-url-row">
          <input id="img-url-input" type="url" class="form-input" placeholder="Indsæt billed-URL her...">
          <button class="btn btn-secondary btn-sm" id="img-url-ok" type="button">Hent</button>
        </div>
      ` : ''}

      <input type="file" id="img-file-input" accept="image/*" style="display:none">
    `;

    // Google Billeder
    wrapper.querySelector('#img-google-btn').addEventListener('click', () => {
      const q = wrapper.dataset.query || 'billede';
      window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}&tbm=isch&tbs=isz:l`, '_blank');
      urlVisible = true;
      render();
      setTimeout(() => wrapper.querySelector('#img-url-input')?.focus(), 60);
    });

    // Vis/skjul URL-felt
    wrapper.querySelector('#img-url-btn').addEventListener('click', () => {
      urlVisible = !urlVisible;
      render();
      if (urlVisible) setTimeout(() => wrapper.querySelector('#img-url-input')?.focus(), 60);
    });

    // Hent URL og åbn cropper
    if (urlVisible) {
      const input = wrapper.querySelector('#img-url-input');
      const ok    = wrapper.querySelector('#img-url-ok');
      const load  = async () => {
        const url = input.value.trim();
        if (!url) return;
        ok.textContent = '...';
        ok.disabled    = true;
        await openCropperFor(url);
        ok.textContent = 'Hent';
        ok.disabled    = false;
      };
      ok.addEventListener('click', load);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') load(); });
    }

    // Upload → direkte til cropper
    wrapper.querySelector('#img-upload-btn').addEventListener('click', () => {
      wrapper.querySelector('#img-file-input').click();
    });
    wrapper.querySelector('#img-file-input').addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const dataUrl = await fileToDataUrl(file);
      await openCropperFor(dataUrl);
    });
  }

  // ── Åbn cropper med en kilde-URL/dataURL ─────────────────
  async function openCropperFor(src) {
    const result = await showCropper(src, ratio, outputSize);
    if (result) {
      savedImage = result;
      urlVisible  = false;
      render();
      const m = document.getElementById('app-main');
      if (m) m.scrollTop = 0;
      requestAnimationFrame(() => { if (m) m.scrollTop = 0; });
    }
  }

  render();

  return {
    el:       wrapper,
    getImage: () => savedImage,
    setQuery: (q) => { wrapper.dataset.query = q; },
  };
}

// ── Fil → base64 dataURL ─────────────────────────────────────
function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = (e) => res(e.target.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ══════════════════════════════════════════════════════════════
//  CROP MODAL
// ══════════════════════════════════════════════════════════════

function showCropper(src, ratio, outputSize) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'crop-modal';
    document.body.appendChild(modal);

    const appMain = document.getElementById('app-main');
    if (appMain) {
      appMain.style.overflow = 'hidden';
      appMain.scrollTop = 0;
    }

    // ── Beregn crop-rammens skærm-størrelse ──────────────────
    const maxW  = Math.min(window.innerWidth - 32, 440);
    const cropW = maxW;
    const cropH = Math.round(cropW / ratio);

    modal.innerHTML = `
      <div class="crop-header">
        <button class="crop-cancel" type="button">Annuller</button>
        <span class="crop-title">Tilpas billede</span>
        <button class="crop-reset"  type="button">Nulstil</button>
      </div>
      <p class="crop-hint">Træk for at flytte · Klem for at zoome</p>
      <div class="crop-frame" id="crop-frame" style="width:${cropW}px;height:${cropH}px">
        <img id="crop-img" draggable="false" crossorigin="anonymous">
        <div class="crop-grid-overlay"></div>
      </div>
      <div class="crop-footer">
        <button class="btn btn-primary" id="crop-confirm" type="button">Gem beskæring</button>
      </div>
    `;

    const frame   = modal.querySelector('#crop-frame');
    const img     = modal.querySelector('#crop-img');
    const confirm = modal.querySelector('#crop-confirm');
    const cancel  = modal.querySelector('.crop-cancel');
    const reset   = modal.querySelector('.crop-reset');

    let scale    = 1;
    let minScale = 1;
    let offsetX  = 0;
    let offsetY  = 0;
    let imgNatW  = 0;
    let imgNatH  = 0;

    function applyTransform() {
      const dispW = imgNatW * scale;
      const dispH = imgNatH * scale;
      const left  = (cropW - dispW) / 2 + offsetX;
      const top   = (cropH - dispH) / 2 + offsetY;
      img.style.transform = '';
      img.style.left      = `${left}px`;
      img.style.top       = `${top}px`;
      img.style.width     = `${dispW}px`;
      img.style.height    = `${dispH}px`;
    }

    function clamp() {
      const hw = (imgNatW * scale) / 2;
      const hh = (imgNatH * scale) / 2;
      const mx = Math.max(0, hw - cropW / 2);
      const my = Math.max(0, hh - cropH / 2);
      offsetX  = Math.max(-mx, Math.min(mx, offsetX));
      offsetY  = Math.max(-my, Math.min(my, offsetY));
    }

    function resetView() {
      scale   = minScale;
      offsetX = 0;
      offsetY = 0;
      applyTransform();
    }

    img.onload = () => {
      imgNatW  = img.naturalWidth;
      imgNatH  = img.naturalHeight;
      minScale = Math.max(cropW / imgNatW, cropH / imgNatH);
      resetView();
    };

    img.onerror = () => {
      frame.innerHTML = `<div class="crop-error">Billedet kunne ikke hentes.<br>Prøv at uploade det i stedet.</div>`;
      confirm.disabled = true;
    };

    img.src = src;

    // ── Pointer-events ───────────────────────────────────────
    const active = {};

    frame.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      frame.setPointerCapture(e.pointerId);
      active[e.pointerId] = { x: e.clientX, y: e.clientY };
    });

    frame.addEventListener('pointermove', (e) => {
      if (!active[e.pointerId]) return;
      const prev = active[e.pointerId];
      active[e.pointerId] = { x: e.clientX, y: e.clientY };

      const pts = Object.values(active);
      if (pts.length === 1) {
        offsetX += e.clientX - prev.x;
        offsetY += e.clientY - prev.y;
      } else if (pts.length === 2) {
        const [a, b]  = pts;
        const newDist = Math.hypot(b.x - a.x, b.y - a.y);
        const prevPts = Object.entries(active).map(([id, p]) =>
          id === String(e.pointerId) ? prev : p
        );
        const oldDist = Math.hypot(prevPts[1].x - prevPts[0].x, prevPts[1].y - prevPts[0].y);
        if (oldDist > 0) scale = Math.max(minScale, scale * (newDist / oldDist));
      }

      clamp();
      applyTransform();
    });

    const endPointer = (e) => { delete active[e.pointerId]; };
    frame.addEventListener('pointerup',     endPointer);
    frame.addEventListener('pointercancel', endPointer);

    let lastTap = 0;
    frame.addEventListener('pointerdown', (e) => {
      const now = Date.now();
      if (now - lastTap < 300 && Object.keys(active).length <= 1) resetView();
      lastTap = now;
    });

    function closeModal(result) {
      modal.classList.add('crop-modal-out');
      modal.addEventListener('animationend', () => {
        modal.remove();
        if (appMain) {
          appMain.scrollTop = 0;
          appMain.style.overflow = '';
          appMain.scrollTop = 0;
        }
        resolve(result);
      }, { once: true });
    }

    cancel.addEventListener('click', () => closeModal(null));
    reset.addEventListener('click', resetView);

    confirm.addEventListener('click', () => {
      try {
        const result = renderCrop(img, scale, offsetX, offsetY, cropW, cropH, imgNatW, imgNatH, ratio, outputSize);
        closeModal(result);
      } catch {
        closeModal(src);
      }
    });

    requestAnimationFrame(() => modal.classList.add('crop-modal-in'));
  });
}

// ── Renderer det synlige udsnit til canvas ───────────────────
function renderCrop(img, scale, offsetX, offsetY, cropW, cropH, imgNatW, imgNatH, ratio, outputSize) {
  const imgLeft = (cropW - imgNatW * scale) / 2 + offsetX;
  const imgTop  = (cropH - imgNatH * scale) / 2 + offsetY;

  const srcX = (0 - imgLeft) / scale;
  const srcY = (0 - imgTop)  / scale;
  const srcW = cropW / scale;
  const srcH = cropH / scale;

  const canvas  = document.createElement('canvas');
  canvas.width  = outputSize;
  canvas.height = Math.round(outputSize / ratio);

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/jpeg', 0.92);
}

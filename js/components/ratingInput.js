// Rating-komponent — returnerer et DOM-element med slider og visuel display.
// Understøtter værdier 1.0–10.0 i trin af 0.5.
// Brug: const { el, getValue } = ratingInput(initialValue)

export function ratingInput(initial = null) {
  const el = document.createElement('div');
  el.className = 'rating-input';

  let value = initial;

  function pips() {
    // 10 pip'er, én per heltal — halvt udfyldt for .5-værdier
    return Array.from({ length: 10 }, (_, i) => {
      const full = i + 1;
      let cls = 'rating-pip';
      if (value !== null) {
        if (value >= full)        cls += ' filled';
        else if (value >= full - 0.5) cls += ' half';
      }
      return `<div class="${cls}"></div>`;
    }).join('');
  }

  function render() {
    const displayVal  = value !== null ? value.toFixed(1) : '—';
    const displayCls  = value !== null ? '' : ' unset';
    const sliderVal   = value !== null ? value : 5;

    el.innerHTML = `
      <div class="rating-input-label">Din bedømmelse</div>
      <div class="rating-display">
        <div class="rating-number${displayCls}">${displayVal}</div>
        <div class="rating-stars">${pips()}</div>
      </div>
      <input
        class="rating-slider"
        type="range"
        min="1" max="10" step="0.5"
        value="${sliderVal}"
        aria-label="Bedømmelse"
      >
      <div class="rating-scale">
        <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
        <span>6</span><span>7</span><span>8</span><span>9</span><span>10</span>
      </div>
    `;

    el.querySelector('.rating-slider').addEventListener('input', (e) => {
      value = parseFloat(e.target.value);
      render();
    });
  }

  render();

  return {
    el,
    getValue: () => value,
    setValue: (v) => { value = v; render(); },
  };
}

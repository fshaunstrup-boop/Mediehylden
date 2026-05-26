// Sorterings-bar — viser chips for sorteringsvalg
// onChange(field, direction) kaldes når brugeren skifter sortering

export function sortBar({ field = 'dateAdded', direction = 'desc', onChange, extraOptions = [] } = {}) {
  const el = document.createElement('div');
  el.className = 'sort-bar';

  const options = [
    { id: 'dateAdded', label: 'Nyeste' },
    { id: 'rating',    label: 'Bedømmelse' },
    { id: 'title',     label: 'Titel' },
    ...extraOptions,
  ];

  let current   = field;
  let currentDir = direction;

  function render() {
    el.innerHTML = options.map((opt) => {
      const active = current === opt.id;
      const desc   = active && currentDir === 'desc';
      return `
        <button class="sort-chip ${active ? 'active' : ''} ${active && desc ? 'desc' : ''}" data-id="${opt.id}">
          ${opt.label}
          ${active ? `
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <polyline points="2 4 6 8 10 4"/>
            </svg>
          ` : ''}
        </button>
      `;
    }).join('');

    el.querySelectorAll('.sort-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const id = chip.dataset.id;
        if (id === current) {
          currentDir = currentDir === 'desc' ? 'asc' : 'desc';
        } else {
          current    = id;
          currentDir = id === 'title' ? 'asc' : 'desc';
        }
        render();
        onChange?.(current, currentDir);
      });
    });
  }

  render();

  return {
    el,
    getSort: () => ({ field: current, direction: currentDir }),
  };
}

// Hjælper: sorter et array af medieobjekter
export function sortItems(items, field, direction) {
  return [...items].sort((a, b) => {
    let va = a[field] ?? '';
    let vb = b[field] ?? '';

    // Sæt elementer uden værdi sidst
    if (va === null || va === undefined || va === '') return 1;
    if (vb === null || vb === undefined || vb === '') return -1;

    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();

    if (va < vb) return direction === 'asc' ? -1 : 1;
    if (va > vb) return direction === 'asc' ?  1 : -1;
    return 0;
  });
}

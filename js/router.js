// Hash-baseret SPA-router
// Ruter: #home | #add | #add/[category] | #collection/[category] | #detail/[id] | #edit/[id]

const routes = {};

export function on(pattern, handler) {
  routes[pattern] = handler;
}

export function navigate(hash) {
  window.location.hash = hash;
}

export function back() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    navigate('home');
  }
}

// Matcher en hash-streng mod alle registrerede mønstre
function match(hash) {
  const parts = hash.replace(/^#?\/?/, '').split('/');

  for (const [pattern, handler] of Object.entries(routes)) {
    const patternParts = pattern.split('/');
    if (patternParts.length !== parts.length) continue;

    const params = {};
    const matched = patternParts.every((seg, i) => {
      if (seg.startsWith(':')) {
        params[seg.slice(1)] = decodeURIComponent(parts[i]);
        return true;
      }
      return seg === parts[i];
    });

    if (matched) return { handler, params };
  }
  return null;
}

export function start() {
  function route() {
    const hash   = window.location.hash || '#home';
    const result = match(hash);

    if (result) {
      result.handler(result.params);
    } else {
      // Fallback til hjem
      navigate('home');
    }
  }

  window.addEventListener('hashchange', route);
  route(); // Kør ved opstart
}

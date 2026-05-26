// Toast-notifikationer — bruges: toast('Tilføjet!', '✅')
const container = document.getElementById('toast-container');

export function toast(message, icon = 'ℹ️', duration = 2800) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-msg">${message}</span>
  `;
  container.prepend(el);

  setTimeout(() => {
    el.classList.add('out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, duration);
}

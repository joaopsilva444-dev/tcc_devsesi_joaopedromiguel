const themeStorageKey = 'mathplay-theme';
let themeToggle;

function setTheme(theme) {
  const isLight = theme === 'light';
  document.documentElement.dataset.theme = isLight ? 'light' : 'dark';
  themeToggle.textContent = isLight ? '🌙 Modo escuro' : '☀️ Modo claro';
  themeToggle.setAttribute('aria-label', isLight ? 'Ativar modo escuro' : 'Ativar modo claro');
  themeToggle.setAttribute('aria-pressed', String(isLight));
  localStorage.setItem(themeStorageKey, isLight ? 'light' : 'dark');
}

const savedTheme = localStorage.getItem(themeStorageKey);
document.documentElement.dataset.theme = savedTheme === 'light' ? 'light' : 'dark';

document.addEventListener('DOMContentLoaded', () => {
  themeToggle = document.querySelector('.theme-toggle');
  if (!themeToggle) return;

  setTheme(document.documentElement.dataset.theme);
  themeToggle.addEventListener('click', () => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
  });
});

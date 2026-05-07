/**
 * Light/dark theme support.
 *
 *   - First visit: follow `prefers-color-scheme` from the OS.
 *   - User clicks the toggle: choice is persisted in `localStorage`.
 *   - OS preference change later: respected only if the user hasn't picked
 *     a manual override.
 *
 * The init script is injected inline into <head> so the theme is applied
 * before first paint (no flash of wrong theme). The runtime script is
 * loaded at the end of <body> and wires up the toggle button + a
 * `themechange` window event that pages can subscribe to (used by the
 * Chart.js code to recolour grids/labels live).
 */

/**
 * Inline `<script>` for the document head — must run synchronously before
 * the body renders to avoid a flash of the wrong theme.
 */
export const THEME_INIT_SCRIPT = `
<script>
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var system = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
    var t = (stored === 'light' || stored === 'dark') ? stored : system;
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
</script>`;

/**
 * Floating round button shown top-right on every page. The icon is set by
 * THEME_RUNTIME_SCRIPT once the page loads.
 */
export const THEME_TOGGLE_HTML = `
<button id="themeToggle" type="button" class="theme-toggle" aria-label="Toggle light/dark theme" title="Toggle light/dark theme">
  <span id="themeToggleIcon">☀</span>
</button>`;

/**
 * Runtime script: handles clicks, persists the override, updates the icon,
 * dispatches `themechange` events, and re-applies system preference if the
 * user hasn't explicitly overridden.
 */
export const THEME_RUNTIME_SCRIPT = `
<script>
(function() {
  function current() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }
  function setIcon(theme) {
    var i = document.getElementById('themeToggleIcon');
    if (i) i.textContent = theme === 'light' ? '🌙' : '☀';
  }
  function applyTheme(theme, persist) {
    document.documentElement.setAttribute('data-theme', theme);
    setIcon(theme);
    if (persist) {
      try { localStorage.setItem('theme', theme); } catch (e) {}
    }
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: theme } }));
  }
  setIcon(current());

  var btn = document.getElementById('themeToggle');
  if (btn) {
    btn.addEventListener('click', function() {
      applyTheme(current() === 'light' ? 'dark' : 'light', true);
    });
  }

  // Track OS theme changes only if the user hasn't pinned a preference.
  try {
    var mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)');
    if (mq && mq.addEventListener) {
      mq.addEventListener('change', function(e) {
        if (!localStorage.getItem('theme')) {
          applyTheme(e.matches ? 'light' : 'dark', false);
        }
      });
    }
  } catch (e) {}
})();
</script>`;

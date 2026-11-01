/* User-selected theme shared by every page. Default is always light.
   按钮里是太阳 / 月亮两个图标，由 CSS 按 data-theme 切换；这里只更新无障碍文字。 */
(function () {
  'use strict';
  var key = 'cn-math-toy-theme';
  var theme = 'light';
  try { if (localStorage.getItem(key) === 'dark') theme = 'dark'; } catch (_) {}
  function apply(next, save) {
    theme = next === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    if (save) { try { localStorage.setItem(key, theme); } catch (_) {} }
    var label = theme === 'light' ? '切换到深色模式' : '切换到浅色模式';
    var button = document.getElementById('theme-toggle');
    if (button) {
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      button.setAttribute('aria-pressed', String(theme === 'dark'));
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0c0d10' : '#f7f6f3');
    window.dispatchEvent(new Event('themechange'));
  }
  apply(theme, false);
  document.addEventListener('DOMContentLoaded', function () {
    apply(theme, false);
    var button = document.getElementById('theme-toggle');
    if (button) button.addEventListener('click', function () {
      apply(theme === 'light' ? 'dark' : 'light', true);
    });
  });
  window.addEventListener('storage', function (event) {
    if (event.key === key) apply(event.newValue, false);
  });
})();

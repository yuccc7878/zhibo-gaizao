/* ========================================
   Customize - 主屏幕自定义模块
   ======================================== */

import { getDb, saveData } from '../core/dataService.js';
import { showToast, defaultIcons } from '../core/utils.js';

let dom = null;

export function init(_dom) {
  dom = _dom;
  bindEvents();
}

function bindEvents() {
  const form = dom['customize-form'];
  if (!form) return;

  form.addEventListener('input', async (e) => {
    if (e.target.name === 'icon-name') {
      const db = getDb();
      if (!db.customIcons) db.customIcons = {};
      db.customIcons[e.target.dataset.screen] = e.target.value.trim();
      await saveData();
    }
  });

  form.addEventListener('click', async (e) => {
    const resetBtn = e.target.closest('.reset-icon-btn');
    if (resetBtn) {
      const db = getDb();
      if (!db.customIcons) db.customIcons = {};
      delete db.customIcons[resetBtn.dataset.screen];
      await saveData();
      renderCustomizeForm();
      updateIconInNav(resetBtn.dataset.screen);
      showToast(dom['toast-notification'], '已恢复默认');
    }
  });

  // 检查更新
  const checkUpdateBtn = dom['check-update-btn'];
  if (checkUpdateBtn) {
    checkUpdateBtn.addEventListener('click', async () => {
      if (confirm('检查更新将清除浏览器缓存并从仓库加载最新版本。确定继续吗？')) {
        try {
          const registrations = await navigator.serviceWorker?.getRegistrations();
          if (registrations) for (const reg of registrations) await reg.unregister();
        } catch (_) { /* ignore */ }
        if (caches) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
        window.location.reload();
      }
    });
  }
}

export function renderCustomizeForm() {
  const form = dom['customize-form'];
  if (!form) return;
  form.innerHTML = '<h3 style="margin-bottom:12px;">自定义导航图标名称</h3>';
  const db = getDb();
  const icons = db.customIcons || {};

  // 要显示的屏幕列表（排除 home-screen、chat-room-screen）
  const screens = [
    'chat-list-screen', 'api-settings-screen', 'wallpaper-screen',
    'world-book-screen', 'customize-screen', 'font-settings-screen', 'tutorial-screen',
  ];

  screens.forEach(id => {
    const def = defaultIcons[id];
    if (!def) return;
    const label = document.createElement('label');
    label.className = 'icon-customize-item';
    label.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0f0;';

    const img = document.createElement('img');
    img.src = def.url;
    img.alt = def.name;
    img.style.cssText = 'width:32px;height:32px;border-radius:8px;';

    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'icon-name';
    input.dataset.screen = id;
    input.value = icons[id] || def.name;
    input.placeholder = def.name;
    input.style.cssText = 'flex:1;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;';

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'reset-icon-btn';
    resetBtn.dataset.screen = id;
    resetBtn.textContent = '↺';
    resetBtn.style.cssText = 'background:none;border:none;font-size:18px;color:#999;cursor:pointer;padding:4px;';

    label.appendChild(img);
    label.appendChild(input);
    label.appendChild(resetBtn);
    form.appendChild(label);
  });
}

function updateIconInNav(screenId) {
  const navLinks = document.querySelectorAll(`.app-icon[data-target="${screenId}"]`);
  const db = getDb();
  const customName = (db.customIcons || {})[screenId];
  navLinks.forEach(link => {
    const span = link.querySelector('span');
    if (span && customName) span.textContent = customName;
    else if (span) {
      const def = defaultIcons[screenId];
      if (def) span.textContent = def.name;
    }
  });
}

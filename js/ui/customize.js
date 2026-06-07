/* ========================================
   Customize - 主屏幕自定义模块
   ======================================== */

import { getDb, saveData } from '../core/dataService.js';
import { showToast, defaultIcons } from '../core/utils.js';

let dom = null;
let loadingBtn = false;

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
    'world-book-screen', 'customize-screen', 'font-settings-screen',
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

  // ─── 备份与导入 ───
  const section = document.createElement('div');
  section.style.cssText = 'margin-top:24px;padding-top:20px;border-top:2px solid #f0f0f0;';
  section.innerHTML = '<h3 style="margin-bottom:16px;">数据管理</h3>';

  const backupBtn = document.createElement('button');
  backupBtn.type = 'button';
  backupBtn.className = 'btn btn-primary';
  backupBtn.textContent = '备份数据';
  backupBtn.disabled = loadingBtn;
  backupBtn.style.cssText = 'width:100%;padding:14px;font-size:15px;border-radius:12px;';
  backupBtn.addEventListener('click', async () => {
    if (loadingBtn) return;
    loadingBtn = true;
    try {
      const blob = new Blob([JSON.stringify(db)]);
      const cs = new CompressionStream('gzip');
      const compressed = await new Response(blob.stream().pipeThrough(cs)).blob();
      const url = URL.createObjectURL(compressed);
      const a = document.createElement('a');
      const now = new Date();
      a.href = url;
      a.download = `组装姬_备份数据_${now.toISOString().slice(0, 10)}_${now.toTimeString().slice(0, 8).replace(/:/g, '')}.ee`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(dom['toast-notification'], '聊天记录导出成功');
    } catch (e) {
      showToast(dom['toast-notification'], `导出失败: ${e.message}`);
    }
    loadingBtn = false;
  });

  const importLabel = document.createElement('label');
  importLabel.className = 'btn btn-neutral';
  importLabel.textContent = '导入数据';
  importLabel.setAttribute('for', 'import-data-input');
  importLabel.style.cssText = 'display:block;width:100%;padding:14px;font-size:15px;border-radius:12px;margin-top:12px;text-align:center;box-sizing:border-box;cursor:pointer;';

  // 导入数据文件处理
  const importInput = document.getElementById('import-data-input');
  if (importInput) {
    importInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (confirm('此操作将覆盖当前所有数据，确定要继续吗？')) {
        try {
          const ds = new DecompressionStream('gzip');
          const json = await new Response(file.stream().pipeThrough(ds)).text();
          await saveData(JSON.parse(json));
          showToast(dom['toast-notification'], '数据已恢复，即将刷新');
          window.location.reload();
        } catch (err) {
          showToast(dom['toast-notification'], `导入失败: ${err.message}`);
        }
      } else {
        e.target.value = null;
      }
    });
  }

  section.appendChild(backupBtn);
  section.appendChild(importLabel);
  form.appendChild(section);
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

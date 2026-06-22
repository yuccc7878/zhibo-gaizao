/* ========================================
   Wallpaper - 壁纸设置模块
   ======================================== */

import { saveData, getDb } from '../core/dataService.js';
import { compressImage, showToast } from '../core/utils.js';

let dom = null;

export function init(_dom) {
  dom = _dom;
  bindEvents();
}

function bindEvents() {
  const upload = dom['wallpaper-upload'];
  if (!upload) return;
  upload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const db = getDb();
      db.wallpaper = await compressImage(file, { quality: 0.8, maxWidth: 1920, maxHeight: 1920 });
      document.querySelectorAll('.screen').forEach(s => {
        if (s.id !== 'chat-room-screen') s.style.backgroundImage = `url(${db.wallpaper})`;
      });
      document.querySelector('.wallpaper-preview').style.backgroundImage = `url(${db.wallpaper})`;
      document.querySelector('.wallpaper-preview').innerHTML = '';
      await saveData();
      showToast(dom['toast-notification'], '壁纸已更换！');
    } catch (err) {
      showToast(dom['toast-notification'], '壁纸更换失败');
    }
    e.target.value = null;
  });
}

export function applyWallpaper(url) {
  document.querySelectorAll('.screen').forEach(s => {
    if (s.id !== 'chat-room-screen') s.style.backgroundImage = `url(${url})`;
  });
}

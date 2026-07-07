/* ========================================
   FontSettings - 字体设置模块
   ======================================== */

import { getDb, saveData } from '../core/dataService.js';
import { applyGlobalFont, showToast } from '../core/utils.js';

let dom = null;

export function init(_dom) {
  dom = _dom;
  bindEvents();
}

function bindEvents() {
  const form = dom['font-settings-form'];
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const db = getDb();
    db.fontUrl = dom['font-url'].value.trim();
    await saveData();
    applyGlobalFont(db.fontUrl);
    showToast(dom['toast-notification'], '新字体已应用！');
  });

  const restoreBtn = dom['restore-default-font-btn'];
  if (restoreBtn) {
    restoreBtn.addEventListener('click', async () => {
      dom['font-url'].value = '';
      const db = getDb();
      db.fontUrl = '';
      await saveData();
      applyGlobalFont('');
      showToast(dom['toast-notification'], '已恢复默认字体！');
    });
  }
}

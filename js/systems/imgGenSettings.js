/* ========================================
   ImgGenSettings - 生图 API 设置模块
   ======================================== */

import { getDb, saveData } from '../core/dataService.js';
import { showToast, switchScreen } from '../core/utils.js';
import { renderImgGenStatus } from './apiSettings.js';

// aiService 已通过全局 script 加载
const { setImageConfig } = window.AiService;

let dom = null;

export function init(_dom) {
  dom = _dom;
  bindEvents();
}

function bindEvents() {
  dom['img-gen-back-btn'].addEventListener('click', () => {
    switchScreen(dom, 'api-settings-screen');
    renderImgGenStatus();
  });

  dom['img-gen-reset-btn'].addEventListener('click', async () => {
    const db = getDb();
    db.imgGenSettings = { url: 'https://image.pollinations.ai/prompt/', key: '', model: '' };
    dom['img-gen-url'].value = db.imgGenSettings.url;
    dom['img-gen-key'].value = '';
    dom['img-gen-model'].value = '';
    await saveData();
    setImageConfig(db.imgGenSettings);
    showToast(dom['toast-notification'], '已重置为 Pollinations 免费接口');
  });

  dom['img-gen-form'].addEventListener('submit', async (e) => {
    e.preventDefault();
    const db = getDb();
    db.imgGenSettings = {
      url: dom['img-gen-url'].value.trim(),
      key: dom['img-gen-key'].value.trim(),
      model: dom['img-gen-model'].value.trim(),
    };
    await saveData();
    setImageConfig(db.imgGenSettings);
    showToast(dom['toast-notification'], '生图设置已保存');
  });
}

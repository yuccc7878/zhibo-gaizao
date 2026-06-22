/* ========================================
   Stickers - 表情包系统
   ======================================== */

import { state } from '../core/state.js';
import { getDb, saveData } from '../core/dataService.js';
import { showToast, compressImage } from '../core/utils.js';
import * as chatRoom from '../ui/chatRoom.js';

let dom = null;

export function init(_dom) {
  dom = _dom;
  bindEvents();
}

function bindEvents() {
  dom['sticker-toggle-btn'].addEventListener('click', (e) => {
    e.stopPropagation();
    dom['sticker-modal'].classList.toggle('visible');
    if (dom['sticker-modal'].classList.contains('visible')) renderStickerGrid();
  });

  // 点击外部关闭表情面板
  document.addEventListener('click', (e) => {
    if (dom['sticker-modal']?.classList.contains('visible') &&
        !e.target.closest('#sticker-modal') &&
        !e.target.closest('#sticker-toggle-btn')) {
      dom['sticker-modal'].classList.remove('visible');
    }
  });

  dom['add-new-sticker-btn'].addEventListener('click', () => {
    dom['add-sticker-modal-title'].textContent = '添加新表情';
    dom['add-sticker-form'].reset();
    dom['sticker-edit-id'].value = '';
    dom['sticker-preview'].innerHTML = '<span>预览</span>';
    dom['sticker-url-input'].disabled = false;
    dom['add-sticker-modal'].classList.add('visible');
  });

  dom['add-sticker-form'].addEventListener('submit', async (e) => {
    e.preventDefault();
    const db = getDb();
    if (!db.myStickers) db.myStickers = [];
    const editId = dom['sticker-edit-id'].value;
    if (editId) {
      const existing = db.myStickers.find(s => s.id === editId);
      if (existing) {
        existing.name = dom['sticker-name'].value.trim();
        existing.data = dom['sticker-preview'].querySelector('img')?.src || existing.data;
      }
    } else {
      const sticker = {
        id: 'sticker_' + Date.now(),
        name: dom['sticker-name'].value.trim(),
        data: dom['sticker-preview'].querySelector('img')?.src || '',
      };
      if (!sticker.data || !sticker.name) {
        showToast(dom['toast-notification'], '请提供表情名称和图片');
        return;
      }
      db.myStickers.push(sticker);
    }
    await saveData();
    dom['add-sticker-modal'].classList.remove('visible');
    renderStickerGrid();
    showToast(dom['toast-notification'], editId ? '表情已更新' : '表情已添加');
  });

  dom['sticker-url-input'].addEventListener('input', (e) => {
    dom['sticker-preview'].innerHTML = `<img src="${e.target.value}" alt="预览">`;
    dom['sticker-file-upload'].value = '';
  });

  dom['sticker-file-upload'].addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file, { quality: 0.9, maxWidth: 400, maxHeight: 400 });
      dom['sticker-preview'].innerHTML = `<img src="${dataUrl}" alt="预览">`;
      dom['sticker-url-input'].value = '';
    } catch (err) {
      showToast(dom['toast-notification'], '图片加载失败');
    }
  });

  dom['edit-sticker-btn'].addEventListener('click', () => {
    const id = state.currentStickerActionTarget;
    if (!id) return;
    const db = getDb();
    const sticker = (db.myStickers || []).find(s => s.id === id);
    if (sticker) {
      dom['add-sticker-modal-title'].textContent = '编辑表情';
      dom['sticker-edit-id'].value = sticker.id;
      dom['sticker-name'].value = sticker.name;
      dom['sticker-preview'].innerHTML = `<img src="${sticker.data}" alt="预览">`;
      dom['sticker-url-input'].disabled = true;
      dom['add-sticker-modal'].classList.add('visible');
    }
    dom['sticker-actionsheet']?.classList.remove('visible');
  });

  dom['delete-sticker-btn'].addEventListener('click', async () => {
    const id = state.currentStickerActionTarget;
    if (!id) return;
    const db = getDb();
    if (!db.myStickers) db.myStickers = [];
    db.myStickers = db.myStickers.filter(s => s.id !== id);
    await saveData();
    renderStickerGrid();
    dom['sticker-actionsheet']?.classList.remove('visible');
    showToast(dom['toast-notification'], '表情已删除');
  });
}

// 内置基础表情包
const BUILTIN_STICKERS = [
    { id:'builtin_1', name:'不开心', data:'assets/stickers/不开心.png' },
    { id:'builtin_2', name:'吃零食', data:'assets/stickers/吃零食.png' },
    { id:'builtin_3', name:'哇塞',   data:'assets/stickers/哇塞.png' },
    { id:'builtin_4', name:'心累',   data:'assets/stickers/心累.png' },
    { id:'builtin_5', name:'拜拜',   data:'assets/stickers/拜拜.png' },
    { id:'builtin_6', name:'摆烂',   data:'assets/stickers/摆烂.png' },
    { id:'builtin_7', name:'比心',   data:'assets/stickers/比心.png' },
    { id:'builtin_8', name:'紧张',   data:'assets/stickers/紧张.png' },
    { id:'builtin_9', name:'酷盖',   data:'assets/stickers/酷盖.png' },
];

export function renderStickerGrid() {
  const db = getDb();
  const userStickers = db.myStickers || [];
  const stickers = [...BUILTIN_STICKERS, ...userStickers];
  dom['sticker-grid-container'].innerHTML = '';

  stickers.forEach(sticker => {
    const item = document.createElement('div');
    item.className = 'sticker-grid-item';
    item.innerHTML = `<img src="${sticker.data}" alt="${sticker.name}"><span>${sticker.name}</span>`;
    item.addEventListener('click', () => chatRoom.sendSticker(sticker));
    item.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      state._longPressTimer = setTimeout(() => handleStickerLongPress(sticker.id), 500);
    });
    item.addEventListener('mouseup', () => clearTimeout(state._longPressTimer));
    item.addEventListener('mouseleave', () => clearTimeout(state._longPressTimer));
    item.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      state._longPressTimer = setTimeout(() => handleStickerLongPress(sticker.id), 500);
    });
    item.addEventListener('touchend', () => clearTimeout(state._longPressTimer));
    item.addEventListener('touchmove', () => clearTimeout(state._longPressTimer));
    dom['sticker-grid-container'].appendChild(item);
  });
}

function handleStickerLongPress(stickerId) {
  clearTimeout(state._longPressTimer);
  // 内置表情不允许编辑/删除
  if (stickerId.startsWith('builtin_')) return;
  state.currentStickerActionTarget = stickerId;
  dom['sticker-actionsheet']?.classList.add('visible');
}

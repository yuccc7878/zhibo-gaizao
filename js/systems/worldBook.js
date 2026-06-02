/* ========================================
   WorldBook - 世界书系统
   ======================================== */

import { state } from '../core/state.js';
import { getDb, saveData } from '../core/dataService.js';
import { showToast, switchScreen as utilsSwitchScreen } from '../core/utils.js';

// worldBook 没有 dom 引用，共用全局 screen 元素的 switchScreen
function ss(id) { utilsSwitchScreen({ screens: document.querySelectorAll('.screen') }, id); }

let dom = null;

export function init(_dom) {
  dom = _dom;
  bindEvents();
}

function bindEvents() {
  dom['add-world-book-btn'].addEventListener('click', () => {
    state.currentEditingWorldBookId = null;
    dom['edit-world-book-form'].reset();
    const radio = document.querySelector('input[name="world-book-position"][value="before"]');
    if (radio) radio.checked = true;
    ss('edit-world-book-screen');
  });

  dom['edit-world-book-form'].addEventListener('submit', async (e) => {
    e.preventDefault();
    const db = getDb();
    if (!db.worldBooks) db.worldBooks = [];
    const name = dom['world-book-name-input'].value.trim();
    const content = dom['world-book-content-input'].value.trim();
    if (!name || !content) { showToast(dom['toast-notification'], '请填写名称和内容'); return; }
    const position = document.querySelector('input[name="world-book-position"]:checked')?.value || 'before';

    if (state.currentEditingWorldBookId) {
      const book = db.worldBooks.find(b => b.id === state.currentEditingWorldBookId);
      if (book) { book.name = name; book.content = content; book.position = position; }
    } else {
      db.worldBooks.push({ id: 'wb_' + Date.now(), name, content, position });
    }
    await saveData();
    ss('world-book-screen');
    renderWorldBookList();
    showToast(dom['toast-notification'], '世界书已保存');
  });

  dom['world-book-list-container'].addEventListener('click', e => {
    const item = e.target.closest('.world-book-item');
    if (!item) return;
    const id = item.dataset.id;
    const db = getDb();
    const book = db.worldBooks?.find(b => b.id === id);
    if (!book) return;
    state.currentEditingWorldBookId = book.id;
    dom['world-book-name-input'].value = book.name;
    dom['world-book-content-input'].value = book.content;
    const posRadio = document.querySelector(`input[name="world-book-position"][value="${book.position}"]`);
    if (posRadio) posRadio.checked = true;
    ss('edit-world-book-screen');
  });

  dom['world-book-list-container'].addEventListener('mousedown', (e) => {
    const item = e.target.closest('.world-book-item');
    if (item) {
      state._longPressTimer = setTimeout(() => {
        const id = item.dataset.id;
        if (confirm('确定删除这个世界书吗？')) {
          const db = getDb();
          db.worldBooks = (db.worldBooks || []).filter(b => b.id !== id);
          saveData();
          renderWorldBookList();
          showToast(dom['toast-notification'], '世界书已删除');
        }
      }, 500);
    }
  });

  dom['world-book-list-container'].addEventListener('mouseup', () => clearTimeout(state._longPressTimer));
  dom['world-book-list-container'].addEventListener('mouseleave', () => clearTimeout(state._longPressTimer));
}

export function renderWorldBookList() {
  const db = getDb();
  const books = db.worldBooks || [];
  const container = dom['world-book-list-container'];
  const placeholder = dom['no-world-books-placeholder'];

  if (books.length === 0) {
    container.innerHTML = '';
    if (placeholder) placeholder.style.display = 'block';
    return;
  }
  if (placeholder) placeholder.style.display = 'none';

  container.innerHTML = '<ul class="list-container">' +
    books.map(b => `<li class="world-book-item" data-id="${b.id}">
      <div style="flex:1;"><strong>${b.name}</strong><span style="font-size:12px;color:#999;margin-left:8px;">${b.position === 'before' ? '🔹' : '🔸'}</span></div>
      <div style="font-size:12px;color:#888;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;">${b.content}</div>
    </li>`).join('') +
    '</ul>';
}

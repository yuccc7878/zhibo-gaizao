/* ========================================
   Gift - 礼物系统模块
   ======================================== */

import { state } from '../core/state.js';
import { getDb } from '../core/dataService.js';
import * as chatRoom from '../ui/chatRoom.js';

let dom = null;

export function init(_dom) {
  dom = _dom;
  bindEvents();
}

function bindEvents() {
  dom['gift-btn'].addEventListener('click', () => {
    if (state.currentChatType === 'group') {
      // 群聊：先选收件人
      const g = getDb().groups.find(gr => gr.id === state.currentChatId);
      if (!g) return;
      import('./group.js').then(mod => mod.renderGroupRecipientSelectionList('选择送礼收件人'));
      state.currentGroupAction.type = 'gift';
    } else {
      renderGiftItemList();
      dom['send-gift-modal'].classList.add('visible');
    }
  });

  dom['send-gift-modal'].addEventListener('click', (e) => {
    if (e.target === dom['send-gift-modal']) dom['send-gift-modal'].classList.remove('visible');
  });
}

export function renderGiftItemList() {
  const container = dom['send-gift-modal'].querySelector('.gift-item-list') || dom['send-gift-modal'];
  // 清空旧内容
  const existingList = container.querySelector('.gift-grid');
  if (existingList) existingList.remove();

  const shop = window.Engine?.getModule?.('shop');
  const ownedItems = shop ? shop.getOwnedProps?.() || [] : [];

  if (ownedItems.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:20px;color:#999;';
    empty.textContent = '暂无已购买的物品，请先去商店购买';
    empty.className = 'gift-grid';
    container.appendChild(empty);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'gift-grid';
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:10px 0;';

  ownedItems.forEach(item => {
    const el = document.createElement('div');
    el.style.cssText = 'display:flex;flex-direction:column;align-items:center;padding:12px;border:2px solid #eee;border-radius:14px;cursor:pointer;transition:all 0.15s;';
    el.innerHTML = `<span style="font-size:28px;">${item.label ? item.label.replace(/^(\p{Emoji_Presentation}|\p{Emoji}️?)/u, '$1') : '🎁'}</span>
      <span style="font-size:12px;color:#888;margin-top:4px;">${item.label ? item.label.replace(/^(\p{Emoji_Presentation}|\p{Emoji}️?)/u, '').trim() : ''}</span>`;
    el.addEventListener('mouseenter', () => el.style.background = 'rgba(0,0,0,0.05)');
    el.addEventListener('mouseleave', () => el.style.background = '');
    el.addEventListener('click', () => {
      chatRoom.sendMyGift(item);
      dom['send-gift-modal'].classList.remove('visible');
    });
    grid.appendChild(el);
  });

  container.appendChild(grid);
}

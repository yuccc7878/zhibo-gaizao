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
  const list = dom['gift-item-list'] || document.getElementById('gift-item-list');
  const emptyHint = dom['gift-empty-hint'] || document.getElementById('gift-empty-hint');
  if (!list || !emptyHint) return;

  const shop = window.Engine?.getModule?.('shop');
  // 只获取消耗型物品（聊天礼物 + R18道具），过滤掉直播装备
  const ownedItems = shop
    ? (shop.getConsumableItems?.() || shop.getOwnedProps?.() || [])
    : [];

  if (ownedItems.length === 0) {
    list.style.display = 'none';
    emptyHint.style.display = 'block';
    return;
  }
  list.style.display = 'block';
  emptyHint.style.display = 'none';

  list.innerHTML = ownedItems.map(item => {
    // 优先用 item.icon，fallback 从 label 提取
    const icon = item.icon || (item.label || '').match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)/u)?.[0] || '🎁';
    const name = item.label || '礼物';
    return `<div class="gift-select-item" data-id="${item.id}" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:12px;cursor:pointer;transition:background 0.2s;">
      <span style="font-size:28px;">${icon}</span>
      <span style="flex:1;font-size:15px;font-weight:500;">${name}</span>
      <span style="font-size:12px;color:#999;">赠送 →</span>
    </div>`;
  }).join('');

  list.querySelectorAll('.gift-select-item').forEach(el => {
    el.addEventListener('mouseenter', () => el.style.background = 'rgba(0,0,0,0.05)');
    el.addEventListener('mouseleave', () => el.style.background = '');
    el.addEventListener('click', () => {
      const item = ownedItems.find(i => i.id === el.dataset.id);
      if (item) {
        chatRoom.sendMyGift(item);
        dom['send-gift-modal'].classList.remove('visible');
      }
    });
  });
}

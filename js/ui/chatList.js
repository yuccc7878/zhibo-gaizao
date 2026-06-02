/* ========================================
   ChatList - 聊天列表模块
   ======================================== */

import { state } from '../core/state.js';
import { getDb, saveData } from '../core/dataService.js';
import { showToast, createContextMenu, compressImage } from '../core/utils.js';

let dom = null;
let _openChatRoom = null; // 由 app.js 注入

export function init(_dom, openChatRoom) {
  dom = _dom;
  _openChatRoom = openChatRoom;
  bindEvents();
}

function bindEvents() {
  dom['add-chat-btn'].addEventListener('click', () => {
    dom['add-char-modal'].classList.add('visible');
    dom['add-char-form'].reset();
  });

  // 点击聊天列表项
  dom['chat-list-container'].addEventListener('click', (e) => {
    const item = e.target.closest('[data-chat-id]');
    if (!item) return;
    const chatId = item.dataset.chatId;
    const chatType = item.dataset.chatType;
    if (_openChatRoom) _openChatRoom(chatId, chatType);
  });

  // 右键长按菜单
  dom['chat-list-container'].addEventListener('contextmenu', (e) => {
    const item = e.target.closest('[data-chat-id]');
    if (item) { e.preventDefault(); handleChatListLongPress(item.dataset.chatId, item.dataset.chatType, e.clientX, e.clientY); }
  });

  dom['chat-list-container'].addEventListener('touchstart', (e) => {
    const item = e.target.closest('[data-chat-id]');
    if (item) {
      state._longPressTimer = setTimeout(() => {
        const rect = item.getBoundingClientRect();
        handleChatListLongPress(item.dataset.chatId, item.dataset.chatType, rect.left + 20, rect.top + 20);
      }, 500);
    }
  });

  dom['chat-list-container'].addEventListener('touchend', () => clearTimeout(state._longPressTimer));
  dom['chat-list-container'].addEventListener('touchmove', () => clearTimeout(state._longPressTimer));

  // 添加角色表单
  dom['add-char-form'].addEventListener('submit', async (e) => {
    e.preventDefault();
    const newChar = {
      id: `char_${Date.now()}`,
      realName: dom['char-real-name'].value,
      remarkName: dom['char-remark-name'].value,
      persona: '',
      avatar: 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg',
      myName: dom['my-name-for-char'].value,
      myPersona: '',
      myAvatar: 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg',
      theme: 'white_pink', maxMemory: 100, chatBg: '', history: [],
      isPinned: false, status: '在线', worldBookIds: [],
      useCustomBubbleCss: false, customBubbleCss: '',
      aiImgGen: false,
    };
    const db = getDb();
    db.characters.push(newChar);
    await saveData();
    renderChatList();
    dom['add-char-modal'].classList.remove('visible');
    showToast(dom['toast-notification'], `角色"${newChar.remarkName}"创建成功！`);
  });
}

export function renderChatList() {
  const db = getDb();
  const container = dom['chat-list-container'];
  const placeholder = dom['no-chats-placeholder'];
  container.innerHTML = '';

  // 合并私聊和群聊
  const items = [
    ...(db.characters || []).map(c => ({ ...c, type: 'private' })),
    ...(db.groups || []).map(g => ({ ...g, type: 'group' })),
  ];

  // 置顶优先，按创建时间倒序
  items.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return (b.id || '').localeCompare(a.id || '');
  });

  if (items.length === 0) {
    if (placeholder) placeholder.style.display = 'block';
    return;
  }
  if (placeholder) placeholder.style.display = 'none';

  items.forEach(chat => {
    const li = document.createElement('li');
    li.className = 'chat-list-item';
    li.dataset.chatId = chat.id;
    li.dataset.chatType = chat.type;

    const history = chat.history || [];
    const lastMsg = history.length > 0 ? history[history.length - 1] : null;
    let lastMessageText = '';
    if (lastMsg) {
      lastMessageText = lastMsg.content.replace(/\[.*?\]/g, '').trim().substring(0, 30);
      if (!lastMessageText) {
        if (/\[.*?更新状态为/.test(lastMsg.content)) lastMessageText = '更新了状态';
        else if (/\[.*?的转账/.test(lastMsg.content)) lastMessageText = '有一笔转账';
        else if (/\[.*?(?:送来的礼物|已接收礼物)/.test(lastMsg.content)) lastMessageText = '收到一个礼物';
        else lastMessageText = '[特殊消息]';
      }
    }

    const avatarClass = chat.type === 'group' ? 'group-avatar' : '';
    const itemName = chat.type === 'private' ? chat.remarkName : chat.name;

    li.innerHTML = `<img src="${chat.avatar}" alt="${itemName}" class="chat-avatar ${avatarClass}">
      <div class="item-details">
        <div class="item-details-row"><div class="item-name">${itemName}</div></div>
        <div class="item-preview-wrapper">
          <div class="item-preview">${lastMessageText}</div>
          ${chat.isPinned ? '<span class="pin-badge">置顶</span>' : ''}
        </div>
      </div>`;
    container.appendChild(li);
  });
}

function handleChatListLongPress(chatId, chatType, x, y) {
  const db = getDb();
  const chat = chatType === 'private'
    ? db.characters.find(c => c.id === chatId)
    : db.groups.find(g => g.id === chatId);
  if (!chat) return;

  const items = [
    { label: chat.isPinned ? '📌 取消置顶' : '📌 置顶', action: async () => {
      chat.isPinned = !chat.isPinned;
      await saveData();
      renderChatList();
    }},
  ];

  if (chatType === 'private') {
    items.push({ label: '✏️ 编辑', action: () => {
      state.currentChatId = chat.id;
      state.currentChatType = 'private';
      dom['chat-settings-btn'].click();
    }});
    items.push({ label: '❌ 删除', danger: true, action: async () => {
      if (confirm(`确定删除"${chat.remarkName}"吗？`)) {
        db.characters = db.characters.filter(c => c.id !== chatId);
        await saveData();
        renderChatList();
        showToast(dom['toast-notification'], `已删除 ${chat.remarkName}`);
      }
    }});
  } else {
    items.push({ label: '❌ 删除', danger: true, action: async () => {
      if (confirm(`确定删除群聊"${chat.name}"吗？`)) {
        db.groups = db.groups.filter(g => g.id !== chatId);
        await saveData();
        renderChatList();
        showToast(dom['toast-notification'], `已删除 ${chat.name}`);
      }
    }});
  }

  createContextMenu(items, x, y);
}

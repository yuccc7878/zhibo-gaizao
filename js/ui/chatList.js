/* ========================================
   ChatList - 聊天列表模块
   ======================================== */

import { state } from '../core/state.js';
import { getDb, saveData } from '../core/dataService.js';
import { showToast, createContextMenu, compressImage } from '../core/utils.js';

let dom = null;
let _openChatRoom = null; // 由 app.js 注入

// ─── HTML 转义 ───
function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function init(_dom, openChatRoom) {
  dom = _dom;
  _openChatRoom = openChatRoom;
  bindEvents();
  setupImportCard();
}

function bindEvents() {
  dom['add-chat-btn'].addEventListener('click', () => {
    // 确保手动创建 tab 默认激活
    dom['add-char-modal'].querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
    dom['add-char-modal'].querySelector('[data-tab="manual"]').classList.add('active');
    dom['add-char-form'].style.display = '';
    dom['import-tab-panel'].style.display = 'none';
    dom['add-char-modal-window'].style.maxWidth = '340px';
    dom['add-char-modal'].classList.add('visible');
    dom['add-char-form'].reset();
    resetImport();
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
      avatar: 'assets/icons/default-avatar.png',
      myName: dom['my-name-for-char'].value,
      myPersona: '',
      myAvatar: 'assets/icons/default-avatar.png',
      theme: 'white_pink', maxMemory: 100, chatBg: '', history: [],
      isPinned: false, status: '在线', worldBookIds: [],
      useCustomBubbleCss: false, customBubbleCss: '',
      aiImgGen: false,
    };
    const db = getDb();
    if (!db.characters) db.characters = [];
    if (!db.characters) db.characters = []; db.characters.push(newChar);
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
    li.className = 'list-item';
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
        else if (/\[.*?(?:送来的礼物|已接收礼物|已接收转账)/.test(lastMsg.content)) lastMessageText = '收到一个礼物';
        else lastMessageText = '[特殊消息]';
      }
    }

    const avatarClass = chat.type === 'group' ? 'group-avatar' : '';
    const itemName = chat.type === 'private' ? chat.remarkName : chat.name;

    li.innerHTML = `<img src="${chat.avatar}" alt="${itemName}" class="chat-avatar ${avatarClass}" onerror="this.outerHTML='<div class=chat-avatar style=background:#eee;border-radius:50%;width:48px;height:48px;display:flex;align-items:center;justify-content:center;font-size:24px;>👤</div>'">
      <div class="item-details">
        <div class="item-details-row"><div class="item-name">${itemName}</div></div>
        ${chat.type === 'private' && chat.realName ? `<div class="item-real-name">${chat.realName}</div>` : ''}
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
    ? (db.characters || []).find(c => c.id === chatId)
    : (db.groups || []).find(g => g.id === chatId);
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
        db.characters = (db.characters || []).filter(c => c.id !== chatId);
        await saveData();
        renderChatList();
        showToast(dom['toast-notification'], `已删除 ${chat.remarkName}`);
      }
    }});
  } else {
    items.push({ label: '❌ 删除', danger: true, action: async () => {
      if (confirm(`确定删除群聊"${chat.name}"吗？`)) {
        db.groups = (db.groups || []).filter(g => g.id !== chatId);
        await saveData();
        renderChatList();
        showToast(dom['toast-notification'], `已删除 ${chat.name}`);
      }
    }});
  }

  createContextMenu(items, x, y);
}

// ─── 酒馆角色卡导入 ──────────────────────

function setupImportCard() {
  const modal = dom['add-char-modal'];
  const form = dom['add-char-form'];
  const importPanel = dom['import-tab-panel'];
  const dropzone = dom['import-dropzone'];
  const fileInput = dom['import-card-file'];
  const selectBtn = dom['import-select-btn'];

  modal.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      modal.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isImport = tab.dataset.tab === 'import';
      form.style.display = isImport ? 'none' : '';
      importPanel.style.display = isImport ? '' : 'none';
      dom['add-char-modal-window'].style.maxWidth = isImport ? '420px' : '340px';
      if (!isImport) resetImport();
    });
  });

  if (selectBtn && fileInput) selectBtn.addEventListener('click', () => fileInput.click());
  if (dropzone && fileInput) dropzone.addEventListener('click', (e) => { if (e.target.tagName !== 'INPUT') fileInput.click(); });
  if (fileInput) fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await handleImportFile(file);
    fileInput.value = '';
  });
}

function resetImport() {
  const previewEl = dom['import-preview'];
  const errorEl = dom['import-error'];
  const dropzone = dom['import-dropzone'];
  previewEl.style.display = 'none';
  errorEl.style.display = 'none';
  dropzone.style.display = '';
  // 保留 fileInput，只更新提示内容
  const existingInput = document.getElementById('import-card-file');
  dropzone.innerHTML = '<div class="import-dropzone-icon">📂</div><div class="import-dropzone-text">点击选择或拖拽 .png / .json 角色卡</div>';
  if (existingInput) dropzone.appendChild(existingInput);
  else {
    const newInput = document.createElement('input');
    newInput.type = 'file'; newInput.id = 'import-card-file';
    newInput.accept = '.png,.json'; newInput.style.display = 'none';
    dropzone.appendChild(newInput);
  }
  previewEl.innerHTML = '';
  errorEl.innerHTML = '';
  window._lastImportedCard = null;
  window._lastImportedWorldBooks = null;
}

async function handleImportFile(file) {
  const dropzone = dom['import-dropzone'];
  const previewEl = dom['import-preview'];
  const errorEl = dom['import-error'];
  dropzone.style.display = 'none';
  errorEl.style.display = 'none';
  previewEl.style.display = 'none';
  previewEl.innerHTML = '';
  errorEl.innerHTML = '';
  const savedInput2 = document.getElementById('import-card-file');
  dropzone.innerHTML = '<div style="padding:30px;text-align:center;color:#888;"><div style="font-size:28px;margin-bottom:8px;">⏳</div><div>正在解析角色卡...</div></div>';
  if (savedInput2) dropzone.appendChild(savedInput2);
  dropzone.style.display = '';
  try {
    const card = await window.SillyTavernImporter.parseCardFile(file);
    window._lastImportedCard = card;
    const wbEntries = window.SillyTavernImporter.extractBuiltinWorldBook(card.character_book);
    window._lastImportedWorldBooks = wbEntries;
    dropzone.style.display = 'none';
    renderImportPreview(card, wbEntries);
  } catch (err) {
    console.error('[Import]', err);
    errorEl.style.display = '';
    errorEl.innerHTML = `<div style="font-size:24px;margin-bottom:8px;">⚠️</div><div style="font-size:13px;color:#e53935;word-break:break-word;">${escHtml(err.message)}</div><button type="button" class="btn btn-primary" onclick="document.getElementById('import-card-file').click()" style="margin-top:12px;width:auto;display:inline-block;padding:8px 20px;">重新选择</button>`;
    // 保留 fileInput，只更新提示内容
  const existingInput = document.getElementById('import-card-file');
  dropzone.innerHTML = '<div class="import-dropzone-icon">📂</div><div class="import-dropzone-text">点击选择或拖拽 .png / .json 角色卡</div>';
  if (existingInput) dropzone.appendChild(existingInput);
  else {
    const newInput = document.createElement('input');
    newInput.type = 'file'; newInput.id = 'import-card-file';
    newInput.accept = '.png,.json'; newInput.style.display = 'none';
    dropzone.appendChild(newInput);
  }
  }
}

function renderImportPreview(card, wbEntries) {
  const previewEl = dom['import-preview'];
  previewEl.style.display = '';
  previewEl.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'import-card-header';
  header.innerHTML = `<img src="${escHtml(card.avatar || '')}" class="import-card-avatar" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22><rect fill=%22%23f0f0f0%22 width=%2248%22 height=%2248%22/><text x=%2224%22 y=%2232%22 text-anchor=%22middle%22 font-size=%2224%22>👤</text></svg>'"><div class="import-card-name">${escHtml(card.name || '未命名')}</div>`;
  previewEl.appendChild(header);

  const checks = document.createElement('div');
  checks.className = 'import-section';
  checks.innerHTML += `<div class="import-checkbox-row disabled"><input type="checkbox" checked disabled><span>基本信息（名字 + 人设）</span><span class="count-badge">必选</span></div>`;
  if (card.scenario) checks.innerHTML += `<div class="import-checkbox-row"><input type="checkbox" id="import-include-scenario" checked><label for="import-include-scenario">场景设定</label></div>`;
  if (card.mes_example) {
    const lineCount = card.mes_example.split('\n').filter(l => l.trim()).length;
    checks.innerHTML += `<div class="import-checkbox-row"><input type="checkbox" id="import-include-examples" checked><label for="import-include-examples">对话示例</label><span class="count-badge">${lineCount} 行</span></div>`;
  }
  if (card.system_prompt) checks.innerHTML += `<div class="import-checkbox-row"><input type="checkbox" id="import-include-system" checked><label for="import-include-system">系统指令</label></div>`;
  previewEl.appendChild(checks);

  if (card.description || card.personality) {
    const desc = document.createElement('div');
    desc.className = 'import-section';
    desc.innerHTML = `<div class="import-section-label">📋 人设摘要</div><div class="import-section-text">${escHtml(card.description || '')}${card.personality ? '\n\n' + escHtml(card.personality) : ''}</div>`;
    previewEl.appendChild(desc);
  }

  if (wbEntries.length > 0) {
    const wbSection = document.createElement('div');
    wbSection.className = 'import-section';
    wbSection.innerHTML = `<div class="import-section-label">📖 内嵌世界书（${wbEntries.length} 条）</div><div class="import-checkbox-row" style="border-bottom:1px solid #f0f0f0;margin-bottom:4px;padding-bottom:4px;"><input type="checkbox" id="import-wb-select-all" checked style="width:auto;flex-shrink:0;"><label for="import-wb-select-all" style="font-size:12px;color:#666;">全选/取消全选</label></div>`;
    requestAnimationFrame(() => {
      const selAll = wbSection.querySelector('#import-wb-select-all');
      if (selAll) selAll.addEventListener('change', function() {
        wbSection.querySelectorAll('[data-wb-index]').forEach(cb => {
          cb.checked = this.checked;
          const row = cb.closest('.import-wb-item');
          if (row) row.style.opacity = this.checked ? '1' : '0.4';
        });
      });
    });
    wbEntries.forEach((entry, idx) => {
      const item = document.createElement('div');
      item.className = 'import-wb-item';
      item.innerHTML = `<input type="checkbox" checked data-wb-index="${idx}" style="width:auto;margin:2px 0 0 0;flex-shrink:0;"><div style="flex:1;min-width:0;"><div style="font-weight:500;font-size:12px;">${escHtml(entry.name)}</div><div style="font-size:11px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(entry.content.substring(0, 80))}${entry.content.length > 80 ? '…' : ''}</div></div>`;
      item.querySelector('input').addEventListener('change', function() { this.parentElement.style.opacity = this.checked ? '1' : '0.4'; });
      wbSection.appendChild(item);
    });
    previewEl.appendChild(wbSection);
  }

  const actions = document.createElement('div');
  actions.className = 'import-actions';
  actions.innerHTML = `<button type="button" class="btn btn-secondary" onclick="document.getElementById('import-card-file').click()">重新选择</button><button type="button" class="btn btn-primary" id="import-confirm-btn">✅ 确认导入</button>`;
  previewEl.appendChild(actions);

  document.getElementById('import-confirm-btn').addEventListener('click', async () => {
    const card = window._lastImportedCard;
    if (!card) return;
    const selectedWBIndices = [];
    previewEl.querySelectorAll('[data-wb-index]').forEach(cb => {
      if (cb.checked) selectedWBIndices.push(parseInt(cb.dataset.wbIndex));
    });
    try {
      const result = window.SillyTavernImporter.saveImportedCard(card, {
        includeScenario: document.getElementById('import-include-scenario')?.checked ?? true,
        includeExamples: document.getElementById('import-include-examples')?.checked ?? true,
        includeSystemPrompt: document.getElementById('import-include-system')?.checked ?? true,
        selectedWorldBookIndices: selectedWBIndices,
      });
      await saveData();
      renderChatList();
      dom['add-char-modal'].classList.remove('visible');
      showToast(dom['toast-notification'], `✅ 成功导入角色"${card.name}"${result.builtinWorldBookIds.length > 0 ? ` + ${result.builtinWorldBookIds.length} 条世界书` : ''}`);
      resetImport();
    } catch (err) {
      showToast(dom['toast-notification'], '导入失败: ' + err.message);
    }
  });
}

/* ========================================
   Group - 群聊管理系统
   ======================================== */

import { state } from '../core/state.js';
import { getDb, saveData } from '../core/dataService.js';
import { showToast, switchScreen, compressImage, updateCustomBubbleStyle, updateBubbleCssPreview, colorThemes } from '../core/utils.js';
import { generateGroupSystemPrompt } from '../ui/promptBuilder.js';

let dom = null;
let _renderChatList = null;
let _renderMessages = null;

export function init(_dom, renderChatList, renderMessages) {
  dom = _dom;
  _renderChatList = renderChatList;
  _renderMessages = renderMessages;
  bindEvents();
}

function bindEvents() {
  dom['create-group-btn'].addEventListener('click', () => {
    renderMemberSelectionList();
    dom['create-group-modal'].classList.add('visible');
  });

  dom['create-group-form'].addEventListener('submit', async (e) => {
    e.preventDefault();
    const selectedIds = Array.from(dom['member-selection-list'].querySelectorAll('input:checked')).map(i => i.value);
    const groupName = dom['group-name-input'].value.trim();
    if (selectedIds.length < 1) return showToast(dom['toast-notification'], '请至少选择一个群成员。');
    if (!groupName) return showToast(dom['toast-notification'], '请输入群聊名称。');
    const db = getDb();
    const firstChar = db.characters[0];
    const newGroup = {
      id: `group_${Date.now()}`,
      name: groupName,
      avatar: 'https://i.postimg.cc/fTLCngk1/image.jpg',
      me: {
        nickname: firstChar?.myName || '我',
        persona: firstChar?.myPersona || '',
        avatar: firstChar?.myAvatar || 'assets/icons/default-avatar.png',
      },
      members: selectedIds.map(charId => {
        const c = (db.characters || []).find(ch => ch.id === charId);
        return {
          id: `member_${c.id}`, originalCharId: c.id,
          realName: c.realName, groupNickname: c.remarkName,
          persona: c.persona, avatar: c.avatar,
        };
      }),
      theme: 'white_pink', maxMemory: 100, chatBg: '',
      history: [], isPinned: false,
      useCustomBubbleCss: false, customBubbleCss: '', worldBookIds: [],
    };
    if (!db.groups) db.groups = []; db.groups.push(newGroup);
    await saveData();
    if (_renderChatList) _renderChatList();
    dom['create-group-modal'].classList.remove('visible');
    showToast(dom['toast-notification'], `群聊"${groupName}"创建成功！`);
  });

  dom['group-settings-form'].addEventListener('submit', e => {
    e.preventDefault();
    saveGroupSettingsFromSidebar();
    dom['group-settings-sidebar'].classList.remove('open');
  });

  // 群聊 CSS 自定义
  const useGroupCss = dom['setting-group-use-custom-css'];
  const groupCssText = dom['setting-group-custom-bubble-css'];
  const resetGroupCss = dom['reset-group-custom-bubble-css-btn'];
  const groupPreviewBox = dom['group-bubble-css-preview'];

  useGroupCss.addEventListener('change', (e) => {
    groupCssText.disabled = !e.target.checked;
    const g = (getDb().groups || []).find(gr => gr.id === state.currentChatId);
    if (g) updateBubbleCssPreview(groupPreviewBox, groupCssText.value, !e.target.checked, colorThemes[g.theme || 'white_pink']);
  });

  groupCssText.addEventListener('input', (e) => {
    const g = (getDb().groups || []).find(gr => gr.id === state.currentChatId);
    if (g && useGroupCss.checked) updateBubbleCssPreview(groupPreviewBox, e.target.value, false, colorThemes[g.theme || 'white_pink']);
  });

  resetGroupCss.addEventListener('click', () => {
    const g = (getDb().groups || []).find(gr => gr.id === state.currentChatId);
    if (g) {
      groupCssText.value = '';
      useGroupCss.checked = false;
      groupCssText.disabled = true;
      updateBubbleCssPreview(groupPreviewBox, '', true, colorThemes[g.theme || 'white_pink']);
      showToast(dom['toast-notification'], '样式已重置为默认');
    }
  });

  dom['setting-group-avatar-upload'].addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const g = (getDb().groups || []).find(gr => gr.id === state.currentChatId);
      if (g) {
        g.avatar = await compressImage(file, { quality: 0.8, maxWidth: 400, maxHeight: 400 });
        dom['setting-group-avatar-preview'].src = g.avatar;
      }
    } catch (err) { showToast(dom['toast-notification'], '群头像压缩失败'); }
  });

  dom['setting-group-chat-bg-upload'].addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const g = (getDb().groups || []).find(gr => gr.id === state.currentChatId);
      if (g) {
        g.chatBg = await compressImage(file, { quality: 0.85, maxWidth: 1080, maxHeight: 1920 });
        dom['chat-room-screen'].style.backgroundImage = `url(${g.chatBg})`;
        await saveData();
        showToast(dom['toast-notification'], '聊天背景已更换');
      }
    } catch (err) { showToast(dom['toast-notification'], '群聊背景压缩失败'); }
  });

  dom['clear-group-chat-history-btn'].addEventListener('click', async () => {
    const g = (getDb().groups || []).find(gr => gr.id === state.currentChatId);
    if (g && confirm(`确定要清空群聊"${g.name}"的所有聊天记录吗？`)) {
      g.history = [];
      await saveData();
      if (_renderMessages) _renderMessages(false, true);
      if (_renderChatList) _renderChatList();
      dom['group-settings-sidebar'].classList.remove('open');
      showToast(dom['toast-notification'], '聊天记录已清空');
    }
  });

  // 成员管理
  dom['group-members-list-container'].addEventListener('click', e => {
    const memberDiv = e.target.closest('.group-member');
    const addBtn = e.target.closest('.add-member-btn');
    if (memberDiv) openGroupMemberEditModal(memberDiv.dataset.id);
    else if (addBtn) dom['add-member-actionsheet'].classList.add('visible');
  });

  dom['edit-member-avatar-preview'].addEventListener('click', () => dom['edit-member-avatar-upload'].click());
  dom['edit-member-avatar-upload'].addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      try { dom['edit-member-avatar-preview'].src = await compressImage(file, { quality: 0.8, maxWidth: 400, maxHeight: 400 }); }
      catch (err) { showToast(dom['toast-notification'], '头像压缩失败'); }
    }
  });

  dom['edit-group-member-form'].addEventListener('submit', async (e) => {
    e.preventDefault();
    const memberId = dom['editing-member-id'].value;
    const g = (getDb().groups || []).find(gr => gr.id === state.currentChatId);
    const member = g?.members.find(m => m.id === memberId);
    if (member) {
      member.avatar = dom['edit-member-avatar-preview'].src;
      member.groupNickname = dom['edit-member-group-nickname'].value;
      member.realName = dom['edit-member-real-name'].value;
      member.persona = dom['edit-member-persona'].value;
      await saveData();
      renderGroupMembersInSettings(g);
      showToast(dom['toast-notification'], '成员信息已更新');
    }
    dom['edit-group-member-modal'].classList.remove('visible');
  });

  dom['invite-existing-member-btn'].addEventListener('click', () => {
    renderInviteSelectionList();
    dom['invite-member-modal'].classList.add('visible');
    dom['add-member-actionsheet'].classList.remove('visible');
  });

  dom['create-new-member-btn'].addEventListener('click', () => {
    dom['create-member-for-group-form'].reset();
    dom['create-group-member-avatar-preview'].src = 'assets/icons/default-avatar.png';
    dom['create-member-for-group-modal'].classList.add('visible');
    dom['add-member-actionsheet'].classList.remove('visible');
  });

  dom['create-group-member-avatar-preview'].addEventListener('click', () => dom['create-group-member-avatar-upload'].click());
  dom['create-group-member-avatar-upload'].addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      try { dom['create-group-member-avatar-preview'].src = await compressImage(file, { quality: 0.8, maxWidth: 400, maxHeight: 400 }); }
      catch (err) { showToast(dom['toast-notification'], '头像压缩失败'); }
    }
  });

  dom['confirm-invite-btn'].addEventListener('click', async () => {
    const g = (getDb().groups || []).find(gr => gr.id === state.currentChatId);
    if (!g) return;
    const selectedCharIds = Array.from(dom['invite-member-selection-list'].querySelectorAll('input:checked')).map(i => i.value);
    selectedCharIds.forEach(charId => {
      const c = getDb().characters.find(ch => ch.id === charId);
      if (c) {
        g.members.push({
          id: `member_${c.id}`, originalCharId: c.id,
          realName: c.realName, groupNickname: c.remarkName,
          persona: c.persona, avatar: c.avatar,
        });
        sendInviteNotification(g, c.realName);
      }
    });
    if (selectedCharIds.length > 0) {
      await saveData();
      renderGroupMembersInSettings(g);
      if (_renderMessages) _renderMessages(false, true);
      showToast(dom['toast-notification'], '已邀请新成员');
    }
    dom['invite-member-modal'].classList.remove('visible');
  });

  dom['create-member-for-group-form'].addEventListener('submit', async (e) => {
    e.preventDefault();
    const g = (getDb().groups || []).find(gr => gr.id === state.currentChatId);
    if (!g) return;
    const newMember = {
      id: `member_group_only_${Date.now()}`, originalCharId: null,
      realName: dom['create-group-member-realname'].value,
      groupNickname: dom['create-group-member-nickname'].value,
      persona: dom['create-group-member-persona'].value,
      avatar: dom['create-group-member-avatar-preview'].src,
    };
    g.members.push(newMember);
    sendInviteNotification(g, newMember.realName);
    await saveData();
    renderGroupMembersInSettings(g);
    if (_renderMessages) _renderMessages(false, true);
    showToast(dom['toast-notification'], `新成员 ${newMember.groupNickname} 已加入`);
    dom['create-member-for-group-modal'].classList.remove('visible');
  });

  dom['setting-group-my-avatar-upload'].addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      try { dom['setting-group-my-avatar-preview'].src = await compressImage(file, { quality: 0.8, maxWidth: 400, maxHeight: 400 }); }
      catch (err) { showToast(dom['toast-notification'], '头像压缩失败'); }
    }
  });

  dom['confirm-group-recipient-btn'].addEventListener('click', () => {
    const selectedIds = Array.from(dom['group-recipient-selection-list'].querySelectorAll('input:checked')).map(i => i.value);
    if (selectedIds.length === 0) return showToast(dom['toast-notification'], '请至少选择一个收件人。');
    state.currentGroupAction.recipients = selectedIds;
    dom['group-recipient-selection-modal'].classList.remove('visible');
    if (state.currentGroupAction.type === 'transfer') {
      dom['send-transfer-form'].reset();
      dom['send-transfer-modal'].classList.add('visible');
    } else if (state.currentGroupAction.type === 'gift') {
      import('./gift.js').then(mod => {
        mod.renderGiftItemList();
        dom['send-gift-modal'].classList.add('visible');
      });
    }
  });

  dom['link-group-world-book-btn'].addEventListener('click', () => {
    const g = (getDb().groups || []).find(gr => gr.id === state.currentChatId);
    if (!g) return;
    const list = dom['world-book-selection-list'];
    list.innerHTML = '';
    (getDb().worldBooks || []).forEach(book => {
      const li = document.createElement('li');
      li.className = 'world-book-select-item';
      li.innerHTML = `<input type="checkbox" id="wb-select-group-${book.id}" value="${book.id}" ${(g.worldBookIds || []).includes(book.id) ? 'checked' : ''}>
        <label for="wb-select-group-${book.id}">${book.name}</label>`;
      list.appendChild(li);
    });
    dom['world-book-selection-modal'].classList.add('visible');
  });

  // 群专属世界书添加按钮
  const addGroupBuiltinWBBtn = document.getElementById('setting-group-add-builtin-wb');
  if (addGroupBuiltinWBBtn && !addGroupBuiltinWBBtn._bound) {
    addGroupBuiltinWBBtn._bound = true;
    addGroupBuiltinWBBtn.addEventListener('click', async () => {
      const g = (getDb().groups || []).find(gr => gr.id === state.currentChatId);
      if (!g) return;
      if (!g.builtinWorldBooks) g.builtinWorldBooks = [];
      g.builtinWorldBooks.push({ name: '', content: '', position: 'before', enabled: true });
      await saveData();
      renderGroupBuiltinWorldBooks(g);
      // 自动展开编辑
      const container = document.getElementById('setting-group-builtin-wb-list');
      const lastItem = container?.querySelector('.builtin-wb-item:last-child');
      if (lastItem) {
        const editBtn = lastItem.querySelector('[data-action="edit-group-wb"]');
        if (editBtn) editBtn.click();
      }
    });
  }

  // 成员专属世界书添加按钮
  const addMemberWBBtn = document.getElementById('edit-member-add-wb');
  if (addMemberWBBtn && !addMemberWBBtn._bound) {
    addMemberWBBtn._bound = true;
    addMemberWBBtn.addEventListener('click', async () => {
      const memberId = document.getElementById('editing-member-id')?.value;
      const g = (getDb().groups || []).find(gr => gr.id === state.currentChatId);
      const mem = g?.members.find(m => m.id === memberId);
      if (!mem) return;
      if (!mem.builtinWorldBooks) mem.builtinWorldBooks = [];
      const name = prompt('条目名称:');
      if (!name) return;
      const content = prompt('条目内容:');
      if (!content) return;
      mem.builtinWorldBooks.push({ name, content, position: 'before', enabled: true });
      await saveData();
      renderMemberBuiltinWBList(mem);
    });
  }
}

// ─── 群成员选择列表 ────────────────────

function renderMemberSelectionList() {
  const db = getDb();
  const list = dom['member-selection-list'];
  list.innerHTML = '';
  if (!db.characters || db.characters.length === 0) {
    list.innerHTML = '<li style="color:#aaa;text-align:center;padding:10px 0;">没有可选择的人设。</li>';
    return;
  }
  (db.characters || []).forEach(c => {
    const li = document.createElement('li');
    li.className = 'member-selection-item';
    li.innerHTML = `<input type="checkbox" id="select-${c.id}" value="${c.id}"><img src="${c.avatar}" alt="${c.remarkName}"><label for="select-${c.id}">${c.remarkName}</label>`;
    list.appendChild(li);
  });
}

// ─── 群设置加载 ────────────────────────

export function loadGroupSettingsToSidebar() {
  const g = (getDb().groups || []).find(gr => gr.id === state.currentChatId);
  if (!g) return;

  const themeSelect = dom['setting-group-theme-color'];
  if (themeSelect.options.length === 0) {
    Object.keys(colorThemes).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = colorThemes[key].name;
      themeSelect.appendChild(opt);
    });
  }

  dom['setting-group-avatar-preview'].src = g.avatar;
  dom['setting-group-name'].value = g.name;
  dom['setting-group-my-avatar-preview'].src = g.me.avatar;
  dom['setting-group-my-nickname'].value = g.me.nickname;
  dom['setting-group-my-persona'].value = g.me.persona;
  themeSelect.value = g.theme || 'white_pink';
  dom['setting-group-max-memory'].value = g.maxMemory;
  renderGroupMembersInSettings(g);
  renderGroupBuiltinWorldBooks(g);

  const useCss = dom['setting-group-use-custom-css'];
  const cssText = dom['setting-group-custom-bubble-css'];
  const previewBox = dom['group-bubble-css-preview'];
  useCss.checked = g.useCustomBubbleCss || false;
  cssText.value = g.customBubbleCss || '';
  cssText.disabled = !useCss.checked;
  updateBubbleCssPreview(previewBox, g.customBubbleCss, !g.useCustomBubbleCss, colorThemes[g.theme || 'white_pink']);
}

export function renderGroupMembersInSettings(group) {
  const container = dom['group-members-list-container'];
  container.innerHTML = '';
  (group.members || []).forEach(m => {
    const div = document.createElement('div');
    div.className = 'group-member';
    div.dataset.id = m.id;
    div.innerHTML = `<img src="${m.avatar}" alt="${m.groupNickname}"><span>${m.groupNickname}</span>`;
    container.appendChild(div);
  });
  const addBtn = document.createElement('div');
  addBtn.className = 'add-member-btn';
  addBtn.innerHTML = '<div class="add-icon">+</div><span>添加</span>';
  container.appendChild(addBtn);
}

export function renderGroupRecipientSelectionList(actionText) {
  const g = (getDb().groups || []).find(gr => gr.id === state.currentChatId);
  if (!g) return;
  dom['group-recipient-selection-title'].textContent = actionText;
  const list = dom['group-recipient-selection-list'];
  list.innerHTML = '';
  (g.members || []).forEach(m => {
    const li = document.createElement('li');
    li.className = 'group-recipient-select-item';
    li.innerHTML = `<input type="checkbox" id="recipient-select-${m.id}" value="${m.id}">
      <label for="recipient-select-${m.id}"><img src="${m.avatar}" alt="${m.groupNickname}"><span>${m.groupNickname}</span></label>`;
    list.appendChild(li);
  });
}

async function saveGroupSettingsFromSidebar() {
  const g = (getDb().groups || []).find(gr => gr.id === state.currentChatId);
  if (!g) return;
  const newName = dom['setting-group-name'].value;
  if (g.name !== newName) {
    g.name = newName;
    sendRenameNotification(g, newName);
  }
  g.avatar = dom['setting-group-avatar-preview'].src;
  g.me.avatar = dom['setting-group-my-avatar-preview'].src;
  g.me.nickname = dom['setting-group-my-nickname'].value;
  g.me.persona = dom['setting-group-my-persona'].value;
  g.theme = dom['setting-group-theme-color'].value;
  g.maxMemory = dom['setting-group-max-memory'].value;
  g.useCustomBubbleCss = dom['setting-group-use-custom-css'].checked;
  g.customBubbleCss = dom['setting-group-custom-bubble-css'].value;
  updateCustomBubbleStyle(state.currentChatId, g.customBubbleCss, g.useCustomBubbleCss);
  await saveData();
  showToast(dom['toast-notification'], '群聊设置已保存！');
  dom['chat-room-title'].textContent = g.name;
  if (_renderChatList) _renderChatList();
  if (_renderMessages) _renderMessages(false, true);
}

function openGroupMemberEditModal(memberId) {
  const g = (getDb().groups || []).find(gr => gr.id === state.currentChatId);
  const m = g?.members.find(me => me.id === memberId);
  if (!m) return;
  dom['edit-group-member-title'].textContent = `编辑 ${m.groupNickname}`;
  dom['editing-member-id'].value = m.id;
  dom['edit-member-avatar-preview'].src = m.avatar;
  dom['edit-member-group-nickname'].value = m.groupNickname;
  dom['edit-member-real-name'].value = m.realName;
  dom['edit-member-persona'].value = m.persona;
  dom['edit-group-member-modal'].classList.add('visible');
  renderMemberBuiltinWBList(m);
}

function renderInviteSelectionList() {
  const g = (getDb().groups || []).find(gr => gr.id === state.currentChatId);
  if (!g) return;
  const list = dom['invite-member-selection-list'];
  list.innerHTML = '';
  const currentCharIds = new Set((g.members || []).map(m => m.originalCharId));
  const available = (getDb().characters || []).filter(c => !currentCharIds.has(c.id));
  if (available.length === 0) {
    list.innerHTML = '<li style="color:#aaa;text-align:center;padding:10px 0;">没有可邀请的新成员了。</li>';
    dom['confirm-invite-btn'].disabled = true;
    return;
  }
  dom['confirm-invite-btn'].disabled = false;
  available.forEach(c => {
    const li = document.createElement('li');
    li.className = 'invite-member-select-item';
    li.innerHTML = `<input type="checkbox" id="invite-select-${c.id}" value="${c.id}">
      <label for="invite-select-${c.id}"><img src="${c.avatar}" alt="${c.remarkName}"><span>${c.remarkName}</span></label>`;
    list.appendChild(li);
  });
}

function sendInviteNotification(group, realName) {
  (group.history || (group.history = [])).push({
    id: 'msg_' + Date.now(),
    role: 'user',
    content: `[${group.me.nickname}邀请${realName}加入了群聊]`,
    parts: [{ type: 'text', text: `[${group.me.nickname}邀请${realName}加入了群聊]` }],
    timestamp: Date.now(),
    senderId: 'user_me',
  });
}

function sendRenameNotification(group, newName) {
  (group.history || (group.history = [])).push({
    id: 'msg_' + Date.now(),
    role: 'user',
    content: `[${group.me.nickname}修改群名为：${newName}]`,
    parts: [{ type: 'text', text: `[${group.me.nickname}修改群名为：${newName}]` }],
    timestamp: Date.now(),
  });
}

// ─── 群组专属世界书管理 ──────────────────

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderGroupBuiltinWorldBooks(g) {
  const container = document.getElementById('setting-group-builtin-wb-list');
  if (!container) return;
  const books = g.builtinWorldBooks || [];
  if (books.length === 0) {
    container.innerHTML = '<div style="font-size:12px;color:#bbb;text-align:center;padding:12px;">暂无群专属世界书条目</div>';
    return;
  }
  container.innerHTML = books.map((book, idx) => `
    <div class="builtin-wb-item" data-idx="${idx}">
      <label class="wb-toggle-switch" style="position:relative;transform:scale(0.85);transform-origin:top left;">
        <input type="checkbox" ${book.enabled !== false ? 'checked' : ''} data-idx="${idx}"><span class="wb-toggle-slider"></span>
      </label>
      <div class="wb-item-content">
        <div class="wb-item-name">${escHtml(book.name)}</div>
        <div class="wb-item-text">${escHtml(book.content)}</div>
      </div>
      <div class="wb-item-actions">
        <button type="button" title="编辑" data-action="edit-group-wb" data-idx="${idx}">✏️</button>
        <button type="button" title="删除" data-action="del-group-wb" data-idx="${idx}">🗑️</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.wb-toggle-switch input').forEach(cb => cb.addEventListener('change', function () {
    const g2 = (getDb().groups || []).find(gr => gr.id === state.currentChatId);
    if (g2 && g2.builtinWorldBooks && g2.builtinWorldBooks[parseInt(this.dataset.idx)]) {
      g2.builtinWorldBooks[parseInt(this.dataset.idx)].enabled = this.checked;
    }
  }));

  container.querySelectorAll('[data-action="edit-group-wb"]').forEach(btn => btn.addEventListener('click', function () {
    const idx = parseInt(this.dataset.idx);
    const g2 = (getDb().groups || []).find(gr => gr.id === state.currentChatId);
    if (g2 && g2.builtinWorldBooks && g2.builtinWorldBooks[idx]) {
      showGroupBuiltinWBEditForm(container, idx, g2.builtinWorldBooks[idx]);
    }
  }));

  container.querySelectorAll('[data-action="del-group-wb"]').forEach(btn => btn.addEventListener('click', async function () {
    if (!confirm('确定删除？')) return;
    const idx = parseInt(this.dataset.idx);
    const g2 = (getDb().groups || []).find(gr => gr.id === state.currentChatId);
    if (g2 && g2.builtinWorldBooks) {
      g2.builtinWorldBooks.splice(idx, 1);
      await saveData();
      renderGroupBuiltinWorldBooks(g2);
    }
  }));
}

function showGroupBuiltinWBEditForm(container, idx, book) {
  const existing = container.querySelector('.builtin-wb-edit-form');
  if (existing) existing.remove();

  const form = document.createElement('div');
  form.className = 'builtin-wb-edit-form';
  form.style.cssText = 'background:#fafafa;border:1px solid #eee;border-radius:8px;padding:10px;margin-bottom:8px;';
  form.innerHTML = `
    <input type="text" class="wb-edit-name" value="${escHtml(book.name)}" placeholder="条目名称" style="width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;margin-bottom:6px;">
    <textarea class="wb-edit-content" placeholder="条目内容" style="width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:12px;min-height:60px;resize:vertical;margin-bottom:6px;">${escHtml(book.content)}</textarea>
    <div style="margin-bottom:6px;display:flex;align-items:center;gap:12px;font-size:12px;">
      <label style="display:flex;align-items:center;gap:4px;"><input type="radio" name="wb-edit-pos" value="before" ${book.position === 'before' ? 'checked' : ''}> 注入前</label>
      <label style="display:flex;align-items:center;gap:4px;"><input type="radio" name="wb-edit-pos" value="after" ${book.position === 'after' ? 'checked' : ''}> 注入后</label>
      <span style="color:#bbb;margin-left:auto;">群专属</span>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button type="button" class="btn btn-neutral wb-edit-cancel-btn" style="color:#666;padding:6px 14px;">取消</button>
      <button type="button" class="btn btn-primary wb-edit-save-btn" style="padding:6px 14px;">保存</button>
    </div>
  `;

  container.prepend(form);
  form.querySelector('.wb-edit-name').focus();

  form.querySelector('.wb-edit-save-btn').addEventListener('click', async () => {
    const g2 = (getDb().groups || []).find(gr => gr.id === state.currentChatId);
    if (!g2 || !g2.builtinWorldBooks || !g2.builtinWorldBooks[idx]) return;
    const name = form.querySelector('.wb-edit-name').value.trim();
    const content = form.querySelector('.wb-edit-content').value.trim();
    const position = form.querySelector('input[name="wb-edit-pos"]:checked')?.value || 'before';
    if (!name || !content) { showToast(dom['toast-notification'], '名称和内容不能为空'); return; }
    g2.builtinWorldBooks[idx] = { ...g2.builtinWorldBooks[idx], name, content, position };
    await saveData();
    form.remove();
    renderGroupBuiltinWorldBooks(g2);
    showToast(dom['toast-notification'], '✅ 群专属世界书已保存');
  });

  form.querySelector('.wb-edit-cancel-btn').addEventListener('click', () => form.remove());
}

// ─── 成员专属世界书管理 ──────────────────

function renderMemberBuiltinWBList(member) {
  const container = document.getElementById('edit-member-wb-list');
  if (!container) return;
  const books = member.builtinWorldBooks || [];
  if (books.length === 0) {
    container.innerHTML = '<div style="font-size:11px;color:#ccc;text-align:center;padding:6px;">暂无专属条目</div>';
    return;
  }
  container.innerHTML = books.map((book, idx) => `
    <div style="display:flex;align-items:flex-start;gap:4px;padding:4px 0;border-bottom:1px solid #f5f5f5;font-size:11px;">
      <div style="flex:1;min-width:0;">
        <div style="font-weight:500;">${escHtml(book.name)}</div>
        <div style="color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(book.content)}</div>
      </div>
      <button style="background:none;border:none;cursor:pointer;color:#e53935;font-size:12px;padding:2px 4px;" data-idx="${idx}">✕</button>
    </div>
  `).join('');

  container.querySelectorAll('[data-idx]').forEach(btn => btn.addEventListener('click', async function () {
    const memberId = document.getElementById('editing-member-id')?.value;
    const g = (getDb().groups || []).find(gr => gr.id === state.currentChatId);
    const mem = g?.members.find(m => m.id === memberId);
    if (mem && mem.builtinWorldBooks) {
      mem.builtinWorldBooks.splice(parseInt(this.dataset.idx), 1);
      await saveData();
      renderMemberBuiltinWBList(mem);
    }
  }));
}

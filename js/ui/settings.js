/* ========================================
   Settings - 聊天设置侧边栏
   ======================================== */

import { state } from '../core/state.js';
import { getDb, saveData } from '../core/dataService.js';
import { showToast, updateCustomBubbleStyle, updateBubbleCssPreview, compressImage, colorThemes } from '../core/utils.js';

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
  const themeSelect = dom['setting-theme-color'];
  themeSelect.innerHTML = '';
  Object.keys(colorThemes).forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = colorThemes[key].name;
    themeSelect.appendChild(opt);
  });

  // 打开设置侧边栏
  dom['chat-settings-btn'].addEventListener('click', () => {
    if (state.currentChatType === 'private') {
      loadSettingsToSidebar();
      dom['chat-settings-sidebar'].classList.add('open');
    } else if (state.currentChatType === 'group') {
      import('../systems/group.js').then(mod => {
        mod.loadGroupSettingsToSidebar();
        dom['group-settings-sidebar'].classList.add('open');
      });
    }
  });

  // 点击侧边栏外关闭
  document.querySelector('.phone-screen').addEventListener('click', e => {
    const openSidebar = document.querySelector('.settings-sidebar.open');
    if (openSidebar && !openSidebar.contains(e.target) &&
        !dom['chat-settings-btn'].contains(e.target) &&
        !e.target.closest('.modal-overlay') &&
        !e.target.closest('.action-sheet-overlay')) {
      openSidebar.classList.remove('open');
    }
  });

  dom['settings-form'].addEventListener('submit', e => {
    e.preventDefault();
    saveSettingsFromSidebar();
    dom['chat-settings-sidebar'].classList.remove('open');
  });

  // CSS 自定义气泡
  const useCss = dom['setting-use-custom-css'];
  const cssText = dom['setting-custom-bubble-css'];
  const resetCss = dom['reset-custom-bubble-css-btn'];
  const previewBox = dom['private-bubble-css-preview'];

  useCss.addEventListener('change', (e) => {
    cssText.disabled = !e.target.checked;
    const c = getDb().characters.find(ch => ch.id === state.currentChatId);
    if (c) updateBubbleCssPreview(previewBox, cssText.value, !e.target.checked, colorThemes[c.theme || 'white_pink']);
  });

  cssText.addEventListener('input', (e) => {
    const c = getDb().characters.find(ch => ch.id === state.currentChatId);
    if (c && useCss.checked) updateBubbleCssPreview(previewBox, e.target.value, false, colorThemes[c.theme || 'white_pink']);
  });

  resetCss.addEventListener('click', () => {
    const c = getDb().characters.find(ch => ch.id === state.currentChatId);
    if (c) {
      cssText.value = '';
      useCss.checked = false;
      cssText.disabled = true;
      updateBubbleCssPreview(previewBox, '', true, colorThemes[c.theme || 'white_pink']);
      showToast(dom['toast-notification'], '样式已重置为默认');
    }
  });

  // 头像上传
  dom['setting-char-avatar-upload'].addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      try { dom['setting-char-avatar-preview'].src = await compressImage(file, { quality: 0.8, maxWidth: 400, maxHeight: 400 }); }
      catch (err) { showToast(dom['toast-notification'], '头像压缩失败'); }
    }
  });

  // AI 生成头像（基于角色人设）
  dom['setting-char-avatar-ai-btn'].addEventListener('click', async () => {
    const persona = dom['setting-char-persona'].value.trim();
    if (!persona) {
      showToast(dom['toast-notification'], '请先填写角色人设作为头像生成提示词');
      dom['setting-char-persona'].focus();
      return;
    }
    const btn = dom['setting-char-avatar-ai-btn'];
    const originalText = btn.textContent;
    btn.textContent = '⏳ 生成中...';
    btn.disabled = true;
    try {
      const prompt = `角色头像，anime风格，精美角色立绘图，基于以下人设：\n${persona}\n\n要求：半身像或胸像，干净背景，柔和光线，突出角色特征，高画质。`;
      const imageUrl = await Engine.services.aiGenerateImage(prompt, { imageSize: '512x512' });
      dom['setting-char-avatar-preview'].src = imageUrl;
      showToast(dom['toast-notification'], '✅ 头像已 AI 生成');
    } catch (err) {
      showToast(dom['toast-notification'], '头像生成失败: ' + (err.message || '未知错误'));
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });

  dom['setting-my-avatar-upload'].addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      try { dom['setting-my-avatar-preview'].src = await compressImage(file, { quality: 0.8, maxWidth: 400, maxHeight: 400 }); }
      catch (err) { showToast(dom['toast-notification'], '头像压缩失败'); }
    }
  });

  // 聊天背景
  dom['setting-chat-bg-upload'].addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const c = getDb().characters.find(ch => ch.id === state.currentChatId);
    if (c) {
      try {
        c.chatBg = await compressImage(file, { quality: 0.85, maxWidth: 1080, maxHeight: 1920 });
        dom['chat-room-screen'].style.backgroundImage = `url(${c.chatBg})`;
        await saveData();
        showToast(dom['toast-notification'], '聊天背景已更换');
      } catch (err) { showToast(dom['toast-notification'], '背景压缩失败'); }
    }
  });

  // 清空历史
  dom['clear-chat-history-btn'].addEventListener('click', async () => {
    const c = getDb().characters.find(ch => ch.id === state.currentChatId);
    if (c && confirm(`确定要清空与"${c.remarkName}"的所有聊天记录吗？`)) {
      c.history = [];
      await saveData();
      if (_renderMessages) _renderMessages(false, true);
      if (_renderChatList) _renderChatList();
      dom['chat-settings-sidebar'].classList.remove('open');
      showToast(dom['toast-notification'], '聊天记录已清空');
    }
  });

  // 世界书关联
  dom['link-world-book-btn'].addEventListener('click', () => {
    const c = getDb().characters.find(ch => ch.id === state.currentChatId);
    if (!c) return;
    const list = dom['world-book-selection-list'];
    list.innerHTML = '';
    (getDb().worldBooks || []).forEach(book => {
      const li = document.createElement('li');
      li.className = 'world-book-select-item';
      li.innerHTML = `<input type="checkbox" id="wb-select-${book.id}" value="${book.id}" ${(c.worldBookIds || []).includes(book.id) ? 'checked' : ''}>
        <label for="wb-select-${book.id}">${book.name}</label>`;
      list.appendChild(li);
    });
    dom['world-book-selection-modal'].classList.add('visible');
  });

  dom['save-world-book-selection-btn'].addEventListener('click', async () => {
    const selectedIds = Array.from(dom['world-book-selection-list'].querySelectorAll('input:checked')).map(i => i.value);
    if (state.currentChatType === 'private') {
      const c = getDb().characters.find(ch => ch.id === state.currentChatId);
      if (c) c.worldBookIds = selectedIds;
    } else if (state.currentChatType === 'group') {
      const g = getDb().groups.find(gr => gr.id === state.currentChatId);
      if (g) g.worldBookIds = selectedIds;
    }
    await saveData();
    dom['world-book-selection-modal'].classList.remove('visible');
    showToast(dom['toast-notification'], '世界书关联已更新');
  });

  // 记忆系统按钮
  const genSummaryBtn = dom['btn-gen-summary'];
  if (genSummaryBtn) {
    genSummaryBtn.addEventListener('click', async () => {
      const c = getDb().characters.find(ch => ch.id === state.currentChatId);
      if (!c || !c.history || c.history.length === 0) {
        showToast(dom['toast-notification'], '没有聊天记录可以总结');
        return;
      }
      const db = getDb();
      const api = db.apiPresets?.find(p => p.id === db.activeApiPresetId) || db.apiSettings || {};
      if (!api.url || !api.key || !api.model) {
        showToast(dom['toast-notification'], '请先配置 AI 接口');
        return;
      }
      genSummaryBtn.textContent = '⏳ 生成中...';
      genSummaryBtn.disabled = true;
      try {
        const historyText = c.history.map(m => {
          const t = (m.content || '').replace(/\[.*?\]/g, '').trim();
          return t ? (m.role === 'user' ? `我: ${t}` : `${c.remarkName}: ${t}`) : '';
        }).filter(Boolean).slice(-60).join('\n');
        const prompt = `以下是"${c.remarkName}"和"${c.myName}"的对话记录，请用3-5句话概括对话中的重要内容：双方关系进展、共同经历、约好的事情、了解到的彼此信息。不要编造不存在的内容。\n\n对话记录：\n${historyText}`;

        let fullText = '';
        if (api.provider === 'gemini') {
          const apiUrl = api.url.replace(/\/+$/, '');
          const resp = await fetch(apiUrl + '/v1beta/models/' + api.model + ':generateContent?key=' + api.key, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 500 } })
          });
          const json = await resp.json();
          fullText = (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts && json.candidates[0].content.parts[0]) ? json.candidates[0].content.parts[0].text : '';
        } else {
          const apiUrl = api.url.replace(/\/+$/, '');
          const resp = await fetch(apiUrl + '/v1/chat/completions', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
            body: JSON.stringify({ model: api.model, stream: false, temperature: 0.7, max_tokens: 500, messages: [{ role: 'user', content: prompt }] })
          });
          const json = await resp.json();
          fullText = (json.choices && json.choices[0] && json.choices[0].message) ? json.choices[0].message.content : '';
        }
        c.memorySummary = fullText || '（生成失败）';
        dom['setting-memory-summary'].value = c.memorySummary;
        await saveData();
        showToast(dom['toast-notification'], '记忆摘要已生成 📝');
      } catch (err) {
        console.error('[Summary] 生成失败:', err);
        showToast(dom['toast-notification'], '生成失败: ' + err.message);
      } finally {
        genSummaryBtn.textContent = '生成摘要';
        genSummaryBtn.disabled = false;
      }
    });
  }

  // 清空摘要
  const clearSummaryBtn = dom['btn-clear-summary'];
  if (clearSummaryBtn) {
    clearSummaryBtn.addEventListener('click', async () => {
      const c = getDb().characters.find(ch => ch.id === state.currentChatId);
      if (c) {
        c.memorySummary = '';
        dom['setting-memory-summary'].value = '';
        await saveData();
        showToast(dom['toast-notification'], '记忆摘要已清空');
      }
    });
  }

  // 清空关键事件
  const clearKeyEventsBtn = dom['btn-clear-keyevents'];
  if (clearKeyEventsBtn) {
    clearKeyEventsBtn.addEventListener('click', async () => {
      const c = getDb().characters.find(ch => ch.id === state.currentChatId);
      if (c && c.keyEvents && confirm('确定清空所有关键事件吗？')) {
        c.keyEvents = [];
        renderKeyEventsList(c);
        await saveData();
        showToast(dom['toast-notification'], '关键事件已清空');
      }
    });
  }
}

// ─── 加载设置 ──────────────────────────

function loadSettingsToSidebar() {
  const c = getDb().characters.find(ch => ch.id === state.currentChatId);
  if (!c) return;

  dom['setting-char-avatar-preview'].src = c.avatar;
  dom['setting-char-remark'].value = c.remarkName;
  dom['setting-char-persona'].value = c.persona;
  dom['setting-my-avatar-preview'].src = c.myAvatar;
  dom['setting-my-name'].value = c.myName;
  dom['setting-my-persona'].value = c.myPersona;
  dom['setting-theme-color'].value = c.theme || 'white_pink';
  dom['setting-max-memory'].value = c.maxMemory;

  const useCss = dom['setting-use-custom-css'];
  const cssText = dom['setting-custom-bubble-css'];
  const previewBox = dom['private-bubble-css-preview'];
  useCss.checked = c.useCustomBubbleCss || false;
  cssText.value = c.customBubbleCss || '';
  cssText.disabled = !useCss.checked;
  updateBubbleCssPreview(previewBox, c.customBubbleCss, !c.useCustomBubbleCss, colorThemes[c.theme || 'white_pink']);

  dom['setting-ai-img-gen'].checked = c.aiImgGen || false;
  dom['setting-memory-summary'].value = c.memorySummary || '';
  renderKeyEventsList(c);
}

async function saveSettingsFromSidebar() {
  const c = getDb().characters.find(ch => ch.id === state.currentChatId);
  if (!c) return;

  c.avatar = dom['setting-char-avatar-preview'].src;
  c.remarkName = dom['setting-char-remark'].value;
  c.persona = dom['setting-char-persona'].value;
  c.myAvatar = dom['setting-my-avatar-preview'].src;
  c.myName = dom['setting-my-name'].value;
  c.myPersona = dom['setting-my-persona'].value;
  c.theme = dom['setting-theme-color'].value;
  c.maxMemory = parseInt(dom['setting-max-memory'].value) || 100;
  c.useCustomBubbleCss = dom['setting-use-custom-css'].checked;
  c.customBubbleCss = dom['setting-custom-bubble-css'].value;
  c.aiImgGen = dom['setting-ai-img-gen'].checked;
  c.memorySummary = dom['setting-memory-summary'].value.trim();

  await saveData();
  showToast(dom['toast-notification'], '设置已保存！');
  dom['chat-room-title'].textContent = c.remarkName;
  if (_renderChatList) _renderChatList();
  updateCustomBubbleStyle(state.currentChatId, c.customBubbleCss, c.useCustomBubbleCss);
  state.currentPage = 1;
  if (_renderMessages) _renderMessages(false, true);
}

export function renderKeyEventsList(c) {
  const list = dom['setting-key-events-list'];
  if (!list) return;
  if (!c.keyEvents || c.keyEvents.length === 0) {
    list.innerHTML = '<span style="color:#bbb;">暂无关键事件，长按消息可标记 ⭐</span>';
    return;
  }
  list.innerHTML = c.keyEvents.map((ev, i) =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #f5f5f5;">
      <span>${ev}</span>
      <button class="del-keyevent-btn" data-idx="${i}" style="background:none;border:none;color:#ff6b6b;cursor:pointer;font-size:14px;padding:2px;">✕</button>
    </div>`
  ).join('');
  list.querySelectorAll('.del-keyevent-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const c2 = getDb().characters.find(ch => ch.id === state.currentChatId);
      if (c2 && c2.keyEvents) {
        c2.keyEvents.splice(parseInt(btn.dataset.idx), 1);
        await saveData();
        renderKeyEventsList(c2);
      }
    });
  });
}

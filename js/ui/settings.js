/* ========================================
   Settings - 聊天设置侧边栏
   ======================================== */

import { state } from '../core/state.js';
import { getDb, saveData } from '../core/dataService.js';
import { showToast, updateCustomBubbleStyle, updateBubbleCssPreview, compressImage, colorThemes } from '../core/utils.js';
import { getEffectivePrompt, fillTemplate } from './promptDefaults.js';

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

  dom['chat-settings-form'].addEventListener('submit', e => {
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

  // AI 生成头像(基于角色人设)
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
      const db = getDb();
      const prompt = fillTemplate(getEffectivePrompt('avatar_gen', db), { persona });
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
    if (c && confirm(`确定要清空与"${c.remarkName}"的所有聊天记录吗?`)) {
      c.history = [];
      await saveData();
      if (_renderMessages) _renderMessages(false, true);
      if (_renderChatList) _renderChatList();
      dom['chat-settings-sidebar'].classList.remove('open');
      showToast(dom['toast-notification'], '聊天记录已清空');
    }
  });

  // ─── 每角色 TTS 设置 ───
  const settingTtsEngine = dom['setting-tts-engine'];
  if (settingTtsEngine) {
    settingTtsEngine.addEventListener('change', () => {
      const sogouOpts = document.getElementById('setting-tts-sogou-options');
      if (sogouOpts) sogouOpts.style.display = settingTtsEngine.value === 'sogou' ? '' : 'none';
    });
  }
  const settingTtsSpeed = dom['setting-tts-speed'];
  const settingTtsSpeedLabel = dom['setting-tts-speed-label'];
  if (settingTtsSpeed && settingTtsSpeedLabel) {
    settingTtsSpeed.addEventListener('input', () => { settingTtsSpeedLabel.textContent = settingTtsSpeed.value; });
  }
  dom['setting-tts-preview-btn']?.addEventListener('click', () => {
    const c = getDb().characters.find(ch => ch.id === state.currentChatId);
    const engine = dom['setting-tts-engine']?.value || 'global';
    const speaker = parseInt(dom['setting-tts-speaker']?.value) || 1;
    const speed = parseInt(dom['setting-tts-speed']?.value) || 3;
    const name = c ? c.remarkName : 'AI助手';
    if (window.ttsService) {
      window.ttsService.speak(`你好,我是${name},这是语音朗读试听。`, { engine: engine === 'global' ? undefined : engine, sogouSpeaker: speaker, sogouSpeed: speed });
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
        const prompt = fillTemplate(getEffectivePrompt('memory_summary', db), { remarkName: c.remarkName, myName: c.myName, historyText });

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
        c.memorySummary = fullText || '(生成失败)';
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
      if (c && c.keyEvents && confirm('确定清空所有关键事件吗?')) {
        c.keyEvents = [];
        renderKeyEventsList(c);
        await saveData();
        showToast(dom['toast-notification'], '关键事件已清空');
      }
    });
  }

  // 专属世界书添加按钮
  const addBuiltinWBBtn = document.getElementById('setting-add-builtin-wb');
  if (addBuiltinWBBtn && !addBuiltinWBBtn._bound) {
    addBuiltinWBBtn._bound = true;
    addBuiltinWBBtn.addEventListener('click', () => {
      const c = getDb().characters.find(ch => ch.id === state.currentChatId);
      if (!c) return;
      if (!c.builtinWorldBooks) c.builtinWorldBooks = [];
      c.builtinWorldBooks.push({ name: '', content: '', position: 'before', enabled: true });
      renderBuiltinWorldBooks(c);
      // 自动展开编辑
      const container = document.getElementById('setting-builtin-wb-list');
      const lastItem = container?.querySelector('.builtin-wb-item:last-child');
      if (lastItem) {
        const editBtn = lastItem.querySelector('[data-action="edit"]');
        if (editBtn) editBtn.click();
      }
    });
  }
}

// ─── 加载设置 ──────────────────────────

function loadSettingsToSidebar() {
  const c = getDb().characters.find(ch => ch.id === state.currentChatId);
  if (!c) return;

  dom['setting-char-avatar-preview'].src = c.avatar;
  dom['setting-char-real-name'].value = c.realName || '';
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
  renderBuiltinWorldBooks(c);

  // TTS 设置
  const ttsCfg = c.ttsConfig || { engine: 'global', sogouSpeaker: 1, sogouSpeed: 3 };
  const ttsEngineSel = dom['setting-tts-engine'];
  if (ttsEngineSel) ttsEngineSel.value = ttsCfg.engine || 'global';
  const ttsSpeakerSel = dom['setting-tts-speaker'];
  if (ttsSpeakerSel) ttsSpeakerSel.value = ttsCfg.sogouSpeaker || 1;
  const ttsSpeedSlider = dom['setting-tts-speed'];
  if (ttsSpeedSlider) ttsSpeedSlider.value = ttsCfg.sogouSpeed || 3;
  const ttsSpeedLabel = dom['setting-tts-speed-label'];
  if (ttsSpeedLabel) ttsSpeedLabel.textContent = ttsCfg.sogouSpeed || 3;
  const ttsSogouOpts = document.getElementById('setting-tts-sogou-options');
  if (ttsSogouOpts) ttsSogouOpts.style.display = ttsCfg.engine === 'sogou' ? '' : 'none';
}

async function saveSettingsFromSidebar() {
  const c = getDb().characters.find(ch => ch.id === state.currentChatId);
  if (!c) return;

  c.avatar = dom['setting-char-avatar-preview'].src;
  c.realName = dom['setting-char-real-name'].value;
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

  // TTS 设置
  c.ttsConfig = {
    engine: dom['setting-tts-engine']?.value || 'global',
    sogouSpeaker: parseInt(dom['setting-tts-speaker']?.value) || 1,
    sogouSpeed: parseInt(dom['setting-tts-speed']?.value) || 3,
  };

  await saveData();
  showToast(dom['toast-notification'], '设置已保存!');
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
    list.innerHTML = '<span style="color:#bbb;">暂无关键事件,长按消息可标记 ⭐</span>';
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

// ─── 专属世界书管理 ──────────────────────

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderBuiltinWorldBooks(c) {
  const container = document.getElementById('setting-builtin-wb-list');
  const countEl = document.getElementById('setting-wb-count');
  if (!container) return;
  const books = c.builtinWorldBooks || [];
  if (countEl) countEl.textContent = books.length;

  if (books.length === 0) {
    container.innerHTML = '<div style="font-size:12px;color:#bbb;text-align:center;padding:12px;">暂无专属世界书条目</div>';
    return;
  }

  container.innerHTML = books.map((book, idx) => `
    <div class="builtin-wb-item" data-idx="${idx}">
      <label class="wb-toggle-switch" style="position:relative;transform:scale(0.85);transform-origin:top left;" title="${book.enabled !== false ? '点击停用' : '点击启用'}">
        <input type="checkbox" ${book.enabled !== false ? 'checked' : ''} data-idx="${idx}"><span class="wb-toggle-slider"></span>
      </label>
      <div class="wb-item-content">
        <div class="wb-item-name">${escHtml(book.name)}</div>
        <div class="wb-item-text">${escHtml(book.content)}</div>
      </div>
      <div class="wb-item-actions">
        <button type="button" title="编辑" data-action="edit" data-idx="${idx}">✏️</button>
        <button type="button" title="删除" data-action="delete" data-idx="${idx}">🗑️</button>
      </div>
    </div>
  `).join('');

  // 启用/停用开关
  container.querySelectorAll('.wb-toggle-switch input').forEach(cb => {
    cb.addEventListener('change', function () {
      const c2 = getDb().characters.find(ch => ch.id === state.currentChatId);
      if (c2 && c2.builtinWorldBooks && c2.builtinWorldBooks[parseInt(this.dataset.idx)]) {
        c2.builtinWorldBooks[parseInt(this.dataset.idx)].enabled = this.checked;
      }
    });
  });

  // 编辑按钮
  container.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const idx = parseInt(this.dataset.idx);
      const c2 = getDb().characters.find(ch => ch.id === state.currentChatId);
      if (!c2 || !c2.builtinWorldBooks || !c2.builtinWorldBooks[idx]) return;
      showBuiltinWBEditForm(container, idx, c2.builtinWorldBooks[idx]);
    });
  });

  // 删除按钮
  container.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', async function (e) {
      e.stopPropagation();
      if (!confirm('确定删除该条目吗?')) return;
      const idx = parseInt(this.dataset.idx);
      const c2 = getDb().characters.find(ch => ch.id === state.currentChatId);
      if (c2 && c2.builtinWorldBooks) {
        c2.builtinWorldBooks.splice(idx, 1);
        await saveData();
        renderBuiltinWorldBooks(c2);
      }
    });
  });
}

function showBuiltinWBEditForm(container, idx, book) {
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
      <span style="color:#bbb;margin-left:auto;">专属世界书</span>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button type="button" class="btn btn-neutral wb-edit-cancel-btn" style="color:#666;padding:6px 14px;">取消</button>
      <button type="button" class="btn btn-primary wb-edit-save-btn" style="padding:6px 14px;">保存</button>
    </div>
  `;

  container.prepend(form);
  form.querySelector('.wb-edit-name').focus();

  form.querySelector('.wb-edit-save-btn').addEventListener('click', async () => {
    const c2 = getDb().characters.find(ch => ch.id === state.currentChatId);
    if (!c2 || !c2.builtinWorldBooks || !c2.builtinWorldBooks[idx]) return;
    const name = form.querySelector('.wb-edit-name').value.trim();
    const content = form.querySelector('.wb-edit-content').value.trim();
    const position = form.querySelector('input[name="wb-edit-pos"]:checked')?.value || 'before';
    if (!name || !content) { showToast(dom['toast-notification'], '名称和内容不能为空'); return; }
    c2.builtinWorldBooks[idx] = { ...c2.builtinWorldBooks[idx], name, content, position };
    await saveData();
    form.remove();
    renderBuiltinWorldBooks(c2);
    showToast(dom['toast-notification'], '✅ 专属世界书已保存');
  });

  form.querySelector('.wb-edit-cancel-btn').addEventListener('click', () => form.remove());
}

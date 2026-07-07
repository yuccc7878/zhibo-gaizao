/* ========================================
   BubbleWorkshop - 气泡工坊 v2
   可视化气泡样式编辑器（增强版）
   ======================================== */

import { getDb, saveData } from '../core/dataService.js';
import { showToast } from '../core/utils.js';

let dom = null;
let currentChatId = null;
let currentChatType = null;
let savedSnapshot = null; // B面板快照

// ─── 预设模板（10 套）───
const PRESETS = [
  {
    id: 'default', name: '默认', desc: '经典粉白配色',
    user: { textColor: '#A56767', bgColor: '#ffcccc', bgAlpha: 0.9, radius: 18, opacity: 1, padding: 10, shadow: '' },
    ai:   { textColor: '#6D6D6D', bgColor: '#ffffff', bgAlpha: 0.9, radius: 18, opacity: 1, padding: 10, shadow: '' },
  },
  {
    id: 'cream', name: '奶油', desc: '温暖低饱和，柔和阴影',
    user: { textColor: '#7c2d12', bgColor: '#fef3c7', bgAlpha: 0.92, radius: 20, opacity: 1, padding: 12, shadow: '0 8px 24px rgba(217,119,6,0.18)' },
    ai:   { textColor: '#78350f', bgColor: '#fffbeb', bgAlpha: 0.9, radius: 20, opacity: 1, padding: 12, shadow: '0 6px 20px rgba(180,83,9,0.14)' },
  },
  {
    id: 'glass', name: '玻璃', desc: '半透明磨砂，轻薄边缘',
    user: { textColor: '#0f172a', bgColor: '#bfdbfe', bgAlpha: 0.78, radius: 18, opacity: 0.98, padding: 12, shadow: '0 10px 28px rgba(30,41,59,0.16)' },
    ai:   { textColor: '#0f172a', bgColor: '#ffffff', bgAlpha: 0.72, radius: 18, opacity: 0.98, padding: 12, shadow: '0 8px 22px rgba(30,41,59,0.13)' },
  },
  {
    id: 'neon', name: '霓虹', desc: '高对比荧光，发光轮廓',
    user: { textColor: '#faf5ff', bgColor: '#581c87', bgAlpha: 0.9, radius: 16, opacity: 1, padding: 10, shadow: '0 0 18px rgba(217,70,239,0.55)' },
    ai:   { textColor: '#e0f2fe', bgColor: '#0c4a6e', bgAlpha: 0.9, radius: 16, opacity: 1, padding: 10, shadow: '0 0 18px rgba(14,165,233,0.55)' },
  },
  {
    id: 'dark', name: '暗黑', desc: '深色背景，低对比',
    user: { textColor: '#fff', bgColor: '#6366f1', bgAlpha: 0.85, radius: 16, opacity: 1, padding: 10, shadow: '0 4px 15px rgba(99,102,241,0.3)' },
    ai:   { textColor: '#e0e0e0', bgColor: '#1e1e1e', bgAlpha: 0.85, radius: 16, opacity: 1, padding: 10, shadow: '0 4px 15px rgba(0,0,0,0.3)' },
  },
  {
    id: 'minimal', name: '极简', desc: '低阴影，清爽留白',
    user: { textColor: '#0f172a', bgColor: '#e2e8f0', bgAlpha: 0.86, radius: 20, opacity: 0.97, padding: 14, shadow: '0 2px 8px rgba(15,23,42,0.08)' },
    ai:   { textColor: '#1e293b', bgColor: '#f8fafc', bgAlpha: 0.85, radius: 20, opacity: 0.97, padding: 14, shadow: '0 2px 8px rgba(15,23,42,0.06)' },
  },
  {
    id: 'paper', name: '纸感', desc: '微黄纸张，颗粒质感',
    user: { textColor: '#3f3f46', bgColor: '#fef9c3', bgAlpha: 0.93, radius: 14, opacity: 1, padding: 10, shadow: '2px 2px 0 rgba(120,113,108,0.32)' },
    ai:   { textColor: '#44403c', bgColor: '#fefce8', bgAlpha: 0.93, radius: 14, opacity: 1, padding: 10, shadow: '2px 2px 0 rgba(113,113,122,0.26)' },
  },
  {
    id: 'mint', name: '薄荷', desc: '清新薄荷绿',
    user: { textColor: '#065f46', bgColor: '#a7f3d0', bgAlpha: 0.85, radius: 18, opacity: 1, padding: 12, shadow: '0 6px 16px rgba(16,185,129,0.15)' },
    ai:   { textColor: '#064e3b', bgColor: '#ecfdf5', bgAlpha: 0.9, radius: 18, opacity: 1, padding: 12, shadow: '0 4px 12px rgba(16,185,129,0.1)' },
  },
  {
    id: 'lavender', name: '薰衣草', desc: '柔和紫调',
    user: { textColor: '#4c1d95', bgColor: '#ddd6fe', bgAlpha: 0.88, radius: 20, opacity: 1, padding: 12, shadow: '0 8px 20px rgba(139,92,246,0.15)' },
    ai:   { textColor: '#5b21b6', bgColor: '#f5f3ff', bgAlpha: 0.9, radius: 20, opacity: 1, padding: 12, shadow: '0 6px 16px rgba(139,92,246,0.1)' },
  },
  {
    id: 'sunset', name: '日落', desc: '暖橘渐变',
    user: { textColor: '#fff', bgColor: '#f97316', bgAlpha: 0.88, radius: 16, opacity: 1, padding: 10, shadow: '0 8px 20px rgba(249,115,22,0.25)' },
    ai:   { textColor: '#7c2d12', bgColor: '#ffedd5', bgAlpha: 0.92, radius: 16, opacity: 1, padding: 10, shadow: '0 6px 16px rgba(249,115,22,0.12)' },
  },
];

// ─── 阴影预设 ───
const SHADOW_PRESETS = [
  { name: '无', value: '' },
  { name: '轻柔', value: '0 2px 8px rgba(0,0,0,0.08)' },
  { name: '中等', value: '0 6px 16px rgba(0,0,0,0.12)' },
  { name: '强烈', value: '0 10px 28px rgba(0,0,0,0.18)' },
  { name: '发光', value: '0 0 16px rgba(99,102,241,0.4)' },
  { name: '霓虹粉', value: '0 0 18px rgba(236,72,153,0.5)' },
  { name: '霓虹蓝', value: '0 0 18px rgba(59,130,246,0.5)' },
  { name: '内陷', value: 'inset 0 2px 6px rgba(0,0,0,0.1)' },
  { name: '硬边', value: '3px 3px 0 rgba(0,0,0,0.2)' },
];

// ─── 快速 CSS 片段 ───
const CSS_SNIPPETS = [
  { name: '🧊 毛玻璃', code: `.message-bubble.sent, .message-bubble.received {\n  backdrop-filter: blur(10px);\n  border: 1px solid rgba(255,255,255,0.4);\n}\n.message-bubble.sent { background: rgba(255,128,171,0.6) !important; }\n.message-bubble.received { background: rgba(255,255,255,0.6) !important; }` },
  { name: '💜 霓虹边框', code: `.message-bubble.sent { border: 2px solid #a855f7; box-shadow: 0 0 10px #a855f7; background: #2e1065 !important; color: #fff !important; }\n.message-bubble.received { border: 2px solid #3b82f6; box-shadow: 0 0 10px #3b82f6; background: #172554 !important; color: #fff !important; }` },
  { name: '🎮 像素风', code: `.message-bubble.sent, .message-bubble.received {\n  border-radius: 0 !important;\n  border: 3px solid #2d2d2d;\n  box-shadow: 4px 4px 0 #2d2d2d;\n  font-family: 'Courier New', monospace;\n  image-rendering: pixelated;\n}` },
  { name: '🌈 渐变', code: `.message-bubble.sent { background: linear-gradient(135deg, #6366f1, #8b5cf6) !important; color: #fff !important; }\n.message-bubble.received { background: linear-gradient(135deg, #fff, #e2e8f0) !important; }` },
  { name: '✨ 描边', code: `.message-bubble.sent, .message-bubble.received {\n  border: 1px solid rgba(148,163,184,0.45);\n}` },
  { name: '📰 报纸', code: `.message-bubble.sent, .message-bubble.received {\n  background: #fefce8 !important;\n  border: 1px solid #d4d4d8;\n  font-family: Georgia, serif;\n  box-shadow: 2px 2px 0 rgba(0,0,0,0.1);\n}` },
];

// ─── 初始化 ───
export function init(_dom) {
  dom = _dom;
  bindEvents();
}

function bindEvents() {
  // 返回
  document.getElementById('bubble-workshop-back')?.addEventListener('click', goBack);

  // 预设点击
  document.getElementById('bubble-preset-grid')?.addEventListener('click', (e) => {
    const card = e.target.closest('.bubble-preset-card');
    if (!card) return;
    const pid = card.dataset.presetId;
    let preset = PRESETS.find(p => p.id === pid);
    // 动态「跟随主题」预设
    if (!preset && pid === '_theme') {
      const db = getDb();
      const h = db.themeHue ?? 260, s = db.themeSat ?? 80, l = db.themeLit ?? 66;
      preset = {
        id: '_theme', name: '跟随主题',
        user: { textColor: l > 60 ? hslToHex(h, 30, 25) : '#ffffff', bgColor: hslToHex(h, s, l), bgAlpha: 0.85, radius: 18, opacity: 1, padding: 10, shadow: `0 4px 15px hsla(${h},60%,50%,0.3)` },
        ai:   { textColor: hslToHex(h, 20, 45), bgColor: hslToHex(h, Math.max(s-30,10), 95), bgAlpha: 0.9, radius: 18, opacity: 1, padding: 10, shadow: '' },
      };
    }
    if (!preset) return;
    applyPresetToForm(preset);
    updatePreview();
  });

  // 角色标签
  document.getElementById('bubble-role-tabs')?.addEventListener('click', (e) => {
    const tab = e.target.closest('.bubble-role-tab');
    if (!tab) return;
    document.querySelectorAll('.bubble-role-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const role = tab.dataset.role;
    document.querySelectorAll('.bubble-role-panel').forEach(p => p.classList.toggle('active', p.dataset.role === role));
  });

  // 实时预览
  const allInputs = [
    'bu-text-color','bu-bg-color','bu-bg-alpha','bu-radius','bu-opacity','bu-padding','bu-shadow',
    'ba-text-color','ba-bg-color','ba-bg-alpha','ba-radius','ba-opacity','ba-padding','ba-shadow',
  ];
  allInputs.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      // 更新显示值
      const valEl = document.getElementById(id + '-val');
      if (valEl) {
        let v = el.value;
        if (id.includes('alpha') || id.includes('opacity')) v = Math.round(parseFloat(v) * 100) + '%';
        else if (id.includes('radius') || id.includes('padding')) v = v + 'px';
        valEl.textContent = v;
      }
      // 同步开关
      if (id.startsWith('bu-') && document.getElementById('bubble-sync-toggle')?.checked) {
        const aiId = 'ba-' + id.slice(3);
        const aiEl = document.getElementById(aiId);
        if (aiEl) { aiEl.value = el.value; aiEl.dispatchEvent(new Event('input')); }
      }
      updatePreview();
    });
  });

  // 渲染阴影预设按钮
  ['user','ai'].forEach(role => {
    const container = document.getElementById(`bubble-shadow-presets-${role}`);
    if (container) {
      container.innerHTML = SHADOW_PRESETS.map(s =>
        `<button type="button" class="shadow-preset-btn" data-role="${role}" data-shadow="${s.value}" title="${s.value||'无阴影'}">${s.name}</button>`
      ).join('');
      container.addEventListener('click', (e) => {
        const btn = e.target.closest('.shadow-preset-btn');
        if (!btn) return;
        const input = document.getElementById(btn.dataset.role === 'user' ? 'bu-shadow' : 'ba-shadow');
        if (input) { input.value = btn.dataset.shadow; input.dispatchEvent(new Event('input')); }
      });
    }
  });

  // 渲染快速 CSS 片段
  const snippetContainer = document.getElementById('bubble-css-snippets');
  if (snippetContainer) {
    snippetContainer.innerHTML = CSS_SNIPPETS.map(s =>
      `<button type="button" class="css-snippet-btn" data-name="${s.name}">${s.name}</button>`
    ).join('');
  }

  // 快速 CSS
  document.getElementById('bubble-css-snippets')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.css-snippet-btn');
    if (!btn) return;
    const snippet = CSS_SNIPPETS.find(s => s.name === btn.dataset.name);
    if (!snippet) return;
    const textarea = document.getElementById('bubble-custom-css');
    if (textarea) { textarea.value = snippet.code; textarea.dispatchEvent(new Event('input')); }
  });

  // 自定义 CSS
  document.getElementById('bubble-custom-css')?.addEventListener('input', updatePreview);

  // 保存
  document.getElementById('bubble-workshop-save')?.addEventListener('click', handleSave);

  // 导出
  document.getElementById('bubble-workshop-export')?.addEventListener('click', handleExport);

  // 导入
  document.getElementById('bubble-workshop-import')?.addEventListener('click', handleImport);

  // 对比按钮
  document.getElementById('bubble-compare-toggle')?.addEventListener('click', toggleCompare);

  // 预览深色切换
  document.getElementById('bubble-preview-dark')?.addEventListener('change', (e) => {
    const preview = document.getElementById('bubble-workshop-preview');
    if (preview) preview.style.background = e.target.checked ? '#1a1a2e' : '#f5f5f5';
  });
}

// ─── 返回 ───
function goBack() {
  const screen = document.getElementById('bubble-workshop-screen');
  if (screen) screen.classList.remove('active');
  if (currentChatType === 'group') {
    document.getElementById('group-settings-sidebar')?.classList.add('open');
  } else {
    dom['chat-settings-sidebar']?.classList.add('open');
  }
}

// ─── 打开工坊 ───
export function open(chatId, chatType) {
  currentChatId = chatId;
  currentChatType = chatType;
  renderPresets();
  loadFromChat();
  updatePreview();
  // 保存B面板快照
  savedSnapshot = getFormData();
}

// ─── 渲染预设 ───
function renderPresets() {
  const grid = dom['bubble-preset-grid'];
  if (!grid) return;

  // 动态生成「跟随主题」预设
  const db = getDb();
  const h = db.themeHue ?? 260;
  const s = db.themeSat ?? 80;
  const l = db.themeLit ?? 66;
  const themeUserBg = `hsla(${h},${s}%,${l}%,0.85)`;
  const themeAiBg = `hsla(${h},${Math.max(s-30,10)}%,95%,0.9)`;

  const themeCard = `<div class="bubble-preset-card" data-preset-id="_theme" title="自动匹配当前主题色">
    <div class="bubble-preset-preview">
      <div class="bubble-mini" style="background:${themeUserBg};border-radius:18px;box-shadow:0 4px 15px hsla(${h},60%,50%,0.3)"></div>
      <div class="bubble-mini" style="background:${themeAiBg};border-radius:18px;"></div>
    </div>
    <div class="bubble-preset-name">🎨 跟随主题</div>
  </div>`;

  const presetCards = PRESETS.map(p => {
    const uBg = hexToRgba(p.user.bgColor, p.user.bgAlpha);
    const aBg = hexToRgba(p.ai.bgColor, p.ai.bgAlpha);
    return `<div class="bubble-preset-card" data-preset-id="${p.id}" title="${p.desc}">
      <div class="bubble-preset-preview">
        <div class="bubble-mini" style="background:${uBg};border-radius:${p.user.radius}px;${p.user.shadow?'box-shadow:'+p.user.shadow:''}"></div>
        <div class="bubble-mini" style="background:${aBg};border-radius:${p.ai.radius}px;${p.ai.shadow?'box-shadow:'+p.ai.shadow:''}"></div>
      </div>
      <div class="bubble-preset-name">${p.name}</div>
    </div>`;
  }).join('');

  grid.innerHTML = themeCard + presetCards;
}

// ─── 从聊天加载 ───
function loadFromChat() {
  const db = getDb();
  const chat = currentChatType === 'group'
    ? (db.groups || []).find(g => g.id === currentChatId)
    : (db.characters || []).find(c => c.id === currentChatId);
  if (!chat) return;
  const cfg = chat.bubbleStyle || {};
  const u = cfg.user || {};
  const a = cfg.ai || {};

  setVal('bu-text-color', u.textColor || '#A56767');
  setVal('bu-bg-color', u.bgColor || '#ffcccc');
  setVal('bu-bg-alpha', u.bgAlpha ?? 0.9);
  setVal('bu-radius', u.radius ?? 18);
  setVal('bu-opacity', u.opacity ?? 1);
  setVal('bu-padding', u.padding ?? 10);
  setVal('bu-shadow', u.shadow || '');

  setVal('ba-text-color', a.textColor || '#6D6D6D');
  setVal('ba-bg-color', a.bgColor || '#ffffff');
  setVal('ba-bg-alpha', a.bgAlpha ?? 0.9);
  setVal('ba-radius', a.radius ?? 18);
  setVal('ba-opacity', a.opacity ?? 1);
  setVal('ba-padding', a.padding ?? 10);
  setVal('ba-shadow', a.shadow || '');

  const cssEl = document.getElementById('bubble-custom-css');
  if (cssEl) cssEl.value = chat.customBubbleCss || '';
}

// ─── 预设应用到表单 ───
function applyPresetToForm(p) {
  setVal('bu-text-color', p.user.textColor);
  setVal('bu-bg-color', p.user.bgColor);
  setVal('bu-bg-alpha', p.user.bgAlpha);
  setVal('bu-radius', p.user.radius);
  setVal('bu-opacity', p.user.opacity);
  setVal('bu-padding', p.user.padding);
  setVal('bu-shadow', p.user.shadow);
  setVal('ba-text-color', p.ai.textColor);
  setVal('ba-bg-color', p.ai.bgColor);
  setVal('ba-bg-alpha', p.ai.bgAlpha);
  setVal('ba-radius', p.ai.radius);
  setVal('ba-opacity', p.ai.opacity);
  setVal('ba-padding', p.ai.padding);
  setVal('ba-shadow', p.ai.shadow);
}

// ─── 更新预览 ───
function updatePreview() {
  const preview = document.getElementById('bubble-workshop-preview');
  if (!preview) return;
  const uStyle = buildStyle('bu');
  const aStyle = buildStyle('ba');
  const customCss = document.getElementById('bubble-custom-css')?.value || '';
  const scopedCss = customCss
    .replace(/\.message-bubble\.sent/g, '#bws-preview .bws-sent')
    .replace(/\.message-bubble\.received/g, '#bws-preview .bws-received');

  preview.innerHTML = `
    <style>${scopedCss}</style>
    <div id="bws-preview" style="display:flex;flex-direction:column;gap:2px;">
      <div class="bws-received" style="${aStyle}">你好！这是角色的回复消息 ✨</div>
      <div class="bws-sent" style="${uStyle}">这是我的消息~</div>
      <div class="bws-received" style="${aStyle}">第二条回复，观察长文本的换行和可读性表现。</div>
      <div class="bws-sent" style="${uStyle}">👍</div>
    </div>`;
}

// ─── 构建样式 ───
function buildStyle(prefix) {
  const color = getVal(prefix + '-text-color');
  const bg = getVal(prefix + '-bg-color');
  const alpha = parseFloat(getVal(prefix + '-bg-alpha'));
  const radius = parseInt(getVal(prefix + '-radius'));
  const opacity = parseFloat(getVal(prefix + '-opacity'));
  const padding = parseInt(getVal(prefix + '-padding'));
  const shadow = getVal(prefix + '-shadow');
  const rgba = hexToRgba(bg, alpha);
  return `color:${color};background:${rgba};border-radius:${radius}px;opacity:${opacity};` +
    `padding:${padding}px ${padding + 4}px;` +
    (shadow ? `box-shadow:${shadow};` : '') +
    `max-width:75%;word-break:break-word;line-height:1.5;font-size:14px;`;
}

// ─── A/B 对比 ───
function toggleCompare() {
  if (!savedSnapshot) { showToast(dom?.['toast-notification'], '没有保存记录可对比'); return; }
  const preview = document.getElementById('bubble-workshop-preview');
  if (!preview) return;
  const current = getFormData();
  const uStyle = buildStyleFromData(savedSnapshot, 'user');
  const aStyle = buildStyleFromData(savedSnapshot, 'ai');
  const uCur = buildStyle('bu');
  const aCur = buildStyle('ba');

  preview.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:8px;">
      <div style="flex:1;font-size:11px;color:#c2185b;font-weight:bold;text-align:center;">当前编辑</div>
      <div style="flex:1;font-size:11px;color:#666;font-weight:bold;text-align:center;">上次保存</div>
    </div>
    <div style="display:flex;gap:12px;">
      <div style="flex:1;display:flex;flex-direction:column;gap:2px;">
        <div class="bws-received" style="${aCur}">对方回复</div>
        <div class="bws-sent" style="${uCur}">我方消息</div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;gap:2px;">
        <div class="bws-received" style="${aStyle}">对方回复</div>
        <div class="bws-sent" style="${uStyle}">我方消息</div>
      </div>
    </div>`;
}

// ─── 保存 ───
async function handleSave() {
  const db = getDb();
  const chat = currentChatType === 'group'
    ? (db.groups || []).find(g => g.id === currentChatId)
    : (db.characters || []).find(c => c.id === currentChatId);
  if (!chat) return;

  chat.bubbleStyle = getFormData();
  const css = document.getElementById('bubble-custom-css')?.value || '';
  if (css) { chat.customBubbleCss = css; chat.useCustomBubbleCss = true; }

  await saveData();
  savedSnapshot = getFormData();
  showToast(dom?.['toast-notification'], '✅ 气泡样式已保存');
}

// ─── 导出 ───
function handleExport() {
  const data = getFormData();
  data.customCss = document.getElementById('bubble-custom-css')?.value || '';
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `气泡样式_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(dom?.['toast-notification'], '📦 样式已导出');
}

// ─── 导入 ───
function handleImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.user) {
        setVal('bu-text-color', data.user.textColor || '#A56767');
        setVal('bu-bg-color', data.user.bgColor || '#ffcccc');
        setVal('bu-bg-alpha', data.user.bgAlpha ?? 0.9);
        setVal('bu-radius', data.user.radius ?? 18);
        setVal('bu-opacity', data.user.opacity ?? 1);
        setVal('bu-padding', data.user.padding ?? 10);
        setVal('bu-shadow', data.user.shadow || '');
      }
      if (data.ai) {
        setVal('ba-text-color', data.ai.textColor || '#6D6D6D');
        setVal('ba-bg-color', data.ai.bgColor || '#ffffff');
        setVal('ba-bg-alpha', data.ai.bgAlpha ?? 0.9);
        setVal('ba-radius', data.ai.radius ?? 18);
        setVal('ba-opacity', data.ai.opacity ?? 1);
        setVal('ba-padding', data.ai.padding ?? 10);
        setVal('ba-shadow', data.ai.shadow || '');
      }
      if (data.customCss) {
        const cssEl = document.getElementById('bubble-custom-css');
        if (cssEl) cssEl.value = data.customCss;
      }
      updatePreview();
      showToast(dom?.['toast-notification'], '✅ 样式已导入');
    } catch (err) {
      showToast(dom?.['toast-notification'], '❌ 导入失败: ' + err.message);
    }
  };
  input.click();
}

// ─── 获取表单数据 ───
function getFormData() {
  return {
    user: {
      textColor: getVal('bu-text-color'), bgColor: getVal('bu-bg-color'),
      bgAlpha: parseFloat(getVal('bu-bg-alpha')), radius: parseInt(getVal('bu-radius')),
      opacity: parseFloat(getVal('bu-opacity')), padding: parseInt(getVal('bu-padding')),
      shadow: getVal('bu-shadow'),
    },
    ai: {
      textColor: getVal('ba-text-color'), bgColor: getVal('ba-bg-color'),
      bgAlpha: parseFloat(getVal('ba-bg-alpha')), radius: parseInt(getVal('ba-radius')),
      opacity: parseFloat(getVal('ba-opacity')), padding: parseInt(getVal('ba-padding')),
      shadow: getVal('ba-shadow'),
    },
  };
}

function buildStyleFromData(data, role) {
  const d = data[role] || {};
  const rgba = hexToRgba(d.bgColor || '#fff', d.bgAlpha ?? 0.9);
  return `color:${d.textColor||'#333'};background:${rgba};border-radius:${d.radius||18}px;opacity:${d.opacity??1};` +
    `padding:${d.padding||10}px ${(d.padding||10)+4}px;` +
    (d.shadow ? `box-shadow:${d.shadow};` : '') +
    `max-width:75%;word-break:break-word;line-height:1.5;font-size:14px;`;
}

// ─── 工具 ───
function setVal(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = val;
  const valEl = document.getElementById(id + '-val');
  if (valEl) {
    if (id.includes('alpha') || id.includes('opacity')) valEl.textContent = Math.round(parseFloat(val) * 100) + '%';
    else if (id.includes('radius') || id.includes('padding')) valEl.textContent = val + 'px';
    else valEl.textContent = val;
  }
}
function getVal(id) { return document.getElementById(id)?.value || ''; }

function hexToRgba(hex, alpha) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  const r = parseInt(hex.slice(0,2), 16);
  const g = parseInt(hex.slice(2,4), 16);
  const b = parseInt(hex.slice(4,6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

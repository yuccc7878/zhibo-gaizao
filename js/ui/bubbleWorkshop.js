/* ========================================
   BubbleWorkshop - 气泡工坊
   可视化气泡样式编辑器
   ======================================== */

import { getDb, saveData } from '../core/dataService.js';
import { showToast, colorThemes } from '../core/utils.js';

let dom = null;
let currentChatId = null;
let currentChatType = null;

// ─── 预设模板 ───
const PRESETS = [
  {
    id: 'default', name: '默认',
    user: { textColor: '#A56767', bgColor: 'rgba(255,204,204,0.9)', radius: 18, opacity: 1, shadow: '' },
    ai:   { textColor: '#6D6D6D', bgColor: 'rgba(255,255,255,0.9)', radius: 18, opacity: 1, shadow: '' },
  },
  {
    id: 'glass', name: '毛玻璃',
    user: { textColor: '#0f172a', bgColor: 'rgba(191,219,254,0.78)', radius: 18, opacity: 0.98, shadow: '0 10px 28px rgba(30,41,59,0.16)' },
    ai:   { textColor: '#0f172a', bgColor: 'rgba(255,255,255,0.72)', radius: 18, opacity: 0.98, shadow: '0 8px 22px rgba(30,41,59,0.13)' },
  },
  {
    id: 'neon', name: '霓虹',
    user: { textColor: '#faf5ff', bgColor: 'rgba(88,28,135,0.9)', radius: 16, opacity: 1, shadow: '0 0 18px rgba(217,70,239,0.55)' },
    ai:   { textColor: '#e0f2fe', bgColor: 'rgba(12,74,110,0.9)', radius: 16, opacity: 1, shadow: '0 0 18px rgba(14,165,233,0.55)' },
  },
  {
    id: 'warm', name: '暖阳',
    user: { textColor: '#7c2d12', bgColor: 'rgba(254,243,199,0.92)', radius: 20, opacity: 1, shadow: '0 8px 24px rgba(217,119,6,0.18)' },
    ai:   { textColor: '#78350f', bgColor: 'rgba(255,251,235,0.9)', radius: 20, opacity: 1, shadow: '0 6px 20px rgba(180,83,9,0.14)' },
  },
  {
    id: 'minimal', name: '极简',
    user: { textColor: '#0f172a', bgColor: 'rgba(226,232,240,0.86)', radius: 20, opacity: 0.97, shadow: '0 2px 8px rgba(15,23,42,0.08)' },
    ai:   { textColor: '#1e293b', bgColor: 'rgba(248,250,252,0.85)', radius: 20, opacity: 0.97, shadow: '0 2px 8px rgba(15,23,42,0.06)' },
  },
  {
    id: 'dark', name: '暗黑',
    user: { textColor: '#fff', bgColor: 'rgba(99,102,241,0.85)', radius: 16, opacity: 1, shadow: '0 4px 15px rgba(99,102,241,0.3)' },
    ai:   { textColor: '#e0e0e0', bgColor: 'rgba(30,30,30,0.85)', radius: 16, opacity: 1, shadow: '0 4px 15px rgba(0,0,0,0.3)' },
  },
];

// ─── 初始化 ───
export function init(_dom) {
  dom = _dom;
  bindEvents();
}

function bindEvents() {
  // 返回按钮
  document.getElementById('bubble-workshop-back')?.addEventListener('click', () => {
    const target = currentChatType === 'group' ? 'group-settings-sidebar' : 'chat-settings-sidebar';
    if (currentChatType === 'group') {
      document.getElementById(target)?.classList.add('open');
    } else {
      dom['chat-settings-sidebar']?.classList.add('open');
    }
    document.getElementById('bubble-workshop-screen')?.classList.remove('active');
  });

  // 预设点击
  document.getElementById('bubble-preset-grid')?.addEventListener('click', (e) => {
    const card = e.target.closest('.bubble-preset-card');
    if (!card) return;
    const presetId = card.dataset.presetId;
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    applyPresetToForm(preset);
    updatePreview();
  });

  // 用户/AI 标签切换
  document.getElementById('bubble-role-tabs')?.addEventListener('click', (e) => {
    const tab = e.target.closest('.bubble-role-tab');
    if (!tab) return;
    document.querySelectorAll('.bubble-role-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const role = tab.dataset.role;
    document.querySelectorAll('.bubble-role-panel').forEach(p => p.classList.toggle('active', p.dataset.role === role));
  });

  // 实时预览绑定 + 颜色值显示
  ['bu-text-color','bu-bg-color','ba-text-color','ba-bg-color'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', (e) => {
      const valEl = document.getElementById(id + '-val');
      if (valEl) valEl.textContent = e.target.value;
      updatePreview();
    });
  });
  ['bu-radius','bu-opacity','ba-radius','ba-opacity'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', (e) => {
      const valEl = document.getElementById(id + '-val');
      if (valEl) valEl.textContent = e.target.value;
      updatePreview();
    });
  });
  ['bu-shadow','ba-shadow'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updatePreview);
  });

  // 同步用户→AI 开关
  document.getElementById('bubble-sync-toggle')?.addEventListener('change', (e) => {
    if (e.target.checked) syncUserToAi();
    updatePreview();
  });

  // 保存
  document.getElementById('bubble-workshop-save')?.addEventListener('click', handleSave);

  // 导出 CSS
  document.getElementById('bubble-workshop-export')?.addEventListener('click', handleExport);

  // 自定义 CSS 输入实时预览
  document.getElementById('bubble-custom-css')?.addEventListener('input', updatePreview);
}

// ─── 打开工坊 ───
export function open(chatId, chatType) {
  currentChatId = chatId;
  currentChatType = chatType;

  // 渲染预设卡片
  renderPresets();

  // 加载当前值到表单
  loadFromChat();

  // 更新预览
  updatePreview();
}

// ─── 渲染预设卡片 ───
function renderPresets() {
  const grid = dom['bubble-preset-grid'];
  if (!grid) return;
  grid.innerHTML = PRESETS.map(p => `
    <div class="bubble-preset-card" data-preset-id="${p.id}">
      <div class="bubble-preset-preview">
        <div class="bubble-mini" style="background:${p.user.bgColor};border-radius:${p.user.radius}px;${p.user.shadow ? 'box-shadow:'+p.user.shadow : ''}"></div>
        <div class="bubble-mini" style="background:${p.ai.bgColor};border-radius:${p.ai.radius}px;${p.ai.shadow ? 'box-shadow:'+p.ai.shadow : ''}"></div>
      </div>
      <div class="bubble-preset-name">${p.name}</div>
    </div>
  `).join('');
}

// ─── 从聊天数据加载 ───
function loadFromChat() {
  const db = getDb();
  const chat = currentChatType === 'group'
    ? (db.groups || []).find(g => g.id === currentChatId)
    : (db.characters || []).find(c => c.id === currentChatId);
  if (!chat) return;

  const cfg = chat.bubbleStyle || {};
  const user = cfg.user || {};
  const ai = cfg.ai || {};

  // 用户气泡
  setValue('bu-text-color', user.textColor || '#A56767');
  setValue('bu-bg-color', user.bgColor || 'rgba(255,204,204,0.9)');
  setValue('bu-radius', user.radius ?? 18);
  setValue('bu-opacity', user.opacity ?? 1);
  setValue('bu-shadow', user.shadow || '');

  // AI 气泡
  setValue('ba-text-color', ai.textColor || '#6D6D6D');
  setValue('ba-bg-color', ai.bgColor || 'rgba(255,255,255,0.9)');
  setValue('ba-radius', ai.radius ?? 18);
  setValue('ba-opacity', ai.opacity ?? 1);
  setValue('ba-shadow', ai.shadow || '');

  // 自定义 CSS
  const cssEl = document.getElementById('bubble-custom-css');
  if (cssEl) cssEl.value = chat.customBubbleCss || '';

  // 同步开关
  const syncEl = document.getElementById('bubble-sync-toggle');
  if (syncEl) syncEl.checked = cfg.syncUserToAi || false;
}

// ─── 预设应用到表单 ───
function applyPresetToForm(preset) {
  setValue('bu-text-color', preset.user.textColor);
  setValue('bu-bg-color', preset.user.bgColor);
  setValue('bu-radius', preset.user.radius);
  setValue('bu-opacity', preset.user.opacity);
  setValue('bu-shadow', preset.user.shadow);
  setValue('ba-text-color', preset.ai.textColor);
  setValue('ba-bg-color', preset.ai.bgColor);
  setValue('ba-radius', preset.ai.radius);
  setValue('ba-opacity', preset.ai.opacity);
  setValue('ba-shadow', preset.ai.shadow);
}

// ─── 同步用户到 AI ───
function syncUserToAi() {
  setValue('ba-text-color', getValue('bu-text-color'));
  setValue('ba-bg-color', getValue('bu-bg-color'));
  setValue('ba-radius', getValue('bu-radius'));
  setValue('ba-opacity', getValue('bu-opacity'));
  setValue('ba-shadow', getValue('bu-shadow'));
}

// ─── 更新预览 ───
function updatePreview() {
  const preview = document.getElementById('bubble-workshop-preview');
  if (!preview) return;

  const userStyle = buildBubbleStyle('bu');
  const aiStyle = buildBubbleStyle('ba');
  const customCss = document.getElementById('bubble-custom-css')?.value || '';

  // 注入自定义 CSS
  let styleTag = preview.querySelector('#bubble-workshop-custom-style');
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'bubble-workshop-custom-style';
    preview.appendChild(styleTag);
  }
  styleTag.textContent = customCss
    .replace(/\.message-bubble\.sent/g, '#bubble-workshop-preview .bws-sent')
    .replace(/\.message-bubble\.received/g, '#bubble-workshop-preview .bws-received');

  preview.innerHTML = `
    <style id="bubble-workshop-custom-style">${customCss
      .replace(/\.message-bubble\.sent/g, '#bubble-workshop-preview .bws-sent')
      .replace(/\.message-bubble\.received/g, '#bubble-workshop-preview .bws-received')}</style>
    <div class="bws-received" style="${aiStyle}">
      <span style="font-size:11px;opacity:0.6;">AI</span><br>你好！这是角色的回复消息 ✨
    </div>
    <div class="bws-sent" style="${userStyle}">
      这是我发送的消息~
    </div>
    <div class="bws-received" style="${aiStyle}">
      第二条回复，可以观察换行和长文本的显示效果是否舒适。
    </div>
    <div class="bws-sent" style="${userStyle}">
      👍
    </div>
  `;
}

// ─── 构建气泡样式字符串 ───
function buildBubbleStyle(prefix) {
  const color = getValue(prefix + '-text-color');
  const bg = getValue(prefix + '-bg-color');
  const radius = getValue(prefix + '-radius');
  const opacity = getValue(prefix + '-opacity');
  const shadow = getValue(prefix + '-shadow');
  return `color:${color};background:${bg};border-radius:${radius}px;opacity:${opacity};` +
    (shadow ? `box-shadow:${shadow};` : '') +
    `padding:10px 14px;margin:4px 12px;max-width:75%;word-break:break-word;line-height:1.5;font-size:14px;`;
}

// ─── 保存 ───
async function handleSave() {
  const db = getDb();
  const chat = currentChatType === 'group'
    ? (db.groups || []).find(g => g.id === currentChatId)
    : (db.characters || []).find(c => c.id === currentChatId);
  if (!chat) return;

  chat.bubbleStyle = {
    user: {
      textColor: getValue('bu-text-color'),
      bgColor: getValue('bu-bg-color'),
      radius: parseInt(getValue('bu-radius')),
      opacity: parseFloat(getValue('bu-opacity')),
      shadow: getValue('bu-shadow'),
    },
    ai: {
      textColor: getValue('ba-text-color'),
      bgColor: getValue('ba-bg-color'),
      radius: parseInt(getValue('ba-radius')),
      opacity: parseFloat(getValue('ba-opacity')),
      shadow: getValue('ba-shadow'),
    },
    syncUserToAi: document.getElementById('bubble-sync-toggle')?.checked || false,
  };

  const customCss = document.getElementById('bubble-custom-css')?.value || '';
  if (customCss) {
    chat.customBubbleCss = customCss;
    chat.useCustomBubbleCss = true;
  }

  await saveData();
  showToast(dom?.['toast-notification'], '✅ 气泡样式已保存');
}

// ─── 导出 CSS ───
function handleExport() {
  const user = buildBubbleStyle('bu');
  const ai = buildBubbleStyle('ba');
  const css = `/* 我方气泡 */\n.message-bubble.sent {\n  ${user.split(';').filter(Boolean).join(';\n  ')};\n}\n\n/* 对方气泡 */\n.message-bubble.received {\n  ${ai.split(';').filter(Boolean).join(';\n  ')};\n}`;
  navigator.clipboard?.writeText(css).then(() => {
    showToast(dom?.['toast-notification'], '📋 CSS 已复制到剪贴板');
  }).catch(() => {
    prompt('复制以下 CSS：', css);
  });
}

// ─── 工具函数 ───
function setValue(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = val;
  // 更新 range 的显示值
  if (el.type === 'range') {
    const label = document.getElementById(id + '-val');
    if (label) label.textContent = val;
  }
}

function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

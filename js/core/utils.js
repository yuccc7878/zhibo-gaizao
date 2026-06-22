/* ========================================
   Utils - 纯工具函数与常量
   ======================================== */

// --- 主题配置 ---
export const colorThemes = {
  'white_pink':   { name: '白/粉', received: {bg:'rgba(255,255,255,0.9)',text:'#6D6D6D'}, sent: {bg:'rgba(255,204,204,0.9)',text:'#A56767'} },
  'white_blue':   { name: '白/蓝', received: {bg:'rgba(255,255,255,0.9)',text:'#6D6D6D'}, sent: {bg:'rgba(173,216,230,0.9)',text:'#4A6F8A'} },
  'white_yellow': { name: '白/黄', received: {bg:'rgba(255,255,255,0.9)',text:'#6D6D6D'}, sent: {bg:'rgba(249,237,105,0.9)',text:'#8B7E4B'} },
  'white_green':  { name: '白/绿', received: {bg:'rgba(255,255,255,0.9)',text:'#6D6D6D'}, sent: {bg:'rgba(188,238,188,0.9)',text:'#4F784F'} },
  'white_purple': { name: '白/紫', received: {bg:'rgba(255,255,255,0.9)',text:'#6D6D6D'}, sent: {bg:'rgba(185,190,240,0.9)',text:'#6C5B7B'} },
  'black_red':    { name: '黑/红', received: {bg:'rgba(30,30,30,0.85)',text:'#E0E0E0'}, sent: {bg:'rgb(226,62,87,0.9)',text:'#fff'} },
  'black_green':  { name: '黑/绿', received: {bg:'rgba(30,30,30,0.85)',text:'#E0E0E0'}, sent: {bg:'rgba(119,221,119,0.9)',text:'#2E5C2E'} },
  'black_white':  { name: '黑/白', received: {bg:'rgba(30,30,30,0.85)',text:'#E0E0E0'}, sent: {bg:'rgba(245,245,245,0.9)',text:'#333'} },
  'white_black':  { name: '白/黑', received: {bg:'rgba(255,255,255,0.9)',text:'#6D6D6D'}, sent: {bg:'rgba(50,50,50,0.85)',text:'#F5F5F5'} },
  'yellow_purple':{ name: '黄/紫', received: {bg:'rgba(255,250,205,0.9)',text:'#8B7E4B'}, sent: {bg:'rgba(185,190,240,0.9)',text:'#6C5B7B'} },
  'pink_blue':    { name: '粉/蓝', received: {bg:'rgba(255,231,240,0.9)',text:'#7C6770'}, sent: {bg:'rgba(173,216,230,0.9)',text:'#4A6F8A'} },
};

export const defaultIcons = {
  'chat-list-screen':   { name: 'QQ',    url: 'assets/icons/qq.png' },
  'api-settings-screen':{ name: 'API设置', url: 'assets/icons/设置.png' },
  'wallpaper-screen':   { name: '壁纸',   url: 'assets/icons/天气.png' },
  'world-book-screen':  { name: '世界书', url: 'assets/icons/备忘录.png' },
  'customize-screen':   { name: '自定义', url: 'assets/icons/主题.png' },
  'font-settings-screen':{ name: '字体',  url: 'assets/icons/文件管理.png' },
  'day-mode-btn':       { name: '',       url: 'assets/icons/白天开关.png' },
  'night-mode-btn':     { name: '',       url: 'assets/icons/夜间开关.png' },
};

// --- 基础工具 ---

export function pad(num) {
  return num.toString().padStart(2, '0');
}

export function calculateVoiceDuration(text) {
  return Math.max(1, Math.min(60, Math.ceil(text.length / 3.5)));
}

export function getRandomValue(str) {
  if (str.includes(',')) {
    const arr = str.split(',').map(item => item.trim());
    return arr[Math.floor(Math.random() * arr.length)];
  }
  return str;
}

// --- 通知与视图 ---

/**
 * @param {HTMLElement} toastEl
 * @param {string} message
 */
export function showToast(toastEl, message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 3000);
}

/**
 * @param {{ screens: NodeList }} dom
 * @param {string} targetId
 */
export function switchScreen(dom, targetId) {
  dom.screens.forEach(s => s.classList.remove('active'));
  var target = document.getElementById(targetId);
  if (!target) {
    console.error('[switchScreen] 目标屏幕不存在:', targetId, '→ 回退到 home-screen');
    target = document.getElementById('home-screen');
    if (target) target.classList.add('active');
    return;
  }
  target.classList.add('active');
  document.querySelectorAll('.modal-overlay, .action-sheet-overlay, .settings-sidebar')
    .forEach(o => o.classList.remove('visible', 'open'));
  // 保存屏幕状态（使用全局 db/saveData，由 engine/db.js 提供）
  try {
    if (typeof db !== 'undefined' && typeof saveData !== 'undefined') {
      db._currentScreen = targetId;
      if (targetId !== 'chat-room-screen') { db._currentChatId = ''; db._currentChatType = ''; }
      saveData();
    }
  } catch (e) { /* ignore */ }
}

// --- 上下文菜单 ---

export function createContextMenu(items, x, y) {
  removeContextMenu();
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  items.forEach(item => {
    const menuItem = document.createElement('div');
    menuItem.className = 'context-menu-item';
    if (item.danger) menuItem.classList.add('danger');
    menuItem.textContent = item.label;
    menuItem.onclick = () => { item.action(); removeContextMenu(); };
    menu.appendChild(menuItem);
  });
  document.body.appendChild(menu);
  document.addEventListener('click', removeContextMenu, { once: true });
}

export function removeContextMenu() {
  const menu = document.querySelector('.context-menu');
  if (menu) menu.remove();
}

// --- 图片压缩 ---

export async function compressImage(file, options = {}) {
  const { quality = 0.8, maxWidth = 800, maxHeight = 800 } = options;
  if (file.type === 'image/gif') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onerror = reject;
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onerror = reject;
      img.onload = () => {
        let width = img.width, height = img.height;
        if (width > height) {
          if (width > maxWidth) { height = Math.round(height * (maxWidth / width)); width = maxWidth; }
        } else {
          if (height > maxHeight) { width = Math.round(width * (maxHeight / height)); height = maxHeight; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (file.type === 'image/png') { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, width, height); }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    };
  });
}

// --- 全局字体 ---

export function applyGlobalFont(fontUrl) {
  const styleId = 'global-font-style';
  let styleElement = document.getElementById(styleId);
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = styleId;
    document.head.appendChild(styleElement);
  }
  if (fontUrl) {
    styleElement.innerHTML = `@font-face { font-family: 'CustomGlobalFont'; src: url('${fontUrl}'); } :root { --font-family: 'CustomGlobalFont', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }`;
  } else {
    styleElement.innerHTML = `:root { --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }`;
  }
}

// --- 气泡样式 ---

export function updateCustomBubbleStyle(chatId, css, enabled) {
  const styleId = `custom-bubble-style-for-${chatId}`;
  let styleElement = document.getElementById(styleId);
  if (enabled && css) {
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    const scopedCss = css.replace(
      /(\.message-bubble(?:\.sent|\.received)?)/g,
      `#chat-room-screen.chat-active-${chatId} $1`
    );
    styleElement.innerHTML = scopedCss;
  } else {
    if (styleElement) styleElement.remove();
  }
}

export function updateBubbleCssPreview(previewContainer, css, useDefault, theme) {
  previewContainer.innerHTML = '';
  const sentBubble = document.createElement('div');
  sentBubble.className = 'message-bubble sent';
  sentBubble.textContent = '这是我方气泡。';
  sentBubble.style.alignSelf = 'flex-end';
  sentBubble.style.borderBottomRightRadius = '5px';
  const receivedBubble = document.createElement('div');
  receivedBubble.className = 'message-bubble received';
  receivedBubble.textContent = '这是对方气泡。';
  receivedBubble.style.alignSelf = 'flex-start';
  receivedBubble.style.borderBottomLeftRadius = '5px';
  [sentBubble, receivedBubble].forEach(bubble => {
    bubble.style.maxWidth = '70%'; bubble.style.padding = '8px 12px';
    bubble.style.wordWrap = 'break-word'; bubble.style.lineHeight = '1.4';
  });
  if (useDefault || !css) {
    sentBubble.style.backgroundColor = theme.sent.bg; sentBubble.style.color = theme.sent.text;
    sentBubble.style.borderRadius = '18px'; sentBubble.style.borderBottomRightRadius = '5px';
    receivedBubble.style.backgroundColor = theme.received.bg; receivedBubble.style.color = theme.received.text;
    receivedBubble.style.borderRadius = '18px'; receivedBubble.style.borderBottomLeftRadius = '5px';
  } else {
    const styleTag = document.createElement('style');
    const scopedCss = css.replace(/(\.message-bubble(?:\.sent|\.received)?)/g, `#${previewContainer.id} $1`);
    styleTag.textContent = scopedCss;
    previewContainer.appendChild(styleTag);
  }
  previewContainer.appendChild(receivedBubble);
  previewContainer.appendChild(sentBubble);
}

// --- 消息内容解析 ---

export function getMixedContent(responseData) {
  const results = [];
  const regex = /<orange(?:\s+char="([^"]*)")?>([\s\S]*?)<\/orange>|(\[.*?\])/g;
  let match;
  while ((match = regex.exec(responseData)) !== null) {
    if (match[1] !== undefined || match[2] !== undefined) {
      results.push({ type: 'html', char: match[1] || null, content: match[2].trim() });
    } else if (match[3]) {
      results.push({ type: 'text', content: match[3] });
    }
  }
  return results;
}

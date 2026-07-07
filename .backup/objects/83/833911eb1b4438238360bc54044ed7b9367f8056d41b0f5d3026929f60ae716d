/* ========================================
   AiDebug - AI 调试面板
   通过 AOP 包装 window.AiService.chat，
   拦截每次对话的请求（system + messages）和响应。
   浮动按钮 -> 侧滑面板展示最近 20 条记录。
   独立自初始化，无需 app.js 额外调用。
   ======================================== */
(function () {
  'use strict';

  var MAX_LOGS = 20;

  // ─── 状态 ───
  var logs = [];
  var logCounter = 0;
  var panelEl = null;
  var btnEl = null;
  var isOpen = false;
  var updateTimer = null;

  // ─── 工具 ───
  function genId() {
    return 'dbg_' + (++logCounter) + '_' + Date.now().toString(36);
  }

  function timestamp() {
    var d = new Date();
    return d.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"');
  }

  function formatDuration(ms) {
    if (ms < 1000) return ms.toFixed(0) + 'ms';
    return (ms / 1000).toFixed(2) + 's';
  }

  function truncate(str, len) {
    if (!str || str.length <= len) return str;
    return str.slice(0, len) + '...';
  }

  // ─── AOP 包装 ───
  function wrapChat() {
    if (!window.AiService || typeof window.AiService.chat !== 'function') {
      setTimeout(wrapChat, 300);
      return;
    }

    var originalChat = window.AiService.chat;

    window.AiService.chat = async function (options) {
      var id = genId();
      var start = performance.now();
      var ts = timestamp();

      var entry = {
        id: id,
        ts: ts,
        system: options.system || '',
        messages: options.messages ? JSON.parse(JSON.stringify(options.messages)) : [],
        opts: options.options ? Object.assign({}, options.options) : {},
        status: 'pending',
        response: '',
        error: null,
        duration: 0
      };

      logs.unshift(entry);
      if (logs.length > MAX_LOGS) logs.pop();
      scheduleRender();

      try {
        var result = await originalChat.call(window.AiService, options);
        entry.status = 'ok';
        entry.response = result;
        entry.duration = performance.now() - start;
        scheduleRender();
        return result;
      } catch (err) {
        entry.status = 'error';
        entry.error = err.message || String(err);
        entry.duration = performance.now() - start;
        scheduleRender();
        throw err;
      }
    };

    console.log('[AiDebug] AiService.chat 已拦截，调试面板已激活');
  }

  // ─── UI 创建 ───
  function createUI() {
    if (document.getElementById('ai-debug-panel')) return;

    // 注入样式
    var style = document.createElement('style');
    style.id = 'ai-debug-style';
    style.textContent = [
      '#ai-debug-btn{position:fixed;right:16px;bottom:90px;z-index:2147483646;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#1a1a2e,#16213e);color:#00e676;font-size:20px;border:2px solid rgba(0,230,118,0.3);box-shadow:0 4px 20px rgba(0,0,0,0.4);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.25s ease;user-select:none;}',
      '#ai-debug-btn:hover{transform:scale(1.12);box-shadow:0 6px 28px rgba(0,230,118,0.25);}',
      '#ai-debug-btn:active{transform:scale(0.95);}',
      '#ai-debug-btn .badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;background:#ff5252;color:#fff;font-size:11px;font-weight:bold;border-radius:10px;display:flex;align-items:center;justify-content:center;padding:0 4px;box-shadow:0 2px 6px rgba(255,82,82,0.4);pointer-events:none;}',
      '#ai-debug-panel{position:fixed;top:0;right:0;width:85%;max-width:420px;height:100%;z-index:2147483647;background:#1a1a2e;color:#e0e0e0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:13px;transform:translateX(105%);transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);box-shadow:-8px 0 40px rgba(0,0,0,0.6);display:flex;flex-direction:column;}',
      '#ai-debug-panel.open{transform:translateX(0);}',
      '#ai-debug-panel .header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#16213e;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;}',
      '#ai-debug-panel .header .title{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600;color:#00e676;}',
      '#ai-debug-panel .header .actions{display:flex;gap:8px;}',
      '#ai-debug-panel .header .actions button{background:rgba(255,255,255,0.08);border:none;color:#aaa;cursor:pointer;width:32px;height:32px;border-radius:8px;font-size:16px;transition:all 0.15s;display:flex;align-items:center;justify-content:center;}',
      '#ai-debug-panel .header .actions button:hover{background:rgba(255,255,255,0.15);color:#fff;}',
      '#ai-debug-panel .header .actions button.danger:hover{background:rgba(255,82,82,0.25);color:#ff5252;}',
      '#ai-debug-panel .log-list{flex:1;overflow-y:auto;padding:8px 0;}',
      '#ai-debug-panel .log-list::-webkit-scrollbar{width:4px;}',
      '#ai-debug-panel .log-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:2px;}',
      '.ai-debug-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#555;font-size:14px;gap:8px;}',
      '.ai-debug-empty .icon{font-size:40px;opacity:0.5;}',
      '.ai-debug-entry{margin:4px 8px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);overflow:hidden;transition:background 0.15s;}',
      '.ai-debug-entry:hover{background:rgba(255,255,255,0.06);}',
      '.ai-debug-entry .summary{display:flex;align-items:center;gap:8px;padding:10px 12px;cursor:pointer;user-select:none;}',
      '.ai-debug-entry .summary .idx{width:24px;text-align:center;font-size:11px;color:#666;font-weight:600;}',
      '.ai-debug-entry .summary .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}',
      '.ai-debug-entry .summary .dot.ok{background:#00e676;}',
      '.ai-debug-entry .summary .dot.error{background:#ff5252;}',
      '.ai-debug-entry .summary .dot.pending{background:#ffd740;animation:pulse 1s infinite;}',
      '@keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.3;}}',
      '.ai-debug-entry .summary .info{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;}',
      '.ai-debug-entry .summary .info .time{font-size:11px;color:#666;}',
      '.ai-debug-entry .summary .info .preview{font-size:12px;color:#ccc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.ai-debug-entry .summary .duration{font-size:11px;color:#888;flex-shrink:0;}',
      '.ai-debug-entry .summary .expand{font-size:12px;color:#555;flex-shrink:0;transition:transform 0.2s;margin-left:4px;}',
      '.ai-debug-entry.open .summary .expand{transform:rotate(90deg);}',
      '.ai-debug-entry .detail{display:none;padding:0 12px 12px;border-top:1px solid rgba(255,255,255,0.05);}',
      '.ai-debug-entry.open .detail{display:block;}',
      '.ai-debug-entry .detail .section{margin-top:10px;}',
      '.ai-debug-entry .detail .section-label{font-size:11px;font-weight:600;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;}',
      '.ai-debug-entry .detail .section-label .count{color:#666;font-weight:400;}',
      '.ai-debug-entry .detail .code-block{background:rgba(0,0,0,0.3);border-radius:6px;padding:8px 10px;font-family:"SF Mono","Menlo","Monaco","Consolas",monospace;font-size:11px;line-height:1.5;color:#bbb;max-height:200px;overflow:auto;white-space:pre-wrap;word-break:break-all;}',
      '.ai-debug-entry .detail .code-block.response{color:#69f0ae;}',
      '.ai-debug-entry .detail .code-block.error{color:#ff5252;}',
      '.ai-debug-entry .detail .msg-item{padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04);}',
      '.ai-debug-entry .detail .msg-item:last-child{border-bottom:none;}',
      '.ai-debug-entry .detail .msg-item .role{display:inline-block;font-size:10px;font-weight:600;padding:1px 6px;border-radius:4px;margin-right:6px;}',
      '.ai-debug-entry .detail .msg-item .role.user{background:rgba(33,150,243,0.2);color:#64b5f6;}',
      '.ai-debug-entry .detail .msg-item .role.assistant{background:rgba(0,230,118,0.15);color:#69f0ae;}',
      '.ai-debug-entry .detail .msg-item .role.system{background:rgba(255,152,0,0.15);color:#ffb74d;}',
      '.ai-debug-entry .detail .msg-item .content-text{font-size:11px;color:#aaa;margin-top:2px;max-height:60px;overflow:hidden;position:relative;}',
      '.ai-debug-entry .detail .msg-item .content-text.expanded{max-height:none;}',
      '.ai-debug-entry .detail .msg-item .expand-btn{font-size:10px;color:#555;cursor:pointer;background:none;border:none;padding:2px 0;display:block;}',
      '.ai-debug-entry .detail .msg-item .expand-btn:hover{color:#888;}'
    ].join('\n');
    document.head.appendChild(style);

    // 浮动按钮
    btnEl = document.createElement('div');
    btnEl.id = 'ai-debug-btn';
    btnEl.innerHTML = '🐛<span class="badge" id="ai-debug-badge" style="display:none;">0</span>';
    btnEl.title = 'AI 调试面板';
    btnEl.addEventListener('click', togglePanel);
    document.body.appendChild(btnEl);

    // 面板
    panelEl = document.createElement('div');
    panelEl.id = 'ai-debug-panel';
    panelEl.innerHTML = [
      '<div class="header">',
      '  <div class="title">🐛 AI 调试</div>',
      '  <div class="actions">',
      '    <button class="danger" id="ai-debug-clear-btn" title="清空记录">🗑️</button>',
      '    <button id="ai-debug-close-btn" title="关闭">✕</button>',
      '  </div>',
      '</div>',
      '<div class="log-list" id="ai-debug-list">',
      '  <div class="ai-debug-empty">',
      '    <div class="icon">🐛</div>',
      '    <div>暂无调试记录</div>',
      '    <div style="font-size:11px;color:#444;">发送 AI 消息后将自动记录</div>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(panelEl);

    // 事件绑定
    document.getElementById('ai-debug-close-btn').addEventListener('click', togglePanel);
    document.getElementById('ai-debug-clear-btn').addEventListener('click', clearLogs);

    document.addEventListener('click', function (e) {
      if (isOpen && !e.target.closest('#ai-debug-panel') && e.target.id !== 'ai-debug-btn') {
        closePanel();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) closePanel();
    });
  }

  // ─── 面板控制 ───
  function togglePanel() {
    isOpen ? closePanel() : openPanel();
  }

  function openPanel() {
    isOpen = true;
    panelEl.classList.add('open');
    renderPanel();
  }

  function closePanel() {
    isOpen = false;
    panelEl.classList.remove('open');
  }

  function clearLogs() {
    logs = [];
    renderPanel();
    updateBadge();
  }

  function updateBadge() {
    var badge = document.getElementById('ai-debug-badge');
    if (!badge) return;
    var count = logs.length;
    if (count > 0) {
      badge.style.display = 'flex';
      badge.textContent = count > 99 ? '99+' : count;
    } else {
      badge.style.display = 'none';
    }
  }

  // ─── 渲染 ───
  function scheduleRender() {
    if (updateTimer) clearTimeout(updateTimer);
    updateTimer = setTimeout(function () {
      updateTimer = null;
      if (isOpen && panelEl) renderPanel();
      updateBadge();
    }, 80);
  }

  function renderPanel() {
    var list = document.getElementById('ai-debug-list');
    if (!list) return;

    if (logs.length === 0) {
      list.innerHTML = [
        '<div class="ai-debug-empty">',
        '  <div class="icon">🐛</div>',
        '  <div>暂无调试记录</div>',
        '  <div style="font-size:11px;color:#444;">发送 AI 消息后将自动记录</div>',
        '</div>'
      ].join('');
      return;
    }

    var html = '';
    for (var i = 0; i < logs.length; i++) {
      var entry = logs[i];
      var isError = entry.status === 'error';
      var isPending = entry.status === 'pending';
      var dotCls = isError ? 'error' : (isPending ? 'pending' : 'ok');
      var dur = entry.duration ? formatDuration(entry.duration) : (isPending ? '...' : '');
      var preview = '';
      if (isError) {
        preview = '❌ ' + truncate(entry.error, 40);
      } else if (entry.response) {
        preview = truncate(entry.response.replace(/^["「』]|["」』]$/g, ''), 50);
      } else {
        preview = '等待响应...';
      }
      var msgCount = entry.messages ? entry.messages.length : 0;
      var sysLen = entry.system ? entry.system.length : 0;

      var msgItemsHtml = '';
      if (entry.messages && entry.messages.length > 0) {
        for (var mi = 0; mi < entry.messages.length; mi++) {
          var m = entry.messages[mi];
          var contentStr = m.content || '';
          var isLong = contentStr.length > 120;
          var shortContent = isLong ? truncate(contentStr, 120) : contentStr;
          msgItemsHtml += [
            '<div class="msg-item">',
            '<span class="role ' + m.role + '">' + m.role + '</span>',
            '<div class="content-text" data-full="' + escapeHtml(contentStr) + '" data-short="' + escapeHtml(shortContent) + '">' + escapeHtml(shortContent) + '</div>',
            isLong ? '<button class="expand-btn" onclick="(function(btn){var ct=btn.previousElementSibling;if(ct.classList.contains(\'expanded\')){ct.classList.remove(\'expanded\');ct.textContent=ct.getAttribute(\'data-short\');btn.textContent=\'展开\';}else{ct.classList.add(\'expanded\');ct.textContent=ct.getAttribute(\'data-full\');btn.textContent=\'收起\';}})(this)">展开</button>' : '',
            '</div>'
          ].join('');
        }
      } else {
        msgItemsHtml = '<div style="color:#555;font-size:11px;">无消息记录</div>';
      }

      var systemHtml = '';
      if (entry.system) {
        systemHtml = [
          '<div class="section">',
          '  <div class="section-label">📋 System Prompt <span class="count">(' + sysLen + ' 字符)</span></div>',
          '  <div class="code-block">' + escapeHtml(entry.system) + '</div>',
          '</div>'
        ].join('');
      }

      var responseHtml = '';
      if (entry.response) {
        responseHtml = [
          '<div class="section">',
          '  <div class="section-label">🤖 响应内容 <span class="count">(' + entry.response.length + ' 字符, ' + dur + ')</span></div>',
          '  <div class="code-block response">' + escapeHtml(entry.response) + '</div>',
          '</div>'
        ].join('');
      } else if (isError) {
        responseHtml = [
          '<div class="section">',
          '  <div class="section-label">❌ 错误</div>',
          '  <div class="code-block error">' + escapeHtml(entry.error) + '</div>',
          '</div>'
        ].join('');
      }

      html += [
        '<div class="ai-debug-entry">',
        '  <div class="summary" onclick="this.parentElement.classList.toggle(\'open\')">',
        '    <span class="idx">#' + (logs.length - i) + '</span>',
        '    <span class="dot ' + dotCls + '"></span>',
        '    <div class="info">',
        '      <span class="time">' + entry.ts + '</span>',
        '      <span class="preview">' + escapeHtml(preview) + '</span>',
        '    </div>',
        '    <span class="duration">' + dur + '</span>',
        '    <span class="expand">›</span>',
        '  </div>',
        '  <div class="detail">',
        systemHtml,
        '    <div class="section">',
        '      <div class="section-label">💬 Messages <span class="count">(' + msgCount + ' 条)</span></div>',
        msgItemsHtml,
        '    </div>',
        responseHtml,
        '  </div>',
        '</div>'
      ].join('');
    }

    list.innerHTML = html;
  }

  // ─── 初始化 ───

  // ★ 核心修复：wrapChat() 立即执行，不等 DOMContentLoaded
  // 因为 chatRoom.js 在 app.js 初始化时会 const aiChat = window.AiService?.chat
  // 如果 wrapChat 在 DOMContentLoaded 才执行，aiChat 已经缓存了原始函数，拦截不生效
  wrapChat();

  // UI 创建需要 DOM 就绪
  function initUI() {
    if (document.getElementById('ai-debug-panel')) return;
    createUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }
})();

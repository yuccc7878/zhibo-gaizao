/* ========================================
   Module: Live (直播) — 抖音风格重写
   ======================================== */

Engine.register({
  id: 'live',
  name: '直播',
  icon: '📺',
  screen: 'live-screen',
  order: 2,

  // ─── 配置 ───
  LEVELS: [
    { id: 1, label: '普通闲聊', desc: '轻松聊天互动', color: '#4CAF50' },
    { id: 2, label: '才艺展示', desc: '唱歌/跳舞/表演', color: '#2196F3' },
    { id: 3, label: '户外挑战', desc: '刺激有趣的挑战', color: '#FF9800' },
    { id: 4, label: '福利姬', desc: '性感撩人视觉盛宴', color: '#9C27B0' },
    { id: 5, label: '双人行', desc: '亲密互动双人时光', color: '#E91E63' },
  ],
  LEVEL_MULTIPLIER: { 1: 1.0, 2: 1.2, 3: 1.3, 4: 1.4, 5: 1.5 },

  SCENE_CATEGORIES: [
    {
      label: '🏠 室内', scenes: [
        { id:'bedroom', label:'🛏️ 卧室' }, { id:'bathroom', label:'🛁 浴室' },
        { id:'living', label:'🛋️ 客厅' }, { id:'kitchen', label:'🍳 厨房' },
        { id:'studio', label:'🎬 舞蹈室' }, { id:'dressing', label:'👗 更衣室' },
        { id:'gym', label:'🏋️ 健身房' }, { id:'spa', label:'💆 SPA' },
      ]
    },
    {
      label: '🌿 户外', scenes: [
        { id:'pool', label:'🏊 泳池' }, { id:'beach', label:'🏖️ 海滩' },
        { id:'garden', label:'🌺 花园' }, { id:'rooftop', label:'🌇 天台' },
        { id:'camp', label:'🏕️ 露营' }, { id:'street', label:'📸 街拍' },
      ]
    },
    {
      label: '🚗 特殊场景', scenes: [
        { id:'car', label:'🚗 车内' }, { id:'office', label:'💼 办公室' },
        { id:'hotel', label:'🏨 酒店' }, { id:'elevator', label:'🛗 电梯' },
        { id:'fitting', label:'🪞 试衣间' }, { id:'cinema', label:'🎬 影院' },
      ]
    },
    {
      label: '🏰 幻想', scenes: [
        { id:'castle', label:'🏰 城堡' }, { id:'forest', label:'🌲 森林' },
        { id:'ancient', label:'🏯 古风阁楼' }, { id:'space', label:'🚀 太空舱' },
        { id:'fantasy', label:'✨ 异世界' },
      ]
    },
  ],

  AVATAR_POOL: [
    'https://i.postimg.cc/Y96LPskq/o-o-2.jpg',
    'https://i.postimg.cc/GtbTnhxP/o-o-1.jpg',
    'https://i.postimg.cc/fTLCngk1/image.jpg',
  ],

  // ─── 状态 ───
  state: { level: null, scene: null, props: [], step: 0 },
  wizardStep: 0,
  isStreaming: false,
  isViewerMode: false,
  hostChar: null,
  hostIsAiGenerated: false,
  tipTotal: 0,
  likes: 0,
  currentTab: 'self',
  streamStats: null,

  // ─── 初始化 ───
  init() {
    const screen = document.getElementById(this.screen);
    screen.innerHTML = `
      <div class="live-overlay" id="live-overlay">
        <div class="live-wizard" id="live-wizard">
          <div class="live-host-tabs" id="lw-tabs">
            <button class="live-host-tab active" data-tab="self">🙋 自己开播</button>
            <button class="live-host-tab" data-tab="hosts">🎤 主播列表</button>
          </div>
          <div id="lw-content"></div>
        </div>
      </div>

      <div class="live-stream" id="live-stream">
        <div class="live-bg" id="live-bg"></div>

        <div class="live-top-bar">
          <div class="live-avatar" id="live-avatar">👩</div>
          <div class="live-host-info">
            <div class="live-host-name-text" id="live-host-name-text">直播中</div>
            <div class="live-host-tags" id="live-host-tags"></div>
          </div>
          <div class="live-stat"><div class="live-dot"></div><span id="live-viewers">0</span></div>
          <button class="live-close-btn" id="live-close-btn">结束</button>
        </div>

        <div class="live-danmaku-wrap">
          <div class="live-danmaku-list" id="live-danmaku-list"></div>
        </div>

        <div class="live-side-btns">
          <button class="live-side-btn" id="live-like-btn">❤️<span class="count" id="live-like-count">0</span></button>
          <button class="live-side-btn" id="live-gift-btn">🎁</button>
          <button class="live-side-btn" id="live-share-btn">📤</button>
          <button class="live-side-btn" id="live-img-btn">🎨</button>
        </div>

        <div class="live-input-bar">
          <input type="text" id="live-input" placeholder="说点什么...">
          <button class="live-send-btn" id="live-send-btn">发送</button>
        </div>

        <div class="live-gift-overlay" id="live-gift-overlay"></div>
        <button class="live-bg-toggle-btn tucked" id="live-bg-toggle-btn">👁️</button>
      </div>

      <div class="live-settle-overlay" id="live-settle-overlay">
        <div class="live-settle-box" id="live-settle-box"></div>
      </div>
    `;
    this._bindWizardTabs();
    this._bindEvents();
  },

  open() {
    switchScreen(this.screen);
    if (this.isStreaming) return;
    this.wizardStep = 0;
    this.currentTab = 'self';
    this.hostChar = null;
    this.isViewerMode = false;
    this.state = { level: null, scene: null, props: [] };
    this._bindWizardTabs();
    document.getElementById('live-overlay').classList.add('visible');
    this._renderStep();
  },

  _bindWizardTabs() {
    const tabs = document.querySelectorAll('#lw-tabs .live-host-tab');
    tabs.forEach(t => {
      t.onclick = () => {
        if (t.dataset.tab === this.currentTab) return;
        this.currentTab = t.dataset.tab;
        this.hostChar = null;
        this.wizardStep = 0;
        this.state = { level: null, scene: null, props: [] };
        this.isViewerMode = this.currentTab === 'hosts';
        tabs.forEach(t2 => t2.classList.toggle('active', t2.dataset.tab === this.currentTab));
        this._renderStep();
      };
    });
  },

  _renderStep() {
    const body = document.getElementById('lw-content');
    if (this.wizardStep === 0) this._renderLevelSelect(body);
    else if (this.wizardStep === 1) this._renderSceneSelect(body);
    else if (this.wizardStep === 2) this._renderPropSelect(body);
  },

  _renderLevelSelect(body) {
    const step = this.currentTab === 'hosts' ? '1/4' : '1/3';
    body.innerHTML = `
      <div class="live-wizard-header">
        <div class="live-wizard-title">选择直播等级</div>
        <div class="live-wizard-step">${step}</div>
      </div>
      <div class="live-wizard-body">
        <div class="live-level-grid">
          ${this.LEVELS.map(l => `
            <div class="live-level-card${this.state.level?.id === l.id ? ' selected' : ''}" data-level="${l.id}">
              <div class="live-level-dot" style="background:${l.color}"></div>
              <div class="live-level-info">
                <div class="live-level-name">${l.label}</div>
                <div class="live-level-desc">${l.desc}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="live-wizard-footer">
        <button class="live-wiz-btn-back" id="lw-cancel">取消</button>
        <button class="live-wiz-btn-next" id="lw-next">下一步</button>
      </div>`;
    body.querySelectorAll('.live-level-card').forEach(el => {
      el.onclick = () => {
        body.querySelectorAll('.live-level-card').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
      };
    });
    document.getElementById('lw-cancel').onclick = () => document.getElementById('live-overlay').classList.remove('visible');
    document.getElementById('lw-next').onclick = () => {
      const sel = body.querySelector('.live-level-card.selected');
      if (!sel) return;
      this.state.level = this.LEVELS.find(l => l.id === parseInt(sel.dataset.level));
      this.wizardStep = 1;
      this._renderStep();
    };
  },

  _renderSceneSelect(body) {
    const step = this.currentTab === 'hosts' ? '2/4' : '2/3';
    body.innerHTML = `
      <div class="live-wizard-header">
        <div class="live-wizard-title">选择场景</div>
        <div class="live-wizard-step">${step}</div>
      </div>
      <div class="live-wizard-body">
        ${this.SCENE_CATEGORIES.map(cat => `
          <details class="live-scene-category">
            <summary>${cat.label}</summary>
            <div class="live-scene-grid">
              ${cat.scenes.map(s => `
                <div class="live-scene-item${this.state.scene?.id === s.id ? ' selected' : ''}" data-scene="${s.id}">${s.label}</div>
              `).join('')}
            </div>
          </details>
        `).join('')}
      </div>
      <div class="live-wizard-footer">
        <button class="live-wiz-btn-back" id="lw-back">返回</button>
        <button class="live-wiz-btn-next" id="lw-next">下一步</button>
      </div>`;
    body.querySelectorAll('.live-scene-item').forEach(el => {
      el.onclick = () => {
        body.querySelectorAll('.live-scene-item').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
      };
    });
    document.getElementById('lw-back').onclick = () => { this.wizardStep = 0; this._renderStep(); };
    document.getElementById('lw-next').onclick = () => {
      const sel = body.querySelector('.live-scene-item.selected');
      if (!sel) return;
      const sid = sel.dataset.scene;
      for (const cat of this.SCENE_CATEGORIES) {
        const found = cat.scenes.find(s => s.id === sid);
        if (found) { this.state.scene = found; break; }
      }
      this.wizardStep = 2;
      this._renderStep();
    };
  },

  _renderPropSelect(body) {
    // 主播列表tab：在道具前先选择主播
    if (this.currentTab === 'hosts' && !this.hostChar) {
      this._renderHostPicker(body);
      return;
    }
    const step = this.currentTab === 'hosts' ? '4/4' : '3/3';
    const total = this.currentTab === 'hosts' ? '4' : '3';
    const shop = Engine.getModule('shop');
    const items = shop ? shop.getAllItems() : [];
    body.innerHTML = `
      <div class="live-wizard-header">
        <div class="live-wizard-title">选择道具（可选）</div>
        <div class="live-wizard-step">${step}</div>
      </div>
      <div class="live-wizard-body">
        ${items.length === 0 ? '<div style="text-align:center;color:#999;padding:30px 0;">暂无可用道具</div>' : `
          <div class="live-prop-grid">
            ${items.map(p => {
              const name = p.label.replace(/^(\p{Emoji_Presentation}|\p{Emoji}️?)/u, '');
              return `<div class="live-prop-item${(this.state.props||[]).includes(p.id) ? ' selected' : ''}" data-id="${p.id}">${name}</div>`;
            }).join('')}
          </div>
        `}
      </div>
      <div class="live-wizard-footer">
        <button class="live-wiz-btn-back" id="lw-back">返回</button>
        <button class="live-wiz-btn-skip" id="lw-skip">跳过</button>
        <button class="live-wiz-btn-next" id="lw-next">开始直播</button>
      </div>`;
    if (items.length > 0) {
      body.querySelectorAll('.live-prop-item').forEach(el => {
        el.onclick = () => {
          el.classList.toggle('selected');
          const pid = el.dataset.id;
          this.state.props = this.state.props || [];
          const idx = this.state.props.indexOf(pid);
          if (idx >= 0) this.state.props.splice(idx, 1);
          else this.state.props.push(pid);
        };
      });
    }
    document.getElementById('lw-back').onclick = () => { this.wizardStep = 1; this._renderStep(); };
    document.getElementById('lw-skip').onclick = () => this.startStream();
    document.getElementById('lw-next').onclick = () => this.startStream();
  },

  _renderHostPicker(body) {
    const chars = db.characters || [];
    body.innerHTML = `
      <div class="live-wizard-header">
        <div class="live-wizard-title">选择要观看的主播</div>
        <div class="live-wizard-step">3/4</div>
      </div>
      <div class="live-wizard-body">
        ${chars.length === 0 ? '<div class="live-host-empty">暂无角色，请先创建QQ联系人</div>' : `
          <div class="live-host-grid">
            ${chars.map(c => `
              <div class="live-host-card${this.hostChar?.id === c.id ? ' selected' : ''}" data-char-id="${c.id}">
                <img src="${c.avatar}" class="live-host-avatar" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22><rect fill=%22%23f0f0f0%22 width=%2248%22 height=%2248%22/><text x=%2224%22 y=%2232%22 text-anchor=%22middle%22 font-size=%2224%22>👤</text></svg>'">
                <div class="live-host-name">${c.remarkName || c.realName}</div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
      <div class="live-wizard-footer">
        <button class="live-wiz-btn-back" id="lw-back">返回</button>
        <button class="live-wiz-btn-next" id="lw-next">下一步（选道具）</button>
      </div>`;
    if (chars.length > 0) {
      body.querySelectorAll('.live-host-card').forEach(el => {
        el.onclick = () => {
          body.querySelectorAll('.live-host-card').forEach(c => c.classList.remove('selected'));
          el.classList.add('selected');
          this.hostChar = chars.find(c => c.id === el.dataset.charId);
        };
      });
    }
    document.getElementById('lw-back').onclick = () => { this.wizardStep = 1; this._renderStep(); };
    document.getElementById('lw-next').onclick = () => {
      if (!this.hostChar) return;
      this.isViewerMode = true;
      this.wizardStep = 2;
      this._renderStep();
    };
  },

  _bindWizardTabs() {
    // 在 open 时绑定
  },

  _bindEvents() {
    // 背景切换
    document.getElementById('live-bg-toggle-btn').onclick = () => {
      const page = document.getElementById('live-stream');
      page.classList.toggle('bg-only');
    };
  },

  // ─── 开始直播 ───
  async startStream() {
    document.getElementById('live-overlay').classList.remove('visible');
    const page = document.getElementById('live-stream');
    page.classList.add('active');
    this.isStreaming = true;
    this.tipTotal = 0;
    this.likes = 0;

    this._setupStreamUI();
    this.streamStats = {
      startTime: Date.now(), peakViewers: 0, totalViewers: 0, sampleCount: 0,
      danmakuSent: 0, storyCount: 0, totalTips: 0,
    };

    // 观众人数定时器
    let viewers = Math.floor(Math.random() * 50) + 10;
    this.streamStats.peakViewers = viewers;
    page._vi = setInterval(() => {
      viewers += Math.floor(Math.random() * 10) - 3;
      if (viewers < 5) viewers = 5;
      document.getElementById('live-viewers').textContent = viewers;
      if (viewers > this.streamStats.peakViewers) this.streamStats.peakViewers = viewers;
      this.streamStats.totalViewers += viewers;
      this.streamStats.sampleCount++;
    }, 3000);

    // 首次生成
    await this.generateContent();
  },

  _setupStreamUI() {
    const { level, scene } = this.state;
    const page = document.getElementById('live-stream');
    page.classList.remove('bg-only');

    // 头像
    const avatar = document.getElementById('live-avatar');
    if (this.isViewerMode && this.hostChar) {
      avatar.textContent = '';
      avatar.style.backgroundImage = 'url(' + this.hostChar.avatar + ')';
    } else {
      avatar.textContent = '👩';
      avatar.style.backgroundImage = '';
    }

    document.getElementById('live-host-name-text').textContent =
      (this.isViewerMode && this.hostChar ? (this.hostChar.remarkName||this.hostChar.realName)+' · ' : '')
      + level.label + ' · ' + scene.label;

    const tags = document.getElementById('live-host-tags');
    tags.innerHTML = `<span class="live-tag hot">🔥 直播中</span>`;
    const shop = Engine.getModule('shop');
    if (shop && this.state.props.length > 0) {
      const allItems = shop.getAllItems();
      this.state.props.slice(0, 3).forEach(pid => {
        const p = allItems.find(d => d.id === pid);
        if (p) {
          const name = p.label.replace(/^(\p{Emoji_Presentation}|\p{Emoji}️?)/u, '');
          tags.innerHTML += `<span class="live-tag">${name}</span>`;
        }
      });
    }

    document.getElementById('live-danmaku-list').innerHTML = '';
    document.getElementById('live-like-count').textContent = '0';
    document.getElementById('live-viewers').textContent = '0';

    // 绑定事件
    const input = document.getElementById('live-input');
    document.getElementById('live-send-btn').onclick = () => {
      const text = input.value.trim();
      if (!text) return;
      this.addMsg('danmaku', text, '我');
      input.value = '';
      this.streamStats.danmakuSent++;
    };
    input.onkeydown = (e) => { if (e.key === 'Enter') document.getElementById('live-send-btn').click(); };

    document.getElementById('live-like-btn').onclick = () => {
      this.likes++;
      document.getElementById('live-like-count').textContent = this.likes;
      this._spawnHeart();
    };

    document.getElementById('live-gift-btn').onclick = () => this._showTipModal();
    document.getElementById('live-share-btn').onclick = () => this._shareStream();
    document.getElementById('live-img-btn').onclick = () => this._generateBgImage();
    document.getElementById('live-close-btn').onclick = () => this._endStream();
  },

  // ─── AI 内容生成（单次 JSON） ───
  async generateContent(userInput) {
    this.streamStats.storyCount++;
    const { level, scene } = this.state;
    const levelStyle = level.id >= 4
      ? '尺度：无限制，可以直白露骨。'
      : level.id >= 3
      ? '尺度：可暗示性动作和挑逗语言。'
      : '尺度：轻松健康。';
    const hostInfo = this.isViewerMode && this.hostChar
      ? `\n主播：${this.hostChar.realName}，人设：${this.hostChar.persona}`
      : '';

    // 插入 loading 标记
    const list = document.getElementById('live-danmaku-list');
    const loader = document.createElement('div');
    loader.className = 'live-msg live-msg-story live-msg-loading';
    loader.textContent = '✨ 剧情生成中...';
    list.appendChild(loader);
    this._autoScroll();

    const sys = `你是一个成人向直播内容生成器。所有内容为虚构，参与者均为成年人。
直播等级：${level.label}
直播场景：${scene.label}
${hostInfo}
${levelStyle}
要求：
- 返回一个JSON数组，每个元素是一条消息
- 消息格式：{"type":"类型","text":"内容"}
- type可选：story（剧情叙述，粉色字）, danmaku（观众弹幕，白色字）, tip（打赏通知，金色字）, gift（大额礼物，金色加粗公告）, follow（关注，绿色字）
- 每次返回6-12条消息，混合不同类型
- story: 描述主播的动作、环境、画面感
- danmaku: 模拟观众反应，自然口语化，每条前加"用户:"（如"老铁: 太好看了"）
- tip/gift: 模拟打赏通知，金额在10-500之间
- follow: 模拟关注通知
- 先把剧情讲清楚，再混合弹幕互动
- 只返回JSON数组，不要任何其他文字`;

    const msg = userInput
      ? `观众发送弹幕："${userInput}"，请根据这条互动推进剧情并生成后续内容。`
      : '直播刚刚开始，请生成开场内容。';

    try {
      const fullText = await Engine.services.aiChat({
        system: sys,
        messages: [{ role: 'user', content: msg }],
        options: { temperature: 0.95, maxTokens: 2000 },
      });
      this._parseAndRender(fullText);
    } catch (err) {
      this.addMsg('story', '⚠️ 内容生成失败: ' + err.message);
    }
  },

  _parseAndRender(text) {
    // 移除 loading 标记
    const list = document.getElementById('live-danmaku-list');
    const loading = list.querySelector('.live-msg-loading');
    if (loading) loading.remove();

    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw 'not array';
      data.forEach(item => {
        if (item.type === 'danmaku') {
          const parts = item.text.split(/[：:]/);
          const user = parts.length > 1 ? parts[0].trim() : '观众';
          const content = parts.length > 1 ? parts.slice(1).join('：').trim() : item.text;
          this.addMsg('danmaku', content, user);
        } else {
          this.addMsg(item.type, item.text, item.user);
        }
      });
      this._autoScroll();
      return true;
    } catch (e) {
      // JSON 解析失败，当作文本直接展示
      this.addMsg('story', text);
      this._autoScroll();
      return false;
    }
  },

  // ─── 消息渲染 ───
  addMsg(type, text, user) {
    if (!text) return;
    const list = document.getElementById('live-danmaku-list');
    const div = document.createElement('div');
    div.className = 'live-msg live-msg-' + type;

    if (type === 'gift') {
      div.textContent = '🎁 ' + (user ? user + ': ' : '') + text;
      this._showGiftAnimation(user || '观众', text);
    } else if (type === 'tip') {
      div.textContent = '🪙 ' + (user ? user + ': ' : '') + text;
    } else if (type === 'follow') {
      div.textContent = '➕ ' + (user ? user + ': ' : '') + text;
    } else if (type === 'danmaku') {
      div.innerHTML = '<span style="color:#ff80ab;font-weight:600;">' + this._esc(user || '观众') + '：</span>' + this._esc(text);
    } else {
      div.textContent = '📖 ' + text;
    }

    list.appendChild(div);
    this._autoScroll();

    // 如果超过60条，删最早的
    while (list.children.length > 60) list.removeChild(list.firstChild);
  },

  _autoScroll() {
    const list = document.getElementById('live-danmaku-list');
    requestAnimationFrame(() => { list.scrollTop = list.scrollHeight; });
  },

  _esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); },

  // ─── 礼物动画 ───
  _showGiftAnimation(user, giftName) {
    const overlay = document.getElementById('live-gift-overlay');
    // 横幅
    const banner = document.createElement('div');
    banner.className = 'live-gift-banner';
    banner.textContent = '🚀 ' + user + ' 送出 ' + giftName;
    overlay.appendChild(banner);
    setTimeout(() => banner.remove(), 3000);

    // emoji 粒子
    const emojis = ['🎉','❤️','🔥','💎','🌟','✨','🎊','💖'];
    for (let i = 0; i < 12; i++) {
      const e = document.createElement('div');
      e.className = 'live-gift-emoji';
      e.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      e.style.left = (10 + Math.random() * 80) + '%';
      e.style.bottom = '30%';
      e.style.fontSize = (18 + Math.random() * 20) + 'px';
      e.style.animationDelay = (Math.random() * 0.5) + 's';
      overlay.appendChild(e);
      setTimeout(() => e.remove(), 3000);
    }
  },

  // ─── 点赞飘心 ───
  _spawnHeart() {
    const el = document.createElement('div');
    el.className = 'live-like-heart';
    el.textContent = '❤️';
    const sideBtns = document.getElementById('live-like-btn');
    const rect = sideBtns.getBoundingClientRect();
    el.style.left = (rect.left + rect.width / 2 - 12) + 'px';
    el.style.bottom = (window.innerHeight - rect.top + 10) + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  },

  // ─── 打赏弹窗 ───
  _showTipModal() {
    const overlay = document.getElementById('live-settle-overlay');
    const box = document.getElementById('live-settle-box');
    box.innerHTML = `
      <div class="live-settle-title">🎁 打赏主播</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0;">
        ${[10,50,100,500].map(a => `<button class="live-tip-amt" data-a="${a}" style="padding:12px;border:2px solid rgba(255,255,255,0.15);border-radius:10px;background:rgba(255,255,255,0.05);color:#FFD700;font-size:16px;font-weight:700;cursor:pointer;transition:border-color 0.15s;">${a} 🪙</button>`).join('')}
      </div>
      <div style="margin-bottom:12px;">
        <input type="number" id="tip-custom" placeholder="自定义金额" min="1" style="width:100%;padding:10px;border:1px solid rgba(255,255,255,0.15);border-radius:8px;background:rgba(255,255,255,0.05);color:#fff;text-align:center;outline:none;box-sizing:border-box;">
      </div>
      <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-bottom:14px;">🪙 余额: ${(db.money||0)}</div>
      <div style="display:flex;gap:10px;">
        <button class="live-settle-btn" id="tip-cancel" style="background:#555;color:#fff;flex:1;">取消</button>
        <button class="live-settle-btn" id="tip-confirm" style="flex:1;">打赏</button>
      </div>`;
    overlay.classList.add('visible');
    document.getElementById('tip-cancel').onclick = () => overlay.classList.remove('visible');
    document.getElementById('tip-confirm').onclick = () => {
      const amt = parseInt(document.getElementById('tip-custom').value) || 0;
      if (amt <= 0) return;
      if (amt > (db.money || 0)) { showToast('余额不足'); return; }
      db.money -= amt;
      this.tipTotal += amt;
      this.streamStats.totalTips += amt;
      saveData();
      overlay.classList.remove('visible');
      this.addMsg('tip', '打赏了 ' + amt + ' 🪙', '我');
    };
    box.querySelectorAll('.live-tip-amt').forEach(b => {
      b.onclick = () => { document.getElementById('tip-custom').value = b.dataset.a; };
    });
  },

  // ─── 分享 ───
  _shareStream() {
    const { level, scene } = this.state;
    const hostName = this.isViewerMode && this.hostChar
      ? (this.hostChar.remarkName || this.hostChar.realName) : '我';
    const shareText = `📺 直播分享：${hostName} · ${level.label} · ${scene.label}\n快来直播间看看吧！`;
    // 复制到剪贴板
    navigator.clipboard.writeText(shareText).then(() => showToast('✅ 直播链接已复制')).catch(() => showToast('复制失败'));
  },

  // ─── 生成背景图 ───
  async _generateBgImage() {
    const { level, scene } = this.state;
    const hostDesc = this.isViewerMode && this.hostChar
      ? ', ' + (this.hostChar.remarkName || this.hostChar.realName) + ', ' + (this.hostChar.persona || '')
      : '';
    try {
      const prompt = 'live streaming background, ' + scene.label + ', ' + level.label + ', anime style, cinematic lighting, high quality, detailed' + hostDesc;
      const url = await Engine.services.aiGenerateImage(prompt, { imageSize: '768x1024' });
      document.getElementById('live-bg').style.backgroundImage = 'url(' + url + ')';
      showToast('🎨 直播背景已更新');
    } catch (err) {
      showToast('背景生成失败: ' + err.message);
    }
  },

  // ─── 结束直播 ───
  async _endStream() {
    if (!confirm('确定结束直播吗？')) return;
    this.isStreaming = false;
    const page = document.getElementById('live-stream');
    clearInterval(page._vi);

    // 结算
    const duration = Math.floor((Date.now() - this.streamStats.startTime) / 1000);
    const avgViewers = this.streamStats.sampleCount > 0
      ? Math.round(this.streamStats.totalViewers / this.streamStats.sampleCount) : 0;
    const coins = Math.floor(
      (this.streamStats.storyCount * 10 + this.streamStats.danmakuSent * 2 + this.tipTotal)
      * (this.LEVEL_MULTIPLIER[this.state.level.id] || 1)
    );
    db.money = (db.money || 0) + coins;
    await saveData();

    const box = document.getElementById('live-settle-box');
    box.innerHTML = `
      <div class="live-settle-title">🎉 直播结束</div>
      <div class="live-settle-sub">感谢你的精彩直播！</div>
      <div class="live-settle-coin">+${coins} 🪙</div>
      <div class="live-settle-stats">
        <div class="live-settle-stat"><div class="live-settle-stat-val">${this._fmtTime(duration)}</div><div class="live-settle-stat-lbl">直播时长</div></div>
        <div class="live-settle-stat"><div class="live-settle-stat-val">${avgViewers}</div><div class="live-settle-stat-lbl">平均观众</div></div>
        <div class="live-settle-stat"><div class="live-settle-stat-val">${this.streamStats.peakViewers}</div><div class="live-settle-stat-lbl">最高观众</div></div>
        <div class="live-settle-stat"><div class="live-settle-stat-val">${this.likes}</div><div class="live-settle-stat-lbl">点赞</div></div>
      </div>
      <button class="live-settle-btn" id="settle-close">太棒了！</button>`;
    document.getElementById('live-settle-overlay').classList.add('visible');
    document.getElementById('settle-close').onclick = () => {
      document.getElementById('live-settle-overlay').classList.remove('visible');
      page.classList.remove('active');
      switchScreen('home-screen');
    };
  },

  _fmtTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? m + '分' + sec + '秒' : sec + '秒';
  },
});

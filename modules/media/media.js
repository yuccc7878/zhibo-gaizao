/* ========================================
   Module: Media (媒体)
   三个Tab：B站 / 今日头条 / OnlyFans
   内容由AI生成，支持分享到QQ联系人
   点击卡片 → 直接进入详情页
   文字流式输出 + 图片后台生成后插入
   ======================================== */

Engine.register({
    id: 'media',
    name: '媒体',
    icon: '📰',
    screen: 'media-screen',
    order: 3,

    activeTab: 'bilibili',

    cache: {
        bilibili: null,
        toutiao: null,
        onlyfans: null,
    },

    loading: {
        bilibili: false,
        toutiao: false,
        onlyfans: false,
    },

    // 详情页状态
    detailAborted: false,  // 用于中断流式读取

    // Tab配置
    TABS: [
        {
            id: 'bilibili',
            label: 'B站',
            icon: '📺',
            color: '#00a1d6',
            prompt: `请生成6条B站热门视频的模拟数据。每条包含以下字段：
title（吸引眼球的中文标题，要有B站风格）
author（UP主名称）
views（播放量，纯数字）
danmaku（弹幕数，纯数字）
likes（点赞数，纯数字）
duration（视频时长秒数）
description（一句话内容摘要）
风格要求：混合科技、游戏、生活、美食、搞笑等类型，标题要有B站特色（如"震惊！""万字解析""手把手教你"等）
请直接返回JSON数组，不要包含任何其他文字或markdown标记。字段名用英文双引号。`,
            detailPrompt: (item) => `你是一位资深B站UP主，请根据以下视频信息撰写一篇详细的内容介绍（300-500字）：

标题：${item.title}
UP主：${item.author}
播放量：${item.views}
简介：${item.description}

要求：
1. 开头用一句话概括视频亮点
2. 中间分析视频可能涵盖的内容、看点、亮点
3. 结尾给出观看建议或推荐理由
4. 语言风格轻松有趣，有B站味道
5. 不要使用markdown标记，纯文本输出`,
            imgPrompt: (item) => `anime style, ${item.title}, ${item.author}, vibrant colors, high quality illustration, detailed background`,
        },
        {
            id: 'toutiao',
            label: '今日头条',
            icon: '📋',
            color: '#ff0000',
            prompt: `请生成6条今日头条热门新闻的模拟数据。每条包含以下字段：
title（中文新闻标题，简洁有力）
source（来源媒体名称，如"人民日报""央视新闻""澎湃新闻"等）
comments（评论数，纯数字）
likes（点赞数，纯数字）
category（分类，从以下选择：社会/科技/娱乐/财经/体育/国际）
description（一句话新闻摘要）
风格要求：真实新闻感，涵盖多个领域，标题要有头条风格（如"刚刚！""重磅""突发"等）
请直接返回JSON数组，不要包含任何其他文字或markdown标记。字段名用英文双引号。`,
            detailPrompt: (item) => `你是一位资深新闻记者，请根据以下新闻标题撰写一篇详细的新闻报道（300-500字）：

标题：${item.title}
来源：${item.source}
分类：${item.category}
摘要：${item.description}

要求：
1. 开头交代新闻核心事实（5W1H）
2. 中间展开背景、细节、各方反应
3. 结尾展望影响或后续发展
4. 语言风格客观专业，有新闻报道感
5. 不要使用markdown标记，纯文本输出`,
            imgPrompt: (item) => `news photography, ${item.title}, ${item.category}, professional photojournalism, realistic, high quality, detailed`,
        },
        {
            id: 'onlyfans',
            label: 'OnlyFans',
            icon: '🔥',
            color: '#00aff0',
            prompt: `请生成6条OnlyFans创作者推荐的模拟数据。每条包含以下字段：
title（创作者名称/标题，英文艺名）
description（中文内容简介，描述创作风格和特色内容）
subscribers（订阅者数量，纯数字）
posts（帖子数量，纯数字）
category（分类，从以下选择：Fitness/Beauty/Music/Art/Cooking/Photography）
风格要求：创意内容创作者，涵盖健身、美妆、音乐、艺术、烹饪、摄影等领域，内容保持SFW（安全工作环境），体现创作者的个人特色
请直接返回JSON数组，不要包含任何其他文字或markdown标记。字段名用英文双引号。`,
            detailPrompt: (item) => `你是一位内容策划专家，请根据以下创作者信息撰写一篇详细的创作者介绍（300-500字）：

创作者：${item.title}
分类：${item.category}
订阅者：${item.subscribers}
简介：${item.description}

要求：
1. 开头介绍创作者的特色和定位
2. 中间分析其内容风格、受众群体、创作亮点
3. 结尾给出关注建议
4. 语言风格轻松有感染力
5. 不要使用markdown标记，纯文本输出`,
            imgPrompt: (item) => `creative portrait, ${item.title}, ${item.category} content creator, aesthetic, artistic, high quality, professional lighting`,
        },
    ],

    init() {
        const screen = document.getElementById(this.screen);
        const tabsHtml = this.TABS.map(t =>
            `<button class="media-tab-btn" data-tab="${t.id}" style="--tab-color:${t.color}">
                <span class="media-tab-icon">${t.icon}</span>
                <span class="media-tab-label">${t.label}</span>
            </button>`
        ).join('');

        screen.innerHTML = `
            <!-- 主列表页 -->
            <div class="media-page media-list-page" id="media-list-page">
                <div class="media-header">
                    <button class="back-btn" data-target="home-screen">‹</button>
                    <div class="title-container"><h1 class="title">📰 媒体</h1></div>
                    <div class="placeholder"></div>
                </div>
                <div class="media-tabs">${tabsHtml}</div>
                <main class="media-content" id="media-content">
                    <div class="media-empty">
                        <div class="media-empty-icon">📰</div>
                        <p>选择频道，点击刷新获取内容</p>
                    </div>
                </main>
                <button class="media-refresh-btn" id="media-refresh-btn" title="刷新">🔄</button>
            </div>

            <!-- 详情页 -->
            <div class="media-page media-detail-page" id="media-detail-page" style="display:none;">
                <div class="media-header">
                    <button class="back-btn" id="media-detail-back">‹</button>
                    <div class="title-container"><h1 class="title" id="media-detail-title">详情</h1></div>
                    <button class="media-detail-share-btn" id="media-detail-share-btn">分享</button>
                </div>
                <main class="media-detail-content" id="media-detail-content"></main>
            </div>

            <!-- 确认弹窗 -->
            <div class="media-confirm-overlay" id="media-confirm-overlay">
                <div class="media-confirm-modal">
                    <div class="media-confirm-icon">📖</div>
                    <div class="media-confirm-text">是否查看详细内容？</div>
                    <div class="media-confirm-hint">AI将为你生成深度解读 + 配图</div>
                    <div class="media-confirm-actions">
                        <button class="media-confirm-cancel" id="media-confirm-cancel">取消</button>
                        <button class="media-confirm-ok" id="media-confirm-ok">确认</button>
                    </div>
                </div>
            </div>

            <!-- 分享浮层 -->
            <div class="media-share-overlay" id="media-share-overlay">
                <div class="media-share-modal">
                    <div class="media-share-header">
                        <span>分享给</span>
                        <button class="media-share-close" id="media-share-close">✕</button>
                    </div>
                    <div class="media-share-list" id="media-share-list"></div>
                </div>
            </div>`;
    },

    open() {
        switchScreen(this.screen);

        document.querySelectorAll('.media-tab-btn').forEach(btn => {
            btn.onclick = () => this.switchTab(btn.dataset.tab);
        });

        document.getElementById('media-refresh-btn').onclick = () => this.fetchCurrent();
        document.getElementById('media-detail-back').onclick = () => this.closeDetail();
        document.getElementById('media-detail-share-btn').onclick = () => {
            if (this._currentDetailItem) this.openShare(this._currentDetailItem.index);
        };

        document.getElementById('media-share-overlay').onclick = (e) => {
            if (e.target.id === 'media-share-overlay') this.closeShare();
        };
        document.getElementById('media-share-close').onclick = () => this.closeShare();

        // 确认弹窗
        document.getElementById('media-confirm-overlay').onclick = (e) => {
            if (e.target.id === 'media-confirm-overlay') this.closeConfirm();
        };
        document.getElementById('media-confirm-cancel').onclick = () => this.closeConfirm();
        document.getElementById('media-confirm-ok').onclick = () => this.confirmDetail();

        this.switchTab(this.activeTab);
        this.showListPage();
    },

    // =========== 页面切换 ===========

    showListPage() {
        document.getElementById('media-list-page').style.display = '';
        document.getElementById('media-detail-page').style.display = 'none';
    },

    showDetailPage() {
        document.getElementById('media-list-page').style.display = 'none';
        document.getElementById('media-detail-page').style.display = '';
    },

    // =========== Tab切换 ===========

    switchTab(tabId) {
        this.activeTab = tabId;
        document.querySelectorAll('.media-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        const tab = this.TABS.find(t => t.id === tabId);
        const refreshBtn = document.getElementById('media-refresh-btn');
        if (refreshBtn && tab) refreshBtn.style.background = tab.color;
        this.render();
    },

    // =========== 列表获取 ===========

    async fetchCurrent() {
        const tabId = this.activeTab;
        if (this.loading[tabId]) return;
        this.loading[tabId] = true;

        const btn = document.getElementById('media-refresh-btn');
        const content = document.getElementById('media-content');
        const tab = this.TABS.find(t => t.id === tabId);

        btn.classList.add('spinning');
        content.innerHTML = `<div class="media-loading">正在生成${tab.label}内容...</div>`;

        try {
            const result = await this.callAI(tab.prompt, 2000);
            const parsed = this.parseJSON(result);
            if (!parsed || !Array.isArray(parsed) || parsed.length === 0) throw new Error('AI返回数据格式异常');
            this.cache[tabId] = parsed;
            this.render();
        } catch (err) {
            content.innerHTML = `
                <div class="media-error">
                    ⚠️ 生成失败：${err.message}
                    <br><br>
                    <button class="media-retry-btn" onclick="document.getElementById('media-refresh-btn').click()">重试</button>
                </div>`;
        } finally {
            this.loading[tabId] = false;
            btn.classList.remove('spinning');
        }
    },

    // =========== 列表渲染 ===========

    render() {
        const content = document.getElementById('media-content');
        if (!content) return;

        const tabId = this.activeTab;
        const data = this.cache[tabId];

        if (!data || data.length === 0) {
            const tab = this.TABS.find(t => t.id === tabId);
            content.innerHTML = `
                <div class="media-empty">
                    <div class="media-empty-icon">${tab.icon}</div>
                    <p>点击右下角按钮生成${tab.label}内容</p>
                </div>`;
            return;
        }

        const tab = this.TABS.find(t => t.id === tabId);
        const esc = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const formatNum = (n) => { n = Number(n) || 0; return n >= 10000 ? (n / 10000).toFixed(1) + '万' : n.toLocaleString(); };
        const formatDuration = (s) => { s = Number(s) || 0; const m = Math.floor(s / 60); return `${m}:${(s % 60).toString().padStart(2, '0')}`; };

        content.innerHTML = data.map((item, index) => {
            let metaHtml = '';
            if (tabId === 'bilibili') {
                metaHtml = `<div class="media-card-meta">
                    <span>👤 ${esc(item.author || '')}</span>
                    <span>▶ ${formatNum(item.views)}</span>
                    <span>💬 ${formatNum(item.danmaku)}</span>
                    <span>👍 ${formatNum(item.likes)}</span>
                    <span>⏱ ${formatDuration(item.duration)}</span>
                </div>`;
            } else if (tabId === 'toutiao') {
                metaHtml = `<div class="media-card-meta">
                    <span>📰 ${esc(item.source || '')}</span>
                    <span class="media-tag">${esc(item.category || '')}</span>
                    <span>💬 ${formatNum(item.comments)}</span>
                    <span>👍 ${formatNum(item.likes)}</span>
                </div>`;
            } else if (tabId === 'onlyfans') {
                metaHtml = `<div class="media-card-meta">
                    <span class="media-tag">${esc(item.category || '')}</span>
                    <span>👥 ${formatNum(item.subscribers)} 订阅</span>
                    <span>📝 ${formatNum(item.posts)} 帖子</span>
                </div>`;
            }

            return `
                <div class="media-card" data-index="${index}">
                    <div class="media-card-body" data-action="detail" data-index="${index}">
                        <div class="media-card-icon">${tab.icon}</div>
                        <div class="media-card-info">
                            <div class="media-card-title">${esc(item.title || '')}</div>
                            <div class="media-card-desc">${esc(item.description || '')}</div>
                            ${metaHtml}
                        </div>
                        <div class="media-card-arrow">›</div>
                    </div>
                    <button class="media-share-btn" data-index="${index}" title="分享">分享 →</button>
                </div>`;
        }).join('');

        // 卡片点击 → 确认弹窗
        content.querySelectorAll('[data-action="detail"]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openConfirm(parseInt(el.dataset.index));
            });
        });

        content.querySelectorAll('.media-share-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openShare(parseInt(btn.dataset.index));
            });
        });
    },

    // =========== 确认弹窗 ===========

    _pendingDetailIndex: null,

    openConfirm(index) {
        this._pendingDetailIndex = index;
        document.getElementById('media-confirm-overlay').classList.add('visible');
    },

    closeConfirm() {
        document.getElementById('media-confirm-overlay').classList.remove('visible');
        this._pendingDetailIndex = null;
    },

    confirmDetail() {
        const index = this._pendingDetailIndex;
        this.closeConfirm();
        if (index !== null) this.openDetail(index);
    },

    // =========== 详情页（流式文字 + 后台图片） ===========

    _currentDetailItem: null,
    _fullText: '',  // 流式累积的完整文字

    async openDetail(index) {
        const tabId = this.activeTab;
        const data = this.cache[tabId];
        if (!data || !data[index]) return;

        const item = data[index];
        const tab = this.TABS.find(t => t.id === tabId);

        this._currentDetailItem = { tabId, index, item, tab };
        this._fullText = '';
        this.detailAborted = false;

        // 切到详情页
        this.showDetailPage();
        document.getElementById('media-detail-title').textContent = tab.label + ' · 详情';

        const detailContent = document.getElementById('media-detail-content');
        const esc = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const metaHtml = tabId === 'bilibili'
            ? `<div class="media-detail-meta">👤 ${esc(item.author || '')} · ▶ ${this.formatNum(item.views)} · 💬 ${this.formatNum(item.danmaku)}</div>`
            : tabId === 'toutiao'
                ? `<div class="media-detail-meta">📰 ${esc(item.source || '')} · ${esc(item.category || '')} · 💬 ${this.formatNum(item.comments)}</div>`
                : `<div class="media-detail-meta">${esc(item.category || '')} · 👥 ${this.formatNum(item.subscribers)} 订阅</div>`;

        // 初始渲染：头部 + 图片占位 + 文字占位
        detailContent.innerHTML = `
            <div class="media-detail-hero">
                <div class="media-detail-hero-icon">${tab.icon}</div>
                <h2 class="media-detail-hero-title">${esc(item.title || '')}</h2>
                ${metaHtml}
                <div class="media-detail-hero-desc">${esc(item.description || '')}</div>
            </div>
            <div class="media-detail-image-wrap" id="media-detail-image-wrap" style="display:none;">
                <img class="media-detail-image" id="media-detail-image" src="" alt="配图">
            </div>
            <div class="media-detail-article">
                <div class="media-detail-article-label">📖 AI 深度解读</div>
                <div class="media-detail-article-body" id="media-detail-article-body">
                    <span class="media-detail-cursor"></span>
                </div>
            </div>
            <div class="media-detail-footer" id="media-detail-footer" style="display:none;">
                <button class="media-detail-share-bottom" id="media-detail-share-bottom">📤 分享给联系人</button>
            </div>`;

        // 并行：流式文字 + 后台图片
        const detailPrompt = tab.detailPrompt(item);
        const imgPrompt = tab.imgPrompt(item);

        // 图片后台生成，完成后插入
        this.callImageAPI(imgPrompt).then(imageUrl => {
            if (this.detailAborted) return;
            const imgWrap = document.getElementById('media-detail-image-wrap');
            const imgEl = document.getElementById('media-detail-image');
            if (imgWrap && imgEl && imageUrl) {
                imgEl.src = imageUrl;
                imgWrap.style.display = '';
            }
        }).catch(err => {
            console.warn('[Media] 图片生成失败:', err.message);
        });

        // 文字流式输出
        await this.streamDetail(detailPrompt);
    },

    /** 流式调用AI文字，逐字输出到详情页 */
    async streamDetail(prompt) {
        const presets = db.apiPresets || [];
        const activeId = db.activeApiPresetId;
        let preset = presets.find(p => p.id === activeId) || presets[0];

        if (!preset || !preset.url || !preset.key) {
            this.appendDetailText('\n\n⚠️ 请先在设置中配置AI API');
            this.finishDetail();
            return;
        }

        const apiUrl = preset.url.replace(/\/+$/, '') + '/chat/completions';

        try {
            const resp = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${preset.key}`,
                },
                body: JSON.stringify({
                    model: preset.model,
                    messages: [
                        { role: 'system', content: '你是一个内容生成器，严格按照用户要求输出内容，不要包含多余标记。' },
                        { role: 'user', content: prompt },
                    ],
                    temperature: 0.85,
                    max_tokens: 1500,
                    stream: true,
                }),
            });

            if (!resp.ok) {
                const errText = await resp.text().catch(() => '');
                throw new Error(`API请求失败 (${resp.status}): ${errText.slice(0, 100)}`);
            }

            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                if (this.detailAborted) { reader.cancel(); break; }

                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (this.detailAborted) break;
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data:')) continue;
                    const payload = trimmed.slice(5).trim();
                    if (payload === '[DONE]') continue;

                    try {
                        const json = JSON.parse(payload);
                        const delta = json.choices?.[0]?.delta?.content;
                        if (delta) {
                            this._fullText += delta;
                            this.appendDetailText(delta);
                        }
                    } catch (e) {
                        // 跳过解析失败的行
                    }
                }
            }
        } catch (err) {
            // 非流式降级：尝试普通请求
            try {
                const result = await this.callAI(prompt, 1500);
                if (!this.detailAborted) {
                    this._fullText = result;
                    this.setDetailText(result);
                }
            } catch (e2) {
                if (!this.detailAborted) {
                    this.appendDetailText('\n\n⚠️ 内容生成失败：' + err.message);
                }
            }
        }

        this.finishDetail();
    },

    /** 追加文字到详情文章区（流式） */
    appendDetailText(text) {
        const body = document.getElementById('media-detail-article-body');
        if (!body) return;

        const esc = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const cursor = '<span class="media-detail-cursor"></span>';

        // 移除旧光标，追加新文字+光标
        const existing = body.innerHTML.replace(/<span class="media-detail-cursor"><\/span>/g, '');
        body.innerHTML = existing + esc(text) + cursor;

        // 自动滚动到底部
        const container = document.getElementById('media-detail-content');
        if (container) container.scrollTop = container.scrollHeight;
    },

    /** 设置完整文字（非流式降级用） */
    setDetailText(text) {
        const body = document.getElementById('media-detail-article-body');
        if (!body) return;
        const esc = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const paragraphs = text.split(/\n+/).filter(p => p.trim()).map(p => `<p>${esc(p)}</p>`).join('');
        body.innerHTML = paragraphs;
    },

    /** 文字流式结束后：显示分享按钮、整理段落 */
    finishDetail() {
        const footer = document.getElementById('media-detail-footer');
        if (footer) footer.style.display = '';

        // 给底部分享按钮绑定事件
        const bottomBtn = document.getElementById('media-detail-share-bottom');
        if (bottomBtn) {
            bottomBtn.onclick = () => {
                if (this._currentDetailItem) this.openShare(this._currentDetailItem.index);
            };
        }

        // 将累积的文字整理为段落格式
        if (this._fullText) {
            this.setDetailText(this._fullText);
        }
    },

    closeDetail() {
        this.detailAborted = true;
        this.showListPage();
        this._fullText = '';
        this._currentDetailItem = null;
    },

    // =========== AI调用（非流式，用于列表生成） ===========

    async callAI(prompt, maxTokens) {
        const presets = db.apiPresets || [];
        const activeId = db.activeApiPresetId;
        let preset = presets.find(p => p.id === activeId) || presets[0];

        if (!preset || !preset.url || !preset.key) throw new Error('请先在设置中配置AI API');

        const apiUrl = preset.url.replace(/\/+$/, '') + '/chat/completions';
        const resp = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${preset.key}` },
            body: JSON.stringify({
                model: preset.model,
                messages: [
                    { role: 'system', content: '你是一个内容生成器，严格按照用户要求输出内容，不要包含多余标记。' },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.85,
                max_tokens: maxTokens || 2000,
            }),
        });

        if (!resp.ok) {
            const errText = await resp.text().catch(() => '');
            throw new Error(`API请求失败 (${resp.status}): ${errText.slice(0, 100)}`);
        }

        const data = await resp.json();
        const text = data.choices?.[0]?.message?.content || '';
        if (!text) throw new Error('AI返回内容为空');
        return text;
    },

    // =========== 生图API ===========

    async callImageAPI(prompt) {
        const imgSettings = db.imgGenSettings || {};
        const imgUrl = imgSettings.url || 'https://image.pollinations.ai/prompt/';
        const imgKey = imgSettings.key || '';
        const imgModel = imgSettings.model || 'black-forest-labs/FLUX.1-schnell';

        if (imgUrl.includes('pollinations')) {
            const encoded = encodeURIComponent(prompt + ', high quality, detailed');
            const imageUrl = imgUrl.replace(/\/+$/, '') + '/' + encoded + '?width=768&height=512&nologo=true';
            try {
                const resp = await fetch(imageUrl, { method: 'GET', signal: AbortSignal.timeout(30000) });
                if (!resp.ok) throw new Error('生图失败 (' + resp.status + ')');
                const ct = resp.headers.get('content-type') || '';
                if (!ct.includes('image/')) throw new Error('接口未返回图片');
            } catch (e) {
                if (e.message.includes('生图失败')) throw e;
            }
            return imageUrl;
        } else {
            const headers = { 'Content-Type': 'application/json' };
            if (imgKey) headers['Authorization'] = 'Bearer ' + imgKey;

            const resp = await fetch(imgUrl, {
                method: 'POST', headers,
                body: JSON.stringify({ model: imgModel, prompt, image_size: '768x512', batch_size: 1 }),
                signal: AbortSignal.timeout(60000),
            });

            if (!resp.ok) {
                const text = await resp.text().catch(() => '');
                throw new Error('生图失败: ' + resp.status + ' ' + text.substring(0, 100));
            }

            const contentType = resp.headers.get('content-type') || '';
            if (contentType.includes('image/')) {
                const blob = await resp.blob();
                return URL.createObjectURL(blob);
            } else {
                const json = await resp.json();
                if (json.data && json.data[0]) {
                    let url = json.data[0].url || json.data[0].b64_json || '';
                    if (json.data[0].b64_json && !url.startsWith('http') && !url.startsWith('data:')) {
                        url = 'data:image/png;base64,' + url;
                    }
                    return url;
                }
                throw new Error('未识别的生图响应格式');
            }
        }
    },

    parseJSON(text) {
        try { return JSON.parse(text); } catch (e) { /* */ }
        const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match) { try { return JSON.parse(match[1].trim()); } catch (e) { /* */ } }
        const arrMatch = text.match(/\[[\s\S]*\]/);
        if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch (e) { /* */ } }
        throw new Error('无法解析AI返回的JSON数据');
    },

    // =========== 分享 ===========

    _shareItem: null,

    openShare(itemIndex) {
        const tabId = this._currentDetailItem?.tabId || this.activeTab;
        const data = this.cache[tabId];
        if (!data || !data[itemIndex]) return;

        this._shareItem = { tabId, index: itemIndex, data: data[itemIndex] };

        const characters = db.characters || [];
        const groups = db.groups || [];
        const listEl = document.getElementById('media-share-list');

        let html = '';
        if (characters.length === 0 && groups.length === 0) {
            html = '<div class="media-share-empty">暂无联系人<br><small>请先在QQ聊天中添加角色或群聊</small></div>';
        } else {
            if (characters.length > 0) {
                html += '<div class="media-share-group-label">私聊</div>';
                characters.forEach(c => {
                    html += `<button class="media-share-contact" data-id="${c.id}" data-type="private">
                        <span class="media-share-avatar">${c.avatar || '👤'}</span>
                        <span class="media-share-name">${this.esc(c.name || c.realName || '未命名')}</span>
                    </button>`;
                });
            }
            if (groups.length > 0) {
                html += '<div class="media-share-group-label">群聊</div>';
                groups.forEach(g => {
                    html += `<button class="media-share-contact" data-id="${g.id}" data-type="group">
                        <span class="media-share-avatar">👥</span>
                        <span class="media-share-name">${this.esc(g.name || '未命名群')}</span>
                    </button>`;
                });
            }
        }

        listEl.innerHTML = html;
        listEl.querySelectorAll('.media-share-contact').forEach(btn => {
            btn.onclick = () => this.shareToContact(btn.dataset.id, btn.dataset.type);
        });

        document.getElementById('media-share-overlay').classList.add('visible');
    },

    closeShare() {
        document.getElementById('media-share-overlay').classList.remove('visible');
        this._shareItem = null;
    },

    async shareToContact(chatId, chatType) {
        if (!this._shareItem) return;
        const { tabId, data } = this._shareItem;
        const tab = this.TABS.find(t => t.id === tabId);
        const chat = (chatType === 'private')
            ? db.characters.find(c => c.id === chatId)
            : db.groups.find(g => g.id === chatId);

        if (!chat) { showToast('联系人不存在'); return; }

        const esc = (s) => String(s || '');
        let shareText = '';
        if (tabId === 'bilibili') {
            shareText = `📺 分享一条B站视频：\n《${esc(data.title)}》\nUP主：${esc(data.author)} | 播放：${this.formatNum(data.views)}\n${esc(data.description)}`;
        } else if (tabId === 'toutiao') {
            shareText = `📋 分享一条头条新闻：\n《${esc(data.title)}》\n来源：${esc(data.source)} | ${esc(data.category)}\n${esc(data.description)}`;
        } else if (tabId === 'onlyfans') {
            shareText = `🔥 分享一位OF创作者：\n${esc(data.title)}\n分类：${esc(data.category)} | 订阅：${this.formatNum(data.subscribers)}\n${esc(data.description)}`;
        }

        if (this._fullText) {
            const summary = this._fullText.substring(0, 150) + (this._fullText.length > 150 ? '...' : '');
            shareText += `\n\n📖 AI解读：${summary}`;
        }

        const myName = (chatType === 'private') ? (chat.myName || '我') : (chat.me?.nickname || '我');
        const messageContent = `[${myName}分享了一条媒体内容：\n${shareText}]`;

        const message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            role: 'user',
            content: messageContent,
            parts: [{ type: 'text', text: messageContent }],
            timestamp: Date.now(),
        };
        if (chatType === 'group') message.senderId = 'user_me';

        chat.history = chat.history || [];
        chat.history.push(message);
        await saveData();

        this.closeShare();

        if (typeof openChatRoom === 'function') {
            openChatRoom(chatId, chatType);
        } else {
            switchScreen('home-screen');
        }

        showToast(`已分享给 ${chat.name || chat.realName || '联系人'}`);
    },

    esc(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    formatNum(n) {
        n = Number(n) || 0;
        return n >= 10000 ? (n / 10000).toFixed(1) + '万' : n.toLocaleString();
    },
});

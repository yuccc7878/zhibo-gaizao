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
            prompt: `生成6条B站视频模拟数据，每条JSON包含：title, author, views, danmaku, likes, duration(秒), description。要求：
- 标题要多样化，不要只做"震惊体"，可以包含：整活/测评/Vlog/教程/鬼畜/纪录片/剧情/杂谈/挑战/科普等
- UP主名字要有创意（可玩梗、谐音、风格化）
- 播放量、弹幕、点赞要合理（几万到几百万不等）
- 描述要勾人，像B站缩略图下方那行简介文案
- 内容涵盖：科技数码、游戏电竞、美食探店、生活记录、美妆穿搭、知识科普、动漫二次元、音乐翻唱、鬼畜搞笑、影视解说、户外冒险、手工制作等，每次随机挑选不同类型，不要每次都出同样的分类
请直接返回JSON数组，不要包含任何其他文字或markdown标记。字段名用英文双引号。`,
            detailPrompt: (item) => `你是一个很会整活的B站UP主，这是你刚发的视频信息：

标题：《${item.title}》
播放量：${item.views}  👀 弹幕：${item.danmaku}
简介：${item.description}

请你以UP主的身份，用第一人称写一篇"制作感言/幕后故事"（300-500字），分享这个视频从策划到剪辑的整个过程。要求：
- 开头用一句金句或梗总结视频
- 中间写制作过程：灵感来源、拍摄花絮、剪辑时的痛苦或乐子、遇到的意外状况
- 结尾可以求三连、整活预告、或者煽情一下
- 语言风格：真实UP主语感，带语气词、口语化、不端着
- 不要用任何markdown标记，纯文本`,
            imgPrompt: (item) => `anime illustration style, bilibili video cover for "${item.title}" by ${item.author}, dynamic composition, vibrant colors, eye-catching thumbnail style, high detail, 16:9`,
        },
        {
            id: 'toutiao',
            label: '今日头条',
            icon: '📋',
            color: '#ff0000',
            prompt: `生成6条今日头条热文模拟数据，每条JSON包含：title, source, comments, likes, category, description。要求：
- 标题要多样化：可以是重磅突发、深度调查、民生故事、科技爆料、国际局势、财经分析、娱乐八卦、体育赛事、健康养生、奇闻趣事等，不要只重复"刚刚！""突发"套路
- 来源覆盖：主流媒体、地方媒体、自媒体大V、垂直领域KOL，随机搭配
- 评论和点赞量要有差异（几百到几十万），体现热度高低
- 分类从：社会/科技/娱乐/财经/体育/国际/军事/健康/教育/三农 中随机选，每次尽量覆盖不同组合
- 描述要有信息量，像头条列表页那行灰色摘要文案的风格
请直接返回JSON数组，不要包含任何其他文字或markdown标记。字段名用英文双引号。`,
            detailPrompt: (item) => `你是一线调查记者，写一篇关于这条新闻的深度报道（350-550字）：

标题：${item.title}
来源：${item.source}  |  分类：${item.category}
摘要：${item.description}

写法要求（打破常规新闻模板）：
- 选一个独特切入口，不要平铺直叙"近日…据了解…"
- 可以写：当事人视角、现场细节、数据深挖、行业内幕、历史对比、争议焦点
- 语言不做作，避免套话，像深度报道特稿的感觉
- 结尾可以留一个开放式问题或展望
- 不要用markdown标记，纯文本输出`,
            imgPrompt: (item) => `news photography style, ${item.title}, ${item.category}, cinematic lighting, photojournalism, realistic scene, high quality, 4k detail, press photo composition`,
        },
        {
            id: 'onlyfans',
            label: 'OnlyFans',
            icon: '🔥',
            color: '#00aff0',
            prompt: `生成6条OnlyFans创作者推荐模拟数据，每条JSON包含：title（英文艺名，每次不同）, description（中文内容介绍）, subscribers（订阅数）, posts（帖子数）, likes（平均点赞数，纯数字）, price（月订阅美元价格，数字，范围3-25美元）, category（分类）。要求：
- 创作者人设要多样且真实：涵盖成人内容创作者、Coser、模特、健身教练、ASMR主播、成人演员、网黄情侣、足控、Domi/Sub、变装皇后、涩图画师、成人写手等，每次随机组合
- description用中文写，描述创作者的内容风格和特色，要真实还原OnlyFans上的口吻：撩人、直接、有挑逗性、强调"独家内容""一对一互动""定制内容""露骨""无遮"等，每条风格不同
- category从：Cosplay/Adult/NSFW/Fitness/ASMR/Modeling/SexPositive/Lingerie/BDSM/Fetish/Feet/AdultArt 中随机选
- title用英文艺名，要有OnlyFans风格（如：LunaVixxen、DaddyJay、Sweet_Emi、RogueCola等）
- subscribers从几百到几十万
- 每条内容的风格、尺度、人设要有明显差异，不要同质化
请直接返回JSON数组，不要包含任何其他文字或markdown标记。字段名用英文双引号。`,
            detailPrompt: (item) => `你是OnlyFans平台的内容策划编辑，用中文为这位创作者撰写一篇"创作者推荐/订阅指南"（300-500字）：

艺名：${item.title}
分类：${item.category}
订阅数：${item.subscribers}  |  月费：$${item.price}
简介：${item.description}

写作要求（模仿真实OF推荐文案风格）：
- 开头用一句诱人的hook描述创作者的核心魅力/特色
- 介绍ta提供的内容类型：日常照片、独家视频、定制内容、一对一聊天、PPV内容等
- 描述ta的互动风格（回复速度、定制接受度、粉丝黏性等）
- 强调订阅价值：为什么值得花这个钱，有什么独家福利
- 语言风格：有煽动力、带成人感、像真人推荐而不是机器写的简介
- 不要用markdown标记，纯文本输出`,
            imgPrompt: (item) => `professional OnlyFans style portrait, ${item.title}, ${item.category} creator, seductive elegant pose, soft cinematic lighting, high quality glamour photography, studio lighting, sharp focus, bokeh background, attractive aesthetic`,
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
                    <span>💖 ${formatNum(item.likes || 0)}</span>
                    <span>💲${item.price || '?'}/月</span>
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
                : `<div class="media-detail-meta">${esc(item.category || '')} · 👥 ${this.formatNum(item.subscribers)} 订阅 · 💖 ${this.formatNum(item.likes || 0)} · 💲${item.price || '?'}/月</div>`;

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
        try {
            await Engine.services.aiChat({
                system: '你是一个有创意的写作者，根据用户要求自由发挥，语言生动不套路。纯文本输出，不要使用markdown。',
                messages: [{ role: 'user', content: prompt }],
                options: { temperature: 0.9, maxTokens: 2000 },
                onToken: (delta) => {
                    if (this.detailAborted) return;
                    this._fullText += delta;
                    this.appendDetailText(delta);
                },
            });
        } catch (err) {
            if (err.name === 'AiServiceError' && err.code === 'ABORTED') {
                // 用户取消，忽略
            } else if (!this.detailAborted) {
                this.appendDetailText('\n\n⚠️ 内容生成失败：' + err.message);
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
        return Engine.services.aiChat({
            system: '你是一个有创意的写作者，根据用户要求自由发挥，语言生动。直接返回数据，不要有多余说明。',
            messages: [{ role: 'user', content: prompt }],
            options: { temperature: 0.9, maxTokens: maxTokens || 2500 },
        });
    },

    // =========== 生图API ===========

    async callImageAPI(prompt) {
        return Engine.services.aiGenerateImage(prompt + ', high quality, detailed', { imageSize: '768x512' });
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
                html += '<div class="media-share-group-label">📱 私聊</div>';
                characters.forEach(c => {
                    const av = c.avatar;
                    const avatarHtml = av && av.startsWith('http')
                        ? `<img src="${this.esc(av)}" class="media-share-avatar-img" alt="">`
                        : (this.esc(av) || '👤');
                    html += `<button class="media-share-contact" data-id="${c.id}" data-type="private">
                        <span class="media-share-avatar">${avatarHtml}</span>
                        <span class="media-share-name">${this.esc(c.remarkName || c.realName || '未命名')}</span>
                    </button>`;
                });
            }
            if (groups.length > 0) {
                html += '<div class="media-share-group-label">👥 群聊</div>';
                groups.forEach(g => {
                    const av = g.avatar;
                    const avatarHtml = av && av.startsWith('http')
                        ? `<img src="${this.esc(av)}" class="media-share-avatar-img" alt="">`
                        : (this.esc(av) || '👥');
                    html += `<button class="media-share-contact" data-id="${g.id}" data-type="group">
                        <span class="media-share-avatar">${avatarHtml}</span>
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

        // 安全转义文本（防 HTML 注入）
        const s = (v) => String(v ?? '');

        let shareText = '';
        if (tabId === 'bilibili') {
            shareText = `📺 分享B站视频：\n《${s(data.title)}》\nUP主：${s(data.author)} | ▶ ${this.formatNum(data.views)}\n${s(data.description)}`;
        } else if (tabId === 'toutiao') {
            shareText = `📋 分享头条新闻：\n《${s(data.title)}》\n来源：${s(data.source)} | ${s(data.category)}\n${s(data.description)}`;
        } else if (tabId === 'onlyfans') {
            shareText = `🔥 分享OF创作者：\n${s(data.title)}\n分类：${s(data.category)} · 订阅：${this.formatNum(data.subscribers)} · 💲${data.price || '?'}/月\n${s(data.description)}`;
        }

        if (this._fullText) {
            const summary = this._fullText.substring(0, 150) + (this._fullText.length > 150 ? '…' : '');
            shareText += `\n\n📖 ${summary}`;
        }

        const myName = (chatType === 'private') ? (chat.myName || '我') : (chat.me?.nickname || '我');
        // 使用 .分享内容：格式，让聊天框以纯文本显示，避免 [] 特殊匹配导致的解析问题
        const messageContent = `${myName}分享了媒体内容：\n${shareText}`;

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

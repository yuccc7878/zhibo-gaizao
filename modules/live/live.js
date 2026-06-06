/* ========================================
   Module: Live (直播)
   ======================================== */

Engine.register({
    id: 'live',
    name: '直播',
    icon: '📺',
    screen: 'live-screen',
    order: 2,

    LEVELS: [
        { id: 1, label: '普通闲聊', desc: '轻松聊天互动', color: '#4CAF50' },
        { id: 2, label: '才艺展示', desc: '唱歌、跳舞、表演', color: '#2196F3' },
        { id: 3, label: '户外挑战', desc: '刺激有趣的挑战', color: '#FF9800' },
        { id: 4, label: '福利姬', desc: '性感撩人的视觉盛宴', color: '#9C27B0' },
        { id: 5, label: '双人行', desc: '亲密互动的双人时光', color: '#E91E63' },
    ],

    SCENES: [
        { id: 'bedroom', label: '🛏️ 卧室', desc: '温馨私密空间' },
        { id: 'bathroom', label: '🛁 浴室', desc: '水汽氤氲' },
        { id: 'living', label: '🛋️ 客厅', desc: '宽敞舒适' },
        { id: 'kitchen', label: '🍳 厨房', desc: '烟火气息' },
        { id: 'outdoor', label: '🌿 户外', desc: '自然风光' },
        { id: 'car', label: '🚗 车内', desc: '封闭刺激' },
        { id: 'hotel', label: '🏨 酒店', desc: '陌生环境' },
        { id: 'studio', label: '🎬 舞蹈室', desc: '镜面环绕' },
    ],

    // 等级对应的金币倍率
    LEVEL_MULTIPLIER: { 1: 1.0, 2: 1.2, 3: 1.3, 4: 1.4, 5: 1.5 },

    state: { level: null, scene: null, props: [], step: 0 },
    isStreaming: false,  // 是否正在直播中

    // 直播统计数据
    streamStats: {
        startTime: 0,       // 开播时间
        peakViewers: 0,     // 峰值观众
        totalViewers: 0,    // 累计观众（用于平均）
        sampleCount: 0,     // 采样次数
        danmakuSent: 0,     // 主播发送弹幕数
        storyGenerated: 0,  // 生成剧情次数
    },

    // ─── 主播选择 ───
    hostChar: null,             // 选中的主播角色（QQ好友或AI生成）
    hostIsAiGenerated: false,   // 是否为AI生成的主播
    tipTotal: 0,                // 本场直播累计打赏
    currentTab: 'self',         // 当前分页: self | hosts

    AVATAR_POOL: [
        'https://i.postimg.cc/Y96LPskq/o-o-2.jpg',
        'https://i.postimg.cc/GtbTnhxP/o-o-1.jpg',
        'https://i.postimg.cc/fTLCngk1/image.jpg',
    ],

    init() {
        const screen = document.getElementById(this.screen);
        screen.innerHTML = `
            <div class="live-step-overlay" id="live-step-overlay">
                <div class="live-step-container">
                    <div class="live-tabs">
                        <span class="live-tab active" data-tab="self">🙋 自己开播</span>
                        <span class="live-tab" data-tab="hosts">🎤 主播选择</span>
                    </div>
                    <div class="live-step-box" id="live-step-box">
                        <div class="live-tab-body" id="live-tab-body"></div>
                    </div>
                </div>
            </div>
            <div class="live-stream-page" id="live-stream-page">
                <div class="live-stream-header">
                    <button class="live-back-home-btn" id="live-back-home-btn" title="返回桌面">‹</button>
                    <div class="live-stream-avatar" id="live-avatar">👩</div>
                    <div class="live-stream-info">
                        <div class="live-stream-name" id="live-stream-title">直播中</div>
                        <div class="live-stream-tags" id="live-stream-tags"></div>
                    </div>
                    <div class="live-viewer-count"><div class="live-viewer-dot"></div><span id="live-viewers">0</span></div>
                    <button class="live-imggen-btn" id="live-imggen-btn" title="生成直播画面">🎨</button>
                    <button class="live-end-btn" id="live-end-btn">结束</button>
                </div>
                <div class="live-split-body">
                    <div class="live-story-area" id="live-story-area">
                        <div class="live-story-label">📖 剧情</div>
                    </div>
                    <div class="live-danmaku-area" id="live-danmaku-area">
                        <div class="live-danmaku-label">💬 弹幕</div>
                    </div>
                </div>
                <div class="live-stream-input-bar">
                    <button class="live-tip-btn" id="live-tip-btn">🎁</button>
                    <input type="text" id="live-input" placeholder="发送弹幕...">
                    <button id="live-send-btn">发送</button>
                </div>
            </div>
            <div class="live-reward-overlay" id="live-reward-overlay">
                <div class="live-reward-box" id="live-reward-box"></div>
            </div>
            <div class="live-tip-overlay" id="live-tip-overlay">
                <div class="live-tip-box" id="live-tip-box">
                    <div class="live-tip-title">🎁 打赏主播</div>
                    <div class="live-tip-amounts" id="live-tip-amounts">
                        <button class="live-tip-amount" data-amount="10">10 🪙</button>
                        <button class="live-tip-amount" data-amount="50">50 🪙</button>
                        <button class="live-tip-amount" data-amount="100">100 🪙</button>
                        <button class="live-tip-amount" data-amount="500">500 🪙</button>
                    </div>
                    <div class="live-tip-custom">
                        <input type="number" id="live-tip-custom-input" placeholder="自定义金额" min="1">
                    </div>
                    <div class="live-tip-balance" id="live-tip-balance">🪙 当前余额: 0</div>
                    <div class="live-tip-btns">
                        <button class="live-tip-cancel-btn" id="live-tip-cancel">取消</button>
                        <button class="live-tip-confirm" id="live-tip-confirm">确认打赏</button>
                    </div>
                </div>
            </div>`;
        // 绑定打赏弹窗事件
        this._bindTipEvents();
    },

    /** 绑定打赏弹窗事件 */
    _bindTipEvents() {
        const self = this;
        // 金额选择
        document.querySelectorAll('.live-tip-amount').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.live-tip-amount').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                document.getElementById('live-tip-custom-input').value = '';
            };
        });
        // 自定义金额输入时取消预设选中
        document.getElementById('live-tip-custom-input').oninput = function() {
            if (this.value) {
                document.querySelectorAll('.live-tip-amount').forEach(b => b.classList.remove('selected'));
            }
        };
        // 确认打赏
        document.getElementById('live-tip-confirm').onclick = () => {
            let amount = 0;
            const selected = document.querySelector('.live-tip-amount.selected');
            if (selected) {
                amount = parseInt(selected.dataset.amount);
            } else {
                amount = parseInt(document.getElementById('live-tip-custom-input').value);
            }
            if (amount > 0) self.sendTip(amount);
            else showToast('请选择或输入打赏金额');
        };
        // 取消
        document.getElementById('live-tip-cancel').onclick = () => {
            document.getElementById('live-tip-overlay').classList.remove('visible');
        };
        // 点击遮罩关闭
        document.getElementById('live-tip-overlay').onclick = (e) => {
            if (e.target === e.currentTarget) {
                document.getElementById('live-tip-overlay').classList.remove('visible');
            }
        };
    },

    open() {
        switchScreen(this.screen);
        if (this.isStreaming) {
            // 直播中，直接显示直播页面，不重置内容
            document.getElementById('live-step-overlay').classList.remove('visible');
            document.getElementById('live-stream-page').classList.add('active');
            this._bindStreamEvents();
        } else {
            // 未在直播，显示分页界面
            this.hostChar = null;
            this.hostIsAiGenerated = false;
            this.tipTotal = 0;
            this.currentTab = 'self';
            this.state = { level: null, scene: null, props: [], step: 0 };
            this.showSelfTab();
        }
    },

    /* ==========================================
       分页系统
       ========================================== */

    /** Tab 1: 自己开播 */
    showSelfTab() {
        this.currentTab = 'self';
        this._setupTabs();
        this.state = { level: null, scene: null, props: [], step: 0 };
        this.showStep1();
    },

    /** Tab 2: 主播选择 */
    showHostsTab() {
        this.currentTab = 'hosts';
        this._setupTabs();
        this._renderHostGrid();
    },

    /** 绑定 tab 点击事件 */
    _setupTabs() {
        const tabs = document.querySelectorAll('.live-tab');
        tabs.forEach(tab => {
            tab.onclick = () => {
                if (tab.dataset.tab === this.currentTab) return;
                if (this.state.step && this.state.step > 0 && tab.dataset.tab === 'hosts') {
                    // 已在流程中，切换到主播选择需要确认
                    if (!confirm('当前开播设置将丢失，确定切换吗？')) return;
                }
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                if (tab.dataset.tab === 'self') this.showSelfTab();
                else if (tab.dataset.tab === 'hosts') this.showHostsTab();
            };
        });
    },

    /** 渲染主播选择网格 */
    _renderHostGrid() {
        const body = document.getElementById('live-tab-body');
        if (!body) return;

        const friends = db.characters || [];
        let html = '<div class="live-host-grid">';
        for (let i = 0; i < friends.length; i++) {
            const c = friends[i];
            html += '<div class="live-host-card" data-idx="' + i + '">'
                + '<img class="live-host-avatar" src="' + c.avatar + '" alt="' + c.remarkName + '">'
                + '<div class="live-host-name">' + c.remarkName + '</div>'
                + '</div>';
        }
        // AI 随机生成按钮
        const aiLabel = friends.length === 0 ? '暂无好友，点击AI生成' : '🎲 AI随机生成';
        html += '<div class="live-host-card" id="live-host-ai-btn">'
            + '<div class="live-host-ai-icon">🎲</div>'
            + '<div class="live-host-name">' + aiLabel + '</div>'
            + '</div>';
        html += '</div>';

        if (friends.length === 0) {
            body.innerHTML = '<div style="text-align:center;padding:16px 0;font-size:13px;color:#999;">暂无QQ好友</div>' + html;
        } else {
            body.innerHTML = html;
        }

        // 绑定好友卡片事件
        body.querySelectorAll('.live-host-card:not(#live-host-ai-btn)').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.dataset.idx);
                const char = friends[idx];
                if (char) this._showHostDetail(char, false);
            });
        });

        // AI 生成按钮
        document.getElementById('live-host-ai-btn')?.addEventListener('click', () => {
            this._generateAiHost();
        });
    },

    /** 展示主播详情 */
    _showHostDetail(char, isAiGenerated) {
        const body = document.getElementById('live-tab-body');
        if (!body) return;
        const persona = char.persona ? char.persona.replace(/\n/g, '<br>') : '暂无介绍';
        body.innerHTML = '<div class="live-host-detail">'
            + '<img class="live-host-detail-avatar" src="' + char.avatar + '">'
            + '<div class="live-host-detail-name">' + (char.remarkName || char.realName || char.name) + '</div>'
            + '<div class="live-host-detail-persona">' + persona + '</div>'
            + '<div class="live-host-detail-btns">'
            + '<button class="live-back-btn" id="live-host-detail-back">返回</button>'
            + '<button class="live-next-btn" id="live-host-invite-btn">邀请开播</button>'
            + '</div></div>';

        document.getElementById('live-host-detail-back').onclick = () => this._renderHostGrid();
        document.getElementById('live-host-invite-btn').onclick = () => {
            this.hostChar = char;
            this.hostIsAiGenerated = isAiGenerated;
            // 切换到自己开播 tab 并开始流程
            document.querySelectorAll('.live-tab').forEach(t => t.classList.remove('active'));
            document.querySelector('.live-tab[data-tab="self"]').classList.add('active');
            this.currentTab = 'self';
            this.state = { level: null, scene: null, props: [], step: 0 };
            this.showStep1();
        };
    },

    /** AI 生成虚拟主播 */
    async _generateAiHost() {
        const body = document.getElementById('live-tab-body');
        if (body) body.innerHTML = '<div class="gacha-loading"><div class="gacha-loading-dots"><span></span><span></span><span></span></div>AI 生成主播中...</div>';

        try {
            const prompt = '请生成一个虚拟角色作为直播主播，要求：\n'
                + '- 随机性别（男性或女性皆可）\n'
                + '- 有创意、有吸引力的中文名字\n'
                + '- 有鲜明的性格特点（2-3句话描述）\n'
                + '- 有简单的背景故事（1-2句话）\n\n'
                + '请严格按以下格式输出（不要输出其他内容）：\n'
                + '名字：xxx\n'
                + '性别：男/女\n'
                + '性格：xxx\n'
                + '背景：xxx\n\n'
                + '要求：名字要有创意。不要使用Markdown格式。';

            const fullText = await Engine.services.aiChat({
                system: '你是一个创意角色生成器。',
                messages: [{ role: 'user', content: prompt }],
                options: { temperature: 1.0, maxTokens: 300 },
            });

            if (!fullText) throw new Error('AI 返回内容为空');

            const name = this._extractField(fullText, '名字') || '神秘主播';
            const gender = this._extractField(fullText, '性别') || '女';
            const personality = this._extractField(fullText, '性格') || '性格开朗活泼';
            const background = this._extractField(fullText, '背景') || '一个神秘的直播主播';
            const avatar = this._pickAvatar();

            const hostChar = {
                id: 'livehost_' + Date.now(),
                realName: name,
                remarkName: name,
                name: name,
                persona: personality + '\n背景：' + background,
                avatar: avatar,
                gender: gender,
            };

            this._showHostDetail(hostChar, true);
        } catch (err) {
            console.error('[Live] AI host generation failed:', err);
            if (body) {
                body.innerHTML = '<div style="text-align:center;color:#ff6b6b;padding:30px;">生成失败: ' + err.message + '</div>'
                    + '<button class="live-host-back-btn" id="live-host-retry-btn">重试</button>';
                document.getElementById('live-host-retry-btn').onclick = () => this._renderHostGrid();
            }
        }
    },

    _extractField(text, fieldName) {
        const regex = new RegExp(fieldName + '[：:]\\s*([\\s\\S]*?)(?=\\n(?:名字|性别|性格|背景)[：:]|$)', 'i');
        const match = text.match(regex);
        return match ? match[1].trim() : '';
    },

    _pickAvatar() {
        return this.AVATAR_POOL[Math.floor(Math.random() * this.AVATAR_POOL.length)];
    },

    /* ==========================================
       打赏功能
       ========================================== */

    /** 显示打赏弹窗 */
    showTipModal() {
        const overlay = document.getElementById('live-tip-overlay');
        const balanceEl = document.getElementById('live-tip-balance');
        if (balanceEl) balanceEl.textContent = '🪙 当前余额: ' + (db.money || 0);
        const amounts = overlay.querySelectorAll('.live-tip-amount');
        amounts.forEach(a => a.classList.remove('selected'));
        document.getElementById('live-tip-custom-input').value = '';
        overlay.classList.add('visible');
    },

    /** 处理打赏 */
    sendTip(amount) {
        const balance = db.money || 0;
        if (amount < 1) { showToast('请输入有效金额'); return; }
        if (amount > balance) { showToast('金币不足！当前余额: ' + balance); return; }

        db.money = balance - amount;
        saveData();
        this.tipTotal += amount;

        // 弹幕广播
        const name = this.hostChar ? (this.hostChar.remarkName || this.hostChar.realName || this.hostChar.name) : '主播';
        this.appendDanmaku('💰 系统', '打赏了 ' + name + ' ' + amount + ' 🪙！');

        document.getElementById('live-tip-overlay').classList.remove('visible');
        showToast('打赏 ' + amount + ' 🪙 成功！');
    },

    /** AI 主播加为好友 */
    async addStreamerAsFriend() {
        const char = this.hostChar;
        if (!char) return;
        if (db.characters.some(c => c.realName === (char.realName || char.name))) {
            showToast('已经有一个叫"' + (char.realName || char.name) + '"的好友了');
            return;
        }
        const newId = 'livehost_' + Date.now();
        try {
            db.characters.push({
                id: newId,
                realName: char.realName || char.name || '主播',
                remarkName: char.remarkName || char.realName || char.name || '主播',
                persona: char.persona || '',
                avatar: char.avatar || this._pickAvatar(),
                myName: '我',
                myPersona: '',
                myAvatar: 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg',
                theme: 'white_pink',
                maxMemory: 10,
                chatBg: '',
                history: [],
                isPinned: false,
                status: '在线',
                worldBookIds: [],
                useCustomBubbleCss: false,
                customBubbleCss: '',
                aiImgGen: false
            });
            await saveData();
            if (typeof renderChatList === 'function') renderChatList();
            showToast((char.realName || char.name) + ' 已添加为好友！');
        } catch (e) {
            console.error('[Live] add friend failed:', e);
            db.characters = db.characters.filter(c => c.id !== newId);
            showToast('添加好友失败，请重试');
        }
    },

    showStep1() {
        this.state.step = 1;
        const body = document.getElementById('live-tab-body');
        const overlay = document.getElementById('live-step-overlay');
        body.innerHTML = `
            <div class="live-step-title">选择直播等级</div>
            <div class="live-option-list">
                ${this.LEVELS.map(lv => {
                    if (!lv.label) return `<div class="live-option disabled" data-id="${lv.id}" style="border-color:${lv.color}40;"><span style="color:#ccc;">等级 ${lv.id}</span><div class="live-option-desc">待解锁</div></div>`;
                    return `<div class="live-option" data-id="${lv.id}" style="border-color:${lv.color}40;"><span>${lv.label}</span><div class="live-option-desc">${lv.desc}</div></div>`;
                }).join('')}
            </div>
            <div class="live-step-btns"><button class="live-back-btn" id="live-step1-cancel">取消</button></div>`;
        overlay.classList.add('visible');
        document.getElementById('live-step1-cancel').addEventListener('click', () => switchScreen('home-screen'));
        body.querySelectorAll('.live-option:not(.disabled)').forEach(opt => {
            opt.addEventListener('click', () => {
                this.state.level = this.LEVELS.find(l => l.id === parseInt(opt.dataset.id));
                this.showStep2();
            });
        });
    },

    showStep2() {
        this.state.step = 2;
        const body = document.getElementById('live-tab-body');
        body.innerHTML = `
            <div class="live-step-title">选择直播场景</div>
            <div class="live-option-list">
                ${this.SCENES.map(sc => `<div class="live-option" data-id="${sc.id}"><span>${sc.label}</span><div class="live-option-desc">${sc.desc}</div></div>`).join('')}
            </div>
            <div class="live-step-btns"><button class="live-back-btn" id="live-step2-back">上一步</button></div>`;
        document.getElementById('live-step2-back').addEventListener('click', () => this.showStep1());
        body.querySelectorAll('.live-option').forEach(opt => {
            opt.addEventListener('click', () => {
                this.state.scene = this.SCENES.find(s => s.id === opt.dataset.id);
                this.showStep3();
            });
        });
    },

    showStep3() {
        this.state.step = 3;
        const body = document.getElementById('live-tab-body');
        const shop = Engine.getModule('shop');
        const availableProps = shop ? shop.getOwnedProps() : [];

        if (availableProps.length === 0) {
            body.innerHTML = `
                <div class="live-step-title">选择直播道具</div>
                <div style="text-align:center;color:#999;padding:20px 0;font-size:14px;">还没有道具哦~<br>先去商店购买吧！</div>
                <div class="live-step-btns">
                    <button class="live-back-btn" id="live-step3-back-empty">上一步</button>
                    <button class="live-next-btn" id="live-step3-skip">跳过，直接开始</button>
                </div>`;
            document.getElementById('live-step3-back-empty').addEventListener('click', () => this.showStep2());
            document.getElementById('live-step3-skip').addEventListener('click', () => this.startStream());
            return;
        }

        this.state.props = [];
        body.innerHTML = `
            <div class="live-step-title">选择直播道具（可多选）</div>
            <div class="live-props-grid">
                ${availableProps.map(item => {
                    const emojiMatch = item.label.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)/u);
                    const icon = emojiMatch ? emojiMatch[0] : '📦';
                    const name = item.label.slice(emojiMatch ? emojiMatch[0].length : 0);
                    return `<div class="live-prop" data-id="${item.id}"><span class="live-prop-icon">${icon}</span><span>${name}</span></div>`;
                }).join('')}
            </div>
            <div class="live-step-btns">
                <button class="live-back-btn" id="live-step3-back">上一步</button>
                <button class="live-start-btn" id="live-step3-start">开始直播</button>
            </div>`;
        document.getElementById('live-step3-back').addEventListener('click', () => this.showStep2());
        document.getElementById('live-step3-start').addEventListener('click', () => this.startStream());
        body.querySelectorAll('.live-prop').forEach(el => {
            el.addEventListener('click', () => {
                el.classList.toggle('selected');
                const id = el.dataset.id;
                if (el.classList.contains('selected')) this.state.props.push(id);
                else this.state.props = this.state.props.filter(p => p !== id);
            });
        });
    },

    async startStream() {
        document.getElementById('live-step-overlay').classList.remove('visible');
        const streamPage = document.getElementById('live-stream-page');
        streamPage.classList.add('active');
        streamPage.style.backgroundImage = '';
        streamPage.style.background = '#1a1a2e';

        this.isStreaming = true;
        this.tipTotal = 0;

        // 区分模式：主播 vs 观众
        this.isViewerMode = !!this.hostChar;

        const { level, scene } = this.state;
        // 打赏按钮：观众模式显示，主播模式隐藏
        document.getElementById('live-tip-btn').style.display = this.isViewerMode ? '' : 'none';
        // 设置主播头像和标题
        const avatarEl = document.getElementById('live-avatar');
        if (this.isViewerMode) {
            const img = this.hostChar.avatar;
            avatarEl.textContent = '';
            avatarEl.style.backgroundImage = 'url(' + img + ')';
            avatarEl.style.backgroundSize = 'cover';
            avatarEl.style.backgroundPosition = 'center';
            const hostName = this.hostChar.remarkName || this.hostChar.realName || this.hostChar.name || '主播';
            document.getElementById('live-stream-title').textContent = hostName + ' · ' + level.label + ' · ' + scene.label;
        } else {
            avatarEl.textContent = '👩';
            avatarEl.style.backgroundImage = '';
            document.getElementById('live-stream-title').textContent = level.label + ' · ' + scene.label;
        }
        const tagsEl = document.getElementById('live-stream-tags');
        tagsEl.innerHTML = `<span class="live-stream-tag hot">🔥 直播中</span>`;
        const shop = Engine.getModule('shop');
        if (shop && this.state.props.length > 0) {
            const allItems = shop.getAllItems();
            const propItems = this.state.props.map(id => allItems.find(d => d.id === id)).filter(Boolean);
            propItems.slice(0, 2).forEach(p => {
                const name = p.label.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)/u, '');
                tagsEl.innerHTML += `<span class="live-stream-tag">${name}</span>`;
            });
        }

        document.getElementById('live-story-area').innerHTML = '<div class="live-story-label">📖 剧情</div>';
        document.getElementById('live-danmaku-area').innerHTML = '<div class="live-danmaku-label">💬 弹幕</div>';

        // 初始化统计数据
        let viewers = Math.floor(Math.random() * 50) + 10;
        this.streamStats = {
            startTime: Date.now(),
            peakViewers: viewers,
            totalViewers: viewers,
            sampleCount: 1,
            danmakuSent: 0,
            storyGenerated: 0,
        };
        document.getElementById('live-viewers').textContent = viewers;

        streamPage._viewerInterval = setInterval(() => {
            viewers += Math.floor(Math.random() * 10) - 3;
            if (viewers < 5) viewers = 5;
            document.getElementById('live-viewers').textContent = viewers;
            if (viewers > this.streamStats.peakViewers) this.streamStats.peakViewers = viewers;
            this.streamStats.totalViewers += viewers;
            this.streamStats.sampleCount++;
        }, 3000);

        this._bindStreamEvents();
        await this.generateStory();
    },

    /** 绑定直播页面按钮事件（可重复调用，不重置内容） */
    _bindStreamEvents() {
        const input = document.getElementById('live-input');
        const sendBtn = document.getElementById('live-send-btn');
        document.getElementById('live-end-btn').onclick = () => this.endStream();
        document.getElementById('live-imggen-btn').onclick = () => this.generateLiveImage();
        document.getElementById('live-back-home-btn').onclick = () => switchScreen('home-screen');
        document.getElementById('live-tip-btn').onclick = () => this.showTipModal();
        sendBtn.onclick = async () => {
            const text = input.value.trim();
            if (!text) return;
            this.appendDanmaku('主播', text);
            input.value = '';
            this.streamStats.danmakuSent++;
            await this.generateStory(text);
        };
        input.onkeydown = (e) => { if (e.key === 'Enter') sendBtn.click(); };
    },

    appendStory(text) {
        const area = document.getElementById('live-story-area');
        const div = document.createElement('div');
        div.className = 'live-story-text';
        div.textContent = text;
        area.appendChild(div);
        area.scrollTop = area.scrollHeight;
    },

    showLoading(parentId, msg) {
        const area = document.getElementById(parentId);
        const div = document.createElement('div');
        div.className = 'live-loading-bar';
        div.id = parentId + '-loading';
        div.innerHTML = `<div class="live-loading-dots"><span></span><span></span><span></span></div> ${msg}`;
        area.appendChild(div);
        area.scrollTop = area.scrollHeight;
    },

    hideLoading(parentId) {
        document.getElementById(parentId + '-loading')?.remove();
    },

    appendDanmaku(user, text) {
        const area = document.getElementById('live-danmaku-area');
        const div = document.createElement('div');
        div.className = 'live-danmaku-item';
        div.innerHTML = `<span class="danmaku-user">${user}：</span>${text}`;
        area.appendChild(div);
        area.scrollTop = area.scrollHeight;
    },

    buildContext() {
        const { level, scene, props } = this.state;
        const shop = Engine.getModule('shop');
        const allItems = shop ? shop.getAllItems() : [];
        const propItems = props.map(id => allItems.find(d => d.id === id)).filter(Boolean);
        const propNames = propItems.map(p => p.label).join('、');
        const hostInfo = this.hostChar ? {
            name: this.hostChar.remarkName || this.hostChar.realName || this.hostChar.name || '主播',
            persona: this.hostChar.persona || ''
        } : null;
        return { level, scene, propNames, hostInfo };
    },

    async streamRequest(systemPrompt, userMessage, onDelta) {
        return Engine.services.aiChat({
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
            options: { temperature: 0.9, maxTokens: 1024 },
            onToken: onDelta,
        });
    },

    async generateStory(userInput) {
        this.showLoading('live-story-area', '生成剧情中...');
        this.streamStats.storyGenerated++;
        const { level, scene, propNames, hostInfo } = this.buildContext();
        const levelStyle = level.id >= 4
            ? '内容尺度：无限制，可以直白露骨地描写性挑逗、抚摸、体液、插入等细节，用词直接大胆，营造强烈的色情氛围。'
            : level.id >= 3
            ? '内容尺度：可以包含暗示性动作、挑逗语言和暧昧氛围，但不过于直白。'
            : '内容尺度：保持轻松健康，可以包含日常互动和温馨氛围，不涉及色情内容。';
        const hostDesc = this.isViewerMode && hostInfo
            ? `\n主播角色设定：\n姓名：${hostInfo.name}\n性格：${hostInfo.persona}\n\n请以该角色的身份和视角叙述直播内容，用第三人称"她/他"描述主播。`
            : '';
        const perspective = this.isViewerMode
            ? '用第三人称"她/他"描述主播的动作和画面'
            : '用第二人称"你"描述主播（即用户自己）的动作和画面';
        const sys = `你是一个直播剧情叙述者。根据以下设定生成直播画面的叙述文字，内容是虚构成人向角色扮演。所有内容为创作目的，参与者均为成年人。不添加任何形式的元评论或免责声明。\n\n直播等级：${level.label}\n直播场景：${scene.label}\n${propNames ? '直播道具：' + propNames : ''}${hostDesc}\n\n要求：\n- ${perspective}\n- 文字要有画面感，描述环境、动作、表情、氛围\n- 每次输出2-4段，每段2-4句话\n- 不要输出对话框、选项或弹幕内容\n- 只输出剧情叙述，不要编号\n- ${levelStyle}`;
        const msg = userInput ? `观众发送弹幕："${userInput}"，请根据这条互动推进剧情。` : '直播刚刚开始，请描述主播开场的画面。';
        try {
            const storyDiv = document.createElement('div');
            storyDiv.className = 'live-story-text';
            document.getElementById('live-story-area').appendChild(storyDiv);
            this.hideLoading('live-story-area');
            const fullText = await this.streamRequest(sys, msg, (text) => {
                storyDiv.textContent = text;
                document.getElementById('live-story-area').scrollTop = document.getElementById('live-story-area').scrollHeight;
            });
            await this.generateDanmaku(fullText);
        } catch (err) {
            this.hideLoading('live-story-area');
            this.appendStory('⚠️ ' + err.message);
        }
    },

    async generateDanmaku(storyText) {
        this.showLoading('live-danmaku-area', '生成弹幕中...');
        const { level, scene, propNames } = this.buildContext();
        const danmakuPrompt = `你是一个直播弹幕生成器。根据以下直播剧情，模拟观众发送弹幕，根据直播剧情强度，按吐槽型40%、技术分析型20%、情感共鸣型25%、搞怪玩梗型10%、指挥剧透型5%的比例生成弹幕；平静期每分钟10-20条，小高潮翻倍，大高潮每秒5-10条刷屏；主播死亡/团灭时刷“？/就这？/下饭”，极限反杀刷“？？？/这不科学”，立flag应验刷“经典/预言家刀了”，感人时刻刷“泪目/全体起立”并形成队形；弹幕可混入动作描述（如吃薯片中）、重复字母、半角标点及随机后缀（如[舰长]）；允许人身攻击和脏话，允许轻度嘲讽如”下饭””老年人反应”。\n\n直播等级：${level.label}\n直播场景：${scene.label}\n${propNames ? '直播道具：' + propNames : ''}\n\n当前剧情内容：\n${storyText}\n\n要求：\n- 模拟不同观众的弹幕评论\n- 弹幕风格自然口语化，像真实直播观众\n- 包含赞美、调侃、疑问、催促、搞笑等不同情绪\n- 每条弹幕5-20个字\n- 每条前加观众昵称（随机起名）\n- 格式：昵称：弹幕内容\n- 每条一行，不要编号`;
        try {
            this.hideLoading('live-danmaku-area');
            const fullText = await this.streamRequest(danmakuPrompt, '请根据剧情生成弹幕', () => {});
            const lines = fullText.split('\n').filter(l => l.trim());
            const randomNames = ['路人甲','老铁','游客','粉丝','观众','弹幕君','吃瓜群众'];
            for (const line of lines) {
                const match = line.match(/^(.+?)[：:]\s*(.+)$/);
                if (match) {
                    await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
                    this.appendDanmaku(match[1].trim(), match[2].trim());
                } else if (line.length > 1) {
                    // 格式不匹配时兜底：使用随机昵称
                    await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
                    this.appendDanmaku(randomNames[Math.floor(Math.random() * randomNames.length)], line.trim().slice(0, 30));
                }
            }
        } catch (err) {
            this.hideLoading('live-danmaku-area');
            this.appendDanmaku('系统', `弹幕生成失败: ${err.message}`);
        }
    },

    // ─── 生成直播画面 ───
    async generateLiveImage() {
        const btn = document.getElementById('live-imggen-btn');
        if (btn.classList.contains('generating')) return;
        btn.classList.add('generating');
        btn.textContent = '⏳';

        try {
            // 收集当前剧情作为 prompt
            const storyArea = document.getElementById('live-story-area');
            const storyTexts = storyArea.querySelectorAll('.live-story-text');
            let storySummary = '';
            storyTexts.forEach(el => { storySummary += el.textContent + '\n'; });
            storySummary = storySummary.trim().slice(-500);

            const { level, scene } = this.state;
            const shop = Engine.getModule('shop');
            const allItems = shop ? shop.getAllItems() : [];
            const propNames = (this.state.props || []).map(id => {
                const item = allItems.find(d => d.id === id);
                return item ? item.label.replace(/^(\p{Emoji_Presentation}|\p{Emoji}️?)/u, '') : '';
            }).filter(Boolean).join('、');

            const levelScale = level.id >= 4
                ? '性感撩人，衣着暴露，挑逗姿势，充满诱惑力，二次元风格'
                : level.id >= 3
                ? '暧昧氛围，轻度性感，暗示性动作，二次元风格'
                : '清新可爱，日常温馨，自然大方，二次元风格';

            const prompt = `二次元动漫风格，${scene.label}场景，${level.label}主题。${propNames ? '道具：' + propNames + '。' : ''}${storySummary ? '当前剧情：' + storySummary.slice(0, 200) + '。' : ''}${levelScale}，精美画质，细节丰富。`;

            const imageUrl = await Engine.services.aiGenerateImage(prompt + ', anime style, high quality, detailed', { imageSize: '768x1024' });

            const streamPage = document.getElementById('live-stream-page');
            streamPage.style.backgroundImage = `url(${imageUrl})`;
            streamPage.style.backgroundSize = 'cover';
            streamPage.style.backgroundPosition = 'center';
            showToast('🎨 直播画面已生成');
        } catch (err) {
            console.error('[Live] Image generation failed:', err);
            showToast(err.message);
        } finally {
            btn.classList.remove('generating');
            btn.textContent = '🎨';
        }
    },

    // ─── 结算：主播模式（赚钱）───
    calculateStreamerReward() {
        const stats = this.streamStats;
        const { level, props } = this.state;
        const durationMs = Date.now() - stats.startTime;
        const durationMin = Math.max(1, Math.floor(durationMs / 60000));

        const shop = Engine.getModule('shop');
        const allItems = shop ? shop.getAllItems() : [];
        const propItems = props.map(id => allItems.find(d => d.id === id)).filter(Boolean);

        // 1. 基础收益：每分钟 5 金币
        const baseReward = durationMin * 5;

        // 2. 模拟观众打赏：峰值观众 × 随机系数
        const viewerReward = Math.floor(stats.peakViewers * (0.5 + Math.random()));

        // 3. 道具加成
        const propDetails = propItems.map(item => {
            const isKit = item.cat === '限定套装';
            const bonus = Math.floor(item.cost * (isKit ? 0.05 : 0.1));
            return { id: item.id, label: item.label, cost: item.cost, bonus };
        });
        const propBonus = propDetails.reduce((sum, p) => sum + p.bonus, 0);

        // 4. 互动加成
        const interactionReward = stats.danmakuSent * 3;

        // 5. 等级倍率
        const multiplier = this.LEVEL_MULTIPLIER[level.id] || 1.0;

        const subtotal = baseReward + viewerReward + propBonus + interactionReward;
        const totalReward = Math.max(10, Math.floor(subtotal * multiplier));

        return {
            mode: 'streamer',
            durationMin, peakViewers: stats.peakViewers,
            propCount: props.length, propDetails, danmakuSent: stats.danmakuSent,
            baseReward, viewerReward, propBonus, interactionReward,
            multiplier, totalReward,
        };
    },

    // ─── 结算：观众模式（花钱看直播）───
    calculateViewerSummary() {
        const stats = this.streamStats;
        const { level, props } = this.state;
        const durationMs = Date.now() - stats.startTime;
        const durationMin = Math.max(1, Math.floor(durationMs / 60000));

        return {
            mode: 'viewer',
            durationMin, peakViewers: stats.peakViewers,
            propCount: props.length, danmakuSent: stats.danmakuSent,
            tipTotal: this.tipTotal || 0,
        };
    },

    // ─── 主播结算页面 ───
    showStreamerReward(reward) {
        const overlay = document.getElementById('live-reward-overlay');
        const box = document.getElementById('live-reward-box');

        box.innerHTML = `
            <div class="live-reward-title">📺 直播结算</div>
            <div class="live-reward-subtitle">${this.state.level.label} · ${this.state.scene.label}</div>
            <div class="live-reward-coin">${reward.totalReward}</div>
            <div class="live-reward-stats">
                <div class="live-reward-stat"><div class="live-reward-stat-value">${reward.durationMin} 分钟</div><div class="live-reward-stat-label">直播时长</div></div>
                <div class="live-reward-stat"><div class="live-reward-stat-value">${reward.peakViewers} 人</div><div class="live-reward-stat-label">峰值观众</div></div>
                <div class="live-reward-stat"><div class="live-reward-stat-value">${reward.propCount} 件</div><div class="live-reward-stat-label">使用道具</div></div>
                <div class="live-reward-stat"><div class="live-reward-stat-value">${reward.danmakuSent} 条</div><div class="live-reward-stat-label">主播互动</div></div>
            </div>
            <div class="live-reward-breakdown">
                <div class="live-reward-breakdown-title">💰 收益明细</div>
                <div class="live-reward-row"><span>⏱ 基础收益 (${reward.durationMin}分×5)</span><span>+${reward.baseReward}</span></div>
                <div class="live-reward-row"><span>👥 观众打赏 (峰值${reward.peakViewers}人)</span><span>+${reward.viewerReward}</span></div>
                ${reward.propBonus > 0 ? `<div class="live-reward-row" style="flex-direction:column;gap:4px;"><div style="display:flex;justify-content:space-between;width:100%;"><span>🎒 道具加成</span><span>+${reward.propBonus}</span></div>${reward.propDetails.map(p => `<div style="display:flex;justify-content:space-between;width:100%;font-size:11px;color:#999;padding-left:8px;"><span>${p.label}</span><span>+${p.bonus}</span></div>`).join('')}</div>` : ''}
                ${reward.interactionReward > 0 ? `<div class="live-reward-row"><span>💬 互动奖励 (${reward.danmakuSent}条×3)</span><span>+${reward.interactionReward}</span></div>` : ''}
                ${reward.multiplier !== 1.0 ? `<div class="live-reward-row"><span>⭐ 等级倍率 (×${reward.multiplier})</span><span></span></div>` : ''}
                <div class="live-reward-total"><span>总计</span><span>+${reward.totalReward} 🪙</span></div>
            </div>
            ${reward.propCount > 0 ? `<div style="font-size:11px;color:#999;text-align:center;margin-top:8px;">以上 ${reward.propCount} 件道具已消耗</div>` : ''}
            <button class="live-reward-btn" id="live-reward-btn" style="margin-top:12px;">收下金币 ✨</button>`;

        overlay.classList.add('visible');

        document.getElementById('live-reward-btn').onclick = async () => {
            db.money = (db.money || 0) + reward.totalReward;
            await saveData();
            overlay.classList.remove('visible');
            showToast(`+${reward.totalReward} 金币已到账！`);
            switchScreen('home-screen');
        };
    },

    // ─── 观众结算页面 ───
    showViewerSummary(summary) {
        const overlay = document.getElementById('live-reward-overlay');
        const box = document.getElementById('live-reward-box');
        const hostName = this.hostChar
            ? (this.hostChar.remarkName || this.hostChar.realName || this.hostChar.name || '主播')
            : '主播';

        box.innerHTML = `
            <div class="live-reward-title">👀 观看结束</div>
            <div class="live-reward-subtitle">${hostName} · ${this.state.level.label} · ${this.state.scene.label}</div>
            <div style="font-size:48px;margin:20px 0;">📺</div>
            <div class="live-reward-stats">
                <div class="live-reward-stat"><div class="live-reward-stat-value">${summary.durationMin} 分钟</div><div class="live-reward-stat-label">观看时长</div></div>
                <div class="live-reward-stat"><div class="live-reward-stat-value">${summary.peakViewers} 人</div><div class="live-reward-stat-label">在线观众</div></div>
                <div class="live-reward-stat"><div class="live-reward-stat-value">${summary.danmakuSent} 条</div><div class="live-reward-stat-label">我的弹幕</div></div>
                <div class="live-reward-stat"><div class="live-reward-stat-value">${summary.propCount} 件</div><div class="live-reward-stat-label">使用道具</div></div>
            </div>
            ${summary.tipTotal > 0 ? `
            <div class="live-reward-breakdown">
                <div class="live-reward-breakdown-title">🎁 打赏记录</div>
                <div class="live-reward-total"><span>累计打赏</span><span style="color:#ff6b6b;">-${summary.tipTotal} 🪙</span></div>
            </div>` : ''}
            <div style="display:flex;gap:10px;margin-top:12px;">
                <button class="live-reward-btn" id="live-reward-btn" style="flex:1;">确认</button>
                ${this.hostIsAiGenerated ? '<button class="live-reward-btn" id="live-add-friend-btn" style="flex:1;background:linear-gradient(135deg,#FF6B9D,#FF8A65);color:#fff;">➕ 加为好友</button>' : ''}
            </div>`;

        overlay.classList.add('visible');

        document.getElementById('live-reward-btn').onclick = () => {
            overlay.classList.remove('visible');
            switchScreen('home-screen');
        };

        if (this.hostIsAiGenerated) {
            document.getElementById('live-add-friend-btn').onclick = async () => {
                await this.addStreamerAsFriend();
            };
        }
    },

    endStream() {
        const streamPage = document.getElementById('live-stream-page');
        if (streamPage._viewerInterval) clearInterval(streamPage._viewerInterval);
        streamPage.classList.remove('active');
        this.isStreaming = false;

        // 消耗道具
        if (this.state.props.length > 0) {
            db.ownedItems = (db.ownedItems || []).filter(id => !this.state.props.includes(id));
            saveData();
        }
        this.state.props = [];
        this.init();
        switchScreen(this.screen);

        // 根据模式显示不同结算
        if (this.isViewerMode) {
            const summary = this.calculateViewerSummary();
            this.showViewerSummary(summary);
        } else {
            const reward = this.calculateStreamerReward();
            this.showStreamerReward(reward);
        }
    }
});

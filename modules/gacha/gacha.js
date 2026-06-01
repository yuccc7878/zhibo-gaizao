/* ========================================
   Module: Gacha (角色生成器 - 摇一摇)
   ======================================== */

Engine.register({
    id: 'gacha',
    name: '摇人',
    icon: '🎲',
    screen: 'gacha-screen',
    order: 6,

    results: [],
    generating: false,
    currentWishId: 'none',
    customWishText: '',

    WISH_PRESETS: [
        { id: 'none',    label: '随缘',   icon: '🚫', desc: '不指定，随机生成',                              directive: '' },
        { id: 'lover',   label: '恋人型', icon: '💕', desc: '温柔体贴的恋爱对象',                           directive: '角色性格温柔体贴，善解人意，适合作为恋爱对象' },
        { id: 'elite',   label: '职场型', icon: '👨‍💼', desc: '干练专业的职场精英',                          directive: '角色成熟稳重，专业能力强，具有职场精英气质' },
        { id: 'mystery', label: '神秘型', icon: '🎭', desc: '捉摸不定的神秘人物',                          directive: '角色神秘莫测，有秘密背景，让人看不透' },
        { id: 'funny',   label: '搞笑型', icon: '🤪', desc: '幽默风趣的开心果',                            directive: '角色幽默风趣，活泼开朗，是大家的开心果' },
        { id: 'guardian',label: '守护型', icon: '🦸', desc: '可靠霸气的守护者',                            directive: '角色可靠霸气，有保护欲，给人安全感' },
        { id: 'sexy',    label: '魅惑型', icon: '💋', desc: '性感迷人的魅力角色',                          directive: '角色性感迷人，充满魅力，举手投足间散发吸引力' },
        { id: 'tsundere',label: '傲娇型', icon: '😾', desc: '口是心非的傲娇角色',                          directive: '角色表面傲娇嘴硬，内心温柔害羞，典型的傲娇属性' },
        { id: 'yandere', label: '病娇型', icon: '❤️‍🔥', desc: '偏执狂热的病娇角色',                         directive: '角色对喜欢的事物极度执着，占有欲强，带有病娇属性' },
        { id: 'custom',  label: '自定义', icon: '✏️', desc: '输入你的愿望',                                directive: '' },
    ],

    AVATAR_POOL: [
        'https://i.postimg.cc/Y96LPskq/o-o-2.jpg',
        'https://i.postimg.cc/Y96LPskq/o-o-2.jpg',
        'https://i.postimg.cc/fTLCngk1/image.jpg',
    ],

    TRAIT_POOL: [
        '温柔','高冷','傲娇','元气','腹黑','天然呆','病娇','毒舌',
        '阳光','忧郁','认真','慵懒','热血','知性','中二',
        '害羞','大方','机灵','浪漫','乐观','善良','神秘','活泼','安静',
    ],

    ROLE_POOL: [
        '大学生','程序员','画家','歌手','医生','教师','咖啡师',
        '花店老板','摄影师','厨师','调酒师','舞者','作家','记者',
        '模特','游戏主播','旅行者','占卜师','偶像','军人',
        '魔法师','吸血鬼','AI机器人','天使','恶魔','猫耳娘','狐妖','精灵',
    ],

    init() {
        var screen = document.getElementById(this.screen);
        if (!screen) { console.error('[Gacha] screen not found:', this.screen); return; }
        screen.innerHTML = '<div class="gacha-header">'
            + '<button class="back-btn" data-target="home-screen">&#8249;</button>'
            + '<div class="title-container"><h1 class="title">摇一摇</h1></div>'
            + '<div class="placeholder"></div>'
            + '</div>'
            + '<div class="gacha-content">'
            + '<div class="gacha-shake-area">'
            + '<button class="gacha-shake-btn" id="gacha-shake-btn">🎲</button>'
            + '<div class="gacha-shake-hint">点击摇一摇，随机生成角色</div>'
            + '<div class="gacha-shake-count" id="gacha-shake-count"></div>'
            + '</div>'
            + '<div class="gacha-wish-area" id="gacha-wish-area">'
            + '<div class="gacha-wish-title">✨ 许愿 <span style="font-size:11px;color:#999;font-weight:400;">选择角色倾向</span></div>'
            + '<div class="gacha-wish-list" id="gacha-wish-list"></div>'
            + '<div class="gacha-wish-custom" id="gacha-wish-custom" style="display:none;">'
            + '<input type="text" id="gacha-wish-input" placeholder="输入你的愿望，如：喜欢猫的温柔女孩..." style="width:100%;padding:8px 12px;border:1px solid #e0e0e0;border-radius:8px;font-size:13px;outline:none;box-sizing:border-box;">'
            + '</div>'
            + '</div>'
            + '<div class="gacha-filters" id="gacha-filters">'
            + '<span class="gacha-filter active" data-count="1">单抽</span> '
            + '<span class="gacha-filter" data-count="3">三连</span> '
            + '<span class="gacha-filter" data-count="5">五连</span>'
            + '</div>'
            + '<div class="gacha-results" id="gacha-results"></div>'
            + '</div>';

        document.getElementById('gacha-shake-btn').addEventListener('click', function() { Engine.getModule('gacha').doGacha(); });
        var filters = screen.querySelectorAll('.gacha-filter');
        for (var i = 0; i < filters.length; i++) {
            filters[i].addEventListener('click', function() {
                for (var j = 0; j < filters.length; j++) filters[j].classList.remove('active');
                this.classList.add('active');
            });
        }
        this.renderWishList();
    },

    open() {
        switchScreen(this.screen);
        this.updateCount();
    },

    updateCount() {
        var el = document.getElementById('gacha-shake-count');
        if (el) el.textContent = 'QQ好友: ' + (db.characters ? db.characters.length : 0) + ' 人';
    },

    getCount() {
        var active = document.querySelector('.gacha-filter.active');
        return active ? parseInt(active.dataset.count) : 1;
    },

    /** 获取当前愿望的描述文本 */
    getWishDirective: function() {
        if (this.currentWishId === 'custom') {
            return this.customWishText.trim();
        }
        var preset = this.WISH_PRESETS.find(function(w) { return w.id === this.currentWishId; }.bind(this));
        return preset ? preset.directive : '';
    },

    renderWishList: function() {
        var list = document.getElementById('gacha-wish-list');
        if (!list) return;
        var self = this;
        var html = '';
        for (var i = 0; i < this.WISH_PRESETS.length; i++) {
            var w = this.WISH_PRESETS[i];
            var active = w.id === this.currentWishId ? ' active' : '';
            html += '<span class="gacha-wish-chip' + active + '" data-id="' + w.id + '">' + w.icon + ' ' + w.label + '</span>';
        }
        list.innerHTML = html;
        list.querySelectorAll('.gacha-wish-chip').forEach(function(el) {
            el.addEventListener('click', function() {
                var id = this.dataset.id;
                self.selectWish(id);
            });
        });
    },

    selectWish: function(id) {
        this.currentWishId = id;
        var customArea = document.getElementById('gacha-wish-custom');
        if (id === 'custom') {
            customArea.style.display = 'block';
            document.getElementById('gacha-wish-input').focus();
        } else {
            customArea.style.display = 'none';
        }
        this.renderWishList();
    },

    doGacha: async function() {
        if (this.generating) return;
        var api = getActiveApi();
        if (!api.url || !api.key || !api.model) {
            showToast('请先在 API 设置中配置 AI 接口');
            switchScreen('api-settings-screen');
            return;
        }
        // 保存自定义愿望文本
        if (this.currentWishId === 'custom') {
            this.customWishText = document.getElementById('gacha-wish-input').value.trim();
        }
        var count = this.getCount();
        this.generating = true;
        var btn = document.getElementById('gacha-shake-btn');
        if (btn) { btn.classList.add('shaking'); setTimeout(function() { btn.classList.remove('shaking'); }, 500); }
        var results = document.getElementById('gacha-results');
        if (results) results.innerHTML = '<div class="gacha-loading"><div class="gacha-loading-dots"><span></span><span></span><span></span></div>正在摇人中...</div>';
        try {
            this.results = await this.generateCharacters(api, count);
            this.renderResults();
        } catch (err) {
            if (results) results.innerHTML = '<div style="text-align:center;color:#ff6b6b;padding:40px;">生成失败: ' + err.message + '</div>';
        }
        this.generating = false;
    },

    /** 一次 API 调用批量生成 count 个角色 */
    generateCharacters: async function(api, count) {
        var wishDirective = this.getWishDirective();
        var roles = [];
        var traitsList = [];
        for (var i = 0; i < count; i++) {
            roles.push(this.pick(this.ROLE_POOL));
            traitsList.push(this.shufflePick(this.TRAIT_POOL, 3).join('、'));
        }

        var prompt = '请生成 ' + count + ' 个虚拟角色，要求如下：\n\n';
        for (var i = 0; i < count; i++) {
            prompt += '角色' + (i + 1) + '：\n'
                + '身份/职业：' + roles[i] + '\n'
                + '性格特征：' + traitsList[i] + '\n\n';
        }
        if (wishDirective) {
            prompt += '【许愿】玩家的愿望是：' + wishDirective + '。请让生成的每个角色尽可能符合这个愿望！\n\n';
        }
        prompt += '请严格按以下格式输出（不要输出其他内容）：\n';
        for (var i = 0; i < count; i++) {
            prompt += '角色' + (i + 1) + '：\n'
                + '名字：xxx\n'
                + '性格：用2-3句话描述这个角色的性格特点、说话风格\n'
                + '背景：用1-2句话描述这个角色的背景故事\n\n';
        }
        prompt += '要求：每个角色名字要有创意，符合角色设定。不要使用Markdown格式。';

        var apiUrl = api.url.replace(/\/+$/, '');
        var fullText = '';
        var maxTokens = Math.max(300, count * 250);

        if (api.provider === 'gemini') {
            var resp = await fetch(apiUrl + '/v1beta/models/' + api.model + ':generateContent?key=' + api.key, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 1.0, maxOutputTokens: maxTokens } })
            });
            if (!resp.ok) throw new Error('API ' + resp.status);
            var json = await resp.json();
            fullText = (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts && json.candidates[0].content.parts[0]) ? json.candidates[0].content.parts[0].text : '';
        } else {
            var resp = await fetch(apiUrl + '/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
                body: JSON.stringify({ model: api.model, stream: false, temperature: 1.0, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] })
            });
            if (!resp.ok) throw new Error('API ' + resp.status);
            var json = await resp.json();
            fullText = (json.choices && json.choices[0] && json.choices[0].message) ? json.choices[0].message.content : '';
        }

        if (!fullText) throw new Error('AI 返回内容为空');

        // 按 "角色N：" 分割响应文本
        var blocks = fullText.split(/\n\s*(?:角色\s*\d+)\s*[：:]/).filter(function(b) { return b.trim(); });
        var results = [];
        for (var i = 0; i < count && i < blocks.length; i++) {
            var char = this.parseCharacterBlock(blocks[i], roles[i], traitsList[i]);
            if (char) results.push(char);
        }
        while (results.length < count) {
            results.push(this.makeFallbackCharacter(roles[results.length], traitsList[results.length]));
        }
        return results;
    },

    /** 从单段文本中解析一个角色的字段 */
    parseCharacterBlock: function(block, defaultRole, defaultTraits) {
        var name = this.extractField(block, '名字') || this.generateRandomName();
        var persona = this.extractField(block, '性格') || defaultTraits + '的性格';
        var background = this.extractField(block, '背景') || defaultRole;
        return {
            id: 'gacha_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            name: name,
            persona: persona + '\n背景：' + background,
            role: defaultRole,
            traits: defaultTraits,
            avatar: this.pick(this.AVATAR_POOL)
        };
    },

    /** 生成一个随机兜底角色 */
    makeFallbackCharacter: function(role, traits) {
        return {
            id: 'gacha_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            name: this.generateRandomName(),
            persona: traits + '的性格\n背景：一个神秘的' + role,
            role: role,
            traits: traits,
            avatar: this.pick(this.AVATAR_POOL)
        };
    },

    /** 单次生成一个角色（用于重新生成） */
    generateCharacter: async function(api) {
        var traits = this.shufflePick(this.TRAIT_POOL, 3).join('、');
        var role = this.pick(this.ROLE_POOL);
        var wishDirective = this.getWishDirective();
        var prompt = '请生成一个虚拟角色，要求如下：\n\n'
            + '身份/职业：' + role + '\n'
            + '性格特征：' + traits + '\n\n'
            + (wishDirective ? '【许愿】玩家的愿望是：' + wishDirective + '。请让角色尽可能符合这个愿望！\n\n' : '')
            + '请严格按以下格式输出（不要输出其他内容）：\n'
            + '名字：xxx\n'
            + '性格：用2-3句话描述这个角色的性格特点、说话风格\n'
            + '背景：用1-2句话描述这个角色的背景故事\n\n'
            + '要求：名字要有创意，符合角色设定。不要使用Markdown格式。';

        var apiUrl = api.url.replace(/\/+$/, '');
        var fullText = '';

        if (api.provider === 'gemini') {
            var resp = await fetch(apiUrl + '/v1beta/models/' + api.model + ':generateContent?key=' + api.key, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 1.0, maxOutputTokens: 300 } })
            });
            if (!resp.ok) throw new Error('API ' + resp.status);
            var json = await resp.json();
            fullText = (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts && json.candidates[0].content.parts[0]) ? json.candidates[0].content.parts[0].text : '';
        } else {
            var resp = await fetch(apiUrl + '/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
                body: JSON.stringify({ model: api.model, stream: false, temperature: 1.0, max_tokens: 300, messages: [{ role: 'user', content: prompt }] })
            });
            if (!resp.ok) throw new Error('API ' + resp.status);
            var json = await resp.json();
            fullText = (json.choices && json.choices[0] && json.choices[0].message) ? json.choices[0].message.content : '';
        }

        return this.parseCharacterBlock(fullText, role, traits);
    },

    extractField: function(text, fieldName) {
        var regex = new RegExp(fieldName + '[：:]\\s*([\\s\\S]*?)(?=\\n(?:名字|性格|背景)[：:]|$)', 'i');
        var match = text.match(regex);
        return match ? match[1].trim() : '';
    },

    renderResults: function() {
        var container = document.getElementById('gacha-results');
        if (!container) return;
        var self = this;
        var html = '';
        // 显示当前愿望标签
        var wishText = this.getWishDirective();
        if (wishText) {
            html += '<div style="text-align:center;font-size:12px;color:#ff80ab;padding:8px 0 4px;">✨ 许愿: ' + wishText + '</div>';
        }
        for (var i = 0; i < this.results.length; i++) {
            var char = this.results[i];
            html += '<div class="gacha-card" style="animation-delay:' + (i * 0.1) + 's">'
                + '<img class="gacha-card-avatar" src="' + char.avatar + '" alt="' + char.name + '">'
                + '<div class="gacha-card-info">'
                + '<div class="gacha-card-name">' + char.name + '</div>'
                + '<div class="gacha-card-persona">' + char.persona + '</div>'
                + '<div class="gacha-card-actions">'
                + '<button class="gacha-card-btn add" data-idx="' + i + '">➕ 加为好友</button> '
                + '<button class="gacha-card-btn reroll" data-idx="' + i + '">🔄 重新生成</button>'
                + '</div></div></div>';
        }
        container.innerHTML = html;

        var addBtns = container.querySelectorAll('.gacha-card-btn.add');
        for (var j = 0; j < addBtns.length; j++) {
            addBtns[j].addEventListener('click', function() { self.addAsFriend(parseInt(this.dataset.idx)); });
        }
        var rerollBtns = container.querySelectorAll('.gacha-card-btn.reroll');
        for (var k = 0; k < rerollBtns.length; k++) {
            rerollBtns[k].addEventListener('click', function() { self.rerollOne(parseInt(this.dataset.idx)); });
        }
    },

    addAsFriend: async function(idx) {
        var char = this.results[idx];
        if (!char) return;
        if (db.characters.some(function(c) { return c.realName === char.name; })) {
            showToast('已经有一个叫"' + char.name + '"的好友了');
            return;
        }
        var newId = 'char_' + Date.now();
        try {
            db.characters.push({
                id: newId,
                realName: char.name, remarkName: char.name,
                persona: char.persona, avatar: char.avatar,
                myName: '我', myPersona: '',
                myAvatar: 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg',
                theme: 'white_pink', maxMemory: 10, chatBg: '',
                history: [], isPinned: false, status: '在线',
                worldBookIds: [], useCustomBubbleCss: false, customBubbleCss: ''
            });
            await saveData();
            this.results.splice(idx, 1);
            this.renderResults();
            this.updateCount();
            if (typeof renderChatList === 'function') renderChatList();
            showToast(char.name + ' 已添加为好友！');
        } catch (e) {
            console.error('[Gacha] 添加好友失败:', e);
            db.characters = db.characters.filter(function(c) { return c.id !== newId; });
            showToast('添加失败，请重试');
        }
    },

    rerollOne: async function(idx) {
        var api = getActiveApi();
        if (!api.url || !api.key || !api.model) { showToast('请先配置 API'); return; }
        showToast('重新生成中...');
        try {
            this.results[idx] = await this.generateCharacter(api);
            this.renderResults();
        } catch (err) {
            showToast('生成失败: ' + err.message);
        }
    },

    pick: function(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    shufflePick: function(arr, n) {
        var shuffled = arr.slice().sort(function() { return Math.random() - 0.5; });
        return shuffled.slice(0, n);
    },
    generateRandomName: function() {
        var surnames = ['林','苏','沈','顾','陆','白','叶','谢','江','温','傅','裴','霍','秦','宋','许','韩','冯'];
        var names = ['清','念','屿','笙','辞','澜','渊','澈','月','雪','风','云','星','霜','尘','烟','溪','鹤','羽','墨'];
        return this.pick(surnames) + this.pick(names) + (Math.random() > 0.5 ? this.pick(names) : '');
    }
});
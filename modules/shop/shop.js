/* ========================================
   Module: Shop (商店) v2 — 暗色高级感
   ======================================== */

Engine.register({
    id: 'shop',
    name: '商店',
    icon: '🛒',
    screen: 'shop-screen',
    order: 1,

    activeTab: 'gift',

    // ─── 🎁 聊天礼物 ───
    GIFT_ITEMS: [
        // 🍜 美食请客
        { id:'g_hotpot',   icon:'🍲', label:'请吃火锅',   cost:280,  cat:'美食请客', desc:'热气腾腾的火锅，拉近你和TA的距离', consumable:true },
        { id:'g_sushi',    icon:'🍣', label:'请吃寿司',   cost:260,  cat:'美食请客', desc:'精致日料，品味不凡', consumable:true },
        { id:'g_steak',    icon:'🥩', label:'请吃牛排',   cost:400,  cat:'美食请客', desc:'高级西餐，浪漫晚餐', consumable:true },
        { id:'g_bbq',      icon:'🍢', label:'请吃烧烤',   cost:200,  cat:'美食请客', desc:'烟火气十足的深夜食堂', consumable:true },
        { id:'g_hotpot2',  icon:'🦞', label:'请吃小龙虾', cost:240,  cat:'美食请客', desc:'剥虾的手，牵过的手', consumable:true },
        { id:'g_coffee',   icon:'☕', label:'请喝咖啡',   cost:55,   cat:'美食请客', desc:'一杯咖啡的时间，刚好够想你', consumable:true },
        { id:'g_milktea',  icon:'🧋', label:'请喝奶茶',   cost:45,   cat:'美食请客', desc:'全糖去冰，和你一样甜', consumable:true },
        { id:'g_cake',     icon:'🍰', label:'请吃蛋糕',   cost:100,  cat:'美食请客', desc:'草莓奶油的，你尝尝', consumable:true },

        // 💐 浪漫惊喜
        { id:'g_flower',   icon:'💐', label:'鲜花花束',   cost:200,  cat:'浪漫惊喜', desc:'一束花，胜过千言万语', consumable:true },
        { id:'g_choco',    icon:'🍫', label:'手工巧克力', cost:120,  cat:'浪漫惊喜', desc:'甜蜜的味道，甜蜜的心意', consumable:true },
        { id:'g_teddy',    icon:'🧸', label:'巨型玩偶',   cost:250,  cat:'浪漫惊喜', desc:'抱在怀里，暖在心里', consumable:true },
        { id:'g_ring',     icon:'💍', label:'钻石戒指',   cost:3000, cat:'浪漫惊喜', desc:'永恒的承诺，闪耀的誓言', premium:true, consumable:true },
        { id:'g_perfume',  icon:'🧴', label:'香水',       cost:680,  cat:'浪漫惊喜', desc:'闻到就会想起你的味道', consumable:true },
        { id:'g_99rose',   icon:'🌹', label:'99朵玫瑰',   cost:999,  cat:'浪漫惊喜', desc:'霸道总裁式表白', premium:true, consumable:true },
        { id:'g_necklace', icon:'📿', label:'项链',       cost:1800, cat:'浪漫惊喜', desc:'锁骨上的光芒', premium:true, consumable:true },
        { id:'g_watch',    icon:'⌚', label:'手表',       cost:2500, cat:'浪漫惊喜', desc:'每分每秒都想和你在一起', premium:true, consumable:true },

        // 🎁 趣味道具
        { id:'g_movie',    icon:'🎬', label:'电影票',     cost:150,  cat:'趣味道具', desc:'一起看场电影吧', consumable:true },
        { id:'g_karaoke',  icon:'🎤', label:'KTV',        cost:300,  cat:'趣味道具', desc:'唱给你听', consumable:true },
        { id:'g_game',     icon:'🎮', label:'游戏充值',   cost:200,  cat:'趣味道具', desc:'一起打游戏', consumable:true },
        { id:'g_tix',      icon:'🎫', label:'演唱会门票', cost:800,  cat:'趣味道具', desc:'一起去嗨！', consumable:true },
        { id:'g_camping',  icon:'🏕️', label:'露营',       cost:650,  cat:'趣味道具', desc:'看星星去', consumable:true },
        { id:'g_travel',   icon:'✈️', label:'短途旅行',   cost:1500, cat:'趣味道具', desc:'说走就走', premium:true, consumable:true },
        { id:'g_star',     icon:'⭐', label:'许愿星',     cost:1500, cat:'趣味道具', desc:'送给TA一颗星星', premium:true, consumable:true },
        { id:'g_book',     icon:'📚', label:'书籍',       cost:80,   cat:'趣味道具', desc:'这本书让我想到了你', consumable:true },
    ],

    // ─── 📺 直播装备 ───
    LIVE_ITEMS: [
        // 💡 灯光设备
        { id:'l_ring',   icon:'💡', label:'环形补光灯', cost:600,  cat:'灯光设备', desc:'专业级柔光，直播必备', type:'live' },
        { id:'l_rgb',    icon:'🌈', label:'RGB氛围灯',  cost:450,  cat:'灯光设备', desc:'多彩灯光，营造氛围', type:'live' },
        { id:'l_spot',   icon:'🔦', label:'聚光灯',     cost:800,  cat:'灯光设备', desc:'舞台聚光灯效果', premium:true, type:'live' },
        { id:'l_neon',   icon:'💜', label:'霓虹灯牌',   cost:350,  cat:'灯光设备', desc:'定制你的直播间招牌', type:'live' },

        // 🎬 摄影器材
        { id:'l_cam',    icon:'📷', label:'高清摄像头', cost:1200, cat:'摄影器材', desc:'4K画质，纤毫毕现', premium:true, type:'live' },
        { id:'l_mic',    icon:'🎤', label:'专业麦克风', cost:900,  cat:'摄影器材', desc:'录音棚级音质', type:'live' },
        { id:'l_tripod', icon:'📱', label:'直播支架',   cost:300,  cat:'摄影器材', desc:'稳固支撑，多角度调节', type:'live' },
        { id:'l_green',  icon:'🟩', label:'绿幕',       cost:500,  cat:'摄影器材', desc:'一键切换任意背景', type:'live' },

        // ✨ 特效道具
        { id:'l_firework', icon:'🎆', label:'烟花特效', cost:500,  cat:'特效道具', desc:'直播间满屏烟花', type:'live' },
        { id:'l_confetti', icon:'🎊', label:'彩带喷射', cost:350,  cat:'特效道具', desc:'庆祝时刻专用', type:'live' },
        { id:'l_heart',    icon:'💖', label:'爱心气泡', cost:200,  cat:'特效道具', desc:'满屏飘爱心', type:'live' },
        { id:'l_crown',    icon:'👑', label:'至尊皇冠', cost:2000, cat:'特效道具', desc:'直播间专属特效', premium:true, type:'live' },

        // 🎭 直播道具
        { id:'l_drum',     icon:'🥁', label:'气氛鼓',   cost:180,  cat:'直播道具', desc:'咚咚咚，气氛拉满', type:'live' },
        { id:'l_whistle',  icon:'📯', label:'哨子',     cost:50,   cat:'直播道具', desc:'哔——犯规！', type:'live' },
        { id:'l_bell',     icon:'🔔', label:'铃铛',     cost:80,   cat:'直播道具', desc:'叮叮叮，打赏提醒', type:'live' },
        { id:'l_fan',      icon:'🪭', label:'折扇',     cost:120,  cat:'直播道具', desc:'优雅地扇风', type:'live' },
    ],

    // ─── 🔞 成人专区 ───
    R18_ITEMS: [
        // 👗 换装play
        { id:'r_maid',      icon:'🎀', label:'女仆装',     cost:500, cat:'换装play', desc:'"主人，您回来啦~今晚想先吃饭还是先吃我？"', tag:'hot', glow:'pink', consumable:true },
        { id:'r_jk',        icon:'👗', label:'JK水手服',   cost:450, cat:'换装play', desc:'"学长...不要在学校里...会被看到的..."', tag:'hot', glow:'pink', consumable:true },
        { id:'r_bunny',     icon:'🐰', label:'兔女郎',     cost:680, cat:'换装play', desc:'蹦蹦跳跳的兔耳朵，尾巴会摇的那种', tag:'new', glow:'pink', consumable:true },
        { id:'r_gothic',    icon:'🖤', label:'哥特洛丽塔', cost:720, cat:'换装play', desc:'暗黑系大小姐，用扇子挑起你的下巴', premium:true, consumable:true },
        { id:'r_cop',       icon:'👮', label:'女警制服',   cost:580, cat:'换装play', desc:'"你有权保持沉默，但你说的每句话都会变成喘息"', tag:'hot', consumable:true },
        { id:'r_nurse',     icon:'🏥', label:'护士装',     cost:520, cat:'换装play', desc:'"来，躺好，我帮你做个全身检查~"', consumable:true },
        { id:'r_kimono',    icon:'🎎', label:'和服浴衣',   cost:600, cat:'换装play', desc:'层层叠叠的和服，解开的过程才是精髓', tag:'new', consumable:true },
        { id:'r_knight',    icon:'⚔️', label:'战斗女骑士', cost:850, cat:'换装play', desc:'银色铠甲下是柔软的锁子甲，打赢了才能脱', premium:true, consumable:true },

        // 🔮 调教道具
        { id:'r_collar',    icon:'🫦', label:'皮质项圈',   cost:300, cat:'调教道具', desc:'戴上就是我的人了，牵绳另算', consumable:true },
        { id:'r_whip',      icon:'🦯', label:'小皮鞭',     cost:450, cat:'调教道具', desc:'力度可调，从"惩罚"到"奖励"随心切换', consumable:true },
        { id:'r_tie',       icon:'🔗', label:'丝绸束缚带', cost:380, cat:'调教道具', desc:'绑成蝴蝶结还是龟甲缚？你来决定', consumable:true },
        { id:'r_candle',    icon:'🕯️', label:'低温蜡烛',   cost:280, cat:'调教道具', desc:'滴在皮肤上是温热的...还是刺激的？', tag:'hot', consumable:true },
        { id:'r_blindfold', icon:'😷', label:'缎面眼罩',   cost:220, cat:'调教道具', desc:'看不见的时候，其他感官会被放大十倍', consumable:true },
        { id:'r_feather',   icon:'🪶', label:'羽毛挠痒器', cost:200, cat:'调教道具', desc:'从锁骨一路往下...忍住别笑哦', consumable:true },
        { id:'r_icefire',   icon:'🧊', label:'冰火两重天', cost:320, cat:'调教道具', desc:'冰块+温热精油，交替使用，刺激翻倍', tag:'new', consumable:true },
        { id:'r_remote',    icon:'🎮', label:'遥控跳蛋',   cost:750, cat:'调教道具', desc:'出门约会带着它，遥控器在我手上~', tag:'hot', glow:'purple', consumable:true },

        // 🧴 感官道具
        { id:'r_oil',       icon:'🫧', label:'可食用按摩油', cost:380, cat:'感官道具', desc:'草莓味的，涂上去之后...是可以舔的', consumable:true },
        { id:'r_candy',     icon:'💋', label:'可食用内衣',   cost:420, cat:'感官道具', desc:'糖衣炮弹，拆礼物的过程比吃更有趣', tag:'hot', glow:'pink', consumable:true },
        { id:'r_petals',    icon:'🌹', label:'玫瑰花瓣雨',   cost:150, cat:'感官道具', desc:'铺满整个浴缸，浪漫值拉满', consumable:true },
        { id:'r_bath',      icon:'🛁', label:'情侣泡泡浴',   cost:350, cat:'感官道具', desc:'泡泡很多...手可以在泡泡下面乱摸', consumable:true },
        { id:'r_mirror',    icon:'🪞', label:'全身镜',       cost:900, cat:'感官道具', desc:'放在床对面，让所有画面都变成双倍', premium:true, consumable:true },
        { id:'r_whitenoise',icon:'🎵', label:'氛围白噪音',   cost:80,  cat:'感官道具', desc:'雨声+壁炉声，掩盖不该被听到的声音', consumable:true },

        // 🕯️ 氛围道具
        { id:'r_nightlight',icon:'💡', label:'暖光小夜灯', cost:120, cat:'氛围道具', desc:'橙黄色的微光，把影子拉得很长', consumable:true },
        { id:'r_moonlamp',  icon:'🌙', label:'月光投影灯', cost:280, cat:'氛围道具', desc:'天花板上的月亮，躺在床上仰望', consumable:true },
        { id:'r_speaker',   icon:'🎶', label:'蓝牙音箱',   cost:350, cat:'氛围道具', desc:'放一首慢歌，节奏刚好是心跳的速度', consumable:true },
        { id:'r_diffuser',  icon:'🌸', label:'香薰扩散器', cost:200, cat:'氛围道具', desc:'薰衣草或依兰，催情的气味弥漫整个房间', consumable:true },

        // 📦 套装组合
        { id:'s_starter',   icon:'🌸', label:'新手大礼包',   cost:1500, cat:'套装组合', desc:'眼罩+羽毛+蜡烛+花瓣，入门四件套', tag:'set', kit:['r_blindfold','r_feather','r_candle','r_petals'], consumable:true },
        { id:'s_advanced',  icon:'🔥', label:'进阶玩法包',   cost:2800, cat:'套装组合', desc:'束缚带+皮鞭+冰火+跳蛋，老司机标配', tag:'set', premium:true, kit:['r_tie','r_whip','r_icefire','r_remote'], consumable:true },
        { id:'s_supreme',   icon:'💎', label:'至尊体验套装', cost:5000, cat:'套装组合', desc:'全调教+感官道具，一整晚不重样', tag:'ltd', premium:true, consumable:true,
          kit:['r_collar','r_whip','r_tie','r_candle','r_blindfold','r_feather','r_icefire','r_remote','r_oil','r_candy','r_petals','r_bath','r_mirror','r_whitenoise'] },
        { id:'s_atmos',     icon:'🎁', label:'氛围大师包',   cost:800,  cat:'套装组合', desc:'小夜灯+月光灯+音箱+香薰，全套氛围', tag:'set', kit:['r_nightlight','r_moonlamp','r_speaker','r_diffuser'], consumable:true },

        // 🏷️ 衣帽间联动（暂不开放）
        { id:'_wardrobe_placeholder', icon:'👗', label:'衣帽间服装', cost:0, cat:'衣帽间联动', desc:'即将开放，敬请期待', disabled:true },
    ],

    pendingItem: null,

    init() {
        const screen = document.getElementById(this.screen);
        screen.innerHTML = `
            <div class="shop-header-bar">
                <button class="back-btn" data-target="home-screen">‹</button>
                <div class="title-container"><h1 class="shop-title">商店</h1></div>
                <div class="shop-coins"><span class="coin-icon">🪙</span><span id="shop-money">${db.money || 0}</span></div>
            </div>
            <div class="shop-tabs">
                <button class="shop-tab active" data-tab="gift">🎁 聊天礼物</button>
                <button class="shop-tab" data-tab="live">📺 直播装备</button>
                <button class="shop-tab" data-tab="r18">🔞 成人</button>
            </div>
            <main class="shop-content"><div class="shop-grid" id="shop-grid"></div></main>
            <div class="shop-toast" id="shop-toast"></div>`;

        // Tab 切换
        screen.querySelectorAll('.shop-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.activeTab = tab.dataset.tab;
                screen.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.renderGrid();
            });
        });
    },

    open() {
        switchScreen(this.screen);
        const moneyEl = document.getElementById('shop-money');
        if (moneyEl) moneyEl.textContent = db.money || 0;
        this.renderGrid();
    },

    /** 获取当前标签的商品列表 */
    getCurrentItems() {
        if (this.activeTab === 'gift') return this.GIFT_ITEMS;
        if (this.activeTab === 'live') return this.LIVE_ITEMS;
        return this.R18_ITEMS;
    },

    /** 获取所有商品（跨标签）— 保持接口兼容 */
    getAllItems() {
        return [...this.GIFT_ITEMS, ...this.LIVE_ITEMS, ...this.R18_ITEMS];
    },

    /** 获取已拥有的道具（直播/礼物模块调用）— 接口不变 */
    getOwnedProps() {
        const owned = db.ownedItems || [];
        return this.getAllItems().filter(item => owned.includes(item.id));
    },

    /** 获取已拥有的消耗型物品（聊天礼物用，过滤掉装备型） */
    getConsumableItems() {
        const owned = db.ownedItems || [];
        return this.getAllItems().filter(item => owned.includes(item.id) && item.consumable);
    },

    /** 获取已拥有的直播装备（直播模块用） */
    getLiveProps() {
        const owned = db.ownedItems || [];
        return this.LIVE_ITEMS.filter(item => owned.includes(item.id));
    },

    /** 渲染商品网格 */
    renderGrid() {
        const grid = document.getElementById('shop-grid');
        if (!grid) return;
        const owned = db.ownedItems || [];
        const items = this.getCurrentItems();

        // 按 cat 分组
        const categories = {};
        items.forEach(item => {
            if (!categories[item.cat]) categories[item.cat] = [];
            categories[item.cat].push(item);
        });

        let html = '';
        for (const [cat, catItems] of Object.entries(categories)) {
            html += `<div class="shop-section-title">${cat}</div><div class="shop-grid-row">`;
            catItems.forEach(item => {
                if (item.disabled) {
                    html += `<div class="shop-card shop-card-disabled">
                        <span class="shop-card-icon">${item.icon}</span>
                        <span class="shop-card-label">${item.label}</span>
                        <span class="shop-card-desc">${item.desc}</span>
                    </div>`;
                    return;
                }
                const isOwned = owned.includes(item.id);
                const cls = [
                    'shop-card',
                    item.premium ? 'shop-card-premium' : '',
                    item.glow ? 'shop-card-glow-' + item.glow : '',
                    isOwned ? 'shop-card-owned' : ''
                ].filter(Boolean).join(' ');
                const tagHtml = item.tag ? `<span class="shop-tag shop-tag-${item.tag}">${
                    {hot:'🔥爆', new:'✨新', ltd:'👑限', set:'📦套'}[item.tag] || ''
                }</span>` : '';
                const costHtml = isOwned ? `<span class="shop-card-price" style="color:#4CAF50;">✓ 已拥有</span>` : `<span class="shop-card-price">🪙 ${item.cost}</span>`;
                html += `<div class="${cls}" data-id="${item.id}">
                    <div class="shop-card-inner">
                        <div class="shop-card-front">
                            ${tagHtml}
                            <span class="shop-card-icon">${item.icon}</span>
                            <span class="shop-card-label">${item.label}</span>
                            ${item.desc ? `<span class="shop-card-desc">${item.desc}</span>` : ''}
                            ${costHtml}
                        </div>
                        <div class="shop-card-back">
                            <span class="shop-card-icon" style="font-size:32px;">${item.icon}</span>
                            <span class="shop-card-label">${item.label}</span>
                            <span class="shop-card-price">🪙 ${item.cost}</span>
                            <div style="display:flex;gap:8px;width:100%;margin-top:4px;">
                                <button class="shop-btn shop-btn-cancel" style="flex:1;padding:6px 0;font-size:12px;">取消</button>
                                <button class="shop-btn shop-btn-buy" style="flex:1;padding:6px 0;font-size:12px;">购买</button>
                            </div>
                        </div>
                    </div>
                </div>`;
            });
            html += '</div>';
        }
        grid.innerHTML = html;

        // 绑定翻转事件 — 点击可购买卡片翻转
        grid.querySelectorAll('.shop-card:not(.shop-card-owned):not(.shop-card-disabled)').forEach(el => {
            const front = el.querySelector('.shop-card-front');
            if (front) {
                front.addEventListener('click', (e) => {
                    if (e.target.closest('.shop-btn')) return;
                    el.classList.add('flipped');
                });
            }
            // 反面取消按钮 — 翻回正面
            const cancelBtn = el.querySelector('.shop-card-back .shop-btn-cancel');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    el.classList.remove('flipped');
                });
            }
            // 反面购买按钮
            const buyBtn = el.querySelector('.shop-card-back .shop-btn-buy');
            if (buyBtn) {
                buyBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.buyItem(el.dataset.id);
                });
            }
        });

        // 入场动画
        this._animateCards();
    },

    /** 卡片入场动画 */
    _animateCards() {
        if (typeof anime !== 'function') return;
        anime({
            targets: '#shop-grid .shop-card',
            opacity: [0, 1],
            translateY: [30, 0],
            scale: [0.9, 1],
            delay: function(_el, i) { return i * 50; },
            duration: 500,
            easing: 'easeOutBack'
        });
    },

    /** 打开购买确认 */
    openConfirm(itemId) {
        const item = this.getAllItems().find(i => i.id === itemId);
        if (!item || item.disabled) return;
        this.pendingItem = item;
        document.getElementById('shop-modal-icon').textContent = item.icon;
        document.getElementById('shop-modal-name').textContent = item.label;
        document.getElementById('shop-modal-desc').textContent = item.desc || '';
        document.getElementById('shop-modal-price').textContent = `🪙 ${item.cost}`;
        const btn = document.getElementById('shop-buy-btn');
        btn.className = 'shop-btn shop-btn-buy';
        if ((db.money || 0) < item.cost) btn.classList.add('shop-btn-nomoney');
        // 光晕颜色
        const glow = document.querySelector('.shop-modal-glow');
        if (glow) {
            glow.style.background = item.glow === 'purple'
                ? 'radial-gradient(circle, rgba(179,136,255,0.35), transparent 70%)'
                : 'radial-gradient(circle, rgba(255,105,180,0.3), transparent 70%)';
        }
        document.getElementById('shop-overlay').classList.add('visible');
    },

    /** 关闭弹窗 */
    closeConfirm() {
        document.getElementById('shop-overlay')?.classList.remove('visible');
        this.pendingItem = null;
    },

    /** Toast 提示 */
    toast(msg) {
        const t = document.getElementById('shop-toast');
        if (!t) return;
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 2000);
    },

    /** 购买 */
    async buyItem(itemId) {
        const item = this.getAllItems().find(i => i.id === itemId);
        if (!item) return;
        if (!db.ownedItems) db.ownedItems = [];
        if (db.ownedItems.includes(item.id)) {
            // 已拥有，翻回正面
            const card = document.querySelector(`.shop-card[data-id="${itemId}"]`);
            if (card) card.classList.remove('flipped');
            this.toast('已拥有该物品');
            return;
        }
        const money = db.money || 0;
        if (money < item.cost) {
            // 余额不足
            const card = document.querySelector(`.shop-card[data-id="${itemId}"]`);
            if (card) card.classList.remove('flipped');
            this.toast('金币不足');
            return;
        }

        // 扣款
        db.money = money - item.cost;

        // 套装：批量写入单品
        if (item.kit && Array.isArray(item.kit)) {
            item.kit.forEach(kid => {
                if (!db.ownedItems.includes(kid)) db.ownedItems.push(kid);
            });
        }
        // 写入商品本身
        if (!db.ownedItems.includes(item.id)) db.ownedItems.push(item.id);

        await saveData();

        // 更新金币显示
        const moneyEl = document.getElementById('shop-money');
        if (moneyEl) moneyEl.textContent = db.money;

        // 金币滚动动画
        this._animateCoins(money + item.cost, db.money);

        // 撒花
        this._confetti();

        this.renderGrid();
        this.toast(`🎉 购买成功：${item.label}`);
    },

    /** 金币数字滚动 */
    _animateCoins(from, to) {
        if (typeof anime !== 'function') return;
        const moneyEl = document.getElementById('shop-money');
        if (!moneyEl) return;
        moneyEl.classList.add('bump');
        setTimeout(() => moneyEl.classList.remove('bump'), 300);
        anime({
            targets: { val: from },
            val: to,
            round: 1,
            duration: 800,
            easing: 'easeOutExpo',
            update: function(a) { moneyEl.textContent = a.animations[0].currentValue; }
        });
    },

    /** 撒花特效 */
    _confetti() {
        if (typeof confetti !== 'function') return;
        confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.65 },
            colors: ['#667eea', '#9b59b6', '#f093fb', '#a5b4fc', '#f472b6'],
            shapes: ['circle', 'square'],
            gravity: 0.8,
            scalar: 1.1
        });
        setTimeout(() => {
            confetti({ particleCount: 25, angle: 60, spread: 50, origin: { x: 0 }, colors: ['#667eea','#f093fb'] });
            confetti({ particleCount: 25, angle: 120, spread: 50, origin: { x: 1 }, colors: ['#9b59b6','#a5b4fc'] });
        }, 150);
    }
});

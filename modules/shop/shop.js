/* ========================================
   Module: Shop (商店)
   ======================================== */

Engine.register({
    id: 'shop',
    name: '商店',
    icon: '🛒',
    screen: 'shop-screen',
    order: 1,

    // 当前标签
    activeTab: 'daily',

    // ─── 日常消费 ───
    DAILY_ITEMS: [
        // 🍜 美食餐饮
        { id:'breakfast',  label:'🥟早餐',      cost:30,    cat:'美食餐饮' },
        { id:'lunch',      label:'🍱午餐',      cost:65,    cat:'美食餐饮' },
        { id:'dinner',     label:'🍛晚餐',      cost:80,    cat:'美食餐饮' },
        { id:'milktea',    label:'🧋奶茶',      cost:45,    cat:'美食餐饮' },
        { id:'coffee',     label:'☕咖啡',      cost:55,    cat:'美食餐饮' },
        { id:'dessert',    label:'🍰蛋糕',      cost:100,   cat:'美食餐饮' },
        { id:'snack',      label:'🍿爆米花',    cost:50,    cat:'美食餐饮' },
        { id:'icecream',   label:'🍦冰淇淋',    cost:35,    cat:'美食餐饮' },
        { id:'hotpot',     label:'🍲火锅',      cost:280,   cat:'美食餐饮' },
        { id:'bbq',        label:'🍢烧烤',      cost:200,   cat:'美食餐饮' },
        { id:'crayfish',   label:'🦞小龙虾',    cost:240,   cat:'美食餐饮' },
        { id:'sushi',      label:'🍣寿司',      cost:260,   cat:'美食餐饮' },
        { id:'steak',      label:'🥩牛排',      cost:400,   cat:'美食餐饮' },
        { id:'wine',       label:'🍷红酒',      cost:350,   cat:'美食餐饮' },
        { id:'beer',       label:'🍺啤酒',      cost:120,   cat:'美食餐饮' },

        // 🎮 休闲娱乐
        { id:'movie',      label:'🎬电影票',    cost:150,   cat:'休闲娱乐' },
        { id:'karaoke',    label:'🎤KTV',       cost:300,   cat:'休闲娱乐' },
        { id:'game',       label:'🎮游戏充值',  cost:200,   cat:'休闲娱乐' },
        { id:'amusement',  label:'🎢游乐园',    cost:500,   cat:'休闲娱乐' },
        { id:'escape',     label:'🔐密室逃脱',  cost:350,   cat:'休闲娱乐' },
        { id:'murder',     label:'🔍剧本杀',    cost:280,   cat:'休闲娱乐' },
        { id:'spa',        label:'💆SPA',       cost:600,   cat:'休闲娱乐' },
        { id:'massage',    label:'💆按摩',      cost:400,   cat:'休闲娱乐' },
        { id:'concert',    label:'🎫演唱会',    cost:800,   cat:'休闲娱乐' },
        { id:'travel',     label:'✈️短途旅行',  cost:1500,  cat:'休闲娱乐' },
        { id:'camping',    label:'🏕️露营',      cost:650,   cat:'休闲娱乐' },
        { id:'skiing',     label:'⛷️滑雪',      cost:1200,  cat:'休闲娱乐' },

        // 🛒 生活好物
        { id:'flower',     label:'💐鲜花',      cost:200,   cat:'生活好物' },
        { id:'chocolate',  label:'🍫巧克力',    cost:120,   cat:'生活好物' },
        { id:'teddy',      label:'🧸玩偶',      cost:250,   cat:'生活好物' },
        { id:'perfume',    label:'🧴香水',      cost:680,   cat:'生活好物' },
        { id:'skincare',   label:'🧴护肤品',    cost:450,   cat:'生活好物' },
        { id:'cosmetics',  label:'💄化妆品',    cost:600,   cat:'生活好物' },
        { id:'book',       label:'📚书籍',      cost:80,    cat:'生活好物' },
        { id:'candle',     label:'🕯️香薰蜡烛',  cost:150,   cat:'生活好物' },
        { id:'photo',      label:'📸写真拍摄',  cost:1200,  cat:'生活好物' },
        { id:'plant',      label:'🪴盆栽',      cost:180,   cat:'生活好物' },

        // 👕 服饰穿搭
        { id:'tshirt',     label:'👕T恤',       cost:200,   cat:'服饰穿搭' },
        { id:'hoodie',     label:'🧥卫衣',      cost:500,   cat:'服饰穿搭' },
        { id:'sneakers',   label:'👟球鞋',      cost:1200,  cat:'服饰穿搭' },
        { id:'handbag',    label:'👜包包',      cost:1500,  cat:'服饰穿搭' },
        { id:'hat',        label:'🧢帽子',      cost:180,   cat:'服饰穿搭' },
        { id:'watch',      label:'⌚手表',      cost:2500,  cat:'服饰穿搭' },
        { id:'necklace',   label:'📿项链',      cost:1800,  cat:'服饰穿搭' },
        { id:'sunglasses', label:'🕶️墨镜',      cost:400,   cat:'服饰穿搭' },
        { id:'scarf',      label:'🧣围巾',      cost:250,   cat:'服饰穿搭' },
        { id:'bracelet',   label:'💎手链',      cost:600,   cat:'服饰穿搭' },
    ],

    // ─── R18 ───
    R18_ITEMS: [
        // 👗 情趣衣装
        { id:'maid',       label:'🎀女仆装',    cost:500,   cat:'情趣衣装' },
        { id:'jk',         label:'👗JK制服',    cost:450,   cat:'情趣衣装' },
        { id:'stocking',   label:'🧦吊带袜',    cost:280,   cat:'情趣衣装' },
        { id:'lingerie',   label:'👙蕾丝内衣',  cost:680,   cat:'情趣衣装' },
        { id:'sexy_lng',   label:'🔥情趣内衣',  cost:750,   cat:'情趣衣装' },
        { id:'bikini',     label:'🏖️比基尼',   cost:350,   cat:'情趣衣装' },
        { id:'cosplay',    label:'🎭角色服',    cost:800,   cat:'情趣衣装' },
        { id:'pajamas',    label:'🛌睡裙',      cost:400,   cat:'情趣衣装' },
        { id:'school_uni', label:'🎒学生制服',  cost:600,   cat:'情趣衣装' },
        { id:'leather',    label:'🖤皮革紧身衣',cost:1200,  cat:'情趣衣装' },

        // 🔮 私密玩具
        { id:'lube',       label:'🧴润滑液',    cost:180,   cat:'私密玩具' },
        { id:'vibe',       label:'🥚跳蛋',      cost:750,   cat:'私密玩具' },
        { id:'wand',       label:'🪄按摩棒',    cost:1200,  cat:'私密玩具' },
        { id:'ring',       label:'💍震动环',    cost:650,   cat:'私密玩具' },
        { id:'remote_toy', label:'📱遥控玩具',  cost:900,   cat:'私密玩具' },
        { id:'blindfold',  label:'😷丝缎眼罩',  cost:220,   cat:'私密玩具' },
        { id:'bondage',    label:'🪢束缚带',    cost:350,   cat:'私密玩具' },
        { id:'collar',     label:'🫦项圈',      cost:300,   cat:'私密玩具' },
        { id:'whip',       label:'🦯羽毛鞭',    cost:450,   cat:'私密玩具' },
        { id:'ice_toy',    label:'🧊冰趣玩具',  cost:280,   cat:'私密玩具' },

        // 🕯️ 氛围道具
        { id:'scented_candle', label:'🕯️香薰蜡烛', cost:200,   cat:'氛围道具' },
        { id:'mood_light',     label:'💡氛围灯',   cost:280,   cat:'氛围道具' },
        { id:'silk_sheet',     label:'🛏️丝绸床单', cost:600,   cat:'氛围道具' },
        { id:'rose_petal',     label:'🌹玫瑰花瓣', cost:100,   cat:'氛围道具' },
        { id:'bath_oil',       label:'🛁精油沐浴', cost:380,   cat:'氛围道具' },
        { id:'massage_oil',    label:'🫧按摩油',   cost:580,   cat:'氛围道具' },
        { id:'led_mirror',     label:'🪞化妆镜',   cost:900,   cat:'氛围道具' },
        { id:'chocolate_sauce',label:'🍫巧克力酱', cost:80,    cat:'氛围道具' },
        { id:'feather',        label:'🪶羽毛挠',   cost:200,   cat:'氛围道具' },
        { id:'handcuff',       label:'🔗软铐',     cost:500,   cat:'氛围道具' },

        // 🎁 限定套装
        { id:'starter_kit',     label:'🌸入门套餐',    desc:'基础道具组合，适合初次探索',                                         cost:2000,  cat:'限定套装' },
        { id:'advanced_kit',    label:'🌹进阶套装',    desc:'精选热门单品，玩法更丰富',                                         cost:3500,  cat:'限定套装' },
        { id:'deluxe_kit',      label:'💎豪华礼包',    desc:'高端产品线全覆盖，极致享受',                                         cost:5000,  cat:'限定套装' },
        { id:'ultimate_kit',    label:'👑极致体验',    desc:'全套旗舰配置，解锁终极体验',                                         cost:8000,  cat:'限定套装' },
    ],

    pendingItem: null,

    init() {
        const screen = document.getElementById(this.screen);
        screen.innerHTML = `
            <div class="shop-header-bar">
                <button class="back-btn" data-target="home-screen">‹</button>
                <div class="title-container"><h1 class="title">商店</h1></div>
                <div class="shop-money-display"><span class="coin">🪙</span><span id="shop-money">${db.money || 0}</span></div>
            </div>
            <div class="shop-tabs">
                <button class="shop-tab active" data-tab="daily">🛒 日常消费</button>
                <button class="shop-tab" data-tab="r18">🔞 R18</button>
            </div>
            <main class="shop-content"><div class="shop-grid" id="shop-grid"></div></main>
            <div class="shop-confirm-overlay" id="shop-confirm-overlay">
                <div class="shop-confirm-box">
                    <div class="item-icon" id="confirm-item-icon"></div>
                    <div class="item-name" id="confirm-item-name"></div>
                    <div style="font-size:13px;color:#888;text-align:center;margin:4px 0 8px;line-height:1.4;min-height:18px;" id="confirm-item-desc"></div>
                    <div class="item-price" id="confirm-item-price"></div>
                    <div class="shop-confirm-btns">
                        <button class="cancel-btn" id="shop-cancel-btn">取消</button>
                        <button class="buy-btn" id="shop-buy-btn">购买</button>
                    </div>
                </div>
            </div>
            <div class="shop-toast" id="shop-toast"></div>`;

        // 绑定标签切换
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
        this.renderGrid();
        document.getElementById('shop-confirm-overlay')?.classList.remove('visible');
        document.getElementById('shop-cancel-btn')?.addEventListener('click', () => this.closeConfirm());
        document.getElementById('shop-buy-btn')?.addEventListener('click', () => this.buyItem());
        document.getElementById('shop-confirm-overlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'shop-confirm-overlay') this.closeConfirm();
        });
    },

    /** 获取当前标签的商品列表 */
    getCurrentItems() {
        return this.activeTab === 'daily' ? this.DAILY_ITEMS : this.R18_ITEMS;
    },

    /** 获取所有商品（跨标签） */
    getAllItems() {
        return [...this.DAILY_ITEMS, ...this.R18_ITEMS];
    },

    renderGrid() {
        const grid = document.getElementById('shop-grid');
        if (!grid) return;
        const owned = db.ownedItems || [];
        const items = this.getCurrentItems();

        // 按 cat 分组渲染
        const categories = {};
        items.forEach(item => {
            if (!categories[item.cat]) categories[item.cat] = [];
            categories[item.cat].push(item);
        });

        let html = '';
        for (const [cat, catItems] of Object.entries(categories)) {
            html += `<div style="grid-column:1/-1;font-size:12px;font-weight:700;color:#999;padding:8px 4px 4px;letter-spacing:1px;">${cat}</div>`;
            catItems.forEach(item => {
                const isOwned = owned.includes(item.id);
                const emojiMatch = item.label.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)/u);
                const icon = emojiMatch ? emojiMatch[0] : '🛒';
                const name = item.label.slice(emojiMatch ? emojiMatch[0].length : 0);
                html += `<div class="shop-item${isOwned ? ' owned' : ''}" data-id="${item.id}">
                    <span class="shop-item-icon">${icon}</span>
                    <span class="shop-item-label">${name}</span>
                    <span class="shop-item-cost">${item.cost}</span>

                ${item.desc ? `<div style="grid-column:2/-1;font-size:11px;color:#999;margin:-4px 0 4px;line-height:1.3;">${item.desc}</div>` : ''}                </div>`;
            });
        }
        grid.innerHTML = html;

        grid.querySelectorAll('.shop-item:not(.owned)').forEach(el => {
            el.addEventListener('click', () => this.openConfirm(el.dataset.id));
        });
    },

    openConfirm(itemId) {
        const item = this.getAllItems().find(i => i.id === itemId);
        if (!item) return;
        this.pendingItem = item;
        const emojiMatch = item.label.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)/u);
        const icon = emojiMatch ? emojiMatch[0] : '🛒';
        const name = item.label.slice(emojiMatch ? emojiMatch[0].length : 0);
        document.getElementById('confirm-item-icon').textContent = icon;
        document.getElementById('confirm-item-name').textContent = name;
        document.getElementById('confirm-item-desc').textContent = item.desc || '';
        document.getElementById('confirm-item-price').textContent = `💰 ${item.cost} 金币`;
        document.getElementById('shop-confirm-overlay').classList.add('visible');
    },

    closeConfirm() {
        document.getElementById('shop-confirm-overlay')?.classList.remove('visible');
        this.pendingItem = null;
    },

    toast(msg) {
        const t = document.getElementById('shop-toast');
        if (!t) return;
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 1500);
    },

    async buyItem() {
        if (!this.pendingItem) return;
        const item = this.pendingItem;
        this.closeConfirm();
        if (!db.ownedItems) db.ownedItems = [];
        if (db.ownedItems.includes(item.id)) { this.toast('已拥有该物品'); return; }
        const money = db.money || 0;
        if (money < item.cost) { this.toast('金币不足'); return; }
        db.money = money - item.cost;
        db.ownedItems.push(item.id);
        await saveData();
        document.getElementById('shop-money').textContent = db.money;
        this.renderGrid();
        this.toast(`购买成功：${item.label}`);
    },

    /** 获取已拥有的道具（直播模块调用） */
    getOwnedProps() {
        const owned = db.ownedItems || [];
        return this.getAllItems().filter(item => owned.includes(item.id));
    }
});

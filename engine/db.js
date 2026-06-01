/* ========================================
   Engine DB - 数据持久化层
   ======================================== */

class DataStorage {
    constructor() {
        this.db = new Dexie('章鱼喷墨机DB');
        this.db.version(1).stores({
            storage: 'key, value, timestamp'
        });
    }

    async saveData(key, data) {
        try {
            await this.db.storage.put({
                key: key,
                value: JSON.stringify(data),
                timestamp: Date.now()
            });
            return true;
        } catch (error) {
            console.error('保存数据失败:', error);
            return false;
        }
    }

    async getData(key) {
        try {
            const item = await this.db.storage.get(key);
            return item ? JSON.parse(item.value) : null;
        } catch (error) {
            console.error('获取数据失败:', error);
            return null;
        }
    }

    async removeData(key) {
        try {
            await this.db.storage.delete(key);
            return true;
        } catch (error) {
            console.error('删除数据失败:', error);
            return false;
        }
    }

    async clearAll() {
        try {
            await this.db.storage.clear();
            return true;
        } catch (error) {
            console.error('清空数据失败:', error);
            return false;
        }
    }

    async getAllKeys() {
        try {
            const items = await this.db.storage.toArray();
            return items.map(item => item.key);
        } catch (error) {
            console.error('获取键名失败:', error);
            return [];
        }
    }
}

// 全局数据存储实例
const dataStorage = new DataStorage();

// 全局数据库对象
let db = {
    characters: [],
    groups: [],
    apiSettings: {},
    apiPresets: [],
    activeApiPresetId: '',
    wallpaper: 'https://i.postimg.cc/W4Z9R9x4/ins-1.jpg',
    myStickers: [],
    homeScreenMode: 'night',
    worldBooks: [],
    fontUrl: '',
    customIcons: {},
    imgGenSettings: { url: '', key: '', model: '' }
};

// 保存数据
const saveData = async (data) => {
    await dataStorage.saveData('章鱼喷墨机', data ? data : db);
    return Promise.resolve();
};

// 加载数据
const loadData = async () => {
    const oldData = localStorage.getItem('gemini-chat-app-db');
    let data = await dataStorage.getData('章鱼喷墨机');
    if (oldData) {
        await saveData(JSON.parse(oldData));
        data = await dataStorage.getData('章鱼喷墨机');
        localStorage.removeItem('gemini-chat-app-db');
    }
    if (data) db = data;
    if (!db.apiSettings) db.apiSettings = {};
    if (!db.apiPresets) db.apiPresets = [];
    if (!db.activeApiPresetId) db.activeApiPresetId = '';
    // 迁移旧版单配置到预设列表
    if (db.apiPresets.length === 0 && db.apiSettings.url) {
        db.apiPresets.push({
            id: 'preset_' + Date.now(),
            name: '默认配置',
            provider: db.apiSettings.provider || 'newapi',
            url: db.apiSettings.url || '',
            key: db.apiSettings.key || '',
            model: db.apiSettings.model || '',
            imgGenUrl: '',
            imgGenKey: ''
        });
        db.activeApiPresetId = db.apiPresets[0].id;
    }
    if (!db.wallpaper) db.wallpaper = 'https://i.postimg.cc/W4Z9R9x4/ins-1.jpg';
    if (!db.characters) db.characters = [];
    if (!db.groups) db.groups = [];
    if (!db.myStickers) db.myStickers = [];
    if (!db.homeScreenMode) db.homeScreenMode = 'night';
    if (!db.worldBooks) db.worldBooks = [];
    if (!db.fontUrl) db.fontUrl = '';
    if (!db.customIcons) db.customIcons = {};
    if (!db.imgGenSettings) db.imgGenSettings = {};
    if (!db.imgGenSettings.url) db.imgGenSettings.url = 'https://image.pollinations.ai/prompt/';
    if (!db.imgGenSettings.key) db.imgGenSettings.key = '';
    if (!db.imgGenSettings.model) db.imgGenSettings.model = '';
    // 迁移：从旧版预设中的 imgGenUrl/imgGenKey 搬到全局设置
    if (!db.imgGenSettings.url && db.apiPresets.length > 0) {
        const firstWithImg = db.apiPresets.find(p => p.imgGenUrl);
        if (firstWithImg) {
            db.imgGenSettings.url = firstWithImg.imgGenUrl;
            db.imgGenSettings.key = firstWithImg.imgGenKey || '';
        }
    }
    if (db.money === undefined) db.money = 500;
    if (!db.ownedItems) db.ownedItems = [];

    db.characters.forEach(c => {
        if (c.isPinned === undefined) c.isPinned = false;
        if (c.status === undefined) c.status = '在线';
        if (!c.worldBookIds) c.worldBookIds = [];
        if (c.customBubbleCss === undefined) c.customBubbleCss = '';
        if (c.useCustomBubbleCss === undefined) c.useCustomBubbleCss = false;
        if (c.memorySummary === undefined) c.memorySummary = '';
        if (!c.keyEvents) c.keyEvents = [];
        if (c.summaryIndex === undefined) c.summaryIndex = 0;
    });
    db.groups.forEach(g => {
        if (g.isPinned === undefined) g.isPinned = false;
        if (!g.worldBookIds) g.worldBookIds = [];
        if (g.customBubbleCss === undefined) g.customBubbleCss = '';
        if (g.useCustomBubbleCss === undefined) g.useCustomBubbleCss = false;
        if (g.memorySummary === undefined) g.memorySummary = '';
        if (!g.keyEvents) g.keyEvents = [];
        if (g.summaryIndex === undefined) g.summaryIndex = 0;
    });

    return Promise.resolve();
};

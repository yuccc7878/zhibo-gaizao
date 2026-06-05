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
    wallpaper: 'assets/wallpaper.jpg',
    myStickers: [],
    homeScreenMode: 'night',
    worldBooks: [],
    fontUrl: '',
    customIcons: {},
    imgGenSettings: { url: '', key: '', model: '' },
    albumPhotos: []
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
    if (!db.wallpaper || db.wallpaper.includes('postimg.cc') || db.wallpaper.includes('i.postimg')) {
        db.wallpaper = 'assets/wallpaper.jpg';
    }
    if (!db.characters) db.characters = [];
    if (!db.groups) db.groups = [];
    if (!db.myStickers) db.myStickers = [];
    // 移除：日间/夜间切换已删除
    if (!db.worldBooks) db.worldBooks = [];
    db.worldBooks.forEach(wb => { if (wb.enabled === undefined) wb.enabled = true; });
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
    if (!db.albumPhotos) db.albumPhotos = [];
    if (db.albumPhotos.length === 0) {
        db.albumPhotos.push({
            id: 'cover_' + Date.now(),
            url: 'assets/album_cover.jpg',
            name: '默认封面',
            isCover: true,
            timestamp: Date.now()
        });
    }
    // 激活世界配置
    if (db.activeWorldEnabled === undefined) db.activeWorldEnabled = false;
    if (db.activeWorldInterval === undefined) db.activeWorldInterval = 5;
    if (!db.activeWorldScope) db.activeWorldScope = 'both';

    db.characters.forEach(c => {
        if (c.isPinned === undefined) c.isPinned = false;
        if (c.status === undefined) c.status = '在线';
        if (!c.worldBookIds) c.worldBookIds = [];
        if (c.customBubbleCss === undefined) c.customBubbleCss = '';
        if (c.useCustomBubbleCss === undefined) c.useCustomBubbleCss = false;
        if (c.memorySummary === undefined) c.memorySummary = '';
        if (!c.keyEvents) c.keyEvents = [];
        if (c.summaryIndex === undefined) c.summaryIndex = 0;
        if (c.aiImgGen === undefined) c.aiImgGen = false;
        // 酒馆导入新字段
        if (!c.builtinWorldBooks) c.builtinWorldBooks = [];
        if (c.scenario === undefined) c.scenario = '';
        if (c.systemPrompt === undefined) c.systemPrompt = '';
        if (c.mesExample === undefined) c.mesExample = '';
    });
    db.groups.forEach(g => {
        if (g.isPinned === undefined) g.isPinned = false;
        if (!g.worldBookIds) g.worldBookIds = [];
        if (g.customBubbleCss === undefined) g.customBubbleCss = '';
        if (g.useCustomBubbleCss === undefined) g.useCustomBubbleCss = false;
        if (g.memorySummary === undefined) g.memorySummary = '';
        if (!g.keyEvents) g.keyEvents = [];
        if (g.summaryIndex === undefined) g.summaryIndex = 0;
        // 酒馆导入新字段
        if (!g.builtinWorldBooks) g.builtinWorldBooks = [];
        if (g.scenario === undefined) g.scenario = '';
        if (g.systemPrompt === undefined) g.systemPrompt = '';
        if (g.members) g.members.forEach(m => {
            if (!m.builtinWorldBooks) m.builtinWorldBooks = [];
            if (m.systemPrompt === undefined) m.systemPrompt = '';
        });
    });

    return Promise.resolve();
};

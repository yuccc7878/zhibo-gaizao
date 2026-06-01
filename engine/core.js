/* ========================================
   Engine Core - 模块引擎核心
   ======================================== */

/** 获取当前激活的 API 配置 */
function getActiveApi() {
    if (db.apiPresets && db.apiPresets.length > 0 && db.activeApiPresetId) {
        const preset = db.apiPresets.find(p => p.id === db.activeApiPresetId);
        if (preset) return preset;
    }
    // 兜底：旧版单配置
    return db.apiSettings || {};
}

const Engine = {
    modules: {},

    /** 注册一个模块 */
    register(module) {
        if (!module.id) { console.error('Module missing id:', module); return; }
        this.modules[module.id] = module;
        console.log(`[Engine] Registered module: ${module.id}`);
    },

    /** 获取模块实例 */
    getModule(id) {
        return this.modules[id];
    },

    /** 获取所有模块（按 order 排序） */
    getAllModules() {
        return Object.values(this.modules).sort((a, b) => (a.order || 99) - (b.order || 99));
    },

    /** 初始化所有模块 */
    async initAll() {
        for (const mod of this.getAllModules()) {
            if (mod.init) {
                try {
                    await mod.init();
                    console.log(`[Engine] Initialized: ${mod.id}`);
                } catch (e) {
                    console.error(`[Engine] Failed to init ${mod.id}:`, e);
                }
            }
        }
    },

    /** 打开指定模块 */
    openModule(id) {
        const mod = this.modules[id];
        if (mod && mod.open) {
            mod.open();
        } else {
            console.warn(`[Engine] Module not found or has no open(): ${id}`);
        }
    },

    /** 模块可访问的共享服务 */
    services: {
        get db() { return db; },
        saveData,
        loadData,
        switchScreen,
        showToast,
        pad,
        compressImage,
        updateCustomBubbleStyle,
        getMixedContent,
        getRandomValue,
        createContextMenu,
        removeContextMenu,
        get colorThemes() { return colorThemes; },
        get defaultIcons() { return defaultIcons; },
        // DOM 元素引用（按需扩展）
        get screens() { return document.querySelectorAll('.screen'); },
        get homeScreen() { return document.getElementById('home-screen'); },
        get toastElement() { return document.getElementById('toast-notification'); },
    }
};

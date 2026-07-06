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
        // AI 通信（代理到 AiService）
        get aiChat() { return window.AiService?.chat; },
        get aiGenerateImage() { return window.AiService?.generateImage; },
        // DOM 元素引用（按需扩展）
        get screens() { return document.querySelectorAll('.screen'); },
        get homeScreen() { return document.getElementById('home-screen'); },
        get toastElement() { return document.getElementById('toast-notification'); },

        // ─── AI 服务桥接 ──────────────────────

        /**
         * 同步当前 API 配置到 AiService（每次调用前自动执行）
         * 从 db.apiPresets / db.apiSettings 读取活跃配置
         */
        syncAiConfig() {
            const api = getActiveApi();
            if (api?.url && api?.key && api?.model) {
                AiService.setChatConfig(api);
            }
            AiService.setImageConfig(db.imgGenSettings || {});
        },

        /**
         * AI 文字对话（统一入口）
         * @param {Object} opts
         * @param {string} opts.system - 系统提示词
         * @param {Array} opts.messages - 消息数组 [{ role, content }]
         * @param {Object} [opts.options] - { temperature, maxTokens }
         * @param {function(string): void} [opts.onToken] - 流式回调（传此参数启用流式）
         * @param {AbortSignal} [opts.signal] - 中止信号
         * @returns {Promise<string>} AI 回复文本
         */
        async aiChat(opts) {
            this.syncAiConfig();
            return AiService.chat(opts);
        },

        /**
         * AI 图片生成（统一入口）
         * @param {string} prompt - 图片描述
         * @param {Object} [options] - { imageSize }
         * @returns {Promise<string>} 图片 URL
         */
        async aiGenerateImage(prompt, options) {
            this.syncAiConfig();
            return AiService.generateImage(prompt, options);
        },

        /**
         * 拉取可用模型列表
         * @param {string} url - API 地址
         * @param {string} key - 密钥
         * @param {string} provider - 服务商名
         * @param {string} [modelsPath] - 自定义模型列表路径
         * @returns {Promise<string[]>}
         */
        async aiFetchModels(url, key, provider, modelsPath) {
            return AiService.fetchModels(url, key, provider, modelsPath);
        },
    }
};

// 暴露到全局（ES Module 需要通过 window 访问）
window.Engine = Engine;

/* ========================================
   模块: Date (约会地图) — 3D 城市
   ======================================== */

Engine.register({
    id: 'date',
    name: '🗺️ 约会',
    icon: '🗺️',
    screen: 'date-map-screen',
    order: 6,

    open() {
        const screen = document.getElementById('date-map-screen');
        if (!screen) {
            console.error('[Date] date-map-screen 不存在');
            return;
        }
        // 直接切换屏幕（避免依赖 switchScreen 函数，该函数可能签名不匹配）
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        screen.classList.add('active');
        // 关闭可能的弹窗
        document.querySelectorAll('.modal-overlay, .action-sheet-overlay, .settings-sidebar')
            .forEach(o => o.classList.remove('visible', 'open'));
        // 保存屏幕状态（如果有 db 的话）
        if (window.db && window.saveData) {
            window.db._currentScreen = 'date-map-screen';
            window.db._currentChatId = '';
            window.db._currentChatType = '';
            window.saveData();
        }
        // 懒加载 Three.js 场景
        if (!this._loaded) {
            this._loaded = true;
            setTimeout(async () => {
                try {
                    const core = await import('./date-core.js');
                    this._core = core;
                    await core.init();
                } catch (e) {
                    console.error('[Date] 3D 场景加载失败:', e);
                }
            }, 200);
        } else if (this._core) {
            this._core.resume();
        }
    },

    close() {
        if (this._core) this._core.pause();
    }
});

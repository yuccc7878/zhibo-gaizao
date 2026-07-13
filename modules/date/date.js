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
        // 懒加载 Three.js 场景（带 CDN 加载失败保护）
        if (!this._loaded) {
            this._loaded = true;
            setTimeout(async () => {
                try {
                    // 先检查 three 模块是否可用（防止 CDN 加载失败导致模块解析错误）
                    let threeOk = false;
                    try {
                        const m = await import('three');
                        threeOk = !!(m && (m.default || m.SphereGeometry || m.Scene));
                    } catch(_e) {
                        threeOk = false;
                    }
                    if (!threeOk) {
                        // 尝试兜底加载
                        if (typeof window.__threeFallback === 'function') {
                            try {
                                const THREE = await window.__threeFallback();
                                window.THREE = THREE;
                                threeOk = true;
                            } catch(_e2) {}
                        }
                    }
                    if (!threeOk) {
                        console.warn('[Date] three.js 不可用，跳过 3D 场景加载');
                        return;
                    }
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

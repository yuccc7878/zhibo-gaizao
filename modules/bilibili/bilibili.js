/* ========================================
   Module: Bilibili (B站)
   ======================================== */

Engine.register({
    id: 'bilibili',
    name: 'B站',
    icon: '📱',
    screen: 'bilibili-screen',
    order: 3,
    videos: [],
    loading: false,

    // CORS 代理链（按优先级依次尝试）
    PROXY_CHAIN: [
        // 代理 1：allorigins（返回 JSON 包装，兼容性好）
        (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        // 代理 2：corsproxy.io
        (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
        // 代理 3：codethread 代理
        (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    ],

    init() {
        const screen = document.getElementById(this.screen);
        screen.innerHTML = `
            <div class="bili-header">
                <button class="back-btn" data-target="home-screen">‹</button>
                <div class="title-container"><h1 class="title" style="color:#00a1d6;">📺 B站热门</h1></div>
                <div class="placeholder"></div>
            </div>
            <main class="bili-content" id="bili-content">
                <div class="bili-empty">
                    <div class="bili-empty-icon">📺</div>
                    <p>点击右下角按钮获取热门视频</p>
                </div>
            </main>
            <button class="bili-refresh-btn" id="bili-refresh-btn" title="刷新">🔄</button>`;
    },

    open() {
        switchScreen(this.screen);
        document.getElementById('bili-refresh-btn').onclick = () => this.fetch();
        if (this.videos.length === 0) this.fetch();
    },

    /** 带代理链的请求：依次尝试每个代理，直到成功 */
    async fetchWithProxy(url) {
        let lastError;
        for (const buildProxyUrl of this.PROXY_CHAIN) {
            const proxyUrl = buildProxyUrl(url);
            try {
                const resp = await fetch(proxyUrl, {
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    signal: AbortSignal.timeout(10000),
                });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const text = await resp.text();
                // codetabs 返回纯文本错误信息时处理
                if (!text || text === '-352') throw new Error('代理无法连接到目标服务器');
                let json;
                try { json = JSON.parse(text); } catch (e) { throw new Error('响应不是有效 JSON'); }
                // allorigins /get 格式：{ contents: "...", status: {...} }
                if (json.contents) {
                    const inner = JSON.parse(json.contents);
                    if (inner.code === 0 && inner.data) return inner;
                    throw new Error(inner.message || 'B站 API 返回错误');
                }
                // codetabs 格式：直接返回原始 JSON
                if (json.code === 0 && json.data) return json;
                throw new Error(json.message || '数据格式异常');
            } catch (err) {
                lastError = err;
                console.warn(`[Bilibili] Proxy failed: ${proxyUrl.slice(0, 60)}... → ${err.message}`);
                continue;
            }
        }
        throw lastError || new Error('所有代理均不可用');
    },

    async fetch() {
        if (this.loading) return;
        this.loading = true;
        const btn = document.getElementById('bili-refresh-btn');
        const content = document.getElementById('bili-content');
        btn.classList.add('spinning');
        content.innerHTML = '<div class="bili-loading">正在获取热门视频...</div>';

        try {
            const apiUrl = 'https://api.bilibili.com/x/web-interface/popular?ps=20&pn=1';
            const json = await this.fetchWithProxy(apiUrl);
            this.videos = json.data.list || [];
            if (this.videos.length === 0) throw new Error('暂无热门数据');
            this.render();
        } catch (err) {
            content.innerHTML = `
                <div class="bili-error">
                    ⚠️ 获取失败：${err.message}
                    <br><br>
                    <small>已尝试 ${this.PROXY_CHAIN.length} 个代理通道<br>请检查网络连接后重试</small>
                </div>`;
        } finally {
            this.loading = false;
            btn.classList.remove('spinning');
        }
    },

    render() {
        const content = document.getElementById('bili-content');
        if (!content) return;
        if (this.videos.length === 0) {
            content.innerHTML = '<div class="bili-empty"><div class="bili-empty-icon">📭</div><p>暂无数据</p></div>';
            return;
        }

        const formatNum = (n) => n >= 10000 ? (n / 10000).toFixed(1) + '万' : n;
        const formatDuration = (s) => { const m = Math.floor(s / 60); return `${m}:${(s % 60).toString().padStart(2, '0')}`; };
        // XSS 防护：转义 HTML
        const esc = (str) => String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

        content.innerHTML = this.videos.map(v => `
            <div class="bili-video-card" data-aid="${v.aid}">
                <img class="bili-video-cover" src="${esc(v.pic)}@160w_100h.webp" alt="" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%2275%22><rect fill=%22%23f0f0f0%22 width=%22120%22 height=%2275%22/><text x=%2260%22 y=%2242%22 text-anchor=%22middle%22 fill=%22%23ccc%22 font-size=%2214%22>📺</text></svg>'">
                <div class="bili-video-info">
                    <div class="bili-video-title">${esc(v.title)}</div>
                    <div class="bili-video-author">${esc(v.owner?.name || '')}</div>
                    <div class="bili-video-meta">
                        <span>▶ ${formatNum(v.stat?.view || 0)}</span>
                        <span>💬 ${formatNum(v.stat?.danmaku || 0)}</span>
                        <span>👍 ${formatNum(v.stat?.like || 0)}</span>
                        <span>⏱ ${formatDuration(v.duration || 0)}</span>
                    </div>
                </div>
            </div>
        `).join('');

        content.querySelectorAll('.bili-video-card').forEach(card => {
            card.addEventListener('click', () => {
                const aid = card.dataset.aid;
                if (aid) window.open(`https://www.bilibili.com/video/av${aid}`, '_blank');
            });
        });
    }
});

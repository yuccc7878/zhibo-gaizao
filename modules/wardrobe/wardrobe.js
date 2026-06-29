/* ========================================
   Module: Wardrobe (衣帽间)
   独立换装系统模块 - v3 抽屉式布局
   ======================================== */
Engine.register({
    id: 'wardrobe',
    name: '衣帽间',
    icon: '👗',
    screen: 'wardrobe-screen',
    order: 7,
    // 人偶画布尺寸
    DOLL_W: 220,
    DOLL_H: 580,
    SCALE: 1.5,
    // 各类衣物默认定位偏移
    CLOTHING_OFFSETS: {
        'hair':     { left: 15, top: -20, width: 120, height: 160 },
        'tops':     { left: 15, top: 80,  width: 120, height: 120 },
        'bottoms':  { left: 20, top: 195, width: 110, height: 100 },
        'fullbody': { left: 10, top: 75,  width: 130, height: 260 },
        'shoes':    { left: 20, top: 420, width: 110, height: 80 },
    },
    init() {
        const screen = document.getElementById(this.screen);
        screen.innerHTML = `
            <div class="wardrobe-container">
                <!-- 左上角返回按钮 -->
                <button class="wardrobe-back-btn" data-target="home-screen" title="返回主页">‹</button>
                
                <!-- 标题 -->
                <h1 class="wardrobe-title">👗 衣帽间</h1>
                
                <!-- 右上角工具按钮 -->
                <div class="wardrobe-tools">
                    <button class="wardrobe-tool-btn" id="wardrobe-upload-btn" title="导入服装">📥</button>
                    <button class="wardrobe-tool-btn" id="wardrobe-download" title="下载人偶">💾</button>
                    <button class="wardrobe-tool-btn" id="wardrobe-reset" title="重置">🔄</button>
                </div>
                
                <!-- 全屏居中人物展示区 -->
                <div class="wardrobe-doll-section">
                    <div class="wardrobe-doll-area" id="wardrobe-doll-area">
                        <img id="wardrobe-skintone" src="modules/wardrobe/base/Skintone/full/Anime Base Doll.png" alt="body">
                        <div id="wardrobe-avi-area"></div>
                    </div>
                </div>
                
                <!-- 抽屉开关按钮 -->
                <button class="wardrobe-drawer-toggle" id="wardrobe-drawer-toggle" title="打开衣柜">
                    <span>👚</span>
                </button>
                
                <!-- 抽屉遮罩 -->
                <div class="wardrobe-drawer-overlay" id="wardrobe-drawer-overlay"></div>
                
                <!-- 右侧抽屉面板 -->
                <div class="wardrobe-drawer" id="wardrobe-drawer">
                    <div class="wardrobe-drawer-header">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                            <h2 class="wardrobe-drawer-title" style="margin: 0;">✨ 选择衣物</h2>
                            <button class="wardrobe-drawer-close" id="wardrobe-drawer-close" title="关闭">✕</button>
                        </div>
                        <div class="wardrobe-tabs" id="wardrobe-tabs">
                            <button class="wardrobe-tab active" data-tab="hair">💇 发型</button>
                            <button class="wardrobe-tab" data-tab="tops">👕 上衣</button>
                            <button class="wardrobe-tab" data-tab="bottoms">👖 下装</button>
                            <button class="wardrobe-tab" data-tab="shoes">👟 鞋子</button>
                            <button class="wardrobe-tab" data-tab="fullbody">👗 全身</button>
                        </div>
                    </div>
                    <div class="wardrobe-drawer-content">
                        <div class="wardrobe-tab-panels" id="wardrobe-tab-panels">
                            <div class="wardrobe-tab-panel active" data-panel="hair"></div>
                            <div class="wardrobe-tab-panel" data-panel="tops"></div>
                            <div class="wardrobe-tab-panel" data-panel="bottoms"></div>
                            <div class="wardrobe-tab-panel" data-panel="shoes"></div>
                            <div class="wardrobe-tab-panel" data-panel="fullbody"></div>
                        </div>
                    </div>
                    <div class="wardrobe-drawer-footer">
                        <div class="wardrobe-hint">拖拽衣物到人偶 · 点击即可穿戴 · 滚轮/双指缩放</div>
                    </div>
                </div>
                <!-- 手动调整大小面板 -->
                <div class="wardrobe-resize-popup" id="wardrobe-resize-popup">
                    <div class="wardrobe-resize-row">
                        <span class="wardrobe-resize-label">大小</span>
                        <input type="range" class="wardrobe-resize-slider" id="wardrobe-resize-slider" min="20" max="300" value="100">
                        <span class="wardrobe-resize-val" id="wardrobe-resize-val">100%</span>
                    </div>
                    <div style="display:flex;gap:6px;">
                        <button class="wardrobe-resize-btn" id="wardrobe-resize-smaller">缩小</button>
                        <button class="wardrobe-resize-btn" id="wardrobe-resize-bigger">放大</button>
                        <button class="wardrobe-resize-btn" id="wardrobe-resize-reset">重置</button>
                        <button class="wardrobe-resize-btn" id="wardrobe-resize-close" style="color:#ff6b6b;">✕</button>
                    </div>
                </div>
                <!-- 上传弹窗 -->
                <div id="wardrobe-upload-modal" class="wardrobe-modal-overlay">
                    <div class="wardrobe-modal">
                        <div class="wardrobe-modal-title">📥 导入服装</div>
                        <div class="wardrobe-modal-body">
                            <div id="wardrobe-upload-preview" class="wardrobe-upload-preview"><span>点击下方选择图片</span></div>
                            <input type="file" id="wardrobe-file-input" accept="image/png,image/jpeg,image/webp" style="display:none;" multiple>
                            <button class="wardrobe-modal-btn wardrobe-modal-btn-secondary" id="wardrobe-choose-file">选择图片文件</button>
                            <div class="wardrobe-upload-category">
                                <div class="wardrobe-upload-cat-label">选择分类：</div>
                                <div class="wardrobe-upload-cat-btns">
                                    <button class="wardrobe-cat-btn" data-cat="hair">💇 发型</button>
                                    <button class="wardrobe-cat-btn active" data-cat="tops">👕 上衣</button>
                                    <button class="wardrobe-cat-btn" data-cat="bottoms">👖 下装</button>
                                    <button class="wardrobe-cat-btn" data-cat="shoes">👟 鞋子</button>
                                    <button class="wardrobe-cat-btn" data-cat="fullbody">👗 全身</button>
                                </div>
                            </div>
                            <input type="text" id="wardrobe-upload-name" class="wardrobe-upload-name-input" placeholder="服装名称（选填）">
                        </div>
                        <div class="wardrobe-modal-footer">
                            <button class="wardrobe-modal-btn wardrobe-modal-btn-neutral" id="wardrobe-upload-cancel">取消</button>
                            <button class="wardrobe-modal-btn wardrobe-modal-btn-primary" id="wardrobe-upload-confirm" disabled>添加</button>
                        </div>
                    </div>
                </div>
            </div>`;
        this._customItems = [];
        this._uploadCategory = 'tops';
        this._uploadFiles = [];
        this._placedItems = [];
        this._drawerOpen = false;
        try { Dexie.delete('wardrobe-custom'); } catch (_) {}
        this._loadCustomItems().then(() => {
            this._buildClothingPanels();
            this._bindEvents();
        });
    },
    open() {
        switchScreen(this.screen);
    },
    /* ══════════════════════════════════════
       抽屉控制
       ══════════════════════════════════════ */
    _toggleDrawer() {
        this._drawerOpen = !this._drawerOpen;
        const drawer = document.getElementById('wardrobe-drawer');
        const overlay = document.getElementById('wardrobe-drawer-overlay');
        const toggle = document.getElementById('wardrobe-drawer-toggle');
        if (this._drawerOpen) {
            drawer.classList.add('open');
            overlay.classList.add('open');
            toggle.querySelector('span').textContent = '✕';
        } else {
            drawer.classList.remove('open');
            overlay.classList.remove('open');
            toggle.querySelector('span').textContent = '👚';
        }
    },
    /* ══════════════════════════════════════
       构建 UI
       ══════════════════════════════════════ */
    _buildClothingPanels() {
        const categories = {
            hair: ['黑长直', '金色双马尾', '粉色双丸子', '银白短发', '棕色大波浪', '蓝色高马尾', '紫色高马尾', '橙色波波头'],
            tops: ['水手服', 'JK制服', '粉色卫衣', '洛丽塔上衣', '米色卫衣', '绿色卫衣', '开衫毛衣', '蓝色夹克', '黑色吊带', '白色吊带', '粉色露肩', '红色旗袍'],
            bottoms: ['粉色百褶裙', '蓝色牛仔裤', '牛仔短裤', '运动长裤', '军绿工装裤', '洛丽塔裙', '紫色蓬蓬裙', '粉色短裙', '紫色阔腿裤', '蓝色背带裤'],
            shoes: [],
            fullbody: ['粉色公主裙', '女仆装', '白色婚纱', '红色礼服', 'JK连衣裙', '紫色和服', '蓝色和服', '紫白和服', '樱花和服', '粉色浴衣', '紫色哥特裙', '黑红哥特裙', '粉色吊带裙', '粉色睡衣', '白色睡衣']
        };
        const folderMap = { hair: 'Hair', tops: 'Tops', bottoms: 'Bottoms', shoes: 'Shoes', fullbody: 'Full-body' };
        for (const [key, items] of Object.entries(categories)) {
            const panel = document.querySelector(`[data-panel="${key}"]`);
            let html = items.map(name => {
                const folder = folderMap[key];
                const displayName = name;
                return `<div class="wardrobe-piece" data-category="${key}">
                    <img src="modules/wardrobe/images/${folder}/${name}.png" alt="${displayName}" title="${displayName}">
                </div>`;
            }).join('');
            const custom = this._customItems.filter(i => i.category === key);
            if (custom.length) {
                html += custom.map(item =>
                    `<div class="wardrobe-piece wardrobe-piece-custom" data-category="${key}" data-custom-id="${item.id}">
                        <img src="${item.dataUrl}" alt="${item.name}" title="${item.name}（自定义·右键删除）">
                    </div>`
                ).join('');
            }
            panel.innerHTML = html;
        }
    },
    /* ══════════════════════════════════════
       事件绑定
       ══════════════════════════════════════ */
    _bindEvents() {
        const self = this;
        // 抽屉开关
        // 返回主页按钮
        document.querySelector('.wardrobe-back-btn').addEventListener('click', () => {
            switchScreen('home-screen');
        });
        // 抽屉开关
        document.getElementById('wardrobe-drawer-toggle').addEventListener('click', () => self._toggleDrawer());
        document.getElementById('wardrobe-drawer-overlay').addEventListener('click', () => self._toggleDrawer());
        // 抽屉内关闭按钮
        document.getElementById('wardrobe-drawer-close').addEventListener('click', () => self._toggleDrawer());
        // 标签切换
        document.getElementById('wardrobe-tabs').addEventListener('click', (e) => {
            const tab = e.target.closest('.wardrobe-tab');
            if (!tab) return;
            document.querySelectorAll('.wardrobe-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.wardrobe-tab-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.querySelector(`[data-panel="${tab.dataset.tab}"]`).classList.add('active');
        });
        // 拖拽衣物到人偶
        this._initDragDrop();
        // 工具按钮
        document.getElementById('wardrobe-download').addEventListener('click', () => self._downloadDoll());
        document.getElementById('wardrobe-reset').addEventListener('click', () => self._resetDoll());
        // 上传
        this._bindUploadEvents();
        // 右键删除自定义
        document.getElementById('wardrobe-tab-panels').addEventListener('contextmenu', (e) => {
            const piece = e.target.closest('.wardrobe-piece-custom');
            if (!piece) return;
            e.preventDefault();
            const img = piece.querySelector('img');
            if (img && confirm(`删除「${img.alt}」？`)) self._removeCustomItem(piece.dataset.customId);
        });
        // 点击空白处隐藏调整面板
        document.getElementById('wardrobe-doll-area').addEventListener('click', (e) => {
            if (e.target === document.getElementById('wardrobe-doll-area') || e.target.id === 'wardrobe-skintone') {
                self._hideResizePopup();
            }
        });
        // 调整大小面板事件
        const resizeSlider = document.getElementById('wardrobe-resize-slider');
        const resizeVal = document.getElementById('wardrobe-resize-val');
        resizeSlider.addEventListener('input', () => {
            const pct = parseInt(resizeSlider.value);
            resizeVal.textContent = pct + '%';
            self._applyResize(pct);
        });
        document.getElementById('wardrobe-resize-smaller').addEventListener('click', () => {
            resizeSlider.value = Math.max(20, parseInt(resizeSlider.value) - 10);
            resizeVal.textContent = resizeSlider.value + '%';
            self._applyResize(parseInt(resizeSlider.value));
        });
        document.getElementById('wardrobe-resize-bigger').addEventListener('click', () => {
            resizeSlider.value = Math.min(300, parseInt(resizeSlider.value) + 10);
            resizeVal.textContent = resizeSlider.value + '%';
            self._applyResize(parseInt(resizeSlider.value));
        });
        document.getElementById('wardrobe-resize-reset').addEventListener('click', () => {
            resizeSlider.value = 100;
            resizeVal.textContent = '100%';
            self._applyResize(100);
        });
        document.getElementById('wardrobe-resize-close').addEventListener('click', () => {
            self._hideResizePopup();
        });
    },
    _bindUploadEvents() {
        const self = this;
        const modal = document.getElementById('wardrobe-upload-modal');
        const fileInput = document.getElementById('wardrobe-file-input');
        const preview = document.getElementById('wardrobe-upload-preview');
        const nameInput = document.getElementById('wardrobe-upload-name');
        const confirmBtn = document.getElementById('wardrobe-upload-confirm');
        document.getElementById('wardrobe-upload-btn').addEventListener('click', () => {
            self._uploadFiles = [];
            fileInput.value = '';
            nameInput.value = '';
            preview.innerHTML = '<span>点击下方选择图片</span>';
            confirmBtn.disabled = true;
            modal.classList.add('visible');
        });
        document.getElementById('wardrobe-upload-cancel').addEventListener('click', () => modal.classList.remove('visible'));
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('visible'); });
        document.getElementById('wardrobe-choose-file').addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
            if (!files.length) return;
            self._uploadFiles = files;
            const reader = new FileReader();
            reader.onload = (ev) => {
                preview.innerHTML = `<img src="${ev.target.result}" style="max-width:100%;max-height:100%;image-rendering:pixelated;">`;
                if (files.length > 1) preview.innerHTML += `<div style="position:absolute;bottom:4px;right:6px;background:rgba(0,0,0,0.6);color:#fff;font-size:11px;padding:2px 6px;border-radius:4px;">+${files.length - 1}</div>`;
            };
            reader.readAsDataURL(files[0]);
            confirmBtn.disabled = false;
        });
        document.querySelectorAll('.wardrobe-cat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.wardrobe-cat-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                self._uploadCategory = btn.dataset.cat;
            });
        });
        confirmBtn.addEventListener('click', () => self._handleUpload());
    },
    /* ══════════════════════════════════════
       拖拽系统
       ══════════════════════════════════════ */
    _initDragDrop() {
        const self = this;
        const panels = document.getElementById('wardrobe-tab-panels');
        const dollArea = document.getElementById('wardrobe-doll-area');
        let dragClone = null, dragSrc = null, dragCategory = null;
        let dragMoved = false, dragStartX = 0, dragStartY = 0;
        const DRAG_THRESHOLD = 8; // 移动超过 8px 才算拖拽
        const getPos = (e) => {
            if (e.touches && e.touches.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
            if (e.changedTouches && e.changedTouches.length) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
            return { x: e.clientX, y: e.clientY };
        };
        const onStart = (e) => {
            const piece = e.target.closest('.wardrobe-piece');
            if (!piece) return;
            const img = piece.querySelector('img');
            if (!img) return;
            dragSrc = img;
            dragCategory = piece.dataset.category || 'tops';
            dragMoved = false;
            const p = getPos(e);
            dragStartX = p.x;
            dragStartY = p.y;
            // 不立即创建克隆，等移动超过阈值再创建
        };
        const onMove = (e) => {
            if (!dragSrc) return;
            const p = getPos(e);
            if (!dragClone) {
                // 检查是否超过拖拽阈值
                var dx = p.x - dragStartX, dy = p.y - dragStartY;
                if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;
                // 超过阈值，创建拖拽克隆
                dragMoved = true;
                dragClone = document.createElement('img');
                dragClone.src = dragSrc.src;
                dragClone.style.cssText = `position:fixed;z-index:9999;pointer-events:none;opacity:0.85;width:56px;height:56px;object-fit:contain;image-rendering:pixelated;border:2px solid rgba(102,126,234,0.8);border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.4);`;
                document.body.appendChild(dragClone);
            }
            e.preventDefault();
            dragClone.style.left = (p.x - 28) + 'px';
            dragClone.style.top = (p.y - 28) + 'px';
        };
        const onEnd = (e) => {
            if (dragClone && dragSrc && dragMoved) {
                const p = getPos(e);
                const rect = dollArea.getBoundingClientRect();
                if (p.x >= rect.left && p.x <= rect.right && p.y >= rect.top && p.y <= rect.bottom) {
                    self._placeItem(dragSrc.src, dragSrc.alt, dragCategory, p, rect);
                }
            }
            cleanup();
        };
        const cleanup = () => {
            if (dragClone) { dragClone.remove(); dragClone = null; }
            dragSrc = null;
            dragMoved = false;
        };
        // 点击切换（放置/移除）
        panels.addEventListener('click', (e) => {
            if (dragMoved) return; // 刚拖拽过，不触发点击
            const piece = e.target.closest('.wardrobe-piece');
            if (!piece) return;
            const img = piece.querySelector('img');
            if (!img) return;
            const cat = piece.dataset.category || 'tops';
            const rect = dollArea.getBoundingClientRect();
            // 检查是否已放置同名衣物
            const existing = dollArea.querySelector(`.wardrobe-placed[data-alt="${img.alt}"]`);
            if (existing) {
                // 已放置 → 移除
                if (existing._cleanup) existing._cleanup();
                existing.remove();
                self._placedItems = self._placedItems.filter(i => i.alt !== img.alt);
                piece.classList.remove('wardrobe-piece-active');
            } else {
                // 未放置 → 放置到默认位置
                const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 3 };
                self._placeItem(img.src, img.alt, cat, center, rect);
                piece.classList.add('wardrobe-piece-active');
            }
        });
        panels.addEventListener('touchstart', onStart, { passive: true });
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
        panels.addEventListener('mousedown', onStart);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
    },
    /* ── 同步面板衣物的选中状态 ── */
    _syncActiveState() {
        const dollArea = document.getElementById('wardrobe-doll-area');
        const placedAlts = new Set();
        dollArea.querySelectorAll('.wardrobe-placed').forEach(el => placedAlts.add(el.dataset.alt));
        document.querySelectorAll('.wardrobe-piece').forEach(piece => {
            const img = piece.querySelector('img');
            if (img && placedAlts.has(img.alt)) {
                piece.classList.add('wardrobe-piece-active');
            } else {
                piece.classList.remove('wardrobe-piece-active');
            }
        });
    },
    /* ── 裁剪图片透明像素，返回 { src, width, height, offsetX, offsetY } ── */
    _cropTransparent(imgEl) {
        var w = imgEl.naturalWidth || imgEl.width;
        var h = imgEl.naturalHeight || imgEl.height;
        if (!w || !h) return null;
        var cvs = document.createElement('canvas');
        cvs.width = w;
        cvs.height = h;
        var ctx = cvs.getContext('2d');
        ctx.drawImage(imgEl, 0, 0);
        var data;
        try { data = ctx.getImageData(0, 0, w, h).data; } catch (_) { return null; }
        var top = h, left = w, right = 0, bottom = 0;
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                if (data[(y * w + x) * 4 + 3] > 10) {
                    if (x < left) left = x;
                    if (x > right) right = x;
                    if (y < top) top = y;
                    if (y > bottom) bottom = y;
                }
            }
        }
        if (right < left || bottom < top) return null;
        var cw = right - left + 1, ch = bottom - top + 1;
        var out = document.createElement('canvas');
        out.width = cw;
        out.height = ch;
        out.getContext('2d').drawImage(cvs, left, top, cw, ch, 0, 0, cw, ch);
        return { src: out.toDataURL('image/png'), width: cw, height: ch, offsetX: left, offsetY: top, origW: w, origH: h };
    },

    /* ── 放置衣物到人偶上 ── */
    _placeItem(src, alt, category, pointerPos, dollRect) {
        var self = this;
        var dollArea = document.getElementById('wardrobe-doll-area');
        var existingSameName = dollArea.querySelector('.wardrobe-placed[data-alt="' + alt + '"]');
        if (existingSameName) {
            if (existingSameName._cleanup) existingSameName._cleanup();
            existingSameName.remove();
            this._placedItems = this._placedItems.filter(function(i) { return i.alt !== alt; });
            this._syncActiveState();
            return;
        }
        var offset = this.CLOTHING_OFFSETS[category] || this.CLOTHING_OFFSETS['tops'];

        // 加载图片 → 裁剪透明 → 放置
        var img = new Image();
        img.onload = function() {
            var crop = null;
            try { crop = self._cropTransparent(img); } catch (_) {}
            var placeW, placeH;
            if (crop) {
                // 按比例缩放到类别默认尺寸范围
                var maxW = offset.width, maxH = offset.height;
                var ratio = Math.min(maxW / crop.width, maxH / crop.height, 1);
                placeW = Math.round(crop.width * ratio);
                placeH = Math.round(crop.height * ratio);
            } else {
                placeW = offset.width;
                placeH = offset.height;
            }
            var relX = pointerPos.x - dollRect.left - placeW / 2;
            var relY = pointerPos.y - dollRect.top - placeH / 2;
            var finalLeft = Math.max(0, Math.min(relX, dollRect.width - placeW));
            var finalTop = Math.max(0, Math.min(relY, dollRect.height - placeH));
            var el = document.createElement('img');
            el.src = crop ? crop.src : src;
            el.alt = alt;
            el.className = 'wardrobe-placed';
            el.dataset.alt = alt;
            el.dataset.category = category;
            el.style.cssText = 'position:absolute;left:' + finalLeft + 'px;top:' + finalTop + 'px;width:' + placeW + 'px;height:' + placeH + 'px;image-rendering:pixelated;-webkit-user-drag:none;';
            self._makeDraggable(el, dollArea);
            dollArea.appendChild(el);
            self._placedItems.push({ src: src, alt: alt, category: category, el: el });
            self._syncActiveState();
        };
        img.src = src;
    },
    _makeDraggable(el, container) {
        const self = this;
        // 双击删除
        el.addEventListener('dblclick', () => {
            if (el._cleanup) el._cleanup();
            el.remove();
            self._placedItems = self._placedItems.filter(i => i.el !== el);
            self._syncActiveState();
            self._hideResizePopup();
        });
        
        // 单击显示调整大小面板
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            self._showResizePopup(el, container);
        });
        
        // ========== 安全读取数值 ==========
        function num(val, fallback) {
            var n = parseFloat(val);
            return isNaN(n) ? fallback : n;
        }
        
        // ========== 统一手势处理：拖拽 + 缩放 ==========
        var isDragging = false, isPinching = false;
        var startX, startY, startLeft, startTop;
        var touchStartDist = 0, touchStartW = 0, touchStartH = 0, touchStartL = 0, touchStartT = 0;
        
        function getTouchDistance(touches) {
            var dx = touches[0].clientX - touches[1].clientX;
            var dy = touches[0].clientY - touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }
        
        // 滚轮缩放（桌面端）
        el.addEventListener('wheel', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var delta = e.deltaY > 0 ? 0.9 : 1.1;
            var currentW = num(el.style.width, 60);
            var currentH = num(el.style.height, 80);
            var newW = Math.max(30, Math.min(currentW * delta, 500));
            var newH = Math.max(30, Math.min(currentH * delta, 800));
            var rect = container.getBoundingClientRect();
            var centerX = num(el.style.left, 0) + currentW / 2;
            var centerY = num(el.style.top, 0) + currentH / 2;
            el.style.width = newW + 'px';
            el.style.height = newH + 'px';
            el.style.left = Math.max(0, Math.min(centerX - newW / 2, rect.width - newW)) + 'px';
            el.style.top = Math.max(0, Math.min(centerY - newH / 2, rect.height - newH)) + 'px';
        }, { passive: false });
        
        // 触摸开始
        el.addEventListener('touchstart', function(e) {
            e.preventDefault();
            el.style.zIndex = '10';
            
            if (e.touches.length === 2) {
                // 双指 - 开始缩放
                isPinching = true;
                isDragging = false;
                touchStartDist = getTouchDistance(e.touches);
                touchStartW = num(el.style.width, 60);
                touchStartH = num(el.style.height, 80);
                touchStartL = num(el.style.left, 0);
                touchStartT = num(el.style.top, 0);
            } else if (e.touches.length === 1) {
                // 单指 - 开始拖拽
                isDragging = true;
                isPinching = false;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                startLeft = num(el.style.left, 0);
                startTop = num(el.style.top, 0);
            }
        }, { passive: false });
        
        // 触摸移动
        el.addEventListener('touchmove', function(e) {
            e.preventDefault();
            
            if (e.touches.length === 2 && isPinching) {
                // 双指缩放
                var currentDist = getTouchDistance(e.touches);
                var scale = currentDist / touchStartDist;
                var rect = container.getBoundingClientRect();
                var newW = Math.max(30, Math.min(touchStartW * scale, 500));
                var newH = Math.max(30, Math.min(touchStartH * scale, 800));
                var centerX = touchStartL + touchStartW / 2;
                var centerY = touchStartT + touchStartH / 2;
                el.style.width = newW + 'px';
                el.style.height = newH + 'px';
                el.style.left = Math.max(0, Math.min(centerX - newW / 2, rect.width - newW)) + 'px';
                el.style.top = Math.max(0, Math.min(centerY - newH / 2, rect.height - newH)) + 'px';
            } else if (e.touches.length === 1 && isDragging) {
                // 单指拖拽
                var dx = e.touches[0].clientX - startX;
                var dy = e.touches[0].clientY - startY;
                var rect = container.getBoundingClientRect();
                var w = num(el.style.width, 60);
                var h = num(el.style.height, 80);
                el.style.left = Math.max(0, Math.min(startLeft + dx, rect.width - w)) + 'px';
                el.style.top = Math.max(0, Math.min(startTop + dy, rect.height - h)) + 'px';
            }
        }, { passive: false });
        
        // 触摸结束
        el.addEventListener('touchend', function(e) {
            if (e.touches.length < 2) {
                isPinching = false;
                // 双指变单指时，无缝切换到拖拽
                if (e.touches.length === 1) {
                    isDragging = true;
                    startX = e.touches[0].clientX;
                    startY = e.touches[0].clientY;
                    startLeft = num(el.style.left, 0);
                    startTop = num(el.style.top, 0);
                }
            }
            if (e.touches.length === 0) {
                isDragging = false;
                isPinching = false;
                el.style.zIndex = '';
            }
        });
        
        // 鼠标拖拽（桌面端）
        function onMouseMove(e) {
            if (!isDragging || isPinching) return;
            var dx = e.clientX - startX;
            var dy = e.clientY - startY;
            var rect = container.getBoundingClientRect();
            var w = num(el.style.width, 60);
            var h = num(el.style.height, 80);
            el.style.left = Math.max(0, Math.min(startLeft + dx, rect.width - w)) + 'px';
            el.style.top = Math.max(0, Math.min(startTop + dy, rect.height - h)) + 'px';
        }
        function onMouseUp() {
            isDragging = false;
            el.style.zIndex = '';
        }
        el.addEventListener('mousedown', function(e) {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = num(el.style.left, 0);
            startTop = num(el.style.top, 0);
            el.style.zIndex = '10';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        // 元素销毁时清理 document 上的监听器
        el._cleanup = function() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    },
    /* ══════════════════════════════════════
       工具函数
       ══════════════════════════════════════ */
    _resetDoll() {
        const dollArea = document.getElementById('wardrobe-doll-area');
        dollArea.querySelectorAll('.wardrobe-placed').forEach(el => {
            if (el._cleanup) el._cleanup();
            el.remove();
        });
        this._placedItems = [];
        this._syncActiveState();
        this._hideResizePopup();
    },
    _downloadDoll() {
        const dollArea = document.getElementById('wardrobe-doll-area');
        const canvas = document.createElement('canvas');
        canvas.width = this.DOLL_W;
        canvas.height = this.DOLL_H;
        const ctx = canvas.getContext('2d');
        const images = [];
        const baseImg = document.getElementById('wardrobe-skintone');
        images.push({ el: baseImg, x: (this.DOLL_W - baseImg.naturalWidth * 1.3) / 2, y: (this.DOLL_H - baseImg.naturalHeight * 1.3) / 2, scale: 1.3 });
        const placed = Array.from(dollArea.querySelectorAll('.wardrobe-placed'));
        placed.forEach(img => {
            images.push({ el: img, x: parseFloat(img.style.left), y: parseFloat(img.style.top), scale: 1 });
        });
        const loadAndDraw = (idx) => {
            if (idx >= images.length) {
                const link = document.createElement('a');
                link.download = 'wardrobe-doll.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
                return;
            }
            const item = images[idx];
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                ctx.drawImage(img, item.x, item.y, img.width * item.scale, img.height * item.scale);
                loadAndDraw(idx + 1);
            };
            img.src = item.el.src;
        };
        loadAndDraw(0);
    },
    /* ── 调整大小面板 ── */
    _showResizePopup(el, container) {
        this._resizeTarget = el;
        this._resizeContainer = container;
        const popup = document.getElementById('wardrobe-resize-popup');
        const slider = document.getElementById('wardrobe-resize-slider');
        const valEl = document.getElementById('wardrobe-resize-val');
        // 记录原始尺寸
        if (!el._origW) {
            el._origW = parseFloat(el.style.width) || 60;
            el._origH = parseFloat(el.style.height) || 80;
        }
        const currentW = parseFloat(el.style.width) || el._origW;
        const pct = Math.round((currentW / el._origW) * 100);
        slider.value = pct;
        valEl.textContent = pct + '%';
        popup.style.display = 'flex';
        // 高亮选中
        document.querySelectorAll('.wardrobe-placed').forEach(p => p.style.outline = '');
        el.style.outline = '2px solid rgba(102,126,234,0.8)';
    },
    _hideResizePopup() {
        const popup = document.getElementById('wardrobe-resize-popup');
        if (popup) popup.style.display = 'none';
        document.querySelectorAll('.wardrobe-placed').forEach(p => p.style.outline = '');
        this._resizeTarget = null;
    },
    _applyResize(pct) {
        const el = this._resizeTarget;
        if (!el || !el._origW) return;
        const container = this._resizeContainer;
        const rect = container.getBoundingClientRect();
        const newW = Math.max(20, Math.round(el._origW * pct / 100));
        const newH = Math.max(20, Math.round(el._origH * pct / 100));
        const oldW = parseFloat(el.style.width) || el._origW;
        const oldH = parseFloat(el.style.height) || el._origH;
        const oldL = parseFloat(el.style.left) || 0;
        const oldT = parseFloat(el.style.top) || 0;
        // 保持中心点不变
        const cx = oldL + oldW / 2;
        const cy = oldT + oldH / 2;
        el.style.width = newW + 'px';
        el.style.height = newH + 'px';
        el.style.left = Math.max(0, Math.min(cx - newW / 2, rect.width - newW)) + 'px';
        el.style.top = Math.max(0, Math.min(cy - newH / 2, rect.height - newH)) + 'px';
    },
    async _loadCustomItems() {
        try {
            const db = await this._openDB();
            this._customItems = await db.getAll('clothes');
        } catch (_) {
            this._customItems = [];
        }
    },
    async _handleUpload() {
        const nameInput = document.getElementById('wardrobe-upload-name');
        const modal = document.getElementById('wardrobe-upload-modal');
        for (const file of this._uploadFiles) {
            const dataUrl = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
            const name = nameInput.value.trim() || file.name.replace(/\.[^/.]+$/, '');
            const item = { id: Date.now() + Math.random(), name, category: this._uploadCategory, dataUrl };
            try {
                const db = await this._openDB();
                await db.add('clothes', item);
                this._customItems.push(item);
            } catch (_) {}
        }
        this._buildClothingPanels();
        modal.classList.remove('visible');
    },
    async _removeCustomItem(id) {
        try {
            const db = await this._openDB();
            await db.delete('clothes', Number(id));
            this._customItems = this._customItems.filter(i => i.id !== Number(id));
            this._buildClothingPanels();
        } catch (_) {}
    },
    _openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open('wardrobe-custom', 1);
            req.onupgradeneeded = e => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('clothes')) db.createObjectStore('clothes', { keyPath: 'id' });
            };
            req.onsuccess = e => resolve(e.target.result);
            req.onerror = reject;
        });
    },
});

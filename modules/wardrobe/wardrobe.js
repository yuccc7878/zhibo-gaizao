/* ========================================
   Module: Wardrobe (衣帽间)
   独立换装系统模块 - v2
   ======================================== */

Engine.register({
    id: 'wardrobe',
    name: '衣帽间',
    icon: '👗',
    screen: 'wardrobe-screen',
    order: 7,

    // 人偶画布尺寸（原始像素画 111x291，放大 1.5 倍）
    DOLL_W: 166,
    DOLL_H: 436,
    SCALE: 1.5,

    // 各类衣物默认定位偏移（基于原始 111x291 画布，乘以 SCALE）
    // 格式: [left, top, width, height]（-1 表示自动）
    CLOTHING_OFFSETS: {
        'hair':     { left: 15, top: -20, width: 120, height: 160 },
        'tops':     { left: 15, top: 80,  width: 120, height: 120 },
        'bottoms':  { left: 20, top: 195, width: 110, height: 100 },
        'fullbody': { left: 10, top: 75,  width: 130, height: 260 },
    },

    init() {
        const screen = document.getElementById(this.screen);
        screen.innerHTML = `
            <div class="wardrobe-container">
                <div class="wardrobe-header">
                    <button class="back-btn" data-target="home-screen">‹</button>
                    <div class="title-container"><h1 class="title">👗 衣帽间</h1></div>
                    <div class="wardrobe-tools">
                        <button class="wardrobe-tool-btn" id="wardrobe-upload-btn" title="导入服装">📥</button>
                        <button class="wardrobe-tool-btn" id="wardrobe-download" title="下载人偶">💾</button>
                        <button class="wardrobe-tool-btn" id="wardrobe-reset" title="重置">🔄</button>
                    </div>
                </div>

                <div class="wardrobe-body">
                    <div class="wardrobe-doll-section">
                        <div class="wardrobe-doll-area" id="wardrobe-doll-area">
                            <img id="wardrobe-skintone" src="modules/wardrobe/base/Skintone/full/European 01 by Lotte V.png" alt="body">
                            <div id="wardrobe-avi-area"></div>
                        </div>
                        <div class="wardrobe-doll-hint">💡 穿戴后可拖拽调整位置</div>
                    </div>

                    <div class="wardrobe-skin-section">
                        <div class="wardrobe-section-title">🎨 肤色</div>
                        <div class="wardrobe-skin-grid" id="wardrobe-skin-grid"></div>
                    </div>
                </div>

                <div class="wardrobe-pieces-area">
                    <div class="wardrobe-tabs" id="wardrobe-tabs">
                        <button class="wardrobe-tab active" data-tab="hair">💇 发型</button>
                        <button class="wardrobe-tab" data-tab="tops">👕 上衣</button>
                        <button class="wardrobe-tab" data-tab="bottoms">👖 下装</button>
                        <button class="wardrobe-tab" data-tab="fullbody">👗 全身</button>
                    </div>
                    <div class="wardrobe-tab-panels" id="wardrobe-tab-panels">
                        <div class="wardrobe-tab-panel active" data-panel="hair"></div>
                        <div class="wardrobe-tab-panel" data-panel="tops"></div>
                        <div class="wardrobe-tab-panel" data-panel="bottoms"></div>
                        <div class="wardrobe-tab-panel" data-panel="fullbody"></div>
                    </div>
                </div>

                <div class="wardrobe-hint">拖拽衣物到人偶 · 点击缩略图换肤色 · 📥 导入自己的服装</div>

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
        this._placedItems = []; // 已穿戴的衣物

        // 清理旧版自定义衣物（全量替换素材后无需保留旧数据）
        try { Dexie.delete('wardrobe-custom'); } catch (_) {}

        this._loadCustomItems().then(() => {
            this._buildSkinGrid();
            this._buildClothingPanels();
            this._bindEvents();
        });
    },

    open() {
        switchScreen(this.screen);
    },

    /* ══════════════════════════════════════
       构建 UI
       ══════════════════════════════════════ */

    _buildSkinGrid() {
        const grid = document.getElementById('wardrobe-skin-grid');
        const skins = [
            'Afro-Asian 01', 'Afro-Asian 02', 'Afro-Asian 03',
            'Eurasian 01', 'Eurasian-Native 01', 'Eurasian-Native 02',
            'Eurasian-Native 03', 'Eurasian-Native 04',
            'European 01', 'European 02',
            'Fantasy (Blue)', 'Fantasy (Green)', 'Fantasy (Pure white)',
            'Fantasy (Purple)', 'Fantasy (Red)'
        ];
        grid.innerHTML = skins.map(s =>
            `<a href="#" class="wardrobe-skin-thumb" data-skin="${s}">
                <img src="modules/wardrobe/base/Skintone/thumbnails/${s} by Lotte V.png" alt="${s}">
            </a>`
        ).join('');
    },

    _buildClothingPanels() {
        const categories = {
            hair: ['棕短发', '棕马尾', '橙卷发', '橙短发', '浅金卷', '红棕卷', '红马尾', '金星发'],
            tops: ['牛仔外套', '红帽衫', '条纹衫', '格子衫', '牛仔衣', '运动衫',
                   '条纹短袖', '橙色外套', '深蓝夹克', '红格衬衫', '红色连帽',
                   '绿色夹克', '花朵外套', '蓝色卫衣'],
            bottoms: ['工装长裤', '条纹长裤', '格纹短裙', '牛仔短裤', '牛仔长裤',
                      '百褶短裙', '碎花短裙', '运动短裤'],
            fullbody: ['彩点裙', '波点裙', '工装服', '运动服',
                       '星空裙', '月光裙', '枫糖裙', '樱花裙',
                       '浅海裙', '甜心裙', '草莓裙', '薄荷裙']
        };

        const folderMap = { hair: 'Hair', tops: 'Tops', bottoms: 'Bottoms', fullbody: 'Full-body' };

        for (const [key, items] of Object.entries(categories)) {
            const panel = document.querySelector(`[data-panel="${key}"]`);
            let html = items.map(name => {
                const folder = folderMap[key];
                const displayName = name;
                return `<img src="modules/wardrobe/images/${folder}/${name}.png"
                             alt="${displayName}" title="${displayName}"
                             class="wardrobe-piece" data-category="${key}">`;
            }).join('');

            const custom = this._customItems.filter(i => i.category === key);
            if (custom.length) {
                html += custom.map(item =>
                    `<img src="${item.dataUrl}" alt="${item.name}" title="${item.name}（自定义·右键删除）"
                          class="wardrobe-piece wardrobe-piece-custom" data-category="${key}" data-custom-id="${item.id}">`
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

        // 肤色切换
        document.getElementById('wardrobe-skin-grid').addEventListener('click', (e) => {
            const thumb = e.target.closest('.wardrobe-skin-thumb');
            if (!thumb) return;
            e.preventDefault();
            const skin = thumb.dataset.skin;
            document.getElementById('wardrobe-skintone').src = `modules/wardrobe/base/Skintone/full/${skin} by Lotte V.png`;
        });

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
            const img = e.target.closest('.wardrobe-piece-custom');
            if (!img) return;
            e.preventDefault();
            if (confirm(`删除「${img.alt}」？`)) self._removeCustomItem(img.dataset.customId);
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
       拖拽系统（核心改进）
       ══════════════════════════════════════ */

    _initDragDrop() {
        const self = this;
        const panels = document.getElementById('wardrobe-tab-panels');
        const dollArea = document.getElementById('wardrobe-doll-area');

        let dragClone = null, dragSrc = null, dragCategory = null;

        const getPos = (e) => {
            if (e.touches && e.touches.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
            if (e.changedTouches && e.changedTouches.length) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
            return { x: e.clientX, y: e.clientY };
        };

        // 从衣物列表拖出
        const onStart = (e) => {
            const img = e.target.closest('.wardrobe-piece');
            if (!img) return;
            dragSrc = img;
            dragCategory = img.dataset.category || 'tops';

            dragClone = document.createElement('img');
            dragClone.src = img.src;
            dragClone.style.cssText = `position:fixed;z-index:9999;pointer-events:none;opacity:0.85;width:56px;height:56px;object-fit:contain;image-rendering:pixelated;border:2px solid rgba(100,180,255,0.8);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.4);`;
            document.body.appendChild(dragClone);

            const p = getPos(e);
            dragClone.style.left = (p.x - 28) + 'px';
            dragClone.style.top = (p.y - 28) + 'px';
        };

        const onMove = (e) => {
            if (!dragClone) return;
            e.preventDefault();
            const p = getPos(e);
            dragClone.style.left = (p.x - 28) + 'px';
            dragClone.style.top = (p.y - 28) + 'px';
        };

        const onEnd = (e) => {
            if (!dragClone || !dragSrc) { cleanup(); return; }
            const p = getPos(e);
            const rect = dollArea.getBoundingClientRect();
            if (p.x >= rect.left && p.x <= rect.right && p.y >= rect.top && p.y <= rect.bottom) {
                self._placeItem(dragSrc.src, dragSrc.alt, dragCategory, p, rect);
            }
            cleanup();
        };

        const cleanup = () => {
            if (dragClone) { dragClone.remove(); dragClone = null; }
            dragSrc = null;
        };

        // 点击穿戴
        panels.addEventListener('click', (e) => {
            const img = e.target.closest('.wardrobe-piece');
            if (!img) return;
            const cat = img.dataset.category || 'tops';
            const rect = dollArea.getBoundingClientRect();
            const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 3 };
            self._placeItem(img.src, img.alt, cat, center, rect);
        });

        panels.addEventListener('touchstart', onStart, { passive: true });
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
        panels.addEventListener('mousedown', onStart);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
    },

    /* ── 放置衣物到人偶上 ── */
    _placeItem(src, alt, category, pointerPos, dollRect) {
        const dollArea = document.getElementById('wardrobe-doll-area');

        // 同类衣物替换（同 category 只保留一个，同名则移除）
        const existingSameName = dollArea.querySelector(`.wardrobe-placed[data-alt="${alt}"]`);
        if (existingSameName) {
            existingSameName.remove();
            this._placedItems = this._placedItems.filter(i => i.alt !== alt);
            return;
        }

        // 获取该类别的默认偏移
        const offset = this.CLOTHING_OFFSETS[category] || this.CLOTHING_OFFSETS['tops'];

        // 计算相对于 dollArea 的位置
        const relX = pointerPos.x - dollRect.left - offset.width / 2;
        const relY = pointerPos.y - dollRect.top - offset.height / 2;

        // 限制在区域内
        const finalLeft = Math.max(0, Math.min(relX, dollRect.width - offset.width));
        const finalTop = Math.max(0, Math.min(relY, dollRect.height - offset.height));

        const el = document.createElement('img');
        el.src = src;
        el.alt = alt;
        el.className = 'wardrobe-placed';
        el.style.cssText = `
            position: absolute;
            left: ${finalLeft}px;
            top: ${finalTop}px;
            width: ${offset.width}px;
            height: ${offset.height}px;
            object-fit: contain;
            image-rendering: pixelated;
            z-index: ${10 + this._placedItems.length};
            cursor: move;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
        `;
        dollArea.appendChild(el);
        this._placedItems.push({ el, alt, category });

        // 使已放置的衣物可拖拽调整位置
        this._makeDraggable(el);
    },

    /* ── 已放置衣物：拖拽移动 + 缩放 + 选中 ── */
    _makeDraggable(el) {
        const self = this;
        let startX, startY, origLeft, origTop, isDragging = false;
        let selected = false;
        let pinchStartDist = 0, pinchStartW = 0, pinchStartH = 0;

        const getPos = (e) => {
            if (e.touches && e.touches.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
            return { x: e.clientX, y: e.clientY };
        };

        const getTouchDist = (e) => {
            if (!e.touches || e.touches.length < 2) return 0;
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };

        const selectItem = () => {
            // 取消其他选中
            document.querySelectorAll('.wardrobe-placed.selected').forEach(e => {
                e.classList.remove('selected');
                e.style.outline = 'none';
            });
            selected = true;
            el.classList.add('selected');
            el.style.outline = '2px solid rgba(100,180,255,0.9)';
            el.style.outlineOffset = '-1px';
            self._showResizeSlider(el);
        };

        const deselectItem = () => {
            selected = false;
            el.classList.remove('selected');
            el.style.outline = 'none';
            self._hideResizeSlider();
        };

        // ── 触摸事件 ──
        el.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            if (e.touches.length === 2) {
                // 双指 = 缩放
                isDragging = false;
                pinchStartDist = getTouchDist(e);
                pinchStartW = el.offsetWidth;
                pinchStartH = el.offsetHeight;
                return;
            }
            isDragging = true;
            el.style.cursor = 'grabbing';
            const p = getPos(e);
            startX = p.x; startY = p.y;
            origLeft = parseInt(el.style.left) || 0;
            origTop = parseInt(el.style.top) || 0;
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            // 双指缩放
            if (pinchStartDist > 0 && e.touches.length === 2) {
                e.preventDefault();
                const dist = getTouchDist(e);
                const scale = dist / pinchStartDist;
                const newW = Math.max(30, Math.min(pinchStartW * scale, 300));
                const newH = Math.max(30, Math.min(pinchStartH * scale, 400));
                el.style.width = newW + 'px';
                el.style.height = newH + 'px';
                self._updateResizeSliderValue(el);
                return;
            }
            if (!isDragging) return;
            e.preventDefault();
            const p = getPos(e);
            const dx = p.x - startX, dy = p.y - startY;
            const parent = el.parentElement;
            el.style.left = Math.max(0, Math.min(origLeft + dx, parent.offsetWidth - el.offsetWidth)) + 'px';
            el.style.top = Math.max(0, Math.min(origTop + dy, parent.offsetHeight - el.offsetHeight)) + 'px';
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            if (pinchStartDist > 0 && e.touches.length < 2) {
                pinchStartDist = 0;
                selectItem();
                return;
            }
            if (!isDragging) return;
            isDragging = false;
            el.style.cursor = 'move';
            selectItem();
        });

        // ── 鼠标事件 ──
        el.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            isDragging = true;
            el.style.cursor = 'grabbing';
            startX = e.clientX; startY = e.clientY;
            origLeft = parseInt(el.style.left) || 0;
            origTop = parseInt(el.style.top) || 0;
        });

        const onMouseMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const dx = e.clientX - startX, dy = e.clientY - startY;
            const parent = el.parentElement;
            el.style.left = Math.max(0, Math.min(origLeft + dx, parent.offsetWidth - el.offsetWidth)) + 'px';
            el.style.top = Math.max(0, Math.min(origTop + dy, parent.offsetHeight - el.offsetHeight)) + 'px';
        };

        const onMouseUp = () => {
            if (!isDragging) return;
            isDragging = false;
            el.style.cursor = 'move';
            selectItem();
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        // 点击空白处取消选中
        document.getElementById('wardrobe-doll-area').addEventListener('click', (e) => {
            if (e.target === document.getElementById('wardrobe-doll-area') ||
                e.target === document.getElementById('wardrobe-skintone')) {
                deselectItem();
            }
        });

        // 双击移除
        el.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            deselectItem();
            el.remove();
            self._placedItems = self._placedItems.filter(i => i.el !== el);
        });
    },

    /* ── 缩放滑块 UI ── */
    _resizeSliderEl: null,

    _showResizeSlider(targetEl) {
        const self = this;
        if (!this._resizeSliderEl) {
            const wrapper = document.createElement('div');
            wrapper.className = 'wardrobe-resize-popup';
            wrapper.innerHTML = `
                <div class="wardrobe-resize-row">
                    <span class="wardrobe-resize-label">🔍</span>
                    <input type="range" class="wardrobe-resize-slider" min="30" max="300" value="100" step="5">
                    <span class="wardrobe-resize-val">100%</span>
                </div>
                <div class="wardrobe-resize-row">
                    <button class="wardrobe-resize-btn" data-scale="0.5">小</button>
                    <button class="wardrobe-resize-btn" data-scale="1">中</button>
                    <button class="wardrobe-resize-btn" data-scale="1.5">大</button>
                    <button class="wardrobe-resize-btn" data-scale="2.5">特大</button>
                </div>`;
            document.getElementById('wardrobe-doll-area').appendChild(wrapper);
            this._resizeSliderEl = wrapper;

            // 滑块事件
            const slider = wrapper.querySelector('.wardrobe-resize-slider');
            slider.addEventListener('input', () => {
                self._applyResize(targetEl, parseInt(slider.value));
            });

            // 预设按钮
            wrapper.querySelectorAll('.wardrobe-resize-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const scale = parseFloat(btn.dataset.scale);
                    self._applyResize(targetEl, scale * 100);
                    slider.value = scale * 100;
                });
            });
        }

        // 更新当前值
        this._resizeSliderEl._targetEl = targetEl;
        this._updateResizeSliderValue(targetEl);
        this._resizeSliderEl.style.display = 'flex';
    },

    _hideResizeSlider() {
        if (this._resizeSliderEl) {
            this._resizeSliderEl.style.display = 'none';
        }
    },

    _updateResizeSliderValue(el) {
        if (!this._resizeSliderEl) return;
        const w = el.offsetWidth;
        const cat = this._placedItems.find(i => i.el === el)?.category || 'tops';
        const baseW = (this.CLOTHING_OFFSETS[cat] || this.CLOTHING_OFFSETS['tops']).width;
        const pct = Math.round((w / baseW) * 100);
        this._resizeSliderEl.querySelector('.wardrobe-resize-slider').value = pct;
        this._resizeSliderEl.querySelector('.wardrobe-resize-val').textContent = pct + '%';
    },

    _applyResize(el, pct) {
        const cat = this._placedItems.find(i => i.el === el)?.category || 'tops';
        const base = this.CLOTHING_OFFSETS[cat] || this.CLOTHING_OFFSETS['tops'];
        const scale = pct / 100;
        el.style.width = Math.round(base.width * scale) + 'px';
        el.style.height = Math.round(base.height * scale) + 'px';
        if (this._resizeSliderEl) {
            this._resizeSliderEl.querySelector('.wardrobe-resize-val').textContent = Math.round(pct) + '%';
        }
    },

    /* ── 重置 ── */
    _resetDoll() {
        document.getElementById('wardrobe-doll-area').querySelectorAll('.wardrobe-placed').forEach(el => el.remove());
        this._placedItems = [];
        document.getElementById('wardrobe-skintone').src = 'modules/wardrobe/base/Skintone/full/European 01 by Lotte V.png';
    },

    /* ══════════════════════════════════════
       IndexedDB 自定义衣物
       ══════════════════════════════════════ */

    _getDb() { return new Dexie('wardrobe-custom'); },

    async _loadCustomItems() {
        try {
            const db = this._getDb();
            db.version(1).stores({ items: 'id,category,name' });
            this._customItems = await db.items.toArray();
        } catch (e) {
            this._customItems = [];
        }
    },

    async _saveCustomItem(item) {
        try {
            const db = this._getDb();
            db.version(1).stores({ items: 'id,category,name' });
            await db.items.put(item);
            this._customItems.push(item);
        } catch (e) { console.error('[Wardrobe] save failed:', e); }
    },

    async _removeCustomItem(id) {
        try {
            const db = this._getDb();
            db.version(1).stores({ items: 'id,category,name' });
            await db.items.delete(id);
            this._customItems = this._customItems.filter(i => i.id !== id);
            this._buildClothingPanels();
            showToast('已删除');
        } catch (e) { console.error('[Wardrobe] remove failed:', e); }
    },

    async _handleUpload() {
        const files = this._uploadFiles;
        const category = this._uploadCategory;
        if (!files.length) return;
        const btn = document.getElementById('wardrobe-upload-confirm');
        btn.disabled = true;
        btn.textContent = '处理中...';
        let count = 0;
        for (const file of files) {
            try {
                const dataUrl = await new Promise((res, rej) => {
                    const r = new FileReader();
                    r.onload = () => res(r.result);
                    r.onerror = rej;
                    r.readAsDataURL(file);
                });
                const nameInput = document.getElementById('wardrobe-upload-name');
                const name = (files.length === 1 && nameInput.value.trim()) ? nameInput.value.trim() : file.name.replace(/\.(png|jpg|jpeg|webp)$/i, '');
                await this._saveCustomItem({ id: 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), category, name, dataUrl, timestamp: Date.now() });
                count++;
            } catch (e) { console.warn('upload fail:', file.name, e); }
        }
        this._buildClothingPanels();
        document.getElementById('wardrobe-upload-modal').classList.remove('visible');
        showToast(`已添加 ${count} 件服装！`);
        btn.textContent = '添加';
    },

    /* ══════════════════════════════════════
       导出
       ══════════════════════════════════════ */

    _downloadDoll() {
        const dollArea = document.getElementById('wardrobe-doll-area');
        if (typeof html2canvas === 'undefined') { showToast('html2canvas 未加载'); return; }

        // 临时隐藏拖拽边框
        dollArea.querySelectorAll('.wardrobe-placed').forEach(el => { el.style.outline = 'none'; });

        html2canvas(dollArea, {
            backgroundColor: null, allowTaint: true, useCORS: true,
            scale: 2, imageSmoothingEnabled: false,
        }).then(canvas => {
            canvas.toBlob(blob => {
                try {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'my_doll.png';
                    a.click();
                    URL.revokeObjectURL(a.href);
                    showToast('已保存！');
                } catch (e) { showToast('导出失败'); }
            });
        }).catch(e => showToast('截图失败'));
    }
});

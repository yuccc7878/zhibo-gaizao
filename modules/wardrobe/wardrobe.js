/* ========================================
   Module: Wardrobe (衣帽间)
   独立换装系统模块
   ======================================== */

Engine.register({
    id: 'wardrobe',
    name: '衣帽间',
    icon: '👗',
    screen: 'wardrobe-screen',
    order: 7,

    init() {
        const screen = document.getElementById(this.screen);
        screen.innerHTML = `
            <div class="wardrobe-container">
                <div class="wardrobe-header">
                    <button class="back-btn" data-target="home-screen">‹</button>
                    <div class="title-container"><h1 class="title">👗 衣帽间</h1></div>
                    <div class="wardrobe-tools">
                        <button class="wardrobe-tool-btn" id="wardrobe-upload-btn" title="导入服装">📥</button>
                        <button class="wardrobe-tool-btn" id="wardrobe-download">💾</button>
                        <button class="wardrobe-tool-btn" id="wardrobe-reset">🔄</button>
                    </div>
                </div>

                <div class="wardrobe-body">
                    <!-- 人偶展示区 -->
                    <div class="wardrobe-doll-area" id="wardrobe-doll-area">
                        <img id="wardrobe-skintone" class="wardrobe-clickable" src="modules/wardrobe/base/Skintone/full/European 01 by Lotte V.png" alt="European 01">
                        <div id="wardrobe-avi-area"></div>
                    </div>

                    <!-- 肤色选择 -->
                    <div class="wardrobe-skin-section">
                        <div class="wardrobe-section-title">🎨 肤色</div>
                        <div class="wardrobe-skin-grid" id="wardrobe-skin-grid"></div>
                    </div>
                </div>

                <!-- 衣物选择区 -->
                <div class="wardrobe-pieces-area">
                    <div class="wardrobe-tabs" id="wardrobe-tabs">
                        <button class="wardrobe-tab active" data-tab="tops">👕 上衣</button>
                        <button class="wardrobe-tab" data-tab="bottoms">👖 下装</button>
                        <button class="wardrobe-tab" data-tab="fullbody">👗 全身</button>
                    </div>
                    <div class="wardrobe-tab-panels" id="wardrobe-tab-panels">
                        <div class="wardrobe-tab-panel active" data-panel="tops"></div>
                        <div class="wardrobe-tab-panel" data-panel="bottoms"></div>
                        <div class="wardrobe-tab-panel" data-panel="fullbody"></div>
                    </div>
                </div>

                <!-- 使用提示 -->
                <div class="wardrobe-hint">💡 拖拽衣物到人偶身上换装 · 点击缩略图切换肤色 · 📥 导入自己的服装</div>

                <!-- 上传弹窗 -->
                <div id="wardrobe-upload-modal" class="wardrobe-modal-overlay">
                    <div class="wardrobe-modal">
                        <div class="wardrobe-modal-title">📥 导入服装</div>
                        <div class="wardrobe-modal-body">
                            <div id="wardrobe-upload-preview" class="wardrobe-upload-preview">
                                <span>点击下方选择图片</span>
                            </div>
                            <input type="file" id="wardrobe-file-input" accept="image/png,image/jpeg,image/webp" style="display:none;" multiple>
                            <button class="wardrobe-modal-btn wardrobe-modal-btn-secondary" id="wardrobe-choose-file">选择图片文件</button>
                            <div class="wardrobe-upload-category">
                                <div class="wardrobe-upload-cat-label">选择分类：</div>
                                <div class="wardrobe-upload-cat-btns">
                                    <button class="wardrobe-cat-btn active" data-cat="tops">👕 上衣</button>
                                    <button class="wardrobe-cat-btn" data-cat="bottoms">👖 下装</button>
                                    <button class="wardrobe-cat-btn" data-cat="fullbody">👗 全身</button>
                                </div>
                            </div>
                            <div class="wardrobe-upload-name-row">
                                <input type="text" id="wardrobe-upload-name" class="wardrobe-upload-name-input" placeholder="服装名称（选填）">
                            </div>
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
        this._loadCustomItems().then(() => {
            this._buildSkinGrid();
            this._buildClothingPanels();
            this._bindEvents();
        });
    },

    open() {
        switchScreen(this.screen);
    },

    /* ── 构建肤色网格 ── */
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

    /* ── IndexedDB 存取自定义衣物 ── */
    _getDb() {
        return new Dexie('wardrobe-custom');
    },

    async _loadCustomItems() {
        try {
            const db = this._getDb();
            db.version(1).stores({ items: 'id,category,name' });
            this._customItems = await db.items.toArray();
        } catch (e) {
            console.warn('[Wardrobe] Failed to load custom items:', e);
            this._customItems = [];
        }
    },

    async _saveCustomItem(item) {
        try {
            const db = this._getDb();
            db.version(1).stores({ items: 'id,category,name' });
            await db.items.put(item);
            this._customItems.push(item);
        } catch (e) {
            console.error('[Wardrobe] Failed to save item:', e);
        }
    },

    async _removeCustomItem(id) {
        try {
            const db = this._getDb();
            db.version(1).stores({ items: 'id,category,name' });
            await db.items.delete(id);
            this._customItems = this._customItems.filter(i => i.id !== id);
            this._buildClothingPanels();
            this._rebindDrag();
            showToast('已删除');
        } catch (e) {
            console.error('[Wardrobe] Failed to remove item:', e);
        }
    },

    /* ── 处理上传 ── */
    async _handleUpload() {
        const files = this._uploadFiles;
        const category = this._uploadCategory;
        if (!files.length) return;

        const confirmBtn = document.getElementById('wardrobe-upload-confirm');
        confirmBtn.disabled = true;
        confirmBtn.textContent = '处理中...';

        let count = 0;
        for (const file of files) {
            try {
                const dataUrl = await this._fileToDataUrl(file);
                const nameInput = document.getElementById('wardrobe-upload-name');
                const name = (files.length === 1 && nameInput.value.trim())
                    ? nameInput.value.trim()
                    : file.name.replace(/\.(png|jpg|jpeg|webp)$/i, '');

                const item = {
                    id: 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                    category: category,
                    name: name,
                    dataUrl: dataUrl,
                    timestamp: Date.now()
                };

                await this._saveCustomItem(item);
                count++;
            } catch (e) {
                console.warn('[Wardrobe] Failed to process file:', file.name, e);
            }
        }

        // 刷新面板
        this._buildClothingPanels();
        this._rebindDrag();

        // 关闭弹窗
        document.getElementById('wardrobe-upload-modal').classList.remove('visible');
        showToast(`已添加 ${count} 件服装！`);
        confirmBtn.textContent = '添加';
    },

    _fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    /* ── 重新绑定拖拽（面板刷新后调用） ── */
    _rebindDrag() {
        // 清理旧的事件监听会比较复杂，由于面板重建后 DOM 已更新
        // click 事件委托在 panels 上所以不需要重新绑定
        // 拖拽也使用事件委托，所以自动生效
    },

    /* ── 构建衣物面板（含自定义衣物） ── */
    _buildClothingPanels() {
        const categories = {
            tops: [
                'Bra 001 (Black) by Lotte V', 'Bra 001 (Indigo) by Lotte V', 'Bra 001 (Pink) by Lotte V', 'Bra 001 (White) by Lotte V',
                'Crop Top 001 (Black)', 'Crop Top 001 (Blue)', 'Crop Top 001 (Green)', 'Crop Top 001 (Orange)',
                'Crop Top 001 (Pink)', 'Crop Top 001 (Purple)', 'Crop Top 001 (Red)', 'Crop Top 001 (White)', 'Crop Top 001 (Yellow)',
                'T-Shirt 001 (Black) by Lotte V', 'T-Shirt 001 (Indigo) by Lotte V', 'T-Shirt 001 (Pink) by Lotte V',
                'T-Shirt 001 (White) by Lotte V', 'T-Shirt 001 (Yellow) by Lotte V',
                'Tank Top 001 (Black)', 'Tank Top 001 (Blue)', 'Tank Top 001 (Green)', 'Tank Top 001 (Orange)',
                'Tank Top 001 (Pink)', 'Tank Top 001 (Purple)', 'Tank Top 001 (Red)', 'Tank Top 001 (White)', 'Tank Top 001 (Yellow)',
                'Long Sleeve 001 (Black)', 'Long Sleeve 001 (Blue)', 'Long Sleeve 001 (Green)', 'Long Sleeve 001 (Orange)',
                'Long Sleeve 001 (Pink)', 'Long Sleeve 001 (Purple)', 'Long Sleeve 001 (Red)', 'Long Sleeve 001 (White)', 'Long Sleeve 001 (Yellow)',
                'Hoodie 001 (Black)', 'Hoodie 001 (Blue)', 'Hoodie 001 (Green)', 'Hoodie 001 (Orange)',
                'Hoodie 001 (Pink)', 'Hoodie 001 (Purple)', 'Hoodie 001 (Red)', 'Hoodie 001 (White)', 'Hoodie 001 (Yellow)'
            ],
            bottoms: [
                'Panties (Black) by Lotte V', 'Panties (Indigo) by Lotte V', 'Panties (Pink) by Lotte V', 'Panties (White) by Lotte V',
                'Skirt 001 (Black) by Lotte V', 'Skirt 001 (Indigo) by Lotte V', 'Skirt 001 (Pink) by Lotte V',
                'Skirt 001 (White) by Lotte V', 'Skirt 001 (Yellow) by Lotte V',
                'Shorts 001 (Black)', 'Shorts 001 (Blue)', 'Shorts 001 (Green)', 'Shorts 001 (Orange)',
                'Shorts 001 (Pink)', 'Shorts 001 (Purple)', 'Shorts 001 (Red)', 'Shorts 001 (White)', 'Shorts 001 (Yellow)',
                'Pants 001 (Black)', 'Pants 001 (Blue)', 'Pants 001 (Green)', 'Pants 001 (Orange)',
                'Pants 001 (Pink)', 'Pants 001 (Purple)', 'Pants 001 (Red)', 'Pants 001 (White)', 'Pants 001 (Yellow)',
                'Pencil Skirt 001 (Black)', 'Pencil Skirt 001 (Blue)', 'Pencil Skirt 001 (Green)', 'Pencil Skirt 001 (Orange)',
                'Pencil Skirt 001 (Pink)', 'Pencil Skirt 001 (Purple)', 'Pencil Skirt 001 (Red)', 'Pencil Skirt 001 (White)', 'Pencil Skirt 001 (Yellow)'
            ],
            fullbody: [
                'Dress 001 (Black) by Lotte V', 'Dress 001 (Indigo) by Lotte V', 'Dress 001 (Pink) by Lotte V',
                'Dress 001 (Red) by Lotte V', 'Dress 001 (White) by Lotte V', 'Dress 001 (Yellow) by Lotte V',
                'Jacket 001 (Black)', 'Jacket 001 (Blue)', 'Jacket 001 (Green)', 'Jacket 001 (Orange)',
                'Jacket 001 (Pink)', 'Jacket 001 (Purple)', 'Jacket 001 (Red)', 'Jacket 001 (White)', 'Jacket 001 (Yellow)',
                'Coat 001 (Black)', 'Coat 001 (Blue)', 'Coat 001 (Green)', 'Coat 001 (Orange)',
                'Coat 001 (Pink)', 'Coat 001 (Purple)', 'Coat 001 (Red)', 'Coat 001 (White)', 'Coat 001 (Yellow)',
                'Kimono 001 (Black)', 'Kimono 001 (Blue)', 'Kimono 001 (Green)', 'Kimono 001 (Orange)',
                'Kimono 001 (Pink)', 'Kimono 001 (Purple)', 'Kimono 001 (Red)', 'Kimono 001 (White)', 'Kimono 001 (Yellow)'
            ]
        };

        const folderMap = { tops: 'Tops', bottoms: 'Bottoms', fullbody: 'Full-body' };

        for (const [key, items] of Object.entries(categories)) {
            const panel = document.querySelector(`[data-panel="${key}"]`);
            // 内置衣物
            let html = items.map(name => {
                const folder = folderMap[key];
                const displayName = name.replace(/ by Lotte V$/, '');
                return `<img src="modules/wardrobe/images/${folder}/${name}.png"
                             alt="${displayName}" title="${displayName}"
                             class="wardrobe-piece">`;
            }).join('');
            // 自定义衣物
            const custom = this._customItems.filter(i => i.category === key);
            if (custom.length) {
                html += custom.map(item =>
                    `<img src="${item.dataUrl}"
                         alt="${item.name}" title="${item.name}（自定义 · 长按删除）"
                         class="wardrobe-piece wardrobe-piece-custom"
                         data-custom-id="${item.id}">`
                ).join('');
            }
            panel.innerHTML = html;
        }
    },

    /* ── 事件绑定 ── */
    _bindEvents() {
        const self = this;

        // 肤色切换
        document.getElementById('wardrobe-skin-grid').addEventListener('click', (e) => {
            const thumb = e.target.closest('.wardrobe-skin-thumb');
            if (!thumb) return;
            e.preventDefault();
            const skin = thumb.dataset.skin;
            const skintone = document.getElementById('wardrobe-skintone');
            skintone.src = `modules/wardrobe/base/Skintone/full/${skin} by Lotte V.png`;
            skintone.alt = skin;
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

        // 拖拽衣物
        this._initDragDrop();

        // 下载按钮
        document.getElementById('wardrobe-download').addEventListener('click', () => self._downloadDoll());

        // 重置按钮
        document.getElementById('wardrobe-reset').addEventListener('click', () => {
            document.querySelectorAll('#wardrobe-doll-area .wardrobe-piece-clone').forEach(el => el.remove());
            document.getElementById('wardrobe-skintone').src = 'modules/wardrobe/base/Skintone/full/European 01 by Lotte V.png';
        });

        // ── 上传相关 ──
        const uploadModal = document.getElementById('wardrobe-upload-modal');
        const fileInput = document.getElementById('wardrobe-file-input');
        const preview = document.getElementById('wardrobe-upload-preview');
        const nameInput = document.getElementById('wardrobe-upload-name');
        const confirmBtn = document.getElementById('wardrobe-upload-confirm');

        // 打开上传弹窗
        document.getElementById('wardrobe-upload-btn').addEventListener('click', () => {
            self._uploadFiles = [];
            fileInput.value = '';
            nameInput.value = '';
            preview.innerHTML = '<span>点击下方选择图片</span>';
            confirmBtn.disabled = true;
            uploadModal.classList.add('visible');
        });

        // 取消
        document.getElementById('wardrobe-upload-cancel').addEventListener('click', () => {
            uploadModal.classList.remove('visible');
        });

        // 点击遮罩关闭
        uploadModal.addEventListener('click', (e) => {
            if (e.target === uploadModal) uploadModal.classList.remove('visible');
        });

        // 选择文件
        document.getElementById('wardrobe-choose-file').addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
            if (!files.length) return;
            self._uploadFiles = files;
            // 预览第一张
            const reader = new FileReader();
            reader.onload = (ev) => {
                preview.innerHTML = `<img src="${ev.target.result}" style="max-width:100%;max-height:100%;image-rendering:pixelated;">`;
                if (files.length > 1) {
                    preview.innerHTML += `<div style="position:absolute;bottom:4px;right:6px;background:rgba(0,0,0,0.6);color:#fff;font-size:11px;padding:2px 6px;border-radius:4px;">+${files.length - 1} 张</div>`;
                }
            };
            reader.readAsDataURL(files[0]);
            confirmBtn.disabled = false;
        });

        // 分类选择
        document.querySelectorAll('.wardrobe-cat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.wardrobe-cat-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                self._uploadCategory = btn.dataset.cat;
            });
        });

        // 确认上传
        confirmBtn.addEventListener('click', () => self._handleUpload());

        // 长按删除自定义衣物
        document.getElementById('wardrobe-tab-panels').addEventListener('contextmenu', (e) => {
            const img = e.target.closest('.wardrobe-piece');
            if (!img || !img.dataset.customId) return;
            e.preventDefault();
            if (confirm(`删除「${img.alt}」？`)) {
                self._removeCustomItem(img.dataset.customId);
            }
        });
    },

    _dragClone: null,
    _dragSrc: null,

    /* ── 初始化拖拽（纯 JS 实现，无外部依赖） ── */
    _initDragDrop() {
        const self = this;
        const panels = document.getElementById('wardrobe-tab-panels');

        // 触摸/鼠标开始拖拽
        const onPointerDown = (e) => {
            const img = e.target.closest('.wardrobe-piece');
            if (!img) return;
            self._dragSrc = img;
            self._dragClone = img.cloneNode(true);
            self._dragClone.style.cssText = `
                position:fixed;z-index:9999;pointer-events:none;opacity:0.8;
                width:48px;height:48px;image-rendering:pixelated;
                border:2px solid rgba(100,180,255,0.8);border-radius:8px;
                box-shadow:0 4px 16px rgba(0,0,0,0.4);
            `;
            document.body.appendChild(self._dragClone);
            const pos = self._getPointerPos(e);
            self._dragClone.style.left = (pos.x - 24) + 'px';
            self._dragClone.style.top = (pos.y - 24) + 'px';
        };

        // 移动
        const onPointerMove = (e) => {
            if (!self._dragClone) return;
            e.preventDefault();
            const pos = self._getPointerPos(e);
            self._dragClone.style.left = (pos.x - 24) + 'px';
            self._dragClone.style.top = (pos.y - 24) + 'px';
        };

        // 释放
        const onPointerUp = (e) => {
            if (!self._dragClone || !self._dragSrc) { self._cleanupDrag(); return; }
            const pos = self._getPointerPos(e);
            const dollArea = document.getElementById('wardrobe-doll-area');
            const rect = dollArea.getBoundingClientRect();
            if (pos.x >= rect.left && pos.x <= rect.right && pos.y >= rect.top && pos.y <= rect.bottom) {
                self._addToDoll(self._dragSrc.src, self._dragSrc.alt);
            }
            self._cleanupDrag();
        };

        // 点击（短按 = 穿脱切换）
        const onClick = (e) => {
            const img = e.target.closest('.wardrobe-piece');
            if (!img) return;
            self._addToDoll(img.src, img.alt);
        };

        panels.addEventListener('touchstart', onPointerDown, { passive: true });
        document.addEventListener('touchmove', onPointerMove, { passive: false });
        document.addEventListener('touchend', onPointerUp);
        panels.addEventListener('mousedown', onPointerDown);
        document.addEventListener('mousemove', onPointerMove);
        document.addEventListener('mouseup', onPointerUp);
        panels.addEventListener('click', onClick);

        this._cleanupDragFns = () => {
            document.removeEventListener('touchmove', onPointerMove);
            document.removeEventListener('touchend', onPointerUp);
            document.removeEventListener('mousemove', onPointerMove);
            document.removeEventListener('mouseup', onPointerUp);
        };
    },

    _getPointerPos(e) {
        if (e.touches && e.touches.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        if (e.changedTouches && e.changedTouches.length) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        return { x: e.clientX, y: e.clientY };
    },

    _cleanupDrag() {
        if (this._dragClone) { this._dragClone.remove(); this._dragClone = null; }
        this._dragSrc = null;
    },

    /* ── 添加衣物到人偶 ── */
    _addToDoll(src, alt) {
        const dollArea = document.getElementById('wardrobe-doll-area');

        // 如果已有同类衣物，先移除（同名的替换，不同名的叠加）
        const existing = dollArea.querySelector(`.wardrobe-piece-clone[alt="${alt}"]`);
        if (existing) {
            existing.remove();
            return; // 再点一次则移除（切换效果）
        }

        const clone = document.createElement('img');
        clone.src = src;
        clone.alt = alt;
        clone.title = alt;
        clone.className = 'wardrobe-piece-clone';
        clone.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;pointer-events:none;z-index:5;';
        dollArea.appendChild(clone);
    },

    /* ── 下载人偶为 PNG ── */
    _downloadDoll() {
        const dollArea = document.getElementById('wardrobe-doll-area');
        if (typeof html2canvas === 'undefined') {
            showToast('html2canvas 未加载，无法导出');
            return;
        }
        html2canvas(dollArea, {
            backgroundColor: null,
            allowTaint: true,
            useCORS: true,
            scale: 2,
            imageSmoothingEnabled: false,
        }).then(canvas => {
            canvas.toBlob(blob => {
                try {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'my_doll.png';
                    a.click();
                    URL.revokeObjectURL(url);
                    showToast('已保存人偶图片！');
                } catch (e) {
                    showToast('导出失败: ' + e.message);
                }
            });
        }).catch(e => {
            showToast('截图失败: ' + e.message);
        });
    }
});

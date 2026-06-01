/* ========================================
   Module: Album (相册)
   ======================================== */

Engine.register({
    id: 'album',
    name: '相册',
    icon: '📷',
    screen: 'album-screen',
    order: 5,

    viewerActive: false,

    init() {
        const screen = document.getElementById(this.screen);
        screen.innerHTML = `
            <div class="album-header">
                <button class="back-btn" data-target="home-screen">‹</button>
                <div class="title-container"><h1 class="title">相册</h1></div>
                <button class="album-add-btn" id="album-add-btn">+</button>
            </div>
            <main class="album-content" id="album-content"></main>

            <!-- 图片查看器 -->
            <div class="album-viewer" id="album-viewer">
                <button class="album-viewer-close" id="album-viewer-close">✕ 关闭</button>
                <img id="album-viewer-img" src="" alt="">
                <div class="album-viewer-info" id="album-viewer-info"></div>
                <div class="album-viewer-actions">
                    <button class="set-cover-btn" id="album-set-cover">⭐ 设为封面</button>
                    <button class="delete-btn" id="album-delete">🗑 删除</button>
                </div>
            </div>

            <!-- 添加弹窗 -->
            <div class="album-add-modal" id="album-add-modal">
                <div class="album-add-box">
                    <h3>📷 添加照片</h3>
                    <div class="form-group">
                        <label>图片名称</label>
                        <input type="text" id="album-add-name" placeholder="给照片取个名字...">
                    </div>
                    <div class="form-group">
                        <label>图片链接</label>
                        <input type="url" id="album-add-url" placeholder="https://...">
                    </div>
                    <p style="text-align:center;color:#aaa;font-size:12px;margin:-8px 0 12px;">或</p>
                    <input type="file" id="album-add-file" accept="image/*" style="display:none;">
                    <label for="album-add-file" style="display:block;text-align:center;padding:10px;background:#f5f5f5;border-radius:10px;cursor:pointer;color:#666;font-size:14px;margin-bottom:12px;">📁 从本地选择图片</label>
                    <div class="album-add-preview" id="album-add-preview"><span>预览区</span></div>
                    <div class="album-add-btns">
                        <button class="cancel-btn" id="album-add-cancel">取消</button>
                        <button class="confirm-btn" id="album-add-confirm">添加</button>
                    </div>
                </div>
            </div>`;

        // 绑定事件
        document.getElementById('album-add-btn').addEventListener('click', () => this.openAddModal());
        document.getElementById('album-add-cancel').addEventListener('click', () => this.closeAddModal());
        document.getElementById('album-add-modal').addEventListener('click', (e) => {
            if (e.target.id === 'album-add-modal') this.closeAddModal();
        });
        document.getElementById('album-add-url').addEventListener('input', (e) => {
            const url = e.target.value.trim();
            const preview = document.getElementById('album-add-preview');
            if (url) preview.innerHTML = `<img src="${url}" onerror="this.parentElement.innerHTML='<span>图片加载失败</span>'">`;
            else preview.innerHTML = '<span>预览区</span>';
        });
        document.getElementById('album-add-file').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const dataUrl = await compressImage(file, { quality: 0.85, maxWidth: 1200, maxHeight: 1200 });
                document.getElementById('album-add-preview').innerHTML = `<img src="${dataUrl}">`;
                document.getElementById('album-add-url').value = '';
                document.getElementById('album-add-url').dataset.localData = dataUrl;
            } catch (err) { showToast('图片处理失败'); }
        });
        document.getElementById('album-add-confirm').addEventListener('click', () => this.addPhoto());

        // 查看器
        document.getElementById('album-viewer-close').addEventListener('click', () => this.closeViewer());
        document.getElementById('album-set-cover').addEventListener('click', () => this.setCover());
        document.getElementById('album-delete').addEventListener('click', () => this.deletePhoto());
    },

    open() {
        switchScreen(this.screen);
        this.renderGallery();
    },

    /** 渲染相册网格 */
    renderGallery() {
        const content = document.getElementById('album-content');
        const photos = db.albumPhotos || [];

        if (photos.length === 0) {
            content.innerHTML = `
                <div class="album-empty">
                    <div class="album-empty-icon">📷</div>
                    <div class="album-empty-text">相册还是空的</div>
                    <div class="album-empty-hint">点击右上角 + 导入你的第一张照片</div>
                </div>`;
            return;
        }

        // 封面排第一
        const sorted = [...photos].sort((a, b) => {
            if (a.isCover && !b.isCover) return -1;
            if (!a.isCover && b.isCover) return 1;
            return b.timestamp - a.timestamp;
        });

        content.innerHTML = `<div class="album-grid">${
            sorted.map(p => `
                <div class="album-item${p.isCover ? ' cover' : ''}" data-id="${p.id}">
                    <img src="${p.url}" alt="${p.name}" loading="lazy">
                </div>
            `).join('')
        }</div>`;

        content.querySelectorAll('.album-item').forEach(item => {
            item.addEventListener('click', () => this.openViewer(item.dataset.id));
        });
    },

    /** 打开添加弹窗 */
    openAddModal() {
        document.getElementById('album-add-modal').classList.add('visible');
        document.getElementById('album-add-name').value = '';
        document.getElementById('album-add-url').value = '';
        document.getElementById('album-add-url').dataset.localData = '';
        document.getElementById('album-add-preview').innerHTML = '<span>预览区</span>';
        document.getElementById('album-add-file').value = '';
    },

    closeAddModal() {
        document.getElementById('album-add-modal').classList.remove('visible');
    },

    /** 添加照片 */
    async addPhoto() {
        const name = document.getElementById('album-add-name').value.trim() || '未命名照片';
        const urlInput = document.getElementById('album-add-url');
        const localData = urlInput.dataset.localData;
        const url = localData || urlInput.value.trim();

        if (!url) { showToast('请提供图片链接或选择本地图片'); return; }

        if (!db.albumPhotos) db.albumPhotos = [];
        const photo = {
            id: `photo_${Date.now()}`,
            name,
            url,
            isCover: db.albumPhotos.length === 0, // 第一张自动设为封面
            timestamp: Date.now()
        };
        db.albumPhotos.push(photo);
        await saveData();
        this.closeAddModal();
        this.renderGallery();
        showToast(`照片"${name}"已添加`);
    },

    /** 打开图片查看器 */
    openViewer(photoId) {
        const photos = db.albumPhotos || [];
        const photo = photos.find(p => p.id === photoId);
        if (!photo) return;

        this.viewerActive = true;
        this._currentPhotoId = photoId;

        document.getElementById('album-viewer-img').src = photo.url;
        document.getElementById('album-viewer-info').textContent = `${photo.name} · ${new Date(photo.timestamp).toLocaleDateString()}`;
        document.getElementById('album-set-cover').textContent = photo.isCover ? '⭐ 已是封面' : '⭐ 设为封面';
        document.getElementById('album-set-cover').disabled = photo.isCover;
        document.getElementById('album-viewer').classList.add('active');
    },

    closeViewer() {
        this.viewerActive = false;
        document.getElementById('album-viewer').classList.remove('active');
    },

    /** 设为封面 */
    async setCover() {
        const photos = db.albumPhotos || [];
        photos.forEach(p => p.isCover = (p.id === this._currentPhotoId));
        await saveData();
        this.closeViewer();
        this.renderGallery();
        showToast('已设为封面');
    },

    /** 删除照片 */
    async deletePhoto() {
        const photos = db.albumPhotos || [];
        const photo = photos.find(p => p.id === this._currentPhotoId);
        if (!photo) return;
        if (!confirm(`确定删除"${photo.name}"吗？`)) return;

        db.albumPhotos = photos.filter(p => p.id !== this._currentPhotoId);
        // 如果删的是封面，自动把第一张设为封面
        if (photo.isCover && db.albumPhotos.length > 0) {
            db.albumPhotos[0].isCover = true;
        }
        await saveData();
        this.closeViewer();
        this.renderGallery();
        showToast('照片已删除');
    },

    /** 获取封面图片 URL（供外部调用） */
    getCoverUrl() {
        const photos = db.albumPhotos || [];
        const cover = photos.find(p => p.isCover);
        return cover ? cover.url : null;
    }
});

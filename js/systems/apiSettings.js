/* ========================================
   ApiSettings - API 配置预设管理
   ======================================== */

import { getActiveApi } from '../core/dataService.js';
import { getDb, saveData } from '../core/dataService.js';
import { showToast, switchScreen } from '../core/utils.js';
import { setChatConfig, setImageConfig, fetchModels } from '../core/aiService.js';

let dom = null;

export function init(_dom) {
  dom = _dom;
  bindEvents();
  renderApiPresetList();
  renderImgGenStatus();
}

function bindEvents() {
  dom['add-api-preset-btn'].addEventListener('click', () => openApiEdit(null));

  dom['img-gen-settings-card'].addEventListener('click', () => switchScreen(dom, 'img-gen-edit-screen'));
  dom['img-gen-edit-btn'].addEventListener('click', (e) => {
    e.stopPropagation();
    switchScreen(dom, 'img-gen-edit-screen');
  });

  dom['api-edit-back-btn'].addEventListener('click', () => {
    switchScreen(dom, 'api-settings-screen');
    renderApiPresetList();
    renderImgGenStatus();
  });

  dom['delete-api-preset-btn'].addEventListener('click', async () => {
    const editId = dom['api-edit-id'].value;
    if (!editId || !confirm('确定删除此配置吗？')) return;
    const db = getDb();
    db.apiPresets = (db.apiPresets || []).filter(p => p.id !== editId);
    if (db.activeApiPresetId === editId) {
      db.activeApiPresetId = db.apiPresets.length > 0 ? db.apiPresets[0].id : '';
    }
    await saveData();
    switchScreen(dom, 'api-settings-screen');
    renderApiPresetList();
    renderImgGenStatus();
  });

  dom['api-edit-provider'].addEventListener('change', function() {
    const urls = {
      newapi: 'https://api.deepseek.com',
      deepseek: 'https://api.deepseek.com',
      claude: 'https://api.anthropic.com',
      gemini: 'https://generativelanguage.googleapis.com',
    };
    dom['api-edit-url'].value = urls[this.value] || '';
  });

  dom['api-edit-fetch-btn'].addEventListener('click', async () => {
    const btn = dom['api-edit-fetch-btn'];
    const url = dom['api-edit-url'].value.trim();
    const key = dom['api-edit-key'].value.trim();
    const provider = dom['api-edit-provider'].value;
    if (!url || !key) { showToast(dom['toast-notification'], '请先填写地址和密钥'); return; }
    btn.classList.add('loading');
    btn.querySelector('.btn-text').textContent = '拉取中...';
    try {
      const models = await fetchModels(url, key, provider);
      const select = dom['api-edit-model'];
      select.innerHTML = '';
      if (models.length === 0) {
        select.innerHTML = '<option value="">未获取到模型</option>';
      } else {
        models.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m; opt.textContent = m;
          select.appendChild(opt);
        });
      }
      showToast(dom['toast-notification'], `获取到 ${models.length} 个模型`);
    } catch (err) {
      showToast(dom['toast-notification'], `拉取失败: ${err.message}`);
      console.error('[ApiSettings] fetch models error:', err);
    } finally {
      btn.classList.remove('loading');
      btn.querySelector('.btn-text').textContent = '点击拉取模型';
    }
  });

  dom['api-edit-form'].addEventListener('submit', async (e) => {
    e.preventDefault();
    const db = getDb();
    if (!db.apiPresets) db.apiPresets = [];
    const editId = dom['api-edit-id'].value;
    const preset = {
      id: editId || 'preset_' + Date.now(),
      name: dom['api-edit-name'].value.trim(),
      provider: dom['api-edit-provider'].value,
      url: dom['api-edit-url'].value.trim(),
      key: dom['api-edit-key'].value.trim(),
      model: dom['api-edit-model'].value,
    };
    if (editId) {
      const idx = db.apiPresets.findIndex(p => p.id === editId);
      if (idx >= 0) db.apiPresets[idx] = preset;
    } else {
      db.apiPresets.push(preset);
    }
    if (!db.activeApiPresetId) db.activeApiPresetId = preset.id;
    await saveData();
    // 同步到 aiService
    syncActiveConfig();
    switchScreen(dom, 'api-settings-screen');
    renderApiPresetList();
    renderImgGenStatus();
    showToast(dom['toast-notification'], '配置已保存');
  });
}

export function renderApiPresetList() {
  const db = getDb();
  const list = dom['api-preset-list'];
  if (!list) return;
  list.innerHTML = '';
  const presets = db.apiPresets || [];

  presets.forEach(p => {
    const isActive = p.id === db.activeApiPresetId;
    const card = document.createElement('div');
    card.className = 'api-preset-card' + (isActive ? ' active' : '');
    card.dataset.id = p.id;
    card.innerHTML = `<div class="api-preset-info">
      <div class="api-preset-name">${isActive ? '✓ ' : ''}${p.name}</div>
      <div class="api-preset-meta">${p.provider || 'newapi'} · ${p.model || '未设置'}</div>
    </div>
    <div class="api-preset-actions">
      ${isActive ? '' : '<button class="api-preset-activate-btn" data-id="' + p.id + '">启用</button>'}
      <button class="api-preset-edit-btn" data-id="' + p.id + '">编辑</button>
    </div>`;
    list.appendChild(card);

    const activateBtn = card.querySelector('.api-preset-activate-btn');
    if (activateBtn) {
      activateBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        db.activeApiPresetId = p.id;
        await saveData();
        syncActiveConfig();
        renderApiPresetList();
        renderImgGenStatus();
        showToast(dom['toast-notification'], `已切换到 "${p.name}"`);
      });
    }

    const editBtn = card.querySelector('.api-preset-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => { e.stopPropagation(); openApiEdit(p.id); });
    }

    card.addEventListener('click', () => openApiEdit(card.dataset.id));
  });
}

export function renderImgGenStatus() {
  const statusEl = dom['img-gen-status'];
  if (!statusEl) return;
  const db = getDb();
  const settings = db.imgGenSettings || {};
  if (settings.url && settings.url.includes('pollinations')) {
    statusEl.textContent = '🟢 Pollinations 免费接口';
  } else if (settings.url) {
    statusEl.textContent = '🟢 自定义接口 · ' + (settings.model || '未设置模型');
  } else {
    statusEl.textContent = '⚪ 未配置，默认使用 Pollinations';
  }
}

function openApiEdit(presetId) {
  const db = getDb();
  switchScreen(dom, 'api-edit-screen');

  if (presetId) {
    dom['api-edit-title'].textContent = '编辑配置';
    dom['delete-api-preset-btn'].style.display = 'inline-block';
    const preset = db.apiPresets?.find(p => p.id === presetId);
    if (preset) {
      dom['api-edit-id'].value = preset.id;
      dom['api-edit-name'].value = preset.name;
      dom['api-edit-provider'].value = preset.provider || 'newapi';
      dom['api-edit-url'].value = preset.url || '';
      dom['api-edit-key'].value = preset.key || '';
      // 拉取模型列表
      fetchAndPopulateModels(preset.url, preset.key, preset.provider, preset.model);
    }
  } else {
    dom['api-edit-title'].textContent = '新增配置';
    dom['delete-api-preset-btn'].style.display = 'none';
    dom['api-edit-form'].reset();
    dom['api-edit-id'].value = '';
    dom['api-edit-provider'].value = 'newapi';
    dom['api-edit-url'].value = 'https://api.deepseek.com';
    const select = dom['api-edit-model'];
    select.innerHTML = '<option value="">请先拉取模型列表</option>';
  }
}

async function fetchAndPopulateModels(url, key, provider, selectedModel) {
  if (!url || !key) return;
  const btn = dom['api-edit-fetch-btn'];
  btn.classList.add('loading');
  btn.querySelector('.btn-text').textContent = '拉取中...';
  try {
    const models = await fetchModels(url, key, provider);
    const select = dom['api-edit-model'];
    select.innerHTML = '';
    if (models.length === 0) {
      select.innerHTML = '<option value="">未获取到模型</option>';
    } else {
      models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m; opt.textContent = m;
        if (m === selectedModel) opt.selected = true;
        select.appendChild(opt);
      });
    }
  } catch (_) {
    // 静默失败，不阻塞编辑页面
  } finally {
    btn.classList.remove('loading');
    btn.querySelector('.btn-text').textContent = '点击拉取模型';
  }
}

function syncActiveConfig() {
  const db = getDb();
  const activePreset = db.apiPresets?.find(p => p.id === db.activeApiPresetId);
  if (activePreset) {
    setChatConfig(activePreset);
  }
  setImageConfig(db.imgGenSettings || {});
}

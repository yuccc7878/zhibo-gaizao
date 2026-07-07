/* ========================================
   Customize - 提示词编辑器 + 数据管理
   ======================================== */

import { getDb, saveData } from '../core/dataService.js';
import { showToast, applyGlobalFont } from '../core/utils.js';
import { DEFAULT_PROMPTS, getEffectivePrompt } from './promptDefaults.js';

let dom = null;
let loadingBtn = false;

export function init(_dom) {
  dom = _dom;
  bindEvents();
}

function bindEvents() {
  // 检查更新
  const checkUpdateBtn = dom['check-update-btn'];
  if (checkUpdateBtn) {
    checkUpdateBtn.addEventListener('click', async () => {
      if (confirm('检查更新将清除浏览器缓存并从仓库加载最新版本。确定继续吗？')) {
        try {
          const registrations = await navigator.serviceWorker?.getRegistrations();
          if (registrations) for (const reg of registrations) await reg.unregister();
        } catch (_) { /* ignore */ }
        if (caches) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
        // 强制清除 HTTP 缓存：给当前 URL 加时间戳参数，绕过浏览器缓存
        const url = new URL(window.location.href);
        url.searchParams.set('_t', Date.now());
        window.location.href = url.toString();
      }
    });
  }
}

// ─── 编辑器分区定义 ───────────────────

const SECTIONS = [
  {
    id: 'private',
    title: '📝 私聊提示词',
    keys: [
      { key: 'private_header', label: '开头（角色名 + 平台声明）' },
      { key: 'private_part1', label: 'Part 1: 你是谁' },
      { key: 'private_part2', label: 'Part 2: 当前情景' },
      { key: 'private_part3', label: 'Part 3: 对方消息格式' },
      { key: 'private_part4', label: 'Part 4: 你的输出格式' },
      { key: 'private_part5', label: 'Part 5: 行为准则' },
    ],
  },
  {
    id: 'group',
    title: '👥 群聊提示词',
    keys: [
      { key: 'group_header', label: '开头（群聊角色扮演）' },
      { key: 'group_part1', label: 'Part 1: 核心任务 + 成员列表' },
      { key: 'group_part2', label: 'Part 2: 消息格式 + 输出格式' },
      { key: 'group_part3', label: 'Part 3: 行为准则' },
    ],
  },
  {
    id: 'other',
    title: '📞 其他提示词',
    keys: [
      { key: 'video_call', label: '视频通话' },
      { key: 'active_world_private', label: '激活世界 — 私聊主动消息' },
      { key: 'active_world_photo', label: '激活世界 — 照片分享' },
      { key: 'active_world_voice', label: '激活世界 — 语音消息' },
      { key: 'active_world_status', label: '激活世界 — 状态更新' },
      { key: 'active_world_group', label: '激活世界 — 群聊主动消息' },
      { key: 'avatar_gen', label: 'AI 头像生成' },
      { key: 'memory_summary', label: '记忆摘要生成' },
    ],
  },
];

// ─── 渲染主入口 ───────────────────────

export function renderCustomizeForm() {
  const form = dom?.['customize-form'] || document.getElementById('customize-form');
  if (!form) { console.error('[Customize] form element NOT FOUND'); return; }
  console.log('[Customize] rendering..., form id:', form.id, 'parent:', form.parentElement?.id);
  form.innerHTML = '<div style="padding:10px;background:#e8f5e9;border-radius:8px;margin-bottom:12px;font-size:12px;">✅ renderCustomizeForm 已调用</div>';
  try {
    _renderAll(form);
    console.log('[Customize] render complete, children:', form.children.length);
  } catch (err) {
    console.error('[Customize] renderCustomizeForm error:', err);
    form.innerHTML = '<div style="color:red;padding:20px;">加载失败: ' + err.message + '<br>' + (err.stack||'') + '</div>';
  }
}

function _renderAll(form) {

  // ── 提示词编辑器 ──
  SECTIONS.forEach(section => {
    const details = document.createElement('details');
    details.className = 'prompt-section';
    details.style.cssText = 'margin-bottom:12px;border:1px solid #eee;border-radius:10px;overflow:hidden;';

    const summary = document.createElement('summary');
    summary.style.cssText = 'padding:12px 16px;background:#fafafa;cursor:pointer;font-weight:600;font-size:15px;user-select:none;';
    summary.textContent = section.title;
    details.appendChild(summary);

    const body = document.createElement('div');
    body.style.cssText = 'padding:12px 16px;';

    section.keys.forEach(item => {
      body.appendChild(renderPromptEditor(item.key, item.label));
    });

    details.appendChild(body);
    form.appendChild(details);
  });

  // ── 主题切换 ──
  const themeSection = document.createElement('details');
  themeSection.className = 'prompt-section';
  themeSection.style.cssText = 'margin-bottom:12px;border:1px solid #eee;border-radius:10px;overflow:hidden;';
  const currentTheme = getDb().appTheme || 'purple';
  themeSection.innerHTML = `
    <summary style="padding:12px 16px;background:#fafafa;cursor:pointer;font-weight:600;font-size:15px;">🎨 主题风格</summary>
    <div style="padding:12px 16px;">
      <div style="display:flex;gap:10px;margin-bottom:16px;">
        <button type="button" id="theme-purple" class="btn ${currentTheme === 'purple' ? 'btn-primary' : 'btn-neutral'}" style="flex:1;">粉紫渐变</button>
        <button type="button" id="theme-white" class="btn ${currentTheme === 'white' ? 'btn-primary' : 'btn-neutral'}" style="flex:1;">经典白色</button>
      </div>

      <div id="hsl-sliders" style="display:${currentTheme === 'white' ? 'none' : 'block'};margin-top:12px;">
        <div style="font-size:12px;font-weight:600;color:#555;margin-bottom:10px;">自定义配色</div>

        <div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#666;margin-bottom:4px;">
            <span>色相</span><span id="hsl-h-val">${getDb().themeHue ?? PURPLE_HSL.h}°</span>
          </div>
          <input type="range" id="hsl-h" min="0" max="360" value="${getDb().themeHue ?? PURPLE_HSL.h}" style="width:100%;accent-color:#ff80ab;">
          <div style="height:6px;border-radius:3px;margin-top:4px;background:linear-gradient(to right,hsl(0,80%,66%),hsl(60,80%,66%),hsl(120,80%,66%),hsl(180,80%,66%),hsl(240,80%,66%),hsl(300,80%,66%),hsl(360,80%,66%));opacity:0.5;"></div>
        </div>

        <div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#666;margin-bottom:4px;">
            <span>饱和度</span><span id="hsl-s-val">${getDb().themeSat ?? PURPLE_HSL.s}%</span>
          </div>
          <input type="range" id="hsl-s" min="0" max="100" value="${getDb().themeSat ?? PURPLE_HSL.s}" style="width:100%;accent-color:#ff80ab;">
        </div>

        <div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#666;margin-bottom:4px;">
            <span>亮度</span><span id="hsl-l-val">${getDb().themeLit ?? PURPLE_HSL.l}%</span>
          </div>
          <input type="range" id="hsl-l" min="20" max="85" value="${getDb().themeLit ?? PURPLE_HSL.l}" style="width:100%;accent-color:#ff80ab;">
        </div>

        <div id="hsl-preview" style="height:40px;border-radius:10px;margin-bottom:8px;background:linear-gradient(135deg,hsl(${getDb().themeHue ?? 260},${getDb().themeSat ?? 80}%,${getDb().themeLit ?? 66}%),hsl(${(getDb().themeHue ?? 260)-10},${Math.max((getDb().themeSat ?? 80)-36,10)}%,${Math.max((getDb().themeLit ?? 66)-18,15)}%),hsl(${(getDb().themeHue ?? 260)+40},${Math.min((getDb().themeSat ?? 80)+7,100)}%,${Math.min((getDb().themeLit ?? 66)+9,85)}%));"></div>

        <div style="display:flex;gap:8px;margin-top:8px;">
          <button type="button" id="hsl-reset" class="btn btn-neutral" style="flex:1;font-size:12px;padding:8px;">恢复粉紫</button>
        </div>
      </div>

      <p style="font-size:11px;color:#aaa;margin-top:8px;">切换后全局生效，聊天/商店/直播/模块统一风格</p>
    </div>`;
  form.appendChild(themeSection);

  // 主题按钮事件
  themeSection.querySelector('#theme-purple').addEventListener('click', () => switchTheme('purple'));
  themeSection.querySelector('#theme-white').addEventListener('click', () => switchTheme('white'));

  // HSL 滑块事件
  const hslSliders = themeSection.querySelector('#hsl-sliders');
  const hInput = themeSection.querySelector('#hsl-h');
  const sInput = themeSection.querySelector('#hsl-s');
  const lInput = themeSection.querySelector('#hsl-l');
  const hVal = themeSection.querySelector('#hsl-h-val');
  const sVal = themeSection.querySelector('#hsl-s-val');
  const lVal = themeSection.querySelector('#hsl-l-val');
  const preview = themeSection.querySelector('#hsl-preview');

  function onHSLChange() {
    const h = parseInt(hInput.value);
    const s = parseInt(sInput.value);
    const l = parseInt(lInput.value);
    hVal.textContent = h + '°';
    sVal.textContent = s + '%';
    lVal.textContent = l + '%';

    // 更新预览条
    const m_s = Math.max(s - 36, 10), m_l = Math.max(l - 18, 15);
    const e_s = Math.min(s + 7, 100), e_l = Math.min(l + 9, 85);
    preview.style.background = `linear-gradient(135deg, hsl(${h},${s}%,${l}%), hsl(${h-10},${m_s}%,${m_l}%), hsl(${h+40},${e_s}%,${e_l}%))`;

    // 实时应用
    const db = getDb();
    db.themeHue = h;
    db.themeSat = s;
    db.themeLit = l;
    db.appTheme = 'custom';
    saveData();
    applyTheme('custom');

    // 更新按钮状态
    themeSection.querySelector('#theme-purple').className = 'btn btn-neutral';
    themeSection.querySelector('#theme-white').className = 'btn btn-neutral';
  }

  hInput.addEventListener('input', onHSLChange);
  sInput.addEventListener('input', onHSLChange);
  lInput.addEventListener('input', onHSLChange);

  // 恢复粉紫
  themeSection.querySelector('#hsl-reset').addEventListener('click', () => {
    hInput.value = PURPLE_HSL.h;
    sInput.value = PURPLE_HSL.s;
    lInput.value = PURPLE_HSL.l;
    onHSLChange();
    switchTheme('purple');
  });

  // ── 字体设置 ──
  const fontSection = document.createElement('details');
  fontSection.className = 'prompt-section';
  fontSection.style.cssText = 'margin-bottom:12px;border:1px solid #eee;border-radius:10px;overflow:hidden;';
  fontSection.innerHTML = '<summary style="padding:12px 16px;background:#fafafa;cursor:pointer;font-weight:600;font-size:15px;">🔤 字体设置</summary>';
  const fontBody = document.createElement('div');
  fontBody.style.cssText = 'padding:12px 16px;';
  fontBody.innerHTML = `
    <div class="form-group" style="margin-bottom:10px;">
      <label style="font-size:13px;font-weight:500;">字体链接 (ttf, woff, woff2)</label>
      <input type="url" id="custom-font-url" placeholder="https://.../font.ttf" style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:8px;font-size:13px;margin-top:4px;box-sizing:border-box;">
    </div>
    <div style="display:flex;gap:8px;">
      <button type="button" id="custom-font-apply" class="btn btn-primary" style="flex:1;">应用字体</button>
      <button type="button" id="custom-font-reset" class="btn btn-neutral" style="flex:1;">恢复默认</button>
    </div>
    <p style="font-size:11px;color:#aaa;margin-top:8px;">留空则使用系统默认字体</p>
  `;
  fontSection.appendChild(fontBody);
  form.appendChild(fontSection);

  // 字体按钮事件
  const fontApplyBtn = fontBody.querySelector('#custom-font-apply');
  const fontResetBtn = fontBody.querySelector('#custom-font-reset');
  const fontUrlInput = fontBody.querySelector('#custom-font-url');
  const db = getDb();
  if (db.fontUrl) fontUrlInput.value = db.fontUrl;
  fontApplyBtn.addEventListener('click', async () => {
    const url = fontUrlInput.value.trim();
    if (!url) { showToast(dom?.['toast-notification'], '请输入字体链接'); return; }
    db.fontUrl = url;
    await saveData();
    applyGlobalFont(url);
    showToast(dom?.['toast-notification'], '✅ 字体已应用');
  });
  fontResetBtn.addEventListener('click', async () => {
    db.fontUrl = '';
    await saveData();
    applyGlobalFont('');
    fontUrlInput.value = '';
    showToast(dom?.['toast-notification'], '已恢复默认字体');
  });

  // ── 数据管理 ──
  const divider = document.createElement('div');
  divider.style.cssText = 'margin-top:24px;padding-top:20px;border-top:2px solid #f0f0f0;';
  divider.innerHTML = '<h3 style="margin-bottom:16px;">数据管理</h3>';

  const backupBtn = document.createElement('button');
  backupBtn.type = 'button';
  backupBtn.className = 'btn btn-primary';
  backupBtn.textContent = '备份数据';
  backupBtn.disabled = loadingBtn;
  backupBtn.style.cssText = 'width:100%;padding:14px;font-size:15px;border-radius:12px;';
  backupBtn.addEventListener('click', handleBackup);

  const importLabel = document.createElement('label');
  importLabel.className = 'btn btn-neutral';
  importLabel.textContent = '导入数据';
  importLabel.setAttribute('for', 'import-data-input');
  importLabel.style.cssText = 'display:block;width:100%;padding:14px;font-size:15px;border-radius:12px;margin-top:12px;text-align:center;box-sizing:border-box;cursor:pointer;';

  const resetAllBtn = document.createElement('button');
  resetAllBtn.type = 'button';
  resetAllBtn.className = 'btn btn-neutral';
  resetAllBtn.textContent = '⚠️ 重置所有提示词为默认';
  resetAllBtn.style.cssText = 'width:100%;padding:14px;font-size:15px;border-radius:12px;margin-top:12px;color:#e53935;';
  resetAllBtn.addEventListener('click', async () => {
    if (!confirm('确定要将所有提示词恢复为默认值吗？自定义修改将全部丢失。')) return;
    const db = getDb();
    db.customPrompts = {};
    await saveData();
    renderCustomizeForm();
    showToast(dom?.['toast-notification'], '✅ 所有提示词已恢复默认');
  });

  divider.appendChild(backupBtn);
  divider.appendChild(importLabel);
  divider.appendChild(resetAllBtn);
  form.appendChild(divider);

  // 导入处理
  setupImportHandler();
}

// ─── 单条提示词编辑器 ─────────────────

function renderPromptEditor(key, label) {
  const db = getDb();
  const current = getEffectivePrompt(key, db);
  const isModified = !!(db.customPrompts && db.customPrompts[key]);
  const defaultVal = DEFAULT_PROMPTS[key] || '';

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'margin-bottom:14px;';

  // 标题行
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;';

  const titleLabel = document.createElement('div');
  titleLabel.style.cssText = 'font-size:13px;font-weight:500;color:#333;';
  titleLabel.textContent = label;
  if (isModified) {
    const badge = document.createElement('span');
    badge.textContent = ' 已自定义';
    badge.style.cssText = 'font-size:11px;color:#ff9800;font-weight:normal;margin-left:6px;';
    titleLabel.appendChild(badge);
  }
  header.appendChild(titleLabel);

  const btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'display:flex;gap:6px;';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.textContent = '💾 保存';
  saveBtn.style.cssText = 'font-size:12px;padding:4px 10px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;';
  btnGroup.appendChild(saveBtn);

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.textContent = '↺ 恢复默认';
  resetBtn.style.cssText = 'font-size:12px;padding:4px 10px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;color:#999;';
  resetBtn.disabled = !isModified;
  if (!isModified) resetBtn.style.opacity = '0.4';
  btnGroup.appendChild(resetBtn);

  header.appendChild(btnGroup);
  wrapper.appendChild(header);

  // textarea
  const textarea = document.createElement('textarea');
  textarea.value = current;
  textarea.style.cssText = 'width:100%;min-height:80px;max-height:300px;padding:8px 10px;border:1px solid #ddd;border-radius:8px;font-size:12px;font-family:monospace;line-height:1.5;resize:vertical;box-sizing:border-box;';
  textarea.rows = Math.min(8, (current.match(/\n/g) || []).length + 2);

  // 变量提示
  const varHint = document.createElement('div');
  varHint.style.cssText = 'font-size:11px;color:#aaa;margin-top:4px;';
  varHint.textContent = '可用变量: {realName} {myName} {persona} {status} {currentTime} {scenario} 等';

  wrapper.appendChild(textarea);
  wrapper.appendChild(varHint);

  // 保存
  saveBtn.addEventListener('click', async () => {
    const db = getDb();
    if (!db.customPrompts) db.customPrompts = {};
    db.customPrompts[key] = textarea.value;
    await saveData();
    showToast(dom?.['toast-notification'], `✅ "${label}" 已保存`);
    // 更新 badge
    if (!titleLabel.querySelector('span')) {
      const badge = document.createElement('span');
      badge.textContent = ' 已自定义';
      badge.style.cssText = 'font-size:11px;color:#ff9800;font-weight:normal;margin-left:6px;';
      titleLabel.appendChild(badge);
    }
    resetBtn.disabled = false;
    resetBtn.style.opacity = '1';
  });

  // 恢复默认
  resetBtn.addEventListener('click', async () => {
    if (!confirm(`确定要将"${label}"恢复为默认值吗？`)) return;
    const db = getDb();
    if (db.customPrompts) delete db.customPrompts[key];
    await saveData();
    textarea.value = defaultVal;
    const badge = titleLabel.querySelector('span');
    if (badge) badge.remove();
    resetBtn.disabled = true;
    resetBtn.style.opacity = '0.4';
    showToast(dom?.['toast-notification'], `✅ "${label}" 已恢复默认`);
  });

  return wrapper;
}

// ─── 备份 ─────────────────────────────

async function handleBackup() {
  if (loadingBtn) return;
  loadingBtn = true;
  try {
    const db = getDb();
    const blob = new Blob([JSON.stringify(db)]);
    const cs = new CompressionStream('gzip');
    const compressed = await new Response(blob.stream().pipeThrough(cs)).blob();
    const url = URL.createObjectURL(compressed);
    const a = document.createElement('a');
    const now = new Date();
    a.href = url;
    a.download = `组装姬_备份数据_${now.toISOString().slice(0, 10)}_${now.toTimeString().slice(0, 8).replace(/:/g, '')}.ee`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(dom?.['toast-notification'], '聊天记录导出成功');
  } catch (e) {
    showToast(dom?.['toast-notification'], `导出失败: ${e.message}`);
  }
  loadingBtn = false;
}

// ─── 导入 ─────────────────────────────

function setupImportHandler() {
  const importInput = document.getElementById('import-data-input');
  if (importInput && !importInput._bound) {
    importInput._bound = true;
    importInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (confirm(`导入文件: ${file.name} (${(file.size / 1024).toFixed(1)} KB)\n此操作将覆盖当前所有数据，确定要继续吗？`)) {
        try {
          let json;
          try {
            // 尝试 gzip 解压（.ee 格式）
            const ds = new DecompressionStream('gzip');
            json = await new Response(file.stream().pipeThrough(ds)).text();
          } catch (_) {
            // gzip 失败，当作纯 JSON 读取（旧版格式）
            json = await file.text();
          }
          const data = JSON.parse(json);
          if (!data || typeof data !== 'object') throw new Error('数据格式无效');
          // 显示导入摘要
          const charCount = (data.characters || []).length;
          const groupCount = (data.groups || []).length;
          const wbCount = (data.worldBooks || []).length;
          console.log('[Import] 角色:', charCount, '群聊:', groupCount, '世界书:', wbCount, 'keys:', Object.keys(data).join(','));
          await saveData(data);
          // 验证写入是否成功
          const verifyDb = getDb();
          console.log('[Import] 验证 - 当前 db.characters:', verifyDb.characters?.length, 'db.groups:', verifyDb.groups?.length);
          showToast(dom?.['toast-notification'], `✅ 已导入 ${charCount} 个角色、${groupCount} 个群聊、${wbCount} 本世界书，即将刷新`);
          setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
          console.error('[Import] 失败:', err);
          showToast(dom?.['toast-notification'], `导入失败: ${err.message}`);
        }
      } else {
        e.target.value = null;
      }
    });
  }
}

// ─── 主题切换 ───

const PURPLE_HSL = { h: 260, s: 80, l: 66 };

function switchTheme(theme) {
  const db = getDb();
  db.appTheme = theme;
  saveData();
  applyTheme(theme);
  const msg = theme === 'purple' ? '🎨 已切换为粉紫渐变主题'
    : theme === 'white' ? '🎨 已切换为经典白色主题'
    : '🎨 已切换为自定义主题';
  showToast(dom?.['toast-notification'], msg);
  renderCustomizeForm();
}

function applyThemeHSL(h, s, l) {
  const root = document.documentElement;
  root.style.setProperty('--theme-h', h);
  root.style.setProperty('--theme-s', s + '%');
  root.style.setProperty('--theme-l', l + '%');
  root.style.setProperty('--theme-bg-start', `hsl(${h}, ${s}%, ${l}%)`);
  root.style.setProperty('--theme-bg-mid', `hsl(${h - 10}, ${Math.max(s - 36, 10)}%, ${Math.max(l - 18, 15)}%)`);
  root.style.setProperty('--theme-bg-end', `hsl(${h + 40}, ${Math.min(s + 7, 100)}%, ${Math.min(l + 9, 85)}%)`);
  root.style.setProperty('--theme-btn-gradient', `linear-gradient(135deg, hsl(${h}, ${s}%, ${l}%), hsl(${h - 10}, ${Math.max(s - 36, 10)}%, ${Math.max(l - 18, 15)}%), hsl(${h + 40}, ${Math.min(s + 7, 100)}%, ${Math.min(l + 9, 85)}%))`);
  root.style.setProperty('--theme-btn-glow', `hsla(${h + 20}, 80%, 70%, 0.4)`);
  root.style.setProperty('--theme-btn-glow2', `hsla(${h + 30}, 90%, 70%, 0.4)`);
}

export function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.remove('theme-purple', 'theme-white', 'theme-custom');

  if (theme === 'purple') {
    root.classList.add('theme-purple');
    applyThemeHSL(PURPLE_HSL.h, PURPLE_HSL.s, PURPLE_HSL.l);
  } else if (theme === 'white') {
    root.classList.add('theme-white');
  } else {
    root.classList.add('theme-custom');
    const db = getDb();
    const h = db.themeHue ?? PURPLE_HSL.h;
    const s = db.themeSat ?? PURPLE_HSL.s;
    const l = db.themeLit ?? PURPLE_HSL.l;
    applyThemeHSL(h, s, l);
  }
}

export function initTheme() {
  const db = getDb();
  const theme = db.appTheme || 'purple';
  applyTheme(theme);
}

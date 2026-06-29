/* ========================================
   App.js - 模块化入口（完整版）
   替代原 app.js，接管所有初始化
   ======================================== */

import { state } from './core/state.js?v=10';
import { initDomCache } from './core/dom.js?v=10';
import { applyGlobalFont, showToast, switchScreen, removeContextMenu } from './core/utils.js?v=10';
import * as dataService from './core/dataService.js?v=10';
// aiService 已通过全局 script 加载，使用 window.AiService

import * as chatRoom from './ui/chatRoom.js?v=10';
import * as chatList from './ui/chatList.js?v=10';
import * as homeScreen from './ui/homeScreen.js?v=10';
import { updateActiveWorldStatus } from './ui/homeScreen.js?v=10';
import * as PromptDefaults from './ui/promptDefaults.js?v=10';
import * as settings from './ui/settings.js?v=10';
import * as wallpaper from './ui/wallpaper.js?v=10';
import * as customize from './ui/customize.js?v=10';
import * as fontSettings from './ui/fontSettings.js?v=10';
import * as bubbleWorkshop from './ui/bubbleWorkshop.js?v=10';

import * as worldBook from './systems/worldBook.js?v=10';
import * as apiSettings from './systems/apiSettings.js?v=10';
import * as imgGenSettings from './systems/imgGenSettings.js?v=10';
import * as stickers from './systems/stickers.js?v=10';
import * as voice from './systems/voice.js?v=10';
import * as photoVideo from './systems/photoVideo.js?v=10';
import * as wallet from './systems/wallet.js?v=10';
import * as gift from './systems/gift.js?v=10';
import * as timeSkip from './systems/timeSkip.js?v=10';
import * as imageRecognition from './systems/imageRecognition.js?v=10';
import * as group from './systems/group.js?v=10';
import * as videoCall from './systems/videoCall.js?v=10';

async function initApp() {
  console.log('[App] initApp 开始');
  try {
  // 1. 加载数据
  await dataService.loadData();
  const db = dataService.getDb();

  // 2. DOM 缓存
  const dom = initDomCache();
  // 供 switchScreen 使用（模块外需要 dom.screens）
  window.__dom = dom;
  window.__state = state;

  // 3. 全局字体
  applyGlobalFont(db.fontUrl);

  // ─── 注入 7 个屏幕的 HTML（避免白屏） ───
  dom['api-settings-screen'].innerHTML = `<header class="app-header"><button class="back-btn" data-target="home-screen">‹</button><div class="title-container"><h1 class="title">API 设置</h1></div><button class="action-btn" id="add-api-preset-btn">+</button></header><main class="content"><div class="api-preset-list" id="api-preset-list"></div><div style="margin-top:16px;padding:0 4px;"><div class="api-preset-card" id="img-gen-settings-card" style="cursor:pointer;border-left:3px solid var(--accent-color,#ff80ab);"><div class="api-preset-info"><div class="api-preset-name">🎨 生图 API 设置</div><div class="api-preset-meta" id="img-gen-status">独立于聊天API，可配置不同的服务商</div></div><div class="api-preset-actions"><button class="api-preset-edit-btn" id="img-gen-edit-btn">设置</button></div></div><div class="api-preset-card" id="tts-settings-card" style="cursor:pointer;border-left:3px solid var(--accent-color,#90caf9);margin-top:10px;"><div class="api-preset-info"><div class="api-preset-name">🔊 语音朗读设置</div><div class="api-preset-meta" id="tts-global-status">当前：本地浏览器</div></div><div class="api-preset-actions"><button class="api-preset-edit-btn" id="tts-edit-btn">设置</button></div></div></div></main>`;
  dom['api-edit-screen'].innerHTML = `<header class="app-header"><button class="back-btn" id="api-edit-back-btn">‹</button><div class="title-container"><h1 class="title" id="api-edit-title">编辑配置</h1></div><button class="action-btn" id="delete-api-preset-btn" style="color:#ff4444;">删除</button></header><main class="content"><form id="api-edit-form"><input type="hidden" id="api-edit-id"><div class="form-group"><label for="api-edit-name">配置名称</label><input type="text" id="api-edit-name" placeholder="如：DeepSeek主配置" required></div><div class="form-group"><label for="api-edit-provider">API 服务商</label><select id="api-edit-provider"><option value="newapi">NewAPI (自定义)</option><option value="openai">OpenAI</option><option value="deepseek">DeepSeek</option><option value="claude">Claude (Anthropic)</option><option value="gemini">Gemini (Google)</option><option value="zhipu">智谱 (GLM)</option><option value="moonshot">月之暗面 (Kimi)</option><option value="qwen">通义千问</option><option value="ollama">Ollama (本地)</option></select></div><div class="form-group"><label>API 地址</label><div style="display:flex;gap:0;border:1px solid #ddd;border-radius:8px;overflow:hidden;"><input type="text" id="api-edit-host" placeholder="https://api.deepseek.com" style="flex:1;border:none;outline:none;padding:10px 12px;font-size:14px;min-width:0;" required><input type="text" id="api-edit-path" placeholder="/v1/chat/completions" style="width:200px;border:none;border-left:1px solid #eee;outline:none;padding:10px 12px;font-size:14px;color:#666;background:#fafafa;"></div><div style="font-size:11px;color:#999;margin-top:4px;">完整地址：主机 + 路径自动拼接，路径留空则使用默认值</div></div><div class="form-group"><label for="api-edit-key">密钥 (Key)</label><input type="text" id="api-edit-key" placeholder="sk-xxxxxxxxxxxxxxxx" required style="font-family:monospace;"></div><div style="display:flex;gap:8px;"><button type="button" class="btn btn-secondary" id="api-edit-fetch-btn" style="flex:1;"><span class="btn-text">拉取模型</span><div class="spinner"></div></button><button type="button" class="btn btn-neutral" id="api-edit-test-btn" style="flex:1;">🔗 测试连接</button></div><div id="api-test-result" style="font-size:12px;margin-top:6px;display:none;padding:8px 10px;border-radius:6px;"></div><div class="form-group"><label for="api-edit-model">选择模型</label><select id="api-edit-model" required><option value="">请先拉取模型列表</option></select></div><button type="submit" class="btn btn-primary">保存配置</button></form></main>`;
  dom['img-gen-edit-screen'].innerHTML = `<header class="app-header"><button class="back-btn" id="img-gen-back-btn">‹</button><div class="title-container"><h1 class="title">🎨 生图 API 设置</h1></div><div class="placeholder"></div></header><main class="content"><form id="img-gen-form"><p style="font-size:13px;color:#888;margin-bottom:16px;">独立于聊天API配置，可使用不同的服务商进行图片生成。</p><div class="form-group"><label for="img-gen-url">生图接口地址</label><input type="url" id="img-gen-url" placeholder="如：https://image.pollinations.ai/prompt/"></div><div class="form-group"><label for="img-gen-key">密钥 (Key)</label><input type="password" id="img-gen-key" placeholder="请输入生图API密钥"></div><div class="form-group"><label for="img-gen-model">模型名称</label><input type="text" id="img-gen-model" placeholder="如：black-forest-labs/FLUX.1-schnell"></div><p style="font-size:11px;color:#999;margin:-8px 0 16px;">支持 OpenAI 兼容格式（SiliconFlow、DALL·E 等）。留空地址则不启用生图功能。</p><button type="submit" class="btn btn-primary">保存设置</button><button type="button" class="btn btn-neutral" id="img-gen-reset-btn" style="margin-top:12px;">🔄 重置为默认（Pollinations 免费）</button></form></main>`;
  // TTS 设置页
  dom['tts-edit-screen'].innerHTML = `<header class="app-header"><button class="back-btn" data-target="api-settings-screen">‹</button><div class="title-container"><h1 class="title">🔊 语音朗读设置</h1></div><div class="placeholder"></div></header><main class="content"><div style="margin-bottom:16px;"><div class="form-group"><label>朗读引擎</label><div style="display:flex;gap:8px;margin-top:6px;"><label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:10px 16px;border:2px solid #eee;border-radius:10px;flex:1;justify-content:center;"><input type="radio" name="tts-engine" value="local" checked style="width:auto;"> 🖥️ 本地浏览器</label><label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:10px 16px;border:2px solid #eee;border-radius:10px;flex:1;justify-content:center;"><input type="radio" name="tts-engine" value="sogou" style="width:auto;"> 🌐 搜狗 TTS</label></div></div></div><div id="tts-sogou-options" style="display:none;"><div class="form-group"><label for="tts-sogou-speaker">音色选择</label><select id="tts-sogou-speaker"><option value="1">🎙️ 标准女声</option><option value="2">🎀 温柔女声</option><option value="3">🍬 甜美女声</option><option value="4">🎤 标准男声</option><option value="5">📢 沉稳男声</option><option value="6">🧲 磁性男声</option></select></div><div class="form-group"><label>语速</label><div style="display:flex;align-items:center;gap:10px;"><span style="font-size:12px;color:#999;">慢</span><input type="range" id="tts-sogou-speed" min="1" max="5" value="3" style="flex:1;"><span style="font-size:12px;color:#999;">快</span><span id="tts-speed-label" style="font-size:12px;color:#666;min-width:20px;text-align:center;">3</span></div></div></div><div style="display:flex;gap:10px;margin-top:20px;"><button type="button" class="btn btn-secondary" id="tts-preview-btn" style="flex:1;">🔊 试听</button><button type="button" class="btn btn-primary" id="tts-save-btn" style="flex:1;">💾 保存</button></div><p style="font-size:11px;color:#999;text-align:center;margin-top:12px;">搜狗 TTS 免费无需密钥，支持6种音色<br>每角色可在聊天设置中单独覆盖</p></main>`;

  dom['wallpaper-screen'].innerHTML = `<header class="app-header"><button class="back-btn" data-target="home-screen">‹</button><div class="title-container"><h1 class="title">更换壁纸</h1></div><div class="placeholder"></div></header><main class="content"><div class="wallpaper-preview" id="wallpaper-preview"><span>当前壁纸预览</span></div><input type="file" id="wallpaper-upload" accept="image/*" style="display: none;"><label for="wallpaper-upload" class="btn btn-primary">从相册选择新壁纸</label></main>`;
  dom['font-settings-screen'].innerHTML = `<header class="app-header"><button class="back-btn" data-target="home-screen">‹</button><div class="title-container"><h1 class="title">字体设置</h1></div><div class="placeholder"></div></header><main class="content"><form id="font-settings-form"><div class="form-group"><label for="font-url">字体链接 (ttf, woff, woff2)</label><input type="url" id="font-url" placeholder="https://.../font.ttf" required></div><p style="font-size:12px; color:#888; text-align:center;">示例: https://lf3-static.bytednsdoc.com/obj/eden-cn/jplptk/ljhwZthlaukjlkulzlp/portal/fonts/HarmonyOS_Sans_SC_Regular.woff2</p><button type="submit" class="btn btn-primary">应用字体</button><button type="button" class="btn btn-neutral" id="restore-default-font-btn" style="margin-top: 15px;">恢复默认字体</button></form></main>`;
  dom['customize-screen'].innerHTML = `<header class="app-header"><button class="back-btn" data-target="home-screen">‹</button><div class="title-container"><h1 class="title">主屏幕自定义</h1></div><div class="placeholder"></div></header><main class="content"><form id="customize-form"></form><div style="margin-top:24px;padding:0 4px;"><button type="button" id="check-update-btn" class="btn btn-secondary" style="width:100%;padding:14px;font-size:15px;border-radius:12px;">🔄 检查更新</button><p style="font-size:12px;color:#999;text-align:center;margin-top:8px;">清除浏览器缓存并从仓库重新加载最新版本</p></div></main>`;
  // 气泡工坊屏幕
  dom['bubble-workshop-screen'] = document.getElementById('bubble-workshop-screen');

  // 重新缓存动态注入的 DOM 元素
  ['img-gen-status', 'tts-global-status', 'tts-settings-card', 'tts-edit-btn',
   'add-api-preset-btn', 'api-preset-list', 'img-gen-settings-card', 'img-gen-edit-btn',
   'tts-preview-btn', 'tts-save-btn', 'tts-sogou-speaker', 'tts-sogou-speed', 'tts-speed-label',
   'api-edit-back-btn', 'delete-api-preset-btn', 'api-edit-form', 'api-edit-id', 'api-edit-title',
   'api-edit-name', 'api-edit-provider', 'api-edit-host', 'api-edit-path', 'api-edit-key', 'api-edit-fetch-btn', 'api-edit-test-btn', 'api-test-result', 'api-edit-model',
   'img-gen-back-btn', 'img-gen-form', 'img-gen-url', 'img-gen-key', 'img-gen-model', 'img-gen-reset-btn',
   'wallpaper-preview', 'wallpaper-upload', 'font-settings-form', 'font-url', 'restore-default-font-btn',
   'customize-form', 'check-update-btn'].forEach(id => {
    dom[id] = document.getElementById(id);
  });
  // TTS 设置页按钮绑定（HTML 动态注入后）
  if (dom['tts-preview-btn']) {
    dom['tts-preview-btn'].addEventListener('click', () => {
      const engineRadio = document.querySelector('input[name="tts-engine"]:checked');
      const engine = engineRadio?.value || 'local';
      const speaker = parseInt(dom['tts-sogou-speaker']?.value) || 1;
      const speed = parseInt(dom['tts-sogou-speed']?.value) || 3;
      const previewText = '你好，这是语音朗读试听，当前音色和语速设置已生效。';
      if (engine === 'sogou' && window.ttsService) {
        window.ttsService.speak(previewText, { engine: 'sogou', sogouSpeaker: speaker, sogouSpeed: speed });
      } else if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(previewText);
        u.lang = 'zh-CN';
        speechSynthesis.speak(u);
      } else {
        alert('当前浏览器不支持语音朗读');
      }
    });
  }


  // TTS 引擎切换显示/隐藏搜狗选项
  document.querySelectorAll('input[name="tts-engine"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const sogouOpts = document.getElementById('tts-sogou-options');
      if (sogouOpts) sogouOpts.style.display = radio.value === 'sogou' ? '' : 'none';
    });
  });
  // TTS 语速滑块实时显示
  const ttsSpeedSlider = dom['tts-sogou-speed'];
  const ttsSpeedLabel = dom['tts-speed-label'];
  if (ttsSpeedSlider && ttsSpeedLabel) {
    ttsSpeedSlider.addEventListener('input', () => { ttsSpeedLabel.textContent = ttsSpeedSlider.value; });
  }

  // 4. 同步 AI 配置到 AiService
  const activePreset = db.apiPresets?.find(p => p.id === db.activeApiPresetId);
  if (activePreset) window.AiService.setChatConfig(activePreset);
  window.AiService.setImageConfig(db.imgGenSettings || {});

  // 5. 初始化所有模块（注入依赖）
  chatRoom.init(dom, chatList.renderChatList);
  chatList.init(dom, chatRoom.openChatRoom);
  settings.init(dom, chatList.renderChatList, chatRoom.renderMessages);
  group.init(dom, chatList.renderChatList, chatRoom.renderMessages);
  homeScreen.init(dom);
  wallpaper.init(dom);
  customize.init(dom);
  customize.initTheme();
  customize.renderCustomizeForm();
  fontSettings.init(dom);
  bubbleWorkshop.init(dom);
  worldBook.init(dom);
  videoCall.init(dom);
  apiSettings.init(dom);
  imgGenSettings.init(dom);
  stickers.init(dom);
  voice.init(dom);
  photoVideo.init(dom);
  wallet.init(dom);
  gift.init(dom);
  timeSkip.init(dom);
  imageRecognition.init(dom);

  // 同步全局 TTS 配置到 ttsService
  if (window.ttsService && db.ttsConfig) window.ttsService.setConfig(db.ttsConfig);

  // 渲染聊天列表（数据已加载，模块已初始化）
  chatList.renderChatList();

  // 6. 全局事件委托（移动端友好）
  document.body.addEventListener('click', (e) => {
    // 右键菜单点击不关闭
    if (e.target.closest('.context-menu')) { e.stopPropagation(); return; }
    removeContextMenu();

    // 返回按钮
    const backBtn = e.target.closest('.back-btn');
    if (backBtn && backBtn.getAttribute('data-target')) {
      e.preventDefault();
      switchScreen(dom, backBtn.getAttribute('data-target'));
      return;
    }

    // 导航图标
    const navLink = e.target.closest('.app-icon[data-target]');
    if (navLink) {
      e.preventDefault();
      switchScreen(dom, navLink.getAttribute('data-target'));
      return;
    }

    // 点击遮罩关闭弹窗（移动端点击外部关闭）
    const openOverlay = document.querySelector('.modal-overlay.visible, .action-sheet-overlay.visible');
    if (openOverlay && e.target === openOverlay) {
      openOverlay.classList.remove('visible');
    }
  });

  // 移动端 touch 事件：滑动时不做切换，由各模块自行处理

  // 7. Engine 模块初始化（商店、直播、B站、游戏、相册、摇一摇、衣帽间）
  if (window.Engine && typeof window.Engine.initAll === 'function') {
    await window.Engine.initAll();
  }

  // 8. 视频通话已作为 ES Module 初始化（见上方 videoCall.init）

  // 9. 暴露关键函数给全局（Engine 模块 + activeWorld 需要）
  // 注意：window.saveData 由 engine/db.js 设置，不能覆盖，否则 dataService.saveData 调用 window.saveData 会无限递归
  window.renderChatList = chatList.renderChatList;
  window.renderMessages = chatRoom.renderMessages;
  window.addMessageBubble = chatRoom.addMessageBubble;
  window.showToast = showToast;
  window.maybeSendAiImage = chatRoom.maybeSendAiImage;
  window.PromptDefaults = PromptDefaults;

  // 10. 刷新后恢复上次屏幕状态
  try {
    const db = dataService.getDb();
    if (db._currentScreen && db._currentScreen !== 'home-screen') {
      if (!document.getElementById(db._currentScreen)) {
        console.warn('[App] 恢复屏幕不存在:', db._currentScreen, '→ 回到主页');
        db._currentScreen = 'home-screen';
        db._currentChatId = '';
        db._currentChatType = '';
      } else if (db._currentScreen === 'chat-room-screen' && db._currentChatId && db._currentChatType) {
        const chat = db._currentChatType === 'private'
          ? dataService.getCharacter(db._currentChatId)
          : dataService.getGroup(db._currentChatId);
        if (chat) {
          chatRoom.openChatRoom(db._currentChatId, db._currentChatType);
        } else {
          db._currentScreen = 'home-screen';
          db._currentChatId = '';
          db._currentChatType = '';
          switchScreen(dom, 'home-screen');
        }
      } else {
        switchScreen(dom, db._currentScreen);
      }
    }
  } catch (e) {
    console.error('[App] 屏幕恢复失败:', e);
    switchScreen(dom, 'home-screen');
  }

  // 11. 激活世界设置初始化
  try {
    const db = dataService.getDb();
    if (window.activeWorld && db.activeWorldEnabled) window.activeWorld.start();
    setupActiveWorldSettings();
  } catch (e) {
    console.error('[App] activeWorld 初始化失败:', e);
  }

  console.log('[App] 模块化入口启动完成');
  } catch (err) {
    console.error('[App] initApp 错误:', err);
    document.getElementById('home-screen')?.classList.add('active');
    var el = document.getElementById('error-display');
    if (!el) {
      el = document.createElement('div');
      el.id = 'error-display';
      el.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#fff;z-index:99999;padding:20px;overflow:auto;font-family:monospace;font-size:13px;color:#c00;';
      document.body.appendChild(el);
    }
    el.innerHTML += '<div style="margin-bottom:8px;padding:8px;background:#fff0f0;border:1px solid #fcc;border-radius:6px;word-break:break-all;"><b>initApp Error:</b> ' + err.message + '<br><pre>' + (err.stack||'') + '</pre></div>';
  }
}

// ─── 激活世界设置 ───
function setupActiveWorldSettings() {
  const saveBtn = document.getElementById('active-world-save-btn');
  if (!saveBtn) return;
  saveBtn.addEventListener('click', async () => {
    const db = dataService.getDb();
    db.activeWorldEnabled = document.getElementById('active-world-enabled').checked;
    db.activeWorldInterval = parseInt(document.getElementById('active-world-interval').value) || 5;
    db.activeWorldScope = document.getElementById('active-world-scope').value;
    await dataService.saveData();
    document.getElementById('active-world-modal').classList.remove('visible');
    if (window.activeWorld) {
      if (db.activeWorldEnabled) window.activeWorld.start();
      else window.activeWorld.stop();
    }
    updateActiveWorldStatus();
    showToast(dom['toast-notification'], '激活世界设置已保存');
  });

  // dock 按钮绑定
  const dockBtn = document.getElementById('active-world-dock-btn');
  if (dockBtn) {
    dockBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const db = dataService.getDb();
      document.getElementById('active-world-enabled').checked = db.activeWorldEnabled || false;
      document.getElementById('active-world-interval').value = db.activeWorldInterval || 5;
      document.getElementById('active-world-scope').value = db.activeWorldScope || 'both';
      updateActiveWorldStatus();
      document.getElementById('active-world-modal').classList.add('visible');
    });
  }
}

// updateActiveWorldStatus 已从 homeScreen.js 导入

// 启动
initApp();

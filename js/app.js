/* ========================================
   App.js - 模块化入口（完整版）
   替代原 app.js，接管所有初始化
   ======================================== */

import { state } from './core/state.js';
import { initDomCache } from './core/dom.js';
import { applyGlobalFont, showToast, switchScreen, removeContextMenu } from './core/utils.js';
import * as dataService from './core/dataService.js';
import { setChatConfig, setImageConfig } from './core/aiService.js';

import * as chatRoom from './ui/chatRoom.js';
import * as chatList from './ui/chatList.js';
import * as homeScreen from './ui/homeScreen.js';
import * as settings from './ui/settings.js';
import * as tutorial from './ui/tutorial.js';
import * as wallpaper from './ui/wallpaper.js';
import * as customize from './ui/customize.js';
import * as fontSettings from './ui/fontSettings.js';

import * as worldBook from './systems/worldBook.js';
import * as apiSettings from './systems/apiSettings.js';
import * as imgGenSettings from './systems/imgGenSettings.js';
import * as stickers from './systems/stickers.js';
import * as voice from './systems/voice.js';
import * as photoVideo from './systems/photoVideo.js';
import * as wallet from './systems/wallet.js';
import * as gift from './systems/gift.js';
import * as timeSkip from './systems/timeSkip.js';
import * as imageRecognition from './systems/imageRecognition.js';
import * as group from './systems/group.js';

async function initApp() {
  // 1. 加载数据
  await dataService.loadData();
  const db = dataService.getDb();

  // 2. DOM 缓存
  const dom = initDomCache();
  // 供 switchScreen 使用（模块外需要 dom.screens）
  window.__dom = dom;

  // 3. 全局字体
  applyGlobalFont(db.fontUrl);

  // ─── 注入 7 个屏幕的 HTML（避免白屏） ───
  dom['api-settings-screen'].innerHTML = `<header class="app-header"><button class="back-btn" data-target="home-screen">‹</button><div class="title-container"><h1 class="title">API 设置</h1></div><button class="action-btn" id="add-api-preset-btn">+</button></header><main class="content"><div class="api-preset-list" id="api-preset-list"></div><div style="margin-top:16px;padding:0 4px;"><div class="api-preset-card" id="img-gen-settings-card" style="cursor:pointer;border-left:3px solid var(--accent-color,#ff80ab);"><div class="api-preset-info"><div class="api-preset-name">🎨 生图 API 设置</div><div class="api-preset-meta" id="img-gen-status">独立于聊天API，可配置不同的服务商</div></div><div class="api-preset-actions"><button class="api-preset-edit-btn" id="img-gen-edit-btn">设置</button></div></div></div></main>`;
  dom['api-edit-screen'].innerHTML = `<header class="app-header"><button class="back-btn" id="api-edit-back-btn">‹</button><div class="title-container"><h1 class="title" id="api-edit-title">编辑配置</h1></div><button class="action-btn" id="delete-api-preset-btn" style="color:#ff4444;">删除</button></header><main class="content"><form id="api-edit-form"><input type="hidden" id="api-edit-id"><div class="form-group"><label for="api-edit-name">配置名称</label><input type="text" id="api-edit-name" placeholder="如：DeepSeek主配置" required></div><div class="form-group"><label for="api-edit-provider">API 服务商</label><select id="api-edit-provider"><option value="newapi">NewAPI (自定义)</option><option value="deepseek">DeepSeek</option><option value="claude">Claude</option><option value="gemini">Gemini</option></select></div><div class="form-group"><label for="api-edit-url">API 地址（后缀不用添加/v1）</label><input type="url" id="api-edit-url" placeholder="选择服务商可自动填写" required></div><div class="form-group"><label for="api-edit-key">密钥 (Key)</label><input type="password" id="api-edit-key" placeholder="请输入你的API密钥" required></div><button type="button" class="btn btn-secondary" id="api-edit-fetch-btn"><span class="btn-text">点击拉取模型</span><div class="spinner"></div></button><div class="form-group"><label for="api-edit-model">选择模型</label><select id="api-edit-model" required><option value="">请先拉取模型列表</option></select></div><button type="submit" class="btn btn-primary">保存配置</button></form></main>`;
  dom['img-gen-edit-screen'].innerHTML = `<header class="app-header"><button class="back-btn" id="img-gen-back-btn">‹</button><div class="title-container"><h1 class="title">🎨 生图 API 设置</h1></div><div class="placeholder"></div></header><main class="content"><form id="img-gen-form"><p style="font-size:13px;color:#888;margin-bottom:16px;">独立于聊天API配置，可使用不同的服务商进行图片生成。</p><div class="form-group"><label for="img-gen-url">生图接口地址</label><input type="url" id="img-gen-url" placeholder="如：https://image.pollinations.ai/prompt/"></div><div class="form-group"><label for="img-gen-key">密钥 (Key)</label><input type="password" id="img-gen-key" placeholder="请输入生图API密钥"></div><div class="form-group"><label for="img-gen-model">模型名称</label><input type="text" id="img-gen-model" placeholder="如：black-forest-labs/FLUX.1-schnell"></div><p style="font-size:11px;color:#999;margin:-8px 0 16px;">支持 OpenAI 兼容格式（SiliconFlow、DALL·E 等）。留空地址则不启用生图功能。</p><button type="submit" class="btn btn-primary">保存设置</button><button type="button" class="btn btn-neutral" id="img-gen-reset-btn" style="margin-top:12px;">🔄 重置为默认（Pollinations 免费）</button></form></main>`;
  dom['wallpaper-screen'].innerHTML = `<header class="app-header"><button class="back-btn" data-target="home-screen">‹</button><div class="title-container"><h1 class="title">更换壁纸</h1></div><div class="placeholder"></div></header><main class="content"><div class="wallpaper-preview" id="wallpaper-preview"><span>当前壁纸预览</span></div><input type="file" id="wallpaper-upload" accept="image/*" style="display: none;"><label for="wallpaper-upload" class="btn btn-primary">从相册选择新壁纸</label></main>`;
  dom['font-settings-screen'].innerHTML = `<header class="app-header"><button class="back-btn" data-target="home-screen">‹</button><div class="title-container"><h1 class="title">字体设置</h1></div><div class="placeholder"></div></header><main class="content"><form id="font-settings-form"><div class="form-group"><label for="font-url">字体链接 (ttf, woff, woff2)</label><input type="url" id="font-url" placeholder="https://.../font.ttf" required></div><p style="font-size:12px; color:#888; text-align:center;">示例: https://lf3-static.bytednsdoc.com/obj/eden-cn/jplptk/ljhwZthlaukjlkulzlp/portal/fonts/HarmonyOS_Sans_SC_Regular.woff2</p><button type="submit" class="btn btn-primary">应用字体</button><button type="button" class="btn btn-neutral" id="restore-default-font-btn" style="margin-top: 15px;">恢复默认字体</button></form></main>`;
  dom['customize-screen'].innerHTML = `<header class="app-header"><button class="back-btn" data-target="home-screen">‹</button><div class="title-container"><h1 class="title">主屏幕自定义</h1></div><div class="placeholder"></div></header><main class="content"><form id="customize-form"></form><div style="margin-top:24px;padding:0 4px;"><button type="button" id="check-update-btn" class="btn btn-secondary" style="width:100%;padding:14px;font-size:15px;border-radius:12px;">🔄 检查更新</button><p style="font-size:12px;color:#999;text-align:center;margin-top:8px;">清除浏览器缓存并从仓库重新加载最新版本</p></div></main>`;
  dom['tutorial-screen'].innerHTML = `<header class="app-header"><button class="back-btn" data-target="home-screen">‹</button><div class="title-container"><h1 class="title">教程</h1></div><div class="placeholder"></div></header><main class="content" id="tutorial-content-area"></main>`;

  // 4. 同步 AI 配置到 aiService
  const activePreset = db.apiPresets?.find(p => p.id === db.activeApiPresetId);
  if (activePreset) setChatConfig(activePreset);
  setImageConfig(db.imgGenSettings || {});

  // 5. 初始化所有模块（注入依赖）
  chatRoom.init(dom, chatList.renderChatList);
  chatList.init(dom, chatRoom.openChatRoom);
  settings.init(dom, chatList.renderChatList, chatRoom.renderMessages);
  group.init(dom, chatList.renderChatList, chatRoom.renderMessages);
  homeScreen.init(dom);
  tutorial.init(dom);
  wallpaper.init(dom);
  customize.init(dom);
  fontSettings.init(dom);
  worldBook.init(dom);
  apiSettings.init(dom);
  imgGenSettings.init(dom);
  stickers.init(dom);
  voice.init(dom);
  photoVideo.init(dom);
  wallet.init(dom);
  gift.init(dom);
  timeSkip.init(dom);
  imageRecognition.init(dom);

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

  // 8. 暴露关键函数给全局（Engine 模块需要）
  window.renderChatList = chatList.renderChatList;

  console.log('[App] 模块化入口启动完成');
}

// 启动
initApp();

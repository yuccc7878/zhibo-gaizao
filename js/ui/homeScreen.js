/* ========================================
   HomeScreen - 主屏幕模块
   ======================================== */

import { getDb, saveData } from '../core/dataService.js';
import { pad, defaultIcons } from '../core/utils.js';
import { renderWorldBookList } from '../systems/worldBook.js';
import { renderCustomizeForm } from './customize.js';
import { renderTutorialContent } from './tutorial.js';

let dom = null;

export function init(_dom) {
  dom = _dom;
  setupHomeScreen();
}

function updateClock() {
  const now = new Date();
  const timeDisplay = document.getElementById('time-display');
  const dateDisplay = document.getElementById('date-display');
  if (timeDisplay) timeDisplay.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  if (dateDisplay) dateDisplay.textContent = `${now.getFullYear()}年${pad(now.getMonth() + 1)}月${pad(now.getDate())}日`;
}

function applyWallpaper(url) {
  const homeScreenEl = document.getElementById('home-screen');
  if (homeScreenEl) homeScreenEl.style.backgroundImage = `url(${url})`;
}

async function applyHomeScreenMode(mode) {
  const homeScreenEl = document.getElementById('home-screen');
  if (mode === 'day') homeScreenEl.classList.add('day-mode');
  else homeScreenEl.classList.remove('day-mode');
  const db = getDb();
  db.homeScreenMode = mode;
  await saveData();
}

function setupSwipeNavigation() {
  const container = document.getElementById('page-swipe-container');
  const indicators = document.getElementById('page-indicators');
  if (!container || !indicators) return;
  let curPage = 0;
  const totalPages = 2;
  let startX = 0, startY = 0, deltaX = 0;
  let isDragging = false, isScrolling = null;

  function goToPage(page) {
    curPage = Math.max(0, Math.min(page, totalPages - 1));
    container.style.transform = `translateX(-${curPage * 100}%)`;
    indicators.querySelectorAll('.dot').forEach((dot, i) => dot.classList.toggle('active', i === curPage));
  }

  container.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    deltaX = 0;
    isDragging = true;
    isScrolling = null;
    container.classList.add('dragging');
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    deltaX = e.touches[0].clientX - startX;
    const deltaY = e.touches[0].clientY - startY;
    if (isScrolling === null && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5))
      isScrolling = Math.abs(deltaY) > Math.abs(deltaX);
    if (isScrolling) return;
    const atStart = curPage === 0 && deltaX > 0;
    const atEnd = curPage === totalPages - 1 && deltaX < 0;
    const resistance = (atStart || atEnd) ? 0.3 : 1;
    container.style.transform = `translateX(${-curPage * 100 + (deltaX * resistance / container.offsetWidth * 100)}%)`;
  }, { passive: true });

  container.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    container.classList.remove('dragging');
    if (isScrolling) { goToPage(curPage); return; }
    const threshold = container.offsetWidth * 0.2;
    if (deltaX < -threshold && curPage < totalPages - 1) goToPage(curPage + 1);
    else if (deltaX > threshold && curPage > 0) goToPage(curPage - 1);
    else goToPage(curPage);
  }, { passive: true });

  indicators.querySelectorAll('.dot').forEach(dot => {
    dot.addEventListener('click', () => goToPage(parseInt(dot.dataset.page)));
  });
}

function setupHomeScreen() {
  const db = getDb();
  const getIcon = (id) => (db.customIcons || {})[id] || defaultIcons[id]?.url || '';

  const homePageMain = document.getElementById('home-page-main');
  const homePageRight = document.getElementById('home-page-right');
  if (!homePageMain || !homePageRight) return;

  homePageMain.innerHTML = `
    <div class="time-widget"><div class="time" id="time-display"></div><div class="date" id="date-display"></div></div>
    <div class="app-grid">
      <a href="#" class="app-icon" data-target="chat-list-screen"><img src="${getIcon('chat-list-screen')}" alt="404" class="icon-img"><span class="app-name">${defaultIcons['chat-list-screen']?.name || 'QQ'}</span></a>
      <a href="#" class="app-icon" data-target="api-settings-screen"><img src="${getIcon('api-settings-screen')}" alt="API" class="icon-img"><span class="app-name">${defaultIcons['api-settings-screen']?.name || 'api'}</span></a>
      <a href="#" class="app-icon" data-target="wallpaper-screen"><img src="${getIcon('wallpaper-screen')}" alt="壁纸" class="icon-img"><span class="app-name">${defaultIcons['wallpaper-screen']?.name || '壁纸'}</span></a>
      <a href="#" class="app-icon" data-target="world-book-screen"><img src="${getIcon('world-book-screen')}" alt="世界书" class="icon-img"><span class="app-name">${defaultIcons['world-book-screen']?.name || '世界书'}</span></a>
      <a href="#" class="app-icon" data-target="customize-screen"><img src="${getIcon('customize-screen')}" alt="自定义" class="icon-img"><span class="app-name">${defaultIcons['customize-screen']?.name || '自定义'}</span></a>
      <a href="#" class="app-icon" data-target="tutorial-screen"><img src="${getIcon('tutorial-screen')}" alt="教程" class="icon-img"><span class="app-name">${defaultIcons['tutorial-screen']?.name || '教程'}</span></a>
    </div>
    <div class="dock">
      <a href="#" class="app-icon" id="day-mode-btn"><img src="${getIcon('day-mode-btn')}" alt="日间" class="icon-img"></a>
      <a href="#" class="app-icon" id="night-mode-btn"><img src="${getIcon('night-mode-btn')}" alt="夜间" class="icon-img"></a>
      <a href="#" class="app-icon" data-target="font-settings-screen"><img src="${getIcon('font-settings-screen')}" alt="字体" class="icon-img"></a>
    </div>`;

  // 第二页：模块中心
  const modules = window.Engine?.getAllModules?.() || [];
  homePageRight.innerHTML = `
    <div class="right-page-empty">
      <div class="right-page-title">模块中心</div>
      <div class="right-page-grid">
        ${modules.map(mod => {
          if (mod.id === 'album') {
            const albumMod = window.Engine?.getModule?.('album');
            const coverUrl = albumMod && typeof albumMod.getCoverUrl === 'function' ? albumMod.getCoverUrl() : null;
            const iconContent = coverUrl
              ? `<img src="${coverUrl}" alt="相册" style="width:100%;height:100%;object-fit:cover;border-radius:15px;">`
              : `<span style="font-size:48px;">📷</span>`;
            return `<a href="#" class="app-icon engine-module-btn album-module-btn" data-module="album">
              <div class="icon-img album-icon-img" style="display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.85);box-shadow:0 4px 10px rgba(0,0,0,0.1);overflow:hidden;">${iconContent}</div>
              <span class="app-name">${mod.name}</span>
            </a>`;
          }
          return `<a href="#" class="app-icon engine-module-btn" data-module="${mod.id}">
            <div class="icon-img" style="display:flex;align-items:center;justify-content:center;font-size:30px;background:rgba(255,255,255,0.85);box-shadow:0 4px 10px rgba(0,0,0,0.1);">${mod.icon}</div>
            <span class="app-name">${mod.name}</span>
          </a>`;
        }).join('')}
      </div>
    </div>`;

  // 绑定事件
  homePageRight.querySelectorAll('.engine-module-btn').forEach(btn => {
    btn.addEventListener('click', (e) => { e.preventDefault(); window.Engine?.openModule(btn.dataset.module); });
  });

  setupSwipeNavigation();
  updateClock();
  setInterval(updateClock, 60000);
  applyWallpaper(db.wallpaper);
  applyHomeScreenMode(db.homeScreenMode);

  document.getElementById('day-mode-btn')?.addEventListener('click', (e) => { e.preventDefault(); applyHomeScreenMode('day'); });
  document.getElementById('night-mode-btn')?.addEventListener('click', (e) => { e.preventDefault(); applyHomeScreenMode('night'); });

  // 子页面导航时刷新列表
  document.querySelector('[data-target="world-book-screen"]')?.addEventListener('click', () => {
    renderWorldBookList();
  });
  document.querySelector('[data-target="customize-screen"]')?.addEventListener('click', () => {
    renderCustomizeForm();
  });
  document.querySelector('[data-target="tutorial-screen"]')?.addEventListener('click', () => {
    renderTutorialContent();
  });
}

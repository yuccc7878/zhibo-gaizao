/* ========================================
   Engine DB - 精简桥接层（兼容非模块 script）
   完整持久化逻辑已迁移到 js/core/dataService.js（ES Module）
   本文件仅保留全局变量声明和初始桥接函数，
   dataService.loadData() 执行后会自动覆盖
   window.saveData / window.loadData，使之委托到 dataService
   ======================================== */

// 全局数据对象声明
// 使用 var 而非 let，确保自动挂载到 window 对象上
// 此变量在 ES Module 的 dataService.loadData() 中通过 Object.assign 原地更新
// 不替换引用，所有脚本的 db/window.db 始终指向同一对象
var db = {
    characters: [],
    groups: [],
    apiSettings: {},
    apiPresets: [],
    activeApiPresetId: '',
    wallpaper: 'assets/wallpaper.jpg',
    myStickers: [],
    homeScreenMode: 'night',
    worldBooks: [],
    fontUrl: '',
    customIcons: {},
    imgGenSettings: { url: '', key: '', model: '' },
    albumPhotos: []
};
// 同步到 window.db，供 ES Module dataService.js 和常规 script 引用
window.db = db;

// 桥接函数占位
// 注意：这里使用 var 声明，var 在全局作用域下等同于 window 属性
// 所以 dataService.js 的 window.saveData = saveData 会覆盖此函数
// 非模块脚本的 saveData() 调用在 loadData 执行后自动使用新函数
var saveData = async () => {
    // 如果 dataService 尚未就绪，静默忽略
};
var loadData = async () => {
    // 如果 dataService 尚未就绪，静默忽略
};

// 暴露到全局（冗余但确保可见）
window.saveData = saveData;
window.loadData = loadData;

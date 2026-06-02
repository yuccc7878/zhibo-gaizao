/* ========================================
   DataService - 持久化层封装
   与 engine/db.js 共享同一 Dexie 实例
   作为 ES Module 的统一数据入口
   ======================================== */

/** 内部 db 对象（与 engine/db.js 的全局 db 同步） */
let _db = window.db || {};

/**
 * 加载数据
 * 代理到全局 loadData，完成后同步到内部 _db
 */
export async function loadData() {
  if (typeof window.loadData === 'function') {
    await window.loadData();
  }
  _db = window.db || {};
  return _db;
}

/**
 * 保存数据
 * 代理到全局 saveData
 */
export async function saveData(newDb) {
  if (newDb) {
    _db = newDb;
    Object.assign(window.db, newDb);
  }
  if (typeof window.saveData === 'function') {
    await window.saveData();
  }
}

/** 获取当前 db 引用 */
export function getDb() {
  return _db;
}

// --- 便捷访问方法 ---

export function getCharacter(id) {
  return (_db.characters || []).find(c => c.id === id);
}

export function getGroup(id) {
  return (_db.groups || []).find(g => g.id === id);
}

export async function updateCharacter(id, changes) {
  const char = getCharacter(id);
  if (char) {
    Object.assign(char, changes);
    await saveData();
  }
}

export function getActiveApi() {
  if (_db.apiPresets && _db.apiPresets.length > 0 && _db.activeApiPresetId) {
    return _db.apiPresets.find(p => p.id === _db.activeApiPresetId);
  }
  return _db.apiSettings || {};
}

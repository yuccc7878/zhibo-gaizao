/* ========================================
   状态管理 - 集中管理全局可变状态
   ======================================== */

export const state = {
  currentChatId: null,
  currentChatType: null,
  isGenerating: false,
  isInMultiSelectMode: false,
  editingMessageId: null,
  currentPage: 1,
  currentTransferMessageId: null,
  currentEditingWorldBookId: null,
  currentStickerActionTarget: null,
  currentGroupAction: { type: null, recipients: [] },
};

/** 多选消息 ID 封装 */
export const selectedMessageIds = {
  _ids: new Set(),
  add(id) { this._ids.add(id); },
  delete(id) { this._ids.delete(id); },
  clear() { this._ids.clear(); },
  has(id) { return this._ids.has(id); },
  get size() { return this._ids.size; },
  values() { return this._ids.values(); },
};

/** 常量 */
export const MESSAGES_PER_PAGE = 50;

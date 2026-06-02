/* ========================================
   Wallet - 钱包/转账模块
   ======================================== */

import { state } from '../core/state.js';
import { getDb, saveData } from '../core/dataService.js';
import { showToast } from '../core/utils.js';
import * as chatRoom from '../ui/chatRoom.js';

let dom = null;

export function init(_dom) {
  dom = _dom;
  bindEvents();
}

function bindEvents() {
  dom['wallet-btn'].addEventListener('click', () => {
    const db = getDb();
    if (state.currentChatType === 'group') {
      // 群聊：先选收件人
      const g = getDb().groups.find(gr => gr.id === state.currentChatId);
      if (!g) return;
      import('./group.js').then(mod => mod.renderGroupRecipientSelectionList('选择转账收件人'));
      state.currentGroupAction.type = 'transfer';
    } else {
      dom['send-transfer-form'].reset();
      dom['send-transfer-modal'].classList.add('visible');
    }
  });

  dom['send-transfer-form'].addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseFloat(dom['transfer-amount-input'].value);
    if (amount > 0) {
      chatRoom.sendMyTransfer(amount, dom['transfer-remark-input'].value.trim());
    } else {
      showToast(dom['toast-notification'], '请输入有效的金额');
    }
  });

  dom['accept-transfer-btn'].addEventListener('click', () => chatRoom.respondToTransfer('received'));
  dom['return-transfer-btn'].addEventListener('click', () => chatRoom.respondToTransfer('returned'));
}

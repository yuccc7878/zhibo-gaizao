/* ========================================
   TimeSkip - 时间跳跃模块
   ======================================== */

import * as chatRoom from '../ui/chatRoom.js';

let dom = null;

export function init(_dom) {
  dom = _dom;
  bindEvents();
}

function bindEvents() {
  dom['time-skip-btn'].addEventListener('click', () => {
    dom['time-skip-form'].reset();
    dom['time-skip-modal'].classList.add('visible');
  });

  dom['time-skip-modal'].addEventListener('click', (e) => {
    if (e.target === dom['time-skip-modal']) dom['time-skip-modal'].classList.remove('visible');
  });

  dom['time-skip-form'].addEventListener('submit', (e) => {
    e.preventDefault();
    chatRoom.sendTimeSkipMessage(dom['time-skip-input'].value.trim());
  });
}

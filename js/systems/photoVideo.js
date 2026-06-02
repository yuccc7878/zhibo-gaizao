/* ========================================
   PhotoVideo - 照片/视频发送模块
   ======================================== */

import * as chatRoom from '../ui/chatRoom.js';

let dom = null;

export function init(_dom) {
  dom = _dom;
  bindEvents();
}

function bindEvents() {
  dom['photo-video-btn'].addEventListener('click', () => {
    dom['send-pv-form'].reset();
    dom['send-pv-modal'].classList.add('visible');
  });

  dom['send-pv-form'].addEventListener('submit', (e) => {
    e.preventDefault();
    chatRoom.sendMyPhotoVideo(dom['pv-text-input'].value.trim());
  });
}

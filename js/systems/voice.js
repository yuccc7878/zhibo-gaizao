/* ========================================
   Voice - 语音消息模块
   ======================================== */

import * as chatRoom from '../ui/chatRoom.js';

let dom = null;

export function init(_dom) {
  dom = _dom;
  bindEvents();
}

function bindEvents() {
  dom['voice-message-btn']?.addEventListener('click', () => {
    dom['send-voice-form'].reset();
    dom['voice-duration-preview'].textContent = '0"';
    dom['send-voice-modal']?.classList.add('visible');
  });

  dom['send-voice-form']?.addEventListener('submit', (e) => {
    e.preventDefault();
    chatRoom.sendMyVoiceMessage(dom['voice-text-input'].value.trim());
  });
}

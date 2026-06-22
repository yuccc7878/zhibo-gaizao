/* ========================================
   ImageRecognition - 图片上传识别模块
   ======================================== */

import { compressImage, showToast } from '../core/utils.js';
import * as chatRoom from '../ui/chatRoom.js';

let dom = null;

export function init(_dom) {
  dom = _dom;
  bindEvents();
}

function bindEvents() {
  dom['image-recognition-btn'].addEventListener('click', () => {
    dom['image-upload-input'].click();
  });

  dom['image-upload-input'].addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressed = await compressImage(file, { quality: 0.8, maxWidth: 1024, maxHeight: 1024 });
        await chatRoom.sendImageForRecognition(compressed);
      } catch (err) {
        showToast(dom['toast-notification'], '图片处理失败');
      } finally {
        e.target.value = null;
      }
    }
  });
}

/* ========================================
   TTS Service - 系统语音朗读（Web Speech API）
   ======================================== */

let currentUtterance = null;

/**
 * 朗读文本
 * @param {string} text - 要朗读的文本
 * @param {Object} [options]
 * @param {string} [options.lang='zh-CN']
 * @param {number} [options.rate=1.0] - 语速 0.1~10
 * @param {number} [options.pitch=1.0] - 音调 0~2
 * @param {number} [options.volume=1.0] - 音量 0~1
 * @param {function} [options.onEnd] - 朗读结束回调
 */
export function speak(text, options = {}) {
  if (!window.speechSynthesis) {
    console.warn('[TTS] 当前浏览器不支持 Speech Synthesis');
    return;
  }

  // 停止当前朗读
  stop();

  // 清理文本：去掉特殊标记和 URL
  const cleanText = text
    .replace(/\[.*?\]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/<[^>]*>/g, '')
    .trim();

  if (!cleanText) return;

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = options.lang || 'zh-CN';
  utterance.rate = options.rate ?? 1.0;
  utterance.pitch = options.pitch ?? 1.0;
  utterance.volume = options.volume ?? 1.0;

  utterance.onend = () => {
    currentUtterance = null;
    if (options.onEnd) options.onEnd();
  };

  utterance.onerror = (e) => {
    console.error('[TTS] 朗读出错:', e);
    currentUtterance = null;
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

/** 停止朗读 */
export function stop() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}

/** 是否正在朗读 */
export function isSpeaking() {
  return window.speechSynthesis ? window.speechSynthesis.speaking : false;
}

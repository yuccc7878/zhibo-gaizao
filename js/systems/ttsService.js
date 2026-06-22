/* ========================================
 * TTS Service - 双引擎语音朗读
 * 支持：本地浏览器 (Web Speech API) / 搜狗在线 TTS
 * 配置优先级：角色私有 > 全局 db.ttsConfig
 * ======================================== */

// ─── 状态 ──────────────────────────────
let config = { engine: 'local', sogouSpeaker: 1, sogouSpeed: 3 };
let currentAudio = null;
let currentUtterance = null;
let speaking = false;

// ─── 音色映射 ──────────────────────────
const SPEAKER_NAMES = {
  1: '标准女声', 2: '温柔女声', 3: '甜美女声',
  4: '标准男声', 5: '沉稳男声', 6: '磁性男声',
};

// 语速映射：UI 1-5 → API 1-15（越大越慢）
const SPEED_MAP = { 1: 15, 2: 10, 3: 5, 4: 3, 5: 1 };

// ─── 配置 ──────────────────────────────

/** 设置全局配置 */
export function setConfig(cfg) {
  if (cfg.engine !== undefined) config.engine = cfg.engine;
  if (cfg.sogouSpeaker !== undefined) config.sogouSpeaker = cfg.sogouSpeaker;
  if (cfg.sogouSpeed !== undefined) config.sogouSpeed = cfg.sogouSpeed;
}

/** 获取当前全局配置 */
export function getConfig() {
  return { ...config };
}

/** 获取音色名列表（供 UI 使用） */
export function getSpeakerNames() {
  return { ...SPEAKER_NAMES };
}

// ─── 核心：朗读 ────────────────────────

/**
 * 朗读文本
 * @param {string} text - 要朗读的文本
 * @param {Object} [options]
 * @param {string} [options.engine] - 'local' | 'sogou'，不传则用全局配置
 * @param {number} [options.sogouSpeaker] - 1-6
 * @param {number} [options.sogouSpeed] - 1-5
 * @param {string} [options.lang='zh-CN'] - 本地 TTS 语言
 * @param {number} [options.rate] - 本地 TTS 语速
 * @param {number} [options.pitch] - 本地 TTS 音调
 * @param {number} [options.volume] - 本地 TTS 音量
 * @param {function} [options.onEnd] - 朗读结束回调
 */
export function speak(text, options = {}) {
  const engine = options.engine || config.engine;

  if (engine === 'sogou') {
    speakSogou(text, options);
  } else {
    speakLocal(text, options);
  }
}

// ─── 搜狗 TTS ─────────────────────────

function speakSogou(text, options) {
  stop();

  const cleanText = cleanForTTS(text);
  if (!cleanText) { if (options.onEnd) options.onEnd(); return; }

  const speaker = options.sogouSpeaker || config.sogouSpeaker || 1;
  const speedUI = options.sogouSpeed || config.sogouSpeed || 3;
  const apiSpeed = SPEED_MAP[speedUI] || 5;

  const segments = splitText(cleanText, 200);
  speaking = true;
  playSogouSegments(segments, speaker, apiSpeed, () => {
    speaking = false;
    if (options.onEnd) options.onEnd();
  });
}

function playSogouSegments(segments, speaker, speed, finalOnEnd) {
  if (segments.length === 0) {
    speaking = false;
    if (finalOnEnd) finalOnEnd();
    return;
  }

  const text = segments.shift();
  const url = buildSogouUrl(text, speaker, speed);
  const audio = new Audio(url);
  currentAudio = audio;

  audio.onended = () => {
    currentAudio = null;
    playSogouSegments(segments, speaker, speed, finalOnEnd);
  };

  audio.onerror = (e) => {
    console.error('[TTS] 搜狗播放失败:', e);
    currentAudio = null;
    speaking = false;
    if (finalOnEnd) finalOnEnd();
  };

  audio.play().catch(e => {
    console.warn('[TTS] 播放被浏览器阻止:', e.message);
    currentAudio = null;
    speaking = false;
    if (finalOnEnd) finalOnEnd();
  });
}

function buildSogouUrl(text, speaker, speed) {
  return 'https://fanyi.sogou.com/reventondc/synthesis'
    + '?text=' + encodeURIComponent(text)
    + '&speed=' + speed
    + '&lang=zh-CHS'
    + '&speaker=' + speaker
    + '&from=translate.web.sogou.com';
}

// ─── 本地 TTS (Web Speech API) ─────────

function speakLocal(text, options) {
  if (!window.speechSynthesis) {
    console.warn('[TTS] 浏览器不支持 Speech Synthesis');
    if (options.onEnd) options.onEnd();
    return;
  }

  stop();

  const cleanText = cleanForTTS(text);
  if (!cleanText) { if (options.onEnd) options.onEnd(); return; }

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = options.lang || 'zh-CN';
  utterance.rate = options.rate ?? 1.0;
  utterance.pitch = options.pitch ?? 1.0;
  utterance.volume = options.volume ?? 1.0;

  utterance.onend = () => {
    currentUtterance = null;
    speaking = false;
    if (options.onEnd) options.onEnd();
  };

  utterance.onerror = (e) => {
    console.error('[TTS] 本地朗读出错:', e);
    currentUtterance = null;
    speaking = false;
    if (options.onEnd) options.onEnd();
  };

  currentUtterance = utterance;
  speaking = true;
  window.speechSynthesis.speak(utterance);
}

// ─── 停止 ──────────────────────────────

export function stop() {
  // 停止搜狗音频
  if (currentAudio) {
    try { currentAudio.pause(); } catch (_) {}
    currentAudio = null;
  }
  // 停止本地 TTS
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
  speaking = false;
}

// ─── 状态 ──────────────────────────────

export function isSpeaking() {
  if (currentAudio && !currentAudio.paused) return true;
  if (window.speechSynthesis && window.speechSynthesis.speaking) return true;
  return speaking;
}

// ─── 工具函数 ──────────────────────────

/** 清理文本用于 TTS */
function cleanForTTS(text) {
  return (text || '')
    .replace(/\[.*?\]/g, '')          // 去标记
    .replace(/https?:\/\/\S+/g, '')   // 去 URL
    .replace(/<[^>]*>/g, '')           // 去 HTML
    .replace(/\s+/g, ' ')             // 合并空白
    .trim();
}

/** 长文本分段（按标点断句，每段不超过 maxLen） */
function splitText(text, maxLen) {
  if (text.length <= maxLen) return [text];

  const segments = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      segments.push(remaining);
      break;
    }

    // 在 maxLen 范围内找最后一个标点断句
    let cutAt = -1;
    const searchRange = remaining.substring(0, maxLen);
    const punctuations = ['。', '！', '？', '；', '，', '、', '…', '.', '!', '?', ';', ','];
    for (const p of punctuations) {
      const idx = searchRange.lastIndexOf(p);
      if (idx > cutAt && idx > maxLen * 0.3) { // 至少 30% 长度才断
        cutAt = idx + 1;
      }
    }

    // 没找到标点就硬切
    if (cutAt <= 0) cutAt = maxLen;

    segments.push(remaining.substring(0, cutAt));
    remaining = remaining.substring(cutAt);
  }

  return segments;
}

// ─── 暴露到全局（供 video-call.js 等非模块脚本使用）───
window.ttsService = { speak, stop, isSpeaking, setConfig, getConfig, getSpeakerNames };

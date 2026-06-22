/* ========================================
 * VideoCall - 视频通话模块（ES Module 版）
 * 合并到主聊天模块，与其他功能（表情包、语音等）并列
 * ======================================== */

import { getDb, saveData } from '../core/dataService.js';
import { showToast } from '../core/utils.js';
import { getEffectivePrompt, fillTemplate } from '../ui/promptDefaults.js';
import { state } from '../core/state.js';

// ─── 内部状态 ────────────────────────
var vcState = {
  active: false,
  startTime: null,
  characterId: null,
  characterName: '',
  timerInterval: null,
  isMuted: false,
  cameraOn: false,
  recognition: null,
  isRecognizing: false,
  subtitleTimer: null,
  replyQueue: [],
  isSpeaking: false,
};

// ─── DOM 引用 ────────────────────────
var overlay, charAvatar, charNameEl, timerEl, subtitleEl,
    muteBtn, cameraBtn, endBtn, userInput, sendBtn,
    speechBtn, subtitleText, callStatus, selfVideo;

var dom = null;

// ─── 初始化 ──────────────────────────

export function init(_dom) {
  dom = _dom;
  cacheDom();
  bindEvents();
  console.log('[VideoCall] 初始化完成');
}

function cacheDom() {
  overlay       = document.getElementById('vc-overlay');
  charAvatar    = document.getElementById('vc-char-avatar');
  charNameEl    = document.getElementById('vc-char-name');
  timerEl       = document.getElementById('vc-timer');
  subtitleEl    = document.getElementById('vc-subtitle');
  subtitleText  = document.getElementById('vc-subtitle-text');
  callStatus    = document.getElementById('vc-call-status');
  muteBtn       = document.getElementById('vc-mute-btn');
  cameraBtn     = document.getElementById('vc-camera-btn');
  endBtn        = document.getElementById('vc-end-btn');
  userInput     = document.getElementById('vc-user-input');
  sendBtn       = document.getElementById('vc-send-btn');
  speechBtn     = document.getElementById('vc-speech-btn');
  selfVideo     = document.getElementById('vc-self-video');
}

function bindEvents() {
  // 挂断
  endBtn?.addEventListener('click', endCall);
  // 静音
  muteBtn?.addEventListener('click', toggleMute);
  // 相机
  cameraBtn?.addEventListener('click', toggleCamera);
  // 发送文字
  sendBtn?.addEventListener('click', sendTextMessage);
  userInput?.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTextMessage(); }
  });
  // 语音输入
  speechBtn?.addEventListener('touchstart', function(e) { e.preventDefault(); startSpeech(); });
  speechBtn?.addEventListener('touchend', function(e) { e.preventDefault(); stopSpeech(); });
  speechBtn?.addEventListener('mousedown', startSpeech);
  speechBtn?.addEventListener('mouseup', stopSpeech);

  // 工具栏按钮（在聊天室贴纸栏中）
  var toolBtn = document.getElementById('video-call-btn');
  if (toolBtn) {
    toolBtn.addEventListener('click', function() {
      var chatType = state.currentChatType || '';
      var chatId = state.currentChatId || '';
      if (chatType !== 'private') {
        showToast(dom?.['toast-notification'], '视频通话仅支持私聊');
        return;
      }
      openCall(chatId);
    });
  }
}

// ─── 打开通话 ────────────────────────

function openCall(characterId) {
  if (vcState.active) return;
  var db = getDb();
  var char = (db.characters || []).find(function(c) { return c.id === characterId; });
  if (!char) return;

  vcState.active = true;
  vcState.characterId = characterId;
  vcState.characterName = char.remarkName || char.realName;
  vcState.startTime = Date.now();
  vcState.isMuted = false;
  vcState.cameraOn = false;
  vcState.replyQueue = [];
  vcState.isSpeaking = false;

  // 设置 UI
  if (charAvatar) charAvatar.src = char.avatar || '';
  if (charNameEl) charNameEl.textContent = vcState.characterName;
  if (timerEl) timerEl.textContent = '00:00';
  if (subtitleText) subtitleText.textContent = '';
  if (subtitleEl) subtitleEl.style.opacity = '0';
  if (callStatus) { callStatus.textContent = '呼叫中...'; callStatus.style.display = ''; }
  muteBtn?.classList.remove('active');
  cameraBtn?.classList.remove('active');
  if (selfVideo) selfVideo.style.display = 'none';
  if (userInput) userInput.value = '';
  updateSpeechBtnState();

  // 显示 overlay
  overlay?.classList.add('visible');

  // 计时器
  vcState.timerInterval = setInterval(updateTimer, 1000);

  // 模拟响铃后接通
  setTimeout(function() {
    if (!vcState.active) return;
    if (callStatus) { callStatus.textContent = ''; callStatus.style.display = 'none'; }
    triggerAiGreeting(char);
  }, 1500);
}

// ─── AI 开场白 ───────────────────────

function triggerAiGreeting(char) {
  var systemPrompt = generateCallPrompt(char);
  var historySlice = (char.history || []).slice(-(char.maxMemory || 50)).map(function(msg) {
    return { role: msg.role, content: msg.content };
  });
  historySlice.push({ role: 'user', content: '[用户发起了视频通话]' });

  if (typeof Engine !== 'undefined' && Engine.services && Engine.services.aiChat) {
    Engine.services.aiChat({
      system: systemPrompt,
      messages: historySlice,
      options: { temperature: 0.9, maxTokens: 200 }
    }).then(function(response) {
      if (response && vcState.active) {
        handleCallResponse(response, char);
      }
    }).catch(function(err) {
      console.error('[VideoCall] 开场白失败:', err);
      showSubtitle('(连接中...)');
    });
  }
}

// ─── 用户发送文字 ────────────────────

function sendTextMessage() {
  if (!vcState.active) return;
  var text = userInput.value.trim();
  if (!text) return;
  userInput.value = '';

  var db = getDb();
  var char = (db.characters || []).find(function(c) { return c.id === vcState.characterId; });
  if (!char) return;

  var msg = {
    id: 'msg_vc_' + Date.now(),
    role: 'user',
    content: text,
    timestamp: Date.now(),
    callRecord: true
  };
  if (!char.history) char.history = [];
  char.history.push(msg);
  saveData();

  requestAiReply(char, text);
}

// ─── 语音输入 ────────────────────────

function startSpeech() {
  if (!vcState.active) return;
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast(dom?.['toast-notification'], '当前浏览器不支持语音输入');
    return;
  }
  if (vcState.isRecognizing) return;

  vcState.recognition = new SpeechRecognition();
  vcState.recognition.lang = 'zh-CN';
  vcState.recognition.continuous = false;
  vcState.recognition.interimResults = true;

  vcState.recognition.onresult = function(event) {
    var result = event.results[event.results.length - 1];
    var transcript = result[0].transcript;
    if (userInput) userInput.value = transcript;
    if (result.isFinal) {
      setTimeout(function() { sendTextMessage(); }, 300);
    }
  };
  vcState.recognition.onerror = function(e) {
    console.warn('[VideoCall] 语音识别错误:', e.error);
    vcState.isRecognizing = false;
    updateSpeechBtnState();
  };
  vcState.recognition.onend = function() {
    vcState.isRecognizing = false;
    updateSpeechBtnState();
  };

  try {
    vcState.recognition.start();
    vcState.isRecognizing = true;
    updateSpeechBtnState();
  } catch (_) {}
}

function stopSpeech() {
  if (vcState.recognition && vcState.isRecognizing) {
    vcState.recognition.stop();
  }
}

function updateSpeechBtnState() {
  if (!speechBtn) return;
  if (vcState.isRecognizing) {
    speechBtn.classList.add('recording');
    speechBtn.textContent = '🔴';
  } else {
    speechBtn.classList.remove('recording');
    speechBtn.textContent = '🎤';
  }
}

// ─── 请求 AI 回复 ────────────────────

function requestAiReply(char, userText) {
  if (typeof Engine === 'undefined' || !Engine.services || !Engine.services.aiChat) return;

  var systemPrompt = generateCallPrompt(char);
  var historySlice = (char.history || []).slice(-(char.maxMemory || 50)).map(function(msg) {
    return { role: msg.role, content: msg.content };
  });

  Engine.services.aiChat({
    system: systemPrompt,
    messages: historySlice,
    options: { temperature: 0.9, maxTokens: 200 }
  }).then(function(response) {
    if (response && vcState.active) {
      handleCallResponse(response, char);
    }
  }).catch(function(err) {
    console.error('[VideoCall] AI 回复失败:', err);
  });
}

// ─── 处理 AI 回复 ────────────────────

function handleCallResponse(fullResponse, char) {
  var text = fullResponse
    .replace(/\[生成配图[::].*?\]/g, '')
    .replace(/\[.*?的消息[::]/g, '')
    .replace(/\[.*?的语音[::]/g, '')
    .replace(/\]/g, '')
    .trim();

  if (!text) return;

  var lines = text.split('\n').filter(function(l) { return l.trim(); });

  vcState.replyQueue = vcState.replyQueue.concat(lines);
  if (!vcState.isSpeaking) {
    processReplyQueue(char);
  }
}

function processReplyQueue(char) {
  if (vcState.replyQueue.length === 0 || !vcState.active) {
    vcState.isSpeaking = false;
    return;
  }

  vcState.isSpeaking = true;
  var line = vcState.replyQueue.shift();

  showSubtitle(line);

  var msg = {
    id: 'msg_vc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    role: 'assistant',
    content: line,
    timestamp: Date.now(),
    callRecord: true
  };
  if (!char.history) char.history = [];
  char.history.push(msg);
  saveData();

  if (!vcState.isMuted) {
    speakText(line, function() {
      setTimeout(function() { processReplyQueue(char); }, 500);
    });
  } else {
    var delay = Math.max(1500, Math.min(line.length * 150, 5000));
    setTimeout(function() { processReplyQueue(char); }, delay);
  }
}

// ─── 字幕 ────────────────────────────

function showSubtitle(text) {
  if (vcState.subtitleTimer) clearTimeout(vcState.subtitleTimer);
  if (subtitleText) subtitleText.textContent = text;
  if (subtitleEl) subtitleEl.style.opacity = '1';
  charAvatar?.classList.add('speaking');

  var displayTime = Math.max(3000, Math.min(text.length * 200, 8000));
  vcState.subtitleTimer = setTimeout(function() {
    if (subtitleEl) subtitleEl.style.opacity = '0';
    charAvatar?.classList.remove('speaking');
  }, displayTime);
}

// ─── TTS ─────────────────────────────

function speakText(text, onEnd) {
  if (window.ttsService) {
    var db = getDb();
    var c = (db.characters || []).find(function(ch) { return ch.id === vcState.characterId; });
    var ttsCfg = (c && c.ttsConfig && c.ttsConfig.engine !== 'global') ? c.ttsConfig : (db.ttsConfig || {});
    window.ttsService.speak(text, {
      engine: ttsCfg.engine || 'local',
      sogouSpeaker: ttsCfg.sogouSpeaker || 1,
      sogouSpeed: ttsCfg.sogouSpeed || 3,
      rate: 1.1,
      onEnd: onEnd
    });
    return;
  }
  var ss = window.speechSynthesis;
  if (!ss) { if (onEnd) onEnd(); return; }
  ss.cancel();
  var utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.volume = 1;
  utterance.rate = 1.1;
  utterance.pitch = 1;
  utterance.onend = function() { if (onEnd) onEnd(); };
  utterance.onerror = function() { if (onEnd) onEnd(); };
  ss.speak(utterance);
}

// ─── 计时器 ──────────────────────────

function updateTimer() {
  if (!vcState.startTime) return;
  var elapsed = Math.floor((Date.now() - vcState.startTime) / 1000);
  var m = Math.floor(elapsed / 60);
  var s = elapsed % 60;
  if (timerEl) timerEl.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

// ─── 静音 ────────────────────────────

function toggleMute() {
  vcState.isMuted = !vcState.isMuted;
  muteBtn?.classList.toggle('active', vcState.isMuted);
  if (muteBtn) muteBtn.textContent = vcState.isMuted ? '🔇' : '🔊';
  if (vcState.isMuted) {
    if (window.ttsService) window.ttsService.stop();
    else window.speechSynthesis && window.speechSynthesis.cancel();
  }
}

// ─── 相机 ────────────────────────────

function toggleCamera() {
  if (!selfVideo) return;
  vcState.cameraOn = !vcState.cameraOn;
  cameraBtn?.classList.toggle('active', vcState.cameraOn);

  if (vcState.cameraOn) {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(function(stream) {
          selfVideo.srcObject = stream;
          selfVideo.style.display = '';
        })
        .catch(function() {
          vcState.cameraOn = false;
          cameraBtn?.classList.remove('active');
          showToast(dom?.['toast-notification'], '无法访问摄像头');
        });
    }
  } else {
    if (selfVideo.srcObject) {
      selfVideo.srcObject.getTracks().forEach(function(t) { t.stop(); });
      selfVideo.srcObject = null;
    }
    selfVideo.style.display = 'none';
  }
}

// ─── 挂断 ────────────────────────────

function endCall() {
  if (!vcState.active) return;
  vcState.active = false;

  if (vcState.timerInterval) { clearInterval(vcState.timerInterval); vcState.timerInterval = null; }
  if (vcState.subtitleTimer) { clearTimeout(vcState.subtitleTimer); vcState.subtitleTimer = null; }
  window.speechSynthesis && window.speechSynthesis.cancel();
  if (vcState.recognition && vcState.isRecognizing) { vcState.recognition.stop(); }
  if (selfVideo && selfVideo.srcObject) {
    selfVideo.srcObject.getTracks().forEach(function(t) { t.stop(); });
    selfVideo.srcObject = null;
  }

  vcState.replyQueue = [];
  vcState.isSpeaking = false;

  var db = getDb();
  var char = (db.characters || []).find(function(c) { return c.id === vcState.characterId; });
  var duration = timerEl ? timerEl.textContent : '00:00';

  if (char) {
    var callMsg = {
      id: 'msg_vc_end_' + Date.now(),
      role: 'system',
      content: '[视频通话结束 · ' + duration + ']',
      timestamp: Date.now(),
      callRecord: true,
      callDuration: duration
    };
    if (!char.history) char.history = [];
    char.history.push(callMsg);
    saveData();
  }

  overlay?.classList.remove('visible');

  // 刷新消息列表
  if (typeof window.renderMessages === 'function') window.renderMessages(false, true);
  if (typeof window.renderChatList === 'function') window.renderChatList();

  showToast(dom?.['toast-notification'], '通话结束 ' + duration);
}

// ─── system prompt 生成 ───────────────

function generateCallPrompt(char) {
  var db = getDb();
  var template = getEffectivePrompt('video_call', db);
  if (!template) {
    template = '# 【视频通话模式】\n你正在与用户进行视频通话（语音对话）。遵守以下规则：\n1. 用口语化的方式说话，像真人在打电话一样，不要用书面语\n2. 每次回复简短（1-3句话），不要长篇大论\n3. 可以使用语气词（嗯、哈哈、哎、哦）让对话更自然\n4. 可以主动提问、追问，保持对话流畅\n5. 适当表达情绪（笑、叹气、惊讶）\n6. 直接说人话，不要使用 [消息格式] 标记\n7. 不要使用表情包、图片等多媒体，纯文字交流\n8. 如果用户说"挂了""拜拜"，回复告别语\n\n你的名字: {realName}\n对方称呼你: {myName}\n你的人设: {persona}\n{status}{memorySummary}{keyEvents}';
  }
  var vars = {
    realName: char.realName || '',
    myName: char.myName || '用户',
    persona: char.persona || '无特定人设',
    status: char.status ? '你的状态: ' + char.status + '\n' : '',
    memorySummary: char.memorySummary ? '与用户的记忆: ' + char.memorySummary + '\n' : '',
    keyEvents: (char.keyEvents && char.keyEvents.length > 0) ? '关键事件: ' + char.keyEvents.join('；') + '\n' : '',
  };
  return fillTemplate(template, vars);
}

// ─── 导出（兼容 window.VideoCall） ───

export function isActive() { return vcState.active; }
export function getCharacterId() { return vcState.characterId; }
export { openCall as open, endCall };

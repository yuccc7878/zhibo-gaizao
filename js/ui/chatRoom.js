/* ========================================
   ChatRoom - 聊天室核心逻辑
   ======================================== */

import { state, selectedMessageIds, MESSAGES_PER_PAGE } from '../core/state.js';
import * as dataService from '../core/dataService.js';
import * as utils from '../core/utils.js';
import { generatePrivateSystemPrompt, generateGroupSystemPrompt } from './promptBuilder.js';

// aiService 已通过全局 script 加载
const { chat, generateImage } = window.AiService;

// ─── 依赖注入 ──────────────────────────

let dom = null;
let _renderChatList = null; // 由 chatList 模块注入
let currentImageBase64 = null; // 图片识别暂存

export function init(_dom, renderChatList) {
  dom = _dom;
  _renderChatList = renderChatList;
  bindEvents();
}

// ─── 事件绑定 ──────────────────────────

function bindEvents() {
  dom['send-message-btn'].addEventListener('click', sendMessage);
  dom['send-message-btn'].addEventListener('touchend', (e) => {
    e.preventDefault(); sendMessage(); setTimeout(() => dom['message-input'].focus(), 50);
  });
  dom['message-input'].addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !state.isGenerating) sendMessage();
  });
  dom['get-reply-btn'].addEventListener('click', triggerAiReply);
  dom['message-area'].addEventListener('click', (e) => {
    // 点击气泡外的空白关闭编辑模式、退出多选
    if (state.editingMessageId) { cancelMessageEdit(); }
    if (state.isInMultiSelectMode && !e.target.closest('.message-wrapper')) { exitMultiSelectMode(); }
    const markBtn = e.target.closest('.mark-key-event-btn');
    if (markBtn) {
      const wrapper = markBtn.closest('.message-wrapper');
      if (wrapper) markAsKeyEvent(wrapper.dataset.messageId, wrapper.dataset.content || '');
    }
    const transferClick = e.target.closest('.transfer-message.pending');
    if (transferClick) handleReceivedTransferClick(transferClick.dataset.messageId);
    const friendAddBtn = e.target.closest('.friend-add-btn');
    if (friendAddBtn) {
      const engineFriendAdd = Engine.getModule?.('gacha');
      if (engineFriendAdd?.addFriendFromChat) {
        const wrapper = friendAddBtn.closest('.message-wrapper');
        engineFriendAdd.addFriendFromChat(wrapper?.dataset?.senderName || '未知');
      }
    }
  });
  dom['message-area'].addEventListener('contextmenu', (e) => {
    const wrapper = e.target.closest('.message-wrapper');
    if (wrapper) { e.preventDefault(); handleMessageLongPress(wrapper, e.clientX, e.clientY); }
  });
  dom['message-area'].addEventListener('touchstart', (e) => {
    const wrapper = e.target.closest('.message-wrapper');
    if (wrapper) {
      state._longPressTimer = setTimeout(() => {
        const rect = wrapper.getBoundingClientRect();
        handleMessageLongPress(wrapper, rect.left + rect.width / 2, rect.top + rect.height / 2);
      }, 500);
    }
  });
  dom['message-area'].addEventListener('touchend', () => { clearTimeout(state._longPressTimer); });
  dom['message-area'].addEventListener('touchmove', () => { clearTimeout(state._longPressTimer); });
  dom['save-edit-btn'].addEventListener('click', saveMessageEdit);
  dom['cancel-edit-btn'].addEventListener('click', cancelMessageEdit);
  dom['cancel-multi-select-btn'].addEventListener('click', exitMultiSelectMode);
  dom['delete-selected-btn'].addEventListener('click', deleteSelectedMessages);
}

// ─── 聊天室开关 ────────────────────────

export function openChatRoom(chatId, type) {
  state.currentChatId = chatId;
  state.currentChatType = type;
  state.currentPage = 1;
  state.editingMessageId = null;
  exitMultiSelectMode();

  const chat = type === 'private'
    ? dataService.getCharacter(chatId)
    : dataService.getGroup(chatId);
  if (!chat) return;

  utils.switchScreen(dom, 'chat-room-screen');
  dom['chat-room-screen'].className = 'screen active chat-active-' + chatId;

  const remarkName = type === 'private' ? chat.remarkName : chat.name;
  dom['chat-room-title'].textContent = remarkName;
  dom['chat-room-status-text'].textContent = type === 'private' ? (chat.status || '在线') : `${(chat.members || []).length} 人`;
  dom['message-input'].value = '';
  dom['message-input'].focus();

  // 设置聊天背景
  if (chat.chatBg) {
    dom['chat-room-screen'].style.backgroundImage = `url(${chat.chatBg})`;
  } else {
    dom['chat-room-screen'].style.backgroundImage = '';
  }

  // 应用气泡样式
  const hasCustomCss = type === 'private'
    ? (chat.useCustomBubbleCss && chat.customBubbleCss)
    : (chat.useCustomBubbleCss && chat.customBubbleCss);
  utils.updateCustomBubbleStyle(chatId, hasCustomCss ? chat.customBubbleCss : '', !!hasCustomCss);

  renderMessages();
}

// ─── 消息渲染 ──────────────────────────

export function renderMessages(isLoadMore = false, forceScrollToBottom = false) {
  const chat = state.currentChatType === 'private'
    ? dataService.getCharacter(state.currentChatId)
    : dataService.getGroup(state.currentChatId);
  if (!chat) return;

  const container = dom['message-area'];
  const history = chat.history || [];
  const totalPages = Math.ceil(history.length / MESSAGES_PER_PAGE) || 1;
  if (state.currentPage > totalPages) state.currentPage = totalPages;

  // 加载更多时保留滚动位置
  let prevScrollHeight = 0;
  if (isLoadMore) prevScrollHeight = container.scrollHeight;

  container.innerHTML = '';
  if (state.currentPage < totalPages) {
    const loadMore = document.createElement('div');
    loadMore.className = 'load-more-btn';
    loadMore.textContent = '加载更多...';
    loadMore.addEventListener('click', loadMoreMessages);
    container.appendChild(loadMore);
  }

  const startIdx = history.length - state.currentPage * MESSAGES_PER_PAGE;
  const pageMessages = history.slice(Math.max(0, startIdx));

  pageMessages.forEach(msg => {
    const el = createMessageBubbleElement(msg);
    if (el) container.appendChild(el);
  });

  if (isLoadMore) {
    container.scrollTop = container.scrollHeight - prevScrollHeight;
  } else if (forceScrollToBottom || !isLoadMore) {
    container.scrollTop = container.scrollHeight;
  }
}

function loadMoreMessages() {
  state.currentPage++;
  renderMessages(true, false);
}

// ─── 气泡创建 ──────────────────────────

export function createMessageBubbleElement(message) {
  const db = dataService.getDb();
  const isSent = message.role === 'user';
  const chat = state.currentChatType === 'private'
    ? dataService.getCharacter(state.currentChatId)
    : dataService.getGroup(state.currentChatId);
  if (!chat) return null;

  const themeKey = chat.theme || 'white_pink';
  const bubbleTheme = utils.colorThemes[themeKey] || utils.colorThemes['white_pink'];
  const isGroupMsg = state.currentChatType === 'group' && !isSent;

  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper';
  if (message.id) wrapper.dataset.messageId = message.id;
  wrapper.dataset.content = message.content || '';
  if (message.senderName) wrapper.dataset.senderName = message.senderName;

  // 头像
  let avatarUrl = '';
  let senderNickname = '';
  if (isSent || message.senderId === 'user_me') {
    avatarUrl = chat.myAvatar || '';
    senderNickname = chat.myName || '我';
  } else {
    if (state.currentChatType === 'private') {
      avatarUrl = chat.avatar;
    } else {
      const sender = (chat.members || []).find(m => m.id === message.senderId);
      if (sender) { avatarUrl = sender.avatar; senderNickname = sender.groupNickname; }
      else avatarUrl = 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg';
    }
  }

  // 气泡容器
  const bubbleRow = document.createElement('div');
  bubbleRow.className = 'bubble-row ' + (isSent ? 'sent-row' : 'received-row');

  if (!isSent && avatarUrl) {
    const avatar = document.createElement('img');
    avatar.className = 'msg-avatar';
    avatar.src = avatarUrl;
    avatar.addEventListener('click', (e) => { e.stopPropagation(); });
    bubbleRow.appendChild(avatar);
  }

  const bubbleGroup = document.createElement('div');
  bubbleGroup.className = 'bubble-group';
  bubbleGroup.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;';

  if (isGroupMsg && senderNickname) {
    const nameLabel = document.createElement('div');
    nameLabel.className = 'sender-name';
    nameLabel.textContent = senderNickname;
    bubbleGroup.appendChild(nameLabel);
  }

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble ' + (isSent ? 'sent' : 'received');

  // 检测图片
  const hasImage = (message.parts && message.parts.some(p => p.type === 'image'))
    || (message.content && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(message.content));

  if (hasImage) {
    bubble.classList.add('image-bubble');
    const parts = message.parts || [];
    const imgPart = parts.find(p => p.type === 'image');
    const imgSrc = imgPart ? imgPart.data : message.content;
    const textPart = parts.find(p => p.type === 'text');
    const img = document.createElement('img');
    img.className = 'chat-image';
    img.src = imgSrc;
    img.alt = '图片';
    img.style.maxWidth = '240px';
    img.style.borderRadius = '12px';
    img.style.cursor = 'pointer';
    img.loading = 'lazy';
    img.addEventListener('click', () => {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:9999;cursor:pointer;';
      const bigImg = document.createElement('img');
      bigImg.src = imgSrc;
      bigImg.style.cssText = 'max-width:95%;max-height:95%;border-radius:8px;';
      overlay.appendChild(bigImg);
      overlay.addEventListener('click', () => overlay.remove());
      document.body.appendChild(overlay);
    });
    bubble.appendChild(img);
    if (textPart && textPart.text && textPart.text !== 'AI生成的图片') {
      const caption = document.createElement('div');
      caption.style.cssText = 'font-size:12px;color:#888;margin-top:4px;';
      caption.textContent = textPart.text;
      bubble.appendChild(caption);
    }
    // 背景气泡色
    bubble.style.backgroundColor = isSent ? bubbleTheme.sent.bg : bubbleTheme.received.bg;
  } else if (message.content) {
    // 文本内容
    let displayText = message.content;
    // 预处理：替换聊天内嵌图片图为 <img>
    const imgRegex = /https?:\/\/[^\s]*\.(jpg|jpeg|png|gif|webp)(\?[^\s]*)?/gi;
    displayText = displayText.replace(imgRegex, (match) => {
      const encodedMatch = match.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<img src="${encodedMatch}" alt="图片" class="chat-image" style="max-width:200px;border-radius:12px;display:block;margin:4px 0;">`;
    });
    displayText = displayText.replace(/\n/g, '<br>');
    // 检测是否包含特殊消息格式（转账、礼物、状态等）
    const isSpecial = /\[.*?\]/.test(message.content);
    if (isSpecial) {
      bubble.classList.add('system-bubble');
    }
    // 检测转账
    if (message.transferStatus) {
      const isPending = message.transferStatus === 'pending';
      if (isPending) bubble.classList.add('transfer-message', 'pending');
      const transferMatch = message.content.match(/\[.*?的转账：([\d.]+)元；备注：([^\]]*)\]/);
      const amount = transferMatch ? transferMatch[1] : '0';
      const remark = transferMatch ? transferMatch[2] : '';
      if (isPending) {
        bubble.dataset.messageId = message.id;
        bubble.innerHTML = `<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:24px;">💸</span><div><div style="font-weight:600;">转账 ${amount} 金币</div><div style="font-size:12px;color:#888;">备注：${remark || '无'}<br>点击查收</div></div></div>`;
      } else {
        bubble.innerHTML = `<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:24px;">💸</span><div><div style="font-weight:600;">转账 ${amount} 金币</div><div style="font-size:12px;color:${message.transferStatus === 'received' ? '#4CAF50' : '#FF6B6B'};">${message.transferStatus === 'received' ? '已接收' : '已退回'}</div></div></div>`;
      }
    } else if (message.giftStatus) {
      const isSentGift = message.giftStatus === 'sent';
      const giftMatch = message.content.match(/\[.*?送来的礼物：([^\]]*)\]/);
      const giftDesc = giftMatch ? giftMatch[1] : '礼物';
      if (isSentGift) {
        bubble.innerHTML = `<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:24px;">🎁</span><div><div style="font-weight:600;">${giftDesc}</div><div style="font-size:12px;color:#888;">点击查收</div></div></div>`;
        bubble.dataset.messageId = message.id;
        bubble.classList.add('transfer-message', 'pending');
      } else {
        bubble.innerHTML = `<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:24px;">🎁</span><div><div style="font-weight:600;">${giftDesc}</div><div style="font-size:12px;color:#4CAF50;">已查收</div></div></div>`;
      }
    } else if (/\[.*?更新状态为：/.test(message.content)) {
      const statusMatch = message.content.match(/\[.*?更新状态为：([^\]]+)\]/);
      const statusText = statusMatch ? statusMatch[1] : '';
      bubble.style.backgroundColor = '#f0f0f0';
      bubble.style.color = '#888';
      bubble.style.fontSize = '13px';
      bubble.style.textAlign = 'center';
      bubble.innerHTML = '📢 ' + statusText;
    } else if (/\[.*?(?:已接收礼物|接收.*?的转账|退回.*?的转账)\]/g.test(message.content)) {
      bubble.style.backgroundColor = '#f9f9f9';
      bubble.style.color = '#999';
      bubble.style.fontSize = '12px';
      bubble.style.textAlign = 'center';
      bubble.style.padding = '4px 12px';
      bubble.innerHTML = message.content.replace(/\[(.*?)\]/g, '$1');
    } else if (/\[system:/i.test(message.content)) {
      bubble.style.backgroundColor = '#f5f5f5';
      bubble.style.color = '#aaa';
      bubble.style.fontSize = '12px';
      bubble.style.textAlign = 'center';
      bubble.innerHTML = message.content.replace(/\[system:/i, '').replace(/\]/g, '');
    } else if (/\[.*?的消息：/.test(message.content)) {
      const textMatch = message.content.match(/\[.*?的消息：([\s\S]*)\]/);
      bubble.textContent = textMatch ? textMatch[1].trim() : message.content;
    } else {
      bubble.innerHTML = displayText;
    }
    bubble.style.backgroundColor = isSent ? bubbleTheme.sent.bg : bubbleTheme.received.bg;
    bubble.style.color = isSent ? bubbleTheme.sent.text : bubbleTheme.received.text;
  } else {
    return null;
  }

  bubbleGroup.appendChild(bubble);
  bubbleRow.appendChild(bubbleGroup);

  // TTS 朗读按钮（仅接收到的文本消息）
  if (!isSent && message.content && !hasImage
      && !message.transferStatus && !message.giftStatus
      && !/\[.*?(?:更新状态|已接收礼物|接收.*转账|退回.*转账|system)/.test(message.content)) {
    const speakBtn = document.createElement('button');
    speakBtn.className = 'tts-speak-btn';
    speakBtn.textContent = '🔊';
    speakBtn.title = '朗读';
    speakBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:14px;padding:2px 6px;opacity:0.4;transition:opacity 0.2s;flex-shrink:0;align-self:flex-end;';
    speakBtn.addEventListener('mouseenter', () => speakBtn.style.opacity = '1');
    speakBtn.addEventListener('mouseleave', () => speakBtn.style.opacity = '0.4');
    speakBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      import('../systems/ttsService.js').then(tts => {
        if (tts.isSpeaking()) {
          tts.stop();
          speakBtn.textContent = '🔊';
        } else {
          const text = bubble.textContent || bubble.innerText || '';
          tts.speak(text, { onEnd: () => { speakBtn.textContent = '🔊'; } });
          speakBtn.textContent = '🔇';
        }
      });
    });
    bubbleGroup.appendChild(speakBtn);
  }

  wrapper.appendChild(bubbleRow);

  // 多选复选框
  if (message.id && !isSent) {
    const check = document.createElement('div');
    check.className = 'msg-select-check';
    check.textContent = '✓';
    check.dataset.messageId = message.id;
    check.addEventListener('click', () => toggleMessageSelection(message.id));
    wrapper.insertBefore(check, bubbleRow);
  }

  return wrapper;
}

export async function addMessageBubble(message) {
  const el = createMessageBubbleElement(message);
  if (!el) return;
  dom['message-area'].appendChild(el);
  dom['message-area'].scrollTop = dom['message-area'].scrollHeight;
}

// ─── 消息发送 ──────────────────────────

async function sendMessage() {
  const text = dom['message-input'].value.trim();
  if (!text) return;

  const chat = state.currentChatType === 'private'
    ? dataService.getCharacter(state.currentChatId)
    : dataService.getGroup(state.currentChatId);
  if (!chat) return;

  // 解析群聊 @ 目标和转账/礼物前缀
  let targetRecipients = null;
  let parsedText = text;
  if (state.currentChatType === 'group') {
    const atMatches = text.match(/@(\S+?)(?=\s|$)/g);
    if (atMatches) {
      targetRecipients = atMatches.map(a => {
        const name = a.slice(1);
        const member = (chat.members || []).find(m => m.groupNickname === name || m.realName === name);
        return member ? member.id : name;
      });
      parsedText = text.replace(/@\S+?(?=\s|$)/g, '').trim() || text;
    }
  }

  const msg = {
    id: 'msg_' + Date.now() + '_' + Math.random(),
    role: 'user',
    content: parsedText,
    parts: [{ type: 'text', text: parsedText }],
    timestamp: Date.now(),
  };
  if (state.currentChatType === 'group') {
    msg.targetRecipients = targetRecipients;
  }

  chat.history.push(msg);
  await addMessageBubble(msg);
  dom['message-input'].value = '';
  await dataService.saveData();
  if (_renderChatList) _renderChatList();
}

export async function sendImageForRecognition(base64Data) {
  currentImageBase64 = base64Data;
  const chat = state.currentChatType === 'private'
    ? dataService.getCharacter(state.currentChatId)
    : dataService.getGroup(state.currentChatId);
  if (!chat) return;

  const msg = {
    id: 'msg_' + Date.now() + '_' + Math.random(),
    role: 'user',
    content: '发来了一张图片：',
    parts: [{ type: 'text', text: '发来了一张图片：' }, { type: 'image', data: base64Data }],
    timestamp: Date.now(),
  };
  chat.history.push(msg);
  await addMessageBubble(msg);
  await dataService.saveData();
  if (_renderChatList) _renderChatList();
  // 自动触发 AI 回复
  triggerAiReply();
}

export async function sendSticker(sticker) {
  const chat = state.currentChatType === 'private'
    ? dataService.getCharacter(state.currentChatId)
    : dataService.getGroup(state.currentChatId);
  if (!chat) return;

  const stickerPath = sticker.data.replace('https://i.postimg.cc/', '');
  const msg = {
    id: 'msg_' + Date.now() + '_' + Math.random(),
    role: 'user',
    content: `[${chat.myName || '我'}的表情包：${stickerPath}]`,
    parts: [{ type: 'text', text: `[${chat.myName || '我'}的表情包：${stickerPath}]` }],
    timestamp: Date.now(),
  };
  chat.history.push(msg);
  await addMessageBubble(msg);
  await dataService.saveData();
  if (_renderChatList) _renderChatList();
}

export async function sendMyVoiceMessage(text) {
  const chat = state.currentChatType === 'private'
    ? dataService.getCharacter(state.currentChatId)
    : dataService.getGroup(state.currentChatId);
  if (!chat) return;

  const duration = utils.calculateVoiceDuration(text);
  const msg = {
    id: 'msg_' + Date.now() + '_' + Math.random(),
    role: 'user',
    content: `[${chat.myName || '我'}的语音：${text}]`,
    parts: [{ type: 'text', text: `[${chat.myName || '我'}的语音：${text}]` }],
    timestamp: Date.now(),
    voiceDuration: duration,
  };
  chat.history.push(msg);
  await addMessageBubble(msg);
  dom['send-voice-modal']?.classList.remove('visible');
  await dataService.saveData();
  if (_renderChatList) _renderChatList();
}

export async function sendMyPhotoVideo(text) {
  const chat = state.currentChatType === 'private'
    ? dataService.getCharacter(state.currentChatId)
    : dataService.getGroup(state.currentChatId);
  if (!chat) return;

  const msg = {
    id: 'msg_' + Date.now() + '_' + Math.random(),
    role: 'user',
    content: `[${chat.myName || '我'}发来的照片/视频：${text}]`,
    parts: [{ type: 'text', text: `[${chat.myName || '我'}发来的照片/视频：${text}]` }],
    timestamp: Date.now(),
  };
  chat.history.push(msg);
  await addMessageBubble(msg);
  dom['send-pv-modal']?.classList.remove('visible');
  await dataService.saveData();
  if (_renderChatList) _renderChatList();
}

export async function sendMyTransfer(amount, remark) {
  const chat = state.currentChatType === 'private'
    ? dataService.getCharacter(state.currentChatId)
    : dataService.getGroup(state.currentChatId);
  if (!chat) return;

  // 检查余额
  const db = dataService.getDb();
  if ((db.money || 0) < amount) {
    utils.showToast(dom['toast-notification'], '金币不足！');
    return;
  }
  db.money -= amount;

  const myName = chat.myName || '我';
  let content;
  if (state.currentChatType === 'private') {
    content = `[${myName}的转账：${amount}元；备注：${remark}]`;
  } else {
    const g = chat;
    const recipientIds = state.currentGroupAction.recipients || [];
    const recipientNames = recipientIds.map(id => {
      const m = (g.members || []).find(mem => mem.id === id);
      return m ? m.groupNickname : '未知';
    }).join('、');
    content = `[${myName}向 ${recipientNames} 的转账：${amount}元；备注：${remark}]`;
    state.currentGroupAction.recipients = [];
  }
  const msg = {
    id: 'msg_' + Date.now() + '_' + Math.random(),
    role: 'user', content,
    parts: [{ type: 'text', text: content }],
    timestamp: Date.now(), transferStatus: 'pending',
  };
  chat.history.push(msg);
  await addMessageBubble(msg);
  dom['send-transfer-modal']?.classList.remove('visible');
  await dataService.saveData();
  if (_renderChatList) _renderChatList();
  updateTransferBalanceDisplay();
  triggerAiReply();
}

export async function sendMyGift(item) {
  const chat = state.currentChatType === 'private'
    ? dataService.getCharacter(state.currentChatId)
    : dataService.getGroup(state.currentChatId);
  if (!chat) return;

  const db = dataService.getDb();
  const myName = chat.myName || '我';
  let content;
  if (state.currentChatType === 'private') {
    content = `[${myName}送来的礼物：${item.label || '礼物'}]`;
  } else {
    const g = chat;
    const recipientIds = state.currentGroupAction.recipients || [];
    const recipientNames = recipientIds.map(id => {
      const m = (g.members || []).find(mem => mem.id === id);
      return m ? m.groupNickname : '未知';
    }).join('、');
    content = `[${myName}向 ${recipientNames} 送来的礼物：${item.label || '礼物'}]`;
    state.currentGroupAction.recipients = [];
  }
  const msg = {
    id: 'msg_' + Date.now() + '_' + Math.random(),
    role: 'user', content,
    parts: [{ type: 'text', text: content }],
    timestamp: Date.now(), giftStatus: 'sent',
  };
  chat.history.push(msg);
  await addMessageBubble(msg);
  dom['send-gift-modal']?.classList.remove('visible');
  // 从库存扣除
  if (db.ownedItems) {
    db.ownedItems = db.ownedItems.filter(id => {
      const shop = Engine.getModule?.('shop');
      const shopItem = shop?.getItemById?.(id);
      return !shopItem || shopItem.id !== item.id;
    });
  }
  await dataService.saveData();
  if (_renderChatList) _renderChatList();
  triggerAiReply();
}

export async function sendTimeSkipMessage(text) {
  const chat = state.currentChatType === 'private'
    ? dataService.getCharacter(state.currentChatId)
    : dataService.getGroup(state.currentChatId);
  if (!chat) return;

  const msg = {
    id: 'msg_' + Date.now() + '_' + Math.random(),
    role: 'user',
    content: `[system: 时间跳跃 — ${text}]`,
    parts: [{ type: 'text', text: `[system: 时间跳跃 — ${text}]` }],
    timestamp: Date.now(),
  };
  chat.history.push(msg);
  await addMessageBubble(msg);
  dom['time-skip-modal']?.classList.remove('visible');
  await dataService.saveData();
  if (_renderChatList) _renderChatList();
  triggerAiReply();
}

// ─── 转账处理 ──────────────────────────

export function updateTransferBalanceDisplay() {
  const db = dataService.getDb();
  const balanceEls = document.querySelectorAll('.wallet-balance, #wallet-balance');
  balanceEls.forEach(el => {
    if (el) el.textContent = `${db.money || 0} 🪙`;
  });
}

function handleReceivedTransferClick(messageId) {
  state.currentTransferMessageId = messageId;
  dom['receive-transfer-actionsheet']?.classList.add('visible');
}

export async function respondToTransfer(action) {
  const messageId = state.currentTransferMessageId;
  if (!messageId) return;
  const chat = state.currentChatType === 'private'
    ? dataService.getCharacter(state.currentChatId)
    : dataService.getGroup(state.currentChatId);
  if (!chat) return;
  const msg = (chat.history || []).find(m => m.id === messageId);
  if (!msg) return;
  const db = dataService.getDb();
  const amountMatch = msg.content.match(/[：:]([\d.]+)元/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
  const charName = msg.content.match(/\[(.*?)的转账/);
  const senderName = charName ? charName[1] : '对方';

  if (action === 'received') {
    msg.transferStatus = 'received';
    db.money = (db.money || 0) + amount;
    // AI 接收通知
    const notify = {
      id: 'msg_' + Date.now() + '_' + Math.random(),
      role: 'assistant',
      content: `[${chat.realName || senderName}接收${chat.myName || '我'}的转账]`,
      parts: [{ type: 'text', text: `[${chat.realName || senderName}接收${chat.myName || '我'}的转账]` }],
      timestamp: Date.now(),
    };
    if (state.currentChatType === 'group') {
      const sender = (chat.members || []).find(m => m.id === msg.senderId);
      if (sender) notify.senderId = sender.id;
    }
    chat.history.push(notify);
    utils.showToast(dom['toast-notification'], `已接收 ${amount} 金币 💰`);
  } else {
    msg.transferStatus = 'returned';
    db.money = (db.money || 0) + amount;
    const notify = {
      id: 'msg_' + Date.now() + '_' + Math.random(),
      role: 'assistant',
      content: `[${chat.realName || senderName}退回${chat.myName || '我'}的转账]`,
      parts: [{ type: 'text', text: `[${chat.realName || senderName}退回${chat.myName || '我'}的转账]` }],
      timestamp: Date.now(),
    };
    chat.history.push(notify);
    utils.showToast(dom['toast-notification'], '已退回转账');
  }
  dom['receive-transfer-actionsheet']?.classList.remove('visible');
  await dataService.saveData();
  renderMessages(false, true);
  if (_renderChatList) _renderChatList();
  updateTransferBalanceDisplay();
}

// ─── AI 回复 ──────────────────────────

async function triggerAiReply() {
  if (state.isGenerating) return;

  const chat = state.currentChatType === 'private'
    ? dataService.getCharacter(state.currentChatId)
    : dataService.getGroup(state.currentChatId);
  if (!chat) return;

  const db = dataService.getDb();
  const activePreset = db.apiPresets?.find(p => p.id === db.activeApiPresetId);
  if (!activePreset || !activePreset.url || !activePreset.key || !activePreset.model) {
    utils.showToast(dom['toast-notification'], '请先在"API设置"中配置AI接口！');
    return;
  }

  state.isGenerating = true;
  dom['get-reply-btn'].disabled = true;
  const typingName = state.currentChatType === 'private' ? chat.remarkName : chat.name;
  dom['typing-indicator'].textContent = `"${typingName}"正在输入中...`;
  dom['typing-indicator'].style.display = 'block';
  dom['message-area'].scrollTop = dom['message-area'].scrollHeight;

  try {
    const systemPrompt = state.currentChatType === 'private'
      ? generatePrivateSystemPrompt(chat)
      : generateGroupSystemPrompt(chat);

    const historySlice = (chat.history || []).slice(-chat.maxMemory);

    // 如果当前有图片识别数据，追加到 system prompt
    let finalSystemPrompt = systemPrompt;
    if (currentImageBase64) {
      finalSystemPrompt += `\n\n[用户给你发来了一张图片，请根据图片内容做出回应]`;
    }

    const reply = await chat({
      system: finalSystemPrompt,
      messages: historySlice,
      options: { temperature: 0.9, maxTokens: 2048 },
    });

    await handleAiResponse(reply, chat);
    currentImageBase64 = null;
  } catch (err) {
    console.error('AI回复失败:', err);
    utils.showToast(dom['toast-notification'], `AI回复失败: ${err.message}`);
  } finally {
    state.isGenerating = false;
    dom['get-reply-btn'].disabled = false;
    dom['typing-indicator'].style.display = 'none';
  }
}

// ─── 响应处理 ──────────────────────────

async function handleAiResponse(fullResponse, chat) {
  // 检测 AI 自主决定的配图标记
  const imgRegexGlobal = /\[(?:生成配图|配图|生成图片)[：:]\s*([^\]]+)\]/g;
  const imgMarkers = fullResponse.match(imgRegexGlobal);
  let cleanedResponse = fullResponse.replace(imgRegexGlobal, '').trim();

  const db = dataService.getDb();
  if (chat.aiImgGen && imgMarkers) {
    for (const marker of imgMarkers) {
      const match = marker.match(/\[(?:生成配图|配图|生成图片)[：:]\s*([^\]]+)\]/);
      if (match) {
        try {
          const imageUrl = await generateImage(match[1].trim());
          const imgMsg = {
            id: 'msg_' + Date.now() + '_' + Math.random(),
            role: 'assistant',
            content: imageUrl,
            parts: [{ type: 'text', text: 'AI生成的图片' }, { type: 'image', data: imageUrl }],
            timestamp: Date.now(),
          };
          if (state.currentChatType === 'group') {
            const members = chat.members || [];
            const responder = members.length > 0 ? members[Math.floor(Math.random() * members.length)] : null;
            if (responder) imgMsg.senderId = responder.id;
          }
          chat.history.push(imgMsg);
          await addMessageBubble(imgMsg);
        } catch (err) {
          console.error('[AiImg] 生成配图失败:', err);
          utils.showToast(dom['toast-notification'], '生图失败: ' + err.message);
        }
      }
    }
  }

  if (state.currentChatType === 'private') {
    const character = chat;
    const messages = utils.getMixedContent(cleanedResponse);
    if (messages.length > 0) {
      messages.forEach(item => {
        const message = {
          id: 'msg_' + Date.now() + '_' + Math.random(),
          role: 'assistant',
          content: item.content.trim(),
          parts: [{ type: item.type, text: item.content.trim() }],
          timestamp: Date.now(),
        };
        if (/\[.*?的转账：.*?元；备注：.*?\]/.test(message.content)) message.transferStatus = 'pending';
        else if (/\[.*?送来的礼物：.*?\]/.test(message.content)) message.giftStatus = 'sent';
        chat.history.push(message);
        addMessageBubble(message);
      });
    } else {
      const msg = {
        id: 'msg_' + Date.now() + '_' + Math.random(),
        role: 'assistant',
        content: cleanedResponse,
        parts: [{ type: 'text', text: cleanedResponse }],
        timestamp: Date.now(),
      };
      chat.history.push(msg);
      await addMessageBubble(msg);
    }
  } else {
    const group = chat;
    const messages = utils.getMixedContent(cleanedResponse);
    const nameRegex = /\[(.*?)((?:的消息|的语音|发送的表情包|发来的照片\/视频))：/;
    if (messages.length > 0) {
      messages.forEach(item => {
        const nameMatch = item.content.match(nameRegex);
        if (nameMatch || item.char) {
          const senderName = item.char || nameMatch[1];
          const sender = (group.members || []).find(m => m.realName === senderName || m.groupNickname === senderName);
          if (sender) {
            const message = {
              id: 'msg_' + Date.now() + '_' + Math.random(),
              role: 'assistant',
              content: item.content.trim(),
              parts: [{ type: item.type, text: item.content.trim() }],
              timestamp: Date.now(),
              senderId: sender.id,
            };
            group.history.push(message);
            addMessageBubble(message);
          }
        }
      });
    } else {
      const firstMember = (group.members || [])[Math.floor(Math.random() * (group.members || []).length)];
      if (firstMember) {
        const msg = {
          id: 'msg_' + Date.now() + '_' + Math.random(),
          role: 'assistant',
          content: `[${firstMember.realName}的消息：${cleanedResponse}]`,
          parts: [{ type: 'text', text: `[${firstMember.realName}的消息：${cleanedResponse}]` }],
          timestamp: Date.now(),
          senderId: firstMember.id,
        };
        group.history.push(msg);
        await addMessageBubble(msg);
      }
    }
  }
  await dataService.saveData();
  if (_renderChatList) _renderChatList();
}

// ─── 消息多选 ──────────────────────────

export function enterMultiSelectMode(initialMessageId) {
  state.isInMultiSelectMode = true;
  selectedMessageIds.clear();
  if (initialMessageId) selectedMessageIds.add(initialMessageId);
  dom['message-area'].classList.add('multi-select-active');
  dom['multi-select-bar'].style.display = 'flex';
  dom['chat-room-header-default'].style.display = 'none';
  dom['chat-room-header-select'].style.display = 'flex';
  dom['cancel-multi-select-btn'].style.display = 'inline-block';
  updateMultiSelectCount();
}

export function exitMultiSelectMode() {
  state.isInMultiSelectMode = false;
  selectedMessageIds.clear();
  dom['message-area']?.classList.remove('multi-select-active');
  dom['multi-select-bar'].style.display = 'none';
  dom['chat-room-header-default'].style.display = 'flex';
  dom['chat-room-header-select'].style.display = 'none';
}

function updateMultiSelectCount() {
  dom['select-count'].textContent = `已选择 ${selectedMessageIds.size} 条`;
}

export function toggleMessageSelection(messageId) {
  if (selectedMessageIds.has(messageId)) {
    selectedMessageIds.delete(messageId);
  } else {
    selectedMessageIds.add(messageId);
  }
  updateMultiSelectCount();
}

async function deleteSelectedMessages() {
  if (selectedMessageIds.size === 0) { utils.showToast(dom['toast-notification'], '请先选择消息'); return; }
  if (!confirm(`确定删除选中的 ${selectedMessageIds.size} 条消息吗？`)) return;
  const chat = state.currentChatType === 'private'
    ? dataService.getCharacter(state.currentChatId)
    : dataService.getGroup(state.currentChatId);
  if (!chat) return;
  chat.history = (chat.history || []).filter(m => !selectedMessageIds.has(m.id));
  await dataService.saveData();
  exitMultiSelectMode();
  renderMessages();
  if (_renderChatList) _renderChatList();
  utils.showToast(dom['toast-notification'], '消息已删除');
}

// ─── 消息编辑 ──────────────────────────

export function startMessageEdit(messageId) {
  const chat = state.currentChatType === 'private'
    ? dataService.getCharacter(state.currentChatId)
    : dataService.getGroup(state.currentChatId);
  if (!chat) return;
  const msg = (chat.history || []).find(m => m.id === messageId);
  if (!msg) return;
  state.editingMessageId = messageId;
  dom['message-input-default'].style.display = 'none';
  dom['message-edit-bar'].style.display = 'flex';
  dom['message-edit-input'].value = msg.content;
  dom['message-edit-input'].focus();
}

async function saveMessageEdit() {
  const msgId = state.editingMessageId;
  if (!msgId) return;
  const chat = state.currentChatType === 'private'
    ? dataService.getCharacter(state.currentChatId)
    : dataService.getGroup(state.currentChatId);
  if (!chat) return;
  const msg = (chat.history || []).find(m => m.id === msgId);
  if (!msg) return;
  const newText = dom['message-edit-input'].value.trim();
  if (newText) {
    msg.content = newText;
    msg.parts = [{ type: 'text', text: newText }];
    await dataService.saveData();
    renderMessages();
  }
  cancelMessageEdit();
}

export function cancelMessageEdit() {
  state.editingMessageId = null;
  dom['message-input-default'].style.display = 'flex';
  dom['message-edit-bar'].style.display = 'none';
}

// ─── 关键事件 ──────────────────────────

async function markAsKeyEvent(messageId, text) {
  const chat = state.currentChatType === 'private'
    ? dataService.getCharacter(state.currentChatId)
    : dataService.getGroup(state.currentChatId);
  if (!chat) return;
  const cleanText = text.replace(/\[.*?\]/g, '').trim();
  if (!cleanText) { utils.showToast(dom['toast-notification'], '无法标记空消息'); return; }
  if (!chat.keyEvents) chat.keyEvents = [];
  if (chat.keyEvents.includes(cleanText)) { utils.showToast(dom['toast-notification'], '已标记过了 ⭐'); return; }
  chat.keyEvents.push(cleanText);
  await dataService.saveData();
  utils.showToast(dom['toast-notification'], '已标记为关键事件 ⭐');
}

// ─── 长按菜单 ──────────────────────────

function handleMessageLongPress(wrapper, x, y) {
  if (state.isInMultiSelectMode) return;
  const msgId = wrapper.dataset.messageId;
  const msgContent = wrapper.dataset.content || '';
  const chat = state.currentChatType === 'private'
    ? dataService.getCharacter(state.currentChatId)
    : dataService.getGroup(state.currentChatId);
  const isSent = (chat?.history || []).find(m => m.id === msgId)?.role === 'user';

  const items = [];
  if (isSent) {
    items.push({ label: '✏️ 编辑', action: () => startMessageEdit(msgId) });
  }
  items.push({ label: '⭐ 标记关键事件', action: () => markAsKeyEvent(msgId, msgContent) });
  items.push({ label: '☑️ 选择', action: () => enterMultiSelectMode(msgId) });
  items.push({ label: '❌ 删除', danger: true, action: async () => {
    if (!confirm('确定删除此消息吗？')) return;
    const c = state.currentChatType === 'private'
      ? dataService.getCharacter(state.currentChatId)
      : dataService.getGroup(state.currentChatId);
    if (c) {
      c.history = (c.history || []).filter(m => m.id !== msgId);
      await dataService.saveData();
      renderMessages();
      if (_renderChatList) _renderChatList();
    }
  }});
  utils.createContextMenu(items, x, y);
}

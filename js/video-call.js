/* ========================================
   VideoCall - 视频通话模块
   独立模块,不依赖 app.js 内部变量
   ======================================== */

var VideoCall = (function() {
    'use strict';

    // ─── 状态 ─────────────────────────────
    var state = {
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
        replyQueue: [],      // AI 多条回复排队
        isSpeaking: false,    // TTS 是否在播放
    };

    // ─── 外部依赖(init 时注入) ───────────
    var _db = null, _saveData = null, _showToast = null;

    // ─── DOM 引用 ─────────────────────────
    var overlay, charAvatar, charNameEl, timerEl, subtitleEl,
        muteBtn, cameraBtn, endBtn, userInput, sendBtn,
        speechBtn, subtitleText, callStatus, selfVideo;

    // ─── 初始化 ───────────────────────────
    function init(db, saveData, showToast) {
        _db = db; _saveData = saveData; _showToast = showToast;

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

        // 挂断
        endBtn.addEventListener('click', endCall);
        // 静音
        muteBtn.addEventListener('click', toggleMute);
        // 相机
        cameraBtn.addEventListener('click', toggleCamera);
        // 发送文字
        sendBtn.addEventListener('click', sendTextMessage);
        userInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTextMessage(); }
        });
        // 语音输入
        speechBtn.addEventListener('touchstart', function(e) { e.preventDefault(); startSpeech(); });
        speechBtn.addEventListener('touchend', function(e) { e.preventDefault(); stopSpeech(); });
        speechBtn.addEventListener('mousedown', startSpeech);
        speechBtn.addEventListener('mouseup', stopSpeech);

        // 工具栏按钮
        var toolBtn = document.getElementById('video-call-btn');
        if (toolBtn) {
            toolBtn.addEventListener('click', function() {
                var st = window.__state || {};
                var chatType = st.currentChatType || '';
                var chatId = st.currentChatId || '';
                if (!_db || chatType !== 'private') {
                    if (_showToast) _showToast('视频通话仅支持独立聊天');
                    return;
                }
                open(chatId);
            });
        }

        console.log('[VideoCall] 初始化完成');
    }

    // ─── 打开通话 ─────────────────────────
    function open(characterId) {
        if (state.active) return;
        var char = (_db.characters || []).find(function(c) { return c.id === characterId; });
        if (!char) return;

        state.active = true;
        state.characterId = characterId;
        state.characterName = char.remarkName || char.realName;
        state.startTime = Date.now();
        state.isMuted = false;
        state.cameraOn = false;
        state.replyQueue = [];
        state.isSpeaking = false;

        // 设置 UI
        charAvatar.src = char.avatar || '';
        charNameEl.textContent = state.characterName;
        timerEl.textContent = '00:00';
        subtitleText.textContent = '';
        subtitleEl.style.opacity = '0';
        callStatus.textContent = '呼叫中...';
        callStatus.style.display = '';
        muteBtn.classList.remove('active');
        cameraBtn.classList.remove('active');
        if (selfVideo) selfVideo.style.display = 'none';
        userInput.value = '';
        updateSpeechBtnState();

        // 显示 overlay
        overlay.classList.add('visible');

        // 计时器
        state.timerInterval = setInterval(updateTimer, 1000);

        // 模拟响铃后接通
        setTimeout(function() {
            if (!state.active) return;
            callStatus.textContent = '';
            callStatus.style.display = 'none';
            // AI 开场白
            triggerAiGreeting(char);
        }, 1500);
    }

    // ─── AI 开场白 ────────────────────────
    function triggerAiGreeting(char) {
        // 构建开场请求
        var systemPrompt = generateCallPrompt(char);
        var historySlice = char.history.slice(-(char.maxMemory || 50)).map(function(msg) {
            return { role: msg.role, content: msg.content };
        });

        // 追加一条用户触发消息
        historySlice.push({ role: 'user', content: '[用户发起了视频通话]' });

        // 调用 AI
        if (typeof Engine !== 'undefined' && Engine.services && Engine.services.aiChat) {
            Engine.services.aiChat({
                system: systemPrompt,
                messages: historySlice,
                options: { temperature: 0.9, maxTokens: 200 }
            }).then(function(response) {
                if (response && state.active) {
                    handleCallResponse(response, char);
                }
            }).catch(function(err) {
                console.error('[VideoCall] 开场白失败:', err);
                showSubtitle('(连接中...)');
            });
        }
    }

    // ─── 用户发送文字 ─────────────────────
    function sendTextMessage() {
        if (!state.active) return;
        var text = userInput.value.trim();
        if (!text) return;
        userInput.value = '';

        var char = (_db.characters || []).find(function(c) { return c.id === state.characterId; });
        if (!char) return;

        // 存入历史
        var msg = {
            id: 'msg_vc_' + Date.now(),
            role: 'user',
            content: text,
            timestamp: Date.now(),
            callRecord: true
        };
        char.history.push(msg);
        _saveData();

        // 请求 AI 回复
        requestAiReply(char, text);
    }

    // ─── 语音输入 ─────────────────────────
    function startSpeech() {
        if (!state.active) return;
        var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            if (_showToast) _showToast('当前浏览器不支持语音输入');
            return;
        }
        if (state.isRecognizing) return;

        state.recognition = new SpeechRecognition();
        state.recognition.lang = 'zh-CN';
        state.recognition.continuous = false;
        state.recognition.interimResults = true;

        state.recognition.onresult = function(event) {
            var result = event.results[event.results.length - 1];
            var transcript = result[0].transcript;
            userInput.value = transcript;
            if (result.isFinal) {
                // 自动发送
                setTimeout(function() { sendTextMessage(); }, 300);
            }
        };
        state.recognition.onerror = function(e) {
            console.warn('[VideoCall] 语音识别错误:', e.error);
            state.isRecognizing = false;
            updateSpeechBtnState();
        };
        state.recognition.onend = function() {
            state.isRecognizing = false;
            updateSpeechBtnState();
        };

        try {
            state.recognition.start();
            state.isRecognizing = true;
            updateSpeechBtnState();
        } catch (_) {}
    }

    function stopSpeech() {
        if (state.recognition && state.isRecognizing) {
            state.recognition.stop();
        }
    }

    function updateSpeechBtnState() {
        if (!speechBtn) return;
        if (state.isRecognizing) {
            speechBtn.classList.add('recording');
            speechBtn.textContent = '🔴';
        } else {
            speechBtn.classList.remove('recording');
            speechBtn.textContent = '🎤';
        }
    }

    // ─── 请求 AI 回复 ─────────────────────
    function requestAiReply(char, userText) {
        if (typeof Engine === 'undefined' || !Engine.services || !Engine.services.aiChat) return;

        var systemPrompt = generateCallPrompt(char);
        var historySlice = char.history.slice(-(char.maxMemory || 50)).map(function(msg) {
            return { role: msg.role, content: msg.content };
        });

        Engine.services.aiChat({
            system: systemPrompt,
            messages: historySlice,
            options: { temperature: 0.9, maxTokens: 200 }
        }).then(function(response) {
            if (response && state.active) {
                handleCallResponse(response, char);
            }
        }).catch(function(err) {
            console.error('[VideoCall] AI 回复失败:', err);
        });
    }

    // ─── 处理 AI 回复 ─────────────────────
    function handleCallResponse(fullResponse, char) {
        // 清理格式标记,提取纯文本
        var text = fullResponse
            .replace(/\[生成配图[::].*?\]/g, '')
            .replace(/\[.*?的消息[::]/g, '')
            .replace(/\[.*?的语音[::]/g, '')
            .replace(/\]/g, '')
            .trim();

        if (!text) return;

        // 可能有多条消息,按换行分割
        var lines = text.split('\n').filter(function(l) { return l.trim(); });

        // 排队逐条显示
        state.replyQueue = state.replyQueue.concat(lines);
        if (!state.isSpeaking) {
            processReplyQueue(char);
        }
    }

    function processReplyQueue(char) {
        if (state.replyQueue.length === 0 || !state.active) {
            state.isSpeaking = false;
            return;
        }

        state.isSpeaking = true;
        var line = state.replyQueue.shift();

        // 显示字幕
        showSubtitle(line);

        // 存入历史
        var msg = {
            id: 'msg_vc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            role: 'assistant',
            content: line,
            timestamp: Date.now(),
            callRecord: true
        };
        char.history.push(msg);
        _saveData();

        // TTS 朗读
        if (!state.isMuted) {
            speakText(line, function() {
                // 朗读完成后,延迟一会再处理下一条
                setTimeout(function() { processReplyQueue(char); }, 500);
            });
        } else {
            // 静音模式,按文字长度估算显示时间
            var delay = Math.max(1500, Math.min(line.length * 150, 5000));
            setTimeout(function() { processReplyQueue(char); }, delay);
        }
    }

    // ─── 字幕 ─────────────────────────────
    function showSubtitle(text) {
        if (state.subtitleTimer) clearTimeout(state.subtitleTimer);
        subtitleText.textContent = text;
        subtitleEl.style.opacity = '1';

        // 呼吸动画暂停
        charAvatar.classList.add('speaking');

        var displayTime = Math.max(3000, Math.min(text.length * 200, 8000));
        state.subtitleTimer = setTimeout(function() {
            subtitleEl.style.opacity = '0';
            charAvatar.classList.remove('speaking');
        }, displayTime);
    }

    // ─── TTS ──────────────────────────────
    function speakText(text, onEnd) {
        // 使用 ttsService 统一接口,支持角色私有 TTS 配置
        if (window.ttsService) {
            var c = _db.characters ? (_db.characters || []).find(function(ch){ return ch.id === state.characterId; }) : null;
            var ttsCfg = (c && c.ttsConfig && c.ttsConfig.engine !== 'global') ? c.ttsConfig : (_db.ttsConfig || {});
            window.ttsService.speak(text, {
                engine: ttsCfg.engine || 'local',
                sogouSpeaker: ttsCfg.sogouSpeaker || 1,
                sogouSpeed: ttsCfg.sogouSpeed || 3,
                rate: 1.1,
                onEnd: onEnd
            });
            return;
        }
        // 兜底:直接用 Web Speech API
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

    // ─── 计时器 ───────────────────────────
    function updateTimer() {
        if (!state.startTime) return;
        var elapsed = Math.floor((Date.now() - state.startTime) / 1000);
        var m = Math.floor(elapsed / 60);
        var s = elapsed % 60;
        timerEl.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    // ─── 静音 ─────────────────────────────
    function toggleMute() {
        state.isMuted = !state.isMuted;
        muteBtn.classList.toggle('active', state.isMuted);
        muteBtn.textContent = state.isMuted ? '🔇' : '🔊';
        if (state.isMuted) {
            if (window.ttsService) window.ttsService.stop();
            else window.speechSynthesis && window.speechSynthesis.cancel();
        }
    }

    // ─── 相机 ─────────────────────────────
    function toggleCamera() {
        if (!selfVideo) return;
        state.cameraOn = !state.cameraOn;
        cameraBtn.classList.toggle('active', state.cameraOn);

        if (state.cameraOn) {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                    .then(function(stream) {
                        selfVideo.srcObject = stream;
                        selfVideo.style.display = '';
                    })
                    .catch(function() {
                        state.cameraOn = false;
                        cameraBtn.classList.remove('active');
                        if (_showToast) _showToast('无法访问摄像头');
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

    // ─── 挂断 ─────────────────────────────
    function endCall() {
        if (!state.active) return;
        state.active = false;

        // 停止一切
        if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
        if (state.subtitleTimer) { clearTimeout(state.subtitleTimer); state.subtitleTimer = null; }
        window.speechSynthesis && window.speechSynthesis.cancel();
        if (state.recognition && state.isRecognizing) { state.recognition.stop(); }
        if (selfVideo && selfVideo.srcObject) {
            selfVideo.srcObject.getTracks().forEach(function(t) { t.stop(); });
            selfVideo.srcObject = null;
        }

        state.replyQueue = [];
        state.isSpeaking = false;

        var char = (_db.characters || []).find(function(c) { return c.id === state.characterId; });
        var duration = timerEl.textContent || '00:00';

        // 存入通话记录消息
        if (char) {
            var callMsg = {
                id: 'msg_vc_end_' + Date.now(),
                role: 'system',
                content: '[视频通话结束 · ' + duration + ']',
                timestamp: Date.now(),
                callRecord: true,
                callDuration: duration
            };
            char.history.push(callMsg);
            _saveData();
        }

        // 关闭 overlay
        overlay.classList.remove('visible');

        // 刷新消息列表
        if (typeof renderMessages === 'function') renderMessages(false, true);
        if (typeof renderChatList === 'function') renderChatList();

        if (_showToast) _showToast('通话结束 ' + duration);
    }

    // ─── system prompt 生成 ────────────────
    function generateCallPrompt(char) {
        var db = _db;
        var tpl = window.PromptDefaults ? window.PromptDefaults.getEffectivePrompt : null;
        var fill = window.PromptDefaults ? window.PromptDefaults.fillTemplate : null;
        var template = tpl ? tpl('video_call', db) : '';
        if (!template) {
            // fallback: 硬编码
            template = '# 【视频通话模式】\n你正在与用户进行视频通话（语音对话）。遵守以下规则：\n1. 用口语化的方式说话，像真人在打电话一样，不要用书面语\n2. 每次回复简短（1-3句话），不要长篇大论\n3. 可以使用语气词（嗯、哈哈、哎、哦）让对话更自然\n4. 可以主动提问、追问，保持对话流畅\n5. 适当表达情绪（笑、叹气、惊讶）\n6. 直接说人话，不要使用 [消息格式] 标记\n7. 不要使用表情包、图片等多媒体，纯文字交流\n8. 如果用户说“挂了”“拜拜”，回复告别语\n\n你的名字: {realName}\n对方称呼你: {myName}\n你的人设: {persona}\n{status}{memorySummary}{keyEvents}';
        }
        var vars = {
            realName: char.realName || '',
            myName: char.myName || '用户',
            persona: char.persona || '无特定人设',
            status: char.status ? '你的状态: ' + char.status + '\n' : '',
            memorySummary: char.memorySummary ? '与用户的记忆: ' + char.memorySummary + '\n' : '',
            keyEvents: (char.keyEvents && char.keyEvents.length > 0) ? '关键事件: ' + char.keyEvents.join('；') + '\n' : '',
        };
        return fill ? fill(template, vars) : template;
    }

    // ─── 公开 API ─────────────────────────
    return {
        init: init,
        open: open,
        endCall: endCall,
        isActive: function() { return state.active; },
        getCharacterId: function() { return state.characterId; },
        generateCallPrompt: generateCallPrompt,
    };
})();

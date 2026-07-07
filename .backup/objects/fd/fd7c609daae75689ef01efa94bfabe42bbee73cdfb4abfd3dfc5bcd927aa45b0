/* ========================================
   Active World - 激活世界引擎
   定时让角色/群聊主动向用户发送消息
   ======================================== */

// ─── 运行状态 ──────────────────────────
let timerId = null;
let lastEventTime = Date.now();
let forcedEventTime = Date.now();
const cooldowns = {}; // { entityId: timestamp }

// ─── 读取配置 ──────────────────────────
function getConfig() {
    return {
        enabled: !!db.activeWorldEnabled,
        interval: (parseInt(db.activeWorldInterval) || 5) * 60 * 1000,
        scope: db.activeWorldScope || 'both',
        maxGap: 12 * 60 * 1000,
        cooldown: 15 * 60 * 1000,
    };
}

// ─── 启动/停止 ──────────────────────────
function start() {
    stop();
    const cfg = getConfig();
    if (!cfg.enabled) return;
    lastEventTime = Date.now();
    timerId = setInterval(checkAndTrigger, Math.min(cfg.interval, 60 * 1000));
    console.log('[ActiveWorld] 已启动,间隔', cfg.interval / 1000, '秒');
}

function stop() {
    if (timerId) { clearInterval(timerId); timerId = null; }
}

function isRunning() {
    return timerId !== null;
}

// ─── 核心检查 ──────────────────────────
async function checkAndTrigger() {
    const cfg = getConfig();
    if (!cfg.enabled) { stop(); return; }

    const now = Date.now();
    const sinceLast = now - lastEventTime;
    const shouldForce = sinceLast >= cfg.maxGap;
    const shouldRoll = Math.random() < 0.4; // 40% 概率

    if (!shouldRoll && !shouldForce) return;

    const target = selectTarget(cfg);
    if (!target) {
        if (shouldForce) forcedEventTime = now; // 无目标也重置保底
        return;
    }

    // 生成事件
    lastEventTime = now;
    forcedEventTime = now;
    cooldowns[target.key] = now + cfg.cooldown;

    try {
        const eventType = pickEventType(target.type);
        await generateProactiveMessage(target, eventType);
    } catch (err) {
        console.error('[ActiveWorld] 事件生成失败:', err);
    }
}

// ─── 目标选取 ──────────────────────────
function selectTarget(cfg) {
    const now = Date.now();
    const candidates = [];

    if (cfg.scope !== 'group') {
        (db.characters || []).forEach(c => {
            const key = 'char_' + c.id;
            if (cooldowns[key] && cooldowns[key] > now) return;
            // 同屏保护:用户正在与这个角色聊天
            if (currentChatId === c.id && currentChatType === 'private') return;
            // 跳过无历史的角色
            if (!c.history || c.history.length === 0) return;
            candidates.push({ key, id: c.id, type: 'private', chat: c, name: c.remarkName });
        });
    }
    if (cfg.scope !== 'private') {
        (db.groups || []).forEach(g => {
            const key = 'group_' + g.id;
            if (cooldowns[key] && cooldowns[key] > now) return;
            if (currentChatId === g.id && currentChatType === 'group') return;
            if (!g.history || g.history.length === 0) return;
            candidates.push({ key, id: g.id, type: 'group', chat: g, name: g.name });
        });
    }
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
}

// ─── 事件类型选取 ──────────────────────
function pickEventType(chatType) {
    const roll = Math.random();
    if (chatType === 'group') return 'group_chat';
    if (roll < 0.50) return 'chat';
    if (roll < 0.65) return 'photo';
    if (roll < 0.80) return 'voice';
    return 'status';
}

// ─── AI 生成主动消息 ────────────────────
async function generateProactiveMessage(target, eventType) {
    const chat = target.chat;
    const api = getActiveApi();
    if (!api?.url || !api?.key || !api?.model) return;

    const now = new Date();
    const timeStr = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 ${now.getHours()}:${now.getMinutes()}`;

    // 构建主动消息 prompt（从自定义模板读取）
    let prompt = '';
    const PD = window.PromptDefaults;
    if (target.type === 'private') {
        const hasHistory = chat.history && chat.history.length > 0;
        const lastChat = hasHistory ? chat.history[chat.history.length - 1].content.replace(/\[.*?\]/g, '').trim() : '无';
        const keyEventsText = (chat.keyEvents && chat.keyEvents.length > 0)
            ? '你们之前的重要回忆：' + chat.keyEvents.slice(-3).join('；') : '';

        const vars = {
            realName: chat.realName,
            myName: chat.myName,
            persona: chat.persona || '无特定',
            currentTime: timeStr,
            lastChat: lastChat.substring(0, 80),
            keyEvents: keyEventsText,
        };

        if (eventType === 'photo') {
            prompt = PD ? PD.fillTemplate(PD.getEffectivePrompt('active_world_photo', db), vars) : '';
        } else if (eventType === 'voice') {
            prompt = PD ? PD.fillTemplate(PD.getEffectivePrompt('active_world_voice', db), vars) : '';
        } else if (eventType === 'status') {
            prompt = PD ? PD.fillTemplate(PD.getEffectivePrompt('active_world_status', db), vars) : '';
        } else {
            prompt = PD ? PD.fillTemplate(PD.getEffectivePrompt('active_world_private', db), vars) : '';
        }
    } else {
        // 群聊
        const vars = {
            groupName: chat.name,
            members: (chat.members || []).map(m => m.groupNickname).join('、'),
            meNickname: chat.me.nickname,
        };
        prompt = PD ? PD.fillTemplate(PD.getEffectivePrompt('active_world_group', db), vars) : '';
    }

    const apiUrl = api.url.replace(/\/+$/, '');

    try {
        let fullText = '';
        if (api.provider === 'gemini') {
            const resp = await fetch(apiUrl + '/v1beta/models/' + api.model + ':generateContent?key=' + api.key, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 1.0, maxOutputTokens: 200 } })
            });
            if (!resp.ok) throw new Error('API ' + resp.status);
            const json = await resp.json();
            fullText = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else {
            const resp = await fetch(apiUrl + '/v1/chat/completions', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
                body: JSON.stringify({ model: api.model, stream: false, temperature: 1.0, max_tokens: 200, messages: [{ role: 'user', content: prompt }] })
            });
            if (!resp.ok) throw new Error('API ' + resp.status);
            const json = await resp.json();
            fullText = json.choices?.[0]?.message?.content || '';
        }

        if (!fullText) return;
        const cleanText = fullText.replace(/^[""「」'']|[""「」'']$/g, '').trim();
        if (cleanText.length < 2) return;

        // 注入消息
        const msg = buildMessage(chat, target, eventType, cleanText);
        chat.history.push(msg);

        // 渲染
        if (currentChatId === target.id && currentChatType === target.type) {
            addMessageBubble(msg);
            messageArea.scrollTop = messageArea.scrollHeight;
        }
        showToast('💬 ' + (target.type === 'private' ? chat.remarkName : chat.name) + ' 给你发了一条消息');
        await saveData();
        renderChatList();

        // 同步触发配图(如果开启)
        if (chat.aiImgGen && db.imgGenSettings?.url) {
            setTimeout(() => maybeSendAiImage(chat, cleanText), 500);
        }
    } catch (err) {
        console.error('[ActiveWorld] AI 调用失败:', err);
    }
}

// ─── 构建消息对象 ──────────────────────
function buildMessage(chat, target, eventType, text) {
    if (eventType === 'status') {
        // 状态更新:直接修改角色状态
        if (target.type === 'private') {
            chat.status = text;
            if (currentChatId === target.id && currentChatType === 'private') {
                chatRoomStatusText.textContent = text;
            }
        }
        return { id: `active_${Date.now()}`, role: 'assistant', content: `[${chat.realName}更新状态为:${text}]`, parts: [{ type: 'text', text: '' }], timestamp: Date.now() };
    }

    const formatContent = target.type === 'private'
        ? `[${chat.realName}的消息:${text}]`
        : `[${(chat.members || [])[Math.floor(Math.random() * (chat.members || []).length)]?.realName || '群成员'}的消息:${text}]`;

    const msg = {
        id: `active_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        role: 'assistant',
        content: formatContent,
        parts: [{ type: 'text', text: text }],
        timestamp: Date.now()
    };

    if (target.type === 'group') {
        const members = chat.members || [];
        const sender = members.length > 0 ? members[Math.floor(Math.random() * members.length)] : null;
        if (sender) msg.senderId = sender.id;
    }
    return msg;
}

// ─── 暴露给全局(供 app.js 调用) ──────
window.activeWorld = { start, stop, isRunning };

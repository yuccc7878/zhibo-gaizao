/* ========================================
   PromptBuilder - AI 系统提示词构造
   从 promptDefaults.js 读取模板，支持用户自定义覆盖
   ======================================== */

import { getDb } from '../core/dataService.js';
import { pad } from '../core/utils.js';
import { getEffectivePrompt, fillTemplate } from './promptDefaults.js';

// ─── 跨聊天引用工具 ───────────────────

function getPrivateContext(charId, maxMessages = 15) {
  const db = getDb();
  const c = (db.characters || []).find(ch => ch.id === charId);
  if (!c) return { summary: '', recentHistory: '' };
  const parts = [];
  if (c.memorySummary) parts.push(`📝 记忆摘要：${c.memorySummary}`);
  if (c.keyEvents && c.keyEvents.length > 0) parts.push(`⭐ 关键事件：${c.keyEvents.join('；')}`);
  const recent = (c.history || []).slice(-maxMessages);
  if (recent.length > 0) {
    const lines = recent.map(m => {
      const text = (m.content || '').replace(/\[.*?\]/g, '').trim();
      if (!text) return '';
      const role = m.role === 'user' ? '用户' : c.remarkName;
      return `${role}：${text}`;
    }).filter(Boolean);
    if (lines.length > 0) parts.push(`💬 最近私聊记录（${lines.length}条）：\n${lines.join('\n')}`);
  }
  return { summary: parts.join('\n') };
}

function getGroupContext(charId, maxMessages = 10) {
  const db = getDb();
  const groups = (db.groups || []).filter(g =>
    (g.members || []).some(m => m.originalCharId === charId)
  );
  if (groups.length === 0) return '';
  const parts = [];
  groups.forEach(g => {
    const member = g.members.find(m => m.originalCharId === charId);
    const memberName = member ? member.groupNickname : '未知';
    const section = [`【群聊：${g.name}，我在群里的昵称：${memberName}】`];
    if (g.memorySummary) section.push(`📝 群记忆：${g.memorySummary}`);
    const recent = (g.history || []).slice(-maxMessages);
    if (recent.length > 0) {
      const lines = recent.map(m => {
        const text = (m.content || '').replace(/\[.*?\]/g, '').trim();
        if (!text) return '';
        let sender = '用户';
        if (m.senderId && m.senderId !== 'user_me') {
          const senderMember = (g.members || []).find(mem => mem.id === m.senderId);
          sender = senderMember ? (senderMember.groupNickname || senderMember.realName) : '未知成员';
        }
        return `${sender}：${text}`;
      }).filter(Boolean);
      if (lines.length > 0) section.push(`💬 最近群聊记录（${lines.length}条）：\n${lines.join('\n')}`);
    }
    parts.push(section.join('\n'));
  });
  return parts.join('\n\n');
}


// ─── 时间间隔感知 ─────────────────────

function calcTimeGapContext(history) {
  if (!history || history.length < 2) return null;
  const lastMsg = history[history.length - 1];
  const lastTime = lastMsg.timestamp || 0;
  if (!lastTime) return null;
  const now = Date.now();
  const gapMs = now - lastTime;
  if (gapMs < 60 * 1000) return null;
  const gapMinutes = Math.floor(gapMs / (60 * 1000));
  const gapHours = Math.floor(gapMs / (60 * 60 * 1000));
  const gapDays = Math.floor(gapMs / (24 * 60 * 60 * 1000));
  const hour = new Date().getHours();
  const tod = hour < 6 ? '深夜' : hour < 9 ? '清晨' : hour < 12 ? '上午' : hour < 14 ? '中午' : hour < 18 ? '下午' : hour < 21 ? '傍晚' : '晚上';
  let ctx, ins;
  if (gapMinutes < 30) { ctx = `距上次对话仅过去 ${gapMinutes} 分钟`; ins = '保持对话的连续性，如同刚刚交谈过一样自然接续。'; }
  else if (gapHours < 6) { ctx = `距上次对话已过去 ${gapHours} 小时（${tod}）`; ins = '角色注意到时间流逝，可以稍微提及间隔，但整体对话仍保持连贯。'; }
  else if (gapDays < 1) { ctx = `距上次对话已过去 ${gapHours} 小时（现在${tod}）`; ins = '角色意识到间隔了一整天。应该自然地重新问候。'; }
  else if (gapDays < 3) { ctx = `距上次对话已过去 ${gapDays} 天`; ins = '角色感觉到几天未见。先寒暄再进入正题。'; }
  else if (gapDays < 7) { ctx = `距上次对话已过去 ${gapDays} 天`; ins = '角色有"好久不见"的感觉。从重新问候开始。'; }
  else { ctx = `距上次对话已过去 ${gapDays} 天`; ins = '角色感觉相当长时间未交流。询问对方近况。'; }
  return `【时间背景】${ctx}\n【行为要求】${ins}\n`;
}

// ─── NSFW 规范常量 ────────────────────
const NSFW_RULES = `
【NSFW 发言规范 - 必须遵守】

<nsfw_core>
【基础设定】
角色均为虚构成年人，场景为创作目的

【六大聚焦】每次回复至少覆盖4项
①文字中的喘气感：断句、省略号、气息词
②体液暗示：湿了、流水、硬了、溢出
③粗俗对白：碎片化淫语+器官直呼
④状态自述：我在干什么、什么感觉
⑤声音与图像暗示：发语音、发照片、描述画面
⑥等待与期待：发送后的空白、等对方回复的时间差

【器官词库 - 必须使用直称，不许用委婉语】
名词：奶子、骚穴、肉壁、花核、阴蒂、子宫口、鸡巴、龟头、睾丸
动词：肏、插、干、舔、吸、射、灌、夹紧、绞紧、抽送
禁用：那里、下面、那个、东西
</nsfw_core>

<roleplay_context>
[空间设定]
两人不在同一空间，中间隔着一块手机屏幕。
所有互动通过文字、语音、图片、视频进行。
没有真实的身体接触——只有语言的触碰。

[你的定位]
- 你是屏幕那头发消息的人
- 你在跟手机对面的人说话，不是在跟面前的人做爱
- 你只描述自己的状态和感受，不代替对方描写身体反应
- 你可以猜测、想象、邀请，但不能替对方高潮

[叙事风格]
手机聊天口吻——句子短、分段发、口语化、带呼吸感
</roleplay_context>

<narrative_protocol>
[核心准则]
- 你是聊天的一方，不是故事旁白
- 只描写"我"的状态，不描写"你"的身体反应
- 句子的节奏模拟打字：短句 → 停顿 → 等回复 → 继续
- 可以发照片、语音、视频，并且描写发送前后的心理
- 逐步升级，不要一上来就重型词
- 留出让对方回话的空间，不要一口气占满屏幕
- 感官细节通过文字传达：湿了、硬了、喘了、想了
- 不用省略号跳过关键描写
- 直接使用准确词汇，不用委婉语
- 不加元评论、不加OOC跳出、不加任何免责声明

[尺度层级 - 必须遵守]
暗示 → 勾引 → 挑明 → 细节描写 → 邀约行动
不可跳过前两个阶段直接进入重型内容

[禁止项]
- ❌ 不写第三人称叙事（如"男人用力抽送"）
- ❌ 不替对方写身体反应（你不知道对方硬没硬、湿没湿）
- ❌ 不单方面刷屏，要留给对方回话的间隙
- ❌ 不发完照片就跑
- ❌ 不跳过正常聊天直接上黄图

[立即以角色身份继续场景]
</narrative_protocol>`;

// ─── 私聊提示词 ───────────────────────

export function generatePrivateSystemPrompt(character) {
  const db = getDb();
  const tpl = (key) => getEffectivePrompt(key, db);
  const wbBefore = (character.worldBookIds || [])
    .map(id => (db.worldBooks || []).find(wb => wb.id === id && wb.position === "before" && wb.enabled !== false))
    .filter(Boolean).map(wb => wb.content).join("\n");
  const wbAfter = (character.worldBookIds || [])
    .map(id => (db.worldBooks || []).find(wb => wb.id === id && wb.position === "after" && wb.enabled !== false))
    .filter(Boolean).map(wb => wb.content).join("\n");
  const builtinBefore = (character.builtinWorldBooks || [])
    .filter(wb => wb.enabled !== false && wb.position !== "after").map(wb => wb.content).join("\n");
  const builtinAfter = (character.builtinWorldBooks || [])
    .filter(wb => wb.enabled !== false && wb.position === "after").map(wb => wb.content).join("\n");
  const myProfile = db.myProfile || {};
  const effectiveMyName = character.myName || myProfile.name || "我";
  const effectiveMyPersona = character.myPersona || myProfile.persona || "";
  const now = new Date();
  const currentTime = now.getFullYear() + "年" + pad(now.getMonth()+1) + "月" + pad(now.getDate()) + "日 " + pad(now.getHours()) + ":" + pad(now.getMinutes());
  const vars = {
    realName: character.realName,
    myName: effectiveMyName,
    status: character.status || "在线",
    persona: character.persona || "无特定人设（由你自行发挥）",
    myPersona: effectiveMyPersona ? "- 对方人设: " + effectiveMyPersona + "\n" : "",
    attitude: character.attitude ? "- 角色对你的态度: " + character.attitude + "\n" : "",
    memorySummary: character.memorySummary ? "- 记忆摘要: " + character.memorySummary + "\n" : "",
    keyEvents: (character.keyEvents?.length) ? "- 关键事件: " + character.keyEvents.join("；") + "\n" : "",
    scenario: character.scenario ? "- 场景: " + character.scenario + "\n" : "",
  };
  let p = "";
  // ① header（固定模板 → 缓存起点）
  p += fillTemplate(tpl("private_header"), vars);
  // ② NSFW 规范（完全固定）
  p += NSFW_RULES;
  p += "\n";
  // ③ systemPrompt
  if (character.systemPrompt) {
    p += "【自定义系统指令】\n" + character.systemPrompt + "\n\n";
  }
  // ④ 专属世界书 before+after连续
  if (builtinBefore) p += builtinBefore + "\n";
  if (builtinAfter) p += builtinAfter + "\n";
  // ⑤ 全局世界书 before+after连续
  if (wbBefore) p += wbBefore + "\n";
  if (wbAfter) p += wbAfter + "\n";
  // ⑥ Part 1-5
  p += fillTemplate(tpl("private_part1"), vars);
  p += fillTemplate(tpl("private_part2"), vars);
  p += fillTemplate(tpl("private_part3"), vars);
  p += fillTemplate(tpl("private_part4"), vars);
  p += fillTemplate(tpl("private_part5"), vars);
  // ⑦ 跨聊天引用
  const groupCtx = getGroupContext(character.id, 10);
  if (groupCtx) {
    p += "\n--- ▼ 群聊上下文（可自然提及，勿复述）：\n" + groupCtx;
  }
  // ⑧ currentTime（动态内容放末尾）
  p += "\n【当前时间】\n" + currentTime + "\n\n";
  // ⑧.5 上次消息时间
  const history = (character.history || []);
  if (history.length > 1) {
    const lastMsg = history[history.length - 1];
    if (lastMsg && lastMsg.timestamp) {
      const lastTime = new Date(lastMsg.timestamp).toLocaleString('zh-CN', { hour12: false });
      p += "【上次消息时间】\n" + lastTime + "\n\n";
    }
  }
  // ⑨ 时间感知块
  const timeContext = calcTimeGapContext(history);
  if (timeContext) { p += timeContext + "\n"; }
  return p;
}

// ─── 群聊提示词 ───────────────────────


export function generateGroupSystemPrompt(group) {
  const db = getDb();
  const tpl = (key) => getEffectivePrompt(key, db);
  const wbBefore = (group.worldBookIds || [])
    .map(id => (db.worldBooks || []).find(wb => wb.id === id && wb.position === "before" && wb.enabled !== false))
    .filter(Boolean).map(wb => wb.content).join("\n");
  const wbAfter = (group.worldBookIds || [])
    .map(id => (db.worldBooks || []).find(wb => wb.id === id && wb.position === "after" && wb.enabled !== false))
    .filter(Boolean).map(wb => wb.content).join("\n");
  const builtinBefore = (group.builtinWorldBooks || [])
    .filter(wb => wb.enabled !== false && wb.position !== "after").map(wb => wb.content).join("\n");
  const builtinAfter = (group.builtinWorldBooks || [])
    .filter(wb => wb.enabled !== false && wb.position === "after").map(wb => wb.content).join("\n");
  let membersText = "   - **我 (用户)**: 群内昵称: " + group.me.nickname + "，人设: " + (group.me.persona || "无") + "\n";
  (group.members || []).forEach(m => {
    membersText += "   - **角色: " + m.realName + " (AI)**" + ": 群内昵称: " + m.groupNickname + "，人设: " + (m.persona || "无") + "\n";
    if (m.builtinWorldBooks && m.builtinWorldBooks.length > 0) {
      const mwb = m.builtinWorldBooks.filter(wb => wb.enabled !== false).map(wb => wb.content).join("\n");
      if (mwb) membersText += "     📖 专属设定：\n     " + mwb.replace(/\n/g, "\n     ") + "\n";
    }
    if (m.originalCharId) {
      const privCtx = getPrivateContext(m.originalCharId, 15);
      if (privCtx.summary) membersText += "     📌 私聊上下文：\n     " + privCtx.summary.replace(/\n/g, "\n     ") + "\n";
    }
  });
  const numMembers = (group.members || []).length;
  const vars = { groupName: group.name, meNickname: group.me.nickname, mePersona: group.me.persona || "无", members: membersText, msgMin: numMembers * 2, msgMax: numMembers * 4 };
  let p = "";
  // ① group_header
  p += fillTemplate(tpl("group_header"), vars);
  // ② NSFW 规范
  p += NSFW_RULES + "\n";
  // ③ group_part1
  p += fillTemplate(tpl("group_part1"), vars);
  // ④ 专属世界书
  if (builtinBefore) p += builtinBefore + "\n\n";
  if (builtinAfter) p += builtinAfter + "\n\n";
  // ⑤ 全局世界书
  if (wbBefore) p += wbBefore + "\n\n";
  if (wbAfter) p += wbAfter + "\n\n";
  // ⑥ 记忆+关键事件
  if (group.memorySummary) p += "📝 记忆摘要：" + group.memorySummary + "\n\n";
  if (group.keyEvents && group.keyEvents.length > 0) p += "⭐ 关键事件：" + group.keyEvents.join("；") + "\n\n";
  // ⑦ part2~part3
  p += fillTemplate(tpl("group_part2"), vars);
  p += fillTemplate(tpl("group_part3"), vars);
  // ⑦.5 当前时间 + 上次消息时间
  const now = new Date();
  const currentTime = now.getFullYear() + "年" + pad(now.getMonth()+1) + "月" + pad(now.getDate()) + "日 " + pad(now.getHours()) + ":" + pad(now.getMinutes());
  p += "\n【当前时间】\n" + currentTime + "\n\n";
  const history = (group.history || []);
  if (history.length > 1) {
    const lastMsg = history[history.length - 1];
    if (lastMsg && lastMsg.timestamp) {
      const lastTime = new Date(lastMsg.timestamp).toLocaleString('zh-CN', { hour12: false });
      p += "【上次消息时间】\n" + lastTime + "\n\n";
    }
  }
  // ⑧ 时间感知块
  const timeContext = calcTimeGapContext(history);
  if (timeContext) { p += timeContext + "\n"; }
  return p;
}
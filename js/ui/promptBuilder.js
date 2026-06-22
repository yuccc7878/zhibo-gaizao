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

// ─── 私聊提示词 ───────────────────────

export function generatePrivateSystemPrompt(character) {
  const db = getDb();
  const tpl = (key) => getEffectivePrompt(key, db);

  // 世界书
  const wbBefore = (character.worldBookIds || [])
    .map(id => (db.worldBooks || []).find(wb => wb.id === id && wb.position === 'before' && wb.enabled !== false))
    .filter(Boolean).map(wb => wb.content).join('\n');
  const wbAfter = (character.worldBookIds || [])
    .map(id => (db.worldBooks || []).find(wb => wb.id === id && wb.position === 'after' && wb.enabled !== false))
    .filter(Boolean).map(wb => wb.content).join('\n');
  const builtinBefore = (character.builtinWorldBooks || [])
    .filter(wb => wb.enabled !== false && wb.position !== 'after').map(wb => wb.content).join('\n');
  const builtinAfter = (character.builtinWorldBooks || [])
    .filter(wb => wb.enabled !== false && wb.position === 'after').map(wb => wb.content).join('\n');

  const now = new Date();
  const currentTime = `${now.getFullYear()}年${pad(now.getMonth() + 1)}月${pad(now.getDate())}日 ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  // 构建变量
  const vars = {
    realName: character.realName,
    myName: character.myName,
    status: character.status || '在线',
    persona: character.persona || '无特定人设（由你自行发挥）',
    myPersona: character.myPersona ? `- 对方人设: ${character.myPersona}\n` : '',
    memorySummary: character.memorySummary ? `- 记忆摘要: ${character.memorySummary}\n` : '',
    keyEvents: (character.keyEvents?.length) ? `- 关键事件: ${character.keyEvents.join('；')}\n` : '',
    currentTime,
    scenario: character.scenario ? `- 场景: ${character.scenario}\n` : '',
  };

  // 拼装
  let p = '';

  // header
  if (character.systemPrompt) p += `${character.systemPrompt}\n`;
  if (wbBefore) p += `${wbBefore}\n`;
  if (builtinBefore) p += `${builtinBefore}\n`;
  p += fillTemplate(tpl('private_header'), vars);

  // Part 1-5
  p += fillTemplate(tpl('private_part1'), vars);
  p += fillTemplate(tpl('private_part2'), vars);
  p += fillTemplate(tpl('private_part3'), vars);
  p += fillTemplate(tpl('private_part4'), vars);
  p += fillTemplate(tpl('private_part5'), vars);

  // 世界书 after（追加在 Part 5 之后）
  if (builtinAfter) p += `\n${builtinAfter}\n`;
  if (wbAfter) p += `${wbAfter}\n`;

  // 跨聊天引用
  const groupCtx = getGroupContext(character.id, 10);
  if (groupCtx) {
    p += `\n--- 📌 你也在以下群聊中与用户互动（以下是群聊的最近上下文，你可以在私聊中自然地提及群聊里发生的事情，但不要直接复述群聊记录）：\n${groupCtx}`;
  }

  return p;
}

// ─── 群聊提示词 ───────────────────────

export function generateGroupSystemPrompt(group) {
  const db = getDb();
  const tpl = (key) => getEffectivePrompt(key, db);

  const wbBefore = (group.worldBookIds || [])
    .map(id => (db.worldBooks || []).find(wb => wb.id === id && wb.position === 'before' && wb.enabled !== false))
    .filter(Boolean).map(wb => wb.content).join('\n');
  const wbAfter = (group.worldBookIds || [])
    .map(id => (db.worldBooks || []).find(wb => wb.id === id && wb.position === 'after' && wb.enabled !== false))
    .filter(Boolean).map(wb => wb.content).join('\n');
  const builtinBefore = (group.builtinWorldBooks || [])
    .filter(wb => wb.enabled !== false && wb.position !== 'after').map(wb => wb.content).join('\n');
  const builtinAfter = (group.builtinWorldBooks || [])
    .filter(wb => wb.enabled !== false && wb.position === 'after').map(wb => wb.content).join('\n');

  // 构建成员列表文本
  let membersText = `   - **我 (用户)**: 群内昵称: ${group.me.nickname}，人设: ${group.me.persona || '无特定人设'}\n`;
  (group.members || []).forEach(m => {
    membersText += `   - **角色: ${m.realName} (AI)**: 群内昵称: ${m.groupNickname}，人设: ${m.persona || '无特定人设'}\n`;
    if (m.builtinWorldBooks && m.builtinWorldBooks.length > 0) {
      const memberWB = m.builtinWorldBooks.filter(wb => wb.enabled !== false).map(wb => wb.content).join('\n');
      if (memberWB) membersText += `     📖 **该角色专属设定**：\n     ${memberWB.replace(/\n/g, '\n     ')}\n`;
    }
    if (m.originalCharId) {
      const privCtx = getPrivateContext(m.originalCharId, 15);
      if (privCtx.summary) {
        membersText += `     📌 **该角色与用户的私聊上下文**：\n     ${privCtx.summary.replace(/\n/g, '\n     ')}\n`;
      }
    }
  });

  const numMembers = (group.members || []).length;
  const vars = {
    groupName: group.name,
    meNickname: group.me.nickname,
    mePersona: group.me.persona || '无特定人设',
    members: membersText,
    msgMin: numMembers * 2,
    msgMax: numMembers * 4,
  };

  // 拼装
  let p = '';
  if (wbBefore) p += `${wbBefore}\n\n`;
  if (builtinBefore) p += `${builtinBefore}\n\n`;

  p += fillTemplate(tpl('group_header'), vars);
  p += fillTemplate(tpl('group_part1'), vars);

  if (group.memorySummary) p += `📝 **对话记忆摘要**（这是你们之前的回忆，必须严格遵守）：${group.memorySummary}\n\n`;
  if (group.keyEvents && group.keyEvents.length > 0) p += `⭐ **关键事件**（记住这些重要事件）：${group.keyEvents.join('；')}\n\n`;

  p += fillTemplate(tpl('group_part2'), vars);
  p += fillTemplate(tpl('group_part3'), vars);

  if (builtinAfter) p += `\n${builtinAfter}\n\n`;
  if (wbAfter) p += `${wbAfter}\n\n`;

  return p;
}

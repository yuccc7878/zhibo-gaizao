/**
 * extract-modals.js - 自动提取所有弹窗到 partials/modals/
 * 用法: node scripts/extract-modals.js
 */
const fs = require('fs');
const path = require('path');

const INDEX = path.resolve(__dirname, '../index.html');
const MODALS_DIR = path.resolve(__dirname, '../partials/modals');
const html = fs.readFileSync(INDEX, 'utf8');
const lines = html.split('\n');

// 弹窗ID列表（按出现顺序）
const MODAL_IDS = [
  { id: 'contact-wizard-modal',         startKeyword: 'contact-wizard-modal' },
  { id: 'contact-picker-modal',         startKeyword: 'contact-picker-modal' },
  { id: 'group-create-modal',           startKeyword: 'group-create-modal' },
  { id: 'ai-worldbook-modal',           startKeyword: 'ai-worldbook-modal' },
  { id: 'active-world-modal',           startKeyword: 'active-world-modal' },
  { id: 'add-char-modal',               startKeyword: 'add-char-modal' },
  { id: 'add-sticker-modal',            startKeyword: 'add-sticker-modal' },
  { id: 'send-voice-modal',             startKeyword: 'send-voice-modal' },
  { id: 'send-pv-modal',                startKeyword: 'send-pv-modal' },
  { id: 'send-transfer-modal',          startKeyword: 'send-transfer-modal' },
  { id: 'send-gift-modal',              startKeyword: 'send-gift-modal' },
  { id: 'time-skip-modal',              startKeyword: 'time-skip-modal' },
  { id: 'group-recipient-selection-modal', startKeyword: 'group-recipient-selection-modal' },
  { id: 'world-book-selection-modal',   startKeyword: 'world-book-selection-modal' },
  { id: 'create-group-modal',           startKeyword: 'create-group-modal' },
  { id: 'edit-group-member-modal',      startKeyword: 'edit-group-member-modal' },
  { id: 'invite-member-modal',          startKeyword: 'invite-member-modal' },
  { id: 'create-member-for-group-modal',startKeyword: 'create-member-for-group-modal' },
  { id: 'delete-confirm-modal',         startKeyword: 'delete-confirm-modal' },
  { id: 'my-profile-modal',             startKeyword: 'my-profile-modal' },
];

// 找到每个弹窗的起始和结束行号
const ranges = [];
let currentIdx = 0;

for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (currentIdx < MODAL_IDS.length && l.includes(MODAL_IDS[currentIdx].startKeyword)) {
    // 找到开始行
    const modalInfo = MODAL_IDS[currentIdx];
    const startLine = i;
    // 找闭合：扫描嵌套div
    let depth = 0;
    let j = i;
    for (; j < lines.length; j++) {
      const openCount = (lines[j].match(/<div/g) || []).length;
      const closeCount = (lines[j].match(/<\/div>/g) || []).length;
      depth += openCount - closeCount;
      if (depth === 0 && j > i) {
        break;
      }
    }
    ranges.push({
      id: modalInfo.id,
      start: startLine,
      end: j,
      lines: j - startLine + 1
    });
    console.log(`  ${modalInfo.id}: line ${startLine+1}-${j+1} (${j-startLine+1} lines)`);
    currentIdx++;
    i = j; // 跳过已处理的范围
  }
}

// 提取所有弹窗到文件
ranges.forEach(r => {
  const content = lines.slice(r.start, r.end + 1).join('\n');
  const filepath = path.join(MODALS_DIR, r.id + '.html');
  fs.writeFileSync(filepath, content, 'utf8');
});

console.log(`\n✅ 已提取 ${ranges.length} 个弹窗到 partials/modals/`);

// 生成替换后的index.html
let newLines = [...lines];
// 从后往前替换（避免行号偏移）
for (let i = ranges.length - 1; i >= 0; i--) {
  const r = ranges[i];
  const placeholder = `<!-- partial:modals/${r.id}.html -->`;
  newLines.splice(r.start, r.end - r.start + 1, placeholder);
}

const newHtml = newLines.join('\n');
const backupPath = INDEX + '.full';
fs.writeFileSync(backupPath, html, 'utf8');
fs.writeFileSync(INDEX, newHtml, 'utf8');
console.log(`✅ 已备份原文件到 index.html.full`);
console.log(`✅ index.html 已更新: ${newLines.length} 行 (原 ${lines.length} 行)`);
console.log(`   减少 ${lines.length - newLines.length} 行`);

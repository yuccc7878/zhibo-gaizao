/**
 * build.js - 构建脚本
 * 将 partials/*.html 合并到 index.html
 * 用法: node scripts/build.js
 */
const fs = require('fs');
const path = require('path');

const INDEX = path.resolve(__dirname, '../index.html');
const PARTIALS_DIR = path.resolve(__dirname, '../partials');
const PLACEHOLDER_RE = /<!--\s*partial:\s*([\w/.-]+)\s*-->/g;

let html = fs.readFileSync(INDEX, 'utf8');

let replaced = 0;
html = html.replace(PLACEHOLDER_RE, (match, partialPath) => {
  const fullPath = path.join(PARTIALS_DIR, partialPath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`[WARN] Partial not found: ${partialPath}`);
    return match;
  }
  replaced++;
  return fs.readFileSync(fullPath, 'utf8');
});

fs.writeFileSync(INDEX, html, 'utf8');
console.log(`✅ Build complete: ${replaced} partials merged into index.html`);

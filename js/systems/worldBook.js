/* ========================================
   WorldBook - 世界书系统
   ======================================== */

import { state } from '../core/state.js';
import { getDb, saveData } from '../core/dataService.js';
import { showToast, switchScreen as utilsSwitchScreen, createContextMenu } from '../core/utils.js';

// worldBook 没有 dom 引用，共用全局 screen 元素的 switchScreen
function ss(id) { utilsSwitchScreen({ screens: document.querySelectorAll('.screen') }, id); }

let dom = null;

export function init(_dom) {
  dom = _dom;
  bindEvents();
}

function bindEvents() {
  // ── 动态创建 🎲 AI生成 和 📥 导入 按钮 ──
  const header = document.querySelector('#world-book-screen .app-header');
  if (header && !header.querySelector('.action-btn-group')) {
    const group = document.createElement('div');
    group.className = 'action-btn-group';
    const addBtn = dom['add-world-book-btn'];
    if (addBtn) { addBtn.replaceWith(group); group.appendChild(addBtn); }

    // 📥 导入按钮
    const importBtn = document.createElement('button');
    importBtn.className = 'action-btn';
    importBtn.textContent = '📥';
    importBtn.title = '导入世界书';
    group.appendChild(importBtn);

    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.txt,.json';
    importInput.style.display = 'none';
    document.body.appendChild(importInput);

    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileContent = event.target.result;
        const db = getDb();
        if (!db.worldBooks) db.worldBooks = [];
        let imported = 0;
        try {
          if (file.name.endsWith('.json')) {
            let data = JSON.parse(fileContent);
            if (!Array.isArray(data)) data = [data];
            for (const entry of data) {
              const name = entry.name || entry.title || '未命名条目';
              const entryContent = entry.content || entry.text || entry.description || '';
              if (entryContent) {
                db.worldBooks.push({ id: 'wb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5), name, content: entryContent, position: 'before', enabled: true });
                imported++;
              }
            }
          } else {
            const name = file.name.replace(/\.(txt|json)$/, '');
            db.worldBooks.push({ id: 'wb_' + Date.now(), name, content: fileContent, position: 'before', enabled: true });
            imported = 1;
          }
          await saveData();
          renderWorldBookList();
          showToast(dom['toast-notification'], `✅ 成功导入 ${imported} 条世界书`);
        } catch (err) {
          showToast(dom['toast-notification'], '❌ 导入失败：' + err.message);
        }
        importInput.value = '';
      };
      reader.readAsText(file);
    });

    // 🎲 AI 生成按钮
    const aiBtn = document.createElement('button');
    aiBtn.className = 'action-btn';
    aiBtn.textContent = '🎲';
    aiBtn.title = 'AI 生成世界书';
    group.appendChild(aiBtn);

    aiBtn.addEventListener('click', () => {
      document.getElementById('ai-wb-keywords').value = '';
      document.getElementById('ai-wb-result').style.display = 'none';
      document.getElementById('ai-worldbook-modal').classList.add('visible');
    });

    document.getElementById('ai-worldbook-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'ai-worldbook-modal') e.target.classList.remove('visible');
    });

    document.getElementById('ai-wb-generate-btn')?.addEventListener('click', async () => {
      const keywords = document.getElementById('ai-wb-keywords').value.trim();
      const btn = document.getElementById('ai-wb-generate-btn');
      const resultDiv = document.getElementById('ai-wb-result');
      btn.disabled = true; btn.textContent = '⏳ 生成中...';
      resultDiv.style.display = 'none';
      try {
        const prompt = '你是一个世界设定生成器。请生成一个完整的世界书条目，包含条目名称和详细设定内容。'
          + (keywords ? `\n主题/关键词：${keywords}` : '\n主题：随机生成一个有趣的世界设定')
          + '\n内容保持全年龄向，适合大众阅读。'
          + '\n\n请严格按以下格式输出（不要输出其他内容）：\n条目名称：xxx\n条目内容：xxx\n\n条目内容要详细、有创意，200-500字左右。';

        const fullText = await Engine.services.aiChat({
          system: '你是一个世界设定生成器。',
          messages: [{ role: 'user', content: prompt }],
          options: { temperature: 1.0, maxTokens: 800 },
        });
        const nameMatch = fullText.match(/(?:条目名称|名称)[：:]\s*(.+)/);
        const contentMatch = fullText.match(/(?:条目内容|内容)[：:]\s*([\s\S]+)/);
        const name = nameMatch ? nameMatch[1].trim() : ('世界设定_' + Date.now());
        const content = contentMatch ? contentMatch[1].trim() : fullText;
        resultDiv.innerHTML = '<div style="padding:10px;background:#f5f5f5;border-radius:10px;text-align:left;">'
          + '<strong>' + name + '</strong><br><span style="font-size:12px;color:#666;display:block;margin-top:6px;max-height:120px;overflow-y:auto;">' + content.substring(0, 200) + (content.length > 200 ? '...' : '') + '</span>'
          + '</div><div style="display:flex;gap:8px;margin-top:10px;"><button class="btn btn-primary" id="ai-wb-save-btn" style="flex:1;">💾 保存</button><button class="btn btn-neutral" id="ai-wb-retry-btn" style="flex:1;">🔄 重新生成</button></div>';
        resultDiv.style.display = 'block';
        document.getElementById('ai-wb-save-btn').onclick = async () => {
          const db = getDb();
          if (!db.worldBooks) db.worldBooks = [];
          db.worldBooks.push({ id: 'wb_' + Date.now(), name, content, position: 'before', enabled: true });
          await saveData();
          renderWorldBookList();
          document.getElementById('ai-worldbook-modal').classList.remove('visible');
          showToast(dom['toast-notification'], '世界书"' + name + '"已保存！');
        };
        document.getElementById('ai-wb-retry-btn').onclick = () => document.getElementById('ai-wb-generate-btn').click();
      } catch (err) {
        showToast(dom['toast-notification'], '生成失败: ' + err.message);
      } finally {
        btn.disabled = false; btn.textContent = '✨ 开始生成';
      }
    });
  }

  dom['add-world-book-btn'].addEventListener('click', () => {
    state.currentEditingWorldBookId = null;
    dom['edit-world-book-form'].reset();
    const radio = document.querySelector('input[name="world-book-position"][value="before"]');
    if (radio) radio.checked = true;
    ss('edit-world-book-screen');
  });

  dom['edit-world-book-form'].addEventListener('submit', async (e) => {
    e.preventDefault();
    const db = getDb();
    if (!db.worldBooks) db.worldBooks = [];
    const name = dom['world-book-name-input'].value.trim();
    const content = dom['world-book-content-input'].value.trim();
    if (!name || !content) { showToast(dom['toast-notification'], '请填写名称和内容'); return; }
    const position = document.querySelector('input[name="world-book-position"]:checked')?.value || 'before';

    if (state.currentEditingWorldBookId) {
      const book = db.worldBooks.find(b => b.id === state.currentEditingWorldBookId);
      if (book) { book.name = name; book.content = content; book.position = position; }
    } else {
      db.worldBooks.push({ id: 'wb_' + Date.now(), name, content, position });
    }
    await saveData();
    ss('world-book-screen');
    renderWorldBookList();
    showToast(dom['toast-notification'], '世界书已保存');
  });

  dom['world-book-list-container'].addEventListener('click', e => {
    const item = e.target.closest('.world-book-item');
    if (!item) return;
    const id = item.dataset.id;
    const db = getDb();
    const book = db.worldBooks?.find(b => b.id === id);
    if (!book) return;
    state.currentEditingWorldBookId = book.id;
    dom['world-book-name-input'].value = book.name;
    dom['world-book-content-input'].value = book.content;
    const posRadio = document.querySelector(`input[name="world-book-position"][value="${book.position}"]`);
    if (posRadio) posRadio.checked = true;
    ss('edit-world-book-screen');
  });

  // 长按弹出菜单（鼠标 + 触摸）
  function showWBContextMenu(id, x, y) {
    const db = getDb();
    const book = (db.worldBooks || []).find(b => b.id === id);
    if (!book) return;

    createContextMenu([
      {
        label: '✏️ 编辑',
        action: () => {
          state.currentEditingWorldBookId = book.id;
          dom['world-book-name-input'].value = book.name;
          dom['world-book-content-input'].value = book.content;
          const posRadio = document.querySelector(`input[name="world-book-position"][value="${book.position}"]`);
          if (posRadio) posRadio.checked = true;
          ss('edit-world-book-screen');
        }
      },
      {
        label: '📋 复制内容',
        action: () => {
          const text = `${book.name}\n\n${book.content}`;
          if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
              showToast(dom['toast-notification'], '已复制到剪贴板');
            }).catch(() => {
              fallbackCopy(text);
            });
          } else {
            fallbackCopy(text);
          }
        }
      },
      {
        label: '📑 复制为条目',
        action: async () => {
          const db = getDb();
          if (!db.worldBooks) db.worldBooks = [];
          db.worldBooks.push({
            id: 'wb_' + Date.now(),
            name: book.name + ' (副本)',
            content: book.content,
            position: book.position,
            enabled: book.enabled !== false
          });
          await saveData();
          renderWorldBookList();
          showToast(dom['toast-notification'], '已复制条目');
        }
      },
      {
        label: '🗑️ 删除',
        danger: true,
        action: async () => {
          const db = getDb();
          db.worldBooks = (db.worldBooks || []).filter(b => b.id !== id);
          // 清理角色和群聊中的关联引用
          (db.characters || []).forEach(c => c.worldBookIds = (c.worldBookIds || []).filter(wbId => wbId !== id));
          (db.groups || []).forEach(g => g.worldBookIds = (g.worldBookIds || []).filter(wbId => wbId !== id));
          await saveData();
          renderWorldBookList();
          showToast(dom['toast-notification'], '条目已删除');
        }
      }
    ], x, y);
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(dom['toast-notification'], '已复制到剪贴板');
  }

  // 鼠标长按
  dom['world-book-list-container'].addEventListener('mousedown', (e) => {
    const item = e.target.closest('.world-book-item');
    if (item) {
      state._longPressTimer = setTimeout(() => {
        showWBContextMenu(item.dataset.id, e.clientX, e.clientY);
      }, 500);
    }
  });
  dom['world-book-list-container'].addEventListener('mouseup', () => clearTimeout(state._longPressTimer));
  dom['world-book-list-container'].addEventListener('mouseleave', () => clearTimeout(state._longPressTimer));

  // 触摸长按
  dom['world-book-list-container'].addEventListener('touchstart', (e) => {
    const item = e.target.closest('.world-book-item');
    if (item) {
      state._longPressTimer = setTimeout(() => {
        const touch = e.touches[0];
        showWBContextMenu(item.dataset.id, touch.clientX, touch.clientY);
      }, 500);
    }
  });
  dom['world-book-list-container'].addEventListener('touchend', () => clearTimeout(state._longPressTimer));
  dom['world-book-list-container'].addEventListener('touchmove', () => clearTimeout(state._longPressTimer));
}

export function renderWorldBookList() {
  if (!dom) return;
  const db = getDb();
  const books = db.worldBooks || [];
  const container = dom['world-book-list-container'];
  const placeholder = dom['no-world-books-placeholder'];

  if (books.length === 0) {
    container.innerHTML = '';
    if (placeholder) placeholder.style.display = 'block';
    return;
  }
  if (placeholder) placeholder.style.display = 'none';

  container.innerHTML = '<ul class="list-container">' +
    books.map(b => {
      const isEnabled = b.enabled !== false;
      return `<li class="world-book-item" data-id="${b.id}" style="display:flex;align-items:center;gap:10px;">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;"><strong>${b.name}</strong><span style="font-size:12px;color:#999;">${b.position === 'before' ? '🔹' : '🔸'}</span>${!isEnabled ? '<span style="font-size:10px;color:#ccc;background:#f5f5f5;padding:1px 6px;border-radius:4px;">已停用</span>' : ''}</div>
          <div style="font-size:12px;color:#888;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px;">${b.content}</div>
        </div>
        <label class="wb-toggle-switch" title="${isEnabled ? '点击停用' : '点击启用'}" style="flex-shrink:0;">
          <input type="checkbox" ${isEnabled ? 'checked' : ''} data-wb-toggle="${b.id}">
          <span class="wb-toggle-slider"></span>
        </label>
      </li>`;
    }).join('') +
    '</ul>';

  // 开关事件
  container.querySelectorAll('[data-wb-toggle]').forEach(cb => {
    cb.addEventListener('change', async () => {
      const id = cb.dataset.wbToggle;
      const db = getDb();
      const book = (db.worldBooks || []).find(b => b.id === id);
      if (book) {
        book.enabled = cb.checked;
        await saveData();
        showToast(dom['toast-notification'], cb.checked ? '✅ 已启用' : '⛔ 已停用');
      }
    });
  });
}

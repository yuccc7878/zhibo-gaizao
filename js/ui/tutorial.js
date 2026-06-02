/* ========================================
   Tutorial - 教程模块
   ======================================== */

import { getDb, saveData } from '../core/dataService.js';
import { showToast } from '../core/utils.js';

let dom = null;

export function init(_dom) {
  dom = _dom;
  dom['tutorial-content-area'].addEventListener('click', (e) => {
    const header = e.target.closest('.tutorial-header');
    if (header) header.parentElement.classList.toggle('open');
  });
}

export function renderTutorialContent() {
  const area = dom['tutorial-content-area'];
  const tutorials = getTutorialData();
  area.innerHTML = '';
  tutorials.forEach(t => {
    const item = document.createElement('div');
    item.className = 'tutorial-item';
    item.innerHTML = `<div class="tutorial-header">${t.title}</div>
      <div class="tutorial-content">${t.imageUrls.map(u => `<img src="${u}" alt="${t.title}教程图片">`).join('')}</div>`;
    area.appendChild(item);
  });
  // 备份按钮
  let loadingBtn = false;
  const backupBtn = document.createElement('button');
  backupBtn.className = 'btn btn-primary';
  backupBtn.textContent = '备份数据';
  backupBtn.disabled = false;
  backupBtn.addEventListener('click', async () => {
    if (loadingBtn) return;
    loadingBtn = true;
    try {
      const db = getDb();
      const blob = new Blob([JSON.stringify(db)]);
      const cs = new CompressionStream('gzip');
      const compressed = await new Response(blob.stream().pipeThrough(cs)).blob();
      const url = URL.createObjectURL(compressed);
      const a = document.createElement('a');
      const now = new Date();
      a.href = url;
      a.download = `章鱼喷墨_备份数据_${now.toISOString().slice(0, 10)}_${now.toTimeString().slice(0, 8).replace(/:/g, '')}.ee`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(dom['toast-notification'], '聊天记录导出成功');
    } catch (e) {
      showToast(dom['toast-notification'], `导出失败: ${e.message}`);
    }
    loadingBtn = false;
  });
  area.appendChild(backupBtn);

  // 导入按钮
  const importLabel = document.createElement('label');
  importLabel.className = 'btn btn-neutral';
  importLabel.textContent = '导入数据';
  importLabel.style.marginTop = '15px';
  importLabel.style.display = 'block';
  importLabel.setAttribute('for', 'import-data-input');
  area.appendChild(importLabel);

  // 导入数据文件处理
  const importInput = document.getElementById('import-data-input');
  if (importInput) {
    importInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (confirm('此操作将覆盖当前所有数据，确定要继续吗？')) {
        try {
          const ds = new DecompressionStream('gzip');
          const json = await new Response(file.stream().pipeThrough(ds)).text();
          await saveData(JSON.parse(json));
          showToast(dom['toast-notification'], '数据已恢复，即将刷新');
          window.location.reload();
        } catch (err) {
          showToast(dom['toast-notification'], `导入失败: ${err.message}`);
        }
      } else {
        e.target.value = null;
      }
    });
  }
}

function getTutorialData() {
  return [
    { title: '写在前面', imageUrls: ['https://i.postimg.cc/7PgyMG9S/image.jpg'] },
    { title: '软件介绍', imageUrls: ['https://i.postimg.cc/VvsJRh6q/IMG-20250713-162647.jpg', 'https://i.postimg.cc/8P5FfxxD/IMG-20250713-162702.jpg', 'https://i.postimg.cc/3r94R3Sn/IMG-20250713-162712.jpg'] },
    { title: '404', imageUrls: ['https://i.postimg.cc/x8scFPJW/IMG-20250713-162756.jpg', 'https://i.postimg.cc/pX6mfqtj/IMG-20250713-162809.jpg', 'https://i.postimg.cc/YScjV00q/IMG-20250713-162819.jpg', 'https://i.postimg.cc/13VfJw9j/IMG-20250713-162828.jpg'] },
    { title: '404-群聊', imageUrls: ['https://i.postimg.cc/X7LSmRTj/404.jpg'] },
  ];
}

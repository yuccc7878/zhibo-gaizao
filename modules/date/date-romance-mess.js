/**
 * date-romance.js - 约会场景 3D 背景（重构测试版）
 * 保证可见的明亮场景 + 相机环绕 + 独立 AI 聊天
 */
import * as THREE from 'three';

let scene, camera, renderer;
let animFrameId = null, isReady = false;
let clock = null;
const containerId = 'date-chat-screen';
let spotLight = null;
let orbitAngle = 0;

export async function init(contactName) {
  console.log('[DateRomance] init', contactName);
  if (isReady) return;
  try {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x3a2a4a);

    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(50, aspect, 0.5, 30);
    // ★ 强制相机看向房间中心
    camera.position.set(0, 1.6, 3.5);
    camera.lookAt(0, 0.8, 0);
    // 强制更新一次
    camera.updateProjectionMatrix();

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    renderer.setPixelRatio(dpr);
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.pointerEvents = 'none';
    renderer.domElement.style.zIndex = '1';
    renderer.domElement.style.objectFit = 'cover';

    clock = new THREE.Clock();

    // ✅ 保证可见的场景
    buildScene();
    buildLights();
    buildBed();
    buildDeco();

    const container = document.getElementById(containerId);
    if (container) {
      const old = container.querySelector('canvas');
      if (old) old.remove();
      container.insertBefore(renderer.domElement, container.firstChild);
      container.style.background = '#3a2a4a';
    }

    isReady = true;
    // ★ 强制立即渲染一帧
    if (renderer && scene && camera) renderer.render(scene, camera);
    animate();
    if (contactName) setupChat(contactName);
    // ★★★ 3 秒后诊断 ★★★
    setTimeout(() => {
      const objs = [];
      scene.traverse(o => {
        if (o.isMesh) {
          const pos = o.position.toArray().map(v => v.toFixed(2));
          objs.push(o.geometry.type + ' col:' + o.material.color.getHexString() + ' pos:[' + pos + ']');
        }
      });
      // 检查相机是否在场景内部
      const camPos = camera.position.toArray().map(v => v.toFixed(2));
      const lookTarget = new THREE.Vector3(0,0.8,0);
      const dir = new THREE.Vector3().copy(lookTarget).sub(camera.position).normalize().toArray().map(v => v.toFixed(2));
      console.log('[DateRomance] 场景诊断:', {
        物体数量: objs.length,
        物体列表: objs,
        相机位置: '['+camPos+']',
        视线方向: '['+dir+']',
        renderer尺寸: [renderer.domElement.width, renderer.domElement.height],
        canvas父节点: renderer.domElement.parentNode?.id || '无',
        canvas显示: renderer.domElement.style.display,
        canvas尺寸CSS: renderer.domElement.style.width + ' x ' + renderer.domElement.style.height,
        scene背景: '#' + scene.background.getHexString()
      });
      // ★ 强力检测：在所有物体外围加一圈标记球
      const markerMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
      for (let i = -2; i <= 2; i+=2) {
        for (let j = -2; j <= 2; j+=2) {
          const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), markerMat);
          m.position.set(i, 0.2, j);
          scene.add(m);
        }
      }
      console.log('[DateRomance] 已添加5x5标记球阵列');
      // 强制重新渲染一帧
      if (renderer && scene && camera) renderer.render(scene, camera);
    }, 3000);
    return renderer;
  } catch (e) {
    console.error('[DateRomance] init error:', e);
  }
}

function updateCamera(delta) {
  orbitAngle += delta * 0.025;
  const r = 4.0;
  const x = Math.sin(orbitAngle) * r;
  const z = Math.cos(orbitAngle) * r;
  camera.position.set(x, 1.6, z + 0.5);
  camera.lookAt(0, 0.8, 0);
}

function buildScene() {
  // 地板（浅蓝色）— 相机正前方能看见
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.MeshBasicMaterial({ color: 0x6688cc, side: THREE.DoubleSide })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.01, 0);
  scene.add(floor);

  // 后墙（红色）— 房间尽头
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 2.8),
    new THREE.MeshBasicMaterial({ color: 0xcc6644, side: THREE.DoubleSide })
  );
  back.position.set(0, 1.4, -2.5);
  scene.add(back);

  // 左墙（绿色）
  const left = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 2.8),
    new THREE.MeshBasicMaterial({ color: 0x44aa66, side: THREE.DoubleSide })
  );
  left.position.set(-2.5, 1.4, 0);
  left.rotation.y = Math.PI / 2;
  scene.add(left);

  // 右墙（蓝色）
  const right = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 2.8),
    new THREE.MeshBasicMaterial({ color: 0x4488cc, side: THREE.DoubleSide })
  );
  right.position.set(2.5, 1.4, 0);
  right.rotation.y = -Math.PI / 2;
  scene.add(right);

  // 天花板（浅紫）
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 5),
    new THREE.MeshBasicMaterial({ color: 0x8866aa, side: THREE.BackSide })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 2.8, 0);
  scene.add(ceil);

  // 显眼的中间圆柱（黄）— 参考物
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 1.0, 8),
    new THREE.MeshBasicMaterial({ color: 0xffdd44 })
  );
  pillar.position.set(0, 0.5, 0);
  scene.add(pillar);
}

function buildLights() {
  // 明亮灯光
  scene.add(new THREE.AmbientLight(0xffffff, 1.0));
  const d1 = new THREE.DirectionalLight(0xffffff, 1.5);
  d1.position.set(2, 4, 3);
  scene.add(d1);
  const d2 = new THREE.DirectionalLight(0xffccaa, 0.8);
  d2.position.set(-2, 3, -2);
  scene.add(d2);
}

function buildBed() {
  // 床（深紫色盒子 + 浅色床垫）— 放在后墙前方
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.25, 2.0),
    new THREE.MeshStandardMaterial({ color: 0x4a3a6a, roughness: 0.6 })
  );
  base.position.set(0, 0.12, -1.2);
  scene.add(base);

  const mat = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.15, 1.9),
    new THREE.MeshStandardMaterial({ color: 0xeee8ee, roughness: 0.8 })
  );
  mat.position.set(0, 0.3, -1.2);
  scene.add(mat);

  // 枕头×2
  for (let s = -1; s <= 1; s += 2) {
    const p = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.1, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xf5f0f5, roughness: 0.7 })
    );
    p.position.set(s * 0.35, 0.43, -1.85);
    scene.add(p);
  }

  // 被子
  const quilt = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.12, 0.8),
    new THREE.MeshStandardMaterial({ color: 0xaa77dd, roughness: 0.7 })
  );
  quilt.position.set(0, 0.42, -0.8);
  scene.add(quilt);

  // 床头板
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.5, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x6a4a7a, roughness: 0.5 })
  );
  head.position.set(0, 0.6, -2.22);
  scene.add(head);

  // 床头柜×2 + 台灯
  for (let s = -1; s <= 1; s += 2) {
    const nt = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x5a4a5a, roughness: 0.5 })
    );
    nt.position.set(s * 1.0, 0.15, -2.1);
    scene.add(nt);
    // 台灯（发光锥体）
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.08, 6),
      new THREE.MeshBasicMaterial({ color: 0xffdd88, transparent: true, opacity: 0.3 })
    );
    shade.position.set(s * 1.0, 0.38, -2.1);
    scene.add(shade);
  }
}

function buildDeco() {
  // 小茶几（右侧近景）
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 0.25, 8),
    new THREE.MeshStandardMaterial({ color: 0x6a5a5a, roughness: 0.4 })
  );
  table.position.set(1.5, 0.12, 1.2);
  scene.add(table);
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.02, 12),
    new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.2, metalness: 0.3 })
  );
  top.position.set(1.5, 0.25, 1.2);
  scene.add(top);

  // 花瓶+花
  const vase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.04, 0.08, 6),
    new THREE.MeshStandardMaterial({ color: 0xcc88ee, roughness: 0.2, metalness: 0.4 })
  );
  vase.position.set(1.5, 0.3, 1.2);
  scene.add(vase);
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 6, 6),
      new THREE.MeshBasicMaterial({ color: [0xff6688,0xffaa44,0xee77ff,0xff4488,0x88ddff][i] })
    );
    f.position.set(1.5 + (Math.random()-0.5)*0.06, 0.38 + Math.random()*0.03, 1.2 + (Math.random()-0.5)*0.06);
    scene.add(f);
  }

  // 地毯（床前）
  const rug = new THREE.Mesh(
    new THREE.CircleGeometry(0.4, 16),
    new THREE.MeshStandardMaterial({ color: 0x7755aa, roughness: 0.9, side: THREE.DoubleSide })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.01, 0.3);
  scene.add(rug);
}

// ==================== 独立 AI 约会聊天系统 ====================
function setupChat(contactName) {
  const input = document.getElementById('date-chat-input');
  const sendBtn = document.getElementById('date-chat-send');
  const backBtn = document.getElementById('date-chat-back');
  const msgContainer = document.getElementById('date-chat-messages');
  if (!input || !sendBtn || !backBtn || !msgContainer) return;

  const history = [];
  const systemPrompt = `你正在和 ${contactName} 在爱情旅馆约会。你是一个浪漫温柔的人，正沉浸在约会氛围中。场景：爱情旅馆的温馨房间，紫色灯光，窗外夜色。请用自然、温柔的语气回应，适当调情但保持优雅，每次回复不超过 80 字。用中文回复。`;

  async function sendMessage(text) {
    if (!text.trim()) return;
    input.value = '';
    const ph = msgContainer.querySelector('.orbital-placeholder');
    if (ph) ph.remove();
    addBubble(text, 'user');
    history.push({ role: 'user', content: text });
    try {
      if (typeof window.AiService?.chat === 'function') {
        const reply = await window.AiService.chat({ system: systemPrompt, messages: history });
        const clean = reply.replace(/^["']|["']$/g, '').trim();
        addBubble(clean, 'ai');
        history.push({ role: 'model', content: clean });
      } else {
        addBubble('(AI 服务未配置)', 'ai');
      }
    } catch (e) {
      addBubble('(回复失败: ' + (e.message || e) + ')', 'ai');
    }
  }

  function addBubble(text, role) {
    const div = document.createElement('div');
    div.className = 'orbital-bubble ' + role;
    div.textContent = text;
    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  sendBtn.onclick = () => sendMessage(input.value);
  input.onkeydown = (e) => { if (e.key === 'Enter') sendMessage(input.value); };
  setTimeout(() => {
    addBubble('你来了… 我等了好久。今晚的你好美。', 'ai');
    history.push({ role: 'model', content: '你来了… 我等了好久。今晚的你好美。' });
  }, 1500);
  backBtn.onclick = () => {
    if (window._romance && window._romance.destroy) window._romance.destroy();
    window._romance = null;
  };
}

function animate() {
  animFrameId = requestAnimationFrame(animate);
  if (!clock || !renderer || !scene || !camera) return;
  const delta = clock.getDelta();
  updateCamera(delta);
  renderer.render(scene, camera);
}

export function resume() { if (isReady && animFrameId === null) animate(); }
export function pause() {
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
}
export function destroy() {
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
  if (renderer && renderer.domElement && renderer.domElement.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement);
  }
  if (renderer) renderer.dispose();
  scene = null; camera = null; renderer = null; clock = null;
  isReady = false;
  animFrameId = null;
  // 清理聊天
  const mc = document.getElementById('date-chat-messages');
  if (mc) mc.innerHTML = '<div class="orbital-placeholder">✦ 在浪漫的氛围中开始对话吧</div>';
  const inp = document.getElementById('date-chat-input');
  if (inp) { inp.onkeydown = null; inp.value = ''; }
  const snd = document.getElementById('date-chat-send');
  if (snd) snd.onclick = null;
  const bk = document.getElementById('date-chat-back');
  if (bk) bk.onclick = null;
}

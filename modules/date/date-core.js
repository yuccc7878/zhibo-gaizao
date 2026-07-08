/**
 * 约会小镇 - Three.js 3D 核心 (第一部分)
 * 地形/道路/建筑/喷泉/植被/天空/光照/装饰
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// ==================== 8个约会地点数据 ====================
const DATE_LOCATIONS = [
  { id:'cafe', name:'☕ 星语咖啡厅', sub:'温馨 · 下午茶 · 私语', pos:[-3.2,0.3,-2.0], color:0xff8844,
    desc:'坐落在梧桐树下的静谧咖啡厅，暖黄灯光透过落地窗洒在石板路上。',
    tags:'适合初次约会 · 安静舒适', mood:'温馨 · 轻松' },
  { id:'cinema', name:'🎬 星光影院', sub:'浪漫 · 大片 · 爆米花', pos:[3.2,0.3,-2.2], color:0x44aaff,
    desc:'复古风格的独立影院，每晚放映经典影片。黑暗中的悄悄话是感情升温的催化剂。',
    tags:'适合情侣 · 经典片单', mood:'浪漫 · 心动' },
  { id:'park', name:'🎡 欢乐游乐园', sub:'刺激 · 欢笑 · 摩天轮', pos:[-0.2,0.5,3.8], color:0x66dd88,
    desc:'华灯初上，摩天轮缓缓转动。在最高点告白，成功率翻倍。',
    tags:'适合约会 · 夜景绝佳', mood:'欢乐 · 心跳' },
  { id:'gallery', name:'🎨 创意画廊', sub:'艺术 · 色彩 · 灵感', pos:[-4.5,0.2,2.0], color:0xff44aa,
    desc:'堆叠的彩色方块组成独特展厅，每周末有独立艺术家驻场。一起讨论艺术是最自然的心动信号。',
    tags:'文艺首选 · 小众打卡', mood:'文艺 · 清新' },
  { id:'observatory', name:'🔭 星空瞭望台', sub:'天文 · 银河 · 流星', pos:[4.8,0.8,-3.0], color:0x4444ff,
    desc:'小镇最高点，架设着复古天文望远镜。在银河下许愿，每一颗流星都在为你们见证。',
    tags:'夜景最佳 · 浪漫满分', mood:'梦幻 · 震撼' },
  { id:'jazz', name:'🎵 爵士酒吧', sub:'蓝调 · 微醺 · 即兴', pos:[-2.0,0.3,-4.5], color:0xffaa00,
    desc:'地下爵士酒吧，每晚有即兴演出。暖色灯光下，一杯鸡尾酒配一段萨克斯风，氛围刚好。',
    tags:'夜生活 · 微醺时光', mood:'慵懒 · 暧昧' },
  { id:'hotel', name:'🌌 爱情旅馆', sub:'蜂巢 · 霓虹 · 梦幻', pos:[3.8,0.2,3.5], color:0x00ffcc,
    desc:'充满未来感的设计旅馆，蜂巢网格结构搭配霓虹光影。顶楼天台能俯瞰整个小镇的灯火。',
    tags:'私密空间 · 设计感爆棚', mood:'迷离 · 浪漫' },
  { id:'sakura', name:'🌸 樱花园', sub:'花见 · 野餐 · 风铃', pos:[-3.5,0.5,4.2], color:0xff88cc,
    desc:'漂浮在空中的微型樱花园，巨大的樱花树洒下花瓣如雨。树下野餐是春日最美好的约定。',
    tags:'约会圣地 · 花瓣纷飞', mood:'唯美 · 治愈' },
];

let scene, camera, renderer, labelRenderer, controls;
let clock, clickables = [], clouds = [], heartStar = null, heartLocId = null;
let selectedId = null, raycaster, pointer, animFrameId = null, isReady = false;
let magicRings = [], topOrbs = [];
let townBase, treeCrowns = [];

export { DATE_LOCATIONS };

export async function init() {
  if (isReady) return;
  try {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 18, 32);

    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(35, aspect, 0.1, 50);
    camera.position.set(8, 6, 10);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.left = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    labelRenderer.domElement.style.zIndex = '10';

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.autoRotate = true; controls.autoRotateSpeed = 0.3;
    controls.minDistance = 5; controls.maxDistance = 18;
    controls.maxPolarAngle = Math.PI / 2.3;
    controls.target.set(0, 0.3, 0);

    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '1';

    clock = new THREE.Clock();
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    setupLightsPt1();
    buildTownSquare();
    buildRoads();
    buildHouses();
    buildFountain();
    buildTrees();
    buildFlowerBeds();
    buildNightSky();
    buildDecorations();
    setupLocationsAndMarkers(scene, camera, controls, clickables, magicRings, topOrbs);
    createLocationLabels(scene);
    createCloudsPt1();
    setupInteractionSystem(renderer, scene, camera, controls, clickables, pointer, raycaster,
      showLocationPanel, closePanel);
    heartStar = { star: null, light: null, currentIndex: -1, update: null };
    setupHeartStar(scene, clickables, heartStar);
    window.addEventListener('resize', onResize);

    const screen = document.getElementById('date-map-screen');
    if (screen) { screen.appendChild(renderer.domElement); screen.appendChild(labelRenderer.domElement); }

    isReady = true;
    animate();
  } catch (e) { console.error('[DateCore] init error:', e); }
}

// ==================== 光照氛围 ====================
function setupLightsPt1() {
  scene.add(new THREE.AmbientLight(0xffd8a8, 0.7));

  const hemi = new THREE.HemisphereLight(0x87CEEB, 0xFFCCAA, 0.8);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffaa66, 2.0);
  sun.position.set(6, 12, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048; sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 25;
  sun.shadow.camera.left = -10; sun.shadow.camera.right = 10;
  sun.shadow.camera.top = 10; sun.shadow.camera.bottom = -10;
  sun.shadow.bias = -0.002;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xFFDDCC, 0.5);
  fill.position.set(-4, 4, -5);
  scene.add(fill);

  // 喷泉上方点光源（中心温馨感）
  const fountainLight = new THREE.PointLight(0xffdd88, 1.5, 15);
  fountainLight.position.set(0, 3.5, 0);
  scene.add(fountainLight);
}

// ==================== 小镇广场 ====================
function buildTownSquare() {
  // 主平台：半径8，厚0.3
  const baseMat = new THREE.MeshPhysicalMaterial({ color:0xe8d5c4, roughness:0.8, metalness:0 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 0.3, 48), baseMat);
  base.position.y = 0.15; base.receiveShadow = true; base.castShadow = true;
  scene.add(base);
  townBase = base;

  // 3层台阶状圆环收边
  const stepMat = new THREE.MeshPhysicalMaterial({ color:0xd4c0a8, roughness:0.9 });
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(7.5 - i*0.3, 0.08 + i*0.04, 8, 48),
      stepMat
    );
    ring.position.y = 0.3 + i*0.05;
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
  }

  // 灌木篱笆（低矮绿色半球沿边缘排列）
  const hedgeMat = new THREE.MeshPhysicalMaterial({ color:0x5a8a4a, roughness:0.8 });
  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2;
    const r = 7.6;
    const hedge = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 6, 6),
      hedgeMat
    );
    hedge.scale.y = 0.5;
    hedge.position.set(Math.cos(angle)*r, 0.18, Math.sin(angle)*r);
    hedge.castShadow = true;
    scene.add(hedge);
  }
}

// ==================== 弯曲石板路 ====================
function buildRoads() {
  const roadMat = new THREE.MeshPhysicalMaterial({ color:0xc4a882, roughness:0.9 });
  const roadPaths = [
    // 路1: 从中心到咖啡厅方向
    {pts: [ [0,0], [-0.5,-0.8], [-1.5,-1.5], [-3.0,-2.0] ], w:0.4},
    // 路2: 从中心到影院方向
    {pts: [ [0,0], [0.8,-0.5], [1.8,-1.2], [3.0,-2.2] ], w:0.4},
    // 路3: 从中心到游乐园方向
    {pts: [ [0,0], [0.2,1.0], [0,2.0], [-0.2,3.5] ], w:0.4},
  ];
  roadPaths.forEach(path => {
    const shape = new THREE.Shape();
    const pts = path.pts;
    const halfW = path.w / 2;
    shape.moveTo(pts[0][0]-halfW, pts[0][1]-halfW);
    for (let i = 1; i < pts.length; i++) {
      shape.lineTo(pts[i][0]-halfW, pts[i][1]-halfW);
    }
    for (let i = pts.length-1; i >= 0; i--) {
      shape.lineTo(pts[i][0]+halfW, pts[i][1]+halfW);
    }
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    const mesh = new THREE.Mesh(geo, roadMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.31;
    mesh.receiveShadow = true;
    scene.add(mesh);
  });

  // 路边长椅 × 6
  const benchMat = new THREE.MeshPhysicalMaterial({ color:0x8a6a4a, roughness:0.7 });
  const legMat = new THREE.MeshPhysicalMaterial({ color:0x4a3a2a, roughness:0.5 });
  const benchPos = [[-1.8,-1.0],[1.8,-1.2],[ -0.5,-1.8],[0.8,-0.3],[-0.8,1.5],[0.5,2.0]];
  benchPos.forEach(p => {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.06,0.12), benchMat);
    seat.position.set(p[0], 0.36, p[1]);
    seat.castShadow = true; seat.receiveShadow = true; scene.add(seat);
    for (let side = -1; side <= 1; side += 2) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.1,4), legMat);
      leg.position.set(p[0]+side*0.15, 0.28, p[1]);
      scene.add(leg);
    }
  });
}

// ==================== 小镇尖顶房屋 ====================
function buildHouses() {
  const wallColors = [0xfff5ee, 0xc47a5a, 0xccc4b8, 0xffddd4];
  const roofColors = [0x5a3a2a, 0x6a4a3a, 0x4a4a5a, 0x7a4a4a];
  // 沿路两侧排列18栋
  const positions = [];
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2 + 0.3;
    const r = 3.2 + Math.random() * 1.5;
    positions.push({ x: Math.cos(angle)*r, z: Math.sin(angle)*r, rot: Math.random()*0.5-0.25 });
  }
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2 - 0.3;
    const r = 3.5 + Math.random() * 1.8;
    positions.push({ x: Math.cos(angle)*r, z: Math.sin(angle)*r, rot: Math.random()*0.5-0.25 });
  }
  positions.forEach((p, idx) => {
    // 避开地点位置
    const locPositions = DATE_LOCATIONS.map(l => ({x:l.pos[0],z:l.pos[2]}));
    let tooClose = false;
    for (const lp of locPositions) {
      if (Math.sqrt((p.x-lp.x)**2 + (p.z-lp.z)**2) < 0.8) { tooClose = true; break; }
    }
    if (tooClose) return;
    if (Math.abs(p.x) < 0.3 && Math.abs(p.z) < 0.3) return;

    const wc = wallColors[Math.floor(Math.random()*wallColors.length)];
    const rc = roofColors[Math.floor(Math.random()*roofColors.length)];
    const w = 0.25 + Math.random()*0.2;
    const h = 0.3 + Math.random()*0.2;
    const d = 0.25 + Math.random()*0.2;

    const wall = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
      new THREE.MeshPhysicalMaterial({ color:wc, roughness:0.6 }));
    wall.position.set(p.x, h/2+0.3, p.z);
    wall.rotation.y = p.rot;
    wall.castShadow = true; wall.receiveShadow = true;
    scene.add(wall);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(w*0.7, h*0.4, 4),
      new THREE.MeshPhysicalMaterial({ color:rc, roughness:0.7, flatShading:true }));
    roof.position.set(p.x, h+0.3, p.z);
    roof.rotation.y = Math.PI/4 + p.rot;
    roof.castShadow = true;
    scene.add(roof);

    // 窗户：emissive 小面模拟暖黄灯光
    if (Math.random() > 0.3) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.06,0.08),
        new THREE.MeshBasicMaterial({ color:0xffdd66, transparent:true, opacity:0.3+Math.random()*0.3 }));
      win.position.set(p.x + w/2*0.8, h/2+0.3, p.z);
      win.rotation.y = p.rot;
      scene.add(win);
    }
  });
}

// ==================== 许愿喷泉 ====================
function buildFountain() {
  const poolMat = new THREE.MeshPhysicalMaterial({ color:0x88ccdd, roughness:0.3, metalness:0.1, transparent:true, opacity:0.7 });
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.12, 24), poolMat);
  pool.position.set(0, 0.36, 0);
  pool.receiveShadow = true;
  scene.add(pool);

  const pillarMat = new THREE.MeshPhysicalMaterial({ color:0xddd4c4, roughness:0.5 });
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.6, 8), pillarMat);
  pillar.position.set(0, 0.7, 0);
  pillar.castShadow = true;
  scene.add(pillar);

  // 多层递减圆盘（水花）
  const splashMat = new THREE.MeshPhysicalMaterial({ color:0xccddff, roughness:0.2, transparent:true, opacity:0.5 });
  for (let i = 0; i < 3; i++) {
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15-i*0.03, 0.18-i*0.04, 0.02, 12),
      splashMat
    );
    disc.position.set(0, 0.95 + i*0.12, 0);
    disc.rotation.y = i * 0.5;
    scene.add(disc);
  }

  // 环形灯串（Torus 粒子）
  const lightMat = new THREE.MeshBasicMaterial({ color:0xffdd88, transparent:true, opacity:0.4 });
  for (let i = 0; i < 16; i++) {
    const angle = (i/16)*Math.PI*2;
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), lightMat);
    light.position.set(Math.cos(angle)*0.85, 0.42, Math.sin(angle)*0.85);
    scene.add(light);
  }
  // 第二圈灯串
  const lightMat2 = new THREE.MeshBasicMaterial({ color:0x88ddff, transparent:true, opacity:0.3 });
  for (let i = 0; i < 12; i++) {
    const angle = (i/12)*Math.PI*2 + 0.2;
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), lightMat2);
    light.position.set(Math.cos(angle)*0.95, 0.38, Math.sin(angle)*0.95);
    scene.add(light);
  }
}

// ==================== 树木 ====================
function buildTrees() {
  const trunkMat = new THREE.MeshPhysicalMaterial({ color:0x6a4a3a, roughness:0.8 });
  const leafMat = new THREE.MeshPhysicalMaterial({ color:0x4a8a4a, roughness:0.7, flatShading:true });

  for (let i = 0; i < 12; i++) {
    const angle = Math.random()*Math.PI*2;
    const r = 2.5 + Math.random()*4.0;
    const x = Math.cos(angle)*r, z = Math.sin(angle)*r;
    // 避开地点和建筑
    let skip = false;
    for (const loc of DATE_LOCATIONS) {
      if (Math.sqrt((x-loc.pos[0])**2+(z-loc.pos[2])**2) < 0.8) { skip=true; break; }
    }
    if (skip || (Math.abs(x)<0.3&&Math.abs(z)<0.3)) continue;

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.05,0.2,6), trunkMat);
    trunk.position.set(x, 0.4, z);
    trunk.castShadow = true;
    scene.add(trunk);
    treeCrowns.push(trunk);

    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.15+Math.random()*0.1, 7, 7), leafMat);
    crown.position.set(x, 0.55+Math.random()*0.05, z);
    crown.scale.y = 0.7 + Math.random()*0.2;
    crown.castShadow = true;
    scene.add(crown);
    treeCrowns.push(crown);
  }
}

// ==================== 花坛 ====================
function buildFlowerBeds() {
  const positions = [[-2.8,1.5],[2.5,-1.8],[-2.2,-2.5],[3.0,2.0],[-3.5,-1.0],[1.0,3.0]];
  positions.forEach(p => {
    const x = p[0], z = p[1];
    for (let i = 0; i < 5; i++) {
      const color = [0xff6688,0xffaa44,0x88ddff,0xff88cc,0xffff66][Math.floor(Math.random()*5)];
      const flower = new THREE.Mesh(
        new THREE.BoxGeometry(0.04,0.04+Math.random()*0.04,0.04),
        new THREE.MeshPhysicalMaterial({ color, roughness:0.5 })
      );
      flower.position.set(
        x + (Math.random()-0.5)*0.2,
        0.32 + Math.random()*0.06,
        z + (Math.random()-0.5)*0.2
      );
      scene.add(flower);
    }
  });

  // 灌木丛（绿色半球）
  const bushMat = new THREE.MeshPhysicalMaterial({ color:0x4a7a4a, roughness:0.8 });
  for (let i = 0; i < 8; i++) {
    const angle = Math.random()*Math.PI*2;
    const r = 4 + Math.random()*2;
    const x = Math.cos(angle)*r, z = Math.sin(angle)*r;
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.08+Math.random()*0.06, 6, 6), bushMat);
    bush.position.set(x, 0.15, z);
    bush.scale.y = 0.6;
    bush.castShadow = true;
    scene.add(bush);
  }
}

// ==================== 夜空球体渐变 ====================
function buildNightSky() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  // 渐变：深蓝到紫
  const grad = ctx.createLinearGradient(0,0,0,512);
  grad.addColorStop(0,'#0a0a2a');
  grad.addColorStop(0.5,'#1a0a3a');
  grad.addColorStop(1,'#2a1a4a');
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,1024,512);
  // 星星
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 200; i++) {
    const x = Math.random()*1024, y = Math.random()*512;
    const s = 0.5 + Math.random()*1.5;
    ctx.globalAlpha = 0.3 + Math.random()*0.7;
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI*2);
    ctx.fill();
  }
  // 弯月
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#ffeedd';
  ctx.beginPath();
  ctx.arc(800, 120, 25, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = '#0a0a2a';
  ctx.beginPath();
  ctx.arc(790, 110, 20, 0, Math.PI*2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.x = 1;

  const skyMat = new THREE.MeshBasicMaterial({
    map: texture, side: THREE.BackSide
  });
  const skyGeo = new THREE.SphereGeometry(30, 32, 32);
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.position.y = 0;
  sky.userData = { rotSpeed: 0.0002 };
  scene.add(sky);
}

// ==================== 氛围装饰 ====================
function buildDecorations() {
  // 三角小彩旗串
  const flagMat1 = new THREE.MeshBasicMaterial({ color:0xff6688, side:THREE.DoubleSide });
  const flagMat2 = new THREE.MeshBasicMaterial({ color:0x88ddff, side:THREE.DoubleSide });
  const flagMat3 = new THREE.MeshBasicMaterial({ color:0xffff66, side:THREE.DoubleSide });
  const flagMats = [flagMat1, flagMat2, flagMat3];
  // 两条彩旗线
  for (let line = 0; line < 2; line++) {
    const startR = 2, endR = 4, startAngle = line*Math.PI + 0.3;
    for (let i = 0; i < 12; i++) {
      const t = i/12;
      const angle = startAngle + t*0.8;
      const r = startR + t*(endR-startR);
      const x = Math.cos(angle)*r, z = Math.sin(angle)*r;
      const flag = new THREE.Mesh(
        new THREE.ConeGeometry(0.04, 0.06, 3),
        flagMats[i%3]
      );
      flag.position.set(x, 1.2 + Math.sin(i)*0.1, z);
      flag.rotation.x = Math.random()*0.2;
      flag.rotation.z = Math.random()*0.2;
      scene.add(flag);
    }
  }

  // 路灯柱上悬挂小花篮（沿用之前的路灯，在顶部加小彩球）
  for (let i = 0; i < 8; i++) {
    const angle = (i/8)*Math.PI*2 + Math.PI/8, r = 3.8;
    const x = Math.cos(angle)*r, z = Math.sin(angle)*r;
    // 花篮：彩色小半球
    const basketMat = new THREE.MeshPhysicalMaterial({
      color: [0xff6688,0x88ff88,0xffaa44,0x88ddff][i%4], roughness:0.5
    });
    const basket = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), basketMat);
    basket.position.set(x, 0.45, z);
    basket.scale.y = 0.4;
    scene.add(basket);
  }
}

// ==================== 云朵 ====================
function createCloudsPt1() {
  const mat = new THREE.MeshPhysicalMaterial({ color:0xffffff, transparent:true, opacity:0.4, roughness:1 });
  const pos = [[-5,3,-3],[3,2.5,-5],[-2,3.2,4],[6,2.8,2],[-6,2.5,2],[0,3, -4]];
  pos.forEach(p => {
    const g = new THREE.Group();
    const cnt = 3+Math.floor(Math.random()*3);
    for (let i=0;i<cnt;i++) {
      const s=new THREE.Mesh(new THREE.SphereGeometry(0.3+Math.random()*0.4,8,8),mat);
      s.position.set((Math.random()-0.5)*0.6,(Math.random()-0.5)*0.1,(Math.random()-0.5)*0.4);
      s.scale.y=0.5+Math.random()*0.3;
      g.add(s);
    }
    g.position.set(p[0],p[1],p[2]);
    g.userData={speed:0.015+Math.random()*0.02,range:1.5+Math.random(),offset:Math.random()*100};
    scene.add(g); clouds.push(g);
  });
}

// ==================== 占位函数（第二部分实现） ====================
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  if (camera) { camera.aspect = w/h; camera.updateProjectionMatrix(); }
  if (renderer) { renderer.setSize(w,h); labelRenderer.setSize(w,h); }
}

function animate() {
  animFrameId = requestAnimationFrame(animate);
  const time = clock ? clock.getElapsedTime() : 0;

  // 魔法阵悬浮小球环绕
  scene && scene.children.forEach(child => {
    if (child.userData && child.userData.isLocation && child.children) {
      child.children.forEach(sub => {
        if (sub.children) {
          sub.children.forEach(orb => {
            if (orb.geometry && orb.geometry.type === 'SphereGeometry' && orb.userData && orb.userData.orbitAngle !== undefined) {
              const angle = orb.userData.orbitAngle + time * orb.userData.orbitSpeed;
              const r = 0.6;
              orb.position.x = Math.cos(angle) * r;
              orb.position.z = Math.sin(angle) * r;
              orb.position.y = 0.25 + Math.sin(angle * 2) * 0.05;
            }
          });
        }
      });
    }
  });

  // 魔法阵光环呼吸
  scene && scene.children.forEach(child => {
    if (child.userData && child.userData.isLocation && child.children) {
      child.children.forEach(sub => {
        if (sub.type === 'Mesh' && sub.geometry && sub.geometry.type === 'TorusGeometry') {
          sub.material.opacity = 0.5 + Math.sin(time * 1.5 + sub.id) * 0.2;
          sub.material.emissiveIntensity = 0.2 + Math.sin(time * 2 + sub.id) * 0.15;
        }
      });
    }
  });

  // 云朵飘移
  clouds.forEach(cloud => {
    const d = cloud.userData;
    cloud.position.x += Math.sin(time * 0.3 + d.offset) * 0.002;
    cloud.position.z += Math.cos(time * 0.2 + d.offset * 0.7) * 0.002;
    cloud.position.y = d.range * 0.5 + Math.sin(time * 0.5 + d.offset) * 0.1;
  });

  // 心动之选更新
  if (typeof heartStar !== 'undefined' && heartStar && heartStar.update) {
    heartStar.update(time);
  }

  // 喷泉粒子（水光闪烁）
  const fountainLights = [];
  scene && scene.children.forEach(c => {
    if (c.isPointLight) fountainLights.push(c);
  });
  fountainLights.forEach(fl => {
    fl.intensity = 1.2 + Math.sin(time * 2) * 0.3;
  });

  if (controls) controls.update();
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }
}

export function resume() {
  if (controls) controls.autoRotate = true;
}

export function pause() {
  if (controls) controls.autoRotate = false;
}

export function destroy() {
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
  window.removeEventListener('resize', onResize);
  scene && scene.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else obj.material.dispose();
    }
  });
  const screen = document.getElementById('date-map-screen');
  if (screen) {
    if (renderer && renderer.domElement && renderer.domElement.parentNode) screen.removeChild(renderer.domElement);
    if (labelRenderer && labelRenderer.domElement && labelRenderer.domElement.parentNode) screen.removeChild(labelRenderer.domElement);
  }
  renderer && renderer.dispose();
  labelRenderer && labelRenderer.dispose();
  isReady = false;
}

/**
 * 约会小镇 - Three.js 3D 核心 (第二部分)
 * 地点模型/魔法阵/交互增强/动画循环/生命周期
 */
// pt2 imports (handled by pt1)

// ==================== 8个地点独特3D模型 + 魔法阵标注 ====================
export function setupLocationsAndMarkers(sc, ca, co, cl, mr, to) {
  const totalLocations = DATE_LOCATIONS;
  
  totalLocations.forEach((loc, idx) => {
    const pos = new THREE.Vector3(loc.pos[0], loc.pos[1], loc.pos[2]);
    const color = loc.color;
    const g = new THREE.Group();
    g.position.copy(pos);
    g.userData.locationId = loc.id;
    g.userData.isLocation = true;

    // 1. 独特3D建筑模型
    const buildingGroup = createLocationBuilding(loc);
    if (buildingGroup) g.add(buildingGroup);

    // 2. 魔法阵标注（TorusGeometry 环 + 细光束 + 悬浮小球）
    const markerGroup = createMagicMarker(color);
    g.add(markerGroup);

    scene.add(g);
    clickables.push(g);
  });
}

function createLocationBuilding(loc) {
  const g = new THREE.Group();
  
  switch (loc.id) {
    case 'cafe': {
      // 咖啡厅：方块+遮阳棚+小圆桌
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.45),
        new THREE.MeshPhysicalMaterial({ color:0xffe8d0, roughness:0.5 }));
      body.position.y = 0.35;
      g.add(body);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.5),
        new THREE.MeshPhysicalMaterial({ color:0xcc6644, roughness:0.7 }));
      roof.position.y = 0.46;
      g.add(roof);
      // 遮阳棚（extrude小面）
      const awning = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 0.3),
        new THREE.MeshPhysicalMaterial({ color:0xdd8866 }));
      awning.position.set(0.33, 0.36, 0);
      g.add(awning);
      break;
    }
    case 'cinema': {
      // 影院：矩形体+大型入口+装饰条
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.4),
        new THREE.MeshPhysicalMaterial({ color:0x446688, roughness:0.6 }));
      body.position.y = 0.35;
      g.add(body);
      const marquee = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 0.08),
        new THREE.MeshBasicMaterial({ color:0xffdd44 }));
      marquee.position.set(0, 0.5, 0.24);
      g.add(marquee);
      // 两侧装饰柱
      for (let side = -1; side <= 1; side += 2) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6),
          new THREE.MeshPhysicalMaterial({ color:0xccaa88 }));
        pillar.position.set(side*0.2, 0.25, 0.24);
        g.add(pillar);
      }
      break;
    }
    case 'park': {
      // 游乐园：摩天轮简化版（环 + 辐条 + 小舱）
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.02, 8, 16),
        new THREE.MeshPhysicalMaterial({ color:0x88bbee, roughness:0.5 }));
      wheel.position.y = 0.45;
      wheel.rotation.x = Math.PI / 2;
      g.add(wheel);
      for (let i = 0; i < 6; i++) {
        const angle = (i/6)*Math.PI*2;
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.04,0.04,0.03),
          new THREE.MeshPhysicalMaterial({ color:0xff6644 }));
        cabin.position.set(Math.cos(angle)*0.25, 0.45 + Math.sin(angle)*0.25, 0);
        g.add(cabin);
      }
      // 底座
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.15, 6),
        new THREE.MeshPhysicalMaterial({ color:0x554433 }));
      base.position.y = 0.2;
      g.add(base);
      break;
    }
    case 'gallery': {
      // 画廊：堆叠彩色方块
      const colors = [0xff44aa, 0x88ddff, 0xffaa44, 0x66dd88];
      for (let i = 0; i < 5; i++) {
        const block = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12),
          new THREE.MeshPhysicalMaterial({ color:colors[i%4], roughness:0.3, metalness:0.1 }));
        block.position.set((i-2)*0.1, 0.3 + i*0.05, 0);
        g.add(block);
      }
      break;
    }
    case 'observatory': {
      // 瞭望台：高柱+穹顶+望远镜
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 8),
        new THREE.MeshPhysicalMaterial({ color:0xddd4c4 }));
      pillar.position.y = 0.5;
      g.add(pillar);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8, 0, Math.PI*2, 0, Math.PI/2),
        new THREE.MeshPhysicalMaterial({ color:0x446688, roughness:0.4 }));
      dome.position.y = 0.75;
      dome.rotation.x = Math.PI;
      g.add(dome);
      // 望远镜管
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 6),
        new THREE.MeshPhysicalMaterial({ color:0x664422 }));
      tube.position.set(0.08, 0.8, 0);
      tube.rotation.z = 0.3;
      g.add(tube);
      break;
    }
    case 'jazz': {
      // 酒吧：半地下风格 + 霓虹
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.4),
        new THREE.MeshPhysicalMaterial({ color:0x4a3a2a, roughness:0.7 }));
      body.position.y = 0.28;
      g.add(body);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.02),
        new THREE.MeshBasicMaterial({ color:0xff8844, transparent:true, opacity:0.8 }));
      sign.position.set(0, 0.4, 0.21);
      g.add(sign);
      // 霓虹管（发光小管围绕）
      const neonMat = new THREE.MeshBasicMaterial({ color:0xff4400, transparent:true, opacity:0.6 });
      for (let i = 0; i < 4; i++) {
        const angle = (i/4)*Math.PI*2;
        const neon = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), neonMat);
        neon.position.set(Math.cos(angle)*0.22, 0.35, Math.sin(angle)*0.22);
        g.add(neon);
      }
      break;
    }
    case 'hotel': {
      // 爱情旅馆：蜂巢网格 + 霓虹
      const hexMat = new THREE.MeshPhysicalMaterial({ color:0x88ffdd, roughness:0.2, metalness:0.4, emissive:0x00ffcc, emissiveIntensity:0.1 });
      for (let i = 0; i < 5; i++) {
        const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 6), hexMat);
        hex.position.set((i-2)*0.1, 0.35 + (i%2)*0.06, 0);
        g.add(hex);
      }
      const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.008, 8, 16),
        new THREE.MeshBasicMaterial({ color:0x00ffcc, transparent:true, opacity:0.4 }));
      glowRing.position.y = 0.28;
      glowRing.rotation.x = Math.PI / 2;
      g.add(glowRing);
      break;
    }
    case 'sakura': {
      // 樱花园：树干+粉红花冠+漂浮花瓣
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.25, 6),
        new THREE.MeshPhysicalMaterial({ color:0x6a4a3a }));
      trunk.position.y = 0.25;
      g.add(trunk);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8),
        new THREE.MeshPhysicalMaterial({ color:0xff88cc, roughness:0.6, emissive:0xff4488, emissiveIntensity:0.1 }));
      crown.position.y = 0.45;
      crown.scale.y = 0.7;
      g.add(crown);
      // 飘浮花瓣（小平面围绕）
      for (let i = 0; i < 12; i++) {
        const angle = (i/12)*Math.PI*2;
        const petal = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.015),
          new THREE.MeshBasicMaterial({ color:0xff88cc, transparent:true, opacity:0.5, side:THREE.DoubleSide }));
        petal.position.set(Math.cos(angle)*0.28, 0.4 + Math.sin(i*0.5)*0.05, Math.sin(angle)*0.28);
        petal.rotation.set(Math.random(), Math.random(), Math.random());
        g.add(petal);
      }
      break;
    }
  }
  return g;
}

// ==================== 魔法阵标注系统 ====================
function createMagicMarker(color) {
  const g = new THREE.Group();
  const baseColor = new THREE.Color(color);

  // 主环
  const ringMat = new THREE.MeshPhysicalMaterial({
    color: baseColor, emissive: baseColor, emissiveIntensity: 0.3,
    transparent: true, opacity: 0.7, roughness: 0.3, metalness: 0.4
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.025, 12, 24), ringMat);
  ring.rotation.x = Math.PI / 2 + 0.15;
  ring.position.y = 0.15;
  g.add(ring);

  // 第二环（反向倾斜）
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.015, 8, 24),
    ringMat.clone());
  ring2.material.opacity = 0.4;
  ring2.rotation.x = Math.PI / 2 - 0.15;
  ring2.rotation.z = 0.3;
  ring2.position.y = 0.18;
  g.add(ring2);

  // 细光束（4条向上汇聚）
  const beamMat = new THREE.MeshBasicMaterial({
    color: baseColor, transparent: true, opacity: 0.15
  });
  for (let i = 0; i < 4; i++) {
    const angle = (i/4)*Math.PI*2 + 0.2;
    const startR = 0.4, endR = 0.1;
    const shape = new THREE.Shape();
    shape.moveTo(0,0);
    shape.quadraticCurveTo(0.2, 0.3, 0, 0.5);
    const beam = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, {steps:1, depth:0.008, bevelEnabled:false}),
      beamMat
    );
    beam.position.set(Math.cos(angle)*startR, 0.15, Math.sin(angle)*startR);
    beam.rotation.y = -angle;
    beam.lookAt(0, 1, 0);
    g.add(beam);
  }

  // 悬浮小球（4颗环绕）
  const orbMat = new THREE.MeshPhysicalMaterial({
    color: baseColor, emissive: baseColor, emissiveIntensity: 0.5,
    roughness: 0.1, metalness: 0.8
  });
  for (let i = 0; i < 4; i++) {
    const angle = (i/4)*Math.PI*2;
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), orbMat.clone());
    orb.position.set(Math.cos(angle)*0.6, 0.25 + Math.sin(angle)*0.05, Math.sin(angle)*0.6);
    orb.userData.orbitAngle = angle;
    orb.userData.orbitSpeed = 0.4 + Math.random()*0.2;
    g.add(orb);
  }

  return g;
}

// ==================== CSS2D 标签创建 ====================
export function createLocationLabels(scene) {
  DATE_LOCATIONS.forEach(loc => {
    const div = document.createElement('div');
    div.textContent = loc.name;
    div.style.color = '#fff';
    div.style.fontSize = '13px';
    div.style.fontWeight = '600';
    div.style.textShadow = '0 1px 4px rgba(0,0,0,0.6)';
    div.style.background = 'rgba(0,0,0,0.5)';
    div.style.padding = '3px 10px';
    div.style.borderRadius = '12px';
    div.style.backdropFilter = 'blur(4px)';
    div.style.border = '1px solid rgba(255,255,255,0.2)';
    div.style.pointerEvents = 'none';
    div.style.fontFamily = 'sans-serif';
    const label = new CSS2DObject(div);
    label.position.set(loc.pos[0], loc.pos[1] + 0.9, loc.pos[2]);
    scene.add(label);
  });
}

// ==================== 交互系统（hover + 点击 + 面板） ====================
export function setupInteractionSystem(renderer, scene, camera, controls, clickables, pointer, raycaster,
  showPanelFn, closePanelFn) {
  let hoveredId = null;

  renderer.domElement.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  renderer.domElement.addEventListener('click', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(clickables, true);
    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj && !obj.userData.isLocation) {
        obj = obj.parent;
        if (!obj) break;
        if (obj.userData && obj.userData.isLocation) break;
      }
      if (obj && obj.userData && obj.userData.locationId) {
        const loc = DATE_LOCATIONS.find(l => l.id === obj.userData.locationId);
        if (loc) {
          // 相机飞行至该地点
          flyToLocation(camera, controls, loc, () => {
            showPanelFn(loc);
          });
          return;
        }
      }
    }
    // 点击空白处关闭面板
    closePanelFn();
  });
}

// ==================== 相机飞行 ====================
export function flyToLocation(camera, controls, loc, callback) {
  const targetPos = new THREE.Vector3(loc.pos[0], 0.2, loc.pos[2]);
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const endPos = new THREE.Vector3(
    loc.pos[0] + 2.5,
    loc.pos[1] + 1.5,
    loc.pos[2] + 2.5
  );
  const endTarget = new THREE.Vector3(loc.pos[0], loc.pos[1] + 0.3, loc.pos[2]);

  controls.autoRotate = false;
  const duration = 800; // ms
  const startTime = performance.now();

  function flyStep() {
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    // easeInOutCubic
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    camera.position.lerpVectors(startPos, endPos, ease);
    controls.target.lerpVectors(startTarget, endTarget, ease);
    controls.update();

    if (t < 1) {
      requestAnimationFrame(flyStep);
    } else {
      camera.position.copy(endPos);
      controls.target.copy(endTarget);
      controls.update();
      if (callback) setTimeout(callback, 100);
    }
  }
  flyStep();
}

// ==================== 心动之选 ⭐ 系统 ====================
export function setupHeartStar(scene, clickables, heartRef) {
  // 创建星星标记
  const starMat = new THREE.MeshPhysicalMaterial({
    color: 0xffea00, emissive: 0xffcc00, emissiveIntensity: 0.8,
    roughness: 0.2, metalness: 0.6, transparent: true, opacity: 0.9
  });
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), starMat);
  star.visible = false;
  star.userData.isHeartStar = true;
  scene.add(star);
  
  // 光晕（光环）
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffaa00, transparent: true, opacity: 0.3
  });
  const glow = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.1, 16), glowMat);
  glow.rotation.x = Math.PI / 2;
  glow.position.y = -0.02;
  glow.userData.isHeartGlow = true;
  star.add(glow);

  heartRef.star = star;
  heartRef.light = glow;
  heartRef.currentIndex = -1;

  // 初始随机选择
  pickNewHeartLocation(heartRef);

  // 每20秒切换
  setInterval(() => {
    pickNewHeartLocation(heartRef);
  }, 20000);

  // 动画更新
  heartRef.update = (time) => {
    if (!star.visible) return;
    star.position.y += Math.sin(time * 2) * 0.0003;
    star.rotation.y += 0.01;
    star.rotation.x = Math.sin(time * 1.5) * 0.1;
    if (glow) {
      glow.scale.setScalar(1 + Math.sin(time * 3) * 0.2);
      glow.material.opacity = 0.2 + Math.sin(time * 2) * 0.1;
    }
  };
}

function pickNewHeartLocation(heartRef) {
  const available = DATE_LOCATIONS.slice();
  if (heartRef.currentIndex >= 0 && heartRef.currentIndex < available.length) {
    available.splice(heartRef.currentIndex, 1);
  }
  const idx = Math.floor(Math.random() * available.length);
  const loc = available[idx];
  heartRef.currentIndex = DATE_LOCATIONS.indexOf(loc);
  const star = heartRef.star;
  if (star) {
    star.position.set(loc.pos[0], loc.pos[1] + 0.6, loc.pos[2]);
    star.visible = true;
  }
  console.log('[Date] 随机心动之选:', loc.name);
}

// ==================== 魔法阵动画更新 ====================
export function animateMagicRings(magicRings, time) {
  // 所有魔法阵通过场景遍历（替代直接引用）
}

// ==================== 详情面板 ====================
export function showLocationPanel(loc) {
  closePanel(); // 先关闭旧面板
  const panel = document.getElementById('date-panel');
  if (!panel) return;

  document.getElementById('date-panel-name').textContent = loc.name;
  document.getElementById('date-panel-sub').textContent = loc.sub;
  document.getElementById('date-panel-desc').textContent = loc.desc;
  document.getElementById('date-panel-tags').textContent = loc.tags;
  document.getElementById('date-panel-mood').textContent = loc.mood;

  panel.classList.add('active');

  // 更新"前往约会"按钮行为
  const btn = document.getElementById('date-panel-btn');
  if (btn) {
    btn.onclick = () => {
      alert(`即将前往「${loc.name}」开启约会…（该功能开发中）`);
    };
  }

  // 小延迟后自动滚回顶部
  requestAnimationFrame(() => { panel.scrollTop = 0; });
}

export function closePanel() {
  const panel = document.getElementById('date-panel');
  if (panel) panel.classList.remove('active');
}

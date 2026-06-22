/* ========================================
   Module: Games (游戏中心)
   ======================================== */

Engine.register({
    id: 'games',
    name: '游戏',
    icon: '🎮',
    screen: 'games-screen',
    order: 4,

    currentGame: null,

    GAMES_LIST: [
        { id: 'g2048',      icon: '🔢', name: '2048',     desc: '滑动合并数字\n挑战最高分',     reward: '得分÷10 金币' },
        { id: 'snake',      icon: '🐍', name: '贪吃蛇',   desc: '吃掉食物\n不断变长',           reward: '长度×2 金币' },
        { id: 'flappy',     icon: '🐦', name: '像素鸟',   desc: '点击飞翔\n躲避管道',           reward: '分数×5 金币' },
        { id: 'slot',       icon: '🎰', name: '老虎机',   desc: '转一转\n赢金币',               reward: '最高10倍下注' },
    ],

    // 最高分记录
    bestScores: {},

    init() {
        const screen = document.getElementById(this.screen);
        screen.innerHTML = `
            <div class="games-header">
                <button class="back-btn" data-target="home-screen">‹</button>
                <div class="title-container"><h1 class="title">游戏中心</h1></div>
                <div class="games-money">🪙 <span id="games-money">${db.money || 0}</span></div>
            </div>
            <main class="games-lobby" id="games-lobby">
                <div class="games-grid" id="games-grid"></div>
            </main>
            <div class="games-play-screen" id="games-play-screen">
                <div class="games-play-header">
                    <button class="games-play-close" id="games-play-close">返回大厅</button>
                    <div class="games-play-title" id="games-play-title">游戏</div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div class="games-play-score" id="games-play-score">0</div>
                        <button class="games-home-btn" id="games-home-btn" title="返回主页">🏠</button>
                    </div>
                </div>
                <div class="games-canvas-wrap" id="games-canvas-wrap"></div>
                <div id="games-extra-controls"></div>
                <div class="games-over-overlay" id="games-over-overlay">
                    <div class="games-over-box" id="games-over-box"></div>
                </div>
            </div>`;

        // 加载最高分
        this.bestScores = db.gameBestScores || {};

        // 渲染游戏列表
        this.renderLobby();

        // 返回按钮
        document.getElementById('games-play-close').onclick = () => this.backToLobby();
        document.getElementById('games-home-btn').onclick = () => { this.backToLobby(); switchScreen('home-screen'); };
    },

    open() {
        switchScreen(this.screen);
        document.getElementById('games-money').textContent = db.money || 0;
    },

    renderLobby() {
        const grid = document.getElementById('games-grid');
        grid.innerHTML = this.GAMES_LIST.map(g => `
            <div class="game-card" data-game="${g.id}">
                <span class="game-card-icon">${g.icon}</span>
                <span class="game-card-name">${g.name}</span>
                <span class="game-card-desc">${g.desc}</span>
                <span class="game-card-reward">🏆 ${g.reward}</span>
            </div>
        `).join('');
        grid.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', () => this.launchGame(card.dataset.game));
        });
    },

    launchGame(gameId) {
        this.currentGame = gameId;
        const playScreen = document.getElementById('games-play-screen');
        playScreen.classList.add('active');
        document.getElementById('games-over-overlay').classList.remove('visible');
        document.getElementById('games-extra-controls').innerHTML = '';

        const gameInfo = this.GAMES_LIST.find(g => g.id === gameId);
        document.getElementById('games-play-title').textContent = gameInfo.name;
        document.getElementById('games-play-score').textContent = '0';

        switch (gameId) {
            case 'g2048':  this.init2048(); break;
            case 'snake':  this.initSnake(); break;
            case 'flappy': this.initFlappy(); break;
            case 'slot':   this.initSlot(); break;
        }
    },

    backToLobby() {
        const playScreen = document.getElementById('games-play-screen');
        playScreen.classList.remove('active');
        document.getElementById('games-canvas-wrap').innerHTML = '';
        document.getElementById('games-extra-controls').innerHTML = '';
        if (this._cleanup) { this._cleanup(); this._cleanup = null; }
        this.currentGame = null;
    },

    updateScore(score) {
        document.getElementById('games-play-score').textContent = score;
    },

    async gameOver(score, coinReward) {
        // 更新最高分
        if (!this.bestScores[this.currentGame] || score > this.bestScores[this.currentGame]) {
            this.bestScores[this.currentGame] = score;
            db.gameBestScores = this.bestScores;
        }
        // 发放金币
        if (coinReward > 0) {
            db.money = (db.money || 0) + coinReward;
            await saveData();
            document.getElementById('games-money').textContent = db.money;
        }

        const box = document.getElementById('games-over-box');
        const isNewBest = score === this.bestScores[this.currentGame];
        box.innerHTML = `
            <div class="games-over-title">${isNewBest ? '🎉 新纪录！' : '游戏结束'}</div>
            <div class="games-over-score">得分 <span>${score}</span></div>
            <div class="games-over-best">最高记录: ${this.bestScores[this.currentGame]}</div>
            ${coinReward > 0 ? `<div class="games-over-coin">+${coinReward}</div>` : '<div style="margin-bottom:20px;color:rgba(255,255,255,0.4);font-size:13px;">分数太低，未获得金币</div>'}
            <div class="games-over-btns">
                <button class="games-play-close" id="game-over-back">返回</button>
                <button class="retry-btn" id="game-over-retry">再来一局</button>
            </div>`;
        document.getElementById('games-over-overlay').classList.add('visible');
        document.getElementById('game-over-back').onclick = () => this.backToLobby();
        document.getElementById('game-over-retry').onclick = () => this.launchGame(this.currentGame);
    },

    // ═══════════════════════════════════════
    //  🎮 2048
    // ═══════════════════════════════════════
    init2048() {
        const wrap = document.getElementById('games-canvas-wrap');
        const canvas = document.createElement('canvas');
        const SIZE = Math.min(wrap.clientWidth, wrap.clientHeight - 20, 400);
        canvas.width = SIZE; canvas.height = SIZE;
        wrap.innerHTML = ''; wrap.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        const CELL = SIZE / 4;
        const COLORS = {
            0:'#cdc1b4',2:'#eee4da',4:'#ede0c8',8:'#f2b179',16:'#f59563',
            32:'#f67c5f',64:'#f65e3b',128:'#edcf72',256:'#edcc61',
            512:'#edc850',1024:'#edc53f',2048:'#edc22e'
        };
        let grid, score, gameOverFlag, touchStartX, touchStartY;

        const initGame = () => {
            grid = Array.from({length:4}, () => Array(4).fill(0));
            score = 0; gameOverFlag = false;
            this.updateScore(0);
            addRandom(); addRandom();
            draw();
        };

        const addRandom = () => {
            const empty = [];
            for (let r=0;r<4;r++) for (let c=0;c<4;c++) if (!grid[r][c]) empty.push([r,c]);
            if (empty.length) { const [r,c] = empty[Math.floor(Math.random()*empty.length)]; grid[r][c] = Math.random()<0.9?2:4; }
        };

        const draw = () => {
            ctx.fillStyle = '#bbada0'; ctx.fillRect(0,0,SIZE,SIZE);
            for (let r=0;r<4;r++) for (let c=0;c<4;c++) {
                const v = grid[r][c];
                ctx.fillStyle = COLORS[v] || '#3c3a32';
                ctx.beginPath(); ctx.roundRect(c*CELL+4, r*CELL+4, CELL-8, CELL-8, 8); ctx.fill();
                if (v) {
                    ctx.fillStyle = v<=4 ? '#776e65' : '#f9f6f2';
                    ctx.font = `bold ${v>=1024?22:v>=128?26:30}px -apple-system,sans-serif`;
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText(v, c*CELL+CELL/2, r*CELL+CELL/2);
                }
            }
        };

        const slide = (row) => {
            let arr = row.filter(v=>v);
            for (let i=0;i<arr.length-1;i++) { if (arr[i]===arr[i+1]) { arr[i]*=2; score+=arr[i]; arr.splice(i+1,1); } }
            while (arr.length<4) arr.push(0);
            return arr;
        };

        const move = (dir) => {
            if (gameOverFlag) return;
            let moved = false;
            const oldGrid = grid.map(r=>[...r]);
            if (dir==='left')  for (let r=0;r<4;r++) grid[r]=slide(grid[r]);
            if (dir==='right') for (let r=0;r<4;r++) grid[r]=slide(grid[r].reverse()).reverse();
            if (dir==='up')    for (let c=0;c<4;c++) { let col=[grid[0][c],grid[1][c],grid[2][c],grid[3][c]]; col=slide(col); for(let r=0;r<4;r++) grid[r][c]=col[r]; }
            if (dir==='down')  for (let c=0;c<4;c++) { let col=[grid[3][c],grid[2][c],grid[1][c],grid[0][c]]; col=slide(col); for(let r=0;r<4;r++) grid[3-r][c]=col[r]; }
            for (let r=0;r<4;r++) for(let c=0;c<4;c++) if(grid[r][c]!==oldGrid[r][c]) { moved=true; break; }
            if (moved) { addRandom(); this.updateScore(score); draw(); checkGameOver(); }
        };

        const checkGameOver = () => {
            for (let r=0;r<4;r++) for(let c=0;c<4;c++) {
                if (!grid[r][c]) return;
                if (c<3 && grid[r][c]===grid[r][c+1]) return;
                if (r<3 && grid[r][c]===grid[r+1][c]) return;
            }
            gameOverFlag = true;
            const reward = Math.floor(score / 10);
            setTimeout(() => this.gameOver(score, reward), 500);
        };

        const onTouchStart = (e) => { e.preventDefault(); const t=e.touches[0]; touchStartX=t.clientX; touchStartY=t.clientY; };
        const onTouchMove = (e) => { e.preventDefault(); };
        const onTouchEnd = (e) => { e.preventDefault(); const t=e.changedTouches[0]; const dx=t.clientX-touchStartX; const dy=t.clientY-touchStartY; if (Math.abs(dx)<30 && Math.abs(dy)<30) return; if (Math.abs(dx)>Math.abs(dy)) move(dx>0?'right':'left'); else move(dy>0?'down':'up'); };
        const onKeyDown = (e) => {
            if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
                e.preventDefault();
                move({ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'}[e.key]);
            }
        };

        canvas.style.touchAction = 'none';
        canvas.addEventListener('touchstart', onTouchStart, {passive:false});
        canvas.addEventListener('touchmove', onTouchMove, {passive:false});
        canvas.addEventListener('touchend', onTouchEnd, {passive:false});
        document.addEventListener('keydown', onKeyDown);
        this._cleanup = () => {
            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchmove', onTouchMove);
            canvas.removeEventListener('touchend', onTouchEnd);
            document.removeEventListener('keydown', onKeyDown);
        };
        initGame();
    },

    // ═══════════════════════════════════════
    //  🐍 贪吃蛇
    // ═══════════════════════════════════════
    initSnake() {
        const wrap = document.getElementById('games-canvas-wrap');
        const canvas = document.createElement('canvas');
        const W = wrap.clientWidth || 360;
        const H = wrap.clientHeight || 360;
        const SIZE = Math.min(W, H - 20, 400);
        const GRID = 20, CELL = SIZE / GRID;
        canvas.width = SIZE; canvas.height = SIZE;
        wrap.innerHTML = ''; wrap.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        let snake, food, dir, nextDir, score, gameOverFlag, interval;

        const initGame = () => {
            snake = [{x:10,y:10},{x:9,y:10},{x:8,y:10}];
            dir = 'right'; nextDir = 'right'; score = 0; gameOverFlag = false;
            this.updateScore(0);
            placeFood();
            if (interval) clearInterval(interval);
            interval = setInterval(tick, 120);
        };

        const placeFood = () => {
            let pos;
            do { pos = {x:Math.floor(Math.random()*GRID), y:Math.floor(Math.random()*GRID)}; }
            while (snake.some(s => s.x===pos.x && s.y===pos.y));
            food = pos;
        };

        const tick = () => {
            if (gameOverFlag) return;
            dir = nextDir;
            const head = {...snake[0]};
            if (dir==='right') head.x++; if (dir==='left') head.x--;
            if (dir==='down') head.y++;  if (dir==='up') head.y--;
            if (head.x<0||head.x>=GRID||head.y<0||head.y>=GRID||snake.some(s=>s.x===head.x&&s.y===head.y)) {
                gameOverFlag = true; clearInterval(interval);
                const reward = Math.max(0, (snake.length - 3) * 2);
                setTimeout(() => this.gameOver(snake.length - 3, reward), 300);
                return;
            }
            snake.unshift(head);
            if (head.x===food.x && head.y===food.y) { score=snake.length-3; this.updateScore(score); placeFood(); }
            else snake.pop();
            draw();
        };

        const draw = () => {
            ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0,0,SIZE,SIZE);
            // 网格线
            ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            for (let i=0;i<=GRID;i++) { ctx.beginPath(); ctx.moveTo(i*CELL,0); ctx.lineTo(i*CELL,SIZE); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,i*CELL); ctx.lineTo(SIZE,i*CELL); ctx.stroke(); }
            // 食物
            ctx.fillStyle = '#ff6b6b'; ctx.beginPath();
            ctx.arc(food.x*CELL+CELL/2, food.y*CELL+CELL/2, CELL/2-2, 0, Math.PI*2); ctx.fill();
            // 蛇
            snake.forEach((s,i) => {
                ctx.fillStyle = i===0 ? '#4ecdc4' : '#45b7aa';
                ctx.beginPath(); ctx.roundRect(s.x*CELL+1, s.y*CELL+1, CELL-2, CELL-2, 4); ctx.fill();
            });
        };

        const setDir = (d) => {
            if (d==='up'&&dir!=='down') nextDir='up';
            if (d==='down'&&dir!=='up') nextDir='down';
            if (d==='left'&&dir!=='right') nextDir='left';
            if (d==='right'&&dir!=='left') nextDir='right';
        };

        let touchStartX, touchStartY;
        const onTouchStart = (e) => { e.preventDefault(); e.stopPropagation(); const t=e.touches[0]; touchStartX=t.clientX; touchStartY=t.clientY; };
        const onTouchMove = (e) => { e.preventDefault(); e.stopPropagation(); };
        const onTouchEnd = (e) => { e.preventDefault(); e.stopPropagation(); const t=e.changedTouches[0]; const dx=t.clientX-touchStartX; const dy=t.clientY-touchStartY; if (Math.abs(dx)<20 && Math.abs(dy)<20) return; if (Math.abs(dx)>Math.abs(dy)) setDir(dx>0?'right':'left'); else setDir(dy>0?'down':'up'); };
        const onKeyDown = (e) => {
            if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) { e.preventDefault(); setDir({ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}[e.key]); }
        };
        canvas.style.touchAction = 'none';
        canvas.addEventListener('touchstart', onTouchStart, {passive:false});
        canvas.addEventListener('touchmove', onTouchMove, {passive:false});
        canvas.addEventListener('touchend', onTouchEnd, {passive:false});
        document.addEventListener('keydown', onKeyDown);
        this._cleanup = () => {
            clearInterval(interval);
            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchmove', onTouchMove);
            canvas.removeEventListener('touchend', onTouchEnd);
            document.removeEventListener('keydown', onKeyDown);
        };
        initGame();
    },

    // ═══════════════════════════════════════
    //  🐦 像素鸟
    // ═══════════════════════════════════════
    initFlappy() {
        const wrap = document.getElementById('games-canvas-wrap');
        const canvas = document.createElement('canvas');
        const W = Math.min(wrap.clientWidth, 400);
        const H = Math.min(wrap.clientHeight - 20, 600);
        canvas.width = W; canvas.height = H;
        wrap.innerHTML = ''; wrap.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        let bird, pipes, score, gameOverFlag, frame, gravity, jump;

        const initGame = () => {
            bird = {x:80, y:H/2, vy:0, r:15};
            pipes = []; score = 0; gameOverFlag = false; frame = 0;
            gravity = 0.4; jump = -7;
            this.updateScore(0);
            requestAnimationFrame(loop);
        };

        const addPipe = () => {
            const gap = 140;
            const topH = 60 + Math.random() * (H - gap - 120);
            pipes.push({x:W, topH, bottomY:topH+gap, scored:false});
        };

        const loop = () => {
            if (gameOverFlag) return;
            frame++;
            // 物理
            bird.vy += gravity; bird.y += bird.vy;
            // 管道
            if (frame % 90 === 0) addPipe();
            pipes.forEach(p => p.x -= 2.5);
            pipes = pipes.filter(p => p.x > -60);
            // 得分
            pipes.forEach(p => { if (!p.scored && p.x + 30 < bird.x) { p.scored=true; score++; this.updateScore(score); } });
            // 碰撞
            if (bird.y > H - bird.r || bird.y < bird.r) { die(); return; }
            for (const p of pipes) {
                if (bird.x + bird.r > p.x && bird.x - bird.r < p.x + 50) {
                    if (bird.y - bird.r < p.topH || bird.y + bird.r > p.bottomY) { die(); return; }
                }
            }
            draw();
            requestAnimationFrame(loop);
        };

        const die = () => {
            gameOverFlag = true;
            const reward = Math.max(0, score * 5);
            setTimeout(() => this.gameOver(score, reward), 300);
        };

        const draw = () => {
            // 天空渐变
            const grad = ctx.createLinearGradient(0,0,0,H);
            grad.addColorStop(0,'#4dc9f6'); grad.addColorStop(1,'#1a1a2e');
            ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);
            // 管道
            ctx.fillStyle = '#4CAF50';
            pipes.forEach(p => {
                ctx.fillRect(p.x, 0, 50, p.topH);
                ctx.fillRect(p.x, p.bottomY, 50, H - p.bottomY);
                // 管道边缘
                ctx.fillStyle = '#388E3C';
                ctx.fillRect(p.x-3, p.topH-20, 56, 20);
                ctx.fillRect(p.x-3, p.bottomY, 56, 20);
                ctx.fillStyle = '#4CAF50';
            });
            // 鸟
            ctx.fillStyle = '#FFD700';
            ctx.beginPath(); ctx.arc(bird.x, bird.y, bird.r, 0, Math.PI*2); ctx.fill();
            // 眼睛
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(bird.x+5, bird.y-4, 5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#333';
            ctx.beginPath(); ctx.arc(bird.x+6, bird.y-4, 2.5, 0, Math.PI*2); ctx.fill();
            // 嘴
            ctx.fillStyle = '#FF6B35';
            ctx.beginPath(); ctx.moveTo(bird.x+bird.r, bird.y); ctx.lineTo(bird.x+bird.r+8, bird.y+3); ctx.lineTo(bird.x+bird.r, bird.y+6); ctx.fill();
        };

        const doJump = () => { if (!gameOverFlag) bird.vy = jump; };
        const onTouch = (e) => { e.preventDefault(); doJump(); };
        const onKeyDown = (e) => { if (e.key===' '||e.key==='ArrowUp') { e.preventDefault(); doJump(); } };

        canvas.style.touchAction = 'none';
        canvas.addEventListener('touchstart', onTouch, {passive:false});
        canvas.addEventListener('mousedown', doJump);
        document.addEventListener('keydown', onKeyDown);
        this._cleanup = () => {
            gameOverFlag = true;
            canvas.removeEventListener('touchstart', onTouch);
            canvas.removeEventListener('mousedown', doJump);
            document.removeEventListener('keydown', onKeyDown);
        };
        initGame();
    },

    // ═══════════════════════════════════════
    //  🎰 老虎机
    // ═══════════════════════════════════════
    initSlot() {
        const wrap = document.getElementById('games-canvas-wrap');
        const canvas = document.createElement('canvas');
        const SIZE = Math.min(wrap.clientWidth, 400);
        canvas.width = SIZE; canvas.height = SIZE * 0.6;
        wrap.innerHTML = ''; wrap.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        const SYMBOLS = ['🍒','🍋','🍊','🍇','⭐','💎','7️⃣'];
        const WEIGHTS = [30, 25, 20, 12, 8, 4, 1]; // 中奖权重
        const PAYOUTS = { '🍒':2, '🍋':3, '🍊':4, '🍇':6, '⭐':10, '💎':25, '7️⃣':77 };
        let reels = [0,0,0], spinning = false, currentBet = 50;

        // 控制按钮
        const controls = document.getElementById('games-extra-controls');
        controls.innerHTML = `
            <div class="slot-controls">
                <button class="slot-bet-btn" data-bet="10">💰 10</button>
                <button class="slot-bet-btn active" data-bet="50">💰 50</button>
                <button class="slot-bet-btn" data-bet="100">💰 100</button>
                <button class="slot-spin-btn" id="slot-spin">SPIN 🎰</button>
            </div>`;

        const weightedRandom = () => {
            const total = WEIGHTS.reduce((a,b)=>a+b,0);
            let r = Math.random() * total;
            for (let i=0;i<SYMBOLS.length;i++) { r -= WEIGHTS[i]; if (r<=0) return i; }
            return 0;
        };

        const drawReels = () => {
            const W = canvas.width, H = canvas.height;
            ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0,0,W,H);
            // 背景框
            ctx.fillStyle = '#16213e'; ctx.roundRect(10,10,W-20,H-20,16); ctx.fill();
            // 分隔线
            const reelW = (W-40)/3;
            for (let i=1;i<3;i++) {
                ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(10+i*reelW+10,20); ctx.lineTo(10+i*reelW+10,H-20); ctx.stroke();
            }
            // 符号
            ctx.font = `${reelW*0.5}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            for (let i=0;i<3;i++) {
                ctx.fillStyle = '#fff';
                ctx.fillText(SYMBOLS[reels[i]], 10+reelW*i+reelW/2+10, H/2);
            }
            // 赔率表
            ctx.font = '10px -apple-system,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.3)';
            const payline = Object.entries(PAYOUTS).map(([s,v])=>`${s}×${v}`).join('  ');
            ctx.fillText(payline, W/2, H-6);
        };

        const spin = async () => {
            if (spinning) return;
            const money = db.money || 0;
            if (money < currentBet) { showToast('金币不足！'); return; }
            spinning = true;
            document.getElementById('slot-spin').disabled = true;

            // 扣费
            db.money -= currentBet;
            await saveData();
            document.getElementById('games-money').textContent = db.money;
            this.updateScore(`-${currentBet}`);

            // 转动动画
            let spins = 0;
            const spinInterval = setInterval(() => {
                reels = [weightedRandom(), weightedRandom(), weightedRandom()];
                drawReels();
                spins++;
                if (spins > 15) {
                    clearInterval(spinInterval);
                    // 最终结果
                    reels = [weightedRandom(), weightedRandom(), weightedRandom()];
                    drawReels();
                    checkWin();
                }
            }, 80);
        };

        const checkWin = async () => {
            const [a,b,c] = reels.map(i => SYMBOLS[i]);
            let win = 0;
            if (a===b && b===c) {
                win = currentBet * (PAYOUTS[a] || 2);
            } else if (a===b || b===c || a===c) {
                const match = a===b ? a : c;
                win = currentBet * Math.max(1, Math.floor((PAYOUTS[match]||2) / 3));
            }
            if (win > 0) {
                db.money = (db.money || 0) + win;
                await saveData();
                document.getElementById('games-money').textContent = db.money;
                this.updateScore(`+${win}`);
                showToast(`🎉 赢了 ${win} 金币！`);
            } else {
                this.updateScore('未中奖');
            }
            spinning = false;
            document.getElementById('slot-spin').disabled = false;
        };

        // 绑定事件
        controls.querySelectorAll('.slot-bet-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentBet = parseInt(btn.dataset.bet);
                controls.querySelectorAll('.slot-bet-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        document.getElementById('slot-spin').addEventListener('click', spin);

        this._cleanup = () => { spinning = false; };
        drawReels();
    }
});

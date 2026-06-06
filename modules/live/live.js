/* ========================================
   Module: Live (直播) — 抖音风格 | v2 inline
   ======================================== */

Engine.register({
  id: 'live', name: '直播', icon: '📺', screen: 'live-screen', order: 2,

  LEVELS: [
    { id:1, label:'普通闲聊', desc:'轻松聊天互动', color:'#4CAF50' },
    { id:2, label:'才艺展示', desc:'唱歌/跳舞/表演', color:'#2196F3' },
    { id:3, label:'户外挑战', desc:'刺激有趣的挑战', color:'#FF9800' },
    { id:4, label:'福利姬', desc:'性感撩人视觉盛宴', color:'#9C27B0' },
    { id:5, label:'双人行', desc:'亲密互动双人时光', color:'#E91E63' },
  ],
  LEVEL_MULTIPLIER: { 1:1.0, 2:1.2, 3:1.3, 4:1.4, 5:1.5 },

  SCENE_CATEGORIES: [
    { label:'🏠 室内', scenes:[
      {id:'bedroom',label:'🛏️ 卧室'},{id:'bathroom',label:'🛁 浴室'},
      {id:'living',label:'🛋️ 客厅'},{id:'kitchen',label:'🍳 厨房'},
      {id:'studio',label:'🎬 舞蹈室'},{id:'dressing',label:'👗 更衣室'},
      {id:'gym',label:'🏋️ 健身房'},{id:'spa',label:'💆 SPA'},
    ]},
    { label:'🌿 户外', scenes:[
      {id:'pool',label:'🏊 泳池'},{id:'beach',label:'🏖️ 海滩'},
      {id:'garden',label:'🌺 花园'},{id:'rooftop',label:'🌇 天台'},
      {id:'camp',label:'🏕️ 露营'},{id:'street',label:'📸 街拍'},
    ]},
    { label:'🚗 特殊场景', scenes:[
      {id:'car',label:'🚗 车内'},{id:'office',label:'💼 办公室'},
      {id:'hotel',label:'🏨 酒店'},{id:'elevator',label:'🛗 电梯'},
      {id:'fitting',label:'🪞 试衣间'},{id:'cinema',label:'🎬 影院'},
    ]},
    { label:'🏰 幻想', scenes:[
      {id:'castle',label:'🏰 城堡'},{id:'forest',label:'🌲 森林'},
      {id:'ancient',label:'🏯 古风阁楼'},{id:'space',label:'🚀 太空舱'},
      {id:'fantasy',label:'✨ 异世界'},
    ]},
  ],
  AVATAR_POOL: [
    'https://i.postimg.cc/Y96LPskq/o-o-2.jpg',
    'https://i.postimg.cc/GtbTnhxP/o-o-1.jpg',
    'https://i.postimg.cc/fTLCngk1/image.jpg',
  ],

  state: { level:null, scene:null, props:[] },
  step: 0,       // 0=等级 1=场景 2=道具
  tab: 'self',   // 'self' | 'hosts'
  host: null,
  isStreaming: false,
  likes: 0, tips: 0,
  stats: null,
  _vi: null,

  init(){
    var s = document.getElementById(this.screen);
    s.innerHTML =
      '<div class="live-overlay" id="lvo">'+
        '<div class="live-wizard">'+
          '<div class="live-host-tabs">'+
            '<button class="live-host-tab active" data-tab="self" onclick="Engine._lv.switchTab(\'self\')">🙋 自己开播</button>'+
            '<button class="live-host-tab" data-tab="hosts" onclick="Engine._lv.switchTab(\'hosts\')">🎤 主播列表</button>'+
          '</div>'+
          '<div id="lvc"></div>'+
        '</div>'+
      '</div>'+
      '<div class="live-stream" id="lvs">'+
        '<div class="live-bg" id="lvb"></div>'+
        '<div class="live-top-bar">'+
          '<div class="live-avatar" id="lva">👩</div>'+
          '<div class="live-host-info"><div class="live-host-name-text" id="lvn">直播中</div><div class="live-host-tags" id="lvt"></div></div>'+
          '<div class="live-stat"><div class="live-dot"></div><span id="lvv">0</span></div>'+
          '<button class="live-close-btn" onclick="Engine._lv.end()">结束</button>'+
        '</div>'+
        '<div class="live-danmaku-wrap"><div class="live-danmaku-list" id="lvl"></div></div>'+
        '<div class="live-side-btns">'+
          '<button class="live-side-btn" onclick="Engine._lv.like()">❤️<span class="count" id="lvc2">0</span></button>'+
          '<button class="live-side-btn" onclick="Engine._lv.showTip()">🎁</button>'+
          '<button class="live-side-btn" onclick="Engine._lv.share()">📤</button>'+
          '<button class="live-side-btn" onclick="Engine._lv.genBg()">🎨</button>'+
        '</div>'+
        '<div class="live-input-bar"><input type="text" id="lvi" placeholder="说点什么..." onkeydown="if(event.key===\'Enter\')Engine._lv.send()"><button class="live-send-btn" onclick="Engine._lv.send()">发送</button></div>'+
        '<div class="live-gift-overlay" id="lvg"></div>'+
        '<button class="live-bg-toggle-btn tucked" id="lvbg" onclick="Engine._lv.toggleBg()">👁️</button>'+
      '</div>'+
      '<div class="live-settle-overlay" id="lvso"><div class="live-settle-box" id="lvsb"></div></div>';
    Engine._lv = this;
  },

  open(){ switchScreen(this.screen); if(this.isStreaming) return; this._reset(); this._show(); },

  _reset(){
    this.step=0; this.tab='self'; this.host=null; this.state={level:null,scene:null,props:[]};
    this._selTab('self');
  },

  _selTab(t){
    this.tab=t;
    var tabs=document.querySelectorAll('#lvc').length?document.querySelectorAll('.live-host-tab'):[];
    tabs.forEach(function(b){b.classList.toggle('active',b.dataset.tab===t);});
  },

  _show(){ document.getElementById('lvo').classList.add('visible'); this._render(); },

  _render(){
    var b=document.getElementById('lvc');
    if(this.step===0) this._lev(b);
    else if(this.step===1) this._scn(b);
    else if(this.step===2) this._prp(b);
  },

  /* ─── 等级（直接操作DOM）─── */
  _lev(b){
    var selId=this.state.level?this.state.level.id:-1;
    b.innerHTML=
      '<div class="live-wizard-header"><div class="live-wizard-title">选择直播等级</div><div class="live-wizard-step">'+(this.tab==='hosts'?'1/4':'1/3')+'</div></div>'+
      '<div class="live-wizard-body"><div class="live-level-grid">'+
        this.LEVELS.map(function(l){
          return '<div class="live-level-card'+(selId===l.id?' selected':'')+'" onclick="Engine._lv._pickLev('+l.id+',this)">'+
            '<div class="live-level-dot" style="background:'+l.color+'"></div>'+
            '<div class="live-level-info"><div class="live-level-name">'+l.label+'</div><div class="live-level-desc">'+l.desc+'</div></div></div>';
        }).join('')+
      '</div></div>'+
      '<div class="live-wizard-footer"><button class="live-wiz-btn-back" onclick="document.getElementById(\'lvo\').classList.remove(\'visible\')">取消</button><button class="live-wiz-btn-next" onclick="Engine._lv._goLev()">下一步</button></div>';
  },
  _pickLev(id,el){
    document.querySelectorAll('#lvc .live-level-card').forEach(function(c){c.classList.remove('selected');});
    el.classList.add('selected');
    this.state.level=this.LEVELS.find(function(l){return l.id===id;});
  },
  _goLev(){ if(!this.state.level)return; this.step=1; this._render(); },

  /* ─── 场景（直接操作DOM，防多选）─── */
  _scn(b){
    var selId=this.state.scene?this.state.scene.id:'';
    b.innerHTML=
      '<div class="live-wizard-header"><div class="live-wizard-title">选择场景（单选）</div><div class="live-wizard-step">'+(this.tab==='hosts'?'2/4':'2/3')+'</div></div>'+
      '<div class="live-wizard-body">'+
        this.SCENE_CATEGORIES.map(function(cat){
          return '<details class="live-scene-category"><summary>'+cat.label+'</summary><div class="live-scene-grid">'+
            cat.scenes.map(function(s){
              return '<div class="live-scene-item'+(selId===s.id?' selected':'')+'" onclick="Engine._lv._pickScn(\''+s.id+'\',this)">'+s.label+'</div>';
            }).join('')+'</div></details>';
        }).join('')+
      '</div>'+
      '<div class="live-wizard-footer"><button class="live-wiz-btn-back" onclick="Engine._lv._back()">返回</button><button class="live-wiz-btn-next" onclick="Engine._lv._goScn()">下一步</button></div>';
  },
  _pickScn(id,el){
    // 单选：清除所有选中 → 标记当前
    document.querySelectorAll('#lvc .live-scene-item').forEach(function(c){c.classList.remove('selected');});
    el.classList.add('selected');
    for(var i=0;i<this.SCENE_CATEGORIES.length;i++){
      var cat=this.SCENE_CATEGORIES[i];
      for(var j=0;j<cat.scenes.length;j++){
        if(cat.scenes[j].id===id){ this.state.scene=cat.scenes[j]; return; }
      }
    }
  },
  _goScn(){ if(!this.state.scene)return; this.step=2; this._render(); },

  /* ─── 道具（多选，直接操作DOM，联动商店已拥有）─── */
  _prp(b){
    if(this.tab==='hosts'&&!this.host){ this._hostPkr(b); return; }
    var shop=Engine.getModule('shop');
    var items=shop?shop.getOwnedProps():[];
    var stepTxt=this.tab==='hosts'?'4/4':'3/3';
    b.innerHTML=
      '<div class="live-wizard-header"><div class="live-wizard-title">选择道具（多选）</div><div class="live-wizard-step">'+stepTxt+'</div></div>'+
      '<div class="live-wizard-body">'+
        (items.length===0?'<div style="text-align:center;color:#999;padding:30px 0;">暂无可选道具<br><small>需要先在商店购买道具</small></div>':
          '<div class="live-prop-grid">'+items.map(function(p){
            var n=p.label.replace(/^(\p{Emoji_Presentation}|\p{Emoji}️?)/u,'')||p.label;
            var s=(this.state.props||[]).indexOf(p.id)>=0;
            return '<div class="live-prop-item'+(s?' selected':'')+'" onclick="Engine._lv._tglProp(\''+p.id+'\',this)">'+n+'</div>';
          },this).join('')+'</div>')+
      '</div>'+
      '<div class="live-wizard-footer"><button class="live-wiz-btn-back" onclick="Engine._lv._back()">返回</button><button class="live-wiz-btn-skip" onclick="Engine._lv.start()">跳过</button><button class="live-wiz-btn-next" onclick="Engine._lv.start()">开始直播</button></div>';
  },
  _tglProp(id,el){
    this.state.props=this.state.props||[];
    var i=this.state.props.indexOf(id);
    if(i>=0){ this.state.props.splice(i,1); el.classList.remove('selected'); }
    else{ this.state.props.push(id); el.classList.add('selected'); }
  },

  /* ─── 主播选择 ─── */
  _hostPkr(b){
    var h=this;
    var chars=db.characters||[];
    b.innerHTML=
      '<div class="live-wizard-header"><div class="live-wizard-title">选择要观看的主播</div><div class="live-wizard-step">3/4</div></div>'+
      '<div class="live-wizard-body">'+
        (chars.length===0?'<div class="live-host-empty">暂无角色，请先创建QQ联系人</div>':
          '<div class="live-host-grid">'+chars.map(function(c){
            var s=h.host&&h.host.id===c.id;
            return '<div class="live-host-card'+(s?' selected':'')+'" onclick="Engine._lv._pickHost(\''+c.id+'\',this)">'+
              '<img src="'+h._esc(c.avatar||'')+'" class="live-host-avatar" onerror="this.outerHTML=\'<div class=live-host-avatar style=background:#eee;border-radius:50%;width:48px;height:48px;margin:0 auto 6px;display:flex;align-items:center;justify-content:center;font-size:24px;>👤</div>\'">'+
              '<div class="live-host-name">'+h._esc(c.remarkName||c.realName||'?')+'</div></div>';
          }).join('')+'</div>')+
      '</div>'+
      '<div class="live-wizard-footer"><button class="live-wiz-btn-back" onclick="Engine._lv._back()">返回</button><button class="live-wiz-btn-next" onclick="Engine._lv._goHost()">下一步（选道具）</button></div>';
  },
  _pickHost(id,el){
    document.querySelectorAll('#lvc .live-host-card').forEach(function(c){c.classList.remove('selected');});
    el.classList.add('selected');
    this.host=(db.characters||[]).find(function(c){return c.id===id;});
  },
  _goHost(){ if(!this.host)return; this.step=2; this._render(); },

  _back(){ if(this.step>0){this.step--;this._render();} },
  _esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); },

  /* ─── Tab切换 ─── */
  switchTab(t){
    if(t===this.tab)return;
    this.tab=t; this.host=null; this.step=0; this.state={level:null,scene:null,props:[]};
    this._selTab(t); this._render();
  },

  /* ══════════════════════════════════════
     直播主流程
     ══════════════════════════════════════ */

  async start(){
    document.getElementById('lvo').classList.remove('visible');
    var page=document.getElementById('lvs'); page.classList.add('active');
    this.isStreaming=true; this.likes=0; this.tips=0;
    this.stats={start:Date.now(),peak:0,total:0,samples:0,dms:0,story:0,totalTips:0};

    /* UI 头部 */
    var av=document.getElementById('lva');
    if(this.host){av.textContent='';av.style.backgroundImage='url('+this.host.avatar+')';}
    else{av.textContent='👩';av.style.backgroundImage='';}
    var lv=this.state.level, sc=this.state.scene;
    document.getElementById('lvn').textContent=(this.host?(this.host.remarkName||this.host.realName)+' · ':'')+lv.label+' · '+sc.label;

    var tags=document.getElementById('lvt');
    tags.innerHTML='<span class="live-tag hot">🔥 直播中</span>';
    var shop=Engine.getModule('shop');
    if(shop&&this.state.props.length>0){
      var all=shop.getAllItems();
      this.state.props.slice(0,3).forEach(function(pid){
        var p=all.find(function(d){return d.id===pid;});
        if(p) tags.innerHTML+='<span class="live-tag">'+p.label.replace(/^(\p{Emoji_Presentation}|\p{Emoji}️?)/u,'')+'</span>';
      });
    }

    document.getElementById('lvl').innerHTML='';
    document.getElementById('lvc2').textContent='0';
    document.getElementById('lvv').textContent='0';
    page.classList.remove('bg-only');
    document.getElementById('lvb').style.backgroundImage='';

    /* 观众人数 */
    var h=this;
    var viewers=Math.floor(Math.random()*50)+10;
    h.stats.peak=viewers;
    h._vi=setInterval(function(){
      viewers+=Math.floor(Math.random()*10)-3;
      if(viewers<5)viewers=5;
      document.getElementById('lvv').textContent=viewers;
      if(viewers>h.stats.peak)h.stats.peak=viewers;
      h.stats.total+=viewers; h.stats.samples++;
    },3000);

    await this.gen();
  },

  /* ─── AI生成 ─── */
  async gen(uin){
    this.stats.story++;
    var lv=this.state.level, sc=this.state.scene;
    var ls=lv.id>=4?'无限制，可直白露骨。':lv.id>=3?'可暗示和挑逗。':'轻松健康。';
    var hi=this.host?'\n主播：'+this.host.realName+'，人设：'+this.host.persona:'';
    this._msg('story','✨ 生成中...','_loading');

    var sys='你是成人向直播内容生成器。虚构内容，成年人。等级：'+lv.label+' 场景：'+sc.label+hi+' 尺度：'+ls+'\n返回JSON数组，每个元素{"type":"类型","text":"内容"}。type: story(剧情粉),danmaku(弹幕白),tip(打赏金),gift(礼物金加粗),follow(关注绿)。6-12条混合。danmaku的text用"昵称: 内容"格式。先推进剧情再混合弹幕。只返回JSON数组。';
    var msg=uin?'观众弹幕："'+uin+'"，推进剧情。':'直播刚开始，生成开场内容。';

    try{
      var full=await Engine.services.aiChat({system:sys,messages:[{role:'user',content:msg}],options:{temperature:0.95,maxTokens:2000}});
      this._renderJson(full);
    }catch(e){ this._msg('story','⚠️ '+e.message); }
  },

  _renderJson(text){
    var l=document.getElementById('lvl');
    var ld=l.querySelector('._loading'); if(ld)ld.remove();
    try{
      var data=JSON.parse(text);
      if(!Array.isArray(data))throw'!array';
      var h=this;
      data.forEach(function(d){
        if(d.type==='danmaku'){
          var p=d.text.split(/[：:]/); var u=p.length>1?p[0].trim():'观众'; var c=p.length>1?p.slice(1).join('：').trim():d.text;
          h._msg('danmaku',c,u);
        }else{ h._msg(d.type,d.text); }
      });
    }catch(e){
      this._msg('story',text);
    }
    this._scroll();
  },

  /* ─── 消息 ─── */
  _msg(type,text,cls){
    if(!text)return;
    var l=document.getElementById('lvl');
    var d=document.createElement('div');
    d.className='live-msg live-msg-'+type+(cls?' '+cls:'');
    if(type==='gift'){ d.textContent='🎁 '+text; this._gfx(text); }
    else if(type==='tip') d.textContent='🪙 '+text;
    else if(type==='follow') d.textContent='➕ '+text;
    else if(type==='danmaku') d.innerHTML='<span style="color:#ff80ab;font-weight:600;">'+this._esc(text)+'：</span>'+this._esc(cls||'');
    else d.textContent='📖 '+text;
    l.appendChild(d);
    this._scroll();
    while(l.children.length>60) l.removeChild(l.firstChild);
  },

  _scroll(){ requestAnimationFrame(function(){var l=document.getElementById('lvl');if(l)l.scrollTop=l.scrollHeight;}); },

  /* ─── 礼物动画 ─── */
  _gfx(text){
    var ov=document.getElementById('lvg');
    var b=document.createElement('div');
    b.className='live-gift-banner'; b.textContent='🚀 '+text;
    ov.appendChild(b); setTimeout(function(){b.remove();},3000);
    var e=['🎉','❤️','🔥','💎','🌟','✨','🎊','💖'];
    for(var i=0;i<12;i++){
      var em=document.createElement('div'); em.className='live-gift-emoji';
      em.textContent=e[Math.floor(Math.random()*e.length)];
      em.style.left=(10+Math.random()*80)+'%'; em.style.bottom='30%';
      em.style.fontSize=(18+Math.random()*20)+'px'; em.style.animationDelay=Math.random()*0.5+'s';
      ov.appendChild(em); setTimeout(function(){em.remove();},3000);
    }
  },

  /* ─── 右侧按钮 ─── */
  like(){
    this.likes++; document.getElementById('lvc2').textContent=this.likes;
    var el=document.createElement('div'); el.className='live-like-heart'; el.textContent='❤️';
    var btn=document.getElementById('lvc2').parentElement;
    var r=btn.getBoundingClientRect();
    el.style.left=(r.left+r.width/2-12)+'px'; el.style.bottom=(window.innerHeight-r.top+10)+'px';
    document.body.appendChild(el); setTimeout(function(){el.remove();},1500);
    if(this.likes%10===0) this.gen(); // 每10次点赞自动生成新内容
  },

  showTip(){
    var ov=document.getElementById('lvso');
    var b=document.getElementById('lvsb');
    b.innerHTML=
      '<div class="live-settle-title">🎁 打赏主播</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0;">'+
        [10,50,100,500].map(function(a){return '<button style="padding:12px;border:2px solid rgba(255,255,255,0.15);border-radius:10px;background:rgba(255,255,255,0.05);color:#FFD700;font-size:16px;font-weight:700;cursor:pointer;" onclick="document.getElementById(\'_tipAmt\').value='+a+'">'+a+' 🪙</button>';}).join('')+
      '</div>'+
      '<div style="margin-bottom:12px;"><input type="number" id="_tipAmt" placeholder="自定义金额" min="1" style="width:100%;padding:10px;border:1px solid rgba(255,255,255,0.15);border-radius:8px;background:rgba(255,255,255,0.05);color:#fff;text-align:center;outline:none;box-sizing:border-box;"></div>'+
      '<div style="color:rgba(255,255,255,0.5);font-size:12px;margin-bottom:14px;">🪙 余额: '+(db.money||0)+'</div>'+
      '<div style="display:flex;gap:10px;">'+
        '<button style="flex:1;background:#555;color:#fff;padding:14px;border:none;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer;" onclick="document.getElementById(\'lvso\').classList.remove(\'visible\')">取消</button>'+
        '<button style="flex:1;background:linear-gradient(135deg,#FFD700,#FFA500);color:#1a1a2e;padding:14px;border:none;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer;" onclick="Engine._lv._doTip()">打赏</button>'+
      '</div>';
    ov.classList.add('visible');
  },
  _doTip(){
    var amt=parseInt(document.getElementById('_tipAmt').value)||0;
    if(amt<=0)return;
    if(amt>(db.money||0)){showToast('余额不足');return;}
    db.money-=amt; this.tips+=amt; this.stats.totalTips+=amt;
    saveData();
    document.getElementById('lvso').classList.remove('visible');
    this._msg('tip','打赏了 '+amt+' 🪙','我');
    if(amt>=100)this.gen();
  },

  share(){
    var ln=this.state.level, sc=this.state.scene;
    var hn=this.host?(this.host.remarkName||this.host.realName):'我';
    var txt='📺 直播分享：'+hn+' · '+ln.label+' · '+sc.label+'\n快来直播间看看吧！';
    navigator.clipboard.writeText(txt).then(function(){showToast('✅ 已复制')}).catch(function(){showToast('复制失败')});
  },

  async genBg(){
    var lv=this.state.level, sc=this.state.scene;
    var hd=this.host?', '+(this.host.remarkName||this.host.realName)+', '+(this.host.persona||''):'';
    try{
      var url=await Engine.services.aiGenerateImage('live streaming background, '+sc.label+', '+lv.label+', anime style, cinematic lighting, high quality'+hd,{imageSize:'768x1024'});
      document.getElementById('lvb').style.backgroundImage='url('+url+')';
      showToast('🎨 背景已更新');
    }catch(e){showToast('背景生成失败: '+e.message);}
  },

  toggleBg(){ document.getElementById('lvs').classList.toggle('bg-only'); },

  send(){
    var inp=document.getElementById('lvi');
    var txt=inp.value.trim(); if(!txt)return;
    this._msg('danmaku',txt,'我'); inp.value=''; this.stats.dms++;
    this.gen(txt);
  },

  /* ─── 结束 ─── */
  end(){
    if(!confirm('确定结束直播吗？'))return;
    this.isStreaming=false; clearInterval(this._vi);
    var dur=Math.floor((Date.now()-this.stats.start)/1000);
    var avg=this.stats.samples>0?Math.round(this.stats.total/this.stats.samples):0;
    var coins=Math.floor((this.stats.story*10+this.stats.dms*2+this.tips)*(this.LEVEL_MULTIPLIER[this.state.level.id]||1));
    db.money=(db.money||0)+coins; saveData();

    var b=document.getElementById('lvsb');
    b.innerHTML=
      '<div class="live-settle-title">🎉 直播结束</div><div class="live-settle-sub">精彩！</div>'+
      '<div class="live-settle-coin">+'+coins+' 🪙</div>'+
      '<div class="live-settle-stats">'+
        '<div class="live-settle-stat"><div class="live-settle-stat-val">'+this._fmtTime(dur)+'</div><div class="live-settle-stat-lbl">时长</div></div>'+
        '<div class="live-settle-stat"><div class="live-settle-stat-val">'+avg+'</div><div class="live-settle-stat-lbl">均观众</div></div>'+
        '<div class="live-settle-stat"><div class="live-settle-stat-val">'+this.stats.peak+'</div><div class="live-settle-stat-lbl">峰值</div></div>'+
        '<div class="live-settle-stat"><div class="live-settle-stat-val">'+this.likes+'</div><div class="live-settle-stat-lbl">点赞</div></div>'+
      '</div>'+
      '<button class="live-settle-btn" onclick="document.getElementById(\'lvso\').classList.remove(\'visible\');document.getElementById(\'lvs\').classList.remove(\'active\');switchScreen(\'home-screen\')">太棒了！</button>';
    document.getElementById('lvso').classList.add('visible');
  },
  _fmtTime(s){var m=Math.floor(s/60);var x=s%60;return m>0?m+'分'+x+'秒':x+'秒';},

});

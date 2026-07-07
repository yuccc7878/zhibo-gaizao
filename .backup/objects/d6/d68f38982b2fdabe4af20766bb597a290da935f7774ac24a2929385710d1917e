import base64, sys

content = """/* ========================================
   ChatList - 聊天列表模块（Tab + 左滑 + 向导 + 选择器）
   ======================================== */

import { state } from '../core/state.js';
import { getDb, saveData } from '../core/dataService.js';
import { showToast, compressImage } from '../core/utils.js';
import { createGroupChat } from '../systems/group.js';

let dom = null;
let _openChatRoom = null;
let _swipedCard = null;
let _wizardData = {};
let _pickerMode = 'single';
let _pickerResolve = null;
let _pendingGroupMemberIds = [];

function escHtml(s) {
  return String(s || '').replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"');
}

export function init(_dom, openChatRoom) {
  dom = _dom;
  _openChatRoom = openChatRoom;
  bindTabEvents();
  bindNewCardEvents();
  bindWizardEvents();
  bindPickerEvents();
  bindGroupCreateEvents();
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.swipe-card__inner') && !e.target.closest('.swipe-card__action-btn')) {
      closeSwipeCard();
    }
  });
}

function bindTabEvents() {
  var bar = dom['chat-tab-bar'];
  if (!bar) return;
  bar.querySelectorAll('.tab-btn').forEach(function(b) {
    b.addEventListener('click', function() { setActiveTab(b.dataset.tab); });
  });
}

function setActiveTab(name) {
  closeSwipeCard();
  var bar = dom['chat-tab-bar'];
  if (bar) {
    bar.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    var a = bar.querySelector('.tab-btn[data-tab="' + name + '"]');
    if (a) a.classList.add('active');
  }
  document.querySelectorAll('#chat-list-screen .tab-panel').forEach(function(p) { p.classList.remove('active'); });
  var p = document.querySelector('#chat-list-screen .tab-panel[data-tab="' + name + '"]');
  if (p) p.classList.add('active');
  var t = { contacts:'联系人', private:'私聊', group:'群聊' };
  if (dom['chat-list-title']) dom['chat-list-title'].textContent = t[name] || '聊天';
}

function bindNewCardEvents() {
  var nc = dom['new-contact-card'];
  if (nc) nc.addEventListener('click', function() { openContactWizard(); });
  var np = dom['new-private-card'];
  if (np) np.addEventListener('click', function() { openContactPicker('single'); });
  var ng = dom['new-group-card'];
  if (ng) ng.addEventListener('click', function() { openContactPicker('multi'); });
}

function renderContactsList() {
  var db = getDb(), c = dom['contacts-list-container'], e = dom['contacts-empty'];
  if (!c) return;
  c.innerHTML = '';
  var chars = db.characters || [];
  if (!chars.length) { if (e) e.style.display = 'block'; return; }
  if (e) e.style.display = 'none';
  chars.forEach(function(ch) {
    c.appendChild(createSwipeCard(ch.id, 'contact', ch.avatar, ch.remarkName||ch.realName, '', ch.isPinned, null));
  });
}

function renderPrivateList() {
  var db = getDb(), c = dom['private-list-container'], e = dom['private-empty'];
  if (!c) return;
  c.innerHTML = '';
  var chars = db.characters || [];
  if (!chars.length) { if (e) e.style.display = 'block'; return; }
  if (e) e.style.display = 'none';
  [].concat(chars).sort(function(a, b) {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    var al = a.history && a.history.length ? a.history[a.history.length-1].timestamp : 0;
    var bl = b.history && b.history.length ? b.history[b.history.length-1].timestamp : 0;
    return bl - al;
  }).forEach(function(ch) {
    var h = ch.history || [], last = h.length ? h[h.length-1] : null, sub = '';
    if (last) {
      sub = last.content.replace(/\[.*?\]/g,'').trim().substring(0,30);
      if (!sub) sub = '消息';
    }
    c.appendChild(createSwipeCard(ch.id, 'private', ch.avatar, ch.remarkName||ch.realName||'未知', sub, ch.isPinned, function(id) { if (_openChatRoom) _openChatRoom(id, 'private'); }));
  });
}

function renderGroupList() {
  var db = getDb(), c = dom['group-list-container'], e = dom['group-empty'];
  if (!c) return;
  c.innerHTML = '';
  var groups = db.groups || [];
  if (!groups.length) { if (e) e.style.display = 'block'; return; }
  if (e) e.style.display = 'none';
  [].concat(groups).sort(function(a, b) {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    var al = a.history && a.history.length ? a.history[a.history.length-1].timestamp : 0;
    var bl = b.history && b.history.length ? b.history[b.history.length-1].timestamp : 0;
    return bl - al;
  }).forEach(function(g) {
    var h = g.history || [], last = h.length ? h[h.length-1] : null;
    var sub = (g.members||[]).length + ' 人';
    if (last) {
      var t = last.content.replace(/\[.*?\]/g,'').trim().substring(0,25);
      sub += ' · ' + (t || '[消息]');
    }
    c.appendChild(createSwipeCard(g.id, 'group', g.avatar, g.name||'未命名群聊', sub, g.isPinned, function(id) { if (_openChatRoom) _openChatRoom(id, 'group'); }));
  });
}

function createSwipeCard(id, type, avatar, name, subtitle, isPinned, onClick) {
  var wrap = document.createElement('div');
  wrap.className = 'swipe-card';
  wrap.dataset.cardId = id;
  wrap.dataset.cardType = type;
  var acts = document.createElement('div');
  acts.className = 'swipe-card__actions';
  if (type === 'contact') {
    var dd = document.createElement('button');
    dd.className = 'swipe-card__action-btn action-delete';
    dd.textContent = '删除'; dd.dataset.action = 'delete';
    acts.appendChild(dd);
  } else {
    var pb = document.createElement('button');
    pb.className = 'swipe-card__action-btn action-pin';
    pb.textContent = isPinned ? '取消置顶' : '置顶';
    pb.dataset.action = 'pin';
    acts.appendChild(pb);
    var dd2 = document.createElement('button');
    dd2.className = 'swipe-card__action-btn action-delete';
    dd2.textContent = '删除'; dd2.dataset.action = 'delete';
    acts.appendChild(dd2);
  }
  wrap.appendChild(acts);
  var outer = document.createElement('div');
  outer.className = 'swipe-card__wrapper';
  var inner = document.createElement('div');
  inner.className = 'swipe-card__inner';
  inner.dataset.id = id;
  inner.dataset.type = type;
  var ac = type === 'group' ? 'chat-avatar group-avatar' : 'chat-avatar';
  var img = document.createElement('img');
  img.src = avatar; img.alt = name; img.className = ac;
  img.onerror = function() {
    this.outerHTML = '<div class="chat-avatar" style="background:#eee;border-radius:50%;width:50px;height:50px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">\U0001f464</div>';
  };
  inner.appendChild(img);
  var det = document.createElement('div');
  det.className = 'item-details';
  var nr = document.createElement('div');
  nr.className = 'item-details-row';
  var ne = document.createElement('div');
  ne.className = 'item-name'; ne.textContent = name;
  nr.appendChild(ne); det.appendChild(nr);
  var pw = document.createElement('div');
  pw.className = 'item-preview-wrapper';
  if (subtitle) {
    var pv = document.createElement('div');
    pv.className = 'item-preview'; pv.textContent = subtitle;
    pw.appendChild(pv);
  }
  if (isPinned) {
    var badge = document.createElement('span');
    badge.className = 'pin-badge'; badge.textContent = '置顶';
    pw.appendChild(badge);
  }
  if (pw.children.length) det.appendChild(pw);
  inner.appendChild(det);
  outer.appendChild(inner);
  wrap.appendChild(outer);
  inner.addEventListener('click', function() {
    if (_swipedCard === wrap) { closeSwipeCard(); return; }
    if (_swipedCard) closeSwipeCard();
    if (onClick) onClick(id);
  });
  var sx=0, sy=0, dx=0, dragging=false, scrolling=;
  outer.addEventListener('touchstart', function(e) {
    sx=e.touches[0].clientX; sy=e.touches[0].clientY; dx=0; dragging=true; scrolling=;
    inner.classList.add('dragging');
  }, {passive:true});
  outer.addEventListener('touchmove', function(e) {
    if (!dragging) return;
    var mx = e.touches[0].clientX - sx;
    var my = e.touches[0].clientY - sy;
    if (scrolling === null) scrolling = Math.abs(my) > Math.abs(mx);
    if (scrolling) return;
    e.preventDefault();
    dx = mx;
    inner.style.transform = 'translateX(' + Math.max(-120, Math.min(0, mx)) + 'px)';
  }, {passive:false});
  outer.addEventListener('touchend', function() {
    if (!dragging) return;
    dragging = false;
    inner.classList.remove('dragging');
    if (scrolling) { inner.style.transform = ''; return; }
    if (dx < -40) {
      if (_swipedCard && _swipedCard !== wrap) closeSwipeCard();
      inner.classList.add('swiped');
      inner.style.transform = '';
      _swipedCard = wrap;
    } else {
      inner.classList.remove('swiped');
      inner.style.transform = '';
      if (_swipedCard === wrap) _swipedCard = null;
    }
  }, {passive:true});
  acts.querySelectorAll('.swipe-card__action-btn').forEach(function(btn) {
    btn.addEventListener('click', async function(e) {
      e.stopPropagation();
      var a = btn.dataset.action;
      var db = getDb();
      if (type === 'contact' || type === 'private') {
        var ch = (db.characters||[]).find(function(c) { return c.id === id; });
        if (!ch) return;
        if (a === 'delete') {
          if (confirm('确定删除"' + (ch.remarkName||ch.realName) + '"吗？')) {
            db.characters = (db.characters||[]).filter(function(c) { return c.id !== id; });
            await saveData(); renderAllLists();
            showToast(dom['toast-notification'], '已删除 ' + (ch.remarkName||ch.realName));
          }
        } else if (a === 'pin') {
          ch.isPinned = !ch.isPinned; await saveData(); renderAllLists();
        }
      } else if (type === 'group') {
        var gr = (db.groups||[]).find(function(g) { return g.id === id; });
        if (!gr) return;
        if (a === 'delete') {
          if (confirm('确定删除群聊"' + gr.name + '"吗？')) {
            db.groups = (db.groups||[]).filter(function(g) { return g.id !== id; });
            await saveData(); renderAllLists();
            showToast(dom['toast-notification'], '已删除 ' + gr.name);
          }
        } else if (a === 'pin') {
          gr.isPinned = !gr.isPinned; await saveData(); renderAllLists();
        }
      }
      closeSwipeCard();
    });
  });
  return wrap;
}

function closeSwipeCard() {
  if (_swipedCard) {
    var i = _swipedCard.querySelector('.swipe-card__inner');
    if (i) { i.classList.remove('swiped'); i.style.transform = ''; }
    _swipedCard = null;
  }
}

export function renderChatList() { renderAllLists(); }
function renderAllLists() { closeSwipeCard(); renderContactsList(); renderPrivateList(); renderGroupList(); }

// wizard
function showWizardStep(step) {
  var modal = dom['contact-wizard-modal'];
  modal.querySelectorAll('.wizard-step').forEach(function(s) { s.classList.remove('active'); });
  var t = modal.querySelector('.wizard-step[data-step="' + step + '"]');
  if (t) t.classList.add('active');
  modal.querySelectorAll('.wizard-dot').forEach(function(d) {
    var ds = parseInt(d.dataset.step);
    d.classList.remove('active','done');
    if (ds === step) d.classList.add('active');
    else if (ds < step) d.classList.add('done');
  });
}

function openContactWizard() {
  _wizardData = {};
  var modal = dom['contact-wizard-modal'];
  if (!modal) return;
  dom['wizard-import-preview'].style.display = 'none';
  dom['wizard-char-realname'].value = '';
  dom['wizard-char-nickname'].value = '';
  dom['wizard-char-persona'].value = '';
  dom['wizard-avatar-preview'].src = 'assets/icons/default-avatar.png';
  dom['wizard-step1-next'].disabled = true;
  var wb = dom['wizard-wb-list'];
  if (wb) {
    var db = getDb(); wb.innerHTML = '';
    (db.worldBooks||[]).forEach(function(book) {
      var item = document.createElement('div');
      item.className = 'wizard-wb-item';
      item.innerHTML = '<input type="checkbox" id="wiz-wb-' + book.id + '" value="' + book.id + '"><label for="wiz-wb-' + book.id + '">' + escHtml(book.name) + '</label>';
      wb.appendChild(item);
    });
  }
  showWizardStep(1);
  modal.classList.add('visible');
}

function bindWizardEvents() {
  var iz = dom['wizard-import-zone'], fi = dom['wizard-import-file'];
  if (iz && fi) iz.addEventListener('click', function() { fi.click(); });
  if (fi) fi.addEventListener('change', async function(e) {
    var file = e.target.files[0];
    if (!file) return;
    try {
      if (!window.SillyTavernImporter) { showToast(dom['toast-notification'], '导入模块未加载'); return; }
      var card = await window.SillyTavernImporter.parseCardFile(file);
      _wizardData.importedCard = card;
      var pe = dom['wizard-import-preview'];
      if (pe) {
        pe.style.display = 'block';
        pe.innerHTML = '<div class="import-card-header"><img src="' + escHtml(card.avatar||'') + '" class="import-card-avatar" onerror="this.src=\\'assets/icons/default-avatar.png\\'"><div class="import-card-name">' + escHtml(card.name||'未命名') + '</div></div><div style="font-size:12px;color:#888;padding:4px 0;">已解析成功，点击下一步继续</div>';
      }
      dom['wizard-step1-next'].disabled = false;
    } catch(err) { showToast(dom['toast-notification'], '导入失败: ' + err.message); }
    fi.value = '';
  });
  if (dom['wizard-skip-import']) dom['wizard-skip-import'].addEventListener('click', function() { dom['wizard-step1-next'].disabled = false; showWizardStep(2); });
  if (dom['wizard-step1-next']) dom['wizard-step1-next'].addEventListener('click', function() { showWizardStep(2); });
  if (dom['wizard-step2-back']) dom['wizard-step2-back'].addEventListener('click', function() { showWizardStep(1); });
  if (dom['wizard-step2-next']) dom['wizard-step2-next'].addEventListener('click', function() {
    var rn = dom['wizard-char-realname'] && dom['wizard-char-realname'].value.trim();
    var nn = dom['wizard-char-nickname'] && dom['wizard-char-nickname'].value.trim();
    if (!rn || !nn) { showToast(dom['toast-notification'], '请填写真实姓名和昵称'); return; }
    _wizardData.realName = rn; _wizardData.remarkName = nn;
    showWizardStep(3);
  });
  if (dom['wizard-step3-back']) dom['wizard-step3-back'].addEventListener('click', function() { showWizardStep(2); });
  if (dom['wizard-step3-finish']) dom['wizard-step3-finish'].addEventListener('click', async function() {
    var persona = (dom['wizard-char-persona'] && dom['wizard-char-persona'].value.trim()) || '';
    _wizardData.persona = persona;
    var selWB = [];
    (dom['wizard-wb-list'] && dom['wizard-wb-list'].querySelectorAll('input:checked')||[]).forEach(function(cb) { selWB.push(cb.value); });
    var db = getDb(), ic = _wizardData.importedCard, fc = (db.characters && db.characters[0]) || {}, nc;
    if (ic && !_wizardData.realName) {
      nc = { id:'char_'+Date.now(), realName:ic.name||'', remarkName:ic.name||'', persona:ic.description||'', avatar:ic.avatar||'assets/icons/default-avatar.png', myName:fc.myName||'我', myPersona:fc.myPersona||'', myAvatar:fc.myAvatar||'assets/icons/default-avatar.png', theme:'white_pink', maxMemory:100, chatBg:'', history:[], isPinned:false, status:'在线', worldBookIds:selWB, useCustomBubbleCss:false, customBubbleCss:'', aiImgGen:false, scenario:ic.scenario||'', systemPrompt:ic.system_prompt||'', mesExample:ic.mes_example||'' };
    } else {
      nc = { id:'char_'+Date.now(), realName:_wizardData.realName||'', remarkName:_wizardData.remarkName||_wizardData.realName||'', persona:_wizardData.persona||'', avatar:_wizardData.avatar||'assets/icons/default-avatar.png', myName:fc.myName||'我', myPersona:fc.myPersona||'', myAvatar:fc.myAvatar||'assets/icons/default-avatar.png', theme:'white_pink', maxMemory:100, chatBg:'', history:[], isPinned:false, status:'在线', worldBookIds:selWB, useCustomBubbleCss:false, customBubbleCss:'', aiImgGen:false };
    }
    if (!db.characters) db.characters = [];
    db.characters.push(nc);
    await saveData(); renderAllLists();
    dom['contact-wizard-modal'].classList.remove('visible');
    showToast(dom['toast-notification'], '联系人"' + nc.remarkName + '"创建成功！');
  });
  if (dom['wizard-avatar-upload']) dom['wizard-avatar-upload'].addEventListener('change', async function(e) {
    var file = e.target.files[0];
    if (!file) return;
    try {
      var du = await compressImage(file, { quality:0.8, maxWidth:400, maxHeight:400 });
      dom['wizard-avatar-preview'].src = du;
      _wizardData.avatar = du;
    } catch(err) { showToast(dom['toast-notification'], '头像压缩失败'); }
  });
}

// picker
function openContactPicker(mode) {
  _pickerMode = mode;
  var modal = dom['contact-picker-modal'];
  if (!modal) return;
  var title = dom['picker-modal-title'], sub = dom['picker-modal-subtitle'];
  if (mode === 'single') { title.textContent = '选择联系人'; sub.textContent = '选择一个联系人开始私聊'; }
  else { title.textContent = '选择群成员'; sub.textContent = '已选择 0 位成员（至少 1 位）'; }
  var list = dom['picker-list']; list.innerHTML = '';
  var db = getDb(), chars = db.characters || [];
  if (!chars.length) {
    list.innerHTML = '<li style="color:#aaa;text-align:center;padding:20px;">还没有联系人，请先创建</li>';
    dom['picker-confirm-btn'].disabled = true;
  } else {
    dom['picker-confirm-btn'].disabled = false;
    chars.forEach(function(c) {
      var li = document.createElement('li'); li.className = 'contact-picker-item';
      li.innerHTML = '<input type="' + (mode==='single'?'radio':'checkbox') + '" name="picker-char" value="' + c.id + '" class="picker-check"><img src="' + c.avatar + '" alt="' + c.remarkName + '" onerror="this.src=\\'assets/icons/default-avatar.png\\'"><span class="picker-name">' + escHtml(c.remarkName||c.realName) + '</span>';
      if (mode === 'single') {
        li.addEventListener('click', function(e) { if (e.target.tagName !== 'INPUT') { var r = li.querySelector('input'); if (r) r.checked = true; } });
      } else {
        li.addEventListener('click', function(e) { var cm = li.querySelector('input'); if (e.target.tagName !== 'INPUT' && cm) { cm.checked = !cm.checked; } updatePickerCount(); });
      }
      list.appendChild(li);
    });
  }
  var search = dom['picker-search'];
  if (search) {
    search.value = '';
    search.oninput = function() {
      var q = search.value.toLowerCase();
      list.querySelectorAll('.contact-picker-item').forEach(function(item) {
        var n = (item.querySelector('.picker-name') && item.querySelector('.picker-name').textContent.toLowerCase()) || '';
        item.style.display = n.includes(q) ? '' : 'none';
      });
    };
  }
  modal.classList.add('visible');
  return new Promise(function(resolve) { _pickerResolve = resolve; });
}

function updatePickerCount() {
  if (_pickerMode !== 'multi') return;
  var c = (dom['picker-list'] && dom['picker-list'].querySelectorAll('input:checked').length) || 0;
  var s = dom['picker-modal-subtitle'];
  if (s) s.textContent = '已选择 ' + c + ' 位成员（至少 1 位）';
}

function bindPickerEvents() {
  if (dom['picker-cancel-btn']) dom['picker-cancel-btn'].addEventListener('click', function() {
    dom['contact-picker-modal'].classList.remove('visible');
    if (_pickerResolve) _pickerResolve([]);
  });
  if (dom['picker-confirm-btn']) dom['picker-confirm-btn'].addEventListener('click', function() {
    var checked = (dom['picker-list'] && dom['picker-list'].querySelectorAll('input:checked, input[type="radio"]:checked')) || [];
    var ids = [].map.call(checked, function(i) { return i.value; });
    if (_pickerMode === 'single') {
      if (!ids.length) { showToast(dom['toast-notification'], '请选择一个联系人'); return; }
      dom['contact-picker-modal'].classList.remove('visible');
      if (_openChatRoom) _openChatRoom(ids[0], 'private');
      if (_pickerResolve) _pickerResolve(ids);
    } else {
      if (ids.length < 1) { showToast(dom['toast-notification'], '至少选择 1 位成员'); return; }
      dom['contact-picker-modal'].classList.remove('visible');
      openGroupCreateModal(ids);
      if (_pickerResolve) _pickerResolve(ids);
    }
  });
  if (dom['picker-search']) dom['picker-search'].addEventListener('click', function(e) { e.stopPropagation(); });
}

// group create
function openGroupCreateModal(memberIds) {
  _pendingGroupMemberIds = memberIds;
  var modal = dom['group-create-modal'];
  if (!modal) return;
  dom['group-create-members-count'].textContent = '已选择 ' + memberIds.length + ' 位成员';
  dom['group-create-name-input'].value = '';
  modal.classList.add('visible');
  setTimeout(function() { var inp = dom['group-create-name-input']; if (inp) inp.focus(); }, 100);
}

function bindGroupCreateEvents() {
  if (dom['group-create-cancel-btn']) dom['group-create-cancel-btn'].addEventListener('click', function() {
    dom['group-create-modal'].classList.remove('visible');
    _pendingGroupMemberIds = [];
  });
  if (dom['group-create-confirm-btn']) dom['group-create-confirm-btn'].addEventListener('click', async function() {
    var name = dom['group-create-name-input'] && dom['group-create-name-input'].value.trim();
    if (!name) { showToast(dom['toast-notification'], '请输入群聊名称'); return; }
    if (_pendingGroupMemberIds.length < 1) { showToast(dom['toast-notification'], '请选择至少一位成员'); return; }
    var db = getDb();
    var valid = _pendingGroupMemberIds.filter(function(id) { return (db.characters||[]).some(function(c) { return c.id === id; }); });
    if (valid.length < 1) { showToast(dom['toast-notification'], '所选联系人已不存在'); dom['group-create-modal'].classList.remove('visible'); return; }
    await createGroupChat(name, valid);
    dom['group-create-modal'].classList.remove('visible');
    _pendingGroupMemberIds = [];
  });
  if (dom['group-create-name-input']) dom['group-create-name-input'].addEventListener('keypress', function(e) {
    if (e.key === 'Enter') { var btn = dom['group-create-confirm-btn']; if (btn) btn.click(); }
  });
}
"""

with open('/root/zhibo-gaizao/js/ui/chatList.js', 'w') as f:
    f.write(content)

import os
size = os.path.getsize('/root/zhibo-gaizao/js/ui/chatList.js')
print(f"SUCCESS: written {size} bytes")

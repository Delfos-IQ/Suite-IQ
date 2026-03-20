/* ================================================================
   Delfos-IQ v2.1 — course-ui.js
   Course view: trial gate, unlock logic, card grid, topic detail
   ================================================================ */


function saveDone(id, val) {
  done[id] = val;
  try { localStorage.setItem("delfos_done", JSON.stringify(done)); } catch(e) {}
  updateProg();
}

function updateProg() {
  var n = Object.values(done).filter(Boolean).length, tot = 40;
  var el = document.getElementById("gp"); if(el) el.style.width = (n/tot*100).toFixed(1)+"%";
  var lbl = document.getElementById("gp-lbl"); if(lbl) lbl.textContent = n+" / "+tot;
}

function toggleLevel(id) {
  var body = document.getElementById("lb-"+id), tog = document.getElementById("lt-"+id);
  if(!body) return;
  var isOpen = body.classList.toggle("on");
  if(tog) tog.textContent = isOpen ? tx("lv_hide") : tx("lv_see");
}

function toggleTopic(id) {
  var el = document.getElementById("td-"+id); if(!el) return;
  var isOpen = el.classList.toggle("on");
  if(isOpen) {
    var pfx = id.split("-")[0]+"-";
    document.querySelectorAll("[id^='td-"+pfx+"']").forEach(function(e){ if(e.id !== "td-"+id) e.classList.remove("on"); });
  }
}

function markDone(id, val) {
  saveDone(id, val);
  var btn = document.getElementById("dn-"+id), chk = document.getElementById("ck-"+id);
  if(chk) { chk.classList.toggle("done", val); chk.textContent = val ? "✓" : ""; }
  if(btn) { btn.textContent = val ? tx("td_unmark") : tx("td_mark"); btn.dataset.done = val?"1":"0"; }
  updateProg();
}
/* ═══════════════════════════════════════════════════
   UNLOCK SYSTEM
═══════════════════════════════════════════════════ */


function lv1Done() {
  return COURSE[0].topics.filter(function(t){ return !!done[t.id]; }).length;
}


function oracleUnlocked() {
  return COURSE[0].topics.every(function(t){ return !!done[t.id]; });
}


function topicUnlocked(li, ti) {
  if(li === 0 && ti === 0) return true;
  if(ti === 0) return COURSE[li-1].topics.every(function(t){ return !!done[t.id]; });
  return !!done[COURSE[li].topics[ti-1].id];
}


function isNextUp(li, ti) {
  if(!topicUnlocked(li,ti)) return false;
  var tp = COURSE[li].topics[ti];
  if(done[tp.id]) return false;
  for(var a=0;a<COURSE.length;a++){
    for(var b=0;b<COURSE[a].topics.length;b++){
      if(!done[COURSE[a].topics[b].id] && topicUnlocked(a,b)) return (a===li && b===ti);
    }
  }
  return false;
}


function updateTrialBadge() {
  var badge = document.getElementById('trial-badge');
  if(!badge) return;
  if(oracleUnlocked()){ badge.style.display='none'; return; }
  var left = Math.max(0, 3 - oracleTrials);
  badge.style.display = 'block';
  badge.textContent = lang==='en'
    ? 'FREE: ' + left + ' / 3 uses remaining'
    : 'GRATIS: ' + left + ' / 3 consultas';
  badge.style.background = left===0 ? 'rgba(239,68,68,.15)' : left===1 ? 'rgba(245,158,11,.12)' : 'rgba(201,168,76,.1)';
  badge.style.color       = left===0 ? '#ef4444' : left===1 ? '#f59e0b' : 'var(--d2)';
  badge.style.borderColor = left===0 ? 'rgba(239,68,68,.3)' : 'var(--d4)';
}


function updateOracleGate() {
  var unlocked = oracleUnlocked();
  var prog     = lv1Done();
  var lockScr  = document.getElementById('oracle-lock-screen');
  var mainCnt  = document.getElementById('oracle-main');
  var pill     = document.getElementById('nc-lock-pill');
  var fill     = document.getElementById('ols-f');
  var numEl    = document.getElementById('ols-n');

  var trialsLeft = Math.max(0, 3 - oracleTrials);
  var fullyLocked = !unlocked && trialsLeft === 0;
  if(lockScr) lockScr.className = fullyLocked ? 'visible' : '';
  if(mainCnt) mainCnt.style.display = fullyLocked ? 'none' : '';
  if(pill){
    pill.className = unlocked ? 'nc-lock-pill' : 'nc-lock-pill on';
    pill.textContent = lang==='en' ? 'LOCKED' : 'BLOQUEADO';
  }
  // Also update lock screen texts dynamically
  var olsT = document.getElementById('ols-t');
  var olsS = document.getElementById('ols-s');
  var olsL = document.getElementById('ols-l');
  var olsB = document.getElementById('ols-b');
  if(olsT) olsT.textContent = lang==='en' ? 'THE ORACLE SLEEPS' : 'EL ORÁCULO DUERME';
  if(olsS) olsS.textContent = lang==='en'
    ? 'You have used all 3 free Oracle trials. Complete Level 1 to unlock unlimited access.'
    : 'Has agotado tus 3 consultas gratuitas. Completa el Nivel 1 para desbloquear el Oráculo sin límite.';
  if(olsL) olsL.textContent = lang==='en' ? 'LEVEL 1 — FUNDAMENTALS' : 'NIVEL 1 — FUNDAMENTOS';
  if(olsB) olsB.textContent = lang==='en' ? 'GO TO COURSE →' : 'IR AL CURSO →';
  if(fill)    fill.style.width = (prog * 10) + '%';
  if(numEl)   numEl.textContent = prog;
  updateTrialBadge();


}


function renderCourse() {
  var container = document.getElementById('course-container');
  if(!container) return;
  container.innerHTML = '';

  COURSE.forEach(function(lv, lvIdx) {
    var doneCount = lv.topics.filter(function(tp){ return !!done[tp.id]; }).length;
    var pct = (doneCount/lv.topics.length*100).toFixed(0);
    var lvLocked = lvIdx > 0 && !COURSE[lvIdx-1].topics.every(function(t){ return !!done[t.id]; });
    var tKey = lang==='en' ? 'title_en' : 'title_es';
    var sKey = lang==='en' ? 'sub_en'   : 'sub_es';
    var badges={beginner:{es:'Principiante',en:'Beginner'},intermediate:{es:'Intermedio',en:'Intermediate'},advanced:{es:'Avanzado',en:'Advanced'},ejemplos:{es:'Casos del Libro',en:'Book Cases'}};

    var sec = document.createElement('div'); sec.className = 'lv-sec';

    // Level header
    var hdr = document.createElement('div');
    hdr.className = 'lv-hdr' + (lvLocked ? ' lv-locked' : '');

    var numEl = document.createElement('div'); numEl.className = 'lh-num'; numEl.textContent = '0'+lv.num;
    var info  = document.createElement('div'); info.className = 'lh-info';
    var bdg   = document.createElement('div'); bdg.className = 'level-badge '+lv.id;
    bdg.textContent = lang==='en' ? (badges[lv.id]?badges[lv.id].en:'Level '+lv.num) : (badges[lv.id]?badges[lv.id].es:'Nivel '+lv.num);
    var ttl = document.createElement('div'); ttl.className='lh-title'; ttl.textContent = lv[tKey];
    var sub = document.createElement('div'); sub.className='lh-sub';   sub.textContent = lv[sKey];
    info.appendChild(bdg); info.appendChild(ttl); info.appendChild(sub);

    var meta = document.createElement('div'); meta.className='lh-meta';
    if(lvLocked) {
      var req = document.createElement('div'); req.style.cssText='font-size:10px;color:var(--warn);font-family:var(--ff-data);margin-top:4px';
      req.textContent = lang==='en' ? '🔒 Complete Level '+(lvIdx)+' first' : '🔒 Completa el Nivel '+lvIdx+' primero';
      meta.appendChild(req);
    } else {
      var cnt  = document.createElement('div'); cnt.className='lh-cnt';  cnt.textContent = doneCount+'/'+lv.topics.length;
      var cntl = document.createElement('div'); cntl.className='lh-cntl'; cntl.textContent = tx('lv_done');
      var pbar = document.createElement('div'); pbar.style.cssText='background:var(--bg4);border-radius:2px;height:3px;width:80px;margin-top:5px;overflow:hidden';
      var pfill= document.createElement('div'); pfill.style.cssText='background:var(--d1);height:3px;width:'+pct+'%';
      pbar.appendChild(pfill);
      var tog = document.createElement('div'); tog.className='lh-tog'; tog.id='lt-'+lv.id; tog.textContent=tx('lv_see');
      meta.appendChild(cnt); meta.appendChild(cntl); meta.appendChild(pbar); meta.appendChild(tog);
    }

    hdr.appendChild(numEl); hdr.appendChild(info); hdr.appendChild(meta);
    sec.appendChild(hdr);

    // Topic card grid
    var grid = document.createElement('div'); grid.className = 'tp-grid';

    lv.topics.forEach(function(tp, tpIdx) {
      var isDone   = !!done[tp.id];
      var unlocked = topicUnlocked(lvIdx, tpIdx);
      var next     = isNextUp(lvIdx, tpIdx);
      var ttKey    = lang==='en' ? 't_en' : 't_es';
      var tpNum    = parseInt(tp.id.split('-')[1]);

      var state = lvLocked || !unlocked ? 'locked' : isDone ? 'done' : next ? 'next' : 'avail';

      var card = document.createElement('div');
      card.className = 'tp-card tp-' + state;
      if(unlocked && !lvLocked) {
        (function(capturedId, capturedLvIdx, capturedTpIdx){
          card.onclick = function(){ openTopic(capturedId, capturedLvIdx, capturedTpIdx); };
        })(tp.id, lvIdx, tpIdx);
      }

      if(isDone) {
        var chk = document.createElement('div'); chk.className='tc-check'; chk.textContent='✓';
        card.appendChild(chk);
      }

      var num = document.createElement('div'); num.className='tc-num';
      num.textContent = (tpNum<10?'0':'')+tpNum+'  ·  '+tp.dur+' min';
      card.appendChild(num);

      var title2 = document.createElement('div'); title2.className='tc-title'; title2.textContent=tp[ttKey];
      card.appendChild(title2);

      var foot = document.createElement('div'); foot.className='tc-foot';
      var empty= document.createElement('span');
      var badge2=document.createElement('span'); badge2.className='tc-badge '+state;
      if(isDone)    badge2.textContent = lang==='en'?'✓ DONE':'✓ LISTO';
      else if(next) badge2.textContent = lang==='en'?'→ START':'→ COMENZAR';
      else if(unlocked) badge2.textContent = 'VER →';
      else          badge2.textContent = '🔒';
      foot.appendChild(empty); foot.appendChild(badge2);
      card.appendChild(foot);
      grid.appendChild(card);
    });

    sec.appendChild(grid);

    // Detail panel wrapper (full width, below grid)
    var wrap = document.createElement('div'); wrap.className='tp-detail-wrap'; wrap.id='tdw-'+lv.id;
    sec.appendChild(wrap);

    container.appendChild(sec);
  });

  updateProg();
}


function openTopic(tid, lvIdx, tpIdx) {
  // Close any open panels
  document.querySelectorAll('.tp-detail.open').forEach(function(el){ el.remove(); });

  var lv = COURSE[lvIdx]; var tp = lv.topics[tpIdx];
  if(!tp) return;

  var isDone = !!done[tp.id];
  var ttKey = lang==='en'?'t_en':'t_es';
  var ssKey = lang==='en'?'s_en':'s_es';
  var ccKey = lang==='en'?'c_en':'c_es';

  var panel = document.createElement('div');
  panel.className = 'tp-detail open'; panel.id = 'tdp-'+tid;

  // Header
  var hdr2=document.createElement('div'); hdr2.className='td-hdr';
  var left=document.createElement('div');
  var ttl2=document.createElement('div'); ttl2.className='td-ttl'; ttl2.textContent=tp[ttKey];
  var mt2=document.createElement('div');  mt2.className='td-meta';
  mt2.textContent=(lang==='en'?'LEVEL ':'NIVEL ')+lv.num+' · '+tp.dur+' min';
  left.appendChild(ttl2); left.appendChild(mt2);
  var closeBtn=document.createElement('button'); closeBtn.className='td-close';
  closeBtn.textContent='✕ '+tx('td_close');
  closeBtn.onclick=function(){ panel.remove(); };
  hdr2.appendChild(left); hdr2.appendChild(closeBtn);
  panel.appendChild(hdr2);

  // Summary
  var sum=document.createElement('div'); sum.className='td-sum'; sum.textContent=tp[ssKey];
  panel.appendChild(sum);

  // Concepts
  var conWrap=document.createElement('div'); conWrap.className='td-concepts';
  (tp[ccKey]||[]).forEach(function(c){
    var sp=document.createElement('span'); sp.className='td-concept'; sp.textContent=c;
    conWrap.appendChild(sp);
  });
  panel.appendChild(conWrap);

  // Quote
  var qEl=document.createElement('div'); qEl.className='td-q';
  qEl.innerHTML=tp.q+"<br><small style='opacity:.6'>— "+tx('td_cava_src')+"</small>";
  panel.appendChild(qEl);

  // AI Tutor box
  var tBox=document.createElement('div'); tBox.className='tutor-box';
  var tHdr=document.createElement('div'); tHdr.className='tutor-hdr';
  var svgEl=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svgEl.setAttribute('width','12'); svgEl.setAttribute('height','12');
  svgEl.setAttribute('viewBox','0 0 36 36'); svgEl.setAttribute('fill','none');
  svgEl.innerHTML="<rect x='3' y='29' width='30' height='3' rx='1' fill='var(--d1)'/><rect x='6' y='12' width='3' height='14' rx='1' fill='var(--d1)'/><rect x='12' y='12' width='3' height='14' rx='1' fill='var(--d1)'/><rect x='18' y='12' width='3' height='14' rx='1' fill='var(--d1)'/><rect x='24' y='12' width='3' height='14' rx='1' fill='var(--d1)'/><rect x='3' y='8' width='30' height='2' rx='1' fill='var(--d1)'/><polygon points='18,1 3,8 33,8' fill='var(--d1)' opacity='.6'/>";
  var tLbl=document.createElement('span'); tLbl.className='tutor-lbl'; tLbl.textContent=tx('tutor_lbl');
  tHdr.appendChild(svgEl); tHdr.appendChild(tLbl);
  var tRow=document.createElement('div'); tRow.className='tutor-row';
  var tInp=document.createElement('input'); tInp.className='tutor-inp'; tInp.id='ti-'+tid; tInp.placeholder=tx('tutor_ph');
  var tBtn=document.createElement('button'); tBtn.className='tutor-send'; tBtn.dataset.tid=tid; tBtn.textContent=tx('tutor_send');
  tRow.appendChild(tInp); tRow.appendChild(tBtn);
  var tResp=document.createElement('div'); tResp.className='tutor-resp'; tResp.id='tr-'+tid;
  tResp.style.cssText='color:var(--tx3);font-size:11px'; tResp.textContent=tx('tutor_init');
  tBox.appendChild(tHdr); tBox.appendChild(tRow); tBox.appendChild(tResp);
  panel.appendChild(tBox);

  // Done/undone button
  var acts=document.createElement('div');
  var dnBtn=document.createElement('button'); dnBtn.className='td-done-btn'; dnBtn.id='dn-'+tid;
  dnBtn.textContent=isDone?tx('td_unmark'):tx('td_mark');
  dnBtn.onclick=function(){
    done[tid]=!done[tid];
    try{ localStorage.setItem('delfos_done',JSON.stringify(done)); }catch(e){}
    panel.remove();
    renderCourse();
    updateOracleGate();
  };
  acts.appendChild(dnBtn);
  panel.appendChild(acts);

  // Append to level's detail wrapper
  var wrap=document.getElementById('tdw-'+lv.id);
  if(wrap){ wrap.innerHTML=''; wrap.appendChild(panel); }
  setTimeout(function(){ panel.scrollIntoView({behavior:'smooth',block:'nearest'}); },60);
}

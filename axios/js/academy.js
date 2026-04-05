// AXIOS·IQ — academy.js — Articles + Courses + Certificates

// ══════════════════════════════════════════════════════════════
// ACADEMIA — two modes: concepts (with levels) + 28 items
// ══════════════════════════════════════════════════════════════
function renderAcademy(){
  if(!ACADEMIA_FULL){ _loadAcademia(); return; }
  if(!COURSES){
    _loadCourses(function(){
      if(_currentCourseId){ _openCourse(_currentCourseId); }
      else { renderAcademyCourses(); }
    });
    return;
  }
  if(_currentCourseId){ _openCourse(_currentCourseId); }
  else { renderAcademyCourses(); }
}

function _loadAcademia(){
  const el = document.getElementById('academy-content');
  el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px;gap:14px;color:var(--tx3);font-family:monospace;font-size:13px">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
    Cargando Academia...</div>`;
  fetch('academia.json')
    .then(r => { if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
    .then(data => {
      ACADEMIA_FULL = data;
      _loadCourses(function(){
        if(_currentCourseId){_openCourse(_currentCourseId);}else{renderAcademyCourses();}
      });
    })
    .catch(err => {
      el.innerHTML = `<div style="padding:32px;color:var(--red);font-family:sans-serif;font-size:13px">
        ⚠️ Error al cargar la Academia: ${err.message}<br>
        <small style="color:var(--tx3)">Asegúrate de que academia.json está en la misma carpeta que el HTML.</small></div>`;
    });
}

function _renderAcademiaUI(){
  const el=document.getElementById('academy-content');
  const modeTabs=`<div style="display:flex;gap:0;background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);overflow:hidden;margin-bottom:24px;width:fit-content">
    <button class="acad-filter-btn${acadMode==='concepts'?' active':''}" style="border-right:1px solid var(--border);border-radius:0" onclick="setAcadMode('concepts')">${tr('tabConcepts')}</button>
    <button class="acad-filter-btn${acadMode==='items'?' active':''}" style="border-radius:0" onclick="setAcadMode('items')">${tr('tab28')}</button>
  </div>`;
  if(acadMode==='items'){ el.innerHTML=modeTabs+renderItems28(); return; }

  const levels=[['all',tr('filterAll')],['beginner',tr('filterBegin')],['intermediate',tr('filterMid')],['advanced',tr('filterAdv')]];
  const cats  =[['all',tr('filterAll')],['fundamental',tr('filterFund')],['technical',tr('filterTech')],['macro',tr('filterMacro')],['quality',tr('filterQual')]];
  const lvlColor={beginner:'var(--a1)',intermediate:'var(--a2)',advanced:'var(--a4)'};
  const lvlLabel={beginner:tr('filterBegin'),intermediate:tr('filterMid'),advanced:tr('filterAdv')};

  let lvlRow=`<div class="acad-filter" style="margin-bottom:8px"><span style="font-size:9px;color:var(--tx3);letter-spacing:2px;text-transform:uppercase;margin-right:6px;align-self:center">${tr('levelNivel')}</span>`;
  levels.forEach(([k,v])=>{ lvlRow+=`<button class="acad-filter-btn${acadLevel===k?' active':''}" onclick="setAcadLevel('${k}')">${v}</button>`; });
  lvlRow+='</div>';

  let catRow=`<div class="acad-filter" style="margin-bottom:22px"><span style="font-size:9px;color:var(--tx3);letter-spacing:2px;text-transform:uppercase;margin-right:6px;align-self:center">${tr('temaTema')}</span>`;
  cats.forEach(([k,v])=>{ catRow+=`<button class="acad-filter-btn${acadCat===k?' active':''}" onclick="setAcadCat('${k}')">${v}</button>`; });
  catRow+='</div>';

  const filtered=ACADEMIA_FULL.filter(a=>(acadLevel==='all'||a.level===acadLevel)&&(acadCat==='all'||a.cat===acadCat));
  let grid='<div class="academy-grid">';
  filtered.forEach(a=>{
    const bc=lvlColor[a.level]||'var(--tx3)';
    const bl=lvlLabel[a.level]||'';
    const preview=a.body.replace(/<[^>]+>/g,'').substring(0,120);
    grid+=`<div class="acad-card" id="acad-${a.id}" onclick="openAcadCard('${a.id}')">
      <div class="acad-icon">${a.icon}</div>
      <div class="acad-title">${lang==='en'&&a.title_en?a.title_en:lang==='pt'&&a.title_pt?a.title_pt:a.title}</div>
      <div class="acad-desc">${preview}...</div>
      <div class="acad-tags">
        <span class="acad-tag level-${a.level}">${bl}</span>
        <span class="acad-tag">${a.cat}</span>
      </div>
    </div>`;
  });
  if(!filtered.length) grid+=`<div style="color:var(--tx3);padding:32px;font-family:sans-serif;font-size:13px">${tr('emptyAcad')}</div>`;
  grid+='</div>';
  el.innerHTML=modeTabs+lvlRow+catRow+grid;
}
function renderItems28(){
  const cats=[['all',tr('filterAll')],['fundamental',tr('filterFund')],['technical',tr('filterTech')],['macro',tr('filterMacro')],['quality',tr('filterQual')]];
  const catColor={fundamental:'var(--a1)',technical:'var(--a3)',macro:'var(--a2)',quality:'var(--a4)'};
  let row=`<div class="acad-filter" style="margin-bottom:22px"><span style="font-size:9px;color:var(--tx3);letter-spacing:2px;text-transform:uppercase;margin-right:6px;align-self:center">${tr('catLabel')}</span>`;
  cats.forEach(([k,v])=>{ row+=`<button class="acad-filter-btn${acadCat===k?' active':''}" onclick="setAcadCat('${k}')">${v}</button>`; });
  row+='</div>';
  const items=ITEMS.filter(i=>acadCat==='all'||i.cat===acadCat);
  const sectorCfg=SECTORS[state.sector]||SECTORS.technology;
  let grid='<div class="academy-grid">';
  items.forEach(item=>{
    const label=getItemLabel(item);
    const cc=catColor[item.cat]||'var(--tx3)';
    const catLabel={fundamental:tr('filterFund'),technical:tr('filterTech'),macro:tr('filterMacro'),quality:tr('filterQual')}[item.cat]||item.cat;
    grid+=`<div class="acad-card" onclick="openItem28('${item.id}')">
      <div class="acad-icon">${item.icon}</div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:6px">
        <div class="acad-title" style="margin-bottom:0">${label}</div>
        <span style="flex-shrink:0;font-size:8px;font-weight:700;padding:2px 7px;border-radius:3px;background:${cc}22;color:${cc};border:1px solid ${cc}44">${catLabel}</span>
      </div>
      <div class="acad-desc">${item.short}</div>
    </div>`;
  });
  grid+='</div>';
  return row+grid;
}

function openItem28(id){
  const item=ITEMS.find(i=>i.id===id); if(!item) return;
  const label=getItemLabel(item);
  const desc =item.desc.default||'';
  const pos  =item.pos.default||'';
  const red  =item.red.default||'';
  const watch=item.watch.default||'';
  const link =(item.link||'').replace(/__TICKER__/g,'');
  document.getElementById('acad-modal-title').textContent=label;
  document.getElementById('acad-modal-cat').textContent  =item.cat+' · '+item.short;
  document.getElementById('acad-modal-body').innerHTML=`
    <h4>${tr('whatIs')}</h4><p>${desc}</p>
    <div class="signal-box sig-ok" style="margin:10px 0"><strong>🟢 ${tr('posSignal')}</strong><br>${pos}</div>
    <div class="signal-box sig-bad" style="margin:10px 0"><strong>🔴 ${tr('redFlagLbl')}</strong><br>${red}</div>
    <div class="signal-box sig-watch" style="margin:10px 0"><strong>🟡 ${tr('watchLbl')}</strong><br>${watch}</div>
    <h4 style="margin-top:16px">${tr('whereToFind')}</h4>
    <p><a href="${link||'#'}" target="_blank" rel="noopener" style="color:var(--a3)">${item.link_label||tr('source1Lbl')} →</a></p>`
  document.getElementById('acad-modal').classList.add('open');
}

function setAcadMode(m){ acadMode=m; acadCat='all'; renderAcademy(); }
function setAcadLevel(l){ acadLevel=l; renderAcademy(); }
function setAcadCat(c){ acadCat=c; renderAcademy(); }

function openAcadCard(id){
  if(!ACADEMIA_FULL){ showTab('academy'); return; }
  const a=ACADEMIA_FULL.find(x=>x.id===id); if(!a) return;
  const lvlLabel={beginner:tr('filterBegin'),intermediate:tr('filterMid'),advanced:tr('filterAdv')};
  document.getElementById('acad-modal-title').textContent=a.title;
  document.getElementById('acad-modal-cat').textContent  =(lvlLabel[a.level]||a.level)+' · '+a.cat;
  document.getElementById('acad-modal-body').innerHTML   =a.body;
  document.getElementById('acad-modal').classList.add('open');
}
// Open academia article as modal overlay — NEVER changes the active tab
function openAcadModal(id, fallbackCat){
  if(!ACADEMIA_FULL){ showTab('academy'); return; }
  let a = id ? ACADEMIA_FULL.find(x=>x.id===id) : null;
  if(!a && fallbackCat) a = ACADEMIA_FULL.find(x=>x.cat===fallbackCat);
  if(!a) a = ACADEMIA_FULL[0];
  const lvlLabel={beginner:tr('filterBegin'),intermediate:tr('filterMid'),advanced:tr('filterAdv')};

  // Pick title + body in current language
  const title = (lang==='en'&&a.title_en) ? a.title_en : (lang==='pt'&&a.title_pt) ? a.title_pt : a.title;
  const body  = (lang==='en'&&a.body_en)  ? a.body_en  : (lang==='pt'&&a.body_pt)  ? a.body_pt  : a.body;

  document.getElementById('acad-modal-title').textContent = title;
  document.getElementById('acad-modal-cat').textContent   = (lvlLabel[a.level]||a.level)+' · '+a.cat;

  // Estimate reading time (avg 200 words/min)
  const wordCount = body.replace(/<[^>]+>/g,'').trim().split(/\s+/).length;
  const readMins  = Math.max(1, Math.ceil(wordCount/200));
  const readLabel = { es: readMins+'min de lectura', en: readMins+'min read', pt: readMins+'min de leitura' };

  // Build modal body with progress bar + related articles
  const progressHTML = '<div class="read-progress-wrap" id="read-progress-wrap">'
    + '<span class="read-time-badge">⏱ '+(readLabel[lang]||readLabel.es)+'</span>'
    + '<div class="read-progress-bar-track"><div class="read-progress-bar-fill" id="read-prog-fill"></div></div>'
    + '<span class="read-progress-pct" id="read-prog-pct">0%</span>'
    + '</div>';

  // Related articles (same category, different id, max 3)
  const related = ACADEMIA_FULL.filter(function(x){ return x.cat===a.cat && x.id!==a.id; }).slice(0,3);
  let relatedHTML = '';
  if(related.length){
    const relHdr = {es:'Artículos relacionados', en:'Related articles', pt:'Artigos relacionados'};
    relatedHTML = '<div class="related-section"><div class="related-hdr">📚 '+(relHdr[lang]||relHdr.es)+'</div><div class="related-grid">';
    related.forEach(function(r){
      const rTitle = (lang==='en'&&r.title_en)?r.title_en:(lang==='pt'&&r.title_pt)?r.title_pt:r.title;
      relatedHTML += '<div class="related-card" onclick="openAcadModal(&apos;'+r.id+'&apos;)"><div class="related-card-icon">'+(r.icon||'📄')+'</div>'
        + '<div class="related-card-title">'+rTitle+'</div>'
        + '<div class="related-card-meta">'+(lvlLabel[r.level]||r.level)+'</div>'
        + '</div>';
    });
    relatedHTML += '</div></div>';
  }

  document.getElementById('acad-modal-body').innerHTML = progressHTML + body + relatedHTML;
  document.getElementById('acad-modal').classList.add('open');

  // Attach scroll handler for progress
  setTimeout(function(){
    const modalEl = document.getElementById('acad-modal');
    const bodyEl  = document.getElementById('acad-modal-body');
    if(!modalEl||!bodyEl) return;
    function _onScroll(){
      const fill = document.getElementById('read-prog-fill');
      const pct  = document.getElementById('read-prog-pct');
      if(!fill||!pct) return;
      const scrollTop    = bodyEl.scrollTop;
      const scrollHeight = bodyEl.scrollHeight - bodyEl.clientHeight;
      const progress     = scrollHeight > 0 ? Math.min(100, Math.round((scrollTop/scrollHeight)*100)) : 100;
      fill.style.width = progress+'%';
      pct.textContent  = progress+'%';
    }
    bodyEl.removeEventListener('scroll', bodyEl._progHandler||function(){});
    bodyEl._progHandler = _onScroll;
    bodyEl.addEventListener('scroll', _onScroll);
    bodyEl.scrollTop = 0;
    _onScroll();
  }, 80);
}
function closeAcadModal(){ document.getElementById('acad-modal').classList.remove('open'); }



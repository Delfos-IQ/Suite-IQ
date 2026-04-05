// AXIOS·IQ — analyzer.js — Company Header, Grid, Analysis, Spider Chart

// ══════════════════════════════════════════════════════════════
// COMPANY HEADER + PROGRESS
// ══════════════════════════════════════════════════════════════
function showCompanyHeader(){
  const cfg=SECTORS[state.sector]||SECTORS.technology;
  document.getElementById('co-header').classList.add('visible');
  document.getElementById('co-badge').textContent      = cfg.emoji;
  document.getElementById('co-ticker').textContent     = state.ticker;
  document.getElementById('co-name').textContent       = state.name;
  document.getElementById('co-desc').textContent       = state.desc||'';
  document.getElementById('co-tag-sector').textContent = cfg.label;
  document.getElementById('co-tag-country').textContent= state.country||'🌐';
  updateProgress();
  // ⭐ Star / watchlist button
  let starBtn = document.getElementById('wl-star-btn');
  if(!starBtn){
    starBtn = document.createElement('button');
    starBtn.id = 'wl-star-btn';
    starBtn.className = 'wl-star-btn';
    starBtn.onclick = function(e){ e.stopPropagation(); _toggleWatchlist(); };
    const hdr = document.getElementById('co-header');
    hdr.appendChild(starBtn);
  }
  const inWL = _isInWatchlist(state.ticker);
  starBtn.textContent = inWL ? '★' : '☆';
  starBtn.className   = 'wl-star-btn' + (inWL ? ' in-watchlist' : '');
  starBtn.title = inWL ? tr('wlRemove') : tr('wlAdd');
}
function updateProgress(){
  const done=Object.keys(state.marks).length, total=ITEMS.length;
  const pct=Math.round(done/total*100);
  const r=document.getElementById('progress-ring');
  if(r) r.textContent=pct+'%';
  const b=document.getElementById('progress-bar');
  if(b) b.style.width=pct+'%';
  const l=document.getElementById('progress-lbl');
  if(l) l.textContent=tr('completed');
}

// ══════════════════════════════════════════════════════════════
// ITEM LABEL HELPER
// ══════════════════════════════════════════════════════════════
function getItemLabel(item){
  const cfg=SECTORS[state.sector]||SECTORS.technology;
  if(item.id==='sector_metric') return cfg.item10_label||item.label.default;
  if(item.id==='pe')            return cfg.item1_label ||item.label.default;
  if(item.id==='profitability') return cfg.item6_label ||item.label.default;
  return item.label[state.sector]||item.label.default;
}

// ══════════════════════════════════════════════════════════════
// RENDER GRID  (full render, called on new ticker or lang change)
// ══════════════════════════════════════════════════════════════
function _renderRichMetricCard(item, val, mark, cc, mc, mi, label) {
  function parseKV(str) {
    var out = {};
    str.split('|').forEach(function(part) {
      var colon = part.indexOf(':');
      if(colon > -1) {
        var k = part.slice(0, colon).trim().toLowerCase().replace(/\s+/g,'_');
        var v = part.slice(colon+1).trim();
        out[k] = v;
      }
    });
    return out;
  }
  var kv = parseKV(val);
  var kpis = '';

  if(item.id === 'sharpe') {
    var sharpeVal = kv['sharpe'] || '—';
    var sortinoVal = kv['sortino'] || '—';
    var volaVal = kv['vola'] || '—';
    var ddVal = kv['maxdd'] || '—';
    var rfVal = kv['rf'] || '';
    var sharpeN = parseFloat(sharpeVal);
    var sc = isNaN(sharpeN)?'var(--tx2)':sharpeN>=1.5?'var(--green)':sharpeN>=0.5?'var(--yellow)':'var(--red)';
    kpis = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin:8px 0">'
      + '<div style="background:var(--bg3);border-radius:4px;padding:7px 10px"><div style="font-size:9px;color:var(--tx3);letter-spacing:.08em;margin-bottom:3px">SHARPE</div>'
      + '<div style="font-size:18px;font-weight:700;color:'+sc+'">'+sharpeVal+'</div>'
      + '<div style="font-size:9px;color:var(--tx3)">retorno/riesgo total</div></div>'
      + '<div style="background:var(--bg3);border-radius:4px;padding:7px 10px"><div style="font-size:9px;color:var(--tx3);letter-spacing:.08em;margin-bottom:3px">SORTINO</div>'
      + '<div style="font-size:18px;font-weight:700;color:var(--a1)">'+sortinoVal+'</div>'
      + '<div style="font-size:9px;color:var(--tx3)">solo vol. bajista</div></div>'
      + '<div style="background:var(--bg3);border-radius:4px;padding:7px 10px"><div style="font-size:9px;color:var(--tx3);letter-spacing:.08em;margin-bottom:3px">VOLATILIDAD</div>'
      + '<div style="font-size:18px;font-weight:700;color:var(--tx2)">'+volaVal+'</div>'
      + '<div style="font-size:9px;color:var(--tx3)">anualizada 1A</div></div>'
      + '<div style="background:var(--bg3);border-radius:4px;padding:7px 10px"><div style="font-size:9px;color:var(--tx3);letter-spacing:.08em;margin-bottom:3px">MAX DRAWDOWN</div>'
      + '<div style="font-size:18px;font-weight:700;color:var(--red)">'+ddVal+'</div>'
      + '<div style="font-size:9px;color:var(--tx3)">peor caída 1A</div></div>'
      + '</div>';
    if(rfVal) kpis += '<div style="font-size:9px;color:var(--tx3);margin-bottom:5px">Tasa libre de riesgo (FRED Fed Funds): '+rfVal+'</div>';
    kpis += '<div style="font-size:9px;color:var(--tx3);line-height:1.55;padding:6px 8px;background:var(--bg3);border-radius:4px">'
      + '<strong style="color:var(--tx2)">Sharpe</strong> = (Retorno anual − Rf) ÷ Volatilidad &nbsp;·&nbsp; '
      + '<strong style="color:var(--tx2)">Sortino</strong> = (Retorno − Rf) ÷ Desviación bajista. '
      + 'Sharpe &gt;1 es bueno · &gt;2 excelente · &lt;0 no compensa el riesgo asumido.</div>';
  }

  if(item.id === 'momentum') {
    function momCell(period, vRaw) {
      if(!vRaw || vRaw === '—') return '<div style="background:var(--bg3);border-radius:4px;padding:7px 10px"><div style="font-size:9px;color:var(--tx3);letter-spacing:.08em;margin-bottom:3px">'+period+'</div><div style="font-size:18px;font-weight:700;color:var(--tx3)">—</div><div style="font-size:9px;color:var(--tx3)">sin datos</div></div>';
      var n = parseFloat(vRaw);
      var col = isNaN(n)?'var(--tx2)':n>10?'var(--green)':n>2?'#84cc16':n>0?'var(--yellow)':n>-5?'#f97316':'var(--red)';
      return '<div style="background:var(--bg3);border-radius:4px;padding:7px 10px"><div style="font-size:9px;color:var(--tx3);letter-spacing:.08em;margin-bottom:3px">'+period+'</div>'
        +'<div style="font-size:18px;font-weight:700;color:'+col+'">'+(n>0?'+':'')+vRaw+'</div>'
        +'<div style="font-size:9px;color:var(--tx3)">retorno precio</div></div>';
    }
    kpis = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin:8px 0">'
      + momCell('1 MES',   kv['1m'])
      + momCell('3 MESES', kv['3m'])
      + momCell('6 MESES', kv['6m'])
      + momCell('12 MESES',kv['12m'])
      + '</div>';
    kpis += '<div style="font-size:9px;color:var(--tx3);line-height:1.55;padding:6px 8px;background:var(--bg3);border-radius:4px">'
      + 'Momentum = retorno real del precio de cierre en cada período. '
      + 'Positivo en todos los horizontes = tendencia sana. '
      + 'Divergencia 12M+ pero 1M-3M negativo = posible agotamiento o corrección.</div>';
  }

  return '<div class="'+cc+' item-card-rich" onclick="openItem(\''+item.id+'\')" style="grid-column:1/-1">'
    + '<div class="item-card-top" style="margin-bottom:4px"><span class="item-name">'+item.icon+' '+label+'</span><span class="'+mc+'">'+mi+'</span></div>'
    + kpis
    + '<div class="item-explore" style="margin-top:6px">Ver explicación completa →</div>'
    + '</div>';
}

function renderGrid(){
  const grid=document.getElementById('analysis-grid');
  const cats=[
    {id:'fundamental',label:tr('catFundamental'),icon:'📊'},
    {id:'technical',  label:tr('catTechnical'),  icon:'📐'},
    {id:'macro',      label:tr('catMacro'),       icon:'🌍'},
    {id:'quality',    label:tr('catQuality'),     icon:'🏛️'},
  ];
  let html=`<div class="search-box" style="margin-bottom:20px;padding:16px 20px">
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <label style="font-size:10px;color:var(--tx3);letter-spacing:2px;text-transform:uppercase">${tr('priceLbl')}:</label>
      <input class="field-in" id="price-input" type="number" step="0.01"
        placeholder="${tr('priceHolder')}" style="max-width:160px"
        oninput="state.price=parseFloat(this.value)||0;state.inputs.price=this.value"
        value="${state.price||''}"/>
      <span style="font-size:11px;color:var(--tx3)">${tr('priceHint')}</span>
    </div>
  </div>`;
  cats.forEach(cat=>{
    const items=ITEMS.filter(i=>i.cat===cat.id);
    html+=`<div class="analysis-section cat-${cat.id}">
      <div class="section-hdr">
        <span class="section-icon">${cat.icon}</span>
        <span class="section-title">${cat.label}</span>
        <span class="section-count">${items.length} ${tr('itemsSuffix')}</span>
      </div><div class="items-grid">`;
    items.forEach(item=>{
      const mark=state.marks[item.id]||'', val=state.inputs[item.id]||'';
      const label=getItemLabel(item);
      const cc='item-card'+(mark==='ok'?' marked-ok':mark==='bad'?' marked-bad':mark==='watch'?' marked-watch':'');
      const mi=mark==='ok'?'✓':mark==='bad'?'✗':mark==='watch'?'⚠':'·';
      const mc='item-mark'+(mark==='ok'?' ok':mark==='bad'?' bad':mark==='watch'?' watch':'');
      if((item.id==='sharpe'||item.id==='momentum') && val) {
        html += _renderRichMetricCard(item, val, mark, cc, mc, mi, label);
        return;
      }
      // Split multi-metric values into vertical lines
      const _valLines = val ? val.split(' | ').map(function(v){ return v.trim(); }) : [];
      const _valHtml = _valLines.length > 1
        ? _valLines.map(function(v){ return '<div class="item-val-row">'+v+'</div>'; }).join('')
        : (val || tr('notFilled'));
      html+=`<div class="${cc}" onclick="openItem('${item.id}')">
        <div class="item-card-top"><span class="item-name">${label}</span><span class="${mc}">${mi}</span></div>
        <div class="${val?'item-value item-value-v':'item-value-empty'}">${_valHtml}</div>
        <div class="item-desc-short">${item.short}</div>
        <div class="item-explore">${item.icon} ${tr('exploreBtn')} →</div>
      </div>`;
    });
    html+='</div></div>';
  });
  html+=`<div class="analyze-btn-wrap">
    <button class="analyze-btn" onclick="generateAnalysis()">${tr('analyzeBtn')}</button>
    <div class="completion-hint">${tr('completionHint')}</div>
  </div>`;
  document.getElementById('analysis-grid').innerHTML=html;
  // NOTE: do NOT hide results-panel here — let callers decide
}

// Silent re-render: rebuilds cards WITHOUT hiding results or AI analysis
function renderGridSilent(){
  if(!state.ticker) return;
  const grid=document.getElementById('analysis-grid');
  if(!grid) return;
  // Save results-panel and AI result state before re-render
  const rp = document.getElementById('results-panel');
  const rpVisible = rp && rp.classList.contains('visible');
  const aiRes = document.getElementById('ai-result');
  const aiContent = aiRes ? aiRes.innerHTML : '';
  const aiVisible = aiRes ? aiRes.style.display !== 'none' : false;
  renderGrid();
  // Restore results visibility and AI content
  if (rpVisible && rp) rp.classList.add('visible');
  if (aiRes && aiContent) {
    aiRes.innerHTML = aiContent;
    aiRes.style.display = aiVisible ? 'block' : 'none';
  }
}

// ══════════════════════════════════════════════════════════════
// ITEM DETAIL PANEL
// ══════════════════════════════════════════════════════════════
function openItem(id){
  openItemId=id;
  _saveState(); // persist which item is open
  const item=ITEMS.find(i=>i.id===id); if(!item) return;
  const cfg=SECTORS[state.sector]||SECTORS.technology;
  const label=getItemLabel(item);
  const desc =item.desc[state.sector] ||item.desc.default ||'';
  const pos  =item.pos[state.sector]  ||item.pos.default  ||'';
  const red  =item.red[state.sector]  ||item.red.default  ||'';
  const watch=item.watch[state.sector]||item.watch.default||'';
  const note =id==='sector_metric'?(cfg.item10_desc||''):id==='pe'?(cfg.notes_es||''):id==='debt'?(cfg.debt_note||''):'';
  const rawLink = item.link||'';
  const tickerInLink = rawLink.includes('stockanalysis.com') ? state.ticker.toLowerCase() : state.ticker;
  const link = rawLink.replace(/__TICKER__/g, tickerInLink);
  const mark =state.marks[id]||'', val=state.inputs[id]||'';
  const catL={fundamental:tr('catLFundamental'),technical:tr('catLTechnical'),macro:tr('catLMacro'),quality:tr('catLQuality')};
  document.getElementById('dp-category').textContent  =catL[item.cat]||item.cat;
  document.getElementById('dp-title').textContent     =label;
  document.getElementById('dp-sector-note').textContent=note?`ℹ️ ${note}`:'';
  document.getElementById('dp-desc').textContent      =desc;
  document.getElementById('dp-pos').innerHTML         ='🟢 '+pos;
  document.getElementById('dp-red').innerHTML         ='🔴 '+red;
  document.getElementById('dp-watch').innerHTML       ='🟡 '+watch;
  const inp=document.getElementById('dp-input');
  inp.value=val; inp.placeholder=tr('inputPlaceholder');
  inp.oninput=()=>{ state.inputs[id]=inp.value; }; // NO grid re-render on keystroke
  document.getElementById('dp-section-lbl').textContent = tr('whatIsLbl');
  document.getElementById('dp-input-lbl').textContent   = tr('yourDataLbl');
  document.getElementById('dp-mark-ok').textContent     = tr('markOk');
  document.getElementById('dp-mark-bad').textContent    = tr('markBad');
  document.getElementById('dp-mark-watch').textContent  = tr('markWatch');
  ['ok','bad','watch'].forEach(m=>{
    document.getElementById('dp-mark-'+m).className='dp-mark-btn'+(mark===m?' active-'+m:'');
  });
  // Academia button links to matching article
  const acad=ACADEMIA_FULL ? (ACADEMIA_FULL.find(a=>a.id===id)||ACADEMIA_FULL.find(a=>a.cat===item.cat)) : null;
  document.getElementById('dp-academia-btn').textContent = tr('academiaBtn');
  document.getElementById('dp-academia-btn').onclick=()=>{
    // ALWAYS open as modal on top — NEVER navigate away from the current item panel
    openAcadModal(acad ? acad.id : null, item.cat);
  };
  // Primary external link
  const extLink=document.getElementById('dp-ext-link');
  extLink.textContent=(item.link_label ? '🔗 '+item.link_label : tr('source1Lbl'));
  extLink.href=link||'#';

  // Secondary link — dynamic by category (always free)
  const wrap2   =document.getElementById('dp-ext-link2-wrap');
  const extLink2=document.getElementById('dp-ext-link2');
  const note2El =document.getElementById('dp-ext-link2-note');
  const catLinks2={
    fundamental:{url:'https://www.macrotrends.net',         label:'Macrotrends (gratis)',      note:''},
    technical:  {url:'https://www.tradingview.com/chart/?symbol='+state.ticker, label:'TradingView (gratis)', note:''},
    macro:      {url:'https://fred.stlouisfed.org',          label:'FRED Economics (gratis)',   note:''},
    quality:    {url:'https://simplywall.st/stocks?search='+state.ticker, label:'Simply Wall St (⚠ registro)', note:'⚠ Requiere registro gratuito'},
  };
  const cl2=catLinks2[item.cat];
  if(cl2){
    wrap2.style.display='block';
    extLink2.textContent='🔗 '+cl2.label;
    extLink2.href=cl2.url;
    note2El.textContent=cl2.note;
    note2El.style.display=cl2.note?'block':'none';
  } else {
    wrap2.style.display='none';
  }
  document.getElementById('overlay').classList.add('open');
  document.getElementById('detail-panel').classList.add('open');
  _updateBreadcrumb();
  _setHash(activeTab, state.ticker||null, id);
}

function setMark(m){
  if(!openItemId) return;
  state.marks[openItemId]=m;
  ['ok','bad','watch'].forEach(mk=>{
    document.getElementById('dp-mark-'+mk).className='dp-mark-btn'+(m===mk?' active-'+mk:'');
  });
  updateProgress();
}

function closePanel(){
  document.getElementById('overlay').classList.remove('open');
  document.getElementById('detail-panel').classList.remove('open');
  openItemId=null;
  renderGridSilent(); // update cards now that panel is closed
  updateProgress();
  openItemId=null;
  _updateBreadcrumb();
  _setHash(activeTab, state.ticker||null, null);
}

// ══════════════════════════════════════════════════════════════
// GENERATE ANALYSIS
// ══════════════════════════════════════════════════════════════
function generateAnalysis(){
  const res=runValuation(state);
    // Score 1-100 with quality tier
  const sc=res.pct>=80?'var(--green)':res.pct>=60?'#4ade80':res.pct>=40?'var(--yellow)':'var(--red)';
  const scoreTier=res.pct>=80?({es:'Perfil sólido',en:'Strong profile',pt:'Perfil sólido'}[lang]||'Sólido')
    :res.pct>=60?({es:'Perfil positivo',en:'Positive profile',pt:'Perfil positivo'}[lang]||'Positivo')
    :res.pct>=40?({es:'Perfil mixto',en:'Mixed profile',pt:'Perfil misto'}[lang]||'Mixto')
    :({es:'Señales de alerta',en:'Warning signals',pt:'Sinais de alerta'}[lang]||'Alerta');

  // Margin of Safety — human-readable
  let mosHtml='';
  const cp2=parseFloat(state.inputs.price)||state.price||0;
  if(res.mos!=null && res.fv && cp2>0){
    const diff=res.fv-cp2;
    const isDisc=diff>0;
    const pct=Math.abs(res.mos);
    const mCol=res.mos>20?'var(--green)':res.mos>0?'var(--yellow)':'var(--red)';
    const mLbl=isDisc
      ?({es:`Compras con ${pct}% de descuento`,en:`Buying at ${pct}% discount`,pt:`Comprando com ${pct}% desconto`}[lang]||`-${pct}%`)
      :({es:`Pagas ${pct}% por encima del valor`,en:`Paying ${pct}% above value`,pt:`Pagas ${pct}% acima do valor`}[lang]||`+${pct}%`);
    const mDesc=isDisc
      ?({es:`Precio ${cp2.toFixed(0)} · Valor estimado ${res.fv.toFixed(0)} · Margen de seguridad`,en:`Price ${cp2.toFixed(0)} · Fair value ${res.fv.toFixed(0)} · Margin of safety`,pt:`Preço ${cp2.toFixed(0)} · Valor estimado ${res.fv.toFixed(0)} · Margem de segurança`}[lang]||'')
      :({es:`Precio ${cp2.toFixed(0)} · Valor estimado ${res.fv.toFixed(0)} · Cotiza con prima`,en:`Price ${cp2.toFixed(0)} · Fair value ${res.fv.toFixed(0)} · Trading at premium`,pt:`Preço ${cp2.toFixed(0)} · Valor estimado ${res.fv.toFixed(0)} · Com prémio`}[lang]||'');
    const barW=Math.min(100,Math.max(0,isDisc?(1-(cp2/res.fv))*100:0));
    mosHtml=`<div class="res-card" style="grid-column:1/-1">
      <div class="res-card-lbl">${tr('mosLabel')}</div>
      <div style="display:flex;align-items:baseline;gap:10px;margin:6px 0 4px">
        <div class="res-card-val" style="color:${mCol};font-size:24px">${isDisc?'−':'+'}${pct}%</div>
        <div style="font-family:sans-serif;font-size:13px;color:${mCol};font-weight:600">${mLbl}</div>
      </div>
      <div style="font-family:sans-serif;font-size:11px;color:var(--tx3);margin-bottom:8px">${mDesc}</div>
      <div style="background:var(--bg3);border-radius:4px;height:5px;overflow:hidden;margin-bottom:6px">
        <div style="height:100%;width:${barW}%;background:${mCol};border-radius:4px;transition:width .6s ease"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-family:monospace;font-size:9px;color:var(--tx3)">
        <span>${{es:'Precio actual',en:'Current price',pt:'Preço atual'}[lang]||'Precio'}: ${cp2.toFixed(2)}</span>
        <span>${{es:'Valor estimado',en:'Fair value',pt:'Valor estimado'}[lang]||'Valor'}: ${res.fv.toFixed(2)}</span>
      </div>
    </div>`;
  } else if(res.mos!=null){
    const mCol=res.mos>20?'var(--green)':res.mos>0?'var(--yellow)':'var(--red)';
    mosHtml=`<div class="res-card"><div class="res-card-lbl">${tr('mosLabel')}</div>
      <div class="res-card-val" style="color:${mCol}">${res.mos}%</div>
      <div class="res-card-note">${res.mos>20?tr('goodMargin'):res.mos>0?tr('tightMargin'):tr('noMargin')}</div></div>`;
  }

  document.getElementById('res-title').textContent=tr('resTitle');
  document.getElementById('res-grid').innerHTML=`
    <div class="res-card">
      <div class="res-card-lbl">${tr('scoreLabel')}</div>
      <div style="display:flex;align-items:baseline;gap:5px">
        <div class="res-card-val" style="color:${sc}">${res.pct}</div>
        <div style="font-family:monospace;font-size:14px;color:var(--tx3)">/100</div>
      </div>
      <div class="res-card-note" style="color:${sc};font-weight:700">${scoreTier}</div>
      <div class="res-card-note" style="margin-top:4px">${res.ok}✓ &nbsp;${res.bad}✗ &nbsp;${res.watch}⚠</div>
    </div>
    <div class="res-card">
      <div class="res-card-lbl">${tr('filledLabel')}</div>
      <div class="res-card-val" style="color:var(--a3)">${res.total}/${ITEMS.length}</div>
      <div class="res-card-note">${res.filled} ${tr('withData')}</div>
    </div>${mosHtml}`;
document.getElementById('res-scenario').innerHTML=`
    <div class="scenario-card sc-bear"><div class="sc-lbl">${tr('bearLbl')}</div><div class="sc-price">${res.fv_bear?res.fv_bear.toFixed(2):na}</div></div>
    <div class="scenario-card sc-base"><div class="sc-lbl">${tr('baseLbl')}</div><div class="sc-price">${res.fv?res.fv.toFixed(2):na}</div></div>
    <div class="scenario-card sc-bull"><div class="sc-lbl">${tr('bullLbl')}</div><div class="sc-price">${res.fv_bull?res.fv_bull.toFixed(2):na}</div></div>`;
  document.getElementById('res-narrative').innerHTML=res.narrative;
  document.getElementById('res-flags').innerHTML=res.flags.slice(0,14).map(f=>`<div class="flag-item"><span class="flag-icon">${f.icon}</span><span>${f.text}</span></div>`).join('');
  document.getElementById('export-btn').textContent=tr('exportBtn');
  document.getElementById('reset-btn').textContent =tr('resetBtn');
  document.getElementById('results-panel').classList.add('visible');
  document.getElementById('results-panel').scrollIntoView({behavior:'smooth',block:'start'});
  // ── SCORECARD ──────────────────────────────────────────────
  scUpdate();
  drawSpiderChart(res.spiderScores);
  // Reset AI
  document.getElementById('ai-result').style.display='none';
  document.getElementById('ai-result').innerHTML='';
  document.getElementById('ai-loading').style.display='none';
  const _ab=document.getElementById('ai-btn'); if(_ab) _ab.disabled=false;
}

// ══════════════════════════════════════════════════════════════════════
// SPIDER CHART
// ══════════════════════════════════════════════════════════════════════
let _spiderChart=null;
function drawSpiderChart(scores){
  if(!window.Chart) return;
  const canvas=document.getElementById('res-spider'); if(!canvas) return;
  const s=scores||{fundamental:0,technical:0,macro:0,quality:0};
  const labels=['Fundamental',lang==='en'?'Technical':'Técnico','Macro',lang==='en'?'Quality':lang==='pt'?'Qualidade':'Calidad'];
  if(_spiderChart){ _spiderChart.destroy(); _spiderChart=null; }
  _spiderChart=new Chart(canvas.getContext('2d'),{
    type:'radar',
    data:{
      labels,
      datasets:[{
        data:[s.fundamental,s.technical,s.macro,s.quality],
        backgroundColor:'rgba(0,212,170,0.15)',
        borderColor:'rgba(0,212,170,0.8)',
        borderWidth:2,
        pointBackgroundColor:'rgba(0,212,170,1)',
        pointRadius:4,
        pointHoverRadius:6
      }]
    },
    options:{
      responsive:false,
      animation:{duration:700,easing:'easeOutQuart'},
      scales:{r:{min:0,max:100,ticks:{stepSize:25,display:false},grid:{color:'rgba(255,255,255,0.06)'},angleLines:{color:'rgba(255,255,255,0.08)'},pointLabels:{color:'rgba(200,210,220,0.65)',font:{size:10,family:"'IBM Plex Mono',monospace"}}}},
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${c.parsed.r}%`}}}
    }
  });
}


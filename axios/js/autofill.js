// AXIOS·IQ — autofill.js — Yahoo Finance, Hash Routing, Breadcrumb, Global Search, Macro, AI Qualitative

// ══════════════════════════════════════════════════════════════
// AUTO-FILL ENGINE — Yahoo Finance via Cloudflare Worker
// ══════════════════════════════════════════════════════════════

const WORKER_URL = 'https://suite-iq.pedicode-app.workers.dev';

let _afData = null;
let _afTicker = '';

async function _afFetch(ticker) {
  if (!WORKER_URL) return;
  _afData = null;
  _afTicker = ticker;

  const bar  = document.getElementById('autofill-bar');
  const icon = document.getElementById('af-icon');
  const txt  = document.getElementById('af-text');
  const btn  = document.getElementById('af-apply-btn');
  if (!bar) return;

  bar.className = 'autofill-bar visible loading';
  icon.innerHTML = '<div class="af-spinner"></div>';
  txt.innerHTML  = 'Buscando datos de mercado para <strong>' + ticker + '</strong>...';
  btn.style.display = 'none';

  try {
    const res  = await fetch(WORKER_URL + '/yahoo?ticker=' + encodeURIComponent(ticker));
    const json = await res.json();

    if (!json.ok || !json.data) {
      _afShowError(json.error || 'Sin datos para ' + ticker);
      return;
    }

    _afData = json.data;
    const count = _afCountFillable(_afData);
    const t = {
      es: { ready:'Datos disponibles', items:'campos rellenables', apply:'Aplicar datos', price:'Precio' },
      en: { ready:'Data available',    items:'fillable fields',    apply:'Apply data',   price:'Price' },
      pt: { ready:'Dados disponíveis', items:'campos preenchíveis',apply:'Aplicar dados',price:'Preço' },
    }[lang] || { ready:'Datos disponibles', items:'campos rellenables', apply:'Aplicar datos', price:'Precio' };

    bar.className = 'autofill-bar visible';
    icon.textContent = '⚡';

    const priceStr = _afData.price
      ? ' · ' + t.price + ': <span class="af-count">' + _afData.currency + ' ' + _afData.price.toFixed(2) + '</span>' : '';
    const peStr = _afData.pe
      ? ' · P/E: <span class="af-count">' + _afData.pe.toFixed(1) + '</span>' : '';

    txt.innerHTML = '<strong>' + t.ready + '</strong>'
      + ' — <span class="af-count">' + count + '</span> ' + t.items + priceStr + peStr;

    btn.textContent   = t.apply;
    btn.style.display = 'inline-block';

  } catch(err) {
    _afShowError('Error de conexión: ' + err.message);
  }
}

function _afShowError(msg) {
  const bar  = document.getElementById('autofill-bar');
  const icon = document.getElementById('af-icon');
  const txt  = document.getElementById('af-text');
  const btn  = document.getElementById('af-apply-btn');
  if (!bar) return;
  bar.className    = 'autofill-bar visible error';
  icon.textContent = '⚠️';
  txt.innerHTML    = msg;
  btn.style.display = 'none';
  setTimeout(_afDismiss, 5000);
}

function _afDismiss() {
  const bar = document.getElementById('autofill-bar');
  if (bar) bar.className = 'autofill-bar';
}

function _afBuildMap(d, sector) {
  if (!d) return [];
  const map = [];
  const push = (id, raw, mark) => {
    if (raw === null || raw === undefined || raw === '') return;
    map.push({ id, value: String(raw), mark });
  };

  // ── pe: Valoración ────────────────────────────────────────
  if (d.pe !== null) {
    const pe = d.pe;
    const peMark = pe < 0 ? 'bad'
      : (sector==='technology'||sector==='healthcare') ? (pe<15?'ok':pe>40?'bad':'watch')
      : (sector==='financial'||sector==='utilities')   ? (pe<12?'ok':pe>22?'watch':'ok')
      : (pe<12?'ok':pe>25?'bad':'watch');
    let val = 'P/E: '+pe.toFixed(1)+'x';
    if (d.evEbitda) val += ' | EV/EBITDA: '+d.evEbitda.toFixed(1)+'x';
    if (d.fcfYield) val += ' | FCF Yield: '+d.fcfYield.toFixed(1)+'%';
    push('pe', val, peMark);
  }

  // ── rev_growth: Crecimiento ───────────────────────────────
  if (d.revenueGrowth !== null || d.earningsGrowth !== null) {
    let val = '';
    let mark = 'watch';
    if (d.revenueGrowth !== null) {
      val += 'Rev: '+(d.revenueGrowth>0?'+':'')+d.revenueGrowth.toFixed(1)+'%';
      mark = d.revenueGrowth>15?'ok':d.revenueGrowth<0?'bad':'watch';
    }
    if (d.earningsGrowth !== null) {
      val += (val?' | ':'')+'EPS: '+(d.earningsGrowth>0?'+':'')+d.earningsGrowth.toFixed(1)+'%';
      if (d.earningsGrowth>15) mark='ok';
      else if (d.earningsGrowth<0 && mark!=='ok') mark='bad';
    }
    if (val) push('rev_growth', val, mark);
  }

  // ── margins: Márgenes + ROE ───────────────────────────────
  if (d.grossMargin !== null || d.roe !== null) {
    let val = '';
    let mark = 'watch';
    if (d.grossMargin !== null) {
      val += 'Bruto: '+d.grossMargin.toFixed(1)+'%';
      mark = sector==='technology' ? (d.grossMargin>60?'ok':d.grossMargin>40?'watch':'bad')
           : (d.grossMargin>30?'ok':d.grossMargin>15?'watch':'bad');
    }
    if (d.operatingMargin !== null) val += ' | EBIT: '+d.operatingMargin.toFixed(1)+'%';
    if (d.netMargin !== null)       val += ' | Neto: '+d.netMargin.toFixed(1)+'%';
    if (d.roe !== null) {
      val += ' | ROE: '+d.roe.toFixed(1)+'%';
      if (d.roe>15) mark='ok'; else if (d.roe<8 && mark!=='ok') mark='bad';
    }
    if (val) push('margins', val, mark);
  }

  // ── fcf: Free Cash Flow ───────────────────────────────────
  if (d.fcfYield !== null || d.roe !== null) {
    let val = '';
    let mark = 'watch';
    if (d.fcfYield !== null) {
      val += 'FCF Yield: '+d.fcfYield.toFixed(1)+'%';
      mark = d.fcfYield>5?'ok':d.fcfYield>2?'watch':'bad';
    }
    if (d.roa !== null) val += (val?' | ':'')+'ROA: '+d.roa.toFixed(1)+'%';
    if (val) push('fcf', val, mark);
  }

  // ── debt: Balance y Deuda ─────────────────────────────────
  if (d.debtToEquity !== null) {
    const dn = d.debtToEquity / 100;
    const dMark = (sector==='utilities'||sector==='reit'||sector==='financial')
      ? (dn<3?'ok':dn<5?'watch':'bad')
      : (dn<1?'ok':dn<2?'watch':'bad');
    let val = 'D/E: '+dn.toFixed(1)+'x';
    if (d.currentRatio !== null) val += ' | Current: '+d.currentRatio.toFixed(1)+'x';
    push('debt', val, dMark);
  }

  // ── shares: Insiders + Recompras + Short ──────────────────
  if (d.heldByInsiders !== null || d.shortPercent !== null) {
    let val = '';
    let mark = 'watch';
    if (d.heldByInsiders !== null) {
      val += 'Insiders: '+d.heldByInsiders.toFixed(1)+'%';
      if (d.heldByInsiders>5) mark='ok';
    }
    if (d.heldByInstitutions !== null) val += ' | Inst: '+d.heldByInstitutions.toFixed(0)+'%';
    if (d.shortPercent !== null) {
      val += ' | Short: '+d.shortPercent.toFixed(1)+'%';
      if (d.shortPercent>15 && mark!=='ok') mark='bad';
      else if (d.shortPercent<5 && mark==='watch') mark='ok';
    }
    if (d.sharesChange !== null) val += ' | Cambio acciones: '+(d.sharesChange>0?'+':'')+d.sharesChange.toFixed(1)+'%/a';
    if (val) push('shares', val, mark);
  }

  // ── shares_out: Acciones en circulación ─────────────────
  if (d.sharesOutstanding !== null) {
    const fmt = n => n>=1e12?(n/1e12).toFixed(2)+'T':n>=1e9?(n/1e9).toFixed(2)+'B':n>=1e6?(n/1e6).toFixed(1)+'M':(n/1e3).toFixed(0)+'K';
    let val = fmt(d.sharesOutstanding) + ' acciones';
    let mark = 'watch';
    if (d.sharesChange !== null) {
      val += ' | Var: '+(d.sharesChange>0?'+':'')+d.sharesChange.toFixed(1)+'%/año';
      mark = d.sharesChange < -1 ? 'ok' : d.sharesChange > 3 ? 'bad' : 'watch';
    }
    push('shares_out', val, mark);
  }

  // ── debt_level: Nivel de deuda ────────────────────────────
  if (d.debtToEquity !== null || d.totalDebt !== null) {
    const fmt = n => n>=1e12?(n/1e12).toFixed(2)+'T':n>=1e9?(n/1e9).toFixed(1)+'B':n>=1e6?(n/1e6).toFixed(0)+'M':'N/A';
    let val = '';
    let mark = 'watch';
    if (d.debtToEquity !== null) {
      const dn = d.debtToEquity / 100;
      val += 'D/E: '+dn.toFixed(1)+'x';
      mark = (sector==='utilities'||sector==='reit'||sector==='financial') ?
        (dn<3?'ok':dn<5?'watch':'bad') : (dn<1?'ok':dn<2?'watch':'bad');
    }
    if (d.totalDebt !== null) val += (val?' | ':'')+'Deuda: '+fmt(d.totalDebt);
    if (d.totalCash !== null) val += ' | Caja: '+fmt(d.totalCash);
    if (d.currentRatio !== null) val += ' | Current: '+d.currentRatio.toFixed(1)+'x';
    if (val) push('debt_level', val, mark);
  }

  // ── buybacks: Recompras ───────────────────────────────────
  if (d.sharesChange !== null || d.sharesOutstanding !== null) {
    let val = '';
    let mark = 'watch';
    if (d.sharesChange !== null) {
      const sc = d.sharesChange;
      val = sc < 0 ? 'Recomprando: '+Math.abs(sc).toFixed(1)+'%/año ↓'
           : sc > 0 ? 'Diluyendo: +'+sc.toFixed(1)+'%/año ↑'
           : 'Sin cambio en acciones';
      mark = sc < -1 ? 'ok' : sc > 2 ? 'bad' : 'watch';
    }
    if (d.shortPercent !== null) val += (val?' | ':'')+'Short: '+d.shortPercent.toFixed(1)+'%';
    if (val) push('buybacks', val, mark);
  }

  // ── dividend: Dividendo + Historial ──────────────────────
  if (d.dividendYield !== null || d.dividendRate !== null) {
    let val = '';
    if (d.dividendYield !== null) val += d.dividendYield.toFixed(2)+'%';
    if (d.payoutRatio !== null) val += ' | Payout: '+d.payoutRatio.toFixed(0)+'%';
    if (d.fiveYearAvgDivYield !== null && d.fiveYearAvgDivYield > 0)
      val += ' | Media 5a: '+d.fiveYearAvgDivYield.toFixed(2)+'%';
    const dyMark = d.dividendYield > 1 ? 'ok' : 'watch';
    if (val) push('dividend', val, dyMark);
  }

  // ── sector_metric: Rule of 40 / recompras ────────────────
  if (d.ruleOf40 !== null) {
    push('sector_metric', 'Rule of 40: '+d.ruleOf40.toFixed(1),
      d.ruleOf40>=40?'ok':d.ruleOf40>=25?'watch':'bad');
  } else if (d.sharesChange !== null) {
    push('sector_metric', 'Var. acciones: '+(d.sharesChange>0?'+':'')+d.sharesChange.toFixed(1)+'%/año',
      d.sharesChange<-1?'ok':d.sharesChange<1?'watch':'bad');
  }

  // ── trend: Tendencia + MA ─────────────────────────────────
  if (d.week52Position !== null || d.priceVsMa200 !== null) {
    let val = '';
    let mark = 'watch';
    if (d.week52Position !== null) {
      val += '52w: '+d.week52Position.toFixed(0)+'%';
      if (d.week52Low && d.week52High) val += ' ('+d.week52Low.toFixed(0)+'–'+d.week52High.toFixed(0)+')';
      mark = d.week52Position>60?'ok':d.week52Position>30?'watch':'bad';
    }
    if (d.priceVsMa200 !== null) {
      val += (val?' | ':'')+'vs MA200: '+(d.priceVsMa200>0?'+':'')+d.priceVsMa200.toFixed(1)+'%';
      if (d.priceVsMa200>0) mark='ok'; else if (d.priceVsMa200<-15 && mark!=='ok') mark='bad';
    }
    if (d.priceVsMa50 !== null) val += ' | vs MA50: '+(d.priceVsMa50>0?'+':'')+d.priceVsMa50.toFixed(1)+'%';
    if (val) push('trend', val, mark);
  }

  // ── ma200: MA200 proximity chip (only from autofill data) ─────────────────
  if (d.priceVsMa200 !== null && d.price !== null && d.ma200 !== null) {
    const pct200 = d.priceVsMa200;
    let ma200Mark = 'watch';
    let ma200State = '';
    if (pct200 >= 10) {
      ma200Mark = 'ok';
      ma200State = '↑ ' + pct200.toFixed(1) + '% sobre MA200 — tendencia alcista confirmada';
    } else if (pct200 >= 2) {
      ma200Mark = 'ok';
      ma200State = '↑ ' + pct200.toFixed(1) + '% sobre MA200 — precio sano';
    } else if (pct200 >= -2) {
      ma200Mark = 'watch';
      ma200State = '≈ MA200 (±' + Math.abs(pct200).toFixed(1) + '%) — zona de decisión clave';
    } else if (pct200 >= -8) {
      ma200Mark = 'watch';
      ma200State = '↓ ' + Math.abs(pct200).toFixed(1) + '% bajo MA200 — presión bajista';
    } else {
      ma200Mark = 'bad';
      ma200State = '↓ ' + Math.abs(pct200).toFixed(1) + '% bajo MA200 — tendencia bajista';
    }
    const ma200Abs = d.ma200.toFixed(2);
    push('ma200', 'MA200: ' + ma200Abs + ' | ' + ma200State, ma200Mark);
  }

  // ── rsi: Momentum + RSI ───────────────────────────────────
  if (d.rsi14 !== null || d.relMomentum !== null) {
    let val = '';
    let mark = 'watch';
    if (d.rsi14 !== null) {
      const rsi = d.rsi14;
      val += 'RSI(14): '+rsi.toFixed(0)+(rsi<30?' — Sobrevendido':rsi>70?' — Sobrecomprado':' — Neutro');
      mark = rsi<30?'ok':rsi>70?'bad':'watch';
    }
    if (d.relMomentum !== null) {
      val += (val?' | ':'')+'vs S&P: '+(d.relMomentum>0?'+':'')+d.relMomentum.toFixed(1)+'%';
      if (d.relMomentum>10) mark='ok';
      else if (d.relMomentum<-15 && mark!=='ok') mark='bad';
    }
    if (val) push('rsi', val, mark);
  }

  // ── sharpe: Sharpe + Sortino + Volatilidad + MaxDD ──────────
  if (d.sharpeRatio !== null || d.volatility !== null) {
    let val = '', mark = 'watch';
    if (d.sharpeRatio !== null) {
      val += 'Sharpe: ' + d.sharpeRatio.toFixed(2);
      mark = d.sharpeRatio > 1.5 ? 'ok' : d.sharpeRatio > 0.5 ? 'watch' : 'bad';
    }
    if (d.sortinoRatio !== null) val += (val ? ' | ' : '') + 'Sortino: ' + d.sortinoRatio.toFixed(2);
    if (d.volatility !== null) {
      val += (val ? ' | ' : '') + 'Vola: ' + d.volatility.toFixed(1) + '%';
      if (d.volatility < 20 && mark !== 'bad') mark = 'ok';
      else if (d.volatility > 40) mark = 'bad';
    }
    if (d.maxDrawdown !== null) val += (val ? ' | ' : '') + 'MaxDD: ' + d.maxDrawdown.toFixed(1) + '%';
    if (d.riskFreeRate !== null) val += (val ? ' | ' : '') + 'Rf: ' + d.riskFreeRate.toFixed(2) + '%';
    if (val) push('sharpe', val, mark);
  }

  // ── momentum: Momentum multi-período ─────────────────────────
  if (d.momentum1M !== null || d.momentum3M !== null || d.momentum6M !== null || d.momentum12M !== null) {
    const pct = v => (v > 0 ? '+' : '') + v.toFixed(1) + '%';
    let val = '', mark = 'watch';
    if (d.momentum1M  !== null) val += '1M: '  + pct(d.momentum1M);
    if (d.momentum3M  !== null) val += (val ? ' | ' : '') + '3M: '  + pct(d.momentum3M);
    if (d.momentum6M  !== null) val += (val ? ' | ' : '') + '6M: '  + pct(d.momentum6M);
    if (d.momentum12M !== null) val += (val ? ' | ' : '') + '12M: ' + pct(d.momentum12M);
    const periods = [d.momentum1M, d.momentum3M, d.momentum6M, d.momentum12M].filter(v => v !== null);
    const pos = periods.filter(v => v > 0).length;
    mark = pos >= 3 ? 'ok' : pos <= 1 ? 'bad' : 'watch';
    if (val) push('momentum', val, mark);
  }

  // ── support: Soporte/Resistencia + Volumen ────────────────
  if (d.supportResistance || d.volumeAnalysis) {
    let val = '';
    let mark = 'watch';
    if (d.supportResistance) {
      const sr = d.supportResistance;
      val += 'Sop: '+sr.support+' (-'+sr.distToSupport.toFixed(1)+'%)'
           +' | Res: '+sr.resistance+' (+'+sr.distToResistance.toFixed(1)+'%)';
      mark = sr.distToSupport>5?'ok':sr.distToSupport>2?'watch':'bad';
    }
    if (d.volumeAnalysis) {
      const vol = d.volumeAnalysis;
      const fmt = n=>n>=1e9?(n/1e9).toFixed(1)+'B':n>=1e6?(n/1e6).toFixed(1)+'M':(n/1e3).toFixed(0)+'K';
      val += (val?' | ':'')+'Vol ratio: '+vol.ratio.toFixed(2)+'x ('+fmt(vol.avg20)+' avg)';
      if (vol.ratio>1.2 && mark==='watch') mark='ok';
    }
    if (val) push('support', val, mark);
  }

  // ── rates: Tipos + Inflación ──────────────────────────────
  if (d.rates_value !== null || (window._macroCache && window._macroCache.fedFunds)) {
    // Filled by _macroApply — skip here, handled separately
  }

  // ── cycle: Beta + Consenso ────────────────────────────────
  if (d.beta !== null || d.recommendMean !== null) {
    let val = '';
    let mark = 'watch';
    if (d.beta !== null) {
      val += 'Beta: '+d.beta.toFixed(2);
      mark = d.beta<0.8?'ok':d.beta<1.5?'watch':'bad';
    }
    if (d.recommendMean !== null) {
      const rec = d.recommendMean;
      const rl = rec<=1.5?'Compra Fuerte':rec<=2.5?'Compra':rec<=3.5?'Neutral':rec<=4.5?'Venta':'Venta Fuerte';
      val += (val?' | ':'')+'Consenso: '+rl+' ('+rec.toFixed(1)+'/5)';
      if (d.numberOfAnalysts) val += ' — '+d.numberOfAnalysts+' analistas';
      if (rec<=2.0 && mark==='watch') mark='ok';
      else if (rec>=4.0) mark='bad';
    }
    if (d.targetMeanPrice && d.price) {
      const upside = ((d.targetMeanPrice/d.price)-1)*100;
      val += ' | Objetivo: '+d.targetMeanPrice.toFixed(0)+' ('+(upside>0?'+':'')+upside.toFixed(0)+'%)';
    }
    if (val) push('cycle', val, mark);
  }

  // ── currency: Riesgo divisa ───────────────────────────────
  if (d.currency) {
    let val = 'Divisa: '+d.currency;
    let mark = 'watch';
    if (d.currency==='USD') { val += ' — Reserva global'; mark='ok'; }
    else if (d.currency==='EUR') { val += ' — Euro, estable'; mark='ok'; }
    else if (['TRY','ARS','NGN','EGP'].includes(d.currency)) { val += ' — Divisa volátil, riesgo alto'; mark='bad'; }
    push('currency', val, mark);
  }

  // ── Price (special — no es ítem) ─────────────────────────
  if (d.price !== null) {
    map.push({ id:'__price__', value: d.price.toFixed(2), mark: null });
  }

  return map;
}


function _afCountFillable(d) {
  return _afBuildMap(d, state.sector||'technology')
    .filter(function(e){ return e.id !== '__price__'; }).length;
}

function _afApply() {
  if (!_afData) return;
  const mapped = _afBuildMap(_afData, state.sector||'technology');
  let applied = 0;

  mapped.forEach(function(entry) {
    if (entry.id === '__price__') {
      state.price = parseFloat(entry.value) || 0;
      state.inputs.price = entry.value;
      const pi = document.getElementById('price-input');
      if (pi) pi.value = entry.value;
      return;
    }
    state.inputs[entry.id] = entry.value;
    if (entry.mark) state.marks[entry.id] = entry.mark;
    applied++;
  });

  renderGrid();
  _saveState();

  const bar  = document.getElementById('autofill-bar');
  const icon = document.getElementById('af-icon');
  const txt  = document.getElementById('af-text');
  const btn  = document.getElementById('af-apply-btn');
  if (!bar) return;

  const msg = {
    es: ' datos aplicados. Revisa y ajusta los que necesites.',
    en: ' fields applied. Review and adjust as needed.',
    pt: ' campos preenchidos. Revê e ajusta conforme necessário.',
  }[lang] || ' datos aplicados.';

  icon.textContent  = '✅';
  txt.innerHTML     = '<strong>' + applied + '</strong>' + msg;
  btn.style.display = 'none';
  setTimeout(_afDismiss, 4000);
  // Trigger AI qualitative fill for moat/management/governance/regulatory
  setTimeout(_afFillQualitative, 1500);
  // Store data for scorecard
  window._afData = _afData;
  setTimeout(scUpdate, 200);
  // Phase 2: fetch real peer medians in background
  scFetchPeers(_afData, state.sector || 'technology');
}


// ══════════════════════════════════════════════════════════════
// PHASE 3 — HASH ROUTING
// ══════════════════════════════════════════════════════════════
function _getHash(){
  const h=(location.hash||'').replace('#','');
  const parts=h.split('/');
  return {tab:parts[0]||'analyzer', ticker:parts[1]||null, itemId:parts[2]||null};
}

function _setHash(tab,ticker,itemId){
  let hash='#'+(tab||'analyzer');
  if(ticker) hash+='/'+ticker;
  if(itemId)  hash+='/'+itemId;
  if(location.hash!==hash) { try{ history.pushState({hash:hash},'',hash); }catch(e){} }
}

function _restoreFromHash(){
  const h=_getHash();
  if(!h.tab && !h.ticker) return false;
  const validTabs=['analyzer','academy','watchlist'];
  const tab=validTabs.includes(h.tab)?h.tab:'analyzer';
  if(tab==='academy'){
    _applyTab('academy');
    if(h.ticker){
      // could be courseId or articleId
      const isCourse = typeof COURSES !== 'undefined' && COURSES.some(c=>c.id===h.ticker);
      if(isCourse){
        _currentCourseId = h.ticker;
        setTimeout(function(){ renderAcademy(); },100);
      } else {
        setTimeout(function(){ renderAcademy(); setTimeout(function(){ openAcadModal(h.ticker); },200); },100);
      }
    } else {
      _currentCourseId = null;
      setTimeout(renderAcademy,100);
    }
    setTimeout(_updateBreadcrumb,150);
    return true;
  }
  if(tab==='watchlist'){
    _applyTab('watchlist');
    setTimeout(renderWatchlist,100);
    setTimeout(_updateBreadcrumb,150);
    return true;
  }
  if(tab==='analyzer' && h.ticker){
    _loadTickerDB().then(function(){
      const entry=TICKER_DB[h.ticker];
      if(entry){
        state.ticker=h.ticker; state.name=entry[0]; state.sector=entry[1];
        state.country=entry[2]; state.desc=entry[3];
        document.getElementById('ticker-input').value=h.ticker;
        document.getElementById('manual-box').style.display='none';
        const _hs=document.getElementById('home-stats-strip');
        if(_hs) _hs.style.display='none';
        showCompanyHeader(); renderGrid();
        if(h.itemId){ openItemId=h.itemId; setTimeout(function(){ try{openItem(h.itemId);}catch(e){} },200); }
      }
      _applyTab('analyzer');
      _updateBreadcrumb();
    });
    return true;
  }
  return false;
}

// ══════════════════════════════════════════════════════════════
// BREADCRUMBS
// ══════════════════════════════════════════════════════════════
function _updateBreadcrumb(){
  const el=document.getElementById('breadcrumb');
  if(!el) return;
  const tabLabels={
    analyzer:{es:'Analizador',en:'Analyzer',pt:'Analisador'},
    academy:{es:'Academia',en:'Academy',pt:'Academia'},
    watchlist:{es:'Watchlist',en:'Watchlist',pt:'Watchlist'}
  };
  const tabLabel=(tabLabels[activeTab]||tabLabels.analyzer)[lang]||'Analizador';
  let parts=[];
  parts.push('<span class="bc-item bc-link" onclick="_closeAllPanels()">AXIOS·IQ</span>');
  parts.push('<span class="bc-sep">›</span>');
  if(activeTab==='academy'||activeTab==='watchlist'){
    if(activeTab==='academy' && _currentCourseId){
      const _bcCourse = COURSES ? COURSES.find(c=>c.id===_currentCourseId) : null;
      parts.push('<span class="bc-item bc-link" onclick="_closeCourseViewer()">'+tabLabel+'</span>');
      parts.push('<span class="bc-sep">›</span>');
      if(_bcCourse) parts.push('<span class="bc-item bc-current">'+(_bcCourse.emoji)+' '+(_bcCourse.title[lang]||_bcCourse.title.es)+'</span>');
    } else {
      parts.push('<span class="bc-item bc-current">'+tabLabel+'</span>');
    }
  } else {
    if(state.ticker){
      parts.push('<span class="bc-item bc-link" onclick="closePanel()">'+tabLabel+'</span>');
      parts.push('<span class="bc-sep">›</span>');
      const isOpen=!!openItemId;
      parts.push('<span class="bc-item'+(isOpen?' bc-link" onclick="closePanel()"':' bc-current"')+'>'+state.ticker+(state.name?' · '+state.name.split(' ')[0]:'')+'</span>');
      if(isOpen){
        parts.push('<span class="bc-sep">›</span>');
        let itemLabel=openItemId;
        try{
          const itEl=document.querySelector('[data-item-id="'+openItemId+'"] .item-title, #panel-title');
          if(itEl) itemLabel=itEl.textContent.trim().slice(0,40);
        }catch(e){}
        parts.push('<span class="bc-item bc-current">'+itemLabel+'</span>');
      }
    } else {
      parts.push('<span class="bc-item bc-current">'+tabLabel+'</span>');
    }
  }
  el.innerHTML=parts.join('');
}

function _closeAllPanels(){
  try{ closePanel(); }catch(e){}
  state.ticker=''; state.name=''; state.sector='technology';
  try{ document.getElementById('co-header').classList.remove('visible'); }catch(e){}
  try{ document.getElementById('analysis-grid').innerHTML=''; }catch(e){}
  try{ document.getElementById('results-panel').classList.remove('visible'); }catch(e){}
  try{ document.getElementById('ticker-input').value=''; }catch(e){}
  const _hs=document.getElementById('home-stats-strip');
  if(_hs) _hs.style.display='';
  _setHash('analyzer',null,null);
  _updateBreadcrumb();
}

// ══════════════════════════════════════════════════════════════
// GLOBAL SEARCH (Cmd+K / Ctrl+K)
// ══════════════════════════════════════════════════════════════
let _gsSel=-1, _gsItems=[];

function openGlobalSearch(){
  const ov=document.getElementById('gs-overlay');
  if(!ov) return;
  ov.classList.add('open');
  const inp=document.getElementById('gs-input');
  if(inp){ inp.value=''; inp.focus(); }
  _gsSel=-1; _gsItems=[];
  document.getElementById('gs-results').innerHTML='<div class="gs-empty">Escribe para buscar empresas y artículos...</div>';
  _loadTickerDB().catch(function(){});
}

function closeGlobalSearch(){
  const ov=document.getElementById('gs-overlay');
  if(ov) ov.classList.remove('open');
  _gsSel=-1; _gsItems=[];
}

function _gsSearch(q){
  q=(q||'').trim();
  const rEl=document.getElementById('gs-results');
  if(!q){ rEl.innerHTML='<div class="gs-empty">Escribe para buscar...</div>'; _gsItems=[]; return; }
  const qU=q.toUpperCase(), qL=q.toLowerCase();
  _gsItems=[];

  // Ticker results
  if(TICKER_DB){
    const hits=[];
    for(const sym in TICKER_DB){
      if(hits.length>=7) break;
      const e=TICKER_DB[sym];
      const nameU=(e[0]||'').toUpperCase();
      if(sym.startsWith(qU)||sym===qU||nameU.includes(qU)){
        hits.push({type:'ticker',ticker:sym,name:e[0],flag:e[2],sector:e[1],
          score:sym===qU?0:sym.startsWith(qU)?1:2});
      }
    }
    hits.sort(function(a,b){ return a.score-b.score; });
    _gsItems=_gsItems.concat(hits.slice(0,6));
  }

  // Academia results
  if(ACADEMIA_FULL){
    const hits=[];
    for(const art of ACADEMIA_FULL){
      if(hits.length>=5) break;
      const title=((lang==='en'?art.title_en:lang==='pt'?art.title_pt:art.title)||art.title||'').toLowerCase();
      const cat=(art.cat||'').toLowerCase();
      if(title.includes(qL)||cat.includes(qL)||(art.body||'').slice(0,400).toLowerCase().includes(qL)){
        hits.push({type:'article',id:art.id,title:art.title,level:art.level,cat:art.cat,
          score:title.includes(qL)?0:cat.includes(qL)?1:2});
      }
    }
    hits.sort(function(a,b){ return a.score-b.score; });
    _gsItems=_gsItems.concat(hits.slice(0,5));
  }

  if(!_gsItems.length){
    rEl.innerHTML='<div class="gs-empty">— Sin resultados para "'+q+'" —</div>';
    return;
  }
  const tickers=_gsItems.filter(function(x){ return x.type==='ticker'; });
  const articles=_gsItems.filter(function(x){ return x.type==='article'; });
  let out='';
  if(tickers.length){
    out+='<div class="gs-section-hdr">📊 Empresas</div>';
    tickers.forEach(function(r){
      const cfg=SECTORS[r.sector]||SECTORS.technology;
      const idx=_gsItems.indexOf(r);
      out+='<div class="gs-result" onclick="_gsSelect('+idx+')">'
        +'<span class="gs-result-icon">'+r.flag+'</span>'
        +'<div class="gs-result-main">'
        +'<div class="gs-result-title"><strong>'+r.ticker+'</strong> · '+r.name+'</div>'
        +'<div class="gs-result-sub">'+(cfg.label&&cfg.label[lang]||cfg.label||r.sector)+'</div>'
        +'</div><span class="gs-result-tag">TICKER</span></div>';
    });
  }
  if(articles.length){
    out+='<div class="gs-section-hdr">🎓 Academia</div>';
    const lvlMap={beginner:tr('filterBegin'),intermediate:tr('filterMid'),advanced:tr('filterAdv')};
    articles.forEach(function(r){
      const idx=_gsItems.indexOf(r);
      out+='<div class="gs-result" onclick="_gsSelect('+idx+')">'
        +'<span class="gs-result-icon">📄</span>'
        +'<div class="gs-result-main">'
        +'<div class="gs-result-title">'+r.title+'</div>'
        +'<div class="gs-result-sub">'+(lvlMap[r.level]||r.level)+' · '+r.cat+'</div>'
        +'</div><span class="gs-result-tag">ARTÍCULO</span></div>';
    });
  }
  rEl.innerHTML=out;
  _gsSel=-1;
}

function _gsSelect(idx){
  const item=_gsItems[idx];
  if(!item) return;
  closeGlobalSearch();
  if(item.type==='ticker'){
    document.getElementById('ticker-input').value=item.ticker;
    showTab('analyzer');
    setTimeout(lookupTicker,100);
  } else {
    showTab('academy');
    setTimeout(function(){ renderAcademy(); setTimeout(function(){ openAcadModal(item.id); },200); },100);
  }
}

function _gsKeydown(e){
  const items=document.querySelectorAll('#gs-results .gs-result');
  if(e.key==='ArrowDown'){ e.preventDefault(); _gsSel=Math.min(_gsSel+1,items.length-1); items.forEach(function(el,i){ el.classList.toggle('gs-sel',i===_gsSel); }); }
  else if(e.key==='ArrowUp'){ e.preventDefault(); _gsSel=Math.max(_gsSel-1,-1); items.forEach(function(el,i){ el.classList.toggle('gs-sel',i===_gsSel); }); }
  else if(e.key==='Enter'&&_gsSel>=0&&_gsItems[_gsSel]){ _gsSelect(_gsSel); }
  else if(e.key==='Escape'){ closeGlobalSearch(); }
}

document.addEventListener('keydown',function(e){
  if((e.metaKey||e.ctrlKey)&&e.key==='k'){ e.preventDefault();
    const ov=document.getElementById('gs-overlay');
    if(ov&&ov.classList.contains('open')) closeGlobalSearch(); else openGlobalSearch();
  }
});



// ══════════════════════════════════════════════════════════════
// ACADEMIA — COURSE FORMAT
// ══════════════════════════════════════════════════════════════

// Course definitions — loaded from courses.json
let COURSES = null;

// ── Load courses.json ─────────────────────────────────────────
function _loadCourses(callback) {
  if (COURSES) { if(callback) callback(); return; }
  fetch('courses.json')
    .then(r => r.json())
    .then(data => {
      COURSES = data;
      if (callback) callback();
    })
    .catch(err => {
      console.warn('[AXIOS-IQ] Could not load courses.json:', err);
      COURSES = [];
      if (callback) callback();
    });
}

// ── Course progress stored in localStorage ─────────────────────
function _getCourseProgress() {
  try { return JSON.parse(localStorage.getItem('axq_courses') || '{}'); }
  catch(e) { return {}; }
}
function _saveCourseProgress(p) {
  try { localStorage.setItem('axq_courses', JSON.stringify(p)); } catch(e) {}
}
function _isLessonDone(courseId, lessonId) {
  const p = _getCourseProgress();
  return !!(p[courseId] && p[courseId][lessonId]);
}
function _markLessonDone(courseId, lessonId) {
  const p = _getCourseProgress();
  if (!p[courseId]) p[courseId] = {};
  p[courseId][lessonId] = Date.now();
  _saveCourseProgress(p);
}
function _getCourseStats(courseId) {
  const course = COURSES.find(c => c.id === courseId);
  if (!course) return { total: 0, done: 0, pct: 0 };
  const p = _getCourseProgress()[courseId] || {};
  let total = 0, done = 0;
  course.modules.forEach(m => m.lessons.forEach(l => {
    total++;
    if (p[l.id]) done++;
  }));
  return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}
function _isCourseComplete(courseId) {
  const s = _getCourseStats(courseId);
  return s.total > 0 && s.done >= s.total;
}
function _isCourseUnlocked(course) {
  if (!course.requires) return true;
  return _isCourseComplete(course.requires);
}

// ── Current course view state ────────────────────────────────
let _currentCourseId = null;

// ── Render course list ────────────────────────────────────────

// Course hero SVGs
const COURSE_HERO_SVGS = {
  personal_finance: `<svg width="52" height="52" viewBox="0 0 52 52" fill="none">
        <circle cx="26" cy="26" r="22" fill="rgba(167,139,250,.15)" stroke="rgba(167,139,250,.3)" stroke-width="1.5"/>
        <path d="M26 14v2M26 36v2M18 26h2M32 26h-2" stroke="#a78bfa" stroke-width="2" stroke-linecap="round"/>
        <circle cx="26" cy="26" r="6" stroke="#a78bfa" stroke-width="2"/>
        <path d="M22 22l8 8M30 22l-8 8" stroke="#a78bfa" stroke-width="1.5" stroke-linecap="round" opacity=".5"/>
        <path d="M26 20c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" fill="none"/>
        <path d="M26 23v3l2 2" stroke="#a78bfa" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`,
  beginner:         `<svg width="52" height="52" viewBox="0 0 52 52" fill="none">
        <circle cx="26" cy="26" r="22" fill="rgba(34,197,94,.1)" stroke="rgba(34,197,94,.25)" stroke-width="1.5"/>
        <path d="M16 34L26 18l10 16H16z" stroke="#22c55e" stroke-width="2" stroke-linejoin="round" fill="rgba(34,197,94,.15)"/>
        <circle cx="26" cy="26" r="3" fill="#22c55e"/>
        <path d="M20 38h12" stroke="#22c55e" stroke-width="2" stroke-linecap="round" opacity=".5"/>
        <path d="M22 30l4-6 4 6" stroke="#22c55e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>
      </svg>`,
  intermediate:     `<svg width="52" height="52" viewBox="0 0 52 52" fill="none">
        <circle cx="26" cy="26" r="22" fill="rgba(245,158,11,.1)" stroke="rgba(245,158,11,.25)" stroke-width="1.5"/>
        <rect x="16" y="30" width="5" height="8" rx="1.5" fill="rgba(245,158,11,.3)" stroke="#f59e0b" stroke-width="1.5"/>
        <rect x="23" y="24" width="5" height="14" rx="1.5" fill="rgba(245,158,11,.4)" stroke="#f59e0b" stroke-width="1.5"/>
        <rect x="30" y="18" width="5" height="20" rx="1.5" fill="rgba(245,158,11,.55)" stroke="#f59e0b" stroke-width="1.5"/>
        <path d="M16 22l6-5 6 4 6-7" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="34" cy="15" r="2.5" fill="#f59e0b"/>
      </svg>`,
  advanced:         `<svg width="52" height="52" viewBox="0 0 52 52" fill="none">
        <circle cx="26" cy="26" r="22" fill="rgba(239,68,68,.1)" stroke="rgba(239,68,68,.25)" stroke-width="1.5"/>
        <path d="M26 16l2.5 5 5.5.8-4 3.9.9 5.5L26 28.5l-4.9 2.7.9-5.5-4-3.9 5.5-.8z" stroke="#ef4444" stroke-width="2" stroke-linejoin="round" fill="rgba(239,68,68,.2)"/>
        <path d="M20 36h12M23 39h6" stroke="#ef4444" stroke-width="2" stroke-linecap="round" opacity=".5"/>
      </svg>`,
};
function _getCourseHeroSVG(id) {
  return COURSE_HERO_SVGS[id] || '<span style="font-size:52px">📊</span>';
}

function renderAcademyCourses() {
  const el = document.getElementById('academy-content');
  if (!el) return;
  if (!ACADEMIA_FULL) { _loadAcademia(); return; }
  if (!COURSES)       { _loadCourses(renderAcademyCourses); return; }

  let html = '<div class="courses-grid" id="courses-grid" onclick="_courseGridClick(event)">';

  COURSES.forEach(course => {
    const unlocked  = _isCourseUnlocked(course);
    const stats     = _getCourseStats(course.id);
    const completed = _isCourseComplete(course.id);
    const started   = stats.done > 0;

    const titleStr    = course.title[lang]    || course.title.es;
    const subtitleStr = course.subtitle[lang] || course.subtitle.es;
    const badgeLbl    = course.badgeLabel[lang]|| course.badgeLabel.es;

    const ctaCls  = !unlocked ? 'cta-locked' : completed ? 'cta-review' : started ? 'cta-continue' : 'cta-start';
    const ctaLbl  = !unlocked
      ? { es:'🔒 Completa el curso anterior', en:'🔒 Complete previous course', pt:'🔒 Completa o curso anterior' }[lang] || '🔒 Bloqueado'
      : completed
      ? { es:'🏆 Ver certificado', en:'🏆 View certificate', pt:'🏆 Ver certificado' }[lang] || '🏆 Completado'
      : started
      ? { es:'▶ Continuar', en:'▶ Continue', pt:'▶ Continuar' }[lang] || '▶ Continuar'
      : { es:'▶ Empezar', en:'▶ Start', pt:'▶ Começar' }[lang] || '▶ Empezar';

    const lessonsCount = course.modules.reduce((t, m) => t + m.lessons.length, 0);
    const minutesEst   = lessonsCount * 5;

    html += `
    <div class="course-card${!unlocked?' locked':''}${completed?' completed':''}"
         data-courseid="${course.id}" data-locked="${!unlocked}">
      <div class="course-hero" style="background:${course.bgColor}">
        <div class="course-hero-svg" data-course-id="${course.id}">${_getCourseHeroSVG(course.id)}</div>
        ${!unlocked ? '<div class="course-lock-overlay">🔒</div>' : ''}
        ${completed ? '<span class="course-completed-badge">✓ Completado</span>' : ''}
        <div class="course-progress-bar">
          <div class="course-progress-fill" style="width:${stats.pct}%"></div>
        </div>
      </div>
      <div class="course-body">
        <div class="course-level-badge ${course.badge}">${badgeLbl}</div>
        <div class="course-title">${titleStr}</div>
        <div class="course-subtitle">${subtitleStr}</div>
        <div class="course-meta">
          <span class="course-meta-item">📚 ${lessonsCount} ${lang==='pt'?'lições':'lecciones'}</span>
          <span class="course-meta-item">⏱ ~${minutesEst} min</span>
          ${started && !completed ? '<span class="course-meta-item" style="color:var(--a1)">' + stats.done + '/' + stats.total + ' ✓</span>' : ''}
        </div>
        <button class="course-cta ${ctaCls}" data-courseid2="${course.id}" data-locked2="${!unlocked}">
          ${ctaLbl}
        </button>
      </div>
    </div>`;
  });

  html += '</div>';

  // Course viewer (hidden by default)
  html += '<div class="course-viewer" id="course-viewer"></div>';

  el.innerHTML = html;
}

function _showLockMsg(courseId) {
  const course = COURSES.find(c => c.id === courseId);
  if (!course || !course.requires) return;
  const reqCourse = COURSES.find(c => c.id === course.requires);
  if (!reqCourse) return;
  const msg = {
    es: '🔒 Completa primero el curso "' + (reqCourse.title.es) + '" para desbloquear este.',
    en: '🔒 Complete "' + (reqCourse.title.en) + '" first to unlock this course.',
    pt: '🔒 Completa primeiro o curso "' + (reqCourse.title.pt) + '" para desbloquear este.',
  }[lang] || '🔒 Curso bloqueado.';
  // Show as toast
  _showToast(msg, 3500);
}

function _showToast(msg, duration) {
  let t = document.getElementById('_toast');
  if (!t) {
    t = document.createElement('div');
    t.id = '_toast';
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--bg3);border:1px solid var(--border);color:var(--tx2);font-family:"IBM Plex Sans",sans-serif;font-size:13px;padding:10px 20px;border-radius:8px;z-index:999;box-shadow:0 4px 20px rgba(0,0,0,.5);transition:opacity .3s;max-width:400px;text-align:center';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity='0'; }, duration || 3000);
}

// ── Open a course (drill down view) ──────────────────────────
function _openCourse(courseId) {
  _currentCourseId = courseId;
  const course = COURSES.find(c => c.id === courseId);
  if (!course || !ACADEMIA_FULL) return;

  const stats    = _getCourseStats(courseId);
  const completed = _isCourseComplete(courseId);
  const titleStr = course.title[lang] || course.title.es;

  const progLbl = { es:'progreso', en:'progress', pt:'progresso' }[lang] || 'progreso';
  const backLbl = { es:'← Cursos', en:'← Courses', pt:'← Cursos' }[lang] || '← Cursos';

  let html = `
  <div class="course-viewer-header">
    <button class="course-back-btn" onclick="_closeCourseViewer()">${backLbl}</button>
    <div>
      <div class="course-viewer-title">${course.emoji} ${titleStr}</div>
    </div>
    <div class="course-overall-progress">
      <span>${stats.done}/${stats.total} ${progLbl}</span>
      <div class="course-overall-bar">
        <div class="course-overall-fill" id="cv-prog-fill" style="width:${stats.pct}%"></div>
      </div>
      <span>${stats.pct}%</span>
    </div>
  </div>`;

  // Modules
  course.modules.forEach(mod => {
    const modTitle = mod.title[lang] || mod.title.es;
    const modDone  = mod.lessons.filter(l => _isLessonDone(courseId, l.id)).length;

    html += `
    <div class="course-module">
      <div class="course-module-hdr">
        <span class="course-module-icon">${mod.icon}</span>
        <span>${modTitle}</span>
        <span class="course-module-progress">${modDone}/${mod.lessons.length}</span>
      </div>
      <div class="course-lessons">`;

    mod.lessons.forEach((lesson, idx) => {
      const art     = ACADEMIA_FULL.find(a => a.id === lesson.id);
      if (!art) return;
      const title   = (lang==='en'&&art.title_en) ? art.title_en : (lang==='pt'&&art.title_pt) ? art.title_pt : art.title;
      const done    = _isLessonDone(courseId, lesson.id);
      const typeLbl = lesson.ytUrl ? '<span class="lesson-type-badge lesson-yt-badge">▶ Video</span>' : '<span class="lesson-type-badge">📄 Artículo</span>';

      html += `
        <div class="lesson-row${done?' done':''}" onclick="_openLesson('${courseId}','${lesson.id}',${lesson.ytUrl?'"'+lesson.ytUrl+'"':'null'})">
          <div class="lesson-num">${done ? '✓' : (idx+1)}</div>
          <span class="lesson-icon">${art.icon||'📄'}</span>
          <span class="lesson-title">${title}</span>
          ${typeLbl}
          <span class="lesson-done-check">✓</span>
        </div>`;
    });

    html += '</div></div>';
  });

  // Certificate section
  const certTitleTxt = { es:'🏆 ¡Curso completado!', en:'🏆 Course Completed!', pt:'🏆 Curso Concluído!' }[lang] || '🏆 Completado';
  const certSubTxt   = { es:'Has completado todos los módulos. Obtén tu certificado AXIOS·IQ.', en:'You completed all modules. Get your AXIOS·IQ certificate.', pt:'Completaste todos os módulos. Obtém o teu certificado AXIOS·IQ.' }[lang] || '';
  const certBtnTxt   = { es:'🎓 Generar certificado', en:'🎓 Get certificate', pt:'🎓 Gerar certificado' }[lang] || '🎓 Certificado';

  html += `
  <div class="cert-section${completed?' visible':''}" id="cert-section">
    <div style="font-size:48px;margin-bottom:12px">🏆</div>
    <div class="cert-title">${certTitleTxt}</div>
    <div class="cert-subtitle">${certSubTxt}</div>
    <button class="cert-btn" onclick="_generateCertificate('${courseId}')">${certBtnTxt}</button>
  </div>`;

  // Show viewer, hide grid
  const grid   = document.getElementById('courses-grid');
  const viewer = document.getElementById('course-viewer');
  if (grid)   grid.style.display   = 'none';
  if (viewer) { viewer.classList.add('open'); viewer.innerHTML = html; }

  // Update hash
  _setHash('academy', courseId, null);
  _updateBreadcrumb();
}

function _closeCourseViewer() {
  _currentCourseId = null;
  const grid   = document.getElementById('courses-grid');
  const viewer = document.getElementById('course-viewer');
  if (grid)   grid.style.display   = '';
  if (viewer) { viewer.classList.remove('open'); viewer.innerHTML = ''; }
  _setHash('academy', null, null);
  _updateBreadcrumb();
}

function _openLesson(courseId, lessonId, ytUrl) {
  // Mark as done
  _markLessonDone(courseId, lessonId);

  // Open article modal
  if (ACADEMIA_FULL) {
    openAcadModal(lessonId);
  }

  // Refresh lesson row state
  setTimeout(() => {
    const row = document.querySelector(`.lesson-row[onclick*="${lessonId}"]`);
    if (row) {
      row.classList.add('done');
      const num = row.querySelector('.lesson-num');
      if (num) num.textContent = '✓';
      const check = row.querySelector('.lesson-done-check');
      if (check) check.style.opacity = '1';
    }
    // Update progress bar
    const stats = _getCourseStats(courseId);
    const fill  = document.getElementById('cv-prog-fill');
    if (fill) fill.style.width = stats.pct + '%';
    const progSpans = document.querySelectorAll('.course-overall-progress span');
    if (progSpans.length >= 3) {
      progSpans[0].textContent = stats.done + '/' + stats.total + ' ' + ({es:'progreso',en:'progress',pt:'progresso'}[lang]||'progreso');
      progSpans[2].textContent = stats.pct + '%';
    }
    // Show cert section if complete
    if (_isCourseComplete(courseId)) {
      const certSec = document.getElementById('cert-section');
      if (certSec) certSec.classList.add('visible');
    }
    // Refresh module progress counter
    document.querySelectorAll('.course-module').forEach(modEl => {
      const rows = modEl.querySelectorAll('.lesson-row');
      const doneCount = modEl.querySelectorAll('.lesson-row.done').length;
      const progEl = modEl.querySelector('.course-module-progress');
      if (progEl) progEl.textContent = doneCount + '/' + rows.length;
    });
  }, 300);
}

// ── Certificate generation ────────────────────────────────────
function _generateCertificate(courseId) {
  const course   = COURSES.find(c => c.id === courseId);
  if (!course) return;

  const canvas   = document.getElementById('cert-canvas');
  const overlay  = document.getElementById('cert-overlay');
  if (!canvas || !overlay) return;

  const ctx      = canvas.getContext('2d');
  const W = 680, H = 480;
  canvas.width = W; canvas.height = H;

  const titleStr = course.title[lang] || course.title.es;
  const today    = new Date().toLocaleDateString(lang==='pt'?'pt-PT':lang==='en'?'en-US':'es-ES', { year:'numeric', month:'long', day:'numeric' });

  // Background
  ctx.fillStyle = '#070a0e';
  ctx.fillRect(0, 0, W, H);

  // Border gradient
  const borderGrad = ctx.createLinearGradient(0,0,W,H);
  borderGrad.addColorStop(0, '#00d4aa');
  borderGrad.addColorStop(0.5, '#3b82f6');
  borderGrad.addColorStop(1, '#a78bfa');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, W-24, H-24);

  // Inner border
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  ctx.strokeRect(20, 20, W-40, H-40);

  // AXIOS-IQ logo text
  ctx.font = 'bold 22px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#00d4aa';
  ctx.textAlign = 'center';
  ctx.fillText('AXIOS·IQ', W/2, 70);

  ctx.font = '11px "IBM Plex Mono", monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('CERTIFICADO DE FINALIZACIÓN · CERTIFICATE OF COMPLETION', W/2, 92);

  // Divider
  ctx.strokeStyle = 'rgba(0,212,170,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(60, 108); ctx.lineTo(W-60, 108); ctx.stroke();

  // Course emoji
  ctx.font = '56px serif';
  ctx.textAlign = 'center';
  ctx.fillText(course.emoji, W/2, 185);

  // Course title
  ctx.font = 'bold 28px "IBM Plex Sans", sans-serif';
  ctx.fillStyle = '#e2e8f0';
  ctx.textAlign = 'center';
  ctx.fillText(titleStr, W/2, 240);

  // Level badge
  ctx.font = '13px "IBM Plex Sans", sans-serif';
  ctx.fillStyle = '#00d4aa';
  const badgeTxt = course.badgeLabel[lang] || course.badgeLabel.es;
  ctx.fillText('— ' + badgeTxt + ' —', W/2, 268);

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(80, 290); ctx.lineTo(W-80, 290); ctx.stroke();

  // Completion text
  const completionText = {
    es: 'Ha completado satisfactoriamente todos los módulos del curso',
    en: 'Has successfully completed all modules of this course',
    pt: 'Completou com sucesso todos os módulos deste curso',
  }[lang] || 'Ha completado satisfactoriamente todos los módulos';

  ctx.font = '14px "IBM Plex Sans", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText(completionText, W/2, 330);

  // Date
  ctx.font = '12px "IBM Plex Mono", monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText(today, W/2, 360);

  // Bottom seal
  ctx.font = '11px "IBM Plex Mono", monospace';
  ctx.fillStyle = 'rgba(0,212,170,0.5)';
  ctx.fillText('AXIOS·IQ · axiosiq.com · ' + today, W/2, 440);

  overlay.classList.add('open');
}

function _closeCert() {
  const overlay = document.getElementById('cert-overlay');
  if (overlay) overlay.classList.remove('open');
}

function _downloadCert() {
  const canvas = document.getElementById('cert-canvas');
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = 'axios-iq-certificate.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}


function _courseGridClick(e) {
  // Find closest course-card
  const card = e.target.closest('.course-card');
  if (!card) return;
  const courseId = card.dataset.courseid || card.querySelector('[data-courseid]')?.dataset.courseid;
  const locked   = card.dataset.locked === 'true' || card.classList.contains('locked');
  if (!courseId) return;
  if (locked) { _showLockMsg(courseId); } else { _openCourse(courseId); }
}


// ══════════════════════════════════════════════════════════════
// MACRO ENGINE — FRED via Worker /macro endpoint
// Fills: rates, inflation, currency items
// ══════════════════════════════════════════════════════════════

let _macroCache = null;  // cache for the session

async function _macroFetch() {
  if (!WORKER_URL) return;

  // Use cache if available (macro data valid for the whole session)
  if (_macroCache) { _macroApply(_macroCache); return; }

  try {
    const res  = await fetch(WORKER_URL + '/macro');
    const json = await res.json();
    if (!json.ok || !json.data) return;
    _macroCache = json.data;
    _macroApply(_macroCache);
  } catch(e) {
    console.warn('[AXIOS-IQ] Macro fetch failed:', e.message);
  }
}

function _macroApply(macro) {
  if (!macro || !state.ticker) return;

  const ff   = macro.fedFunds;   // Fed Funds Rate
  const t10  = macro.t10y;       // 10Y Treasury
  const eur  = macro.eurusd;     // EUR/USD

  let applied = 0;

  // ── rates — Tipos de interés ──────────────────────────────
  if (ff && ff.value !== null) {
    const rate     = ff.value;
    const trend    = ff.trend;
    const t10val   = t10 ? t10.value : null;
    let val = 'Fed Funds: ' + rate.toFixed(2) + '%';
    if (t10val) val += ' | T10Y: ' + t10val.toFixed(2) + '%';
    val += ' | Tendencia: ' + (trend==='up'?'↑ Subiendo':trend==='down'?'↓ Bajando':'→ Estable');

    // For stocks: high rates = headwind for growth; low = tailwind
    const rateMark = rate > 4.5 ? 'bad'    // high rates = pressure on multiples
                   : rate < 2.0 ? 'ok'     // low rates = cheap money
                   : 'watch';

    if (!state.inputs.rates) {
      state.inputs.rates = val;
      state.marks.rates  = rateMark;
      applied++;
    }
  }

  // ── inflation ─────────────────────────────────────────────
  // We use the Fed Funds trend as a proxy for inflation environment
  if (ff && ff.value !== null) {
    const rate  = ff.value;
    let inflVal = '';
    let inflMark = 'watch';

    if (rate > 4.0) {
      inflVal  = 'Entorno de tipos altos (' + rate.toFixed(2) + '%) — inflación elevada o reciente subida de tipos';
      inflMark = 'bad';
    } else if (rate > 2.0) {
      inflVal  = 'Tipos moderados (' + rate.toFixed(2) + '%) — inflación controlada';
      inflMark = 'watch';
    } else {
      inflVal  = 'Tipos bajos (' + rate.toFixed(2) + '%) — entorno expansivo para acciones';
      inflMark = 'ok';
    }

    if (!state.inputs.inflation) {
      state.inputs.inflation = inflVal;
      state.marks.inflation  = inflMark;
      applied++;
    }
  }

  // ── currency risk — Riesgo divisa ─────────────────────────
  if (state.ticker && _macroCache) {
    // Use ticker currency from Yahoo data if available
    const tickerCurrency = _afData ? _afData.currency : null;
    const eurRate = eur ? eur.value : null;

    let currVal  = '';
    let currMark = 'watch';

    if (tickerCurrency === 'USD') {
      currVal  = 'Empresa en USD — divisa de reserva global. Riesgo divisa mínimo para inversor en USD.';
      currMark = 'ok';
    } else if (tickerCurrency === 'EUR') {
      currVal  = 'Empresa en EUR' + (eurRate ? ' | EUR/USD: ' + eurRate.toFixed(4) : '');
      currMark = 'watch';
    } else if (tickerCurrency) {
      currVal  = 'Divisa: ' + tickerCurrency + (eurRate ? ' | EUR/USD ref: ' + eurRate.toFixed(4) : '');
      currMark = 'watch';
    } else {
      currVal  = eurRate ? 'EUR/USD: ' + eurRate.toFixed(4) : 'Ver exposición geográfica en informe anual';
    }

    if (!state.inputs.currency && currVal) {
      state.inputs.currency = currVal;
      state.marks.currency  = currMark;
      applied++;
    }
  }

  // ── sector_risk — Riesgo sectorial ────────────────────────
  // Use Yahoo recommendation mean + analyst consensus
  if (_afData && !state.inputs.sector_risk) {
    const rec = _afData.recommendMean;   // 1=Strong Buy, 5=Sell
    const nAnalysts = _afData.numberOfAnalysts;
    if (rec !== null) {
      const recLabel = rec <= 1.5 ? 'Compra Fuerte'
                     : rec <= 2.5 ? 'Compra'
                     : rec <= 3.5 ? 'Neutral'
                     : rec <= 4.5 ? 'Venta'
                     : 'Venta Fuerte';
      const recMark  = rec <= 2.0 ? 'ok' : rec >= 4.0 ? 'bad' : 'watch';
      const val = 'Consenso analistas: ' + recLabel
        + (nAnalysts ? ' (' + nAnalysts + ' analistas)' : '')
        + ' | Score: ' + rec.toFixed(1) + '/5';
      state.inputs.sector_risk = val;
      state.marks.sector_risk  = recMark;
      applied++;
    }
  }

  if (applied > 0) {
    renderGrid();
    _saveState();
  }
}


// ══════════════════════════════════════════════════════════════
// AI QUALITATIVE FILL — moat, management, governance, regulatory
// Called after _afApply when Worker is available
// ══════════════════════════════════════════════════════════════
async function _afFillQualitative() {
  if (!WORKER_URL || !_afData || !state.ticker) return;

  // Only fill items that are still empty
  const needsFill = ['moat','management','governance','regulatory']
    .filter(id => !state.inputs[id] || !state.marks[id]);
  if (!needsFill.length) return;

  const d = _afData;
  const sector = state.sector || 'technology';
  const pLang = lang==='en'?'English':lang==='pt'?'Português':'Español';

  const prompt = `Eres un analista financiero experto en análisis cualitativo.
Analiza "${state.name||state.ticker}" (${sector}) con estos datos cuantitativos:
- P/E: ${d.pe?d.pe.toFixed(1):'N/A'}, ROE: ${d.roe?d.roe.toFixed(1)+'%':'N/A'}, Márgenes bruto/neto: ${d.grossMargin?d.grossMargin.toFixed(1)+'%':'N/A'}/${d.netMargin?d.netMargin.toFixed(1)+'%':'N/A'}
- D/E: ${d.debtToEquity?(d.debtToEquity/100).toFixed(1)+'x':'N/A'}, FCF Yield: ${d.fcfYield?d.fcfYield.toFixed(1)+'%':'N/A'}
- Insiders: ${d.heldByInsiders?d.heldByInsiders.toFixed(1)+'%':'N/A'}, Institucional: ${d.heldByInstitutions?d.heldByInstitutions.toFixed(0)+'%':'N/A'}
- Short float: ${d.shortPercent?d.shortPercent.toFixed(1)+'%':'N/A'}, Beta: ${d.beta?d.beta.toFixed(2):'N/A'}
- Consenso analistas: ${d.recommendMean?d.recommendMean.toFixed(1)+'/5':'N/A'} (${d.numberOfAnalysts||'?'} analistas)
- Cambio acciones: ${d.sharesChange?(d.sharesChange>0?'+':'')+d.sharesChange.toFixed(1)+'%/año':'N/A'}
- Rev growth: ${d.revenueGrowth?d.revenueGrowth.toFixed(1)+'%':'N/A'}, EPS growth: ${d.earningsGrowth?d.earningsGrowth.toFixed(1)+'%':'N/A'}

Evalúa estos 4 factores cualitativos INFERIDOS de los datos cuantitativos (no son datos exactos — son estimaciones).
Responde SOLO en ${pLang} con este JSON (sin markdown):
{
  "moat": {"value": "descripción breve de la ventaja competitiva inferida de los márgenes y crecimiento", "mark": "ok|watch|bad"},
  "management": {"value": "evaluación del management inferida de insiders, recompras, ROE y guidance implícito", "mark": "ok|watch|bad"},
  "governance": {"value": "evaluación de gobernanza inferida de estructura accionarial, remuneración implícita y dilución", "mark": "ok|watch|bad"},
  "regulatory": {"value": "evaluación del entorno regulatorio para el sector ${sector} en el contexto actual", "mark": "ok|watch|bad"}
}`;

  try {
    const res = await fetch(WORKER_URL + '/ai', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({prompt, lang})
    });
    if (!res.ok) return;
    const json = await res.json();
    if (!json.ok || !json.analysis) return;

    const a = json.analysis;
    let filled = 0;
    ['moat','management','governance','regulatory'].forEach(id => {
      if (a[id] && a[id].value && !state.inputs[id]) {
        // Prefix with AI indicator
        state.inputs[id] = '🤖 ' + a[id].value;
        state.marks[id]  = a[id].mark || 'watch';
        filled++;
      }
    });

    if (filled > 0) {
      renderGrid();
      _saveState();
      // Show toast
      const msg = {
        es: `🤖 ${filled} ítems cualitativos estimados por IA`,
        en: `🤖 ${filled} qualitative items estimated by AI`,
        pt: `🤖 ${filled} itens qualitativos estimados por IA`,
      }[lang] || `🤖 ${filled} items estimated`;
      _showToast(msg, 4000);
    }
  } catch(e) {
    console.warn('[AXIOS-IQ] Qualitative AI fill failed:', e.message);
  }
}




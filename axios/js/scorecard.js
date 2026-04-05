// AXIOS·IQ — scorecard.js — 5-Block Scorecard (Peers Phase 1+2)

// ══════════════════════════════════════════════════════════════════════════════
// SCORECARD — FASE 1 (Benchmarks fijos por sector)
// ══════════════════════════════════════════════════════════════════════════════

// ── Sector benchmark medians ──────────────────────────────────────────────────
// pe=PER median sector, pb=P/B, gm=Gross Margin %, rg=Rev Growth % YoY,
// de=Debt/Equity (ratio), dy=Dividend Yield %
const SC_BENCH = {
  technology:        {pe:30, pb:6,   gm:60, rg:15, de:0.5, dy:0.5},
  healthcare:        {pe:25, pb:4,   gm:55, rg:10, de:0.8, dy:1.5},
  consumer_cyclical: {pe:22, pb:3,   gm:35, rg: 8, de:1.2, dy:1.5},
  consumer_defensive:{pe:20, pb:4,   gm:40, rg: 5, de:0.8, dy:2.5},
  financial:         {pe:14, pb:1.5, gm:50, rg: 8, de:3.0, dy:3.0},
  reit:              {pe:18, pb:1.5, gm:65, rg: 5, de:2.5, dy:4.0},
  energy:            {pe:16, pb:2,   gm:30, rg: 8, de:1.0, dy:3.5},
  industrial:        {pe:20, pb:3,   gm:35, rg: 8, de:1.2, dy:1.8},
  utilities:         {pe:18, pb:2,   gm:45, rg: 4, de:1.5, dy:3.5},
  telecom:           {pe:16, pb:2,   gm:50, rg: 4, de:1.8, dy:4.0},
  default:           {pe:20, pb:3,   gm:40, rg: 8, de:1.0, dy:2.0},
};

// ── Score 1-5 helpers ─────────────────────────────────────────────────────────
function _scScore(val, breakpoints) {
  // breakpoints: [v5,v4,v3,v2] — above v5=5pts, above v4=4, etc.
  if (val === null || val === undefined || isNaN(val)) return null;
  if (val >= breakpoints[0]) return 5;
  if (val >= breakpoints[1]) return 4;
  if (val >= breakpoints[2]) return 3;
  if (val >= breakpoints[3]) return 2;
  return 1;
}
function _scScoreInv(val, breakpoints) {
  // Inverse: lower is better (e.g. PER, D/E)
  if (val === null || val === undefined || isNaN(val)) return null;
  if (val <= breakpoints[0]) return 5;
  if (val <= breakpoints[1]) return 4;
  if (val <= breakpoints[2]) return 3;
  if (val <= breakpoints[3]) return 2;
  return 1;
}

// ── Build scorecard data from _afData ─────────────────────────────────────────
function scBuildData(d, sector) {
  const b = _scPeerBench || SC_BENCH[sector] || SC_BENCH.default;
  const NA = null;

  // helper: vs-sector ratio score (1=much worse, 3=at parity, 5=much better)
  function vsScore(val, bench, higherBetter) {
    if (val === null || val === undefined || isNaN(val) || !bench) return NA;
    const ratio = val / bench;
    if (higherBetter) {
      if (ratio >= 1.4) return 5;
      if (ratio >= 1.1) return 4;
      if (ratio >= 0.8) return 3;
      if (ratio >= 0.5) return 2;
      return 1;
    } else {
      // lower is better
      if (ratio <= 0.6) return 5;
      if (ratio <= 0.85) return 4;
      if (ratio <= 1.15) return 3;
      if (ratio <= 1.5) return 2;
      return 1;
    }
  }

  // ── BLOQUE 1: PRECIO ─────────────────────────────────────────────────────
  const pe  = d.pe || NA;
  const pb  = d.pb || NA;
  const peScore = pe !== NA && pe > 0 ? _scScoreInv(pe, [b.pe*0.6, b.pe*0.85, b.pe*1.2, b.pe*1.6]) : NA;
  const peVsScore = vsScore(pe, b.pe, false);
  const pbScore = pb !== NA && pb > 0 ? _scScoreInv(pb, [b.pb*0.5, b.pb*0.75, b.pb*1.1, b.pb*1.5]) : NA;
  const pbVsScore = vsScore(pb, b.pb, false);

  // ── BLOQUE 2: DIVIDENDO ──────────────────────────────────────────────────
  const dy   = d.dividendYield;      // %
  const dr   = d.dividendRate;       // absolute €/$
  const po   = d.payoutRatio;        // %
  const avg5 = d.fiveYearAvgDivYield;
  const sc   = d.sharesChange;       // % YoY (negative = buybacks)

  // Dividend score: yield vs sector benchmark
  const dyScore = dy !== null ? _scScore(dy, [b.dy*2, b.dy*1.4, b.dy*0.8, b.dy*0.3]) : NA;
  // Yield vs purchase price — same as yield if no personal price
  const dyPcScore = dyScore;
  // CAGR div 5Y — use 5yr avg yield as proxy: if avg5 available, compare avg5 vs current dy
  const cagrScore = avg5 !== null && avg5 > 0
    ? (avg5 >= dy*0.9 && avg5 <= dy*1.1 ? 3
      : avg5 < dy ? _scScore(dy - avg5, [2,1,0.5,0.1]) // yield growing
      : _scScoreInv(avg5 - dy, [3,2,1,0.5]))            // yield shrinking
    : NA;
  // Payout: ideal 30-65%. 0% = no dividend → NA (not penalized)
  const poScore = (po !== null && po > 0 && dy !== null && dy > 0)
    ? (po <= 30 ? 4 : po <= 65 ? 5 : po <= 80 ? 3 : po <= 95 ? 2 : 1)
    : NA;
  // Buybacks: sc < 0 = buybacks (good), sc > 0 = dilution (bad)
  const bbScore = sc !== null ? _scScoreInv(sc, [-3, -1, 1, 4]) : NA;

  // ── BLOQUE 3: MÁRGENES ───────────────────────────────────────────────────
  const gm = d.grossMargin;
  const gmScore   = gm !== null ? _scScore(gm, [b.gm*1.4, b.gm*1.1, b.gm*0.8, b.gm*0.5]) : NA;
  const gmVsScore = vsScore(gm, b.gm, true);

  // ── BLOQUE 4: CRECIMIENTO ────────────────────────────────────────────────
  const rg  = d.revenueGrowth;   // % YoY
  const eg  = d.earningsGrowth;  // % YoY (BPA proxy)
  const rgScore   = rg !== null ? _scScore(rg, [b.rg*2,  b.rg*1.3, b.rg*0.6, 0]) : NA;
  const rgVsScore = vsScore(rg, b.rg, true);
  const egScore   = eg !== null ? _scScore(eg, [b.rg*2.5, b.rg*1.5, b.rg*0.5, 0]) : NA;
  const egVsScore = vsScore(eg, b.rg * 1.2, true);

  // ── BLOQUE 5: FORTALEZA FINANCIERA ───────────────────────────────────────
  const de = d.debtToEquity !== null ? d.debtToEquity / 100 : null;
  const deScore   = de !== null ? _scScoreInv(de, [b.de*0.4, b.de*0.7, b.de*1.0, b.de*1.5]) : NA;
  const deVsScore = vsScore(de, b.de, false);

  // Format helpers
  const fmt = (v, dec, suf) => v !== null ? v.toFixed(dec) + (suf||'') : null;

  return [
    // Block, color, label, metrics array: [label_es, label_en, value_str, score]
    {
      id:'precio', color:'#3b82f6',
      label:{es:'PRECIO', en:'PRICE'},
      metrics:[
        {id:'pe_abs',    label:{es:'PER actual',        en:'Current P/E'},   val:fmt(pe,1,'x'),        score:peScore},
        {id:'pe_vs',     label:{es:'PER vs sector',     en:'P/E vs sector'}, val:fmt(pe,1,'x'),        score:peVsScore},
        {id:'pb_abs',    label:{es:'P/VC actual',       en:'Current P/B'},   val:fmt(pb,2,'x'),        score:pbScore},
        {id:'pb_vs',     label:{es:'P/VC vs sector',    en:'P/B vs sector'}, val:fmt(pb,2,'x'),        score:pbVsScore},
      ]
    },
    {
      id:'dividendo', color:'#10b981',
      label:{es:'DIVIDENDO', en:'DIVIDEND'},
      metrics:[
        {id:'div_abs',   label:{es:'Dividendo',         en:'Dividend'},      val:dr ? fmt(dr,2) : null, score:dyScore},
        {id:'div_yield', label:{es:'Yield precio compra',en:'Yield on cost'}, val:fmt(dy,2,'%'), score:dyPcScore},
        {id:'div_cagr',  label:{es:'CAGR dividendo',    en:'Div CAGR'},      val:avg5 ? fmt(avg5,2,'% avg5') : null, score:cagrScore},
        {id:'payout',    label:{es:'Payout',            en:'Payout'},        val:fmt(po,0,'%'),          score:poScore},
        {id:'recompras', label:{es:'Recompras',         en:'Buybacks'},      val:sc !== null ? (sc<0?'↓'+Math.abs(sc).toFixed(1)+'%':'↑'+sc.toFixed(1)+'%') : null, score:bbScore},
      ]
    },
    {
      id:'margenes', color:'#f59e0b',
      label:{es:'MÁRGENES', en:'MARGINS'},
      metrics:[
        {id:'gm_abs',    label:{es:'Margen Bruto',      en:'Gross Margin'},  val:fmt(gm,1,'%'),          score:gmScore},
        {id:'gm_vs',     label:{es:'Margen vs sector',  en:'Margin vs sector'}, val:fmt(gm,1,'%'),       score:gmVsScore},
      ]
    },
    {
      id:'crecimiento', color:'#8b5cf6',
      label:{es:'CRECIMIENTO', en:'GROWTH'},
      metrics:[
        {id:'rg_abs',    label:{es:'Crec. Ventas YoY',  en:'Rev Growth YoY'},  val:fmt(rg,1,'%'),         score:rgScore},
        {id:'rg_vs',     label:{es:'Ventas vs sector',  en:'Rev vs sector'},   val:fmt(rg,1,'%'),         score:rgVsScore},
        {id:'eg_abs',    label:{es:'Crec. BPA YoY',     en:'EPS Growth YoY'},  val:fmt(eg,1,'%'),         score:egScore},
        {id:'eg_vs',     label:{es:'BPA vs sector',     en:'EPS vs sector'},   val:fmt(eg,1,'%'),         score:egVsScore},
      ]
    },
    {
      id:'fortaleza', color:'#ef4444',
      label:{es:'FORTALEZA', en:'STRENGTH'},
      metrics:[
        {id:'de_abs',    label:{es:'Deuda/Fondos Propios', en:'Debt/Equity'},  val:fmt(de,2,'x'),         score:deScore},
        {id:'de_vs',     label:{es:'D/FP vs sector',     en:'D/E vs sector'},  val:fmt(de,2,'x'),         score:deVsScore},
      ]
    },
  ];
}

// ── Block points: avg of non-null scores ──────────────────────────────────────
function scBlockPts(metrics) {
  const valid = metrics.filter(m => m.score !== null);
  if (!valid.length) return null;
  const avg = valid.reduce((s,m) => s + m.score, 0) / valid.length;
  return Math.round(avg * 10) / 10;  // one decimal
}

// ── Totals (equiponderado + personalizado) ────────────────────────────────────
let _scMode = 'eq';  // 'eq' | 'custom'
let _scWeights = {precio:20, dividendo:20, margenes:20, crecimiento:20, fortaleza:20};
let _scBlocks = null;  // last computed blocks

function scCalcTotal(blocks, weights) {
  let total = 0, wsum = 0;
  blocks.forEach(b => {
    const pts = scBlockPts(b.metrics);
    if (pts === null) return;
    const w = weights ? (weights[b.id] || 20) : 20;
    total += pts * w;
    wsum  += w;
  });
  return wsum > 0 ? Math.round((total / wsum) * 10) / 10 : null;
}

// ── Star color by score ───────────────────────────────────────────────────────
function scStarColor(score, blockColor) {
  if (score === null) return '#2d3f52';
  if (score >= 4) return blockColor;
  if (score >= 3) return '#f59e0b';
  return '#ef4444';
}

function scTierLabel(score) {
  if (score === null) return '';
  if (score >= 4.5) return (lang==='en'?'Excellent':'Excelente');
  if (score >= 3.5) return (lang==='en'?'Good':'Bueno');
  if (score >= 2.5) return (lang==='en'?'Average':'Medio');
  if (score >= 1.5) return (lang==='en'?'Weak':'Débil');
  return (lang==='en'?'Poor':'Muy débil');
}

// ── Render ────────────────────────────────────────────────────────────────────
function scRender(blocks) {
  _scBlocks = blocks;
  const modeEq = _scMode === 'eq';

  // -- Blocks
  const blocksEl = document.getElementById('sc-blocks');
  if (!blocksEl) return;
  blocksEl.innerHTML = blocks.map(b => {
    const pts = scBlockPts(b.metrics);
    const ptsStr = pts !== null ? pts.toFixed(1) : '—';
    const ptsMax = 5;
    const barSegs = [1,2,3,4,5].map(n => {
      const filled = pts !== null && pts >= n - 0.5;
      return `<div class="sc-bar-seg" style="${filled?'background:'+b.color:''}"></div>`;
    }).join('');

    const metricsHtml = b.metrics.map(m => {
      const sc = m.score;
      const stars = [1,2,3,4,5].map(n => {
        const on = sc !== null && sc >= n;
        return `<div class="sc-star" style="${on?'background:'+b.color:''}"></div>`;
      }).join('');
      const valStr = m.val !== null
        ? `<span class="sc-metric-val">${m.val}</span>`
        : `<span class="sc-metric-val sc-na">—</span>`;
      const ptStr = sc !== null
        ? `<span class="sc-metric-pts" style="color:${scStarColor(sc,b.color)}">${sc}</span>`
        : `<span class="sc-metric-pts sc-na">—</span>`;
      return `<div class="sc-metric">
        <span class="sc-metric-lbl">${b.label ? (lang==='en'?m.label.en:m.label.es) : m.label.es}</span>
        ${valStr}
        ${ptStr}
        <div class="sc-metric-stars">${stars}</div>
      </div>`;
    }).join('');

    return `<div class="sc-block">
      <div class="sc-block-hdr">
        <div>
          <div class="sc-block-name" style="color:${b.color}">${lang==='en'?b.label.en:b.label.es}</div>
        </div>
        <div>
          <span class="sc-block-pts-val" style="color:${b.color}">${ptsStr}</span>
          <span class="sc-block-pts-max">/5</span>
        </div>
      </div>
      <div class="sc-bar-wrap">${barSegs}
        <span class="sc-bar-lbl">pts</span>
      </div>
      <div class="sc-metrics">${metricsHtml}</div>
    </div>`;
  }).join('');

  // -- Totals
  const totalsEl = document.getElementById('sc-totals-row');
  if (!totalsEl) return;

  // Equiponderado card
  const eqTotal = scCalcTotal(blocks, null);
  const eqColor = eqTotal >= 4 ? '#22c55e' : eqTotal >= 3 ? '#f59e0b' : '#ef4444';
  const eqBlocksHtml = blocks.map(b => {
    const pts = scBlockPts(b.metrics);
    return `<div class="sc-total-blk">
      <div class="sc-total-blk-name" style="color:${b.color}">${lang==='en'?b.label.en:b.label.es}</div>
      <div class="sc-total-blk-pts" style="color:${b.color}">${pts!==null?pts.toFixed(1):'—'}</div>
      <div class="sc-total-blk-name">20%</div>
    </div>`;
  }).join('');

  // Personalizado card
  const cuTotal = scCalcTotal(blocks, _scWeights);
  const cuColor = cuTotal >= 4 ? '#22c55e' : cuTotal >= 3 ? '#f59e0b' : '#ef4444';
  const cuBlocksHtml = blocks.map(b => {
    const pts = scBlockPts(b.metrics);
    const wVal = _scWeights[b.id] || 20;
    return `<div class="sc-total-blk">
      <div class="sc-total-blk-name" style="color:${b.color}">${lang==='en'?b.label.en:b.label.es}</div>
      <div class="sc-total-blk-pts" style="color:${b.color}">${pts!==null?pts.toFixed(1):'—'}</div>
      <input class="sc-weight-input" type="number" min="0" max="100" step="5"
        value="${wVal}" onchange="_scWeightChange('${b.id}',this.value)"
        title="${lang==='en'?'Weight %':'Peso %'}">
    </div>`;
  }).join('');

  totalsEl.innerHTML = `
    <div class="sc-total-card">
      <div class="sc-total-mode">${lang==='en'?'Equally weighted (20% each)':'Equiponderado (20% c/bloque)'}</div>
      <div class="sc-total-inner">
        <div class="sc-total-blocks">${eqBlocksHtml}</div>
        <div class="sc-total-score-wrap">
          <div class="sc-total-score-val" style="color:${eqColor}">${eqTotal!==null?eqTotal.toFixed(1):'—'}</div>
          <div class="sc-total-score-sub">/5 ${lang==='en'?'pts':'pts'}</div>
          <div class="sc-total-score-tier" style="color:${eqColor}">${scTierLabel(eqTotal)}</div>
        </div>
      </div>
    </div>
    <div class="sc-total-card">
      <div class="sc-total-mode">${lang==='en'?'Custom weights (edit %)':'Pesos personalizados (edita %)'}</div>
      <div class="sc-total-inner">
        <div class="sc-total-blocks">${cuBlocksHtml}</div>
        <div class="sc-total-score-wrap">
          <div class="sc-total-score-val" style="color:${cuColor}">${cuTotal!==null?cuTotal.toFixed(1):'—'}</div>
          <div class="sc-total-score-sub">/5 pts</div>
          <div class="sc-total-score-tier" style="color:${cuColor}">${scTierLabel(cuTotal)}</div>
        </div>
      </div>
    </div>`;
}

function scSetMode(mode) {
  _scMode = mode;
  document.getElementById('sc-mode-eq').classList.toggle('active', mode==='eq');
  // Update subtitle with peer source info
  const _subEl = document.getElementById('sc-subtitle');
  if (_subEl) {
    if (_scPeerMeta && _scPeerMeta.peers && _scPeerMeta.peers.length) {
      _subEl.textContent = (lang==='en'
        ? '5 blocks · Real sector peers: ' + _scPeerMeta.peers.join(', ')
        : '5 bloques · Peers reales: ' + _scPeerMeta.peers.join(', '));
    } else {
      _subEl.textContent = (lang==='en'
        ? '5 blocks · Score 1–5 · Estimated sector benchmarks'
        : '5 bloques · Puntuación 1–5 · Benchmarks sectoriales estimados');
    }
  }
  document.getElementById('sc-mode-cu').classList.toggle('active', mode==='custom');
  if (_scBlocks) scRender(_scBlocks);
}

function _scWeightChange(blockId, val) {
  _scWeights[blockId] = Math.max(0, Math.min(100, parseFloat(val) || 0));
  if (_scBlocks) scRender(_scBlocks);
}

// ── Public: called from generateAnalysis + _afApply ──────────────────────────
function scUpdate() {
  const d = window._afData;
  if (!d) return;
  const sector = (state && state.sector) || 'default';
  const blocks  = scBuildData(d, sector);
  const hasData = blocks.some(b => b.metrics.some(m => m.score !== null));
  const section = document.getElementById('scorecard-section');
  if (!section) return;
  if (hasData) {
    scRender(blocks);
    section.classList.add('visible');
  } else {
    section.classList.remove('visible');
  }
  // Show report card when data is available

}



// ══════════════════════════════════════════════════════════════════════════════
// SCORECARD FASE 2 — Peers dinámicos
// ══════════════════════════════════════════════════════════════════════════════

let _scPeerBench = null;   // populated by scFetchPeers; null = use SC_BENCH
let _scPeerMeta  = null;   // { peers:[], n, sector } for display

async function scFetchPeers(d, sector) {
  if (!WORKER_URL) return;
  const exclude = d && d.ticker ? d.ticker.toUpperCase() : '';
  const sec = sector || (state && state.sector) || 'technology';

  // Show "cargando peers" badge in scorecard header
  const subEl = document.getElementById('sc-subtitle');
  if (subEl) subEl.textContent = (lang==='en' ? 'Fetching real sector data...' : 'Obteniendo datos del sector...');

  try {
    const resp = await fetch(
      WORKER_URL + '/peers?sector=' + encodeURIComponent(sec) +
      (exclude ? '&exclude=' + encodeURIComponent(exclude) : ''),
      { signal: AbortSignal.timeout(12000) }
    );
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const json = await resp.json();

    if (json.ok && json.medians) {
      // Map medians to SC_BENCH format
      // Worker returns: pe,pb,gm,rg,eg,de,dy
      // SC_BENCH uses: pe,pb,gm,rg,de,dy
      _scPeerBench = {
        pe: json.medians.pe,
        pb: json.medians.pb,
        gm: json.medians.gm,
        rg: json.medians.rg  !== null ? json.medians.rg  : (SC_BENCH[sec]||SC_BENCH.default).rg,
        de: json.medians.de  !== null ? json.medians.de  : (SC_BENCH[sec]||SC_BENCH.default).de,
        dy: json.medians.dy  !== null ? json.medians.dy  : (SC_BENCH[sec]||SC_BENCH.default).dy,
      };
      // Fill nulls from static bench as safety net
      const fallback = SC_BENCH[sec] || SC_BENCH.default;
      Object.keys(_scPeerBench).forEach(k => {
        if (_scPeerBench[k] === null) _scPeerBench[k] = fallback[k];
      });
      _scPeerMeta = { peers: json.peers, n: json.n, sector: json.sector };
      // Re-render scorecard with real peers
      scUpdate();
    } else {
      // Fallback — keep static bench, update badge
      _scPeerBench = null;
      _scPeerMeta  = null;
      if (subEl) subEl.textContent = (lang==='en'
        ? '5 blocks · Score 1–5 per metric · Estimated sector'
        : '5 bloques · Puntuación 1–5 por métrica · Sector estimado');
    }
  } catch(e) {
    _scPeerBench = null;
    _scPeerMeta  = null;
    const subEl2 = document.getElementById('sc-subtitle');
    if (subEl2) subEl2.textContent = (lang==='en'
      ? '5 blocks · Score 1–5 · Estimated sector benchmarks'
      : '5 bloques · Puntuación 1–5 · Benchmarks sectoriales estimados');
  }
}




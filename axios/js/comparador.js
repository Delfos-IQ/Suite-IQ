// AXIOS·IQ — comparador.js — Side-by-side comparison of up to 3 stocks

// ── State ─────────────────────────────────────────────────
var _cmpTickers = [];   // up to 3
var _cmpData    = {};   // { ticker: { yahoo data + scores } }

// ── Render comparador tab ─────────────────────────────────
function renderComparador() {
  var el = document.getElementById('comparador-content');
  if (!el) return;

  var L = {
    title:   lang==='en' ? 'Stock Comparator' : 'Comparador de Acciones',
    sub:     lang==='en' ? 'Compare up to 3 companies side by side' : 'Compara hasta 3 empresas en paralelo',
    add:     lang==='en' ? 'Add company...' : 'Añadir empresa...',
    analyze: lang==='en' ? '⚡ Analyze' : '⚡ Analizar',
    clear:   lang==='en' ? 'Clear all' : 'Limpiar todo',
    max:     lang==='en' ? 'Max. 3 companies' : 'Máx. 3 empresas',
    loading: lang==='en' ? 'Loading...' : 'Cargando...',
  };

  var html = '<div class="cmp-wrap">'
    + '<div class="cmp-header">'
    + '<div><div class="cmp-title">⚖️ '+L.title+'</div>'
    + '<div class="cmp-sub">'+L.sub+' · <span style="color:var(--a2)">'+L.max+'</span></div></div>'
    + (_cmpTickers.length > 0
      ? '<button class="cmp-clear-btn" onclick="cmpClearAll()">'+L.clear+'</button>' : '')
    + '</div>'

    // Ticker input row
    + '<div class="cmp-add-row">';

  for (var i=0; i<3; i++) {
    var t = _cmpTickers[i];
    if (t) {
      html += '<div class="cmp-ticker-pill">'
        + '<span class="cmp-pill-ticker">'+t+'</span>'
        + '<button class="cmp-pill-remove" onclick="cmpRemove(\''+t+'\')">✕</button>'
        + '</div>';
    } else if (_cmpTickers.length < 3) {
      html += '<div class="cmp-add-slot">'
        + '<input class="cmp-ticker-input" id="cmp-input-'+i+'" placeholder="'+L.add+'"'
        + ' onkeydown="if(event.key===\'Enter\')cmpAdd(document.getElementById(\'cmp-input-'+i+'\').value)">'
        + '<button class="cmp-add-btn" onclick="cmpAdd(document.getElementById(\'cmp-input-'+i+'\').value)">+</button>'
        + '</div>';
      break;
    }
  }

  html += (_cmpTickers.length > 0
    ? '<button class="cmp-analyze-btn" id="cmp-analyze-btn" onclick="cmpAnalyze()">'+L.analyze+'</button>'
    : '')
    + '</div>';  // end add-row

  // Results area
  html += '<div class="cmp-results" id="cmp-results">';
  if (_cmpTickers.length === 0) {
    html += '<div class="cmp-empty">Añade hasta 3 acciones para compararlas</div>';
  } else if (Object.keys(_cmpData).length > 0) {
    html += _cmpRenderCards();
  }
  html += '</div></div>';

  el.innerHTML = html;
}

function cmpAdd(val) {
  var ticker = (val || '').trim().toUpperCase().split(' ')[0];
  if (!ticker) return;
  if (_cmpTickers.includes(ticker)) return;
  if (_cmpTickers.length >= 3) return;
  _cmpTickers.push(ticker);
  renderComparador();
}

function cmpRemove(ticker) {
  _cmpTickers = _cmpTickers.filter(function(t){ return t !== ticker; });
  delete _cmpData[ticker];
  renderComparador();
}

function cmpClearAll() {
  _cmpTickers = [];
  _cmpData = {};
  renderComparador();
}

async function cmpAnalyze() {
  if (!WORKER_URL || !_cmpTickers.length) return;
  var btn = document.getElementById('cmp-analyze-btn');
  if (btn) { btn.textContent = '⏳ Cargando...'; btn.disabled = true; }

  _cmpData = {};
  for (var i=0; i<_cmpTickers.length; i++) {
    var ticker = _cmpTickers[i];
    try {
      var resp = await fetch(WORKER_URL + '/yahoo?ticker=' + encodeURIComponent(ticker));
      var json = await resp.json();
      if (json.ok && json.data) {
        var d = json.data;
        var dbEntry = window.TICKER_DB && TICKER_DB[ticker];
        var sector  = dbEntry ? dbEntry[1] : 'default';
        var name    = dbEntry ? dbEntry[0] : ticker;
        var flag    = dbEntry ? dbEntry[2] : '🌐';

        // Build scorecard blocks
        var scData  = typeof scBuildData === 'function' ? scBuildData(d, sector) : [];
        var blocks  = Array.isArray(scData) ? scData : [];

        _cmpData[ticker] = {
          ticker: ticker, name: name, flag: flag, sector: sector,
          d: d, blocks: blocks,
        };
      }
    } catch(e) {
      console.warn('Comparador error:', ticker, e.message);
      _cmpData[ticker] = { ticker: ticker, name: ticker, flag: '🌐', sector: 'default', d: {}, blocks: [], error: e.message };
    }
  }

  var resultsEl = document.getElementById('cmp-results');
  if (resultsEl) resultsEl.innerHTML = _cmpRenderCards();
  if (btn) { btn.textContent = (lang==='en'?'⚡ Re-analyze':'⚡ Re-analizar'); btn.disabled = false; }
}

function _cmpRenderCards() {
  if (!Object.keys(_cmpData).length) return '';

  var blockDefs = [
    { id:'precio',     label:'PRECIO',     color:'#3b82f6',
      metrics:['beta','pe_actual','p_vc'],
      labels: ['BETA','P/E ACTUAL','P/VC'] },
    { id:'accionista', label:'ACCIONISTA',  color:'#64748b',
      metrics:['rentab_div','div_medio_5a','crec_div','payout','recompras'],
      labels: ['RENTAB. DIV. COMPRA','DIV. MEDIO 5A','CREC. DIV.','PAYOUT','RECOMPRA ACCIONES'] },
    { id:'margenes',   label:'MÁRGENES',   color:'#f97316',
      metrics:['m_bruto_5a','m_operativo_5a'],
      labels: ['M. BRUTO 5A','M. OPERATIVO 5A'] },
    { id:'crecimiento',label:'CRECIMIENTO',color:'#22c55e',
      metrics:['crec_ventas_5a','crec_bpa_5a','roi_5a'],
      labels: ['CREC. VENTAS 5A','% CREC. BPA 5A','ROI 5A'] },
    { id:'fortaleza',  label:'FORTALEZA',  color:'#ef4444',
      metrics:['deuda_fp','test_acido','solvencia'],
      labels: ['DEUDA/FP','TEST ÁCIDO','SOLVENCIA'] },
  ];

  var tickers = Object.keys(_cmpData);

  // Helper to extract metric value from Yahoo data
  function getVal(d, metricId) {
    var m = {
      beta:         d.beta,
      pe_actual:    d.pe,
      p_vc:         d.priceToBook,
      rentab_div:   d.dividendYield ? (d.dividendYield.toFixed(2) + '%') : null,
      div_medio_5a: d.fiveYearAvgDivYield ? (d.fiveYearAvgDivYield.toFixed(2) + '%') : null,
      crec_div:     d.dividendGrowth5Y ? (d.dividendGrowth5Y.toFixed(1) + '%') : null,
      payout:       d.payoutRatio ? (d.payoutRatio.toFixed(1) + '%') : null,
      recompras:    d.sharesChange ? ((d.sharesChange > 0 ? '+' : '') + d.sharesChange.toFixed(1) + '%') : null,
      m_bruto_5a:   d.grossMargin ? (d.grossMargin.toFixed(1) + '%') : null,
      m_operativo_5a: d.operatingMargin ? (d.operatingMargin.toFixed(1) + '%') : null,
      crec_ventas_5a: d.revenueGrowth ? (d.revenueGrowth.toFixed(1) + '%') : null,
      crec_bpa_5a:  d.earningsGrowth ? (d.earningsGrowth.toFixed(1) + '%') : null,
      roi_5a:       d.roa ? (d.roa.toFixed(1) + '%') : null,
      deuda_fp:     d.debtToEquity ? (d.debtToEquity.toFixed(1) + '%') : null,
      test_acido:   d.currentRatio ? d.currentRatio.toFixed(2) : null,
      solvencia:    null,
    };
    return m[metricId];
  }

  // Get scorecard block score for a ticker+block
  function getBlockScore(ticker, blockId) {
    var entry = _cmpData[ticker];
    if (!entry || !entry.blocks) return null;
    var block = entry.blocks.find ? entry.blocks.find(function(b){ return b.id===blockId; }) : null;
    if (!block) return null;
    return typeof scBlockPts === 'function' ? scBlockPts(block.metrics) : null;
  }

  var html = '<div class="cmp-cards" style="display:grid;grid-template-columns:repeat('+tickers.length+',1fr);gap:16px;margin-top:20px">';

  tickers.forEach(function(ticker) {
    var entry = _cmpData[ticker];
    var d     = entry.d || {};

    // 52-week range
    var low  = d.week52Low  || 0;
    var high = d.week52High || 0;
    var price= d.price      || 0;
    var rangePct = (high > low && price) ? Math.max(0, Math.min(100, (price-low)/(high-low)*100)) : null;

    html += '<div class="cmp-card">'
      // Card header
      + '<div class="cmp-card-header">'
      + '<div>'
      + '<div class="cmp-card-ticker" style="color:var(--a1)">'+ticker+'</div>'
      + '<div class="cmp-card-market" style="color:var(--tx3);font-size:10px">'+(d.exchange||entry.sector||'')+'</div>'
      + '<div class="cmp-card-name">'+entry.name+'</div>'
      + '<div class="cmp-card-sector" style="color:var(--tx3);font-size:10px">'+entry.sector+'</div>'
      + '</div>'
      + '<button class="cmp-remove-btn" onclick="cmpRemove(\''+ticker+'\')">✕</button>'
      + '</div>'

      // Price
      + '<div class="cmp-price">'
      + (price ? ('<span class="cmp-price-val">'+(price.toLocaleString('es',{minimumFractionDigits:2,maximumFractionDigits:2}))+' </span><span class="cmp-price-cur">'+(d.currency||'USD')+'</span>') : '<span class="cmp-na">N/D</span>')
      + '</div>'

      // 52w range bar
      + '<div class="cmp-range-section">'
      + '<div class="cmp-range-label">RANGO 52 SEMANAS</div>'
      + '<div class="cmp-range-bar"><div class="cmp-range-dot" style="left:'+(rangePct||50)+'%"></div></div>'
      + '<div class="cmp-range-minmax"><span>'+(low?low.toFixed(2):'—')+'</span><span>'+(high?high.toFixed(2):'—')+'</span></div>'
      + '</div>';

    // Score + block bars
    html += '<div class="cmp-score-section">';
    html += '<div class="cmp-score-label">PUNTUACIÓN</div>';

    var totalScore = null;
    blockDefs.forEach(function(blk) {
      var pts = getBlockScore(ticker, blk.id);
      if (pts !== null && totalScore === null) totalScore = 0;
      if (pts !== null) totalScore = (totalScore||0) + pts;

      html += '<div class="cmp-block-row">'
        + '<span class="cmp-block-dot" style="background:'+blk.color+'"></span>'
        + '<span class="cmp-block-name">'+blk.label+'</span>'
        + '<span class="cmp-block-pts">'+(pts !== null ? pts.toFixed(1) : '—')+'</span>'
        + '</div>'
        + '<div class="cmp-block-bar-row"><div class="cmp-block-fill" style="width:'+(pts?Math.min(100,(pts/5)*100):0)+'%;background:'+blk.color+'"></div></div>';
    });

    var scoreStr = totalScore !== null ? totalScore.toFixed(1) : '—';
    html = html.replace('<div class="cmp-score-label">PUNTUACIÓN</div>',
      '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">'
      +'<span class="cmp-score-label">PUNTUACIÓN</span>'
      +'<span class="cmp-score-total" style="color:var(--a2)">'+ scoreStr +'</span></div>');

    html += '</div>';  // end score-section

    // Metric details
    blockDefs.forEach(function(blk) {
      html += '<div class="cmp-metric-block">'
        + '<div class="cmp-metric-block-title" style="color:'+blk.color+'">'+blk.label+'</div>'
        + '<div style="display:flex;justify-content:flex-end;font-size:9px;color:var(--tx3);margin-bottom:6px">SECTOR</div>';
      blk.metrics.forEach(function(mid, j) {
        var val = getVal(d, mid);
        var bench = _cmpGetBenchmark(entry.sector, mid);
        html += '<div class="cmp-metric-row">'
          + '<span class="cmp-metric-name">'+blk.labels[j]+'</span>'
          + '<span class="cmp-metric-val">'+(val !== null && val !== undefined ? val : '<span class="cmp-na">—</span>')+'</span>'
          + '<span class="cmp-metric-bench">'+(bench||'<span class="cmp-na">—</span>')+'</span>'
          + '</div>';
      });
      html += '</div>';
    });

    html += '</div>';  // end cmp-card
  });

  html += '</div>';
  return html;
}

function _cmpGetBenchmark(sector, metricId) {
  var bench = (window.SC_BENCH && SC_BENCH[sector]) || (window.SC_BENCH && SC_BENCH.default) || {};
  var map = {
    pe_actual: bench.pe ? bench.pe.toFixed(0)+'x' : null,
    p_vc:      bench.pb ? bench.pb.toFixed(1)+'x' : null,
    m_bruto_5a:bench.gm ? bench.gm.toFixed(0)+'%' : null,
    rentab_div: bench.dy ? bench.dy.toFixed(1)+'%' : null,
    crec_ventas_5a: bench.rg ? bench.rg.toFixed(0)+'%' : null,
  };
  return map[metricId] || null;
}

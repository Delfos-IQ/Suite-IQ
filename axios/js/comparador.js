// AXIOS·IQ — comparador.js — Company Comparator with AI TOP 3 Ranking
// Section names: PRECIO→VALORACIÓN INTRÍNSECA, ACCIONISTA→POLÍTICA DE CAPITAL
// MÁRGENES→CALIDAD DEL NEGOCIO, CRECIMIENTO→IMPULSO OPERATIVO, FORTALEZA→BLINDAJE FINANCIERO

var _cmpTickers = [];
var _cmpData    = {};
var _cmpAIRank  = null;

// ─── Render entry point ──────────────────────────────────────
function renderComparador() {
  var el = document.getElementById('comparador-content');
  if (!el) return;
  var en = lang === 'en', hasCmp = Object.keys(_cmpData).length > 0;

  el.innerHTML = '<div class="cmp-wrap">'
    + _cmpHeader(en)
    + _cmpInputRow(en)
    + '<div id="cmp-results">' + (hasCmp ? _cmpBuildCards(en) : _cmpEmpty(en)) + '</div>'
    + '</div>';

  // Wire Enter key on input
  for (var i = 0; i < 3; i++) {
    (function(idx) {
      var inp = document.getElementById('cmp-inp-' + idx);
      if (inp) inp.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') cmpAdd(this.value);
      });
    })(i);
  }
}

function _cmpHeader(en) {
  return '<div class="cmp-header">'
    + '<div><div class="cmp-title">⚖️ '
    + (en ? 'Investment Comparator' : 'Comparador de Inversiones') + '</div>'
    + '<div class="cmp-sub">'
    + (en ? 'Up to 3 companies · AI ranks by investment quality'
           : 'Hasta 3 empresas · La IA las clasifica por calidad de inversión')
    + '</div></div>'
    + (_cmpTickers.length
      ? '<button class="cmp-clear-btn" onclick="cmpClearAll()">'
        + (en ? 'Clear all' : 'Limpiar todo') + '</button>' : '')
    + '</div>';
}

function _cmpInputRow(en) {
  var html = '<div class="cmp-add-row">';
  _cmpTickers.forEach(function(t) {
    var d = _cmpData[t] || {};
    html += '<div class="cmp-ticker-pill">'
      + '<span>' + (d.flag || '🌐') + '</span>'
      + '<b class="cmp-pill-tk">' + t + '</b>'
      + (d.name ? '<span class="cmp-pill-nm">' + d.name.split(' ')[0] + '</span>' : '')
      + '<button class="cmp-pill-x" onclick="cmpRemove(\'' + t + '\')">✕</button>'
      + '</div>';
  });
  if (_cmpTickers.length < 3) {
    var i = _cmpTickers.length;
    html += '<div class="cmp-add-slot">'
      + '<input class="cmp-ticker-input" id="cmp-inp-' + i + '" '
      + 'placeholder="' + (en ? 'Ticker…' : 'Ticker…') + '" maxlength="10">'
      + '<button class="cmp-add-btn" '
      + 'onclick="cmpAdd(document.getElementById(\'cmp-inp-' + i + '\').value)">+</button>'
      + '</div>';
  }
  if (_cmpTickers.length > 0) {
    html += '<button class="cmp-analyze-btn" id="cmp-analyze-btn" onclick="cmpAnalyze()">'
      + '🤖 ' + (en ? 'Analyze & Rank' : 'Analizar y Clasificar') + '</button>';
  }
  return html + '</div>';
}

function _cmpEmpty(en) {
  return '<div class="cmp-empty">'
    + '<div style="font-size:52px;margin-bottom:16px">⚖️</div>'
    + '<div style="font-size:17px;font-weight:700;color:var(--tx);margin-bottom:8px">'
    + (en ? 'Add up to 3 companies' : 'Añade hasta 3 empresas') + '</div>'
    + '<div style="font-size:14px;color:var(--tx3);max-width:360px;margin:0 auto;line-height:1.7">'
    + (en ? 'The AI will rank them by investment quality and explain why.'
           : 'La IA las clasificará por calidad inversora y explicará el porqué.')
    + '</div></div>';
}

// ─── Add / Remove / Clear ───────────────────────────────────
function cmpAdd(val) {
  var t = (val || '').trim().toUpperCase().replace(/[^A-Z0-9.]/g, '');
  if (!t || _cmpTickers.indexOf(t) >= 0 || _cmpTickers.length >= 3) return;
  _cmpTickers.push(t);
  _cmpAIRank = null;
  renderComparador();
}
function cmpRemove(ticker) {
  _cmpTickers = _cmpTickers.filter(function(t) { return t !== ticker; });
  delete _cmpData[ticker];
  _cmpAIRank = null;
  renderComparador();
}
function cmpClearAll() { _cmpTickers = []; _cmpData = {}; _cmpAIRank = null; renderComparador(); }

// ─── Analyze ─────────────────────────────────────────────────
async function cmpAnalyze() {
  if (!window.WORKER_URL || !_cmpTickers.length) return;
  var btn = document.getElementById('cmp-analyze-btn');
  var en  = lang === 'en';
  if (btn) { btn.textContent = '⏳ ' + (en ? 'Fetching…' : 'Cargando…'); btn.disabled = true; }

  document.getElementById('cmp-results').innerHTML
    = '<div class="cmp-loading"><div class="cmp-spinner"></div>'
    + (en ? 'Fetching data…' : 'Obteniendo datos…') + '</div>';

  _cmpData = {};
  for (var i = 0; i < _cmpTickers.length; i++) {
    var tk = _cmpTickers[i];
    try {
      var r = await fetch(WORKER_URL + '/yahoo?ticker=' + encodeURIComponent(tk));
      var j = await r.json();
      if (j.ok && j.data) {
        var db  = window.TICKER_DB && TICKER_DB[tk];
        var sec = db ? db[1] : 'default';
        var sc  = typeof scBuildData === 'function' ? scBuildData(j.data, sec) : [];
        _cmpData[tk] = { ticker:tk, name:db?db[0]:tk, flag:db?db[2]:'🌐',
                         sector:sec, d:j.data, blocks:Array.isArray(sc)?sc:[] };
      }
    } catch(e) {
      _cmpData[tk] = { ticker:tk, name:tk, flag:'🌐', sector:'default', d:{}, blocks:[], err:true };
    }
  }

  document.getElementById('cmp-results').innerHTML
    = '<div class="cmp-loading"><div class="cmp-spinner"></div>'
    + (en ? 'AI ranking companies…' : 'La IA clasifica las empresas…') + '</div>';

  await _cmpFetchAIRank();

  document.getElementById('cmp-results').innerHTML = _cmpBuildCards(en);
  if (btn) { btn.textContent = '🤖 ' + (en ? 'Re-analyze' : 'Re-analizar'); btn.disabled = false; }
}

// ─── AI Ranking ──────────────────────────────────────────────
async function _cmpFetchAIRank() {
  if (!window.WORKER_URL || !Object.keys(_cmpData).length) return;
  var summaries = Object.values(_cmpData).map(function(e) {
    var d = e.d || {};
    return e.ticker + ' (' + e.name + ', ' + e.sector + ')'
      + ': PE=' + (d.pe ? d.pe.toFixed(1) : 'N/A')
      + ' PB=' + (d.priceToBook ? d.priceToBook.toFixed(2) : 'N/A')
      + ' Yield=' + (d.dividendYield ? d.dividendYield.toFixed(2) + '%' : 'N/A')
      + ' MargenBruto=' + (d.grossMargin ? d.grossMargin.toFixed(1) + '%' : 'N/A')
      + ' CrecVentas=' + (d.revenueGrowth ? d.revenueGrowth.toFixed(1) + '%' : 'N/A')
      + ' Deuda/FP=' + (d.debtToEquity ? d.debtToEquity.toFixed(0) + '%' : 'N/A')
      + ' ROE=' + (d.roe ? d.roe.toFixed(1) + '%' : 'N/A')
      + ' Beta=' + (d.beta ? d.beta.toFixed(2) : 'N/A');
  }).join('\n');

  var pLang = lang === 'en' ? 'English' : lang === 'pt' ? 'Português' : 'Español';
  var n = Object.keys(_cmpData).length;

  // Build dynamic ranking array string for the prompt
  var rankArr = [];
  for (var i = 1; i <= n; i++) {
    rankArr.push('{"pos":' + i + ',"ticker":"TICKER","verdict":"COMPRAR|VIGILAR|EVITAR","reason":"1 frase"}');
  }

  var prompt = 'Eres analista financiero senior. Clasifica estas ' + n
    + ' empresas por atractivo inversor a largo plazo:\n\n' + summaries
    + '\n\nResponde SOLO en ' + pLang + ' con este JSON exacto sin markdown:\n'
    + '{"ranking":[' + rankArr.join(',') + '],"conclusion":"1 frase resumen riesgo/rentabilidad comparativa"}';

  try {
    var r = await fetch(WORKER_URL + '/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt, lang: lang }),
    });
    if (!r.ok) return;
    var data = await r.json();
    if (data.ok && data.analysis && data.analysis.ranking) _cmpAIRank = data.analysis;
  } catch(e) { console.warn('CMP AI error:', e.message); }
}

// ─── Cards builder ───────────────────────────────────────────
function _cmpBuildCards(en) {

  // Medal definitions
  var MEDALS = [
    { color: '#FFD700', shadow: 'rgba(255,215,0,.4)',  label: '#1' },
    { color: '#B0B8C8', shadow: 'rgba(176,184,200,.3)', label: '#2' },
    { color: '#CD7F32', shadow: 'rgba(205,127,50,.35)', label: '#3' },
  ];

  var VERDICT_CLR = {
    COMPRAR:'#22c55e', BUY:'#22c55e',
    VIGILAR:'#f59e0b', WATCH:'#f59e0b', HOLD:'#f59e0b',
    EVITAR:'#ef4444',  AVOID:'#ef4444', SELL:'#ef4444',
  };

  // Five sections — different from educacionfinanciera
  var SECTIONS = [
    {
      id: 'valoracion',
      label: en ? 'INTRINSIC VALUE' : 'VALORACIÓN INTRÍNSECA',
      color: '#3b82f6',
      rows: [
        { lbl: en?'P/E múltiple':'P/E múltiplo',         fn: function(d){ return d.pe?d.pe.toFixed(1)+'×':null; } },
        { lbl: en?'Price/Book':'Precio/Valor libros',     fn: function(d){ return d.priceToBook?d.priceToBook.toFixed(2)+'×':null; } },
        { lbl: 'EV/EBITDA',                               fn: function(d){ return d.evEbitda?d.evEbitda.toFixed(1)+'×':null; } },
        { lbl: en?'Beta (volatility)':'Beta (volatilidad)',fn: function(d){ return d.beta?d.beta.toFixed(2):null; } },
        { lbl: en?'Analyst target':'Precio objetivo',     fn: function(d){ return d.targetMeanPrice?d.currency+' '+d.targetMeanPrice.toFixed(2):null; } },
      ],
    },
    {
      id: 'capital',
      label: en ? 'CAPITAL POLICY' : 'POLÍTICA DE CAPITAL',
      color: '#8b5cf6',
      rows: [
        { lbl: en?'Dividend yield':'Rentabilidad div.',   fn: function(d){ return d.dividendYield?d.dividendYield.toFixed(2)+'%':null; } },
        { lbl: en?'5Y avg yield':'Yield medio 5A',        fn: function(d){ return d.fiveYearAvgDivYield?d.fiveYearAvgDivYield.toFixed(2)+'%':null; } },
        { lbl: en?'Payout ratio':'Ratio de distribución', fn: function(d){ return d.payoutRatio?d.payoutRatio.toFixed(1)+'%':null; } },
        { lbl: en?'Share dilution':'Dilución accionistas', fn: function(d){ return d.sharesChange!=null?(d.sharesChange>0?'+':'')+d.sharesChange.toFixed(1)+'%':null; } },
        { lbl: 'ROE',                                     fn: function(d){ return d.roe?d.roe.toFixed(1)+'%':null; } },
      ],
    },
    {
      id: 'calidad',
      label: en ? 'BUSINESS QUALITY' : 'CALIDAD DEL NEGOCIO',
      color: '#f97316',
      rows: [
        { lbl: en?'Gross margin':'Margen bruto',          fn: function(d){ return d.grossMargin?d.grossMargin.toFixed(1)+'%':null; } },
        { lbl: en?'EBIT margin':'Margen EBIT',            fn: function(d){ return d.operatingMargin?d.operatingMargin.toFixed(1)+'%':null; } },
        { lbl: en?'Net margin':'Margen neto',             fn: function(d){ return d.netMargin?d.netMargin.toFixed(1)+'%':null; } },
        { lbl: en?'FCF yield':'Rendimiento FCF',          fn: function(d){ return d.fcfYield?d.fcfYield.toFixed(1)+'%':null; } },
        { lbl: 'ROA',                                     fn: function(d){ return d.roa?d.roa.toFixed(1)+'%':null; } },
      ],
    },
    {
      id: 'impulso',
      label: en ? 'OPERATING MOMENTUM' : 'IMPULSO OPERATIVO',
      color: '#22c55e',
      rows: [
        { lbl: en?'Revenue growth':'Crec. de ingresos',   fn: function(d){ return d.revenueGrowth!=null?(d.revenueGrowth>0?'+':'')+d.revenueGrowth.toFixed(1)+'%':null; } },
        { lbl: en?'Earnings growth':'Crec. del beneficio', fn: function(d){ return d.earningsGrowth!=null?(d.earningsGrowth>0?'+':'')+d.earningsGrowth.toFixed(1)+'%':null; } },
        { lbl: en?'52W price position':'Pos. en rango 52S', fn: function(d){ return d.week52Position?d.week52Position.toFixed(0)+'%':null; } },
        { lbl: en?'Momentum 3M':'Impulso 3 meses',        fn: function(d){ return d.momentum3M!=null?(d.momentum3M>0?'+':'')+d.momentum3M.toFixed(1)+'%':null; } },
        { lbl: en?'Analyst score':'Valoración analistas',  fn: function(d){ return d.recommendMean?d.recommendMean.toFixed(1)+'/5':null; } },
      ],
    },
    {
      id: 'blindaje',
      label: en ? 'FINANCIAL SHIELD' : 'BLINDAJE FINANCIERO',
      color: '#ef4444',
      rows: [
        { lbl: en?'Debt/Equity ratio':'Ratio deuda/capital', fn: function(d){ return d.debtToEquity?(d.debtToEquity/100).toFixed(2)+'×':null; } },
        { lbl: en?'Liquidity ratio':'Ratio de liquidez',     fn: function(d){ return d.currentRatio?d.currentRatio.toFixed(2):null; } },
        { lbl: en?'Cash reserves':'Reservas de caja',        fn: function(d){ return d.totalCash?_cmpFmtN(d.totalCash):null; } },
        { lbl: en?'Total debt':'Deuda total',                fn: function(d){ return d.totalDebt?_cmpFmtN(d.totalDebt):null; } },
        { lbl: en?'Short interest':'Posición corta',         fn: function(d){ return d.shortPercent?d.shortPercent.toFixed(1)+'%':null; } },
      ],
    },
  ];

  // Determine card order from AI rank
  var tickers = Object.keys(_cmpData);
  var order   = tickers.slice();
  if (_cmpAIRank && _cmpAIRank.ranking) {
    var ranked = _cmpAIRank.ranking.slice().sort(function(a,b){ return a.pos-b.pos; });
    var sorted = ranked.map(function(r){ return r.ticker; }).filter(function(t){ return tickers.indexOf(t)>=0; });
    tickers.forEach(function(t){ if(sorted.indexOf(t)<0) sorted.push(t); });
    order = sorted;
  }

  // AI conclusion banner
  var html = '';
  if (_cmpAIRank && _cmpAIRank.conclusion) {
    html += '<div class="cmp-ai-banner">'
      + '<span class="cmp-ai-badge">🤖 IA</span>'
      + '<span>' + _cmpAIRank.conclusion + '</span>'
      + '</div>';
  }

  // Score map: our section ids → scorecard block ids
  var SCORE_MAP = { valoracion:'precio', capital:'dividendo', calidad:'margenes', impulso:'crecimiento', blindaje:'fortaleza' };

  html += '<div class="cmp-cards" style="display:grid;grid-template-columns:repeat('
    + order.length + ',1fr);gap:16px;margin-top:16px">';

  order.forEach(function(tk, rank) {
    var e = _cmpData[tk]; if (!e) return;
    var d = e.d || {};
    var medal   = MEDALS[rank] || MEDALS[2];
    var aiEntry = _cmpAIRank && _cmpAIRank.ranking
      ? _cmpAIRank.ranking.find(function(r){ return r.ticker===tk; }) : null;
    var verdict  = aiEntry ? aiEntry.verdict.toUpperCase() : null;
    var vclr     = verdict ? (VERDICT_CLR[verdict] || 'var(--tx3)') : null;

    // 52W range bar
    var lo = d.week52Low||0, hi = d.week52High||0, px = d.price||0;
    var pct = (hi>lo&&px) ? Math.max(0,Math.min(100,(px-lo)/(hi-lo)*100)) : 50;

    html += '<div class="cmp-card" style="border-top:3px solid '+medal.color+';position:relative">';

    // ── Medal circle — absolute top-right ──
    html += '<div class="cmp-medal" style="background:'+medal.color
      + ';box-shadow:0 2px 12px '+medal.shadow+'">'+medal.label+'</div>';

    // ── Card header ──
    html += '<div class="cmp-card-hdr">'
      + '<div class="cmp-card-flag">'+e.flag+'</div>'
      + '<div>'
      + '<div class="cmp-card-ticker">'+tk+'</div>'
      + '<div class="cmp-card-name">'+e.name+'</div>'
      + '<div class="cmp-card-sector">'+e.sector+'</div>'
      + '</div>'
      + '<button class="cmp-remove-btn" onclick="cmpRemove(\''+tk+'\')">✕</button>'
      + '</div>';

    // ── AI verdict ──
    if (aiEntry && verdict) {
      html += '<div class="cmp-verdict" style="border-color:'+vclr+'">'
        + '<span class="cmp-verdict-badge" style="background:'+vclr+'20;color:'+vclr+';border:1px solid '+vclr+'60">'
        + verdict + '</span>'
        + '<span class="cmp-verdict-reason">'+aiEntry.reason+'</span>'
        + '</div>';
    }

    // ── Price ──
    html += '<div class="cmp-price">'
      + (px ? px.toLocaleString('es',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—')
      + ' <span class="cmp-price-cur">'+(d.currency||'USD')+'</span>'
      + '</div>';

    // ── 52W bar ──
    html += '<div class="cmp-range-section">'
      + '<div class="cmp-range-lbl">52W RANGE</div>'
      + '<div class="cmp-range-bar"><div class="cmp-range-dot" style="left:'+pct+'%"></div></div>'
      + '<div class="cmp-range-mm"><span>'+(lo?lo.toFixed(2):'—')+'</span><span>'+(hi?hi.toFixed(2):'—')+'</span></div>'
      + '</div>';

    // ── Score bars per section ──
    html += '<div class="cmp-score-summary">';
    SECTIONS.forEach(function(sec) {
      var sid  = SCORE_MAP[sec.id] || sec.id;
      var blk  = e.blocks && e.blocks.find ? e.blocks.find(function(b){ return b.id===sid; }) : null;
      var pts  = blk && typeof scBlockPts==='function' ? scBlockPts(blk.metrics) : null;
      var bpct = pts ? Math.min(100,(pts/5)*100) : 0;
      html += '<div class="cmp-score-row">'
        + '<span class="cmp-score-dot" style="background:'+sec.color+'"></span>'
        + '<span class="cmp-score-nm">'+sec.label+'</span>'
        + '<div class="cmp-score-bar"><div class="cmp-score-fill" style="width:'+bpct+'%;background:'+sec.color+'"></div></div>'
        + '<span class="cmp-score-pt">'+(pts!==null?pts.toFixed(1):'—')+'</span>'
        + '</div>';
    });
    html += '</div>';

    // ── Detail rows per section ──
    SECTIONS.forEach(function(sec) {
      html += '<div class="cmp-metric-block">'
        + '<div class="cmp-metric-title" style="color:'+sec.color+'">'+sec.label+'</div>';
      sec.rows.forEach(function(row) {
        var val = row.fn(d);
        html += '<div class="cmp-metric-row">'
          + '<span class="cmp-metric-lbl">'+row.lbl+'</span>'
          + '<span class="cmp-metric-val">'+(val!=null?val:'<span style="color:var(--tx4)">—</span>')+'</span>'
          + '</div>';
      });
      html += '</div>';
    });

    html += '</div>'; // end card
  });

  html += '</div>'; // end grid
  return html;
}

function _cmpFmtN(n) {
  if (!n) return null;
  if (n>=1e12) return (n/1e12).toFixed(1)+'T';
  if (n>=1e9)  return (n/1e9).toFixed(1)+'B';
  if (n>=1e6)  return (n/1e6).toFixed(0)+'M';
  return n.toFixed(0);
}

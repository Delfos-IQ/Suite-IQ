// AXIOS·IQ — screener.js — Stock Screener (fixed: no hang, lazy load)

var _scrFilters = { sector:'all', country:'all', minYield:0, maxPE:0 };
var _scrResults  = [];
var _scrPage     = 0;
var _scrInited   = false;    // guard: only build filter UI once
var SCR_PAGE_SIZE = 30;

var _secColors = {
  technology:'#3b82f6', healthcare:'#06b6d4',
  consumer_defensive:'#f59e0b', consumer_cyclical:'#ec4899',
  financial:'#10b981', reit:'#a78bfa', energy:'#f97316',
  industrial:'#8b5cf6', utilities:'#06b6d4', telecom:'#3b82f6',
};

// ── Entry point called by showTab ─────────────────────────
function renderScreener() {
  var el = document.getElementById('screener-content');
  if (!el) return;

  // Only build the shell once
  if (!_scrInited) {
    _scrInited = true;
    _buildScreenerShell(el);
  }
  // Ensure it's visible (showTab handles display:block, but just in case)
}

function _buildScreenerShell(el) {
  var en = lang === 'en';

  el.innerHTML = [
    '<div class="scr-wrap">',
    '<div class="scr-header">',
    '<div class="scr-title">🔍 ' + (en ? 'Stock Screener' : 'Screener de Acciones') + '</div>',
    '<div class="scr-sub">' + (en
      ? 'Filter by sector and country, then score up to 20 companies.'
      : 'Filtra por sector y país, luego puntúa hasta 20 empresas dinámicamente.') + '</div>',
    '</div>',

    // Filters
    '<div class="scr-filters">',
    '<div class="scr-filter-group">',
    '<label class="scr-filter-lbl">Sector</label>',
    '<select class="scr-select" id="scr-sector">',
    _sectorOptions(en),
    '</select></div>',

    '<div class="scr-filter-group">',
    '<label class="scr-filter-lbl">' + (en ? 'Country' : 'País') + '</label>',
    '<select class="scr-select" id="scr-country">',
    '<option value="all">' + (en ? 'All markets' : 'Todos los mercados') + '</option>',
    '<option value="us">🇺🇸 USA (NYSE/NASDAQ)</option>',
    '<option value="eu">🇪🇺 Europa</option>',
    '<option value="uk">🇬🇧 UK (LSE)</option>',
    '<option value="ca">🇨🇦 Canadá (TSX)</option>',
    '<option value="au">🇦🇺 Australia (ASX)</option>',
    '<option value="jp">🇯🇵 Japón</option>',
    '<option value="hk">🇭🇰 Hong Kong</option>',
    '<option value="in">🇮🇳 India (NSE)</option>',
    '</select></div>',

    '<div class="scr-filter-group">',
    '<label class="scr-filter-lbl">Min Yield %</label>',
    '<input type="number" class="scr-input" id="scr-yield" min="0" max="20" step="0.5" value="0" placeholder="0">',
    '</div>',

    '<div class="scr-filter-group">',
    '<label class="scr-filter-lbl">Max P/E</label>',
    '<input type="number" class="scr-input" id="scr-pe" min="0" max="200" step="1" value="" placeholder="—">',
    '</div>',

    '<button class="scr-btn-apply" onclick="scrApplyFilters()">',
    (en ? '🔍 Search' : '🔍 Buscar'),
    '</button>',

    '<button class="scr-btn-score" id="scr-score-btn" style="display:none" onclick="scrScoreSelected()">',
    '⚡ ' + (en ? 'Score selected' : 'Puntuar selección'),
    '</button>',

    '</div>', // end filters

    '<div id="scr-status" class="scr-status-msg">' +
      (en ? 'Apply filters to see results' : 'Aplica filtros para ver resultados') +
    '</div>',
    '<div id="scr-results"></div>',
    '<div id="scr-pagination"></div>',
    '</div>'
  ].join('');

  // Attach events AFTER innerHTML set (avoid inline onchange)
  document.getElementById('scr-sector').addEventListener('change', function(){ /* manual only */ });
  document.getElementById('scr-country').addEventListener('change', function(){ /* manual only */ });
}

function _sectorOptions(en) {
  var pairs = [
    ['all', en?'All sectors':'Todos los sectores'],
    ['technology', en?'Technology':'Tecnología'],
    ['healthcare', en?'Healthcare':'Salud'],
    ['consumer_defensive', en?'Consumer Defensive':'Cons. Defensivo'],
    ['consumer_cyclical', en?'Consumer Cyclical':'Cons. Cíclico'],
    ['financial', en?'Financial':'Financiero'],
    ['reit', 'REIT'],
    ['energy', en?'Energy':'Energía'],
    ['industrial', en?'Industrial':'Industrial'],
    ['utilities', 'Utilities'],
    ['telecom', 'Telecom'],
  ];
  return pairs.map(function(p){
    return '<option value="'+p[0]+'">'+p[1]+'</option>';
  }).join('');
}

// ── Apply filters (called only on button click) ───────────
function scrApplyFilters() {
  if (!TICKER_DB) {
    var status = document.getElementById('scr-status');
    if (status) status.textContent = '⏳ Cargando base de datos...';
    _loadTickerDB().then(function() {
      setTimeout(scrApplyFilters, 0);
    }).catch(function() {
      var s = document.getElementById('scr-status');
      if (s) s.textContent = '❌ Error al cargar tickers';
    });
    return;
  }

  var secEl = document.getElementById('scr-sector');
  var cntEl = document.getElementById('scr-country');
  var yldEl = document.getElementById('scr-yield');
  var peEl  = document.getElementById('scr-pe');

  _scrFilters.sector   = secEl ? secEl.value : 'all';
  _scrFilters.country  = cntEl ? cntEl.value : 'all';
  _scrFilters.minYield = yldEl ? (parseFloat(yldEl.value) || 0) : 0;
  _scrFilters.maxPE    = peEl  ? (parseFloat(peEl.value)  || 0) : 0;

  // Map country filter to flag/suffix pattern
  var countryFlag = {
    us: '🇺🇸', eu: null, uk: '🇬🇧', ca: '🇨🇦',
    au: '🇦🇺', jp: '🇯🇵', hk: '🇭🇰', in: '🇮🇳',
  };
  var euFlags = ['🇩🇪','🇫🇷','🇪🇸','🇮🇹','🇳🇱','🇧🇪','🇵🇹','🇨🇭','🇦🇹','🇸🇪','🇩🇰','🇳🇴','🇫🇮'];
  var targetFlag = countryFlag[_scrFilters.country];

  var prevScores = {};
  _scrResults.forEach(function(r){ if(r._score) prevScores[r.ticker] = r._score; });

  _scrResults = [];
  var keys = Object.keys(TICKER_DB);
  for (var i = 0; i < keys.length; i++) {
    var ticker = keys[i];
    var v = TICKER_DB[ticker];
    if (!v) continue;
    var name   = v[0] || '';
    var sector = v[1] || '';
    var flag   = v[2] || '';

    // Sector filter
    if (_scrFilters.sector !== 'all' && sector !== _scrFilters.sector) continue;

    // Country filter
    if (_scrFilters.country !== 'all') {
      if (_scrFilters.country === 'eu') {
        if (euFlags.indexOf(flag) < 0) continue;
      } else if (targetFlag && flag !== targetFlag) {
        continue;
      }
    }

    _scrResults.push({
      ticker: ticker, name: name, sector: sector, flag: flag,
      _score: prevScores[ticker] || null,
    });
  }

  _scrPage = 0;
  // Defer render to next frame to keep UI responsive
  var status = document.getElementById('scr-status');
  if (status) status.textContent = '';
  requestAnimationFrame(scrRenderResults);
}

function scrRenderResults() {
  var el    = document.getElementById('scr-results');
  var pagEl = document.getElementById('scr-pagination');
  var en    = lang === 'en';
  if (!el) return;

  var total = _scrResults.length;
  var status = document.getElementById('scr-status');

  if (!total) {
    el.innerHTML = '';
    if (status) status.textContent = en ? 'No results for this filter.' : 'Sin resultados para estos filtros.';
    if (pagEl) pagEl.innerHTML = '';
    _updateScoreBtn();
    return;
  }

  if (status) status.textContent = total + (en ? ' companies found' : ' empresas encontradas');

  var pages = Math.ceil(total / SCR_PAGE_SIZE);
  var slice = _scrResults.slice(_scrPage * SCR_PAGE_SIZE, (_scrPage + 1) * SCR_PAGE_SIZE);

  var rows = slice.map(function(r) {
    var sc    = _secColors[r.sector] || '#64748b';
    var scored = r._score;
    var scoreCell = scored
      ? ('<td class="scr-score-cell" style="color:'+(scored.total>=70?'var(--green)':scored.total>=45?'var(--yellow)':'var(--red)')+'">'+scored.total+'</td>'
        + '<td class="scr-metric">'+(scored.pe||'—')+'</td>'
        + '<td class="scr-metric">'+(scored.yield||'—')+'</td>'
        + '<td class="scr-metric">'+(scored.marg||'—')+'</td>'
        + '<td class="scr-metric">'+(scored.crec||'—')+'</td>')
      : '<td colspan="5" class="scr-unscoredcell">'+(en?'Select + score':'Selecciona + puntuar')+'</td>';

    return '<tr class="scr-row">'
      + '<td><input type="checkbox" class="scr-check" data-ticker="'+r.ticker+'"></td>'
      + '<td class="scr-company"><b class="scr-ticker">'+r.ticker+'</b> <span class="scr-name">'+r.name+'</span></td>'
      + '<td><span class="scr-sector-tag" style="background:'+sc+'18;color:'+sc+'">'+r.sector+'</span></td>'
      + '<td>'+r.flag+'</td>'
      + scoreCell
      + '</tr>';
  }).join('');

  el.innerHTML = '<table class="scr-table"><thead><tr>'
    + '<th><input type="checkbox" id="scr-check-all"></th>'
    + '<th>'+(en?'Company':'Empresa')+'</th>'
    + '<th>Sector</th>'
    + '<th>'+(en?'Market':'Mercado')+'</th>'
    + '<th>Score</th><th>P/E</th><th>Yield</th>'
    + '<th>'+(en?'Margins':'Márgenes')+'</th>'
    + '<th>'+(en?'Growth':'Crec.')+'</th>'
    + '</tr></thead><tbody>'+rows+'</tbody></table>';

  // Attach checkbox events after render
  var checkAll = document.getElementById('scr-check-all');
  if (checkAll) checkAll.addEventListener('change', function(){ scrToggleAll(this.checked); });
  document.querySelectorAll('.scr-check').forEach(function(cb){
    cb.addEventListener('change', _updateScoreBtn);
  });

  // Pagination
  if (pagEl) {
    if (pages > 1) {
      var pags = [];
      for (var i=0; i<pages; i++) {
        pags.push('<button class="scr-pag-btn'+(i===_scrPage?' active':'')+'" data-page="'+i+'">'+(i+1)+'</button>');
      }
      pagEl.innerHTML = '<div class="scr-pag-row">'+pags.join('')+'</div>';
      pagEl.querySelectorAll('.scr-pag-btn').forEach(function(btn){
        btn.addEventListener('click', function(){ scrGoPage(parseInt(this.dataset.page)); });
      });
    } else {
      pagEl.innerHTML = '';
    }
  }

  _updateScoreBtn();
}

function _updateScoreBtn() {
  var selected = document.querySelectorAll('.scr-check:checked').length;
  var btn = document.getElementById('scr-score-btn');
  var en  = lang === 'en';
  if (!btn) return;
  if (selected > 0) {
    btn.style.display = 'inline-flex';
    var label = '⚡ ' + (en ? 'Score ' : 'Puntuar ') + Math.min(selected,20);
    if (selected > 20) label += ' (max 20)';
    btn.textContent = label;
    btn.style.opacity = selected > 20 ? '.6' : '1';
  } else {
    btn.style.display = 'none';
  }
}

function scrToggleAll(checked) {
  document.querySelectorAll('.scr-check').forEach(function(cb){ cb.checked = checked; });
  _updateScoreBtn();
}

async function scrScoreSelected() {
  if (!window.WORKER_URL) { _showToast('Worker URL no configurada', 2000); return; }
  var checkboxes = Array.from(document.querySelectorAll('.scr-check:checked')).slice(0, 20);
  var tickers    = checkboxes.map(function(cb){ return cb.dataset.ticker; });
  if (!tickers.length) return;

  var btn = document.getElementById('scr-score-btn');
  if (btn) { btn.textContent = '⏳ Cargando...'; btn.disabled = true; }

  for (var i = 0; i < tickers.length; i++) {
    var ticker = tickers[i];
    try {
      var resp = await fetch(WORKER_URL + '/yahoo?ticker=' + encodeURIComponent(ticker));
      var json = await resp.json();
      if (json.ok && json.data) {
        var d      = json.data;
        var dbEntry= TICKER_DB && TICKER_DB[ticker];
        var sector = dbEntry ? dbEntry[1] : 'default';
        var scData = typeof scBuildData === 'function' ? scBuildData(d, sector) : [];
        var idx    = _scrResults.findIndex(function(r){ return r.ticker===ticker; });
        if (idx >= 0) {
          var total  = typeof scCalcTotal === 'function' ? Math.round(scCalcTotal(scData)*10) : 0;
          var marg   = scData.find ? scData.find(function(b){return b.id==='margenes';}) : null;
          var crec   = scData.find ? scData.find(function(b){return b.id==='crecimiento';}) : null;
          _scrResults[idx]._score = {
            total: total,
            pe:    d.pe    ? d.pe.toFixed(1)+'x'      : '—',
            yield: d.dividendYield ? d.dividendYield.toFixed(2)+'%' : '—',
            marg:  marg && typeof scBlockPts==='function' ? scBlockPts(marg.metrics).toFixed(1) : '—',
            crec:  crec && typeof scBlockPts==='function' ? scBlockPts(crec.metrics).toFixed(1) : '—',
          };
        }
      }
    } catch(e) { console.warn('Screener score error:', ticker, e.message); }
  }

  requestAnimationFrame(scrRenderResults);
  if (btn) { btn.textContent = '✓ '+(lang==='en'?'Scored':'Puntuadas'); btn.disabled = false; }
}

function scrGoPage(p) {
  _scrPage = p;
  requestAnimationFrame(scrRenderResults);
}

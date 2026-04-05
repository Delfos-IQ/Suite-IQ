// AXIOS·IQ — screener.js — Stock Screener (static filter + dynamic scoring)

// ── Screener state ─────────────────────────────────────────
var _scrFilters = {
  sector:  'all',
  country: 'all',
  minYield: 0,
  maxPE:    0,
  verdict:  'all',
};
var _scrResults  = [];
var _scrScoring  = false;
var _scrPage     = 0;
var SCR_PAGE_SIZE = 30;

// ── Render screener tab ────────────────────────────────────
function renderScreener() {
  var el = document.getElementById('screener-content');
  if (!el) return;

  // Sector options
  var sectors = ['all','technology','healthcare','consumer_defensive','consumer_cyclical',
                 'financial','reit','energy','industrial','utilities','telecom'];
  var secLabels = {all:'Todos', technology:'Tecnología', healthcare:'Salud',
    consumer_defensive:'Cons. Defensivo', consumer_cyclical:'Cons. Cíclico',
    financial:'Financiero', reit:'REIT', energy:'Energía',
    industrial:'Industrial', utilities:'Utilities', telecom:'Telecom'};

  // Country options from tickers
  var countries = ['all'];
  if (window.TICKER_DB) {
    var flags = {};
    Object.values(TICKER_DB).forEach(function(v){ if(v[2]) flags[v[2]] = true; });
    countries = ['all'].concat(Object.keys(flags).sort());
  }

  var html = '<div class="scr-wrap">'
    // Header
    + '<div class="scr-header">'
    + '<div class="scr-title">🔍 ' + (lang==='en'?'Stock Screener':'Screener de Acciones') + '</div>'
    + '<div class="scr-sub">' + (lang==='en'?'Filter by sector, country and metrics. Score up to 20 companies dynamically.':'Filtra por sector, país y métricas. Puntúa hasta 20 empresas dinámicamente.') + '</div>'
    + '</div>'

    // Filters row
    + '<div class="scr-filters">'
    + '<div class="scr-filter-group">'
    + '<label class="scr-filter-lbl">' + (lang==='en'?'Sector':'Sector') + '</label>'
    + '<select class="scr-select" id="scr-sector" onchange="scrApplyFilters()">'
    + sectors.map(function(s){ return '<option value="'+s+'"'+(s===_scrFilters.sector?' selected':'')+'>'+secLabels[s]+'</option>'; }).join('')
    + '</select></div>'

    + '<div class="scr-filter-group">'
    + '<label class="scr-filter-lbl">' + (lang==='en'?'Country':'País') + '</label>'
    + '<select class="scr-select" id="scr-country" onchange="scrApplyFilters()">'
    + '<option value="all">' + (lang==='en'?'All':'Todos') + '</option>'
    + '<option value="🇺🇸">🇺🇸 USA</option>'
    + '<option value="🇬🇧">🇬🇧 UK</option>'
    + '<option value="🇩🇪">🇩🇪 Germany</option>'
    + '<option value="🇫🇷">🇫🇷 France</option>'
    + '<option value="🇪🇸">🇪🇸 Spain</option>'
    + '<option value="🇮🇹">🇮🇹 Italy</option>'
    + '<option value="🇨🇦">🇨🇦 Canada</option>'
    + '<option value="🇦🇺">🇦🇺 Australia</option>'
    + '<option value="🇯🇵">🇯🇵 Japan</option>'
    + '<option value="🇭🇰">🇭🇰 Hong Kong</option>'
    + '<option value="🇧🇷">🇧🇷 Brazil</option>'
    + '</select></div>'

    + '<div class="scr-filter-group">'
    + '<label class="scr-filter-lbl">Min Yield %</label>'
    + '<input type="number" class="scr-input" id="scr-yield" min="0" max="20" step="0.5" value="'+ (_scrFilters.minYield||0) +'" placeholder="0" onchange="scrApplyFilters()">'
    + '</div>'

    + '<div class="scr-filter-group">'
    + '<label class="scr-filter-lbl">Max P/E</label>'
    + '<input type="number" class="scr-input" id="scr-pe" min="0" max="200" step="1" value="'+ (_scrFilters.maxPE||'') +'" placeholder="—" onchange="scrApplyFilters()">'
    + '</div>'

    + '<button class="scr-btn-score" id="scr-score-btn" onclick="scrScoreSelected()" style="display:none">'
    + '⚡ ' + (lang==='en'?'Score selected':'Puntuar seleccionadas')
    + '</button>'
    + '</div>' // end filters

    // Results table
    + '<div class="scr-results" id="scr-results"><div class="scr-empty">Aplica filtros para ver resultados</div></div>'
    + '<div class="scr-pagination" id="scr-pagination"></div>'
    + '</div>';

  el.innerHTML = html;
  scrApplyFilters();
}

function scrApplyFilters() {
  if (!window.TICKER_DB) { _loadTickerDB().then(scrApplyFilters); return; }

  _scrFilters.sector  = (document.getElementById('scr-sector')  || {}).value || 'all';
  _scrFilters.country = (document.getElementById('scr-country') || {}).value || 'all';
  _scrFilters.minYield= parseFloat((document.getElementById('scr-yield') || {}).value) || 0;
  _scrFilters.maxPE   = parseFloat((document.getElementById('scr-pe')    || {}).value) || 0;

  _scrResults = [];
  Object.entries(TICKER_DB).forEach(function(entry) {
    var ticker = entry[0], v = entry[1];
    var name   = v[0], sector = v[1], flag = v[2], desc = v[3];
    if (_scrFilters.sector !== 'all' && sector !== _scrFilters.sector) return;
    if (_scrFilters.country !== 'all' && flag !== _scrFilters.country) return;
    _scrResults.push({ ticker: ticker, name: name, sector: sector, flag: flag, desc: desc });
  });

  _scrPage = 0;
  scrRenderResults();
}

function scrRenderResults() {
  var el = document.getElementById('scr-results');
  var pagEl = document.getElementById('scr-pagination');
  if (!el) return;

  var total = _scrResults.length;
  var pages = Math.ceil(total / SCR_PAGE_SIZE);
  var slice = _scrResults.slice(_scrPage * SCR_PAGE_SIZE, (_scrPage+1) * SCR_PAGE_SIZE);

  if (!total) {
    el.innerHTML = '<div class="scr-empty">Sin resultados para estos filtros</div>';
    if (pagEl) pagEl.innerHTML = '';
    return;
  }

  var secColors = { technology:'#3b82f6', healthcare:'#06b6d4', consumer_defensive:'#f59e0b',
    consumer_cyclical:'#ec4899', financial:'#10b981', reit:'#a78bfa', energy:'#f97316',
    industrial:'#8b5cf6', utilities:'#06b6d4', telecom:'#3b82f6', default:'#64748b' };

  var html = '<div class="scr-count">' + total + ' ' + (lang==='en'?'companies found':'empresas encontradas') + '</div>'
    + '<table class="scr-table">'
    + '<thead><tr>'
    + '<th><input type="checkbox" id="scr-check-all" onchange="scrToggleAll(this.checked)" title="Seleccionar todo"></th>'
    + '<th>' + (lang==='en'?'Company':'Empresa') + '</th>'
    + '<th>' + (lang==='en'?'Sector':'Sector') + '</th>'
    + '<th>' + (lang==='en'?'Market':'Mercado') + '</th>'
    + '<th>Score</th>'
    + '<th>P/E</th>'
    + '<th>Yield</th>'
    + '<th>Márgenes</th>'
    + '<th>Crec.</th>'
    + '<th>Fortaleza</th>'
    + '</tr></thead><tbody>';

  slice.forEach(function(r) {
    var sc  = secColors[r.sector] || secColors.default;
    var scored = r._score || null;
    html += '<tr class="scr-row">'
      + '<td><input type="checkbox" class="scr-check" data-ticker="'+r.ticker+'" onchange="scrUpdateScoreBtn()"></td>'
      + '<td class="scr-company"><span class="scr-ticker">'+r.ticker+'</span> <span class="scr-name">'+r.name+'</span></td>'
      + '<td><span class="scr-sector-tag" style="background:'+sc+'18;color:'+sc+';border:1px solid '+sc+'33">'+r.sector+'</span></td>'
      + '<td class="scr-flag">'+r.flag+'</td>'
      + (scored
        ? '<td class="scr-score-cell"><span style="color:'+(scored.total>=70?'var(--green)':scored.total>=45?'var(--yellow)':'var(--red)')+'">'+scored.total+'</span></td>'
          + '<td class="scr-metric">'+(scored.pe||'—')+'</td>'
          + '<td class="scr-metric">'+(scored.yield||'—')+'</td>'
          + '<td class="scr-block-bar" data-val="'+(scored.margenes||0)+'">'+scrMiniBar(scored.margenes)+'</td>'
          + '<td class="scr-block-bar" data-val="'+(scored.crec||0)+'">'+scrMiniBar(scored.crec)+'</td>'
          + '<td class="scr-block-bar" data-val="'+(scored.fortaleza||0)+'">'+scrMiniBar(scored.fortaleza)+'</td>'
        : '<td colspan="6" class="scr-unscoredcell"><span class="scr-unscoredtxt">'+(lang==='en'?'Select + score':'Selecciona + puntuar')+'</span></td>')
      + '</tr>';
  });

  html += '</tbody></table>';
  el.innerHTML = html;

  // Pagination
  if (pagEl && pages > 1) {
    var pag = '<div class="scr-pag-row">';
    for (var i=0; i<pages; i++) {
      pag += '<button class="scr-pag-btn'+(i===_scrPage?' active':'')+'" onclick="scrGoPage('+i+')">'+(i+1)+'</button>';
    }
    pag += '</div>';
    pagEl.innerHTML = pag;
  } else if (pagEl) { pagEl.innerHTML = ''; }
}

function scrMiniBar(val) {
  if (!val && val !== 0) return '<span class="scr-na">—</span>';
  var pct = Math.min(100, Math.max(0, (val/5)*100));
  var col = val >= 4 ? 'var(--green)' : val >= 3 ? 'var(--yellow)' : 'var(--red)';
  return '<div class="scr-mini-bar"><div class="scr-mini-fill" style="width:'+pct+'%;background:'+col+'"></div></div>'
    + '<span style="font-size:10px;color:'+col+';font-family:monospace">'+val.toFixed(1)+'</span>';
}

function scrToggleAll(checked) {
  document.querySelectorAll('.scr-check').forEach(function(cb){ cb.checked = checked; });
  scrUpdateScoreBtn();
}

function scrUpdateScoreBtn() {
  var selected = document.querySelectorAll('.scr-check:checked').length;
  var btn = document.getElementById('scr-score-btn');
  if (btn) {
    btn.style.display = selected > 0 ? 'inline-flex' : 'none';
    btn.textContent = '⚡ ' + (lang==='en'?'Score ':' Puntuar ') + selected + (lang==='en'?' companies':' empresas');
    if (selected > 20) {
      btn.textContent += ' (' + (lang==='en'?'max 20':'máx 20') + ')';
      btn.style.opacity = '.6';
    } else {
      btn.style.opacity = '1';
    }
  }
}

async function scrScoreSelected() {
  if (!WORKER_URL) { _showToast('Worker URL no configurada', 2000); return; }
  var checkboxes = Array.from(document.querySelectorAll('.scr-check:checked')).slice(0, 20);
  var tickers = checkboxes.map(function(cb){ return cb.dataset.ticker; });
  if (!tickers.length) return;

  var btn = document.getElementById('scr-score-btn');
  if (btn) { btn.textContent = '⏳ Cargando...'; btn.disabled = true; }

  for (var i=0; i<tickers.length; i++) {
    var ticker = tickers[i];
    try {
      var resp = await fetch(WORKER_URL + '/yahoo?ticker=' + encodeURIComponent(ticker));
      var json = await resp.json();
      if (json.ok && json.data) {
        var d = json.data;
        var sector = (TICKER_DB[ticker] && TICKER_DB[ticker][1]) || 'default';
        var scData = typeof scBuildData === 'function' ? scBuildData(d, sector) : null;
        // Find result and update
        var resIdx = _scrResults.findIndex(function(r){ return r.ticker===ticker; });
        if (resIdx >= 0 && scData) {
          var total = typeof scCalcTotal === 'function' ? scCalcTotal(scData) : 0;
          _scrResults[resIdx]._score = {
            total: Math.round(total * 10),
            pe:    d.pe ? d.pe.toFixed(1)+'x' : '—',
            yield: d.dividendYield ? d.dividendYield.toFixed(2)+'%' : '—',
            margenes:  scData.find ? (scData.find(function(b){return b.id==='margenes';})||{}).score : null,
            crec:      scData.find ? (scData.find(function(b){return b.id==='crecimiento';})||{}).score : null,
            fortaleza: scData.find ? (scData.find(function(b){return b.id==='fortaleza';})||{}).score : null,
          };
        }
      }
    } catch(e) { console.warn('Screener score error:', ticker, e.message); }
  }

  scrRenderResults();
  if (btn) { btn.textContent = '✓ ' + (lang==='en'?'Scored':'Puntuadas'); btn.disabled = false; }
}

function scrGoPage(p) {
  _scrPage = p;
  scrRenderResults();
  document.getElementById('screener-content').scrollIntoView({behavior:'smooth'});
}

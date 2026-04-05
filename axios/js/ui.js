// AXIOS·IQ — ui.js — Persistence, Events, Search Dropdown, Watchlist, Recents

// ══════════════════════════════════════════════════════════════════════
// PERSISTENCIA (sessionStorage) + NAVEGACIÓN (History API)
// ══════════════════════════════════════════════════════════════════════
function _saveState(){
  try{
    sessionStorage.setItem('axq', JSON.stringify({
      tab:activeTab, itemId:openItemId,
      ticker:state.ticker, name:state.name, sector:state.sector,
      country:state.country, desc:state.desc,
      lang:lang, acadLevel:acadLevel, acadCat:acadCat
    }));
  }catch(e){}
}

function _pushNav(label){
  _setHash(activeTab, state.ticker||null, openItemId||null);
  _saveState();
  _updateBreadcrumb();
}

function _applyTab(tab){
  activeTab=tab||activeTab;
  ['analyzer','academy','watchlist','about','screener','comparador'].forEach(function(t){
    var btn=document.getElementById('tab-'+t);
    if(btn) btn.classList.toggle('active',activeTab===t);
    var el=document.getElementById(t+'-content');
    if(el) el.style.display=activeTab===t?'block':'none';
  });
}

window.addEventListener('popstate',function(){
  try{
    // Try hash first, fall back to sessionStorage
    const restored = _restoreFromHash();
    if(!restored){
      const s=JSON.parse(sessionStorage.getItem('axq')||'null');
      if(!s) return;
      if(s.lang && s.lang!==lang){ lang=s.lang; }
      acadLevel=s.acadLevel||'all';
      acadCat  =s.acadCat  ||'all';
      openItemId=s.itemId||null;
      if(s.ticker){
        state.ticker=s.ticker; state.name=s.name||s.ticker;
        state.sector=s.sector||'technology';
        state.country=s.country||''; state.desc=s.desc||'';
      }
      _applyTab(s.tab||'analyzer');
      if(openItemId && activeTab==='analyzer')
        setTimeout(function(){ try{openItem(openItemId);}catch(e){} },80);
      if(activeTab==='academy') renderAcademy();
    }
    _updateBreadcrumb();
  }catch(e){ console.warn('popstate restore:',e); }
});

// ══════════════════════════════════════════════════════════════
// EVENTS + INIT
// ══════════════════════════════════════════════════════════════
// Init on load


// ══════════════════════════════════════════════════════════════
// SEARCH DROPDOWN
// ══════════════════════════════════════════════════════════════
let _dropSel = -1;

function _onSearchInput(raw){
  const q = raw.trim().toUpperCase();
  const dd = document.getElementById('search-dropdown');
  if(!q || q.length < 1){ _closeDropdown(); return; }
  _loadTickerDB().then(function(){
    const results = _searchTickers(q, 12);
    if(!results.length){
      dd.innerHTML = '<div class="sdrop-empty">— ' + (q.length < 2 ? 'Escribe al menos 2 caracteres' : 'Sin resultados para "'+q+'"') + ' —</div>';
      dd.classList.add('open');
      return;
    }
    dd.innerHTML = results.map(function(r, i){
      return '<div class="sdrop-item" data-ticker="'+r.ticker+'" data-idx="'+i+'">'
        + '<span class="sdrop-ticker">'+r.ticker+'</span>'
        + '<span class="sdrop-flag">'+r.flag+'</span>'
        + '<span class="sdrop-name">'+r.name+'</span>'
        + '<span class="sdrop-sector">'+r.sector+'</span>'
        + '</div>';
    }).join('');
    dd.querySelectorAll('.sdrop-item').forEach(function(el){
      el.addEventListener('mousedown', function(e){
        e.preventDefault();
        _selectDropdownTicker(el.dataset.ticker);
      });
    });
    dd.classList.add('open');
    _dropSel = -1;
  });
}

function _searchTickers(q, limit){
  if(!TICKER_DB) return [];
  const results = [];
  const isShort = q.length <= 5;
  for(const ticker in TICKER_DB){
    if(results.length >= limit) break;
    const entry = TICKER_DB[ticker];
    const name = (entry[0]||'').toUpperCase();
    const tickerMatch = ticker.startsWith(q) || ticker === q;
    const nameMatch = name.includes(q);
    if(tickerMatch || nameMatch){
      results.push({
        ticker: ticker,
        name: entry[0]||'',
        flag: entry[2]||'🌐',
        sector: ticker.startsWith(q) ? '★ ticker' : 'nombre',
        _score: tickerMatch ? (ticker===q ? 0 : 1) : 2
      });
    }
  }
  results.sort(function(a,b){ return a._score - b._score; });
  return results.slice(0, limit);
}

function _closeDropdown(){
  const dd = document.getElementById('search-dropdown');
  if(dd){ dd.classList.remove('open'); dd.innerHTML=''; }
  _dropSel = -1;
}

function _selectDropdownTicker(ticker){
  document.getElementById('ticker-input').value = ticker;
  _closeDropdown();
  lookupTicker();
}

function _onSearchKeydown(e){
  const dd = document.getElementById('search-dropdown');
  const items = dd ? dd.querySelectorAll('.sdrop-item') : [];
  if(e.key === 'ArrowDown'){
    e.preventDefault();
    _dropSel = Math.min(_dropSel+1, items.length-1);
    items.forEach(function(el,i){ el.classList.toggle('selected', i===_dropSel); });
  } else if(e.key === 'ArrowUp'){
    e.preventDefault();
    _dropSel = Math.max(_dropSel-1, -1);
    items.forEach(function(el,i){ el.classList.toggle('selected', i===_dropSel); });
  } else if(e.key === 'Enter'){
    if(_dropSel >= 0 && items[_dropSel]){
      e.preventDefault();
      _selectDropdownTicker(items[_dropSel].dataset.ticker);
    } else {
      // convert input to uppercase ticker (first word)
      const val = document.getElementById('ticker-input').value.trim().toUpperCase().split(' ')[0];
      document.getElementById('ticker-input').value = val;
      _closeDropdown();
      lookupTicker();
    }
  } else if(e.key === 'Escape'){
    _closeDropdown();
  }
}

// ══════════════════════════════════════════════════════════════
// WATCHLIST  (localStorage key: 'axq_wl')
// ══════════════════════════════════════════════════════════════
function _getWatchlist(){
  try{ return JSON.parse(localStorage.getItem('axq_wl')||'[]'); }
  catch(e){ return []; }
}
function _saveWatchlist(arr){
  try{ localStorage.setItem('axq_wl', JSON.stringify(arr)); } catch(e){}
}
function _isInWatchlist(ticker){
  return _getWatchlist().some(function(e){ return e.ticker===ticker; });
}
function _toggleWatchlist(){
  if(!state.ticker) return;
  let wl = _getWatchlist();
  const idx = wl.findIndex(function(e){ return e.ticker===state.ticker; });
  if(idx >= 0){
    wl.splice(idx,1);
  } else {
    wl.unshift({ ticker:state.ticker, name:state.name, sector:state.sector,
                 flag:state.country||'🌐', added: Date.now() });
    if(wl.length > 50) wl = wl.slice(0,50);
  }
  _saveWatchlist(wl);
  showCompanyHeader(); // refresh star
  if(activeTab==='watchlist') renderWatchlist();
}

// ══════════════════════════════════════════════════════════════
// RECENTS  (localStorage key: 'axq_rec')
// ══════════════════════════════════════════════════════════════
function _addRecent(ticker, name, sector, flag){
  try{
    let rec = JSON.parse(localStorage.getItem('axq_rec')||'[]');
    rec = rec.filter(function(e){ return e.ticker!==ticker; });
    rec.unshift({ ticker:ticker, name:name, sector:sector, flag:flag||'🌐', ts: Date.now() });
    if(rec.length > 20) rec = rec.slice(0,20);
    localStorage.setItem('axq_rec', JSON.stringify(rec));
  } catch(e){}
}
function _getRecents(){
  try{ return JSON.parse(localStorage.getItem('axq_rec')||'[]'); }
  catch(e){ return []; }
}
function _timeAgo(ts){
  const s = Math.floor((Date.now()-ts)/1000);
  if(s < 60) return 'ahora';
  if(s < 3600) return Math.floor(s/60)+'m';
  if(s < 86400) return Math.floor(s/3600)+'h';
  return Math.floor(s/86400)+'d';
}

// ══════════════════════════════════════════════════════════════
// RENDER WATCHLIST TAB
// ══════════════════════════════════════════════════════════════
function renderWatchlist(){
  const container = document.getElementById('watchlist-content');
  if(!container) return;
  const wl  = _getWatchlist();
  const rec = _getRecents();
  let html  = '';

  // ── Watchlist section ─────────────────────────────────────
  html += '<div class="wl-section">';
  html += '<div class="wl-section-hdr">';
  html += '<span>⭐ ' + tr('wlTitle') + ' <span style="color:var(--a1);margin-left:6px">(' + wl.length + ')</span></span>';
  if(wl.length) html += '<button class="wl-clear-btn" onclick="_clearWatchlist()">' + tr('wlClear') + '</button>';
  html += '</div>';

  if(!wl.length){
    html += '<div class="wl-empty"><span>☆</span>' + tr('wlEmpty').replace('\n','<br>') + '</div>';
  } else {
    html += '<div class="wl-grid">';
    wl.forEach(function(e){
      const cfg = SECTORS[e.sector]||SECTORS.technology;
      html += '<div class="wl-card" onclick="_openFromWL(&apos;'+e.ticker+'&apos;)">'
        + '<button class="wl-remove-btn" onclick="event.stopPropagation();_removeFromWL(&apos;'+e.ticker+'&apos;)">✕</button>'
        + '<div class="wl-card-top">'
        + '<span class="wl-card-ticker">'+e.ticker+'</span>'
        + '<span class="wl-card-flag">'+e.flag+'</span>'
        + '</div>'
        + '<div class="wl-card-name">'+e.name+'</div>'
        + '<div class="wl-card-sector">'+cfg.emoji+' '+(cfg.label[lang]||cfg.label.es||e.sector)+'</div>'
        + '</div>';
    });
    html += '</div>';
  }
  html += '</div>';

  // ── Recents section ───────────────────────────────────────
  if(rec.length){
    html += '<div class="wl-section">';
    html += '<div class="wl-section-hdr"><span>🕐 ' + tr('wlRecent') + '</span></div>';
    html += '<div class="rec-list">';
    rec.forEach(function(e){
      html += '<div class="rec-item" onclick="_openFromWL(&apos;'+e.ticker+'&apos;)">'
        + '<span class="rec-ticker">'+e.ticker+'</span>'
        + '<span class="rec-flag">'+e.flag+'</span>'
        + '<span class="rec-name">'+e.name+'</span>'
        + '<span class="rec-time">'+_timeAgo(e.ts)+'</span>'
        + '</div>';
    });
    html += '</div></div>';
  }

  container.innerHTML = html;
}

function _openFromWL(ticker){
  document.getElementById('ticker-input').value = ticker;
  showTab('analyzer');
  setTimeout(function(){ lookupTicker(); }, 150);
}
function _removeFromWL(ticker){
  let wl = _getWatchlist();
  wl = wl.filter(function(e){ return e.ticker!==ticker; });
  _saveWatchlist(wl);
  renderWatchlist();
  if(state.ticker===ticker) showCompanyHeader();
}
function _clearWatchlist(){
  _saveWatchlist([]);
  renderWatchlist();
  if(state.ticker) showCompanyHeader();
}
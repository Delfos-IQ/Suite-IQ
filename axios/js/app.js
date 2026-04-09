// AXIOS·IQ — app.js — Tab Helpers + Service Worker + Version Check

// ── Tab shortcut helpers ───────────────────────────────────
function showScreener()   { showTab('screener');   }
function showComparador() { showTab('comparador'); }

// Theme functions are defined in core.js

// ══════════════════════════════════════════════════════════════════
// SERVICE WORKER
// ══════════════════════════════════════════════════════════════════
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', function(evt) {
    if (evt.data && evt.data.type === 'SW_UPDATED') {
      console.log('[AXIOS] SW update detected for v' + evt.data.version);
    }
  });
  navigator.serviceWorker.register('../sw.js', { scope: '../' }).catch(function(){});
}

// ══════════════════════════════════════════════════════════════════
// VERSION CHECK — compara version.json con la versión actual
// Se ejecuta al cargar y cada vez que el tab recupera el foco
// ══════════════════════════════════════════════════════════════════
var _CURRENT_VERSION = '3.2.0';
var _versionCheckPending = false;

function _checkForUpdate() {
  if (_versionCheckPending) return;
  _versionCheckPending = true;
  fetch('../version.json?_=' + Date.now(), { cache: 'no-store' })
    .then(function(r) { return r.json(); })
    .then(function(v) {
      _versionCheckPending = false;
      var latest = v.axios || v.suite || '';
      if (latest && latest !== _CURRENT_VERSION) {
        _showUpdateBanner(latest);
      }
    })
    .catch(function() { _versionCheckPending = false; });
}

function _showUpdateBanner(newVersion) {
  if (document.getElementById('axq-update-banner')) return;

  var en = lang === 'en', pt = lang === 'pt';
  var msg = en ? 'New version available — v' + newVersion
          : pt ? 'Nova versão disponível — v' + newVersion
               : 'Nueva versión disponible — v' + newVersion;
  var btnLbl = en ? 'Update now' : pt ? 'Atualizar' : 'Actualizar ahora';

  var banner = document.createElement('div');
  banner.id = 'axq-update-banner';
  banner.style.cssText = [
    'position:fixed',
    'bottom:20px',
    'left:50%',
    'transform:translateX(-50%)',
    'z-index:9999',
    'background:var(--bg4)',
    'border:1px solid var(--a1)',
    'border-radius:12px',
    'padding:12px 18px',
    'display:flex',
    'align-items:center',
    'gap:14px',
    'box-shadow:0 8px 32px rgba(0,0,0,.4),0 0 0 1px rgba(0,212,170,.15)',
    'animation:_bannerIn .3s cubic-bezier(.34,1.56,.64,1)',
    'max-width:calc(100vw - 40px)',
    'white-space:nowrap',
  ].join(';');

  banner.innerHTML = '<span style="font-size:14px;color:var(--a1)">✦</span>'
    + '<span style="font-size:12px;color:var(--tx2);font-family:\'IBM Plex Sans\',sans-serif">' + msg + '</span>'
    + '<button id="axq-update-btn" style="'
    + 'background:var(--a1);color:#000;border:none;border-radius:6px;'
    + 'padding:5px 14px;font-size:11px;font-weight:700;cursor:pointer;'
    + 'font-family:\'IBM Plex Mono\',monospace;letter-spacing:.5px;flex-shrink:0'
    + '">' + btnLbl + '</button>'
    + '<button id="axq-update-dismiss" style="'
    + 'background:none;border:none;color:var(--tx3);cursor:pointer;'
    + 'font-size:16px;padding:2px 6px;line-height:1;flex-shrink:0'
    + '">✕</button>';

  if (!document.getElementById('_axq-banner-style')) {
    var st = document.createElement('style');
    st.id = '_axq-banner-style';
    st.textContent = '@keyframes _bannerIn{from{opacity:0;transform:translateX(-50%) translateY(16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
    document.head.appendChild(st);
  }

  document.body.appendChild(banner);

  document.getElementById('axq-update-btn').addEventListener('click', function() {
    if ('caches' in window) {
      caches.keys().then(function(keys) {
        return Promise.all(keys.map(function(k) { return caches.delete(k); }));
      }).then(function() { window.location.reload(); });
    } else {
      window.location.reload();
    }
  });

  document.getElementById('axq-update-dismiss').addEventListener('click', function() {
    var b = document.getElementById('axq-update-banner');
    if (b) b.remove();
  });
}

_checkForUpdate();

document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible') _checkForUpdate();
});

// ══════════════════════════════════════════════════════════════════
// BOOT
// ══════════════════════════════════════════════════════════════════
(function init(){
  initTheme();
  renderSectorOptions();
  document.getElementById('tab-analyzer-lbl').textContent  = tr('tabAnalyzer');
  // tab-academy-lbl no existe — academia migrada a SOPHIA·IQ externo
  document.getElementById('tab-watchlist-lbl').textContent = tr('tabWatchlist');

  if(location.hash && location.hash.length > 1){
    var hashRestored = _restoreFromHash();
    if(hashRestored){ _updateBreadcrumb(); return; }
  }

  try{
    var s = JSON.parse(sessionStorage.getItem('axq')||'null');
    if(s){
      if(s.lang) lang = s.lang;
      acadLevel = s.acadLevel || 'all';
      acadCat   = s.acadCat   || 'all';
      if(s.tab) _applyTab(s.tab);
      if(s.ticker){
        state.ticker  = s.ticker;
        state.name    = s.name   || s.ticker;
        state.sector  = s.sector || 'technology';
        state.country = s.country || '';
        state.desc    = s.desc   || '';
        document.getElementById('ticker-input').value = s.ticker;
        showCompanyHeader();
        renderGrid();
        if(s.itemId){
          openItemId = s.itemId;
          setTimeout(function(){ try{ openItem(s.itemId); }catch(e){} }, 150);
        }
      }
      if(s.tab==='academy') setTimeout(function(){ if(typeof renderAcademy==='function') renderAcademy(); }, 100);
    }
  }catch(e){ console.warn('Session restore failed:',e); }
})();

document.addEventListener('click', function(e){
  if(e.target.id==='overlay')    closePanel();
  if(e.target.id==='acad-modal') closeAcadModal();
});
document.addEventListener('keydown', function(e){
  if(e.key==='Escape'){
    var acadModal = document.getElementById('acad-modal');
    if(acadModal && acadModal.classList.contains('open')){
      closeAcadModal();
    } else {
      closePanel();
    }
  }
});

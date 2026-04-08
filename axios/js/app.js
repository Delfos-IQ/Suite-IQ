// AXIOS·IQ — app.js — Tab Helpers + Service Worker

// ── Tab shortcut helpers ───────────────────────────────────
function showScreener()   { showTab('screener');   }
function showComparador() { showTab('comparador'); }

// ── initTheme is called from init() in ui.js ──────────────
// Theme functions are defined in core.js

// ══════════════════════════════════════════════════════════════════
// SERVICE WORKER — silent auto-update listener
// ══════════════════════════════════════════════════════════════════
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', function(evt) {
    if (evt.data && evt.data.type === 'SW_UPDATED') {
      // Silently reload to pick up new version on next page load
      console.log('[AXIOS] SW update detected, reloading for v' + evt.data.version);
      window.location.reload();
    }
  });
  navigator.serviceWorker.register('../sw.js', { scope: '../' }).catch(function(){});
}

(function init(){
  initTheme();
  renderSectorOptions();
  document.getElementById('tab-analyzer-lbl').textContent = tr('tabAnalyzer');
  // tab-academy-lbl ya no existe — academia migrada a SOPHIA·IQ externo
  document.getElementById('tab-watchlist-lbl').textContent= tr('tabWatchlist');

  // ── Hash routing: restore from URL on direct load ──────────────────
  if(location.hash && location.hash.length > 1){
    const hashRestored = _restoreFromHash();
    if(hashRestored){ _updateBreadcrumb(); return; }
  }

  // ── Restore session state ─────────────────────────────────────────
  try{
    const s=JSON.parse(sessionStorage.getItem('axq')||'null');
    if(s){
      if(s.lang){ lang=s.lang; }
      acadLevel=s.acadLevel||'all';
      acadCat  =s.acadCat  ||'all';
      if(s.tab){ _applyTab(s.tab); }
      if(s.ticker){
        state.ticker=s.ticker; state.name=s.name||s.ticker;
        state.sector=s.sector||'technology';
        state.country=s.country||''; state.desc=s.desc||'';
        document.getElementById('ticker-input').value=s.ticker;
        showCompanyHeader();
        renderGrid();
        if(s.itemId){
          openItemId=s.itemId;
          setTimeout(()=>{ try{openItem(s.itemId);}catch(e){} },150);
        }
      }
      if(s.tab==='academy') setTimeout(()=>{ if(typeof renderAcademy==='function') renderAcademy(); },100);
    }
  }catch(e){ console.warn('Session restore failed:',e); }
})();

document.addEventListener('click',e=>{
  if(e.target.id==='overlay')    closePanel();
  if(e.target.id==='acad-modal') closeAcadModal();
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    // Close only the topmost visible layer
    const acadModal=document.getElementById('acad-modal');
    if(acadModal && acadModal.classList.contains('open')){
      closeAcadModal(); // keep detail panel open
    } else {
      closePanel();
    }
  }
});

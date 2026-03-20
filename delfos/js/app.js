/* ================================================================
   Delfos-IQ v2.1 — app.js
   Main controller: data init, askTutor, event delegation, boot
   ================================================================ */

/* Runtime data — populated by loadData() */
var TICKERS  = {};  // populated by loadData()
var COURSE   = [];  // populated by loadData()
var SEASONAL = [];  // populated by loadData()

async function loadData() {
  try {
    var [tickRes, courseRes, seasRes] = await Promise.all([
      fetch('../tickers.json'),
      fetch('course.json'),
      fetch('seasonal.json')
    ]);
    if(tickRes.ok)   TICKERS  = await tickRes.json();
    if(courseRes.ok) COURSE   = await courseRes.json();
    if(seasRes.ok)   SEASONAL = await seasRes.json();
  } catch(e) {
    console.error('[Delfos] Data load error:', e);
  }
}

async function askTutor(btn) {
  var tid = btn.dataset.tid || ""; if(!tid) return;
  var inp  = document.getElementById("ti-"+tid);
  var resp = document.getElementById("tr-"+tid);
  var q = inp ? inp.value.trim() : ""; if(!q) return;
  btn.disabled = true; btn.textContent = "...";
  if(resp) { resp.style.color="var(--tx2)"; resp.innerHTML="<div class='ai-dot-row'><div class='ai-dot'></div><div class='ai-dot'></div><div class='ai-dot'></div></div>"; }
  var tp = null;
  COURSE.forEach(function(lv){ lv.topics.forEach(function(t){ if(t.id===tid) tp=t; }); });
  var topicTitle = tp ? (lang==="en"?tp.t_en:tp.t_es) : tid;
  var prompt = "You are a tutor expert in the speculation method of Jose Luis Cava from El Arte de Especular. Answer in " + (lang==="en"?"English":"Spanish") + ". Topic: " + topicTitle + ". Student question: " + q + ". Answer clearly in 2-3 paragraphs, relating to Cava method rules.";
  var answer = "";
  if(CFG.WORKER && CFG.WORKER.indexOf("YOUR_WORKER") === -1) {
    try {
      var r = await fetch(CFG.WORKER+CFG.GROK, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ prompt:prompt }), signal:AbortSignal.timeout(20000) });
      if(r.ok) { var j=await r.json(); answer=j.text||(j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content)||""; }
    } catch(e) {}
  }
  if(!answer && tp) { answer = lang==="en" ? "Good question about " + tp.t_en + ". " + tp.s_en + " To get personalized AI answers, configure the Cloudflare Worker with your Grok API key." : "Buena pregunta sobre " + tp.t_es + ". " + tp.s_es + " Para respuestas personalizadas de IA, configura el Worker de Cloudflare con tu API de Grok."; }
  if(resp) { resp.style.color="var(--tx2)"; resp.innerHTML = (answer||"").split("\n").map(function(p){ return p?"<p style='margin-bottom:8px'>"+p+"</p>":""; }).join(""); }
  btn.disabled = false; btn.textContent = tx("tutor_send");
  if(inp) inp.value = "";
}
// Event delegation for dynamically created buttons
if(typeof document !== "undefined" && document.addEventListener) {
  document.addEventListener("click", function(e) {
    if(e.target.classList.contains("tutor-send")) askTutor(e.target);
    if(e.target.classList.contains("td-done-btn")) {
      var tid = e.target.dataset.tid, val = e.target.dataset.done !== "1";
      e.target.dataset.done = val ? "1" : "0"; markDone(tid, val);
    }
  });
}



// ═══════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════

// Tutor button delegation
document.addEventListener('click', function(e) {
  if(e.target.classList.contains('tutor-send')) askTutor(e.target);
});

// ── BOOT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async function() {
  await loadData();
  try {
    lang = localStorage.getItem('delfos_lang') || 'es';
    done = JSON.parse(localStorage.getItem('delfos_done') || '{}');
    oracleTrials = parseInt(localStorage.getItem('delfos_trials') || '0', 10);
  } catch(e) {}
  setLang(lang);
  updateOracleGate();
  var wsInd = document.getElementById('worker-status-ind');
  if(wsInd && CFG.WORKER) {
    wsInd.textContent = '\u2705 Activo: ' + CFG.WORKER;
    wsInd.style.color = 'var(--bull)';
  }
  var sp = document.getElementById('spill');
  if(sp) sp.textContent = tx('spill_ready');
});

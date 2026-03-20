/* ================================================================
   Delfos-IQ v2.1 — oracle-ui.js
   Oracle view: analyze, renderDashboard, KPIs, charts, ADX, etc.
   ================================================================ */


function setTicker(t) { document.getElementById("tickerInput").value = t; onTickerInput(t); analyze(); }

async function analyze() {
  var ticker = (document.getElementById("tickerInput").value || "").trim().toUpperCase();
  if(!ticker) return;
  if(!oracleUnlocked() && oracleTrials >= 3) {
    var lockScr = document.getElementById('oracle-lock-screen');
    var mainCnt = document.getElementById('oracle-main');
    var olsSub  = document.getElementById('ols-s');
    if(lockScr) lockScr.className = 'visible';
    if(mainCnt) mainCnt.style.display = 'none';
    if(olsSub)  olsSub.textContent = lang==='en'
      ? 'Your 3 free trials are used. Complete Level 1 to unlock unlimited access to the Oracle.'
      : 'Has agotado tus 3 consultas gratuitas. Completa el Nivel 1 para desbloquear el Oráculo sin límite.';
    updateTrialBadge();
    return;
  }
  if(!oracleUnlocked()) {
    oracleTrials++;
    try{ localStorage.setItem('delfos_trials', String(oracleTrials)); }catch(e){}
    updateTrialBadge();
  }
  setUI("loading", tx("ld_fetch"));
  try {
    var data = await fetchData(ticker);
    setUI("loading", tx("ld_calc"));
    var signal = runEngine(data);
    setUI("loading", tx("ld_ai"));
    var narrative = await getAI(signal);
    signal._narrative = narrative;
    currentSignal = signal;
    renderDashboard(signal, narrative);
    setUI("ok", ticker + " · " + (new Date().toLocaleTimeString(lang==="en"?"en-US":"es-ES", { hour:"2-digit", minute:"2-digit" })));
  } catch(err) {
    var el = document.getElementById("er");
    if(el) { el.innerHTML = "<div class='err-box'><strong>Error:</strong> " + err.message + "</div>"; el.style.display = "block"; }
    setUI("err", tx("spill_err"));
  } finally {
    var ld = document.getElementById("ld");
    if(ld) ld.style.display = "none";
    var btn = document.getElementById("analyzeBtn");
    if(btn) btn.disabled = false;
  }
}

function setUI(state, msg) {
  var ld = document.getElementById("ld"), er = document.getElementById("er"), rs = document.getElementById("rs");
  var sdot = document.getElementById("sdot"), spill = document.getElementById("spill"), btn = document.getElementById("analyzeBtn");
  if(state === "loading") {
    if(ld) { ld.style.display = "block"; var lt = document.getElementById("ld-msg"); if(lt) lt.textContent = msg; }
    if(er) er.style.display = "none";
    if(rs) rs.style.display = "none";
    if(sdot) sdot.style.background = "var(--warn)";
    if(spill) spill.textContent = msg;
    if(btn) btn.disabled = true;
  } else if(state === "ok") {
    if(sdot) sdot.style.background = "var(--bull)";
    if(spill) spill.textContent = msg;
  } else if(state === "err") {
    if(sdot) sdot.style.background = "var(--bear)";
    if(spill) spill.textContent = tx("spill_err");
  }
}

// ═══════════════════════════════════════════════════
// RENDER DASHBOARD
// ═══════════════════════════════════════════════════

function renderDashboard(s, narrative) {
  var rs = document.getElementById("rs"); if(rs) rs.style.display = "block";
  renderBanner(s); renderKPIs(s); renderTF(s); renderChecklist(s);
  renderChart(s); renderIndicators(s); renderStopTarget(s); renderADX(s);
  renderSeasonal(); renderNarrative(narrative);
  var rEnt = document.getElementById("rEnt"), rStp = document.getElementById("rStp");
  if(rEnt) rEnt.value = s.price.toFixed(2);
  if(rStp) rStp.value = s.stop.toFixed(2);
  calcRisk();
}

function renderBanner(s) {
  var el = document.getElementById("sig-banner"); if(!el) return;
  var cfg = {
    buy:       { cls:"sb-bull", g:"▲", vk:"sig_buy",   sk:"sub_buy",   stk:"str_strong" },
    sell:      { cls:"sb-bear", g:"▼", vk:"sig_sell",  sk:"sub_sell",  stk:"str_strong" },
    watch_buy: { cls:"sb-warn", g:"◈", vk:"sig_wbuy",  sk:"sub_wbuy",  stk:"str_wait"   },
    watch_sell:{ cls:"sb-warn", g:"◈", vk:"sig_wsell", sk:"sub_wsell", stk:"str_wait"   },
    neutral:   { cls:"sb-neut", g:"●", vk:"sig_neut",  sk:"sub_neut",  stk:"str_out"    }
  };
  var c = cfg[s.signal] || cfg.neutral;
  el.className = "sig-banner " + c.cls;
  var g = document.getElementById("sb-glyph"), v = document.getElementById("sb-verdict"),
      sub = document.getElementById("sb-sub"), str = document.getElementById("sb-str"),
      strl = document.getElementById("sb-strl"), tag = document.getElementById("sb-tag");
  if(g) g.textContent = c.g;
  if(v) v.textContent = s.ticker + " — " + tx(c.vk);
  if(sub) sub.textContent = tx(c.sk);
  if(str) str.textContent = tx(c.stk);
  if(strl) strl.textContent = tx("sb_strl");
  if(tag) tag.textContent = tx("sb_tag");
}

function renderKPIs(s) {
  var el = document.getElementById("kpi-strip"); if(!el) return;
  var pc = s.currency === "EUR" ? "€" : "$";
  var items = [
    { v: pc + s.price.toFixed(2), l: tx("price_lbl") },
    { v: pc + s.ema55.toFixed(2), l: "EMA 55" },
    { v: s.macdLine_D.toFixed(3), l: "MACD D" },
    { v: s.adx.toFixed(1),        l: "ADX" },
    { v: s.rsi.toFixed(1),        l: "RSI 14" }
  ];
  el.innerHTML = items.map(function(k){ return "<div class='kpi'><div class='kpi-v'>" + k.v + "</div><div class='kpi-l'>" + k.l + "</div></div>"; }).join("");
}

function renderTF(s) {
  var el = document.getElementById("tf-grid"); if(!el) return;
  var tfs = [
    { lbl:tx("tf_monthly"), cls:s.monthBull?"bull":"bear", icon:s.monthBull?"▲":"▼",
      st:tx(s.monthBull?"tf_bull":"tf_bear"),
      detail:"MACD M: "+s.macdLine_M.toFixed(3)+"<br>"+tx("tf_filter") },
    { lbl:tx("tf_weekly"),  cls:s.weekBull?"bull":s.macdLine_W<0?"bear":"neut",
      icon:s.weekBull?"▲":s.macdLine_W<0?"▼":"●",
      st:tx(s.weekBull?"tf_bull":s.macdLine_W<0?"tf_bear":"tf_neut"),
      detail:"MACD W: "+s.macdLine_W.toFixed(3)+"<br>Stoch W: "+s.stochK_W.toFixed(1)+"%" },
    { lbl:tx("tf_daily"),   cls:s.macdLine_D>s.macdSig_D?"bull":"bear",
      icon:s.macdLine_D>s.macdSig_D?"▲":"▼",
      st:tx(s.macdLine_D>s.macdSig_D?"tf_bull":"tf_bear"),
      detail:"MACD D: "+s.macdLine_D.toFixed(3)+"<br>"+tx("tf_signal")+": "+s.macdSig_D.toFixed(3) }
  ];
  el.innerHTML = tfs.map(function(tf){
    return "<div class='tf-c'><div class='tf-lbl'>"+tf.lbl+"</div><div class='tf-ico "+tf.cls+"'>"+tf.icon+"</div><div class='tf-st "+tf.cls+"'>"+tf.st+"</div><div class='tf-dt'>"+tf.detail+"</div></div>";
  }).join("");
}

function renderChecklist(s) {
  var el = document.getElementById("check-list"); if(!el) return;
  el.innerHTML = s.checks.map(function(ck){
    var icon = { pass:"✓", fail:"✗", warn:"~" }[ck.state];
    return "<div class='ck "+ck.state+"'><div class='ck-dot "+ck.state+"'>"+icon+"</div><div><div class='ck-lbl'>"+tx(ck.lk)+"</div><div class='ck-val'>"+ck.val+"</div></div></div>";
  }).join("");
}

function renderChart(s) {
  var svg = document.getElementById("chart-svg"); if(!svg) return;
  var W = svg.clientWidth||400, H = svg.clientHeight||170;
  var c = s.closes, e55 = s.ema55arr, e21 = s.ema21arr, n = c.length;
  if(!n) { svg.innerHTML = ""; return; }
  var pad = { l:8, r:8, t:8, b:14 };
  var all = c.concat(e55.filter(Boolean), e21.filter(Boolean));
  var mn = Math.min.apply(null,all)*0.998, mx = Math.max.apply(null,all)*1.002, rng = mx-mn||1;
  var xs = function(i){ return pad.l + (i/(n-1||1)) * (W-pad.l-pad.r); };
  var ys = function(v){ return pad.t + (1-(v-mn)/rng) * (H-pad.t-pad.b); };
  var pp="", p55="", p21="";
  for(var i = 0; i < n; i++) {
    var x = xs(i).toFixed(1);
    pp += (i?"L":"M") + x + "," + ys(c[i]).toFixed(1);
    if(e55[i]) p55 += (p55?"L":"M") + x + "," + ys(e55[i]).toFixed(1);
    if(e21[i]) p21 += (p21?"L":"M") + x + "," + ys(e21[i]).toFixed(1);
  }
  var col = c[n-1] > s.ema55 ? "var(--bull)" : "var(--bear)";
  var ly = ys(c[n-1]).toFixed(1);
  svg.innerHTML = "<line x1='"+pad.l+"' y1='"+ly+"' x2='"+W+"' y2='"+ly+"' stroke='"+col+"' stroke-width='.5' stroke-dasharray='3,3' opacity='.35'/>"
    + "<path d='"+pp+"' fill='none' stroke='"+col+"' stroke-width='1.5'/>"
    + (p55?"<path d='"+p55+"' fill='none' stroke='var(--d1)' stroke-width='1.5' stroke-dasharray='5,2'/>":"")
    + (p21?"<path d='"+p21+"' fill='none' stroke='var(--neut)' stroke-width='1' opacity='.65'/>":"");
  var leg = document.getElementById("chart-leg");
  if(leg) leg.innerHTML = "<span><span style='color:"+col+"'>── </span>"+tx("chart_price")+"</span><span><span style='color:var(--d1)'>╌╌ </span>EMA 55</span><span><span style='color:var(--neut)'>── </span>EMA 21</span>";
}

function renderIndicators(s) {
  var el = document.getElementById("ind-panel"); if(!el) return;
  var inds = [
    { n:tx("ind_macd_d"), v:s.macdLine_D.toFixed(3), pct:Math.min(100,Math.max(0,s.macdLine_D>0?65:35)), c:s.macdLine_D>0?"var(--bull)":"var(--bear)", note:tx(s.macdLine_D>s.macdSig_D?"ind_bull":"ind_bear") },
    { n:tx("ind_macd_w"), v:s.macdLine_W.toFixed(3), pct:Math.min(100,Math.max(0,s.macdLine_W>0?65:35)), c:s.macdLine_W>0?"var(--bull)":"var(--bear)", note:tx(s.macdLine_W>0?"ind_above0":"ind_below0") },
    { n:tx("ind_stoch_d"),v:s.stochK_D.toFixed(1)+"%", pct:s.stochK_D, c:s.stochK_D>80?"var(--bear)":s.stochK_D<20?"var(--bull)":"var(--neut)", note:tx(s.stochK_D>80?"ind_overbought":s.stochK_D<20?"ind_oversold":"ind_neutral") },
    { n:tx("ind_stoch_w"),v:s.stochK_W.toFixed(1)+"%", pct:s.stochK_W, c:s.stochK_W>60?"var(--bull)":s.stochK_W<40?"var(--bear)":"var(--warn)", note:tx(s.stochK_W>60?"ind_bull60":s.stochK_W<40?"ind_bear40":"ind_alert") },
    { n:"RSI 14",         v:s.rsi.toFixed(1),          pct:s.rsi,      c:s.rsi>70?"var(--bear)":s.rsi<30?"var(--bull)":"var(--neut)", note:tx(s.rsi>70?"ind_overbought":s.rsi<30?"ind_oversold":"ind_neutral") }
  ];
  el.innerHTML = inds.map(function(d){ return "<div class='ind'><div class='ind-hdr'><span class='ind-n'>"+d.n+"</span><span class='ind-v' style='color:"+d.c+"'>"+d.v+"</span></div><div class='ind-bg'><div class='ind-fill' style='width:"+d.pct+"%;background:"+d.c+"'></div></div><div class='ind-note'>"+d.note+"</div></div>"; }).join("");
}

function renderStopTarget(s) {
  var grd = document.getElementById("st-grid"), note = document.getElementById("st-note");
  if(!grd) return;
  var pc = s.currency === "EUR" ? "€" : "$";
  var sd = Math.abs(s.price-s.stop), td = Math.abs(s.target-s.price);
  grd.innerHTML = "<div class='st-box'><div class='st-lbl'>"+tx("st_stop")+"</div><div class='st-v sv-s'>"+pc+s.stop.toFixed(2)+"</div><div class='st-sub'>"+pc+sd.toFixed(2)+" ("+(s.price?(sd/s.price*100).toFixed(1):"-")+"%)</div></div>"
    + "<div class='st-box'><div class='st-lbl'>"+tx("st_target")+"</div><div class='st-v sv-t'>"+pc+s.target.toFixed(2)+"</div><div class='st-sub'>"+pc+td.toFixed(2)+" ("+(s.price?(td/s.price*100).toFixed(1):"-")+"%)</div></div>";
  if(note) note.innerHTML = "<strong style='color:var(--d1)'>R:R</strong> = "+s.rr.toFixed(2)+"x "+(s.rr>=2?"<span style='color:var(--bull)'>✓ "+tx("st_valid")+"</span>":"<span style='color:var(--bear)'>✗ "+tx("st_min2x")+"</span>")+"<br><span style='color:var(--tx3)'>Stop: 2×ATR("+s.atr.toFixed(2)+") | Target: 3×ATR | "+tx("st_exit")+"</span>";
}

function renderADX(s) {
  var el = document.getElementById("adx-panel"); if(!el) return;
  var col = s.adx>30?"var(--bull)":s.adx>20?"var(--warn)":"var(--bear)";
  var lbl = tx(s.adx>30?"adx_strong":s.adx>20?"adx_mod":"adx_flat");
  el.innerHTML = "<div class='adx-big' style='color:"+col+"'>"+s.adx.toFixed(1)+"</div>"
    + "<div class='adx-lbl' style='color:"+col+"'>"+lbl+"</div>"
    + "<div style='background:var(--bg4);border-radius:2px;height:3px;margin-bottom:12px'><div style='background:"+col+";border-radius:2px;height:3px;width:"+Math.min(s.adx/60*100,100).toFixed(0)+"%'></div></div>"
    + "<div class='di2'><div class='di-box'><div class='di-v' style='color:var(--bull)'>"+s.pDI.toFixed(1)+"</div><div class='di-l'>+DI bull</div></div><div class='di-box'><div class='di-v' style='color:var(--bear)'>"+s.mDI.toFixed(1)+"</div><div class='di-l'>-DI bear</div></div></div>"
    + "<div style='margin-top:8px;font-size:9px;color:var(--tx3);line-height:1.5'>"+(s.bullDir?"<span style='color:var(--bull)'>▲ +DI "+tx("adx_di_bull")+"</span>":"<span style='color:var(--bear)'>▼ -DI "+tx("adx_di_bear")+"</span>")+"<br>"+tx("adx_rule")+"</div>";
}

function renderSeasonal() {
  var panel = document.getElementById("sea-panel"), grid = document.getElementById("month-grid");
  var m = new Date().getMonth(), y = new Date().getFullYear(), cyc = y % 4;
  var cpC = (cyc===3||cyc===0)?"var(--bull)":(cyc===1?"var(--neut)":cyc===2?"var(--bear)":"var(--warn)");
  var cpL = L[lang] && L[lang].pres_cycle ? L[lang].pres_cycle[cyc===3||cyc===0?2:cyc===1?0:cyc===2?1:3] : "";
  var sm = SEASONAL[m];
  if(panel) panel.innerHTML = "<div style='display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:9px'>"
    + "<div style='background:var(--bg3);border:1px solid var(--bdr);border-radius:var(--r);padding:10px'>"
    + "<div style='font-family:IBM Plex Mono,monospace;font-size:7px;letter-spacing:.12em;color:var(--tx3);text-transform:uppercase;margin-bottom:4px'>"+tx("sea_pres")+" "+y+"</div>"
    + "<div style='font-family:IBM Plex Mono,monospace;font-size:10px;font-weight:700;color:"+cpC+"'>"+cpL+"</div></div>"
    + "<div style='background:var(--bg3);border:1px solid var(--bdr);border-left:2px solid var(--d1);border-radius:var(--r);padding:10px'>"
    + "<div style='font-family:IBM Plex Mono,monospace;font-size:7px;letter-spacing:.12em;color:var(--tx3);text-transform:uppercase;margin-bottom:4px'>"+(lang==="en"?sm.en:sm.es)+" · "+tx("sea_hist")+"</div>"
    + "<div style='font-family:IBM Plex Mono,monospace;font-size:10px;font-weight:700;color:"+(sm.bias==="bull"?"var(--bull)":sm.bias==="bear"?"var(--bear)":"var(--warn)")+"'>"+(sm.avg>0?"+":"")+sm.avg+"%</div></div></div>";
  if(grid) {
    var months = L[lang] && L[lang].months ? L[lang].months : L.es.months;
    grid.innerHTML = SEASONAL.map(function(md,i){
      var cls = "mo" + (i===m?" cur":" "+md.bias);
      return "<div class='"+cls+"'><span class='mo-n'>"+(lang==="en"?md.en:md.es)+"</span><span class='mo-v'>"+(md.avg>0?"+":"")+md.avg+"%</span></div>";
    }).join("");
  }
}

function renderNarrative(text) {
  var el = document.getElementById("ai-narrative"); if(!el) return;
  if(!text) { el.innerHTML = "<div id='ai-placeholder' style='color:var(--tx3);font-size:11px'>"+tx("ai_placeholder")+"</div>"; return; }
  el.innerHTML = text.split("\n\n").map(function(p){ return p ? "<p style='margin-bottom:12px'>"+p.replace(/\n/g,"<br>")+"</p>" : ""; }).join("");
}

function calcRisk() {
  var capital = parseFloat(document.getElementById("rCap").value)||10000;
  var riskPct = parseFloat(document.getElementById("rRisk").value)||1;
  var entry   = parseFloat(document.getElementById("rEnt").value)||0;
  var stop    = parseFloat(document.getElementById("rStp").value)||0;
  var el = document.getElementById("risk-res"); if(!el) return;
  if(!entry || !stop || entry === stop) { el.innerHTML = "<div class='rr'><span class='rr-l'>"+tx("rk_hint")+"</span></div>"; return; }
  var rps = Math.abs(entry-stop), ra = capital*riskPct/100;
  var shares = Math.floor(ra/rps)||1, pos = shares*entry, maxL = shares*rps;
  var tgt = currentSignal ? currentSignal.target : entry + (entry-stop)*2;
  var profit = shares*Math.abs(tgt-entry), rr = Math.abs(tgt-entry)/rps;
  var rows = [
    [tx("rk_shares"), String(shares), "var(--d1)"],
    [tx("rk_pos"),    "$"+pos.toFixed(0), "var(--d1)"],
    [tx("rk_loss"),   "-$"+maxL.toFixed(0), "var(--bear)"],
    [tx("rk_profit"), "+$"+profit.toFixed(0), "var(--bull)"],
    [tx("rk_rr"),     rr.toFixed(2)+"x", rr>=2?"var(--bull)":"var(--bear)"]
  ];
  el.innerHTML = rows.map(function(r){ return "<div class='rr'><span class='rr-l'>"+r[0]+"</span><span class='rr-v' style='color:"+r[2]+"'>"+r[1]+"</span></div>"; }).join("");
}

// ═══════════════════════════════════════════════════
// COURSE — uses createElement throughout
// ═══════════════════════════════════════════════════
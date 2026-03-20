/* ================================================================
   Delfos-IQ v2.1 — config.js
   Global state, CFG, i18n, language helpers
   ================================================================ */


// ═══════════════════════════════════════════════════
// CONFIG — set your Cloudflare Worker URL here
// ═══════════════════════════════════════════════════


var CFG = {
  WORKER:     "https://oraculo-delfos-iq.pedicode-app.workers.dev",  // Cloudflare Worker
  YAHOO_PATH: "/yahoo",
  GROK_PATH:  "/grok",
  PROXIES: [
    function(u){ return "https://corsproxy.io/?" + encodeURIComponent(u); },
    function(u){ return "https://api.allorigins.win/get?url=" + encodeURIComponent(u); }
  ]
};



// ═══════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════
var lang = "es";
var currentSignal = null;
var done = {};
var oracleTrials = 0;
try { done = JSON.parse(localStorage.getItem("delfos_done") || "{}"); } catch(e) {}

// ═══════════════════════════════════════════════════
// i18n — all labels as pure data, no string templates
// ═══════════════════════════════════════════════════
var L = {
  es: {
    brand_tagline: "Oráculo · Método Cava · Swing Trading",
    spill_ready:   "ORÁCULO LISTO",
    spill_err:     "ERROR",
    os_ey:         "Oráculo · Análisis según el Método de José Luis Cava",
    btn_lbl:       "CONSULTAR",
    qt_lbl:        "Rápido:",
    kofi:          "Café",
    nc_oracle_t:   "EL ORÁCULO",
    nc_oracle_s:   "Análisis técnico con IA · Método Cava",
    nc_curso_t:    "ESPECULADOR DE BIEN",
    nc_curso_s:    "Curso completo · 4 niveles · 40 temas",
    nc_about_t:    "ACERCA DE",
    nc_about_s:    "Versiones · Disclaimer · Suite IQ",
    lbl_tf:        "TRIPLE MARCO TEMPORAL",
    lbl_ck:        "CHECKLIST MÉTODO CAVA",
    lbl_ch:        "PRECIO · EMA 55 · EMA 21",
    lbl_ind:       "INDICADORES DE MOMENTO",
    lbl_st:        "STOP · OBJETIVO · R:R",
    lbl_adx:       "ADX — FUERZA DE TENDENCIA",
    lbl_sea:       "CONTEXTO ESTACIONAL",
    lbl_risk:      "CALCULADORA DE RIESGO",
    lbl_ai:        "VEREDICTO DEL ORÁCULO · ANÁLISIS IA",
    lbl_cap:       "Capital",
    lbl_rsk:       "Riesgo máx. %",
    lbl_ent:       "Precio entrada",
    lbl_stp:       "Stop loss",
    ai_placeholder:"El análisis aparecerá aquí.",
    sb_strl:       "VEREDICTO",
    sb_tag:        "✦ IA · Método Cava",
    ld_fetch:      "Obteniendo datos de mercado...",
    ld_calc:       "Calculando indicadores Cava...",
    ld_ai:         "Generando análisis con IA...",
    tf_monthly:    "MENSUAL",
    tf_weekly:     "SEMANAL",
    tf_daily:      "DIARIO",
    tf_filter:     "Filtro macro",
    tf_signal:     "Señal D",
    tf_bull:       "ALCISTA",
    tf_bear:       "BAJISTA",
    tf_neut:       "NEUTRO",
    sig_buy:       "COMPRAR",
    sig_sell:      "VENDER / CORTO",
    sig_wbuy:      "VIGILAR — POSIBLE COMPRA",
    sig_wsell:     "VIGILAR — POSIBLE VENTA",
    sig_neut:      "NEUTRAL — SIN TENDENCIA",
    sub_buy:       "SEÑAL ALCISTA CONFIRMADA · MÉTODO CAVA",
    sub_sell:      "SEÑAL BAJISTA CONFIRMADA · MÉTODO CAVA",
    sub_wbuy:      "TENDENCIA ALCISTA · ESPERAR SEÑAL DIARIA",
    sub_wsell:     "TENDENCIA BAJISTA · ESPERAR SEÑAL DIARIA",
    sub_neut:      "ADX BAJO · NO OPERAR SEGÚN CAVA",
    str_strong:    "FUERTE",
    str_wait:      "ESPERAR",
    str_out:       "FUERA",
    ck_m_bull:     "MACD mensual alcista",
    ck_w_bull:     "MACD semanal sobre cero",
    ck_sw_bull:    "Estocástico semanal mayor 60",
    ck_abv55:      "Precio sobre EMA 55",
    ck_near55:     "Retroceso a EMA 55 menor 2 porciento",
    ck_cross:      "Cruce MACD diario alcista",
    ck_d_pos:      "Ambas líneas MACD sobre cero",
    ck_adx:        "ADX mayor 25 tendencia fuerte",
    ck_di:         "+DI sobre -DI dirección alcista",
    ck_entry_zone: "ZONA DE ENTRADA",
    ck_cross_det:  "CRUCE DETECTADO",
    price_lbl:     "Precio",
    chart_price:   "Precio",
    ind_macd_d:    "MACD DIARIO",
    ind_macd_w:    "MACD SEMANAL",
    ind_stoch_d:   "ESTOCÁSTICO DIARIO",
    ind_stoch_w:   "ESTOCÁSTICO SEMANAL",
    ind_bull:      "Alcista",
    ind_bear:      "Bajista",
    ind_above0:    "Sobre cero",
    ind_below0:    "Bajo cero",
    ind_overbought:"Sobrecomprado",
    ind_oversold:  "Sobrevendido",
    ind_neutral:   "Neutral",
    ind_bull60:    "Alcista mayor 60",
    ind_bear40:    "Bajista menor 40",
    ind_alert:     "Zona de alerta",
    st_stop:       "Stop Loss",
    st_target:     "Objetivo",
    st_valid:      "Válido",
    st_min2x:      "Mín. 2x",
    st_exit:       "Salida: cruce MACD D",
    adx_strong:    "TENDENCIA FUERTE — OPERAR",
    adx_mod:       "TENDENCIA MODERADA",
    adx_flat:      "MERCADO LATERAL — NO OPERAR",
    adx_di_bull:   "domina: presión compradora",
    adx_di_bear:   "domina: presión vendedora",
    adx_rule:      "ADX mayor 25 operar | ADX menor 20 mercado lateral",
    sea_pres:      "Ciclo presidencial",
    sea_hist:      "retorno hist.",
    sea_yr1:       "1er año Moderado",
    sea_yr2:       "2 año Débil midterms",
    sea_yr3:       "3er año ÓPTIMO",
    sea_yr4:       "4 año Electoral",
    rk_shares:     "Acciones/unidades",
    rk_pos:        "Tamaño posición",
    rk_loss:       "Pérdida máxima",
    rk_profit:     "Beneficio objetivo",
    rk_rr:         "Ratio R:R",
    rk_valid:      "Válido",
    rk_hint:       "Introduce precio entrada y stop.",
    ch_ey:         "DELFOS ACADEMY · MÉTODO CAVA",
    ch_h:          "Curso de Especulador de Bien",
    ch_s:          "Aprende el Método de José Luis Cava desde cero hasta análisis avanzado. 4 niveles, 40 temas y un módulo completo de casos reales extraídos del libro. Adquiere las herramientas para operar con sistema y disciplina.",
    ch_lvl:        "Niveles",
    ch_top:        "Temas",
    ch_con:        "Contenido",
    ch_met:        "Método",
    lv_see:        "Ver temas",
    lv_hide:       "Ocultar",
    lv_done:       "completados",
    tp_view:       "VER →",
    tp_done_lbl:   "completado",
    td_close:      "Cerrar",
    td_mark:       "Marcar como completado",
    td_unmark:     "Completado — Desmarcar",
    td_cava_src:   "Jose Luis Cava, El Arte de Especular",
    tutor_lbl:     "Tutor IA · Pregunta sobre este tema",
    tutor_ph:      "Pregunta sobre este tema...",
    tutor_send:    "PREGUNTAR",
    tutor_init:    "El tutor IA responderá aquí...",
    err_ticker:    "Verifica el ticker. Para Europa: SAN.MC, SAP.DE, IBEX",
    ab_sub:        "SWING TRADING · MÉTODO CAVA · IQ SUITE",
    ab_h1:         "ACERCA DE DELFOS-IQ",
    ab_h2:         "LA IQ SUITE",
    ab_h3:         "HISTORIAL DE VERSIONES",
    ab_p1:         "Delfos-IQ es una herramienta educativa e informativa de análisis técnico basada en el método de especulación descrito por José Luis Cava en su libro El Arte de Especular. Forma parte de la IQ Suite, junto a Axios-IQ (análisis fundamental) y Harvest-IQ (cartera de dividendos). El análisis técnico se calcula en tiempo real con datos de mercado públicos. La interpretación narrativa está impulsada por IA (Grok) cuando se configura el Worker de Cloudflare.",
    ab_axios:      "Terminal de análisis fundamental de empresas",
    ab_harv:       "Dashboard de cartera de dividendos crecientes",
    ab_delf:       "Swing trading con el Método Cava",
    vr1_t:         "v2.0 — Curso expandido · Logo IQ Suite · i18n",
    vr1_d:         "Motor técnico Cava · Triple marco temporal · Checklist 9 pasos · Curso 40 temas 4 niveles · Módulo casos reales libro · Tutor IA · Bilingüe ES/EN · 1.309 tickers",
    disc_h:        "AVISO LEGAL · DISCLAIMER",
    disc_a_title:  "⚠️ AVISO IMPORTANTE — LEA ANTES DE USAR",
    disc_s1_title: "1. NATURALEZA DEL CONTENIDO",
    disc_s2_title: "2. RIESGOS DE LA ESPECULACIÓN",
    disc_s3_title: "3. RESPONSABILIDAD INDIVIDUAL",
    disc_s4_title: "4. DATOS E INFORMACIÓN",
    disc_s5_title: "5. PROPIEDAD INTELECTUAL",
    disc_p:        "Delfos-IQ es una herramienta exclusivamente educativa e informativa. Los análisis, señales, indicadores, proyecciones y cualquier otro contenido proporcionado por esta aplicación NO constituyen asesoramiento financiero, recomendaciones de compra o venta de valores, ni consejo de inversión de ningún tipo. La especulación en mercados financieros conlleva un riesgo significativo de pérdida de capital, incluyendo la posibilidad de perder la totalidad del capital invertido. El rendimiento pasado no garantiza resultados futuros. Antes de tomar cualquier decisión de inversión o especulación, consulte a un asesor financiero profesional regulado.",
    months: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],
    pres_cycle: ["1er año — Moderado","2 año — Débil (midterms)","3er año — ÓPTIMO","4 año — Electoral"],
    buy:           "COMPRAR",
    watch_buy:     "VIGILAR ALCISTA",
    sell:          "VENDER",
    watch_sell:    "VIGILAR BAJISTA",
    neutral:       "NEUTRAL",
    price:         "Precio",
    ticker:        "Ticker",
    dates:         "Fechas",
    closes:        "Cierres",
    checks:        "Verificaciones",
    detail:        "MACD M: ",
    icon:          "icono",
    name:          "Nombre",
    nearEMA55:     "Cerca EMA55",
    macdLine_D:    "MACD D",
    monthBull:     "Tendencia Mensual",
    st:            "Parar",
    stochK_D:      "Est. Diario"
  },
  en: {
    brand_tagline: "Oracle · Cava Method · Swing Trading",
    spill_ready:   "ORACLE READY",
    spill_err:     "ERROR",
    os_ey:         "Oracle · Analysis based on Jose Luis Cava Method",
    btn_lbl:       "CONSULT",
    qt_lbl:        "Quick:",
    kofi:          "Coffee",
    nc_oracle_t:   "THE ORACLE",
    nc_oracle_s:   "AI technical analysis · Cava Method",
    nc_curso_t:    "GOOD SPECULATOR",
    nc_curso_s:    "Full course · 4 levels · 40 topics",
    nc_about_t:    "ABOUT",
    nc_about_s:    "Versions · Disclaimer · IQ Suite",
    lbl_tf:        "TRIPLE TIMEFRAME",
    lbl_ck:        "CAVA METHOD CHECKLIST",
    lbl_ch:        "PRICE · EMA 55 · EMA 21",
    lbl_ind:       "MOMENTUM INDICATORS",
    lbl_st:        "STOP · TARGET · R:R",
    lbl_adx:       "ADX — TREND STRENGTH",
    lbl_sea:       "SEASONAL CONTEXT",
    lbl_risk:      "RISK CALCULATOR",
    lbl_ai:        "ORACLE VERDICT · AI ANALYSIS",
    lbl_cap:       "Capital",
    lbl_rsk:       "Max risk %",
    lbl_ent:       "Entry price",
    lbl_stp:       "Stop loss",
    ai_placeholder:"Analysis will appear here.",
    sb_strl:       "VERDICT",
    sb_tag:        "✦ AI · Cava Method",
    ld_fetch:      "Fetching market data...",
    ld_calc:       "Calculating Cava indicators...",
    ld_ai:         "Generating AI analysis...",
    tf_monthly:    "MONTHLY",
    tf_weekly:     "WEEKLY",
    tf_daily:      "DAILY",
    tf_filter:     "Macro filter",
    tf_signal:     "D Signal",
    tf_bull:       "BULLISH",
    tf_bear:       "BEARISH",
    tf_neut:       "NEUTRAL",
    sig_buy:       "BUY",
    sig_sell:      "SELL / SHORT",
    sig_wbuy:      "WATCH — POSSIBLE BUY",
    sig_wsell:     "WATCH — POSSIBLE SELL",
    sig_neut:      "NEUTRAL — NO TREND",
    sub_buy:       "BULLISH SIGNAL CONFIRMED · CAVA METHOD",
    sub_sell:      "BEARISH SIGNAL CONFIRMED · CAVA METHOD",
    sub_wbuy:      "BULLISH TREND · WAIT FOR DAILY SIGNAL",
    sub_wsell:     "BEARISH TREND · WAIT FOR DAILY SIGNAL",
    sub_neut:      "LOW ADX · DO NOT TRADE PER CAVA",
    str_strong:    "STRONG",
    str_wait:      "WAIT",
    str_out:       "OUT",
    ck_m_bull:     "Monthly MACD bullish",
    ck_w_bull:     "Weekly MACD above zero",
    ck_sw_bull:    "Weekly stochastic above 60",
    ck_abv55:      "Price above EMA 55",
    ck_near55:     "Pullback to EMA 55 below 2 percent",
    ck_cross:      "Daily MACD bullish cross",
    ck_d_pos:      "Both MACD lines above zero",
    ck_adx:        "ADX above 25 strong trend",
    ck_di:         "Plus DI above minus DI bullish direction",
    ck_entry_zone: "ENTRY ZONE",
    ck_cross_det:  "CROSS DETECTED",
    price_lbl:     "Price",
    chart_price:   "Price",
    ind_macd_d:    "DAILY MACD",
    ind_macd_w:    "WEEKLY MACD",
    ind_stoch_d:   "DAILY STOCH",
    ind_stoch_w:   "WEEKLY STOCH",
    ind_bull:      "Bullish",
    ind_bear:      "Bearish",
    ind_above0:    "Above zero",
    ind_below0:    "Below zero",
    ind_overbought:"Overbought",
    ind_oversold:  "Oversold",
    ind_neutral:   "Neutral",
    ind_bull60:    "Bullish above 60",
    ind_bear40:    "Bearish below 40",
    ind_alert:     "Alert zone",
    st_stop:       "Stop Loss",
    st_target:     "Target",
    st_valid:      "Valid",
    st_min2x:      "Min. 2x",
    st_exit:       "Exit: MACD D cross",
    adx_strong:    "STRONG TREND — TRADE",
    adx_mod:       "MODERATE TREND",
    adx_flat:      "SIDEWAYS — DO NOT TRADE",
    adx_di_bull:   "dominates: buying pressure",
    adx_di_bear:   "dominates: selling pressure",
    adx_rule:      "ADX above 25 trade | ADX below 20 sideways",
    sea_pres:      "Presidential cycle",
    sea_hist:      "hist. return",
    sea_yr1:       "1st year Moderate",
    sea_yr2:       "2nd year Weak midterms",
    sea_yr3:       "3rd year OPTIMAL",
    sea_yr4:       "4th year Electoral",
    rk_shares:     "Shares/units",
    rk_pos:        "Position size",
    rk_loss:       "Max loss",
    rk_profit:     "Target profit",
    rk_rr:         "R:R ratio",
    rk_valid:      "Valid",
    rk_hint:       "Enter entry price and stop.",
    ch_ey:         "DELFOS ACADEMY · CAVA METHOD",
    ch_h:          "Good Speculator Course",
    ch_s:          "Learn Jose Luis Cava Method from scratch to advanced analysis. 4 levels, 40 topics and a complete module of real cases from the book. Acquire the tools to trade with system and discipline.",
    ch_lvl:        "Levels",
    ch_top:        "Topics",
    ch_con:        "Content",
    ch_met:        "Method",
    lv_see:        "View topics",
    lv_hide:       "Hide",
    lv_done:       "completed",
    tp_view:       "VIEW →",
    tp_done_lbl:   "completed",
    td_close:      "Close",
    td_mark:       "Mark as completed",
    td_unmark:     "Completed — Unmark",
    td_cava_src:   "Jose Luis Cava, El Arte de Especular",
    tutor_lbl:     "AI Tutor · Ask about this topic",
    tutor_ph:      "Ask about this topic...",
    tutor_send:    "ASK",
    tutor_init:    "AI tutor will respond here...",
    err_ticker:    "Check ticker. For Europe: SAN.MC, SAP.DE, IBEX",
    ab_sub:        "SWING TRADING · CAVA METHOD · IQ SUITE",
    ab_h1:         "ABOUT DELFOS-IQ",
    ab_h2:         "THE IQ SUITE",
    ab_h3:         "CHANGELOG",
    ab_p1:         "Delfos-IQ is an educational and informational technical analysis tool based on the speculation method described by Jose Luis Cava in his book The Art of Speculating. It is part of the IQ Suite, alongside Axios-IQ (fundamental analysis) and Harvest-IQ (dividend portfolio). Technical analysis is calculated in real time with public market data. The narrative interpretation is powered by AI (Grok) when the Cloudflare Worker is configured.",
    ab_axios:      "Fundamental company analysis terminal",
    ab_harv:       "Dividend growth portfolio dashboard",
    ab_delf:       "Swing trading with the Cava Method",
    vr1_t:         "v2.0 — Expanded course · IQ Suite logo · i18n",
    vr1_d:         "Cava technical engine · Triple timeframe · 9-step checklist · 40-topic course 4 levels · Real book cases module · AI tutor · Bilingual ES/EN · 1,309 tickers",
    disc_h:        "LEGAL NOTICE · DISCLAIMER",
    disc_a_title:  "⚠️ IMPORTANT NOTICE — READ BEFORE USE",
    disc_s1_title: "1. NATURE OF THE CONTENT",
    disc_s2_title: "2. SPECULATION RISKS",
    disc_s3_title: "3. INDIVIDUAL RESPONSIBILITY",
    disc_s4_title: "4. DATA AND INFORMATION",
    disc_s5_title: "5. INTELLECTUAL PROPERTY",
    disc_p:        "Delfos-IQ is an exclusively educational and informational tool. The analyses, signals, indicators, projections and any other content provided by this application do NOT constitute financial advice, buy or sell recommendations for securities, or investment advice of any kind. Speculation in financial markets carries a significant risk of capital loss, including the possibility of losing all invested capital. Past performance does not guarantee future results. Before making any investment or speculation decision, consult a regulated professional financial advisor.",
    months: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    pres_cycle: ["1st year Moderate","2nd year Weak (midterms)","3rd year OPTIMAL","4th year Electoral"],
    buy:               "BUY",
    checks:               "Checks",
    closes:               "Closes",
    dates:               "Dates",
    detail:               "MACD M: ",
    icon:               "icon",
    macdLine_D:               "MACD D",
    monthBull:               "Monthly Trend",
    name:               "Name",
    nearEMA55:               "Near EMA55",
    neutral:               "NEUTRAL",
    price:               "Price",
    sell:               "SELL",
    st:               "Stop",
    stochK_D:               "Daily Stoch",
    ticker:               "Ticker",
    watch_buy:               "WATCH BUY",
    watch_sell:               "WATCH SELL",
  }
};





function tx(k){ return (L[lang] && L[lang][k]) ? L[lang][k] : (L.es[k] || k); }

// ═══════════════════════════════════════════════════
// LANG SWITCH
// ═══════════════════════════════════════════════════

function setLang(l) {
  lang = l;
  try { localStorage.setItem("delfos_lang", l); } catch(e) {}
  document.documentElement.lang = l;
  var bes = document.getElementById("btn-es");
  var ben = document.getElementById("btn-en");
  if(bes) { bes.className = "lang-btn" + (l === "es" ? " on" : ""); }
  if(ben) { ben.className = "lang-btn" + (l === "en" ? " on" : ""); }
  applyLabels();
  if(currentSignal) renderNarrative(currentSignal._narrative || "");
  var cc = document.getElementById("course-container");
  if(cc && cc.dataset.built) { cc.dataset.built = ""; cc.innerHTML = ""; renderCourse(); }
}

function applyLabels() {
  var map = {
    "os-ey":"os_ey","btn-lbl":"btn_lbl","qt-lbl":"qt_lbl","kofi-lbl":"kofi",
    "brand-tagline":"brand_tagline",
    "search-ey":"os_ey",
    "nc-oracle-t":"nc_oracle_t","nc-oracle-s":"nc_oracle_s",
    "nc-curso-t":"nc_curso_t","nc-curso-s":"nc_curso_s",
    "nc-about-t":"nc_about_t","nc-about-s":"nc_about_s",
    "lbl-tf":"lbl_tf","lbl-ck":"lbl_ck","lbl-ch":"lbl_ch",
    "lbl-ind":"lbl_ind","lbl-st":"lbl_st","lbl-adx":"lbl_adx",
    "lbl-sea":"lbl_sea","lbl-risk":"lbl_risk","lbl-ai":"lbl_ai",
    "lbl-cap":"lbl_cap","lbl-rsk":"lbl_rsk","lbl-ent":"lbl_ent","lbl-stp":"lbl_stp",
    "ai-placeholder":"ai_placeholder","sb-strl":"sb_strl","sb-tag":"sb_tag",
    "ch-ey":"ch_ey","ch-h":"ch_h","ch-s":"ch_s",
    "ch-lvl":"ch_lvl","ch-top":"ch_top","ch-con":"ch_con","ch-met":"ch_met","ch-s":"ch_s","ch-h":"ch_h","ch-ey":"ch_ey",
    "about-sub":"ab_sub","ab-h1":"ab_h1","ab-h2":"ab_h2","ab-h3":"ab_h3","ab-p1":"ab_p1",
    "ab-axios":"ab_axios","ab-harv":"ab_harv","ab-delf":"ab_delf",
    "vr1-t":"vr1_t","vr1-d":"vr1_d","disc-h":"disc_h","disc-p":"disc_p","ab-axios":"ab_axios","ab-harv":"ab_harv","ab-delf":"ab_delf",
    "analyzeBtn":"btn_lbl",
    "ch-lvl":"ch_lvl","ch-top":"ch_top","ch-con":"ch_con","ch-met":"ch_met","ch-s":"ch_s","ch-h":"ch_h","ch-ey":"ch_ey"
  };
  for(var id in map) {
    var el = document.getElementById(id);
    if(el) el.textContent = tx(map[id]);
  }
  // Placeholder text for inputs
  var inp = document.getElementById("tickerInput");
  if(inp) inp.placeholder = (lang==="en"?"e.g. AAPL":"Ej. AAPL");
  // Spill
  var sp = document.getElementById("spill");
  if(sp) {
    var ready_es = L.es ? L.es.spill_ready : "ORÁCULO LISTO";
    var ready_en = L.en ? L.en.spill_ready : "ORACLE READY";
    if(sp.textContent===ready_es||sp.textContent===ready_en||sp.id==="spill") {
      sp.textContent = tx("spill_ready");
    }
  }
}

// ═══════════════════════════════════════════════════
// VIEW NAV
// ═══════════════════════════════════════════════════

function showView(id) {
  ["oracle","curso","about"].forEach(function(v) {
    var vw = document.getElementById("view-" + v);
    var nc = document.getElementById("nc-" + v);
    if(vw) vw.className = "view" + (v === id ? " on" : "");
    if(nc) nc.className = "nav-card" + (v === id ? " on" : "");
  });
  if(id === "curso") renderCourse();
  if(id === "oracle") updateOracleGate();
}

// ═══════════════════════════════════════════════════
// TICKER AUTOCOMPLETE
// ═══════════════════════════════════════════════════

function onTickerInput(val) {
  var up = val.toUpperCase().trim();
  var hint = document.getElementById("ticker-hint");
  if(!hint) return;
  if(up && TICKERS[up]) {
    hint.textContent = TICKERS[up][2] + " " + TICKERS[up][0];
    hint.style.display = "block";
  } else {
    hint.style.display = "none";
  }
}



// ═══════════════════════════════════════════════════
// TECHNICAL INDICATORS — pure JS, no libraries
// ═══════════════════════════════════════════════════
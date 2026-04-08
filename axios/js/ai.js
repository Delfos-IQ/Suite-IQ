// AXIOS·IQ — ai.js — AI Analysis (Groq/OpenAI via Worker) — v3.2 Enhanced

// ══════════════════════════════════════════════════════════════════════
// AI ANALYSIS — TRIGGER
// ══════════════════════════════════════════════════════════════════════
async function triggerAIAnalysis(){
  const aiBtn  = document.getElementById('ai-btn');
  const aiLoad = document.getElementById('ai-loading');
  const aiRes  = document.getElementById('ai-result');
  aiBtn.disabled = true;
  aiRes.style.display = 'none';
  aiLoad.style.display = 'flex';

  const cfg    = SECTORS[state.sector] || SECTORS.technology;
  const inputs = state.inputs, marks = state.marks;
  const ok_i = [], bad_i = [], watch_i = [];
  ITEMS.forEach(function(item){
    const m = marks[item.id], v = inputs[item.id]||'', l = item.label.default;
    const t = l + (v ? ' ('+v+')' : '');
    if(m==='ok')    ok_i.push(t);
    else if(m==='bad')   bad_i.push(t);
    else if(m==='watch') watch_i.push(t);
  });

  const res = runValuation(state);
  const cp  = parseFloat(inputs.price) || state.price || 0;
  const af  = typeof _afData !== 'undefined' ? _afData : null;
  const pLang = lang==='en' ? 'English' : lang==='pt' ? 'Português' : 'Español';
  const company = state.name || state.ticker || 'empresa';

  // ── Enrich context from autofill data ──────────────────────
  var marketCtx = '';
  if (af) {
    var mktCap = af.marketCap ? _fmtN(af.marketCap) : null;
    var beta    = af.beta    ? af.beta.toFixed(2)   : null;
    var w52lo   = af.week52Low  ? af.week52Low.toFixed(2)  : null;
    var w52hi   = af.week52High ? af.week52High.toFixed(2) : null;
    var pe      = af.pe         ? af.pe.toFixed(1)+'x'    : null;
    var pb      = af.priceToBook? af.priceToBook.toFixed(2)+'x' : null;
    var dy      = af.dividendYield ? af.dividendYield.toFixed(2)+'%' : null;
    var payout  = af.payoutRatio   ? af.payoutRatio.toFixed(1)+'%'  : null;
    var gm      = af.grossMargin   ? af.grossMargin.toFixed(1)+'%'  : null;
    var om      = af.operatingMargin ? af.operatingMargin.toFixed(1)+'%' : null;
    var nm      = af.netMargin     ? af.netMargin.toFixed(1)+'%'    : null;
    var roe     = af.roe           ? af.roe.toFixed(1)+'%'          : null;
    var rg      = af.revenueGrowth !== null && af.revenueGrowth !== undefined
                  ? (af.revenueGrowth>0?'+':'')+af.revenueGrowth.toFixed(1)+'%' : null;
    var eg      = af.earningsGrowth !== null && af.earningsGrowth !== undefined
                  ? (af.earningsGrowth>0?'+':'')+af.earningsGrowth.toFixed(1)+'%' : null;
    var de      = af.debtToEquity  ? (af.debtToEquity/100).toFixed(2)+'×' : null;
    var cr      = af.currentRatio  ? af.currentRatio.toFixed(2)     : null;
    var rcm     = af.recommendMean ? af.recommendMean.toFixed(1)+'/5 ('+_recLabel(af.recommendMean)+')' : null;
    var tgt     = af.targetMeanPrice ? af.currency+' '+af.targetMeanPrice.toFixed(2) : null;
    var w52pos  = (w52lo && w52hi && cp)
                  ? Math.round((cp - parseFloat(w52lo)) / (parseFloat(w52hi) - parseFloat(w52lo)) * 100)+'%' : null;
    var parts = [];
    if(mktCap) parts.push('Market cap: '+mktCap);
    if(beta)   parts.push('Beta: '+beta);
    if(pe)     parts.push('P/E: '+pe);
    if(pb)     parts.push('P/B: '+pb);
    if(dy)     parts.push('Div yield: '+dy);
    if(payout) parts.push('Payout: '+payout);
    if(gm)     parts.push('Margen bruto: '+gm);
    if(om)     parts.push('Margen operativo: '+om);
    if(nm)     parts.push('Margen neto: '+nm);
    if(roe)    parts.push('ROE: '+roe);
    if(rg)     parts.push('Crec. ingresos: '+rg);
    if(eg)     parts.push('Crec. beneficio: '+eg);
    if(de)     parts.push('Deuda/Capital: '+de);
    if(cr)     parts.push('Ratio liquidez: '+cr);
    if(w52lo && w52hi) parts.push('Rango 52S: '+w52lo+' – '+w52hi+(w52pos?' (posición: '+w52pos+')':''));
    if(rcm)    parts.push('Consenso analistas: '+rcm);
    if(tgt)    parts.push('Precio objetivo consenso: '+tgt);
    marketCtx = parts.join(' | ');
  }

  // ── Macro context (FRED) ──────────────────────────────────
  var macroCtx = '';
  if (typeof _macroCache !== 'undefined' && _macroCache) {
    var mp = [];
    if(_macroCache.fedfunds != null) mp.push('Fed Funds: '+_macroCache.fedfunds.toFixed(2)+'%');
    if(_macroCache.t10y    != null) mp.push('T10Y: '+_macroCache.t10y.toFixed(2)+'%');
    if(_macroCache.cpi     != null) mp.push('CPI YoY: '+_macroCache.cpi.toFixed(1)+'%');
    if(_macroCache.vix     != null) mp.push('VIX: '+_macroCache.vix.toFixed(1));
    macroCtx = mp.join(' | ');
  }

  // ── Sector-specific instruction ───────────────────────────
  var sectorNote = _sectorPromptNote(state.sector, cfg.label);

  const prompt = `Eres un analista buy-side senior con 25 años de experiencia en gestión de carteras institucionales.
Analiza en profundidad la inversión en "${company}" (sector: ${cfg.label}, ticker: ${state.ticker||'N/A'}).

MÉTRICAS DE MERCADO (Yahoo Finance):
${marketCtx || 'Sin datos de mercado disponibles'}

CONTEXTO MACRO (FRED):
${macroCtx || 'Sin datos macro disponibles'}

VALORACIÓN INTRÍNSECA:
- Precio actual: ${cp>0?cp+' '+(af?af.currency||'USD':'USD'):'no disponible'}
- Valor intrínseco estimado: ${res.fv?res.fv.toFixed(2)+' ('+res.method+')':'no calculado'}
- Margen de seguridad: ${res.mos!==null?res.mos+'%':'N/A'}
- Rango de valor (bajista/base/alcista): ${res.fv_bear?res.fv_bear.toFixed(0):'-'} / ${res.fv?res.fv.toFixed(0):'-'} / ${res.fv_bull?res.fv_bull.toFixed(0):'-'}
- Score del análisis: ${res.pct}/100

SEÑALES DEL ANALISTA (${res.total} evaluadas):
✓ Positivas (${ok_i.length}): ${ok_i.join(' | ')||'ninguna'}
✗ Negativas (${bad_i.length}): ${bad_i.join(' | ')||'ninguna'}
⚠ A vigilar (${watch_i.length}): ${watch_i.join(' | ')||'ninguna'}

DATOS CUALITATIVOS INTRODUCIDOS:
${Object.entries(inputs).filter(function(e){ return e[1] && e[0]!=='price'; }).map(function(e){ return e[0].toUpperCase()+': '+e[1]; }).join(' | ')||'sin datos adicionales'}

NOTA DE SECTOR: ${sectorNote}

Responde SOLO en ${pLang} con este JSON exacto (sin markdown, sin texto fuera del JSON):
{
  "semaforo": "COMPRAR|ACUMULAR|MANTENER|ESPERAR|EVITAR",
  "conviction": "ALTA|MEDIA|BAJA",
  "tesis": "4-5 frases con la tesis de inversión central — el 'por qué' y el 'cuándo' comprar o no",
  "moat": "2-3 frases sobre la ventaja competitiva sostenible (o su ausencia): qué protege el negocio de la competencia y cuánto dura",
  "fortalezas": ["fortaleza 1 con dato concreto del balance/cuenta de resultados", "fortaleza 2 con dato concreto", "fortaleza 3 con dato concreto"],
  "riesgos": ["riesgo 1 con impacto cuantificable", "riesgo 2 con horizonte temporal", "riesgo 3 con catalizador específico"],
  "fundamental": "3-4 frases interpretando en profundidad los fundamentales: márgenes vs sector, calidad del balance, retornos sobre capital, sostenibilidad del dividendo si aplica",
  "macro": "2-3 frases sobre el entorno macro actual y su impacto directo en este sector/empresa — tipos, inflación, ciclo",
  "technical": "2 frases sobre el momento técnico: posición en rango 52S, tendencia y si hay confluencia técnica/fundamental",
  "sector_insight": "2-3 frases de análisis sectorial específico — dinámicas del sector, posicionamiento competitivo, vientos de cola o en contra",
  "peers": "1-2 frases mencionando 2-3 empresas comparables y qué hace a esta empresa mejor/peor/equivalente vs peers",
  "catalysts": ["catalizador positivo 1 con horizonte temporal concreto", "catalizador positivo 2 con impacto estimado", "riesgo bajista clave con probabilidad estimada"],
  "entry": {
    "price": "precio o rango de entrada con justificación del múltiplo o nivel de soporte técnico",
    "mos": "margen de seguridad recomendado en % para este tipo de empresa y perfil de riesgo",
    "strategy": "estrategia concreta: una de estas frases — COMPRAR AHORA / ACUMULAR EN DEBILIDAD / ESPERAR CATALIZADOR / ESPERAR CORRECCIÓN / EVITAR",
    "timing": "cuándo y qué señal esperar antes de entrar: evento específico, nivel de precio, dato macro o técnico",
    "position_size": "sugerencia de peso en cartera — ej: posición core 5-7%, especulativa <2%, evitar",
    "rationale": "1-2 frases explicando el razonamiento completo de la estrategia de entrada"
  },
  "projections": {
    "bear": {"1y": "precio en €/$", "3y": "precio en €/$", "rationale": "catalizador bajista concreto y supuesto de valoración"},
    "base": {"1y": "precio en €/$", "3y": "precio en €/$", "rationale": "supuestos del escenario base: crecimiento, múltiplo, dividendo"},
    "bull": {"1y": "precio en €/$", "3y": "precio en €/$", "rationale": "catalizador alcista principal y upside sobre precio actual"}
  },
  "perfil_inversor": "A qué tipo de inversor encaja: horizonte (corto/medio/largo), tolerancia al riesgo (bajo/medio/alto), objetivo (crecimiento/dividendo/valor/especulativo)",
  "conclusion": "2-3 frases de conclusión directa y accionable: veredicto claro con condiciones específicas",
  "disclaimer": "recordatorio breve orientativo"
}`;

  try {
    if(!WORKER_URL) throw new Error('Worker URL no configurada');
    const r = await fetch(WORKER_URL+'/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, lang })
    });
    if(!r.ok){ const e = await r.json().catch(()=>({})); throw new Error(e.error||'HTTP '+r.status); }
    const d = await r.json();
    if(!d.ok) throw new Error(d.error||'Error en análisis IA');
    _renderAI(d.analysis, cp, af);
  } catch(err) {
    console.error('AI error:', err);
    aiRes.innerHTML = '<div style="color:var(--red);font-size:13px;padding:10px">⚠ '+err.message
      +'<br><small style="color:var(--tx3)">Verifica tu conexión.</small></div>';
    aiRes.style.display = 'block';
  } finally {
    aiLoad.style.display = 'none';
    aiBtn.disabled = false;
  }
}

// ── Helpers ─────────────────────────────────────────────────
function _fmtN(n) {
  if(!n) return null;
  if(n>=1e12) return (n/1e12).toFixed(2)+'T';
  if(n>=1e9)  return (n/1e9).toFixed(2)+'B';
  if(n>=1e6)  return (n/1e6).toFixed(0)+'M';
  return n.toLocaleString();
}
function _recLabel(v) {
  if(!v) return '';
  if(v<=1.5) return 'Strong Buy';
  if(v<=2.5) return 'Buy';
  if(v<=3.5) return 'Hold';
  if(v<=4.5) return 'Underperform';
  return 'Sell';
}
function _sectorPromptNote(sector, label) {
  var notes = {
    technology: 'Prioriza FCF margin, Rule of 40, y moat tecnológico. El P/E alto puede estar justificado por crecimiento.',
    healthcare: 'Analiza pipeline, patent cliff, y diversificación de productos. El R&D yield es clave.',
    reit: 'Usa P/FFO y AFFO, no P/E. La deuda estructural es normal — evalúa LTV y cobertura del dividendo.',
    financial: 'Usa P/BV y ROE. La calidad del balance (NPL, Tier 1) supera al crecimiento.',
    energy: 'Evalúa breakeven price, FCF a precios conservadores, y disciplina de capex.',
    consumer_defensive: 'El dividendo creciente y el pricing power son las métricas de calidad definitivas.',
    consumer_cyclical: 'Muy sensible al ciclo — analiza solidez del balance en recesión y SSS growth.',
    utilities: 'Sensible a tipos. Evalúa cobertura del dividendo y % ingresos regulados.',
    telecom: 'Alta infraestructura y capex intensivo. ARPU y churn son los KPIs clave.',
    industrial: 'Evalúa ROIC sostenido y backlog. El pricing power en el ciclo completo es la señal de moat.',
  };
  return notes[sector] || 'Aplica criterios de valoración estándar para ' + label + '.';
}

// ══════════════════════════════════════════════════════════════════════
// AI RENDER — Vitaminado v3.2
// ══════════════════════════════════════════════════════════════════════
function _renderAI(a, cp, af) {
  const aiRes = document.getElementById('ai-result');
  const en = lang==='en', pt = lang==='pt';

  // Label map
  const L = {
    semaforo:  en?'Signal':pt?'Sinal':'Señal',
    conviction:en?'Conviction':pt?'Convicção':'Convicción',
    tesis:     en?'Investment Thesis':pt?'Tese de Investimento':'Tesis de Inversión',
    moat:      en?'Competitive Moat':pt?'Vantagem Competitiva':'Foso Competitivo',
    fortalezas:en?'Strengths':pt?'Pontos Fortes':'Fortalezas',
    riesgos:   en?'Key Risks':pt?'Riscos Chave':'Riesgos Clave',
    fundamental:en?'Fundamental Analysis':pt?'Análise Fundamental':'Análisis Fundamental',
    macro:     en?'Macro Context':pt?'Contexto Macro':'Contexto Macro',
    tech:      en?'Technical Signals':pt?'Sinais Técnicos':'Señales Técnicas',
    sector_insight:en?'Sector Dynamics':pt?'Dinâmica Setorial':'Dinámica Sectorial',
    peers:     en?'Comparable Peers':pt?'Peers Comparáveis':'Peers Comparables',
    catalysts: en?'Catalysts & Risks':pt?'Catalisadores e Riscos':'Catalizadores y Riesgos',
    entry:     en?'Entry Strategy':pt?'Estratégia de Entrada':'Estrategia de Entrada',
    proj:      en?'Price Projections':pt?'Projeções de Preço':'Proyecciones de Precio',
    perfil:    en?'Investor Profile':pt?'Perfil de Investidor':'Perfil de Inversor',
    conclusion:en?'Verdict':pt?'Veredicto':'Veredicto',
    bear: en?'Bear':pt?'Baixista':'Bajista',
    base: 'Base',
    bull: en?'Bull':pt?'Altista':'Alcista',
    yr:   en?'yr':pt?'ano':'año',
    yrs:  en?'yrs':pt?'anos':'años',
    timing:    en?'When to enter':pt?'Quando entrar':'Cuándo entrar',
    position:  en?'Position size':pt?'Dimensão da posição':'Tamaño de posición',
    entry_price: en?'Entry price':pt?'Preço de entrada':'Precio de entrada',
    mos_lbl:   en?'Recommended MoS':pt?'MoS recomendada':'MoS recomendado',
  };

  function blk(icon, title, content, accent, extraStyle) {
    var ac = accent || 'var(--a1)';
    var ex = extraStyle || '';
    return '<div class="ai-block" style="border-left:3px solid '+ac+';'+ex+'">'
      + '<div class="ai-block-hdr" style="color:'+ac+'">'+icon+' '+title+'</div>'
      + '<div class="ai-block-body">'+content+'</div></div>';
  }
  function pill(txt, col) {
    return '<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;'
      +'background:'+col+'18;color:'+col+';border:1px solid '+col+'40;letter-spacing:.5px;font-family:\'IBM Plex Sans\',sans-serif">'+txt+'</span>';
  }
  function mono(txt, col) {
    return '<span style="font-family:\'IBM Plex Mono\',monospace;font-size:14px;font-weight:700;color:'+(col||'var(--tx)')+'">'+txt+'</span>';
  }

  // ── Semáforo config ───────────────────────────────────────
  var SEM = {
    'COMPRAR':         { col:'#22c55e', icon:'▲', bg:'rgba(34,197,94,.08)',  border:'rgba(34,197,94,.25)' },
    'ACUMULAR':        { col:'#4ade80', icon:'↑', bg:'rgba(74,222,128,.07)', border:'rgba(74,222,128,.22)' },
    'MANTENER':        { col:'#f59e0b', icon:'→', bg:'rgba(245,158,11,.07)', border:'rgba(245,158,11,.22)' },
    'ESPERAR':         { col:'#94a3b8', icon:'◉', bg:'rgba(148,163,184,.07)',border:'rgba(148,163,184,.22)' },
    'EVITAR':          { col:'#ef4444', icon:'▼', bg:'rgba(239,68,68,.08)',  border:'rgba(239,68,68,.25)' },
  };
  var CONV = {
    'ALTA': { col:'#22c55e', label: en?'High conviction':pt?'Alta convicção':'Alta convicción' },
    'MEDIA':{ col:'#f59e0b', label: en?'Medium conviction':pt?'Média convicção':'Convicción media' },
    'BAJA': { col:'#ef4444', label: en?'Low conviction':pt?'Baixa convicção':'Baja convicción' },
  };

  var semKey = (a.semaforo||'').toUpperCase().trim();
  var sem = SEM[semKey] || SEM['MANTENER'];
  var convKey = (a.conviction||'').toUpperCase().trim();
  var conv = CONV[convKey] || CONV['MEDIA'];

  var out = '';

  // ── Hero banner — semáforo + convicción ──────────────────
  out += '<div style="background:'+sem.bg+';border:1px solid '+sem.border
    +';border-radius:14px;padding:20px 22px;margin-bottom:14px;display:flex;align-items:center;gap:18px;flex-wrap:wrap">'
    // Signal circle
    + '<div style="width:64px;height:64px;border-radius:50%;background:'+sem.col+'18;border:2px solid '+sem.col
    +';display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0">'
    + '<span style="font-size:22px;color:'+sem.col+'">'+sem.icon+'</span>'
    + '</div>'
    // Text block
    + '<div style="flex:1;min-width:0">'
    + '<div style="font-size:11px;color:var(--tx3);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px">'+L.semaforo+'</div>'
    + '<div style="font-family:\'Syne\',sans-serif;font-size:22px;font-weight:800;color:'+sem.col+';letter-spacing:-.5px;line-height:1">'+semKey+'</div>'
    + '<div style="margin-top:6px">'+pill(conv.label, conv.col)
    + (af && af.recommendMean ? '&nbsp;'+pill(_recLabel(af.recommendMean)+' consensus', '#94a3b8') : '')
    + '</div>'
    + '</div>'
    // Tesis quick preview
    + (a.tesis ? '<div style="flex:2;min-width:200px;font-size:12px;color:var(--tx2);line-height:1.65;border-left:1px solid '+sem.col+'30;padding-left:16px">'+a.tesis+'</div>' : '')
    + '</div>';

  // ── Moat ─────────────────────────────────────────────────
  if(a.moat) out += blk('🏰', L.moat,
    '<p style="font-size:12.5px;line-height:1.7;color:var(--tx2)">'+a.moat+'</p>', '#f59e0b');

  // ── Fortalezas + Riesgos (2 col) ─────────────────────────
  if(a.fortalezas || a.riesgos) {
    var fList = (a.fortalezas||[]).map(function(f){
      return '<div style="display:flex;gap:8px;margin-bottom:7px">'
        +'<span style="color:#22c55e;flex-shrink:0;font-size:14px">✦</span>'
        +'<span style="font-size:12px;color:var(--tx2);line-height:1.6">'+f+'</span></div>';
    }).join('');
    var rList = (a.riesgos||[]).map(function(r){
      return '<div style="display:flex;gap:8px;margin-bottom:7px">'
        +'<span style="color:#ef4444;flex-shrink:0;font-size:14px">▲</span>'
        +'<span style="font-size:12px;color:var(--tx2);line-height:1.6">'+r+'</span></div>';
    }).join('');
    out += '<div class="ai-block" style="border:none;padding:0"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
      +(fList?'<div style="background:rgba(34,197,94,.05);border:1px solid rgba(34,197,94,.2);border-radius:10px;padding:14px">'
        +'<div class="ai-block-hdr" style="color:#22c55e;margin-bottom:10px">✦ '+L.fortalezas+'</div>'+fList+'</div>':'')
      +(rList?'<div style="background:rgba(239,68,68,.05);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:14px">'
        +'<div class="ai-block-hdr" style="color:#ef4444;margin-bottom:10px">▲ '+L.riesgos+'</div>'+rList+'</div>':'')
      +'</div></div>';
  }

  // ── Fundamental ───────────────────────────────────────────
  if(a.fundamental) out += blk('📊', L.fundamental,
    '<p style="font-size:12.5px;line-height:1.7;color:var(--tx2)">'+a.fundamental+'</p>', 'var(--a1)');

  // ── Sector insight ────────────────────────────────────────
  if(a.sector_insight) out += blk('🏭', L.sector_insight,
    '<p style="font-size:12px;line-height:1.65;color:var(--tx2)">'+a.sector_insight+'</p>', '#8b5cf6');

  // ── Peers ─────────────────────────────────────────────────
  if(a.peers) out += blk('⚖️', L.peers,
    '<p style="font-size:12px;line-height:1.65;color:var(--tx2)">'+a.peers+'</p>', '#06b6d4');

  // ── Macro + Técnico (2 col) ───────────────────────────────
  if(a.macro || a.technical) {
    out += '<div class="ai-block" style="border:none;padding:0"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
    if(a.macro) out += '<div style="background:var(--bg3);border-radius:10px;padding:14px;border:1px solid var(--bdr)">'
      +'<div class="ai-block-hdr" style="color:var(--a2)">🌍 '+L.macro+'</div>'
      +'<p style="font-size:12px;line-height:1.65;color:var(--tx2);margin:8px 0 0">'+a.macro+'</p></div>';
    if(a.technical) out += '<div style="background:var(--bg3);border-radius:10px;padding:14px;border:1px solid var(--bdr)">'
      +'<div class="ai-block-hdr" style="color:var(--a3)">📐 '+L.tech+'</div>'
      +'<p style="font-size:12px;line-height:1.65;color:var(--tx2);margin:8px 0 0">'+a.technical+'</p></div>';
    out += '</div></div>';
  }

  // ── Catalysts ─────────────────────────────────────────────
  if(a.catalysts && a.catalysts.length) {
    var cList = a.catalysts.map(function(c, i) {
      var isLast = i === a.catalysts.length - 1;
      var col = isLast ? '#ef4444' : '#00d4aa';
      var ico = isLast ? '⚠' : '→';
      return '<div style="display:flex;gap:10px;margin-bottom:8px;align-items:flex-start">'
        +'<span style="color:'+col+';flex-shrink:0;font-size:13px;margin-top:1px">'+ico+'</span>'
        +'<span style="font-size:12px;color:var(--tx2);line-height:1.6">'+c+'</span></div>';
    }).join('');
    out += blk('🎯', L.catalysts, cList, 'var(--a4)');
  }

  // ── Entry strategy — expandida ────────────────────────────
  var e = a.entry || {};
  if(e.price || e.strategy) {
    var strat = e.strategy || '';
    var stratCol = (strat.toLowerCase().includes('comprar')||strat.toLowerCase().includes('buy'))
      ? '#22c55e' : (strat.toLowerCase().includes('evitar')||strat.toLowerCase().includes('avoid'))
      ? '#ef4444' : (strat.toLowerCase().includes('esperar')||strat.toLowerCase().includes('wait'))
      ? '#94a3b8' : 'var(--a2)';

    var entContent = '';

    // Strategy pill row
    if(strat) entContent += '<div style="margin-bottom:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
      +pill(strat.split(':')[0].trim().toUpperCase(), stratCol)
      +(e.position_size ? pill(e.position_size, '#94a3b8') : '')
      +'</div>';

    // Metrics grid
    entContent += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">';
    if(e.price) entContent += '<div style="background:var(--bg3);border-radius:8px;padding:10px 12px">'
      +'<div style="font-size:9px;color:var(--tx3);letter-spacing:1px;text-transform:uppercase;margin-bottom:3px">'+L.entry_price+'</div>'
      +mono(e.price,'#22c55e')+'</div>';
    if(e.mos) entContent += '<div style="background:var(--bg3);border-radius:8px;padding:10px 12px">'
      +'<div style="font-size:9px;color:var(--tx3);letter-spacing:1px;text-transform:uppercase;margin-bottom:3px">'+L.mos_lbl+'</div>'
      +mono(e.mos,'var(--a1)')+'</div>';
    entContent += '</div>';

    // Timing
    if(e.timing) entContent += '<div style="background:rgba(148,163,184,.06);border:1px solid rgba(148,163,184,.15);border-radius:8px;padding:10px 12px;margin-bottom:8px">'
      +'<div style="font-size:9px;color:var(--tx3);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">⏱ '+L.timing+'</div>'
      +'<span style="font-size:12px;color:var(--tx2)">'+e.timing+'</span></div>';

    if(e.rationale) entContent += '<p style="font-size:12px;color:var(--tx2);line-height:1.65;margin-top:4px">'+e.rationale+'</p>';

    out += blk('🎯', L.entry, entContent, '#22c55e');
  }

  // ── Projections — 3 scenarios ─────────────────────────────
  var p = a.projections || {};
  var bear = p.bear||{}, base = p.base||{}, bull = p.bull||{};
  if(bear['1y'] || base['1y'] || bull['1y']) {
    function scenCard(lbl, col, d) {
      var s = '<div style="background:'+col+'0d;border:1px solid '+col+'22;border-radius:10px;padding:12px;text-align:center">'
        +'<div style="font-size:9px;font-weight:700;color:'+col+';letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px">'+lbl+'</div>';
      if(d['1y']) s += '<div style="font-family:\'IBM Plex Mono\',monospace;font-size:17px;font-weight:700;color:'+col+'">'+d['1y']+'</div>'
        +'<div style="font-size:9px;color:var(--tx3);margin-bottom:6px">1 '+L.yr+'</div>';
      if(d['3y']) s += '<div style="font-family:\'IBM Plex Mono\',monospace;font-size:13px;font-weight:600;color:'+col+'99">'+d['3y']+'</div>'
        +'<div style="font-size:9px;color:var(--tx3)">3 '+L.yrs+'</div>';
      s += '</div>';
      return s;
    }
    var projContent = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">'
      +scenCard(L.bear,'#ef4444',bear)+scenCard(L.base,'var(--a1)',base)+scenCard(L.bull,'#22c55e',bull)
      +'</div>';
    // Rationales
    var rats = [];
    if(bear.rationale) rats.push('<p style="font-size:11px;margin-bottom:6px;line-height:1.6"><strong style="color:#ef4444">↓ '+L.bear+':</strong> '+bear.rationale+'</p>');
    if(base.rationale) rats.push('<p style="font-size:11px;margin-bottom:6px;line-height:1.6"><strong style="color:var(--a1)">→ '+L.base+':</strong> '+base.rationale+'</p>');
    if(bull.rationale) rats.push('<p style="font-size:11px;line-height:1.6"><strong style="color:#22c55e">↑ '+L.bull+':</strong> '+bull.rationale+'</p>');
    projContent += rats.join('');
    out += blk('📈', L.proj, projContent, 'var(--a3)');
  }

  // ── Perfil de inversor ────────────────────────────────────
  if(a.perfil_inversor) out += blk('👤', L.perfil,
    '<p style="font-size:12px;line-height:1.65;color:var(--tx2)">'+a.perfil_inversor+'</p>', 'var(--a4)');

  // ── Conclusión — veredicto final ──────────────────────────
  if(a.conclusion) {
    out += '<div class="ai-block" style="background:'+sem.bg+';border:1px solid '+sem.border+';border-left:3px solid '+sem.col+'">'
      +'<div class="ai-block-hdr" style="color:'+sem.col+'">'+sem.icon+' '+L.conclusion
      +' &nbsp;'+pill(semKey,sem.col)+'</div>'
      +'<div class="ai-block-body"><p style="font-size:13px;line-height:1.75;color:var(--tx);font-weight:500">'+a.conclusion+'</p></div></div>';
  }

  // ── Disclaimer ────────────────────────────────────────────
  out += '<div class="ai-disclaimer">⚠ '+(a.disclaimer||'Análisis orientativo. No es asesoramiento financiero.')+'</div>';

  aiRes.innerHTML = out;
  aiRes.style.display = 'flex';
}

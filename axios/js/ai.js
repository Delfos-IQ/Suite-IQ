// AXIOS·IQ — ai.js — AI Analysis (Groq/OpenAI via Worker)

// ══════════════════════════════════════════════════════════════════════
// AI ANALYSIS
// ══════════════════════════════════════════════════════════════════════
async function triggerAIAnalysis(){
  const aiBtn=document.getElementById('ai-btn');
  const aiLoad=document.getElementById('ai-loading');
  const aiRes=document.getElementById('ai-result');
  aiBtn.disabled=true;
  aiRes.style.display='none';
  aiLoad.style.display='flex';

  const cfg=SECTORS[state.sector]||SECTORS.technology;
  const inputs=state.inputs, marks=state.marks;
  const ok_i=[],bad_i=[],watch_i=[];
  ITEMS.forEach(item=>{
    const m=marks[item.id],v=inputs[item.id]||'',l=item.label.default;
    const t=l+(v?' ('+v+')':'');
    if(m==='ok') ok_i.push(t);
    else if(m==='bad') bad_i.push(t);
    else if(m==='watch') watch_i.push(t);
  });
  const res=runValuation(state);
  const cp=parseFloat(inputs.price)||state.price||0;
  const pLang=lang==='en'?'English':lang==='pt'?'Português':'Español';
  const company=state.name||state.ticker||'empresa';

  const prompt=`Eres un analista financiero senior con 20 años de experiencia en gestión de carteras. Analiza en profundidad "${company}" (sector: ${cfg.label}, ticker: ${state.ticker||'N/A'}).

DATOS CUANTITATIVOS DISPONIBLES:
- Precio actual: ${cp>0?cp+' '+( _afData?_afData.currency:''):'no disponible'}
- Valor intrínseco estimado: ${res.fv?res.fv.toFixed(2)+' ('+res.method+')':'no calculado'}
- Margen de seguridad: ${res.mos!==null?res.mos+'%':'N/A'}
- Escenario bajista/base/alcista: ${res.fv_bear?res.fv_bear.toFixed(0):'-'} / ${res.fv?res.fv.toFixed(0):'-'} / ${res.fv_bull?res.fv_bull.toFixed(0):'-'}
- Puntuación del análisis: ${res.pct}/100 (${res.ok} señales positivas, ${res.bad} negativas, ${res.watch} a vigilar de ${res.total} evaluadas)

SEÑALES POSITIVAS (${ok_i.length}): ${ok_i.join(' | ')||'ninguna'}
SEÑALES NEGATIVAS (${bad_i.length}): ${bad_i.join(' | ')||'ninguna'}
A VIGILAR (${watch_i.length}): ${watch_i.join(' | ')||'ninguna'}

DATOS FINANCIEROS CLAVE: ${Object.entries(inputs).filter(([k,v])=>v&&k!=='price').map(([k,v])=>k.toUpperCase()+': '+v).join(' | ')||'sin datos'}

Responde SOLO en ${pLang} con este JSON (sin markdown, sin texto fuera del JSON):
{
  "tesis": "3-4 frases con la tesis de inversión central — por qué esta empresa puede ser (o no) una buena inversión a largo plazo",
  "fortalezas": ["fortaleza 1 con dato concreto", "fortaleza 2 con dato concreto", "fortaleza 3 con dato concreto"],
  "riesgos": ["riesgo 1 con impacto concreto", "riesgo 2 con impacto concreto", "riesgo 3 con impacto concreto"],
  "macro": "2 frases sobre el entorno macro actual y su impacto específico en este sector y empresa",
  "fundamental": "2-3 frases interpretando los datos fundamentales disponibles — márgenes, deuda, crecimiento, valoración",
  "technical": "1-2 frases sobre el momento técnico actual — tendencia, RSI, soportes relevantes",
  "catalysts": ["catalizador positivo 1 en horizonte 12 meses", "catalizador positivo 2", "catalizador negativo o riesgo clave"],
  "entry": {
    "price": "precio o rango de entrada atractivo con justificación del múltiplo o descuento",
    "mos": "margen de seguridad recomendado en % para este tipo de empresa",
    "strategy": "estrategia concreta: compra ahora / acumula en debilidad / esperar catalizador / evitar",
    "rationale": "1 frase explicando el razonamiento de entrada"
  },
  "projections": {
    "bear": {"1y": "precio", "3y": "precio", "rationale": "1 frase con el escenario bajista y su catalizador"},
    "base": {"1y": "precio", "3y": "precio", "rationale": "1 frase con el escenario base y supuestos clave"},
    "bull": {"1y": "precio", "3y": "precio", "rationale": "1 frase con el escenario alcista y catalizador principal"}
  },
  "perfil_inversor": "A qué tipo de inversor encaja esta empresa — horizonte temporal, tolerancia al riesgo, objetivo (crecimiento/dividendo/valor)",
  "conclusion": "1-2 frases de conclusión accionable: qué debería hacer un inversor racional con esta empresa hoy",
  "disclaimer": "recordatorio orientativo breve"
}`;

  try{
    if(!WORKER_URL) throw new Error('Worker URL no configurada');
    const r=await fetch(WORKER_URL+'/ai',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({prompt,lang})
    });
    if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error||'HTTP '+r.status);}
    const d=await r.json();
    if(!d.ok) throw new Error(d.error||'Error en análisis IA');
    _renderAI(d.analysis,cp);
  }catch(err){
    console.error('AI error:',err);
    aiRes.innerHTML='<div style="color:var(--red);font-size:13px;padding:10px">⚠ '+err.message+'<br><small style="color:var(--tx3)">Verifica tu conexión.</small></div>';
    aiRes.style.display='block';
  }finally{
    aiLoad.style.display='none';
    aiBtn.disabled=false;
  }
}

function _renderAI(a,cp){
  const aiRes=document.getElementById('ai-result');
  const en=lang==='en', pt=lang==='pt';
  const L={
    tesis:    en?'Investment Thesis':pt?'Tese de Investimento':'Tesis de Inversión',
    fortalezas:en?'Strengths':pt?'Pontos Fortes':'Fortalezas',
    riesgos:  en?'Key Risks':pt?'Riscos Chave':'Riesgos Clave',
    macro:    en?'Macro Context':pt?'Contexto Macro':'Contexto Macro',
    fund:     en?'Fundamental Analysis':pt?'Análise Fundamental':'Análisis Fundamental',
    tech:     en?'Technical Signals':pt?'Sinais Técnicos':'Señales Técnicas',
    catalysts:en?'Catalysts':pt?'Catalisadores':'Catalizadores',
    entry:    en?'Entry Strategy':pt?'Estratégia de Entrada':'Estrategia de Entrada',
    proj:     en?'Price Projections':pt?'Projeções de Preço':'Proyecciones de Precio',
    perfil:   en?'Investor Profile':pt?'Perfil de Investidor':'Perfil de Inversor',
    conclusion:en?'Conclusion':pt?'Conclusão':'Conclusión',
    bear:en?'Bear':pt?'Baixista':'Bajista', base:'Base', bull:en?'Bull':pt?'Altista':'Alcista',
    yr:en?'yr':pt?'ano':'año', yrs:en?'yrs':pt?'anos':'años',
  };

  function blk(icon, title, content, accent) {
    var a = accent || 'var(--a1)';
    return '<div class="ai-block" style="border-left:3px solid '+a+'">'
      + '<div class="ai-block-hdr" style="color:'+a+'">'+icon+' '+title+'</div>'
      + '<div class="ai-block-body">'+content+'</div></div>';
  }
  function pill(txt, col) {
    return '<span style="display:inline-block;padding:2px 9px;border-radius:12px;font-size:10px;font-weight:600;background:'+col+'18;color:'+col+';border:1px solid '+col+'33;font-family:\'IBM Plex Sans\',sans-serif">'+txt+'</span>';
  }

  var out = '';

  // Tesis
  if(a.tesis) out += blk('💡', L.tesis,
    '<p style="font-size:13px;line-height:1.7;color:var(--tx)">'+a.tesis+'</p>', 'var(--a1)');

  // Fortalezas + Riesgos
  if(a.fortalezas || a.riesgos) {
    var fList = (a.fortalezas||[]).map(function(f){
      return '<div style="display:flex;gap:8px;margin-bottom:6px"><span style="color:#22c55e;flex-shrink:0">✦</span><span style="font-size:12px;color:var(--tx2)">'+f+'</span></div>';
    }).join('');
    var rList = (a.riesgos||[]).map(function(r){
      return '<div style="display:flex;gap:8px;margin-bottom:6px"><span style="color:#ef4444;flex-shrink:0">▲</span><span style="font-size:12px;color:var(--tx2)">'+r+'</span></div>';
    }).join('');
    out += '<div class="ai-block" style="border:none;padding:0"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
      + (fList ? '<div style="background:rgba(34,197,94,.05);border:1px solid rgba(34,197,94,.2);border-radius:10px;padding:14px">'
        + '<div class="ai-block-hdr" style="color:#22c55e;margin-bottom:10px">✦ '+L.fortalezas+'</div>'+fList+'</div>' : '')
      + (rList ? '<div style="background:rgba(239,68,68,.05);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:14px">'
        + '<div class="ai-block-hdr" style="color:#ef4444;margin-bottom:10px">▲ '+L.riesgos+'</div>'+rList+'</div>' : '')
      + '</div></div>';
  }

  // Macro + Fundamental + Technical
  if(a.macro)       out += blk('🌍', L.macro, '<p style="font-size:12px;line-height:1.65;color:var(--tx2)">'+a.macro+'</p>', 'var(--a2)');
  if(a.fundamental) out += blk('📊', L.fund, '<p style="font-size:12px;line-height:1.65;color:var(--tx2)">'+a.fundamental+'</p>', 'var(--a1)');
  if(a.moat)           out += blk('🏰', L.moat,      '<p style="font-size:12px;line-height:1.65;color:var(--tx2)">'+a.moat+'</p>',           '#f59e0b');
  if(a.riesgo_retorno) out += blk('📊', L.riskret,   '<p style="font-size:12px;line-height:1.65;color:var(--tx2)">'+a.riesgo_retorno+'</p>',  '#3b82f6');
  if(a.dividendo)      out += blk('💎', L.dividendo,  '<p style="font-size:12px;line-height:1.65;color:var(--tx2)">'+a.dividendo+'</p>',       '#4ade80');
  if(a.technical)      out += blk('📐', L.tech,       '<p style="font-size:12px;line-height:1.65;color:var(--tx2)">'+a.technical+'</p>',       'var(--a3)');

  // Catalysts
  if(a.catalysts && a.catalysts.length) {
    var cList = a.catalysts.map(function(c, i) {
      var isLast = i === a.catalysts.length - 1;
      var col = isLast ? '#ef4444' : '#00d4aa';
      var ico = isLast ? '⚠' : '→';
      return '<div style="display:flex;gap:8px;margin-bottom:5px"><span style="color:'+col+';flex-shrink:0">'+ico+'</span><span style="font-size:12px;color:var(--tx2)">'+c+'</span></div>';
    }).join('');
    out += blk('🎯', L.catalysts, cList, 'var(--a4)');
  }

  // Entry strategy
  var e = a.entry || {};
  if(e.price || e.strategy) {
    var strat = e.strategy || '';
    var stratCol = (strat.toLowerCase().includes('compr') || strat.toLowerCase().includes('buy'))
      ? '#22c55e' : (strat.toLowerCase().includes('evit') || strat.toLowerCase().includes('avoid'))
      ? '#ef4444' : 'var(--a2)';
    var entContent = '';
    if(strat) entContent += '<div style="margin-bottom:8px">'+pill(strat.split(':')[0].trim().toUpperCase(), stratCol)+'</div>';
    if(e.price) entContent += '<div style="margin-bottom:6px"><span style="font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:1px">'
      +(en?'Entry price':pt?'Preço de entrada':'Precio de entrada')+': </span>'
      +'<span style="font-family:\'IBM Plex Mono\',monospace;font-size:14px;color:var(--tx);font-weight:600">'+e.price+'</span></div>';
    if(e.mos) entContent += '<div style="margin-bottom:6px"><span style="font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:1px">MoS: </span>'
      +'<span style="font-family:\'IBM Plex Mono\',monospace;font-size:13px;color:#22c55e;font-weight:600">'+e.mos+'</span></div>';
    if(e.rationale) entContent += '<p style="font-size:12px;color:var(--tx2);line-height:1.6;margin-top:6px">'+e.rationale+'</p>';
    out += blk('🎯', L.entry, entContent, '#22c55e');
  }

  // Projections
  var p = a.projections || {};
  var bear = p.bear||{}, base = p.base||{}, bull = p.bull||{};
  if(bear['1y'] || base['1y'] || bull['1y']) {
    function scenCard(lbl, col, d) {
      var s = '<div style="background:'+col+'0d;border:1px solid '+col+'25;border-radius:10px;padding:12px;text-align:center">'
        + '<div style="font-size:9px;font-weight:700;color:'+col+';letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px">'+lbl+'</div>';
      if(d['1y']) s += '<div style="font-family:\'IBM Plex Mono\',monospace;font-size:16px;font-weight:700;color:'+col+'">'+d['1y']+'</div>'
        +'<div style="font-size:9px;color:var(--tx3);margin-bottom:6px">1 '+L.yr+'</div>';
      if(d['3y']) s += '<div style="font-family:\'IBM Plex Mono\',monospace;font-size:13px;font-weight:600;color:'+col+'99">'+d['3y']+'</div>'
        +'<div style="font-size:9px;color:var(--tx3)">3 '+L.yrs+'</div>';
      return s + '</div>';
    }
    var projContent = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px">'
      + scenCard(L.bear,'#ef4444',bear) + scenCard(L.base,'var(--a1)',base) + scenCard(L.bull,'#22c55e',bull)
      + '</div>';
    if(bear.rationale) projContent += '<p style="font-size:11px;margin-bottom:4px"><strong style="color:#ef4444">↓ '+L.bear+':</strong> '+bear.rationale+'</p>';
    if(base.rationale) projContent += '<p style="font-size:11px;margin-bottom:4px"><strong style="color:var(--a1)">→ '+L.base+':</strong> '+base.rationale+'</p>';
    if(bull.rationale) projContent += '<p style="font-size:11px"><strong style="color:#22c55e">↑ '+L.bull+':</strong> '+bull.rationale+'</p>';
    out += blk('📈', L.proj, projContent, 'var(--a3)');
  }

  // Perfil de inversor
  if(a.perfil_inversor) out += blk('👤', L.perfil,
    '<p style="font-size:12px;line-height:1.65;color:var(--tx2)">'+a.perfil_inversor+'</p>', 'var(--a4)');

  // Conclusión
  if(a.conclusion) {
    out += '<div class="ai-block" style="background:rgba(0,212,170,.05);border:1px solid rgba(0,212,170,.2);border-left:3px solid var(--a1)">'
      + '<div class="ai-block-hdr" style="color:var(--a1)">✅ '+L.conclusion+'</div>'
      + '<div class="ai-block-body"><p style="font-size:13px;line-height:1.7;color:var(--tx);font-weight:500">'+a.conclusion+'</p></div></div>';
  }

  // Disclaimer
  out += '<div class="ai-disclaimer">⚠ '+(a.disclaimer||'Análisis orientativo. No es asesoramiento financiero.')+'</div>';

  aiRes.innerHTML = out;
  aiRes.style.display = 'flex';
}




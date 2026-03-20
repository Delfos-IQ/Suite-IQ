/* ================================================================
   Delfos-IQ v2.1 — ai.js
   AI analysis via Groq (llama-3.3-70b-versatile) + local fallback
   ================================================================ */


async function getAI(s) {
  var sigEs={buy:"COMPRAR",sell:"VENDER",watch_buy:"VIGILAR ALCISTA",watch_sell:"VIGILAR BAJISTA",neutral:"NEUTRAL"};
  var sl = lang==="en" ? s.signal.toUpperCase().replace(/_/g," ") : (sigEs[s.signal]||s.signal);
  var prompt =
    "Analiza el siguiente ticker según el método Cava. Responde en "+(lang==="en"?"inglés":"español")+". "+
    "Ticker: "+s.ticker+" ("+s.name+"). Señal: "+sl+" (fuerza "+s.strength+"/5). "+
    "Precio: "+s.price.toFixed(2)+" | EMA55: "+s.ema55.toFixed(2)+" | "+
    "MACD M: "+(s.macdLine_M>0?"POSITIVO":"NEGATIVO")+" | "+
    "MACD W: "+(s.macdLine_W>0?"POSITIVO":"NEGATIVO")+" | "+
    "Estoc W: "+s.stochK_W.toFixed(1)+" | "+
    "Cruce D: "+(s.crossUp?"ALCISTA":"BAJISTA")+" | "+
    "ADX: "+s.adx.toFixed(1)+" | RSI: "+s.rsi.toFixed(1)+". "+
    "Explica en 4-5 frases: (1) contexto macro MACD mensual, (2) dirección semanal, "+
    "(3) calidad señal diaria y nivel ADX, (4) stop y objetivo ATR sugerido, "+
    "(5) recordatorio: contenido educativo, no consejo financiero.";

  if(CFG.WORKER){
    try{
      var r=await fetch(CFG.WORKER+CFG.GROK_PATH,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({prompt:prompt,model:"llama-3.3-70b-versatile"}),
        signal:AbortSignal.timeout(15000)
      });
      if(r.ok){var d=await r.json();if(d.text)return d.text;}
    }catch(e){/* fall through to local fallback */}
  }
  return buildFallback(s);
}



function buildFallback(s) {
  var p1map = {
    buy:        lang==="en" ? "BUY SIGNAL confirmed. All three timeframes align bullish: positive monthly MACD (" + s.macdLine_M.toFixed(3) + "), weekly MACD above zero (" + s.macdLine_W.toFixed(3) + ") and weekly stochastic in bullish zone (" + s.stochK_W.toFixed(1) + "%). This is the triple confirmation required by the Cava method before opening a long position." : "SENAL DE COMPRA confirmada. Los tres marcos temporales se alinean en direccion alcista: MACD mensual positivo (" + s.macdLine_M.toFixed(3) + "), MACD semanal sobre cero (" + s.macdLine_W.toFixed(3) + ") y estocastico semanal en zona alcista (" + s.stochK_W.toFixed(1) + "%). Esta es la triple confirmacion que exige el metodo Cava antes de abrir posicion larga.",
    sell:       lang==="en" ? "SELL SIGNAL confirmed. All three timeframes confirm bearish pressure: negative monthly MACD, weekly MACD below zero and weekly stochastic in bearish zone. The Cava method requires this triple alignment before opening a short position." : "SENAL DE VENTA confirmada. Los tres marcos temporales confirman presion bajista: MACD mensual negativo, MACD semanal bajo cero y estocastico semanal en zona bajista. El metodo Cava exige esta triple alineacion antes de abrir posicion corta.",
    watch_buy:  lang==="en" ? "Background trend is BULLISH but the daily entry signal is not yet confirmed. Monthly MACD (" + s.macdLine_M.toFixed(3) + ") and weekly (" + s.macdLine_W.toFixed(3) + ") confirm the direction. Wait for price to pull back to EMA 55 and for the daily MACD to cross bullish with both lines above zero." : "Tendencia de fondo ALCISTA pero la senal diaria no esta confirmada. MACD mensual (" + s.macdLine_M.toFixed(3) + ") y semanal (" + s.macdLine_W.toFixed(3) + ") confirman la direccion. Hay que esperar que el precio retroceda a la EMA de 55 sesiones y que el MACD diario se corte al alza con ambas lineas sobre cero.",
    watch_sell: lang==="en" ? "Background trend is BEARISH. Wait for a bounce to EMA 55 and a daily MACD bearish crossover with both lines below zero to trigger the short signal." : "Tendencia de fondo BAJISTA. Esperar rebote hasta EMA 55 y cruce MACD diario a la baja con ambas lineas bajo cero para activar la senal corta.",
    neutral:    lang==="en" ? "ADX (" + s.adx.toFixed(1) + ") indicates NO TREND in the market. Cava is categorical: do not trade in sideways markets. Trend-following systems generate false signals in directionless markets. Patience until ADX is above 25." : "ADX (" + s.adx.toFixed(1) + ") indica mercado SIN TENDENCIA. Cava es taxativo: no operar en mercados laterales. Los sistemas de seguimiento de tendencia generan senales falsas en mercados sin direccion. Paciencia hasta ADX mayor 25."
  };
  var p1 = p1map[s.signal] || p1map.neutral;
  var p2, p3, p4;
  if(s.nearEMA55) {
    p2 = lang==="en" ? "Price is IN the optimal pullback zone at EMA 55. " + (s.crossUp ? "Daily MACD just crossed bullish with both lines above zero: technically perfect entry per the Cava method." : "Waiting for daily MACD bullish crossover to complete the entry signal.") : "El precio se encuentra EN la zona de retroceso optima a la EMA de 55 sesiones. " + (s.crossUp ? "El MACD diario acaba de cruzar al alza con ambas lineas sobre cero: entrada tecnicamente perfecta segun el metodo Cava." : "Falta el cruce del MACD diario al alza para completar la senal de entrada.");
  } else {
    p2 = lang==="en" ? "Price is " + (s.ema55 ? (Math.abs(s.price-s.ema55)/s.ema55*100).toFixed(1) : "-") + "% from EMA 55. " + (s.aboveEMA55 ? "Price above EMA55: trend intact. Wait for pullback for quality entry." : "Price below EMA55: active bearish pressure.") : "El precio esta a " + (s.ema55 ? (Math.abs(s.price-s.ema55)/s.ema55*100).toFixed(1) : "-") + "% de la EMA de 55 sesiones. " + (s.aboveEMA55 ? "Precio sobre EMA55: tendencia vigente. Esperar retroceso para entrada de calidad." : "Precio bajo EMA55: presion bajista activa.");
  }
  var rrLabel = s.rr >= 2 ? (lang==="en" ? "acceptable per Cava standards." : "aceptable segun los estandares de Cava.") : (lang==="en" ? "insufficient. Cava requires minimum 1:2. Review the setup." : "insuficiente. Cava exige minimo 1:2. Revisar el setup.");
  p3 = lang==="en" ? "Stop at 2x ATR(14) = " + s.stop.toFixed(2) + ". Target at 3x ATR = " + s.target.toFixed(2) + ". R:R ratio: " + s.rr.toFixed(2) + "x, " + rrLabel : "Stop calculado a 2x ATR(14) = " + s.stop.toFixed(2) + ". Objetivo a 3x ATR = " + s.target.toFixed(2) + ". Ratio R:R: " + s.rr.toFixed(2) + "x, " + rrLabel;
  var m = new Date().getMonth(), y = new Date().getFullYear();
  var cyc = y % 4;
  var cycLbl = (L[lang] && L[lang].pres_cycle) ? L[lang].pres_cycle[cyc===3||cyc===0?2:cyc===1?0:cyc===2?1:3] : "";
  var mo = SEASONAL[m];
  p4 = lang==="en" ? "Seasonal context: " + mo.en + " has a historical average return of " + (mo.avg>0?"+":"") + mo.avg + "%. " + y + " corresponds to the " + cycLbl + " of the US presidential cycle. These factors are probability context, not entry signals, but Cava dedicates entire chapters to them for their statistical relevance." : "Contexto estacional: " + mo.es + " presenta un retorno historico medio del " + (mo.avg>0?"+":"") + mo.avg + "%. " + y + " corresponde al " + cycLbl + " del ciclo presidencial estadounidense. Estos factores son contexto de probabilidad, no senales de entrada, pero Cava les dedica capitulos enteros por su relevancia estadistica.";
  return [p1, p2, p3, p4].join("\n\n");
}

// ═══════════════════════════════════════════════════
// MAIN ANALYZE
// ═══════════════════════════════════════════════════


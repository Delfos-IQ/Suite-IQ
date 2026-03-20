/* ================================================================
   Delfos-IQ v2.1 — fetch.js
   Data fetching: Yahoo Finance via Cloudflare Worker or CORS proxy
   ================================================================ */


async function fetchData(ticker) {
  var yu = "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(ticker) + "?interval=1d&range=2y&includePrePost=false";
  if(CFG.WORKER && CFG.WORKER.indexOf("YOUR_WORKER") === -1) {
    try {
      var r = await fetch(CFG.WORKER + CFG.YAHOO_PATH + "?ticker=" + encodeURIComponent(ticker), { signal: AbortSignal.timeout(8000) });
      if(r.ok) return parseYahoo(await r.json(), ticker);
    } catch(e) { console.warn("Worker:", e.message); }
  }
  for(var i = 0; i < CFG.PROXIES.length; i++) {
    try {
      var r = await fetch(CFG.PROXIES[i](yu), { signal: AbortSignal.timeout(9000) });
      if(!r.ok) throw new Error("HTTP " + r.status);
      var raw = await r.text();
      var j; try { j = JSON.parse(raw); } catch(e) { throw new Error("parse"); }
      if(j.contents) j = JSON.parse(j.contents);
      return parseYahoo(j, ticker);
    } catch(e) { console.warn("Proxy " + i + ":", e.message); }
  }
  throw new Error("No data for " + ticker + ". " + tx("err_ticker"));
}

function parseYahoo(j, ticker) {
  if(!j.chart || !j.chart.result || !j.chart.result[0]) throw new Error("No data");
  var res = j.chart.result[0], q = res.indicators.quote[0], len = res.timestamp.length;
  var dates=[], o=[], h=[], l=[], c=[], v=[];
  for(var i = 0; i < len; i++) {
    if(q.close[i] != null && q.high[i] != null && q.low[i] != null) {
      dates.push(res.timestamp[i]); o.push(q.open[i]||q.close[i]); h.push(q.high[i]);
      l.push(q.low[i]); c.push(q.close[i]); v.push(q.volume[i]||0);
    }
  }
  if(c.length < 60) throw new Error("Insufficient data (" + c.length + " bars)");
  return { ticker: res.meta.symbol, currency: res.meta.currency||"USD",
    name: res.meta.longName||res.meta.shortName||ticker,
    price: res.meta.regularMarketPrice||c[c.length-1],
    dates: dates, open: o, high: h, low: l, close: c, volume: v };
}

// ═══════════════════════════════════════════════════
// CAVA ENGINE
// ═══════════════════════════════════════════════════
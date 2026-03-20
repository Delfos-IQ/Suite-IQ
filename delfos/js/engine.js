/* ================================================================
   Delfos-IQ v2.1 — engine.js
   Technical analysis engine: Cava Method
   EMA · MACD · Stochastic · RSI · ADX · Resample · RunEngine
   ================================================================ */


function ema(data, period) {
  if(!data || data.length < period) return new Array(data.length).fill(undefined);
  var k = 2 / (period + 1), res = new Array(period - 1).fill(undefined), s = 0;
  for(var i = 0; i < period; i++) s += data[i];
  res.push(s / period);
  for(var i = period; i < data.length; i++) res.push(data[i] * k + res[res.length-1] * (1 - k));
  return res;
}

function macd(c, f, s, sg) {
  f = f||12; s = s||26; sg = sg||9;
  var ef = ema(c,f), es = ema(c,s), line = [];
  for(var i = 0; i < c.length; i++)
    line.push(ef[i] !== undefined && es[i] !== undefined ? ef[i] - es[i] : undefined);
  var valid = line.filter(function(v){ return v !== undefined; });
  var sig = ema(valid, sg), si = 0, sigF = [];
  for(var i = 0; i < line.length; i++) {
    if(line[i] !== undefined) { sigF.push(sig[si]); si++; } else sigF.push(undefined);
  }
  return { line: line, signal: sigF };
}

function stoch(h, l, c, k, d) {
  k = k||14; d = d||3;
  var rk = new Array(k - 1).fill(undefined);
  for(var i = k - 1; i < c.length; i++) {
    var hh = Math.max.apply(null, h.slice(i-k+1, i+1));
    var ll = Math.min.apply(null, l.slice(i-k+1, i+1));
    rk.push(hh === ll ? 50 : ((c[i] - ll) / (hh - ll)) * 100);
  }
  var sk = [];
  for(var i = 0; i < rk.length; i++) {
    if(i < k + d - 2) { sk.push(undefined); continue; }
    var sum = 0, n = 0;
    for(var j = i - d + 1; j <= i; j++) if(rk[j] !== undefined) { sum += rk[j]; n++; }
    sk.push(n ? sum / n : undefined);
  }
  return sk;
}

function rsi14(c) {
  var g = [], l2 = [];
  for(var i = 1; i < c.length; i++) { var d = c[i] - c[i-1]; g.push(d>0?d:0); l2.push(d<0?-d:0); }
  var ag = 0, al = 0;
  for(var i = 0; i < 14; i++) { ag += g[i]; al += l2[i]; }
  ag /= 14; al /= 14;
  var r = new Array(14).fill(undefined);
  r.push(al === 0 ? 100 : 100 - 100 / (1 + ag / al));
  for(var i = 14; i < g.length; i++) {
    ag = (ag * 13 + g[i]) / 14; al = (al * 13 + l2[i]) / 14;
    r.push(al === 0 ? 100 : 100 - 100 / (1 + ag / al));
  }
  return r;
}

function calcADX(h, l, c, p) {
  p = p||14;
  var tr = [], pdm = [], mdm = [];
  for(var i = 1; i < c.length; i++) {
    var hl = h[i]-l[i], hpc = Math.abs(h[i]-c[i-1]), lpc = Math.abs(l[i]-c[i-1]);
    tr.push(Math.max(hl, hpc, lpc));
    var ph = h[i]-h[i-1], pl = l[i-1]-l[i];
    pdm.push(ph>pl && ph>0 ? ph : 0);
    mdm.push(pl>ph && pl>0 ? pl : 0);
  }
  function ws(a) {
    var r = [], s = a.slice(0,p).reduce(function(x,y){ return x+y; }, 0); r.push(s);
    for(var i = p; i < a.length; i++) r.push(r[r.length-1] - r[r.length-1]/p + a[i]);
    return r;
  }
  var atr = ws(tr), apd = ws(pdm), amd = ws(mdm), pdi = [], mdi = [], dx = [];
  for(var i = 0; i < atr.length; i++) {
    var pd = atr[i] ? apd[i]/atr[i]*100 : 0, md = atr[i] ? amd[i]/atr[i]*100 : 0;
    pdi.push(pd); mdi.push(md);
    dx.push((Math.abs(pd-md)) / (pd+md||1) * 100);
  }
  var adxArr = ws(dx);
  var pre = new Array(c.length - adxArr.length).fill(undefined);
  return { adx: pre.concat(adxArr), pDI: new Array(c.length-pdi.length).fill(undefined).concat(pdi), mDI: new Array(c.length-mdi.length).fill(undefined).concat(mdi) };
}


function resample(dates, o, h, l, c, v, freq) {
  var out = { dates:[], open:[], high:[], low:[], close:[], volume:[] }, bk = {};
  var gk = freq === "W"
    ? function(d){ var dt=new Date(d*1000), dy=dt.getDay(), diff=dt.getDate()-(dy||7)+1; var m=new Date(dt.setDate(diff)); return m.getFullYear()+"-"+m.getMonth(); }
    : function(d){ var dt=new Date(d*1000); return dt.getFullYear()+"-"+dt.getMonth(); };
  for(var i = 0; i < dates.length; i++) {
    var k = gk(dates[i]);
    if(!bk[k]) bk[k] = { d:dates[i], o:o[i], h:h[i], l:l[i], c:c[i], v:v[i]||0 };
    else { bk[k].h = Math.max(bk[k].h, h[i]); bk[k].l = Math.min(bk[k].l, l[i]); bk[k].c = c[i]; bk[k].v += v[i]||0; }
  }
  Object.values(bk).forEach(function(b){ out.dates.push(b.d); out.open.push(b.o); out.high.push(b.h); out.low.push(b.l); out.close.push(b.c); out.volume.push(b.v); });
  return out;
}

function last(a) { for(var i = a.length-1; i >= 0; i--) if(a[i] !== undefined) return a[i]; return 0; }

// ═══════════════════════════════════════════════════
// DATA FETCH
// ═══════════════════════════════════════════════════

function runEngine(data) {
  var c = data.close, h = data.high, l = data.low;
  var mD = macd(c), e55 = ema(c,55), e21 = ema(c,21), rsiA = rsi14(c), stD = stoch(h,l,c);
  var W = resample(data.dates, data.open, h, l, c, data.volume, "W");
  var mW = macd(W.close), stW = stoch(W.high, W.low, W.close);
  var M = resample(data.dates, data.open, h, l, c, data.volume, "M");
  var mM = macd(M.close);
  var adxD = calcADX(h, l, c, 14);
  var price = c[c.length-1], e55v = last(e55), e21v = last(e21);
  var ml_D = last(mD.line), ms_D = last(mD.signal);
  var mlp_D = mD.line[mD.line.length-2]||0, msp_D = mD.signal[mD.signal.length-2]||0;
  var ml_W = last(mW.line), ml_M = last(mM.line);
  var sk_W = last(stW), sk_D = last(stD), rsiV = last(rsiA);
  var adxV = last(adxD.adx), pDI = last(adxD.pDI), mDI = last(adxD.mDI);
  var crossUp = ml_D > ms_D && mlp_D <= msp_D;
  var crossDn = ml_D < ms_D && mlp_D >= msp_D;
  var mBull = ml_M > 0, wBull = ml_W > 0, sBull = sk_W > 60, sBear = sk_W < 40;
  var tBull = mBull && wBull && sBull, tBear = !mBull && !wBull && sBear;
  var strong = adxV > 25, bDir = pDI > mDI, abv = price > e55v;
  var near = e55v && Math.abs(price - e55v) / e55v < 0.02;
  var sig = "neutral", str = 1;
  if(tBull) {
    if(near && crossUp && ml_D > 0 && ms_D > 0 && strong && bDir) { sig="buy"; str=5; }
    else if(abv && ml_D > ms_D && ml_D > 0 && bDir) { sig="buy"; str=4; }
    else { sig="watch_buy"; str=3; }
  } else if(tBear) {
    if(near && crossDn && ml_D < 0 && ms_D < 0 && strong && !bDir) { sig="sell"; str=5; }
    else if(!abv && ml_D < ms_D && ml_D < 0 && !bDir) { sig="sell"; str=4; }
    else { sig="watch_sell"; str=3; }
  }
  var atr14 = [];
  for(var i = 1; i < c.length; i++) atr14.push(Math.max(h[i]-l[i], Math.abs(h[i]-c[i-1]), Math.abs(l[i]-c[i-1])));
  var atrS = 0; for(var i = atr14.length-14; i < atr14.length; i++) atrS += atr14[i];
  var atr = atrS / 14;
  var bull = (sig === "buy" || sig === "watch_buy");
  var stop = bull ? price - atr*2 : price + atr*2;
  var target = bull ? price + atr*3 : price - atr*3;
  var rr = Math.abs(target - price) / Math.abs(stop - price);
  var distPct = e55v ? (Math.abs(price - e55v) / e55v * 100).toFixed(1) : "-";
  var checks = [
    { lk:"ck_m_bull",  val:"M:"+(ml_M>0?">":"<")+"0 ("+ml_M.toFixed(3)+")",   state: mBull?"pass":"fail" },
    { lk:"ck_w_bull",  val:"W:"+(ml_W>0?">":"<")+"0 ("+ml_W.toFixed(3)+")",   state: wBull?"pass":(!wBull?"fail":"warn") },
    { lk:"ck_sw_bull", val:"Stoch W:"+sk_W.toFixed(1)+"%",                     state: sBull?"pass":(sBear?"fail":"warn") },
    { lk:"ck_abv55",   val:"P:"+price.toFixed(2)+" EMA55:"+e55v.toFixed(2),    state: abv?"pass":"fail" },
    { lk:"ck_near55",  val: near ? tx("ck_entry_zone") : "D "+distPct+"%",     state: near?"pass":"warn" },
    { lk:"ck_cross",   val: crossUp ? tx("ck_cross_det") : ml_D.toFixed(3),    state: crossUp?"pass":"warn" },
    { lk:"ck_d_pos",   val:"D:"+ml_D.toFixed(3)+" S:"+ms_D.toFixed(3),        state: (ml_D>0&&ms_D>0)?"pass":(ml_D<0&&ms_D<0)?"fail":"warn" },
    { lk:"ck_adx",     val:"ADX:"+adxV.toFixed(1),                             state: strong?"pass":(adxV<20?"fail":"warn") },
    { lk:"ck_di",      val:"+DI:"+pDI.toFixed(1)+" -DI:"+mDI.toFixed(1),      state: bDir?"pass":"fail" },
  ];
  return {
    ticker:data.ticker, name:data.name, currency:data.currency,
    price:price, ema55:e55v, ema21:e21v, signal:sig, strength:str,
    macdLine_D:ml_D, macdSig_D:ms_D, macdLine_W:ml_W, macdLine_M:ml_M,
    stochK_D:sk_D, stochK_W:sk_W, rsi:rsiV, adx:adxV, pDI:pDI, mDI:mDI,
    monthBull:mBull, weekBull:wBull, trendBull:tBull, trendBear:tBear,
    nearEMA55:near, crossUp:crossUp, strongTrend:strong, bullDir:bDir, aboveEMA55:abv,
    checks:checks, stop:stop, target:target, rr:rr, atr:atr,
    closes:c.slice(-80), highs:h.slice(-80), lows:l.slice(-80),
    dates:data.dates.slice(-80), ema55arr:e55.slice(-80), ema21arr:e21.slice(-80)
  };
}

// ═══════════════════════════════════════════════════
// AI NARRATIVE (Grok or fallback)
// ═══════════════════════════════════════════════════
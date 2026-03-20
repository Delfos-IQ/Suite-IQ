/**
 * AXIOS-IQ — Cloudflare Worker Proxy v4
 *
 * Sources:
 *   1. Yahoo Finance (cookie+crumb) → company fundamentals + price history
 *   2. FRED (St. Louis Fed) → macro: Fed Funds Rate + CPI inflation
 *      No API key needed for basic series.
 *
 * Routes:
 *   GET /ping              → health check
 *   GET /yahoo?ticker=AAPL → company data (fundamentals + RSI + support/resistance)
 *   GET /macro             → global macro snapshot (rates + inflation)
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const YF_MODULES = [
  'summaryDetail',
  'financialData',
  'defaultKeyStatistics',
  'price',
  'calendarEvents',
].join(',');

const BROWSER_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
};

// ── Cookie + Crumb ────────────────────────────────────────────
async function getCookieAndCrumb() {
  const cookieRes = await fetch('https://fc.yahoo.com', {
    headers: BROWSER_HEADERS, redirect: 'follow',
  });
  const cookie = (cookieRes.headers.get('set-cookie') || '').split(';')[0];
  if (!cookie) throw new Error('Could not obtain Yahoo cookie');

  const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: { ...BROWSER_HEADERS, 'Cookie': cookie },
  });
  const crumb = await crumbRes.text();
  if (!crumb || crumb.includes('{')) throw new Error('Could not obtain Yahoo crumb');
  return { cookie, crumb };
}

// ── RSI(14) ───────────────────────────────────────────────────
function calculateRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i-1];
    if (d >= 0) gains += d; else losses -= d;
  }
  let ag = gains / period, al = losses / period;
  for (let i = period+1; i < closes.length; i++) {
    const d = closes[i] - closes[i-1];
    ag = (ag*(period-1) + (d>=0?d:0)) / period;
    al = (al*(period-1) + (d<0?-d:0)) / period;
  }
  if (al === 0) return 100;
  return +(100 - 100/(1 + ag/al)).toFixed(1);
}

// ── Support/Resistance from 30d highs/lows ───────────────────
function estimateSR(closes, highs, lows) {
  if (!closes.length) return null;
  const n = Math.min(30, closes.length);
  const rH = highs.slice(-n), rL = lows.slice(-n);
  const resistance = Math.max(...rH);
  const support    = Math.min(...rL);
  const current    = closes[closes.length-1];
  return {
    support:          +support.toFixed(2),
    resistance:       +resistance.toFixed(2),
    distToResistance: +((resistance/current - 1)*100).toFixed(1),
    distToSupport:    +((current/support - 1)*100).toFixed(1),
  };
}

// ── Volume analysis ───────────────────────────────────────────
function analyzeVolume(volumes) {
  if (volumes.length < 10) return null;
  const r5  = volumes.slice(-5).reduce((a,b)=>a+b,0) / 5;
  const a20 = volumes.slice(-20).reduce((a,b)=>a+b,0) / 20;
  return { recent5: Math.round(r5), avg20: Math.round(a20), ratio: +(r5/a20).toFixed(2) };
}

// ── FRED — Federal Reserve Economic Data ─────────────────────
// Public API, no key required for simple latest-observation queries
async function fetchFRED(seriesId) {
  // FRED observations endpoint — last 2 values to detect trend
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}&vintage_date=&realtime_start=&realtime_end=&limit=2&sort_order=desc`;
  try {
    const res  = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/csv' },
    });
    const text = await res.text();
    // CSV format: DATE,VALUE\n2024-01-01,5.33\n2023-12-01,5.33
    const lines = text.trim().split('\n').filter(l => l && !l.startsWith('DATE'));
    if (!lines.length) return null;
    const [date1, val1] = lines[0].split(',');
    const [date2, val2] = lines[1] ? lines[1].split(',') : [null, null];
    const current  = parseFloat(val1);
    const previous = val2 ? parseFloat(val2) : null;
    if (isNaN(current)) return null;
    return {
      value:     +current.toFixed(2),
      previous:  previous !== null && !isNaN(previous) ? +previous.toFixed(2) : null,
      date:      date1,
      trend:     previous !== null ? (current > previous ? 'up' : current < previous ? 'down' : 'flat') : 'flat',
    };
  } catch(e) {
    return null;
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);

    // ── /ping ──────────────────────────────────────────────────
    if (url.pathname === '/ping') {
      return new Response(
        JSON.stringify({ ok:true, worker:'suite-iq', version:'5.0' }),
        { status:200, headers:CORS }
      );
    }

    // ── /macro — global macro snapshot ────────────────────────
    if (url.pathname === '/macro') {
      try {
        // Fetch in parallel: Fed Funds Rate (FEDFUNDS) + CPI YoY (CPIAUCSL)
        // + 10Y Treasury (DGS10) + EUR/USD (DEXUSEU)
        const [fedFunds, cpi, t10y, eurusd] = await Promise.all([
          fetchFRED('FEDFUNDS'),    // Fed Funds Rate %
          fetchFRED('CPIAUCSL'),    // CPI all urban consumers (level)
          fetchFRED('DGS10'),       // 10Y Treasury yield %
          fetchFRED('DEXUSEU'),     // EUR/USD exchange rate
        ]);

        // CPI YoY requires 13 months of data — use alternative series
        // CPILFESL = Core CPI YoY (available as percent change)
        const cpiYoy = await fetchFRED('CPIAUCNS'); // Monthly NSA for context

        return new Response(JSON.stringify({
          ok: true,
          data: {
            fedFunds,   // e.g. { value: 5.33, trend: 'flat' }
            cpi,        // CPI level
            t10y,       // 10Y yield
            eurusd,     // EUR/USD
          }
        }), { status:200, headers:CORS });

      } catch(err) {
        return new Response(
          JSON.stringify({ error: err.message }),
          { status:500, headers:CORS }
        );
      }
    }

    // ── /yahoo?ticker=AAPL ────────────────────────────────────
    if (url.pathname === '/yahoo') {
      const ticker = (url.searchParams.get('ticker')||'').toUpperCase().trim();
      if (!ticker || ticker.length > 12) {
        return new Response(JSON.stringify({ error:'Invalid ticker' }), { status:400, headers:CORS });
      }

      try {
        const { cookie, crumb } = await getCookieAndCrumb();
        const authH = { ...BROWSER_HEADERS, 'Cookie':cookie, 'Referer':'https://finance.yahoo.com/' };

        // Summary + chart in parallel
        const [summaryRes, chartRes] = await Promise.all([
          fetch(
            `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=${YF_MODULES}&crumb=${encodeURIComponent(crumb)}&formatted=false`,
            { headers: authH }
          ),
          fetch(
            `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=3mo&crumb=${encodeURIComponent(crumb)}`,
            { headers: authH }
          )
        ]);

        if (!summaryRes.ok) {
          return new Response(
            JSON.stringify({ error:`Yahoo returned ${summaryRes.status}` }),
            { status:502, headers:CORS }
          );
        }

        const summaryData = await summaryRes.json();
        const result = summaryData?.quoteSummary?.result?.[0];
        if (!result) {
          return new Response(JSON.stringify({ error:'No data for: '+ticker }), { status:404, headers:CORS });
        }

        // Chart data (optional)
        let closes=[], highs=[], lows=[], volumes=[];
        try {
          const chartData = await chartRes.json();
          const q = chartData?.chart?.result?.[0]?.indicators?.quote?.[0];
          if (q) {
            closes  = (q.close  ||[]).filter(x=>x!==null);
            highs   = (q.high   ||[]).filter(x=>x!==null);
            lows    = (q.low    ||[]).filter(x=>x!==null);
            volumes = (q.volume ||[]).filter(x=>x!==null);
          }
        } catch(_) {}

        const sd = result.summaryDetail        || {};
        const fd = result.financialData        || {};
        const ks = result.defaultKeyStatistics || {};
        const pr = result.price                || {};

        const v   = (o,k) => o[k]?.raw  ?? o[k]  ?? null;
        const pct = (o,k) => { const r=v(o,k); return r!==null ? +(r*100).toFixed(2):null; };

        const payload = {
          ticker,
          price:              v(pr,'regularMarketPrice'),
          currency:           pr.currency||'USD',
          marketCap:          v(pr,'marketCap'),
          name:               pr.longName||pr.shortName||ticker,
          exchange:           pr.exchangeName||'',

          // Valuation
          pe:                 v(sd,'trailingPE'),
          forwardPE:          v(sd,'forwardPE'),
          pb:                 v(sd,'priceToBook'),
          evEbitda:           v(ks,'enterpriseToEbitda'),
          evRevenue:          v(ks,'enterpriseToRevenue'),
          peg:                v(sd,'pegRatio')||v(ks,'pegRatio'),

          // Dividend
          dividendYield:      pct(sd,'dividendYield'),
          dividendRate:       v(sd,'dividendRate'),
          payoutRatio:        pct(sd,'payoutRatio'),
          fiveYearAvgDivYield:v(sd,'fiveYearAvgDividendYield'),

          // Risk
          beta:               v(sd,'beta'),

          // Margins
          grossMargin:        pct(fd,'grossMargins'),
          operatingMargin:    pct(fd,'operatingMargins'),
          netMargin:          pct(fd,'profitMargins'),

          // Growth
          revenueGrowth:      pct(fd,'revenueGrowth'),
          earningsGrowth:     pct(fd,'earningsGrowth'),

          // Cash Flow
          freeCashflow:       v(fd,'freeCashflow'),
          operatingCashflow:  v(fd,'operatingCashflow'),
          revenue:            v(fd,'totalRevenue'),

          // Balance Sheet
          debtToEquity:       v(fd,'debtToEquity'),
          currentRatio:       v(fd,'currentRatio'),
          totalCash:          v(fd,'totalCash'),
          totalDebt:          v(fd,'totalDebt'),

          // Returns
          roe:                pct(fd,'returnOnEquity'),
          roa:                pct(fd,'returnOnAssets'),

          // Analyst
          recommendMean:      v(fd,'recommendationMean'),
          targetMeanPrice:    v(fd,'targetMeanPrice'),
          numberOfAnalysts:   v(fd,'numberOfAnalystOpinions'),

          // Shares
          sharesOutstanding:  v(ks,'sharesOutstanding'),
          shortRatio:         v(ks,'shortRatio'),
          shortPercent:       pct(ks,'shortPercentOfFloat'),
          heldByInsiders:     pct(ks,'heldPercentInsiders'),
          heldByInstitutions: pct(ks,'heldPercentInstitutions'),
          sharesChange:       pct(ks,'sharesPercentSharesOut'),

          // Momentum
          week52Change:       pct(ks,'52WeekChange'),
          sandp52Change:      pct(ks,'SandP52WeekChange'),

          // Price levels
          week52High:         v(sd,'fiftyTwoWeekHigh'),
          week52Low:          v(sd,'fiftyTwoWeekLow'),
          ma50:               v(sd,'fiftyDayAverage'),
          ma200:              v(sd,'twoHundredDayAverage'),

          // Volume
          avgVolume:          v(pr,'averageVolume')||v(sd,'averageVolume'),
          avgVolume10d:       v(pr,'averageVolume10Day'),
          currentVolume:      v(pr,'regularMarketVolume'),

          // Calculated
          fcfYield:           null,
          priceVsMa200:       null,
          priceVsMa50:        null,
          week52Position:     null,
          rsi14:              null,
          ruleOf40:           null,
          supportResistance:  null,
          volumeAnalysis:     null,
          relMomentum:        null,
        };

        // Calculated
        if (payload.freeCashflow && payload.marketCap > 0)
          payload.fcfYield = +((payload.freeCashflow/payload.marketCap)*100).toFixed(2);
        if (payload.price && payload.ma200)
          payload.priceVsMa200 = +((payload.price/payload.ma200-1)*100).toFixed(2);
        if (payload.price && payload.ma50)
          payload.priceVsMa50  = +((payload.price/payload.ma50-1)*100).toFixed(2);
        if (payload.price && payload.week52High && payload.week52Low) {
          const range = payload.week52High - payload.week52Low;
          if (range>0) payload.week52Position = +(((payload.price-payload.week52Low)/range)*100).toFixed(1);
        }
        if (closes.length > 15) payload.rsi14 = calculateRSI(closes);
        if (payload.revenueGrowth!==null && payload.freeCashflow && payload.revenue>0)
          payload.ruleOf40 = +(payload.revenueGrowth + (payload.freeCashflow/payload.revenue)*100).toFixed(1);
        if (closes.length > 10) payload.supportResistance = estimateSR(closes, highs, lows);
        if (volumes.length > 10) payload.volumeAnalysis   = analyzeVolume(volumes);
        if (payload.week52Change!==null && payload.sandp52Change!==null)
          payload.relMomentum = +(payload.week52Change - payload.sandp52Change).toFixed(1);

        return new Response(JSON.stringify({ ok:true, data:payload }), { status:200, headers:CORS });

      } catch(err) {
        return new Response(JSON.stringify({ error:err.message }), { status:500, headers:CORS });
      }
    }


    // ── /ai — Groq LLM analysis ───────────────────────────────
    if (url.pathname === '/ai') {
      const GROQ_KEY = env.GROQ_API_KEY;
      if (!GROQ_KEY) {
        return new Response(
          JSON.stringify({ error: 'GROQ_API_KEY not configured in Worker env' }),
          { status: 500, headers: CORS }
        );
      }

      let body;
      try { body = await request.json(); }
      catch(e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status:400, headers:CORS });
      }

      const { prompt, lang } = body;
      if (!prompt) {
        return new Response(JSON.stringify({ error: 'Missing prompt' }), { status:400, headers:CORS });
      }

      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': 'Bearer ' + GROQ_KEY,
          },
          body: JSON.stringify({
            model:       'llama-3.3-70b-versatile',
            max_tokens:  1200,
            temperature: 0.3,
            messages: [
              {
                role: 'system',
                content: 'Eres un analista financiero experto. Respondes SIEMPRE en ' +
                  (lang==='en'?'English':lang==='pt'?'Português':'Español') +
                  '. Respondes SOLO con JSON válido, sin markdown, sin texto adicional.'
              },
              { role: 'user', content: prompt }
            ],
          }),
        });

        if (!groqRes.ok) {
          const errData = await groqRes.json().catch(() => ({}));
          return new Response(
            JSON.stringify({ error: errData.error?.message || 'Groq error ' + groqRes.status }),
            { status: 502, headers: CORS }
          );
        }

        const groqData = await groqRes.json();
        const raw = groqData.choices?.[0]?.message?.content || '';

        // Parse JSON from response
        let analysis;
        try {
          const cleaned = raw.replace(/```json|```/g, '').trim();
          analysis = JSON.parse(cleaned);
        } catch(e) {
          return new Response(
            JSON.stringify({ error: 'AI response was not valid JSON', raw: raw.slice(0,200) }),
            { status: 502, headers: CORS }
          );
        }

        return new Response(
          JSON.stringify({ ok: true, analysis }),
          { status: 200, headers: CORS }
        );

      } catch(err) {
        return new Response(
          JSON.stringify({ error: err.message }),
          { status: 500, headers: CORS }
        );
      }
    }

    return new Response(
      JSON.stringify({ error:'Use /yahoo?ticker=AAPL or /macro' }),
      { status:404, headers:CORS }
    );
  },
};

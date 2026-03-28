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
        const [summaryRes, chartRes, fredFF] = await Promise.all([
          fetch(
            `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=${YF_MODULES}&crumb=${encodeURIComponent(crumb)}&formatted=false`,
            { headers: authH }
          ),
          fetch(
            `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y&crumb=${encodeURIComponent(crumb)}`,
            { headers: authH }
          ),
          fetchFRED('FEDFUNDS'),
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
          // Risk & Momentum (added v5.1)
          sharpeRatio:        null,
          sortinoRatio:       null,
          volatility:         null,
          maxDrawdown:        null,
          riskFreeRate:       null,
          momentum1M:         null,
          momentum3M:         null,
          momentum6M:         null,
          momentum12M:        null,
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

        // ── Risk & Momentum metrics ───────────────────────────────
        if (closes.length > 30) {
          const rfRate = fredFF ? fredFF.value : 4.5;  // FEDFUNDS annual %
          const rfDaily = rfRate / 100 / 252;

          // Daily returns
          const rets = [];
          for (let i = 1; i < closes.length; i++)
            rets.push((closes[i] - closes[i-1]) / closes[i-1]);

          const n = rets.length;
          const meanRet = rets.reduce((a,b) => a+b, 0) / n;
          const annRet  = meanRet * 252;
          const variance = rets.reduce((a,b) => a + (b-meanRet)**2, 0) / n;
          const annVol  = Math.sqrt(variance * 252);

          // Sharpe ratio
          const exRets   = rets.map(r => r - rfDaily);
          const meanExc  = exRets.reduce((a,b) => a+b, 0) / n;
          const excVar   = exRets.reduce((a,b) => a + (b-meanExc)**2, 0) / n;
          const sharpe   = annVol > 0 ? (meanExc * 252) / Math.sqrt(excVar * 252) : null;

          // Sortino ratio (downside deviation only)
          const negRets  = rets.filter(r => r < rfDaily);
          const ddVar    = negRets.length > 0
            ? negRets.reduce((a,b) => a + (b - rfDaily)**2, 0) / n
            : 0;
          const ddDev    = Math.sqrt(ddVar * 252);
          const sortino  = ddDev > 0 ? (annRet - rfRate/100) / ddDev : null;

          // Max Drawdown
          let peak = closes[0], maxDD = 0;
          for (const c of closes) {
            if (c > peak) peak = c;
            const dd = (peak - c) / peak;
            if (dd > maxDD) maxDD = dd;
          }

          // Momentum (trading days: 1M≈21, 3M≈63, 6M≈126, 12M≈252)
          const cl = closes;
          const len = cl.length;
          const mom = (bars) => len > bars ? +((cl[len-1]/cl[len-1-bars]-1)*100).toFixed(1) : null;

          payload.sharpeRatio   = sharpe   !== null ? +sharpe.toFixed(2)   : null;
          payload.sortinoRatio  = sortino  !== null ? +sortino.toFixed(2)  : null;
          payload.volatility    = +(annVol * 100).toFixed(1);
          payload.maxDrawdown   = +(-maxDD * 100).toFixed(1);
          payload.riskFreeRate  = rfRate;
          payload.momentum1M    = mom(21);
          payload.momentum3M    = mom(63);
          payload.momentum6M    = mom(126);
          payload.momentum12M   = mom(252);
        }
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



    // ── /peers — sector benchmark medians (Fase 2) ───────────
    if (url.pathname === '/peers') {
      const sector  = (url.searchParams.get('sector') || 'technology').toLowerCase();
      const exclude = (url.searchParams.get('exclude') || '').toUpperCase().trim();

      const SECTOR_PEERS = {
        technology:         ['MSFT','NVDA','META','GOOGL','AMZN'],
        healthcare:         ['JNJ','UNH','ABT','TMO','PFE'],
        consumer_cyclical:  ['HD','MCD','NKE','LOW','TGT'],
        consumer_defensive: ['PG','KO','PEP','WMT','COST'],
        financial:          ['JPM','BAC','WFC','GS','MS'],
        reit:               ['PLD','AMT','EQIX','SPG','PSA'],
        energy:             ['XOM','CVX','COP','SLB','EOG'],
        industrial:         ['HON','UNP','GE','CAT','LMT'],
        utilities:          ['NEE','DUK','SO','AEP','EXC'],
        telecom:            ['VZ','T','TMUS','CMCSA','CHTR'],
      };

      const peers = (SECTOR_PEERS[sector] || SECTOR_PEERS.technology)
        .filter(t => t !== exclude).slice(0, 5);

      try {
        const { cookie, crumb } = await getCookieAndCrumb();
        const authH = { ...BROWSER_HEADERS, 'Cookie': cookie, 'Referer': 'https://finance.yahoo.com/' };
        const PEER_MODULES = 'summaryDetail,financialData,defaultKeyStatistics';

        const results = await Promise.allSettled(
          peers.map(ticker =>
            fetch(
              `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}` +
              `?modules=${PEER_MODULES}&crumb=${encodeURIComponent(crumb)}&formatted=false`,
              { headers: authH }
            )
            .then(r => r.ok ? r.json() : null)
            .then(j => {
              const res = j && j.quoteSummary && j.quoteSummary.result && j.quoteSummary.result[0];
              if (!res) return null;
              const sd = res.summaryDetail        || {};
              const fd = res.financialData        || {};
              const ks = res.defaultKeyStatistics || {};
              const v   = (o,k) => (o[k] && o[k].raw !== undefined ? o[k].raw : o[k]) || null;
              const pct = (o,k) => { const r=v(o,k); return r!==null ? +(r*100).toFixed(2) : null; };
              return {
                ticker,
                pe: v(sd,'trailingPE'),
                pb: v(sd,'priceToBook') || v(ks,'priceToBook'),
                gm: pct(fd,'grossMargins'),
                rg: pct(fd,'revenueGrowth'),
                eg: pct(fd,'earningsGrowth'),
                de: v(fd,'debtToEquity'),
                dy: pct(sd,'dividendYield'),
              };
            })
            .catch(() => null)
          )
        );

        const valid = results
          .map(r => r.status === 'fulfilled' ? r.value : null)
          .filter(Boolean);

        if (!valid.length) {
          return new Response(
            JSON.stringify({ ok: false, error: 'No peer data', fallback: true }),
            { status: 200, headers: CORS }
          );
        }

        function median(arr) {
          const vals = arr.filter(v2 => v2 !== null && !isNaN(v2)).sort((a,b) => a-b);
          if (!vals.length) return null;
          const mid = Math.floor(vals.length / 2);
          return vals.length % 2 !== 0
            ? +vals[mid].toFixed(2)
            : +((vals[mid-1] + vals[mid]) / 2).toFixed(2);
        }

        const medians = {
          pe: median(valid.map(p => p.pe)),
          pb: median(valid.map(p => p.pb)),
          gm: median(valid.map(p => p.gm)),
          rg: median(valid.map(p => p.rg)),
          eg: median(valid.map(p => p.eg)),
          de: median(valid.map(p => p.de !== null ? p.de / 100 : null)),
          dy: median(valid.map(p => p.dy)),
        };

        return new Response(
          JSON.stringify({ ok:true, sector, exclude, peers: valid.map(p=>p.ticker), n: valid.length, medians }),
          { status: 200, headers: CORS }
        );

      } catch(err) {
        return new Response(
          JSON.stringify({ ok: false, error: err.message, fallback: true }),
          { status: 200, headers: CORS }
        );
      }
    }

    // ── /ai — OpenAI primary · Groq fallback ────────────────────
    if (url.pathname === '/ai') {
      const OPENAI_KEY = env.OPENAI_API_KEY;
      const GROQ_KEY   = env.GROQ_API_KEY;

      if (!OPENAI_KEY && !GROQ_KEY) {
        return new Response(
          JSON.stringify({ error: 'No AI keys configured. Add OPENAI_API_KEY or GROQ_API_KEY in Worker secrets.' }),
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

      const langName = lang === 'en' ? 'English' : lang === 'pt' ? 'Português' : 'Español';
      const systemMsg = 'Eres un analista financiero experto. Respondes SIEMPRE en ' + langName +
        '. Respondes SOLO con JSON válido, sin markdown, sin texto adicional.';

      // ── Helper: call any OpenAI-compatible endpoint ────────────
      async function callLLM(apiUrl, apiKey, model, useJsonMode) {
        const reqBody = {
          model,
          max_tokens:  1200,
          temperature: 0.3,
          messages: [
            { role: 'system', content: systemMsg },
            { role: 'user',   content: prompt },
          ],
        };
        // OpenAI supports response_format for guaranteed JSON — Groq does not
        if (useJsonMode) reqBody.response_format = { type: 'json_object' };

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
          body: JSON.stringify(reqBody),
        });
        return res;
      }

      // ── Helper: parse JSON from response text ──────────────────
      function parseAnalysis(raw) {
        const cleaned = raw.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
      }

      // ── 1. Try OpenAI (GPT-4.1-mini) ──────────────────────────
      if (OPENAI_KEY) {
        try {
          const res = await callLLM(
            'https://api.openai.com/v1/chat/completions',
            OPENAI_KEY,
            'gpt-4.1-mini',
            true  // json_object mode
          );

          // Quota / billing exhausted → fall through to Groq
          // 429 = rate-limit, 402 = payment required, 5xx = server error
          const shouldFallback = res.status === 429 || res.status === 402 || res.status >= 500;

          if (res.ok) {
            const data = await res.json();
            const raw  = data.choices?.[0]?.message?.content || '';
            try {
              const analysis = parseAnalysis(raw);
              return new Response(
                JSON.stringify({ ok: true, analysis, _provider: 'openai' }),
                { status: 200, headers: CORS }
              );
            } catch(e) {
              // JSON parse failed — fall through to Groq
              console.warn('[AXIOS-AI] OpenAI JSON parse failed, falling back to Groq');
            }
          } else if (!shouldFallback) {
            // 400 / 401 / 404 — hard error, no point retrying with Groq
            const errData = await res.json().catch(() => ({}));
            return new Response(
              JSON.stringify({ error: errData.error?.message || 'OpenAI error ' + res.status }),
              { status: 502, headers: CORS }
            );
          }
          // else: shouldFallback = true → continue to Groq below
        } catch(err) {
          console.warn('[AXIOS-AI] OpenAI fetch error:', err.message);
          // Network error → fall through to Groq
        }
      }

      // ── 2. Groq fallback (llama-3.3-70b) ──────────────────────
      if (!GROQ_KEY) {
        return new Response(
          JSON.stringify({ error: 'OpenAI unavailable and GROQ_API_KEY not configured.' }),
          { status: 502, headers: CORS }
        );
      }

      try {
        const res = await callLLM(
          'https://api.groq.com/openai/v1/chat/completions',
          GROQ_KEY,
          'llama-3.3-70b-versatile',
          false  // Groq ignores response_format
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return new Response(
            JSON.stringify({ error: errData.error?.message || 'Groq error ' + res.status }),
            { status: 502, headers: CORS }
          );
        }

        const data = await res.json();
        const raw  = data.choices?.[0]?.message?.content || '';

        let analysis;
        try {
          analysis = parseAnalysis(raw);
        } catch(e) {
          return new Response(
            JSON.stringify({ error: 'Groq response was not valid JSON', raw: raw.slice(0, 200) }),
            { status: 502, headers: CORS }
          );
        }

        return new Response(
          JSON.stringify({ ok: true, analysis, _provider: 'groq' }),
          { status: 200, headers: CORS }
        );

      } catch(err) {
        return new Response(
          JSON.stringify({ error: 'Both AI providers failed: ' + err.message }),
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

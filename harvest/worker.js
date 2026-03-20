/**
 * HARVEST-IQ — Cloudflare Worker v1
 *
 * Worker independiente para Harvest-IQ. No modifica ni depende
 * del Worker de AXIOS-IQ (axios-proxy).
 *
 * Rutas:
 *   GET  /ping                        → health check
 *   GET  /quote?ticker=MSFT           → datos de dividendo de una acción
 *   GET  /quotes?tickers=MSFT,KO,PEP  → datos de múltiples acciones (hasta 30)
 *   POST /ai                          → análisis IA de cartera con Groq
 *
 * Variables de entorno (Cloudflare → Settings → Variables and Secrets):
 *   GROQ_API_KEY  → tu API key de Groq (tipo Secret)
 *
 * Deploy:
 *   1. Workers & Pages → Create Worker → nombre: harvest-proxy
 *   2. Pega este código → Deploy
 *   3. Settings → Variables and Secrets → Add Secret: GROQ_API_KEY
 *   4. En Harvest-IQ, configura la URL: https://harvest-proxy.TU-NOMBRE.workers.dev
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const MODULES = 'summaryDetail,price,defaultKeyStatistics,calendarEvents';

const BROWSER_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer':         'https://finance.yahoo.com/',
};

// Tickers que Yahoo maneja con símbolo diferente
const TICKER_MAP = {
  'BRK.B':  'BRK-B',
  'BRK/B':  'BRK-B',
  'LVMHF':  'MC.PA',
  'NSRGF':  'NESN.SW',
  'RHHBY':  'ROG.SW',
};

// ── Cookie + Crumb auth (required since 2023) ─────────────────
async function getCookieAndCrumb() {
  const cookieRes = await fetch('https://fc.yahoo.com', {
    headers: BROWSER_HEADERS,
    redirect: 'follow',
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

// ── Fetch single ticker from Yahoo ───────────────────────────
async function fetchQuote(ticker, cookie, crumb) {
  const yahooTicker = TICKER_MAP[ticker] || ticker;
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooTicker)}`
    + `?modules=${MODULES}&crumb=${encodeURIComponent(crumb)}&formatted=false`;

  const res = await fetch(url, {
    headers: { ...BROWSER_HEADERS, 'Cookie': cookie },
  });

  if (!res.ok) return { ticker, error: `Yahoo returned ${res.status}` };

  let raw;
  try { raw = await res.json(); }
  catch(e) { return { ticker, error: 'Invalid response from Yahoo' }; }

  return parseQuote(ticker, raw);
}

// ── Parse Yahoo response → Harvest-IQ format ─────────────────
function parseQuote(ticker, raw) {
  try {
    const qs = raw?.quoteSummary;
    if (!qs || qs.error) return { ticker, error: qs?.error?.description || 'No data' };

    const result = qs.result?.[0];
    if (!result) return { ticker, error: 'Ticker not found' };

    const pr  = result.price               || {};
    const sd  = result.summaryDetail       || {};
    const ks  = result.defaultKeyStatistics|| {};
    const cal = result.calendarEvents      || {};

    const v   = (o, k) => o[k]?.raw ?? o[k] ?? null;
    const pct = (o, k) => { const r = v(o,k); return r !== null ? +(r*100).toFixed(4) : null; };

    const price        = v(pr, 'regularMarketPrice') || 0;
    const divRate      = v(sd, 'dividendRate') || 0;         // annual forward
    const divYieldTTM  = pct(sd, 'dividendYield') || 0;
    const divYieldFwd  = pct(sd, 'trailingAnnualDividendYield') || 0;
    const payoutRatio  = pct(sd, 'payoutRatio') || 0;
    const exDivRaw     = v(sd, 'exDividendDate');
    const exDivDate    = exDivRaw ? new Date(exDivRaw * 1000).toLocaleDateString('en-US') : null;

    // Infer dividend frequency
    const freq = inferFrequency(ticker, divRate, sd);
    const freqN = { M: 12, Q: 4, S: 2, A: 1 }[freq] || 4;
    const dpp   = divRate > 0 ? +(divRate / freqN).toFixed(4) : 0;

    // 5-year avg yield for history analysis
    const fiveYearYield = v(sd, 'fiveYearAvgDividendYield') || null;

    // Beta
    const beta = v(sd, 'beta') || null;

    // PE
    const pe = v(sd, 'trailingPE') || null;

    // Payout from EPS
    const eps = v(ks, 'trailingEps') || null;

    // Next earnings date
    const nextEarnings = cal.earnings?.earningsDate?.[0]?.raw
      ? new Date(cal.earnings.earningsDate[0].raw * 1000).toLocaleDateString('en-US')
      : null;

    return {
      ticker,
      // Price
      price:         +(price).toFixed(2),
      change:        +(v(pr, 'regularMarketChangePercent') * 100 || 0).toFixed(2),
      currency:      pr.currency || 'USD',
      exchange:      pr.exchangeName || '',
      name:          pr.longName || pr.shortName || ticker,
      // Dividend
      adps:          +(divRate).toFixed(4),          // annual dividend per share (forward)
      dpp:           dpp,                             // dividend per payment
      freq:          freq,                            // M / Q / S / A
      yld:           +(divYieldTTM).toFixed(2),       // TTM yield %
      yldFwd:        +(divYieldFwd).toFixed(2),       // Forward yield %
      yld5y:         fiveYearYield ? +fiveYearYield.toFixed(2) : null,
      payout:        +(payoutRatio).toFixed(2),
      exDiv:         exDivDate,
      // Quality metrics
      pe:            pe ? +pe.toFixed(1) : null,
      beta:          beta ? +beta.toFixed(2) : null,
      eps:           eps ? +eps.toFixed(2) : null,
      // Market
      marketCap:     v(pr, 'marketCap') || 0,
      nextEarnings:  nextEarnings,
      // Meta
      _source:       'yahoo',
      _ts:           Date.now(),
    };

  } catch(e) {
    return { ticker, error: 'Parse error: ' + e.message };
  }
}

// ── Infer dividend frequency ──────────────────────────────────
function inferFrequency(ticker, annualRate, sd) {
  // Known monthly payers
  const MONTHLY = [
    'O','MAIN','STAG','AGNC','NLY','IIPR','GLAD','GAIN','PFLT',
    'PSEC','SLRC','NEWT','OXSQ','BXMX','LAND','FPI','PINE',
    'REALTY','ELME','SLR','SUNS','WHF','HRZN','TPVG','CSWC',
  ];
  if (MONTHLY.includes(ticker.toUpperCase())) return 'M';

  // Use trailing annual div / forward rate ratio as heuristic
  const trailing = sd?.trailingAnnualDividendRate?.raw || 0;
  if (trailing > 0 && annualRate > 0) {
    const ratio = trailing / annualRate;
    if (ratio > 0.8 && ratio < 1.2) {
      // Stable — check against common payment sizes
      if (annualRate > 0) {
        const qDiv = annualRate / 4;
        const mDiv = annualRate / 12;
        const sDiv = annualRate / 2;
        // If annual / 12 is a "round" number, likely monthly
        if (mDiv < 0.2 && mDiv > 0.005) return 'M'; // high-yield monthly BDC/REIT range
      }
    }
  }

  // Default: quarterly (most US dividend stocks)
  return 'Q';
}

// ── Main Worker ───────────────────────────────────────────────
export default {
  async fetch(request, env) {

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url  = new URL(request.url);
    const path = url.pathname;

    // ── /ping ────────────────────────────────────────────────
    if (path === '/ping') {
      return new Response(
        JSON.stringify({ ok: true, worker: 'harvest-iq', version: '1.0' }),
        { status: 200, headers: CORS }
      );
    }

    // ── /quote?ticker=MSFT ───────────────────────────────────
    if (path === '/quote') {
      const ticker = (url.searchParams.get('ticker') || '').toUpperCase().trim();
      if (!ticker) {
        return new Response(JSON.stringify({ error: 'ticker required' }), { status: 400, headers: CORS });
      }
      try {
        const { cookie, crumb } = await getCookieAndCrumb();
        const data = await fetchQuote(ticker, cookie, crumb);
        return new Response(JSON.stringify(data), { status: 200, headers: CORS });
      } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
      }
    }

    // ── /quotes?tickers=MSFT,KO,PEP ─────────────────────────
    if (path === '/quotes') {
      const param = url.searchParams.get('tickers') || '';
      if (!param) {
        return new Response(JSON.stringify({ error: 'tickers required' }), { status: 400, headers: CORS });
      }
      const tickers = param.split(',').map(t => t.trim().toUpperCase()).filter(Boolean).slice(0, 30);

      try {
        const { cookie, crumb } = await getCookieAndCrumb();

        // Fetch in parallel (batches of 5 to be polite)
        const BATCH = 5;
        const results = {};

        for (let i = 0; i < tickers.length; i += BATCH) {
          const batch = tickers.slice(i, i + BATCH);
          const settled = await Promise.allSettled(
            batch.map(t => fetchQuote(t, cookie, crumb).then(d => ({ t, d })))
          );
          for (const s of settled) {
            if (s.status === 'fulfilled') results[s.value.t] = s.value.d;
          }
          if (i + BATCH < tickers.length) await new Promise(r => setTimeout(r, 150));
        }

        return new Response(
          JSON.stringify({ results, count: Object.keys(results).length, timestamp: new Date().toISOString() }),
          { status: 200, headers: CORS }
        );

      } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
      }
    }

    // ── /ai — Portfolio analysis with Groq ───────────────────
    if (path === '/ai') {
      const GROQ_KEY = env.GROQ_API_KEY;
      if (!GROQ_KEY) {
        return new Response(
          JSON.stringify({ error: 'GROQ_API_KEY not configured. Add it in Workers → Settings → Variables and Secrets.' }),
          { status: 500, headers: CORS }
        );
      }

      let body;
      try { body = await request.json(); }
      catch(e) { return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: CORS }); }

      const { prompt, lang } = body;
      if (!prompt) {
        return new Response(JSON.stringify({ error: 'Missing prompt' }), { status: 400, headers: CORS });
      }

      const langName = lang === 'en' ? 'English' : lang === 'pt' ? 'Português' : 'Español';

      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': 'Bearer ' + GROQ_KEY,
          },
          body: JSON.stringify({
            model:       'llama-3.3-70b-versatile',
            max_tokens:  1800,
            temperature: 0.3,
            messages: [
              {
                role: 'system',
                content:
                  'Eres un asesor de inversión en dividendos DGI (Dividend Growth Investing) experto. ' +
                  'Respondes SIEMPRE en ' + langName + '. ' +
                  'Respondes SOLO con JSON válido, sin markdown, sin texto adicional fuera del JSON.',
              },
              { role: 'user', content: prompt },
            ],
          }),
        });

        if (!groqRes.ok) {
          const err = await groqRes.json().catch(() => ({}));
          return new Response(
            JSON.stringify({ error: err.error?.message || 'Groq error ' + groqRes.status }),
            { status: 502, headers: CORS }
          );
        }

        const groqData = await groqRes.json();
        const raw = groqData.choices?.[0]?.message?.content || '';

        let analysis;
        try {
          analysis = JSON.parse(raw.replace(/```json|```/g, '').trim());
        } catch(e) {
          return new Response(
            JSON.stringify({ error: 'AI response was not valid JSON', raw: raw.slice(0, 300) }),
            { status: 502, headers: CORS }
          );
        }

        return new Response(JSON.stringify({ ok: true, analysis }), { status: 200, headers: CORS });

      } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
      }
    }

    return new Response(
      JSON.stringify({ error: 'Unknown route. Use /quote?ticker=X, /quotes?tickers=X,Y or POST /ai' }),
      { status: 404, headers: CORS }
    );
  },
};

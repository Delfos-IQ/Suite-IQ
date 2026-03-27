/**
 * HARVEST-IQ — Cloudflare Worker v2
 *
 * Worker independiente para Harvest-IQ.
 *
 * Rutas:
 *   GET  /ping                        → health check
 *   GET  /quote?ticker=MSFT           → datos de dividendo de una acción
 *   GET  /quotes?tickers=MSFT,KO,PEP  → datos de múltiples acciones (hasta 30)
 *   POST /ai                          → análisis IA con OpenAI (primario) + Groq (fallback)
 *
 * Variables de entorno (Cloudflare → Settings → Variables and Secrets):
 *   OPENAI_API_KEY  → API key de OpenAI  (tipo Secret) — primario
 *   GROQ_API_KEY    → API key de Groq    (tipo Secret) — fallback automático
 *
 * Estrategia IA:
 *   1. Intenta OpenAI GPT-4.1-mini (pago, mejor calidad JSON estructurado)
 *   2. Si falla (sin crédito, error, timeout) → Groq llama-3.3-70b (gratuito)
 *   La respuesta incluye `_provider: "openai"|"groq"` para depuración.
 *
 * Deploy:
 *   1. Workers & Pages → Create Worker → nombre: harvest-iq
 *   2. Pega este código → Deploy
 *   3. Settings → Variables and Secrets:
 *      - Add Secret: OPENAI_API_KEY  (tu key de OpenAI, empieza por sk-...)
 *      - Add Secret: GROQ_API_KEY    (tu key de Groq, empieza por gsk_...)
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

const TICKER_MAP = {
  'BRK.B':  'BRK-B',
  'BRK/B':  'BRK-B',
  'LVMHF':  'MC.PA',
  'NSRGF':  'NESN.SW',
  'RHHBY':  'ROG.SW',
};

// ── Cookie + Crumb auth ───────────────────────────────────────
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
    const divRate      = v(sd, 'dividendRate') || 0;
    const divYieldTTM  = pct(sd, 'dividendYield') || 0;
    const divYieldFwd  = pct(sd, 'trailingAnnualDividendYield') || 0;
    const payoutRatio  = pct(sd, 'payoutRatio') || 0;
    const exDivRaw     = v(sd, 'exDividendDate');
    const exDivDate    = exDivRaw ? new Date(exDivRaw * 1000).toLocaleDateString('en-US') : null;

    const freq = inferFrequency(ticker, divRate, sd);
    const freqN = { M: 12, Q: 4, S: 2, A: 1 }[freq] || 4;
    const dpp   = divRate > 0 ? +(divRate / freqN).toFixed(4) : 0;

    const fiveYearYield = v(sd, 'fiveYearAvgDividendYield') || null;
    const beta          = v(sd, 'beta') || null;
    const pe            = v(sd, 'trailingPE') || null;
    const eps           = v(ks, 'trailingEps') || null;

    const nextEarnings = cal.earnings?.earningsDate?.[0]?.raw
      ? new Date(cal.earnings.earningsDate[0].raw * 1000).toLocaleDateString('en-US')
      : null;

    return {
      ticker,
      price:        +(price).toFixed(2),
      change:       +(v(pr, 'regularMarketChangePercent') * 100 || 0).toFixed(2),
      currency:     pr.currency || 'USD',
      exchange:     pr.exchangeName || '',
      name:         pr.longName || pr.shortName || ticker,
      adps:         +(divRate).toFixed(4),
      dpp:          dpp,
      freq:         freq,
      yld:          +(divYieldTTM).toFixed(2),
      yldFwd:       +(divYieldFwd).toFixed(2),
      yld5y:        fiveYearYield ? +fiveYearYield.toFixed(2) : null,
      payout:       +(payoutRatio).toFixed(2),
      exDiv:        exDivDate,
      pe:           pe ? +pe.toFixed(1) : null,
      beta:         beta ? +beta.toFixed(2) : null,
      eps:          eps ? +eps.toFixed(2) : null,
      marketCap:    v(pr, 'marketCap') || 0,
      nextEarnings: nextEarnings,
      _source:      'yahoo',
      _ts:          Date.now(),
    };

  } catch(e) {
    return { ticker, error: 'Parse error: ' + e.message };
  }
}

// ── Infer dividend frequency ──────────────────────────────────
function inferFrequency(ticker, annualRate, sd) {
  const MONTHLY = [
    'O','MAIN','STAG','AGNC','NLY','IIPR','GLAD','GAIN','PFLT',
    'PSEC','SLRC','NEWT','OXSQ','BXMX','LAND','FPI','PINE',
    'REALTY','ELME','SLR','SUNS','WHF','HRZN','TPVG','CSWC',
  ];
  if (MONTHLY.includes(ticker.toUpperCase())) return 'M';

  const trailing = sd?.trailingAnnualDividendRate?.raw || 0;
  if (trailing > 0 && annualRate > 0) {
    const mDiv = annualRate / 12;
    if (mDiv < 0.2 && mDiv > 0.005) return 'M';
  }
  return 'Q';
}

// ══════════════════════════════════════════════════════════════
// ── AI helpers — OpenAI primary + Groq fallback ──────────────
// ══════════════════════════════════════════════════════════════

/**
 * Calls OpenAI GPT-4.1-mini.
 * Throws on network error or non-OK response (triggers fallback).
 * Returns parsed JSON from the model's content.
 */
async function callOpenAI(apiKey, systemPrompt, userPrompt, maxTokens = 1800) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model:       'gpt-4.1-mini',
      max_tokens:  maxTokens,
      temperature: 0.3,
      response_format: { type: 'json_object' },   // forces valid JSON output
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // 429 = quota exceeded → trigger fallback
    // 402 = payment required → trigger fallback
    throw new Error(`OpenAI ${res.status}: ${err.error?.message || 'error'}`);
  }

  const data = await res.json();
  const raw  = data.choices?.[0]?.message?.content || '';
  // response_format:json_object guarantees valid JSON, but clean just in case
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

/**
 * Calls Groq llama-3.3-70b-versatile.
 * Throws on error (last resort).
 */
async function callGroq(apiKey, systemPrompt, userPrompt, maxTokens = 1800) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      max_tokens:  maxTokens,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Groq ${res.status}: ${err.error?.message || 'error'}`);
  }

  const data = await res.json();
  const raw  = data.choices?.[0]?.message?.content || '';
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

/**
 * Main AI router: tries OpenAI first, falls back to Groq.
 * Returns { analysis, _provider, _fallback_reason? }
 */
async function callAI(env, systemPrompt, userPrompt, maxTokens = 1800) {
  const OPENAI_KEY = env.OPENAI_API_KEY;
  const GROQ_KEY   = env.GROQ_API_KEY;

  // ── Try OpenAI first ──────────────────────────────────────
  if (OPENAI_KEY) {
    try {
      const analysis = await callOpenAI(OPENAI_KEY, systemPrompt, userPrompt, maxTokens);
      return { analysis, _provider: 'openai' };
    } catch (openaiErr) {
      // Log and fall through to Groq
      console.warn('[Harvest Worker] OpenAI failed, falling back to Groq:', openaiErr.message);

      if (GROQ_KEY) {
        try {
          const analysis = await callGroq(GROQ_KEY, systemPrompt, userPrompt, maxTokens);
          return { analysis, _provider: 'groq', _fallback_reason: openaiErr.message };
        } catch (groqErr) {
          throw new Error(`Both providers failed. OpenAI: ${openaiErr.message} | Groq: ${groqErr.message}`);
        }
      }
      // No Groq key — rethrow OpenAI error
      throw openaiErr;
    }
  }

  // ── No OpenAI key — use Groq directly ────────────────────
  if (GROQ_KEY) {
    const analysis = await callGroq(GROQ_KEY, systemPrompt, userPrompt, maxTokens);
    return { analysis, _provider: 'groq' };
  }

  throw new Error('No AI provider configured. Add OPENAI_API_KEY or GROQ_API_KEY in Worker secrets.');
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
        JSON.stringify({
          ok:       true,
          worker:   'harvest-iq',
          version:  '2.0',
          ai:       env.OPENAI_API_KEY ? 'openai+groq' : (env.GROQ_API_KEY ? 'groq' : 'none'),
        }),
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

    // ── /ai — Portfolio analysis (OpenAI → Groq fallback) ────
    if (path === '/ai') {
      let body;
      try { body = await request.json(); }
      catch(e) { return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: CORS }); }

      const { prompt, lang } = body;
      if (!prompt) {
        return new Response(JSON.stringify({ error: 'Missing prompt' }), { status: 400, headers: CORS });
      }

      const langName = lang === 'en' ? 'English' : lang === 'pt' ? 'Português' : 'Español';

      const systemPrompt =
        'Eres un asesor de inversión en dividendos DGI (Dividend Growth Investing) experto. ' +
        'Respondes SIEMPRE en ' + langName + '. ' +
        'Respondes SOLO con JSON válido, sin markdown, sin texto adicional fuera del JSON.';

      try {
        const { analysis, _provider, _fallback_reason } = await callAI(env, systemPrompt, prompt, 1800);

        return new Response(
          JSON.stringify({ ok: true, analysis, _provider, _fallback_reason }),
          { status: 200, headers: CORS }
        );

      } catch(e) {
        return new Response(
          JSON.stringify({ error: e.message }),
          { status: 500, headers: CORS }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Unknown route. Use /quote?ticker=X, /quotes?tickers=X,Y or POST /ai' }),
      { status: 404, headers: CORS }
    );
  },
};

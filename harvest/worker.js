// HARVEST·IQ Worker v2.0.0
// OpenAI GPT-4.1-mini (primary) · Groq llama-3.3-70b (fallback)
// Routes: /ping  /quote  /quotes  /ai

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function cors() {
  return new Response(null, { status: 204, headers: CORS });
}

// ── Yahoo Finance helper ──────────────────────────────────────
async function fetchYahoo(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
  });
  if (!r.ok) throw new Error(`Yahoo ${ticker}: HTTP ${r.status}`);
  const d = await r.json();
  const q = d?.chart?.result?.[0]?.meta;
  if (!q) throw new Error(`Yahoo ${ticker}: no data`);

  const price        = q.regularMarketPrice ?? 0;
  const prevClose    = q.previousClose ?? q.chartPreviousClose ?? price;
  const change       = price - prevClose;
  const changePct    = prevClose > 0 ? (change / prevClose) * 100 : 0;
  const trailingDiv  = q.trailingAnnualDividendRate ?? 0;
  const yld          = price > 0 && trailingDiv > 0 ? (trailingDiv / price) * 100 : 0;
  const freq         = trailingDiv > 0 ? 'Q' : null;
  const dpp          = freq === 'Q' ? trailingDiv / 4 : 0;

  return {
    ticker,
    price:     +price.toFixed(4),
    change:    +change.toFixed(4),
    changePct: +changePct.toFixed(2),
    adps:      +trailingDiv.toFixed(4),
    yld:       +yld.toFixed(4),
    dpp:       +dpp.toFixed(4),
    payout:    0,   // not available from chart endpoint
    freq,
    currency:  q.currency ?? 'USD',
    name:      q.shortName ?? ticker,
  };
}

// ── AI: OpenAI primary, Groq fallback ────────────────────────
async function callAI(prompt, env) {
  // ── PRIMARY: OpenAI GPT-4.1-mini ──
  if (env.OPENAI_API_KEY) {
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model:           'gpt-4.1-mini',
          max_tokens:      2000,
          temperature:     0.4,
          response_format: { type: 'json_object' },
          messages: [
            {
              role:    'system',
              content: 'You are a DGI (Dividend Growth Investing) portfolio analyst. Always respond with valid JSON only, no markdown, no text outside JSON.',
            },
            { role: 'user', content: prompt },
          ],
        }),
      });
      if (!r.ok) throw new Error(`OpenAI HTTP ${r.status}`);
      const d = await r.json();
      const text = d?.choices?.[0]?.message?.content ?? '';
      const analysis = JSON.parse(text);
      return { ok: true, analysis, provider: 'openai' };
    } catch (e) {
      console.error('OpenAI failed, trying Groq:', e.message);
    }
  }

  // ── FALLBACK: Groq llama-3.3-70b ──
  if (env.GROQ_API_KEY) {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        Authorization:   `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model:           'llama-3.3-70b-versatile',
        max_tokens:      2000,
        temperature:     0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role:    'system',
            content: 'You are a DGI portfolio analyst. Always respond with valid JSON only, no markdown, no text outside JSON.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!r.ok) throw new Error(`Groq HTTP ${r.status}`);
    const d = await r.json();
    const text = d?.choices?.[0]?.message?.content ?? '';
    const analysis = JSON.parse(text);
    return { ok: true, analysis, provider: 'groq' };
  }

  throw new Error('No AI provider configured. Set OPENAI_API_KEY or GROQ_API_KEY in Worker secrets.');
}

// ── Router ────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return cors();

    const url      = new URL(request.url);
    const path     = url.pathname;

    // ── /ping ──
    if (path === '/ping') {
      return json({ ok: true, version: '2.0.0', ts: Date.now() });
    }

    // ── /quote?ticker=MSFT ──
    if (path === '/quote') {
      const ticker = url.searchParams.get('ticker');
      if (!ticker) return json({ ok: false, error: 'Missing ticker' }, 400);
      try {
        const q = await fetchYahoo(ticker.toUpperCase());
        return json({ ok: true, quote: q });
      } catch (e) {
        return json({ ok: false, error: e.message }, 502);
      }
    }

    // ── /quotes?tickers=MSFT,KO,JNJ ──
    if (path === '/quotes') {
      const raw = url.searchParams.get('tickers') ?? '';
      const tickers = raw.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
      if (!tickers.length) return json({ ok: false, error: 'Missing tickers' }, 400);

      const results = {};
      const errors  = {};
      await Promise.allSettled(
        tickers.map(async t => {
          try   { results[t] = await fetchYahoo(t); }
          catch (e) { errors[t] = e.message; }
        })
      );
      return json({ ok: true, quotes: results, errors });
    }

    // ── /ai  (POST) ──
    if (path === '/ai' && request.method === 'POST') {
      let body;
      try   { body = await request.json(); }
      catch { return json({ ok: false, error: 'Invalid JSON body' }, 400); }

      const { prompt, lang } = body;
      if (!prompt) return json({ ok: false, error: 'Missing prompt' }, 400);

      try {
        const result = await callAI(prompt, env);
        return json(result);
      } catch (e) {
        return json({ ok: false, error: e.message }, 502);
      }
    }

    return json({ ok: false, error: `Unknown route: ${path}` }, 404);
  },
};

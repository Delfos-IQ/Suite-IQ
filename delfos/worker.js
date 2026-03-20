/**
 * Delfos-IQ — Cloudflare Worker v2.1
 * ===================================
 * Handles:
 *   GET  /yahoo?ticker=AAPL  → Proxies Yahoo Finance (bypasses CORS)
 *   POST /grok               → Calls Groq API with your key
 *
 * DEPLOY INSTRUCTIONS:
 * 1. Go to https://dash.cloudflare.com → Workers & Pages → Create
 * 2. Create a new Worker (free plan is fine)
 * 3. Paste this entire file into the editor
 * 4. Go to Settings → Variables → Add Secret:
 *      Name:  GROQ_API_KEY
 *      Value: your Groq API key (starts with gsk_...)
 * 5. Deploy and copy your worker URL (e.g. https://delfos-iq.YOUR.workers.dev)
 * 6. Open Delfos-IQ.html, find "var CFG = {" and set:
 *      WORKER: "https://delfos-iq.YOUR.workers.dev"
 * 7. Save and open the app. The Oracle will now use Groq for AI analysis.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── CORS preflight ────────────────────────────────────────────
    if (request.method === "OPTIONS") {
      return corsResponse("", 204);
    }

    // ── Health check ──────────────────────────────────────────────
    if (url.pathname === "/" || url.pathname === "/health") {
      return corsResponse(JSON.stringify({ status: "ok", version: "2.1" }), 200);
    }

    // ── Yahoo Finance proxy ───────────────────────────────────────
    if (url.pathname === "/yahoo") {
      const ticker = url.searchParams.get("ticker");
      if (!ticker || ticker.length > 10) {
        return corsResponse(JSON.stringify({ error: "Invalid ticker" }), 400);
      }
      const clean = ticker.replace(/[^A-Z0-9.\-]/gi, "").toUpperCase();
      const period2 = Math.floor(Date.now() / 1000);
      const period1 = period2 - 60 * 60 * 24 * 400; // ~400 days
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${clean}?interval=1d&period1=${period1}&period2=${period2}&includePrePost=false`;

      try {
        const resp = await fetch(yahooUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; DelfosIQ/2.1)",
            "Accept": "application/json",
          },
        });
        const data = await resp.json();
        return corsResponse(JSON.stringify(data), resp.status);
      } catch (err) {
        return corsResponse(JSON.stringify({ error: "Yahoo fetch failed", detail: err.message }), 502);
      }
    }

    // ── Groq AI analysis ─────────────────────────────────────────
    if (url.pathname === "/grok" && request.method === "POST") {
      const GROQ_KEY = env.GROQ_API_KEY;
      if (!GROQ_KEY) {
        return corsResponse(JSON.stringify({ error: "GROQ_API_KEY not configured in Worker secrets" }), 500);
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return corsResponse(JSON.stringify({ error: "Invalid JSON body" }), 400);
      }

      const { prompt, model } = body;
      if (!prompt) {
        return corsResponse(JSON.stringify({ error: "Missing prompt" }), 400);
      }

      const groqModel = model || "llama-3.3-70b-versatile";

      try {
        const groqResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${GROQ_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: groqModel,
            max_tokens: 700,
            temperature: 0.4,
            messages: [
              {
                role: "system",
                content: "You are an expert in the Cava speculation method from 'El Arte de Especular'. Be concise, analytical, and always remind the user that this is educational content only and not financial advice.",
              },
              { role: "user", content: prompt },
            ],
          }),
        });

        const groqData = await groqResp.json();

        if (!groqResp.ok) {
          return corsResponse(JSON.stringify({ error: groqData.error?.message || "Groq error" }), groqResp.status);
        }

        const text = groqData.choices?.[0]?.message?.content || "";
        return corsResponse(JSON.stringify({ text }), 200);
      } catch (err) {
        return corsResponse(JSON.stringify({ error: "Groq request failed", detail: err.message }), 502);
      }
    }

    return corsResponse(JSON.stringify({ error: "Not found" }), 404);
  },
};

// ── CORS helper ───────────────────────────────────────────────────────────────
function corsResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Cache-Control": "no-cache",
    },
  });
}

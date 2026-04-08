// AXIOS·IQ — about.js — About page render

// ══════════════════════════════════════════════════════════════
// ABOUT PAGE
// ══════════════════════════════════════════════════════════════
function renderAboutAxios(){
  var el = document.getElementById('about-content');
  if(!el) return;
  var en = lang==='en', pt = lang==='pt';

  // Build entirely safe HTML with no single quotes in strings
  var tagline   = en ? 'Fundamental Analysis Terminal' : (pt ? 'Terminal de Análise Fundamental' : 'Terminal de Análisis Fundamental');
  var desc      = en ? 'Analyze any company with real market data, AI-assisted valuation and a complete investment academy. No account, no server, 100% private.'
                : (pt ? 'Analisa qualquer empresa com dados reais de mercado. Sem conta, sem servidor, 100% privado.'
                      : 'Analiza cualquier empresa con datos reales de mercado, valoración asistida por IA y academia de inversión. Sin cuenta, sin servidor, 100% privado.');
  var featTitle = en ? 'WHAT YOU WILL FIND' : (pt ? 'O QUE ENCONTRARÁS' : 'QUÉ ENCONTRARÁS');
  var privTitle = en ? 'PRIVACY' : (pt ? 'PRIVACIDADE' : 'PRIVACIDAD');
  var privH     = en ? 'Your data never leaves your device' : (pt ? 'Os teus dados nunca saem do dispositivo' : 'Tus datos no salen de tu dispositivo');
  var privD     = en ? 'AXIOS-IQ is a static HTML file. No server, no database, no telemetry. Sessions stored only in your browser sessionStorage, never transmitted.'
                : (pt ? 'AXIOS-IQ é um ficheiro HTML estático. Sem servidor, sem telemetria. Sessões guardadas apenas no sessionStorage do navegador.'
                      : 'AXIOS-IQ es un archivo HTML estático. Sin servidor, sin telemetría. Las sesiones se guardan solo en el sessionStorage del navegador.');
  var suppTitle = en ? 'SUPPORT THE PROJECT' : (pt ? 'APOIA O PROJETO' : 'APOYA EL PROYECTO');
  var suppD     = en ? 'AXIOS-IQ is free and open source. If you find it useful, consider buying me a coffee.'
                : (pt ? 'AXIOS-IQ é gratuito. Se te for útil, considera convidar-me a um café.'
                      : 'AXIOS-IQ es gratuito. Si te resulta útil, considera invitarme a un café.');
  var kofiLbl   = en ? 'Support on Ko-fi' : (pt ? 'Apoia no Ko-fi' : 'Apoya en Ko-fi');
  var suiteTitle= en ? 'FROM THE SAME SUITE' : (pt ? 'DA MESMA SUITE' : 'DE LA MISMA SUITE');
  var suiteD    = en ? 'HarvestIQ is the dividend portfolio manager of the IQ Suite. While AXIOS-IQ analyzes individual companies, HarvestIQ manages your DGI portfolio and projects monthly income.'
                : (pt ? 'HarvestIQ é o gestor de carteira de dividendos da IQ Suite. Enquanto AXIOS-IQ analisa empresas, HarvestIQ gere a carteira DGI.'
                      : 'HarvestIQ es el gestor de cartera de dividendos de la IQ Suite. Mientras AXIOS-IQ analiza empresas individuales, HarvestIQ gestiona tu cartera DGI.');
  var suiteBtn  = en ? 'Open HARVEST·IQ' : (pt ? 'Abrir HARVEST·IQ' : 'Abrir HARVEST·IQ');
  var clTitle   = en ? 'CHANGELOG' : (pt ? 'HISTÓRICO' : 'HISTORIAL');

  var features = [
    ['📊', en?'Fundamental Analysis':(pt?'Análise Fundamental':'Análisis Fundamental'),
           en?'21 items in 4 categories. 14 auto-filled from Yahoo Finance + FRED via Cloudflare Worker.'
             :(pt?'21 itens em 4 categorias. 14 preenchidos do Yahoo Finance + FRED via Cloudflare Worker.'
                 :'21 ítems en 4 categorías. 14 rellenados automáticamente desde Yahoo Finance + FRED via Worker.')],
    ['🤖', en?'AI Analysis':(pt?'Análise IA':'Análisis IA'),
           en?'9-section Groq analysis: thesis, strengths, risks, macro, fundamental, technical, catalysts, projections, investor profile.'
             :(pt?'Análise de 9 secções Groq: tese, forças, riscos, macro, fundamental, técnico, catalisadores, projeções.'
                 :'Análisis de 9 secciones Groq: tesis, fortalezas, riesgos, macro, fundamental, técnico, catalizadores, proyecciones.')],
    ['🎓', en?'Investment Academy':(pt?'Academia de Investimento':'Academia de Inversión'),
           en?'97 trilingual articles in 4 courses with certificates. Beginner to advanced.'
             :(pt?'97 artigos trilingues em 4 cursos com certificados. Do iniciante ao avançado.'
                 :'97 artículos trilingues en 4 cursos con certificados. De iniciado a avanzado.')],
    ['🌍', '1.309 Tickers',
           en?'Global: USA, Europe, Japan, Brazil, Canada, Singapore, Hong Kong, India and 30+ countries.'
             :(pt?'Global: EUA, Europa, Japão, Brasil, Canadá, Singapura, Hong Kong, Índia e mais de 30 países.'
                 :'Global: EE.UU., Europa, Japón, Brasil, Canadá, Singapur, Hong Kong, India y 30+ países.')],
    ['⭐', en?'Watchlist & Recents':(pt?'Watchlist & Recentes':'Watchlist & Recientes'),
           en?'Save favorite tickers and recover recent searches. Persistent in localStorage.'
             :(pt?'Guarda tickers favoritos e recupera pesquisas recentes.'
                 :'Guarda tickers favoritos y recupera búsquedas recientes. Persistente en localStorage.')],
    ['🔍', en?'Global Search (Cmd+K)':(pt?'Pesquisa Global (Cmd+K)':'Búsqueda Global (Cmd+K)'),
           en?'Search tickers and academy articles simultaneously. Arrow key navigation.'
             :(pt?'Pesquisa tickers e artigos da academia. Navegação com setas.'
                 :'Busca tickers y artículos de academia simultáneamente. Navegación con flechas.')],
  ];

  var changelog = [
    ['v2.2','2026-03',
     en?'v2.2 — Sharpe · Sortino · Momentum · AI Full Report':(pt?'v2.2 — Sharpe · Sortino · Momentum · Relatório IA Completo':'v2.2 — Sharpe · Sortino · Momentum · Informe IA Completo'),
     en?'Sharpe & Sortino ratio (dynamic risk-free rate via FRED) · Annualized volatility · Max Drawdown 1Y · Multi-period momentum (1M/3M/6M/12M) · OpenAI GPT-4.1-mini primary + Groq fallback · Full PDF investment report generator with optional document upload · tickers.json path fix · Worker chart extended to 1Y'
       :(pt?'Sharpe & Sortino ratio (taxa livre de risco via FRED) · Volatilidade anualizada · Max Drawdown 1A · Momentum multi-período (1M/3M/6M/12M) · OpenAI GPT-4.1-mini principal + Groq fallback · Gerador de relatório PDF completo com upload opcional de documento · Correção tickers.json'
           :'Sharpe & Sortino ratio (tasa libre de riesgo dinámica vía FRED) · Volatilidad anualizada · Max Drawdown 1A · Momentum multi-período (1M/3M/6M/12M) · OpenAI GPT-4.1-mini primario + Groq fallback · Generador de informe PDF completo con subida opcional de documento · Corrección ruta tickers.json')],
    ['v2.1','2026-03',
     en?'v2.1 — Valuation Scorecard (Phase 1 + 2)':(pt?'v2.1 — Scorecard de Valoração (Fases 1 + 2)':'v2.1 — Scorecard de Valoración (Fases 1 + 2)'),
     en?'5-block scorecard (Price · Dividend · Margins · Growth · Strength) · Score 1-5 per metric · Sector benchmarks · Equal-weighted and custom modes · Phase 2: real dynamic peer medians via /peers Worker endpoint · Modular repo structure'
       :(pt?'Scorecard 5 blocos (Preço · Dividendo · Margens · Crescimento · Solidez) · Pontuação 1-5 por métrica · Benchmarks sectoriais · Ponderação igual e personalizada · Fase 2: medianas reais de peers via Worker · Estrutura modular'
           :'Scorecard 5 bloques (Precio · Dividendo · Márgenes · Crecimiento · Fortaleza) · Puntuación 1-5 por métrica · Benchmarks sectoriales · Modo equiponderado y personalizado · Fase 2: medianas reales de peers vía Worker · Estructura modular del repo')],
    ['v3.1','2026-04',
     en?'v3.1 — Modular · Screener · Comparador':(pt?'v3.1 — Modular · Screener · Comparador':'v3.1 — Arquitectura modular · Screener · Comparador'),
     en?'21 items (from 28) · 14 auto-filled · Score 1-100 · Visual Margin of Safety bar · 9-section AI analysis · AI qualitative fill for moat/management/governance · About tab · 1.309 tickers in 35+ countries'
       :(pt?'21 itens (de 28) · 14 preenchidos · Score 1-100 · Barra visual MoS · Análise IA 9 secções · Preenchimento qualitativo IA · Aba About · 1.309 tickers em 35+ países'
           :'21 ítems (de 28) · 14 auto-rellenados · Score 1-100 · Barra visual MoS · Análisis IA 9 secciones · Relleno cualitativo IA · Pestaña About · 1.500+ tickers en 35+ países')],
    ['v1.5','2026-02',
     en?'v1.5 — Academy + Worker':(pt?'v1.5 — Academia + Worker':'v1.5 — Academia + Worker'),
     en?'4 courses with certificates · 97 trilingual articles · Groq AI via Cloudflare Worker · RSI + MA data from Yahoo · FRED macro data · Hash routing'
       :'4 cursos con certificados · 97 artículos trilingues · Groq IA vía Cloudflare Worker · RSI + MA desde Yahoo · Datos macro FRED · Hash routing'],
    ['v1.0','2026-01',
     en?'Public launch':(pt?'Lançamento público':'Lanzamiento público'),
     en?'21 analysis items · Fundamental, technical and macro categories · Auto-fill from Yahoo Finance · DCF + Graham valuation · Spider chart · Watchlist · Bilingual ES/EN'
       :'21 ítems de análisis · Categorías fundamental, técnico y macro · Auto-fill desde Yahoo Finance · Valoración DCF + Graham · Spider chart · Watchlist · Bilingüe ES/EN'],
  ];

  var out = '<div style="max-width:820px;margin:0 auto;padding:0 0 60px">';

  // Hero
  out += '<div style="text-align:center;padding:40px 24px 36px;border-bottom:1px solid var(--border)">'
    + '<div style="font-size:64px;margin-bottom:16px">📈</div>'
    + '<div style="font-family:Syne,sans-serif;font-size:32px;font-weight:800;background:linear-gradient(135deg,#00d4aa,#3b82f6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px">AXIOS·IQ</div>'
    + '<div style="font-size:11px;color:var(--tx3);letter-spacing:.15em;font-family:monospace;text-transform:uppercase;margin-bottom:16px">' + tagline + '</div>'
    + '<p style="color:var(--tx3);font-size:13px;max-width:520px;margin:0 auto;line-height:1.7">' + desc + '</p>'
    + '</div>';

  // Features grid
  out += '<div style="padding:32px 24px;border-bottom:1px solid var(--border)">'
    + '<div style="font-family:monospace;font-size:10px;color:var(--a1);letter-spacing:.2em;margin-bottom:18px">' + featTitle + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">';
  features.forEach(function(f){
    out += '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:16px">'
      + '<div style="font-size:20px;margin-bottom:8px">' + f[0] + '</div>'
      + '<div style="font-size:12px;font-weight:700;color:var(--tx);margin-bottom:6px">' + f[1] + '</div>'
      + '<div style="font-size:11px;color:var(--tx3);line-height:1.55">' + f[2] + '</div>'
      + '</div>';
  });
  out += '</div></div>';

  // Privacy
  out += '<div style="padding:32px 24px;border-bottom:1px solid var(--border)">'
    + '<div style="font-family:monospace;font-size:10px;color:var(--a1);letter-spacing:.2em;margin-bottom:14px">' + privTitle + '</div>'
    + '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:18px;display:flex;gap:14px;align-items:flex-start">'
    + '<div style="font-size:26px;flex-shrink:0">🔒</div>'
    + '<div><div style="font-size:13px;font-weight:700;color:var(--tx);margin-bottom:6px">' + privH + '</div>'
    + '<div style="font-size:12px;color:var(--tx3);line-height:1.7">' + privD + '</div></div>'
    + '</div></div>';

  // HarvestIQ crosspromo
  out += '<div style="padding:32px 24px;border-bottom:1px solid var(--border)">'
    + '<div style="font-family:monospace;font-size:10px;color:var(--a1);letter-spacing:.2em;margin-bottom:14px">' + suiteTitle + '</div>'
    + '<div style="background:var(--bg2);border:1px solid rgba(74,222,128,.2);border-radius:10px;padding:18px;display:flex;gap:14px;align-items:flex-start">'
    + '<div style="font-size:32px;flex-shrink:0">🌾</div>'
    + '<div style="flex:1"><div style="font-size:14px;font-weight:700;color:#4ade80;margin-bottom:6px">HARVEST·IQ</div>'
    + '<div style="font-size:12px;color:var(--tx3);line-height:1.7;margin-bottom:12px">' + suiteD + '</div>'
    + '<a href="harvestiq.html" style="display:inline-flex;align-items:center;gap:6px;background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.3);color:#4ade80;border-radius:6px;padding:6px 14px;font-size:11px;font-family:monospace;text-decoration:none;font-weight:700">' + suiteBtn + ' →</a>'
    + '</div></div></div>';

  // Ko-fi
  out += '<div style="padding:32px 24px;border-bottom:1px solid var(--border);text-align:center">'
    + '<div style="font-family:monospace;font-size:10px;color:var(--a1);letter-spacing:.2em;margin-bottom:14px">' + suppTitle + '</div>'
    + '<p style="color:var(--tx3);font-size:13px;max-width:460px;margin:0 auto 20px;line-height:1.7">' + suppD + '</p>'
    + '<a href="https://ko-fi.com/axiosiq" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;background:rgba(244,114,182,.1);border:1px solid rgba(244,114,182,.3);color:#f472b6;border-radius:100px;padding:10px 24px;font-family:monospace;font-size:12px;font-weight:700;text-decoration:none">'
    + '<svg width="16" height="16" viewBox="0 0 24 24" fill="#f472b6"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>'
    + kofiLbl + '</a></div>';

  // Changelog
  out += '<div style="padding:32px 24px">'
    + '<div style="font-family:monospace;font-size:10px;color:var(--a1);letter-spacing:.2em;margin-bottom:16px">' + clTitle + '</div>'
    + '<div id="axios-cl" style="display:flex;flex-direction:column;gap:6px"></div>'
    + '</div></div>';

  el.innerHTML = out;

  // Render changelog items safely (avoid inline onclick string issues)
  var clEl = document.getElementById('axios-cl');
  if(!clEl) return;
  changelog.forEach(function(entry, idx){
    var v = entry[0], date = entry[1], title = entry[2], desc = entry[3];
    var item = document.createElement('div');
    item.style.cssText = 'border:1px solid var(--border);border-radius:8px;overflow:hidden';
    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;gap:14px;padding:12px 16px;cursor:pointer;background:var(--bg2)';
    hdr.innerHTML = '<div style="min-width:70px;text-align:right"><div style="font-family:monospace;font-size:12px;font-weight:700;color:var(--a1)">' + v + '</div><div style="font-size:10px;color:var(--tx3);margin-top:2px">' + date + '</div></div>'
      + '<div style="flex:1;font-size:13px;font-weight:700;color:var(--tx)">' + title + '</div>'
      + '<span style="color:var(--tx3);font-size:11px">' + (idx === 0 ? '▾' : '▸') + '</span>';
    var body = document.createElement('div');
    body.style.cssText = 'display:' + (idx === 0 ? 'block' : 'none') + ';padding:12px 16px;padding-left:100px;border-top:1px solid var(--border);background:var(--bg)';
    body.innerHTML = '<div style="font-size:11px;color:var(--tx3);line-height:1.8">' + desc + '</div>';
    hdr.addEventListener('click', (function(b, s){ return function(){
      b.style.display = b.style.display === 'none' ? 'block' : 'none';
      s.textContent = b.style.display === 'none' ? '▸' : '▾';
    }; })(body, hdr.querySelector('span')));
    item.appendChild(hdr);
    item.appendChild(body);
    clEl.appendChild(item);
  });
}

function exportPDF(){ window.print(); }
function resetAnalysis(){
  state={ticker:'',name:'',sector:'technology',country:'',desc:'',inputs:{},marks:{},price:0};
  document.getElementById('ticker-input').value='';
  document.getElementById('co-header').classList.remove('visible');
  document.getElementById('manual-box').style.display='none';
  document.getElementById('analysis-grid').innerHTML='';
  document.getElementById('results-panel').classList.remove('visible');
  window.scrollTo({top:0,behavior:'smooth'});
}


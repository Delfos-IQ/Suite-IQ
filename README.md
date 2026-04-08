# IQ Suite

Herramientas de inversión inteligentes, gratuitas y sin registro.

## 🗂 Estructura del repositorio

```
repo/
├── index.html            ← Launcher de la Suite (punto de entrada)
├── tickers.json          ← 1.309 tickers compartidos
├── README.md
│
├── axios/
│   ├── index.html        ← AXIOS·IQ (análisis fundamental + screener + comparador)
│   ├── tickers.json      ← (opcional, copia local)
│   ├── worker.js         ← Cloudflare Worker (Yahoo Finance + Groq)
│   ├── css/
│   │   ├── tokens.css    ← Variables dark/light, escala tipográfica
│   │   ├── base.css      ← Layout, header, screener, comparador
│   │   └── mobile.css    ← Responsive
│   └── js/
│       ├── data.js       ← ITEMS, SC_BENCH, TICKER_DB loader
│       ├── core.js       ← State, i18n, tema dark/light, showTab()
│       ├── autofill.js   ← Yahoo Finance, FRED macro, hash routing
│       ├── analyzer.js   ← Grid de análisis, spider chart
│       ├── ai.js         ← Análisis IA (Groq / OpenAI)
│       ├── scorecard.js  ← Scorecard 5 bloques + peers dinámicos
│       ├── screener.js   ← Screener de acciones
│       ├── comparador.js ← Comparador hasta 3 empresas con AI TOP 3
│       ├── ui.js         ← Watchlist, search dropdown, init()
│       ├── academy.js    ← Stub (academia movida a SOPHIA·IQ)
│       ├── about.js      ← Página About
│       └── app.js        ← Init IIFE, service worker
│
├── harvest/
│   ├── index.html        ← HARVEST·IQ (cartera de dividendos)
│   └── worker.js         ← Cloudflare Worker (Yahoo dividendos + Groq)
│
├── sophia/
│   ├── index.html        ← SOPHIA·IQ (academia de inversión)
│   ├── academia.json     ← 97 artículos trilingues (ES/EN/PT)
│   └── courses.json      ← 4 cursos con módulos y lecciones
│
└── delfos/
    ├── index.html        ← DELFOS·IQ (swing trading Método Cava)
    ├── course.json       ← 4 niveles, 40 temas del Método Cava
    ├── seasonal.json     ← Estacionalidad S&P 500 (12 meses)
    ├── worker.js         ← Cloudflare Worker (Yahoo charts + Groq)
    └── js/
        ├── config.js     ← CFG, i18n ES/EN, estado global
        ├── engine.js     ← Motor Cava: EMA, MACD, ADX, RSI
        ├── fetch.js      ← Yahoo Finance via Worker/proxy CORS
        ├── ai.js         ← Groq llama-3.3-70b + fallback local
        ├── oracle-ui.js  ← Renderizado del Oráculo
        ├── course-ui.js  ← Curso: tarjetas, desbloqueo, progreso
        └── app.js        ← Boot: carga JSON, init, tutor IA
```

## 🚀 Deploy en GitHub Pages

1. Sube **todos los archivos** manteniendo la estructura de carpetas
2. Ve a **Settings → Pages → Deploy from branch: main / root**
3. La suite estará en `https://TU-USUARIO.github.io/TU-REPO/`

URLs directas con hash:
- `#axios`   → abre AXIOS·IQ
- `#harvest` → abre HARVEST·IQ
- `#sophia`  → abre SOPHIA·IQ
- `#delfos`  → abre DELFOS·IQ

## ⚡ Workers de Cloudflare

Cada app tiene su propio Worker independiente:

| App | Worker | Secretos necesarios |
|-----|--------|---------------------|
| AXIOS·IQ | `axios/worker.js` → `suite-iq.pedicode-app.workers.dev` | `GROQ_API_KEY` |
| HARVEST·IQ | `harvest/worker.js` → `harvest-iq.pedicode-app.workers.dev` | `GROQ_API_KEY` |
| DELFOS·IQ | `delfos/worker.js` → `oraculo-delfos-iq.pedicode-app.workers.dev` | `GROQ_API_KEY` |

> **SOPHIA·IQ** no necesita Worker — es 100% estática (academia.json + courses.json).

### Pasos para cada Worker:
1. Cloudflare Dashboard → **Workers & Pages → Create**
2. Pega el contenido del `worker.js` correspondiente
3. **Settings → Variables and Secrets** → añade `GROQ_API_KEY`
4. Deploy

## 🎨 Identidad visual

| App | Color | Tipografía |
|-----|-------|-----------|
| AXIOS·IQ | Teal `#00d4aa` | IBM Plex Sans + IBM Plex Mono + Syne |
| HARVEST·IQ | Green `#4ADE80` | DM Sans + DM Mono + Syne |
| SOPHIA·IQ | Amber `#f59e0b` | IBM Plex Sans + IBM Plex Mono + Syne |
| DELFOS·IQ | Amber `#c9a84c` | IBM Plex Sans + IBM Plex Mono + Cinzel + Syne |

## 📦 Novedades v3.0 (AXIOS·IQ)

- **Arquitectura modular** — monolito 323KB dividido en 12 módulos JS + 3 CSS
- **Tema dark/light** — toggle en el header, detecta preferencia del sistema
- **Screener** — filtra por sector/país, puntúa hasta 20 empresas dinámicamente
- **Comparador** — hasta 3 empresas con AI TOP 3, medallas dorado/plata/bronce y 5 secciones rediseñadas
- **SOPHIA·IQ** — academia extraída como app independiente con logo propio

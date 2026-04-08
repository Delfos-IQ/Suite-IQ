# IQ Suite

Herramientas de inversión inteligentes, gratuitas y sin registro.

## 🗂 Estructura del repositorio

```
repo/
├── index.html            ← Launcher de la Suite (punto de entrada)
├── tickers.json          ← 1.500+ tickers globales
├── sw.js                 ← Service Worker v3.1
├── version.json          ← Versiones de cada app
├── README.md
│
├── axios/
│   ├── index.html        ← AXIOS·IQ v3.1 (análisis fundamental)
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
│       ├── academy.js    ← Stub mínimo (academia en SOPHIA·IQ)
│       ├── about.js      ← Página About
│       └── app.js        ← Init IIFE, service worker
│
├── harvest/
│   ├── index.html        ← HARVEST·IQ v1.3 (cartera de dividendos)
│   └── worker.js         ← Cloudflare Worker (Yahoo dividendos + Groq)
│
└── sophia/
    ├── index.html        ← SOPHIA·IQ v1.0 (academia de inversión)
    ├── academia.json     ← 97 artículos trilingues (ES/EN/PT)
    └── courses.json      ← 4 cursos: Finanzas Personales, Iniciado, Intermedio, Avanzado
```

> **Nota:** La carpeta `delfos/` puede eliminarse del repositorio.

## 🚀 Deploy en GitHub Pages

1. Sube **todos los archivos** manteniendo la estructura de carpetas
2. Ve a **Settings → Pages → Deploy from branch: main / root**
3. La suite estará en `https://TU-USUARIO.github.io/TU-REPO/`

URLs directas con hash:
- `#axios`   → abre AXIOS·IQ
- `#harvest` → abre HARVEST·IQ
- `#sophia`  → abre SOPHIA·IQ

## ⚡ Workers de Cloudflare

| App | Worker URL | Secretos |
|-----|-----------|---------|
| AXIOS·IQ | `suite-iq.pedicode-app.workers.dev` | `GROQ_API_KEY` |
| HARVEST·IQ | `harvest-iq.pedicode-app.workers.dev` | `GROQ_API_KEY` |

> **SOPHIA·IQ** no necesita Worker — es 100% estática.

### Pasos para cada Worker:
1. Cloudflare Dashboard → **Workers & Pages → Create**
2. Pega el contenido del `worker.js` correspondiente
3. **Settings → Variables and Secrets** → añade `GROQ_API_KEY`
4. Deploy

## 🎨 Identidad visual

| App | Color | Descripción |
|-----|-------|-------------|
| AXIOS·IQ | Teal `#00d4aa` | Análisis fundamental · Screener · Comparador |
| HARVEST·IQ | Green `#4ADE80` | Gestión de cartera de dividendos DGI |
| SOPHIA·IQ | Amber `#f59e0b` | Academia de inversión y finanzas personales |

## 📦 Versiones

| App | Versión | Novedades |
|-----|---------|-----------|
| AXIOS·IQ | **v3.1** | Modular (12 JS + 3 CSS) · Dark/Light · Screener · Comparador AI TOP 3 |
| HARVEST·IQ | **v1.3** | Importación CSV/Excel · DGI Discover · Sector Cycle |
| SOPHIA·IQ | **v1.0** | Academia independiente · 97 artículos · 4 cursos · Certificados |

## 📁 Migración desde versión anterior

Si venías de una versión con DELFOS·IQ:
- Puedes eliminar la carpeta `delfos/` del repositorio
- El launcher ya no muestra la tarjeta de DELFOS
- `tickers.json` en raíz es compartido por AXIOS y SOPHIA

El contenido de `axios/academia.json` y `axios/courses.json` debe copiarse/moverse a `sophia/`.

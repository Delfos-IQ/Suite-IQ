# IQ Suite

Herramientas de inversión inteligentes, gratuitas y sin registro.

## 🗂 Estructura del repositorio

```
repo/
├── index.html            ← Launcher de la Suite (punto de entrada)
├── tickers.json          ← 1.309 tickers compartidos (Axios + Delfos)
├── README.md
│
├── axios/
│   ├── index.html        ← AXIOS·IQ (análisis fundamental)
│   ├── academia.json     ← 97 artículos de academia
│   ├── courses.json      ← 4 cursos con módulos y lecciones
│   └── worker.js         ← Cloudflare Worker (Yahoo Finance + Groq)
│
├── harvest/
│   ├── index.html        ← HARVEST·IQ (cartera de dividendos)
│   └── worker.js         ← Cloudflare Worker (Yahoo dividendos + Groq)
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
- `#delfos`  → abre DELFOS·IQ

## ⚡ Workers de Cloudflare

Cada app tiene su propio Worker independiente:

| App | Worker | Secretos necesarios |
|-----|--------|---------------------|
| AXIOS·IQ | `axios/worker.js` → `suite-iq.pedicode-app.workers.dev` | `GROQ_API_KEY` |
| HARVEST·IQ | `harvest/worker.js` → `harvest-iq.pedicode-app.workers.dev` | `GROQ_API_KEY` |
| DELFOS·IQ | `delfos/worker.js` → `oraculo-delfos-iq.pedicode-app.workers.dev` | `GROQ_API_KEY` |

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
| DELFOS·IQ | Amber `#c9a84c` | IBM Plex Sans + IBM Plex Mono + Cinzel + Syne |

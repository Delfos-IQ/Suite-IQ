// ══════════════════════════════════════════════════════════════
// SUITE-IQ · AUTH GATE · v1.0.0
// Incluir en AXIOS·IQ y HARVEST·IQ antes de cualquier otro script
// Uso: <script src="../auth-gate.js" data-app="axios"></script>
//      <script src="../auth-gate.js" data-app="harvest"></script>
// ══════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // ── Config ────────────────────────────────────────────────
  var SUPABASE_URL  = 'https://mycbfhhhsigijmticokk.supabase.co';
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15Y2JmaGhoc2lnaWptdGljb2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMDYwODEsImV4cCI6MjA5MTU4MjA4MX0.R1FLufWCiInZyvrNj9BAIKLyaELIv3LENiR8kyJqDUs';
  var WORKER_URL    = 'https://suite-iq-auth.pedicode-app.workers.dev';
  var LOGIN_URL     = 'https://suite-iq.org/login.html';
  var PRICING_URL   = 'https://suite-iq.org/#pricing';

  // Planes que dan acceso a cada app
  var PLAN_ACCESS = {
    axios:   ['essential_axios', 'pro'],
    harvest: ['essential_harvest', 'pro'],
  };

  // App actual — leída del atributo data-app del script tag
  var currentScript = document.currentScript ||
    (function(){ var s=document.getElementsByTagName('script'); return s[s.length-1]; })();
  var APP = currentScript.getAttribute('data-app') || 'axios';

  // Lang guardado
  var lang = localStorage.getItem('suiteiq_lang') || 'es';

  // ── Textos ────────────────────────────────────────────────
  var COPY = {
    es:{
      checking:   'Verificando tu acceso...',
      no_plan_title: 'Necesitas un plan para acceder',
      no_plan_sub_axios:   'AXIOS·IQ requiere el Plan Esencial AXIOS o el Plan Suite-IQ Pro.',
      no_plan_sub_harvest: 'HARVEST·IQ requiere el Plan Esencial HARVEST o el Plan Suite-IQ Pro.',
      no_session_title: 'Inicia sesión para continuar',
      no_session_sub:   'Necesitas una cuenta activa para acceder a esta herramienta.',
      btn_pricing: 'Ver planes y precios →',
      btn_login:   'Iniciar sesión →',
      btn_sophia:  'Ir a SOPHIA·IQ (gratis)',
      plan_axios:   'Plan Esencial AXIOS — €5/mes',
      plan_harvest: 'Plan Esencial HARVEST — €5/mes',
      plan_pro:     'Suite-IQ Pro — €10/mes',
      logout:      'Cerrar sesión',
    },
    en:{
      checking:   'Verifying your access...',
      no_plan_title: 'You need a plan to access this tool',
      no_plan_sub_axios:   'AXIOS·IQ requires the Essential AXIOS Plan or Suite-IQ Pro.',
      no_plan_sub_harvest: 'HARVEST·IQ requires the Essential HARVEST Plan or Suite-IQ Pro.',
      no_session_title: 'Sign in to continue',
      no_session_sub:   'You need an active account to access this tool.',
      btn_pricing: 'See plans & pricing →',
      btn_login:   'Sign in →',
      btn_sophia:  'Go to SOPHIA·IQ (free)',
      plan_axios:   'Essential AXIOS Plan — €5/month',
      plan_harvest: 'Essential HARVEST Plan — €5/month',
      plan_pro:     'Suite-IQ Pro — €10/month',
      logout:      'Sign out',
    },
    pt:{
      checking:   'A verificar o teu acesso...',
      no_plan_title: 'Precisas de um plano para aceder',
      no_plan_sub_axios:   'O AXIOS·IQ requer o Plano Essencial AXIOS ou o Suite-IQ Pro.',
      no_plan_sub_harvest: 'O HARVEST·IQ requer o Plano Essencial HARVEST ou o Suite-IQ Pro.',
      no_session_title: 'Inicia sessão para continuar',
      no_session_sub:   'Precisas de uma conta ativa para aceder a esta ferramenta.',
      btn_pricing: 'Ver planos e preços →',
      btn_login:   'Iniciar sessão →',
      btn_sophia:  'Ir ao SOPHIA·IQ (grátis)',
      plan_axios:   'Plano Essencial AXIOS — €5/mês',
      plan_harvest: 'Plano Essencial HARVEST — €5/mês',
      plan_pro:     'Suite-IQ Pro — €10/mês',
      logout:      'Terminar sessão',
    }
  };
  var C = COPY[lang] || COPY.es;

  // App accent colors
  var COLORS = {
    axios:   { main:'#00d4aa', bg:'rgba(0,212,170,.08)', bdr:'rgba(0,212,170,.3)' },
    harvest: { main:'#4ADE80', bg:'rgba(74,222,128,.08)', bdr:'rgba(74,222,128,.3)' },
  };
  var CLR = COLORS[APP] || COLORS.axios;

  // ── Overlay HTML ──────────────────────────────────────────
  var OVERLAY_CSS = [
    '#ag-overlay{position:fixed;inset:0;z-index:99999;',
    'background:#070a0e;display:flex;align-items:center;justify-content:center;',
    'font-family:"IBM Plex Sans",sans-serif;padding:24px;}',
    '#ag-box{background:#0d1117;border:1px solid #1e2d3d;border-radius:20px;',
    'padding:40px 36px;max-width:420px;width:100%;text-align:center;',
    'box-shadow:0 8px 40px rgba(0,0,0,.4);}',
    '#ag-spinner{width:44px;height:44px;border-radius:50%;margin:0 auto 20px;',
    'border:3px solid #1e2d3d;border-top-color:'+CLR.main+';',
    'animation:ag-spin .8s linear infinite;}',
    '@keyframes ag-spin{to{transform:rotate(360deg)}}',
    '#ag-icon{font-size:36px;margin-bottom:16px;display:none;}',
    '#ag-title{font-family:"Syne",sans-serif;font-size:22px;font-weight:800;',
    'letter-spacing:-.02em;color:#e2e8f0;margin-bottom:8px;}',
    '#ag-sub{font-size:13px;color:#475569;line-height:1.65;margin-bottom:28px;}',
    '#ag-btns{display:flex;flex-direction:column;gap:10px;}',
    '.ag-btn{display:block;padding:11px 20px;border-radius:100px;',
    'font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:700;',
    'letter-spacing:.05em;text-decoration:none;border:1px solid;',
    'transition:180ms ease;cursor:pointer;}',
    '.ag-btn-primary{color:'+CLR.main+';border-color:'+CLR.bdr+';background:'+CLR.bg+';}',
    '.ag-btn-primary:hover{background:rgba(0,212,170,.16);}',
    '.ag-btn-ghost{color:#94a3b8;border-color:#1e2d3d;background:#111820;}',
    '.ag-btn-ghost:hover{border-color:#253445;color:#e2e8f0;}',
    '.ag-plans{margin-top:20px;padding:14px 16px;border-radius:10px;',
    'background:#111820;border:1px solid #1e2d3d;}',
    '.ag-plans-title{font-family:"IBM Plex Mono",monospace;font-size:9px;',
    'font-weight:700;letter-spacing:.12em;text-transform:uppercase;',
    'color:#475569;margin-bottom:10px;}',
    '.ag-plan-item{display:flex;align-items:center;justify-content:space-between;',
    'padding:7px 0;border-bottom:1px solid #1e2d3d;font-size:12px;color:#94a3b8;}',
    '.ag-plan-item:last-child{border-bottom:none;padding-bottom:0;}',
    '.ag-plan-price{font-family:"IBM Plex Mono",monospace;font-size:11px;',
    'font-weight:700;color:'+CLR.main+';}',
    // Logout bar
    '#ag-user-bar{position:fixed;top:0;right:0;z-index:99998;',
    'display:flex;align-items:center;gap:10px;',
    'padding:8px 14px;',
    'background:rgba(7,10,14,.85);',
    'border-bottom-left-radius:10px;',
    'border:1px solid #1e2d3d;border-top:none;border-right:none;',
    'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);}',
    '#ag-user-email{font-family:"IBM Plex Mono",monospace;font-size:10px;',
    'color:#475569;letter-spacing:.04em;max-width:180px;',
    'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '#ag-logout-btn{font-family:"IBM Plex Mono",monospace;font-size:10px;',
    'font-weight:700;letter-spacing:.06em;color:'+CLR.main+';',
    'background:none;border:1px solid '+CLR.bdr+';border-radius:100px;',
    'padding:4px 12px;cursor:pointer;transition:180ms ease;',
    'text-decoration:none;white-space:nowrap;}',
    '#ag-logout-btn:hover{background:'+CLR.bg+';}',
  ].join('');

  function injectOverlay(mode) {
    // Bloquear scroll del body
    document.body.style.overflow = 'hidden';

    var style = document.createElement('style');
    style.textContent = OVERLAY_CSS;
    document.head.appendChild(style);

    var div = document.createElement('div');
    div.id = 'ag-overlay';
    div.innerHTML = [
      '<div id="ag-box">',
      '<div id="ag-spinner"></div>',
      '<div id="ag-icon"></div>',
      '<h2 id="ag-title">' + C.checking + '</h2>',
      '<p id="ag-sub"></p>',
      '<div id="ag-btns"></div>',
      '</div>',
    ].join('');
    document.body.appendChild(div);

    if (mode === 'no_session') showNoSession();
    if (mode === 'no_plan')    showNoPlan();
  }

  function showNoSession() {
    document.getElementById('ag-spinner').style.display = 'none';
    document.getElementById('ag-icon').style.display    = 'block';
    document.getElementById('ag-icon').textContent      = '🔐';
    document.getElementById('ag-title').textContent     = C.no_session_title;
    document.getElementById('ag-sub').textContent       = C.no_session_sub;
    document.getElementById('ag-btns').innerHTML = [
      '<a class="ag-btn ag-btn-primary" href="' + LOGIN_URL + '">' + C.btn_login + '</a>',
      '<a class="ag-btn ag-btn-ghost"   href="' + PRICING_URL + '">' + C.btn_pricing + '</a>',
      '<a class="ag-btn ag-btn-ghost"   href="../sophia/index.html">' + C.btn_sophia + '</a>',
    ].join('');
  }

  function showNoPlan() {
    var subKey = APP === 'harvest' ? 'no_plan_sub_harvest' : 'no_plan_sub_axios';
    var plans  = APP === 'harvest'
      ? [ C.plan_harvest, C.plan_pro ]
      : [ C.plan_axios,   C.plan_pro ];

    document.getElementById('ag-spinner').style.display = 'none';
    document.getElementById('ag-icon').style.display    = 'block';
    document.getElementById('ag-icon').textContent      = '🔒';
    document.getElementById('ag-title').textContent     = C.no_plan_title;
    document.getElementById('ag-sub').textContent       = C[subKey];

    var plansHtml = plans.map(function(p) {
      var parts = p.split(' — ');
      return '<div class="ag-plan-item"><span>' + parts[0] + '</span>'
           + '<span class="ag-plan-price">' + (parts[1]||'') + '</span></div>';
    }).join('');

    document.getElementById('ag-btns').innerHTML = [
      '<a class="ag-btn ag-btn-primary" href="' + PRICING_URL + '">' + C.btn_pricing + '</a>',
      '<div class="ag-plans">',
        '<div class="ag-plans-title">Planes que incluyen esta herramienta</div>',
        plansHtml,
      '</div>',
      '<a class="ag-btn ag-btn-ghost" href="../sophia/index.html">' + C.btn_sophia + '</a>',
    ].join('');
  }

  // ── Barra de usuario con botón cerrar sesión ─────────────
  function injectUserBar(email, sb) {
    var bar = document.createElement('div');
    bar.id = 'ag-user-bar';
    bar.innerHTML =
      '<span id="ag-user-email">' + (email || '') + '</span>' +
      '<button id="ag-logout-btn">' + (C.logout || 'Cerrar sesión') + '</button>';
    document.body.appendChild(bar);

    document.getElementById('ag-logout-btn').addEventListener('click', async function() {
      // Limpiar caché
      try { sessionStorage.removeItem('ag_session_' + APP); } catch(e){}
      // Cerrar sesión en Supabase si el SDK está disponible
      if (sb && sb.auth) {
        try { await sb.auth.signOut(); } catch(e){}
      }
      // Limpiar localStorage de Supabase
      try {
        var keys = Object.keys(localStorage).filter(function(k){
          return k.startsWith('suiteiq-auth') || k.startsWith('sb-');
        });
        keys.forEach(function(k){ localStorage.removeItem(k); });
      } catch(e){}
      // Redirigir al login
      window.location.href = LOGIN_URL;
    });
  }
  var SESSION_KEY = 'ag_session_' + APP;
  var CACHE_TTL   = 5 * 60 * 1000; // 5 minutos

  function getCachedAccess() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (Date.now() - data.ts > CACHE_TTL) { sessionStorage.removeItem(SESSION_KEY); return null; }
      return data;
    } catch(e) { return null; }
  }

  function setCachedAccess(ok, plan) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ok:ok, plan:plan, ts:Date.now() }));
    } catch(e) {}
  }

  // ── Cargar Supabase SDK dinámicamente ────────────────────
  function loadSupabase(cb) {
    // Si ya está cargado
    if (window.supabase) { cb(false); return; }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    s.onload = function() { cb(false); };
    s.onerror = function() {
      // Intentar con unpkg como fallback
      var s2 = document.createElement('script');
      s2.src = 'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js';
      s2.onload = function() { cb(false); };
      s2.onerror = function() { cb(true); };
      document.head.appendChild(s2);
    };
    document.head.appendChild(s);
  }

  // ── Obtener sesión con reintentos ────────────────────────
  async function getSessionWithRetry(sb, maxRetries, delayMs) {
    for (var i = 0; i < maxRetries; i++) {
      var result = await sb.auth.getSession();
      if (result.data && result.data.session) return result.data.session;
      if (i < maxRetries - 1) await new Promise(function(r){ setTimeout(r, delayMs); });
    }
    return null;
  }

  // ── Main gate logic ───────────────────────────────────────
  function runGate() {
    loadSupabase(async function(sdkError) {

      // Si el SDK no cargó, intentar leer el token directamente de localStorage
      if (sdkError) {
        console.warn('[AuthGate] SDK no disponible — intentando localStorage directo');
        try {
          var rawSession = null;
          // Supabase guarda con la storageKey que configuramos
          var keys = ['suiteiq-auth', 'sb-' + SUPABASE_URL.split('//')[1].split('.')[0] + '-auth-token'];
          for (var k = 0; k < keys.length; k++) {
            var raw = localStorage.getItem(keys[k]);
            if (raw) { rawSession = JSON.parse(raw); break; }
          }
          if (!rawSession || !rawSession.access_token) {
            injectOverlay('no_session');
            showNoSession();
            return;
          }
          // Tenemos token — validar con el worker directamente
          var res = await fetch(WORKER_URL + '/validate', {
            headers: { 'Authorization': 'Bearer ' + rawSession.access_token }
          });
          var data = await res.json();
          var plan = data.plan || 'free';
          var allowed = PLAN_ACCESS[APP] || [];
          if (allowed.indexOf(plan) === -1) {
            injectOverlay('no_plan');
            showNoPlan();
            return;
          }
          // Acceso OK
          injectUserBar(data.email, null);
          return;
        } catch(e) {
          console.warn('[AuthGate] localStorage fallback failed:', e);
          // En caso de error total de red — dejar pasar (mejor UX)
          return;
        }
      }

      try {
        var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
          auth: {
            flowType: 'implicit',
            detectSessionInUrl: false,
            persistSession: true,
            autoRefreshToken: true,
            storageKey: 'suiteiq-auth',
          }
        });

        // 1. Comprobar caché primero
        var cached = getCachedAccess();
        if (cached) {
          if (cached.ok) return; // acceso OK — la app continúa
          injectOverlay(cached.plan ? 'no_plan' : 'no_session');
          return;
        }

        // 2. Mostrar overlay de carga
        injectOverlay('loading');

        // 3. Obtener sesión con hasta 5 reintentos cada 600ms
        var session = await getSessionWithRetry(sb, 5, 600);

        if (!session) {
          setCachedAccess(false, null);
          showNoSession();
          return;
        }

        // 4. Validar plan en el Worker
        var res = await fetch(WORKER_URL + '/validate', {
          headers: { 'Authorization': 'Bearer ' + session.access_token }
        });

        if (!res.ok) throw new Error('Validate request failed');
        var data = await res.json();
        var plan = data.plan || 'free';

        // 5. Comprobar si el plan da acceso a esta app
        var allowed = PLAN_ACCESS[APP] || [];
        if (allowed.indexOf(plan) === -1) {
          setCachedAccess(false, plan);
          showNoPlan();
          return;
        }

        // 6. ✅ Acceso concedido — eliminar overlay y continuar
        setCachedAccess(true, plan);
        var overlay = document.getElementById('ag-overlay');
        if (overlay) overlay.remove();
        document.body.style.overflow = '';
        injectUserBar(data.email, sb);

      } catch(err) {
        console.error('[AuthGate] Error:', err);
        // En caso de error de red — permitir acceso temporal
        // (mejor experiencia que bloquear por un fallo de red)
        var overlay = document.getElementById('ag-overlay');
        if (overlay) overlay.remove();
        document.body.style.overflow = '';
      }
    });
  }

  // Arrancar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runGate);
  } else {
    runGate();
  }

})();

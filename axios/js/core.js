// AXIOS·IQ — core.js — State, i18n/Strings, Lang, Search (lookupTicker)

// ══════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════
let state = {ticker:'',name:'',sector:'technology',country:'',desc:'',inputs:{},marks:{},price:0};
let lang='es', activeTab='analyzer', openItemId=null;
let acadMode='concepts', acadLevel='all', acadCat='all';

// ══════════════════════════════════════════════════════════════
// TRANSLATIONS  — tr(key) is a FUNCTION, never confused with object
// ══════════════════════════════════════════════════════════════
const STRINGS = {
 es:{
  searchLbl:'— Introduce el ticker bursátil',
  searchHint:'Ej: AAPL, MSFT, NVDA, SAN, BBVA, ITX, NESN, AMZN, TSLA, O, JPM, PLD...',
  goBtnTxt:'ANALIZAR', notFound:'Ticker no encontrado. Rellena los datos manualmente.',
  manualTitle:'DATOS DE LA EMPRESA', nameLbl:'Nombre', sectorLbl:'Sector', descLbl:'Descripción breve',
  confirmBtn:'CONFIRMAR Y ANALIZAR',
  catFundamental:'Análisis Fundamental', catTechnical:'Análisis Técnico',
  catMacro:'Análisis Macro', catQuality:'Gestión y Calidad',
  exploreBtn:'Explorar', inputPlaceholder:'Introduce el valor...',
  analyzeBtn:'GENERAR ANÁLISIS COMPLETO',
  completionHint:'Cuantos más ítems marques, más preciso será el análisis final',
  resTitle:'RESULTADO DEL ANÁLISIS', bearLbl:'ESCENARIO BAJISTA',
  baseLbl:'VALOR RAZONABLE', bullLbl:'ESCENARIO ALCISTA',
  scoreLabel:'PUNTUACIÓN', mosLabel:'MARGEN SEGURIDAD', filledLabel:'ÍTEMS EVALUADOS',
  exportBtn:'EXPORTAR PDF', resetBtn:'NUEVO ANÁLISIS',
  subtitle:'Terminal de Análisis Fundamental', liveAnalysis:'ANÁLISIS EN VIVO',
  priceLbl:'Precio actual (opcional)', priceHolder:'Ej: 185.50',
  completed:'completado', notFilled:'Sin rellenar',
  noMargin:'Sin margen de seguridad', tightMargin:'Margen ajustado', goodMargin:'Buen margen de seguridad',
  withData:'con datos introducidos',
  tabConcepts:'📚 CONCEPTOS', tab28:'📋 28 ÍTEMS',
  filterAll:'Todos', filterFund:'Fundamental', filterTech:'Técnico',
  filterMacro:'Macro', filterQual:'Calidad',
  filterBegin:'🟢 Iniciado', filterMid:'🟡 Intermedio', filterAdv:'🔴 Avanzado',
  levelNivel:'NIVEL:', temaTema:'TEMA:', catLabel:'CATEGORÍA:',
  tabAnalyzer:'ANALIZADOR', tabAcademy:'ACADEMIA', tabWatchlist:'WATCHLIST',
  wlAdd:'Añadir a watchlist', wlRemove:'Quitar de watchlist',
  wlTitle:'MI WATCHLIST', wlRecent:'VISTOS RECIENTEMENTE',
  wlEmpty:'Tu watchlist está vacía.\nAnaliza una empresa y pulsa ☆ para guardarla.',
  wlClear:'BORRAR TODO',
  whatIsLbl:'¿QUÉ ES?', yourDataLbl:'TU DATO',
  markOk:'✓ Bien', markBad:'✗ Preocupa', markWatch:'⚠ Vigilar',
  academiaBtn:'📚 Academia', source1Lbl:'🔗 Fuente', itemDefault:'Ítem',
  manualNameHolder:'Ej: Inditex S.A.',
  secTechnology:'💻 Tecnología', secConsumerCyclical:'🛍️ Consumo Cíclico',
  secConsumerDefensive:'🛒 Consumo Defensivo', secReit:'🏢 REIT / SOCIMI',
  secFinancial:'🏦 Banco / Financiero', secEnergy:'⚡ Energía',
  secHealthcare:'🏥 Salud / Farmacéutica', secIndustrial:'⚙️ Industrial',
  secUtilities:'🔌 Utilities', secTelecom:'📡 Telecomunicaciones',
  priceHint:'Para calcular el margen de seguridad',
  itemsSuffix:'ítems',
  emptyAcad:'Sin artículos para este filtro.',
  whatIs:'¿Qué es?', posSignal:'Señal positiva', redFlagLbl:'Señal de alerta',
  watchLbl:'A vigilar', whereToFind:'Dónde buscarlo', sourceLbl:'Ver fuente',
  catLFundamental:'Fundamental', catLTechnical:'Técnico',
  catLMacro:'Macro', catLQuality:'Gestión',
 },
 en:{
  searchLbl:'— Enter the stock ticker',
  searchHint:'e.g. AAPL, MSFT, NVDA, SAN, BBVA, ITX, NESN, AMZN, TSLA, O, JPM, PLD...',
  goBtnTxt:'ANALYZE', notFound:'Ticker not found. Fill in the data manually.',
  manualTitle:'COMPANY DATA', nameLbl:'Name', sectorLbl:'Sector', descLbl:'Short description',
  confirmBtn:'CONFIRM & ANALYZE',
  catFundamental:'Fundamental Analysis', catTechnical:'Technical Analysis',
  catMacro:'Macro Analysis', catQuality:'Management & Quality',
  exploreBtn:'Explore', inputPlaceholder:'Enter value...',
  analyzeBtn:'GENERATE FULL ANALYSIS',
  completionHint:'The more items you mark, the more accurate the final analysis',
  resTitle:'ANALYSIS RESULTS', bearLbl:'BEAR SCENARIO',
  baseLbl:'FAIR VALUE', bullLbl:'BULL SCENARIO',
  scoreLabel:'SCORE', mosLabel:'MARGIN OF SAFETY', filledLabel:'ITEMS EVALUATED',
  exportBtn:'EXPORT PDF', resetBtn:'NEW ANALYSIS',
  subtitle:'Fundamental Analysis Terminal', liveAnalysis:'LIVE ANALYSIS',
  priceLbl:'Current price (optional)', priceHolder:'e.g. 185.50',
  completed:'completed', notFilled:'Not filled yet',
  noMargin:'No margin of safety', tightMargin:'Tight margin', goodMargin:'Good margin of safety',
  withData:'with data entered',
  tabConcepts:'📚 CONCEPTS', tab28:'📋 28 ITEMS',
  filterAll:'All', filterFund:'Fundamental', filterTech:'Technical',
  filterMacro:'Macro', filterQual:'Quality',
  filterBegin:'🟢 Beginner', filterMid:'🟡 Intermediate', filterAdv:'🔴 Advanced',
  levelNivel:'LEVEL:', temaTema:'TOPIC:', catLabel:'CATEGORY:',
  tabAnalyzer:'ANALYZER', tabAcademy:'ACADEMY', tabWatchlist:'WATCHLIST',
  wlAdd:'Add to watchlist', wlRemove:'Remove from watchlist',
  wlTitle:'MY WATCHLIST', wlRecent:'RECENTLY VIEWED',
  wlEmpty:'Your watchlist is empty.\nAnalyze a company and press ☆ to save it.',
  wlClear:'CLEAR ALL',
  whatIsLbl:'WHAT IS IT?', yourDataLbl:'YOUR DATA',
  markOk:'✓ Good', markBad:'✗ Concern', markWatch:'⚠ Watch',
  academiaBtn:'📚 Academy', source1Lbl:'🔗 Source', itemDefault:'Item',
  manualNameHolder:'e.g. Apple Inc.',
  secTechnology:'💻 Technology', secConsumerCyclical:'🛍️ Consumer Cyclical',
  secConsumerDefensive:'🛒 Consumer Defensive', secReit:'🏢 REIT',
  secFinancial:'🏦 Bank / Financial', secEnergy:'⚡ Energy',
  secHealthcare:'🏥 Healthcare', secIndustrial:'⚙️ Industrial',
  secUtilities:'🔌 Utilities', secTelecom:'📡 Telecom',
  priceHint:'To calculate the margin of safety',
  itemsSuffix:'items',
  emptyAcad:'No articles for this filter.',
  whatIs:'What is it?', posSignal:'Positive signal', redFlagLbl:'Red flag',
  watchLbl:'Watch out for', whereToFind:'Where to find it', sourceLbl:'See source',
  catLFundamental:'Fundamental', catLTechnical:'Technical',
  catLMacro:'Macro', catLQuality:'Management',
 },
 pt:{
  searchLbl:'— Introduza o ticker bolsista',
  searchHint:'Ex: AAPL, MSFT, NVDA, SAN, BBVA, ITX, NESN, AMZN, TSLA, O, JPM, PLD...',
  goBtnTxt:'ANALISAR', notFound:'Ticker não encontrado. Preencha os dados manualmente.',
  manualTitle:'DADOS DA EMPRESA', nameLbl:'Nome', sectorLbl:'Setor', descLbl:'Descrição breve',
  confirmBtn:'CONFIRMAR E ANALISAR',
  catFundamental:'Análise Fundamental', catTechnical:'Análise Técnica',
  catMacro:'Análise Macro', catQuality:'Gestão e Qualidade',
  exploreBtn:'Explorar', inputPlaceholder:'Introduza o valor...',
  analyzeBtn:'GERAR ANÁLISE COMPLETA',
  completionHint:'Quanto mais itens marcar, mais precisa será a análise final',
  resTitle:'RESULTADO DA ANÁLISE', bearLbl:'CENÁRIO BAIXISTA',
  baseLbl:'VALOR RAZOÁVEL', bullLbl:'CENÁRIO ALTISTA',
  scoreLabel:'PONTUAÇÃO', mosLabel:'MARGEM SEGURANÇA', filledLabel:'ITENS AVALIADOS',
  exportBtn:'EXPORTAR PDF', resetBtn:'NOVA ANÁLISE',
  subtitle:'Terminal de Análise Fundamental', liveAnalysis:'ANÁLISE AO VIVO',
  priceLbl:'Preço atual (opcional)', priceHolder:'Ex: 185.50',
  completed:'concluído', notFilled:'Não preenchido',
  noMargin:'Sem margem de segurança', tightMargin:'Margem ajustada', goodMargin:'Boa margem de segurança',
  withData:'com dados introduzidos',
  tabConcepts:'📚 CONCEITOS', tab28:'📋 28 ITENS',
  filterAll:'Todos', filterFund:'Fundamental', filterTech:'Técnica',
  filterMacro:'Macro', filterQual:'Qualidade',
  filterBegin:'🟢 Iniciado', filterMid:'🟡 Intermédio', filterAdv:'🔴 Avançado',
  levelNivel:'NÍVEL:', temaTema:'TEMA:', catLabel:'CATEGORIA:',
  tabAnalyzer:'ANALISADOR', tabAcademy:'ACADEMIA', tabWatchlist:'WATCHLIST',
  wlAdd:'Adicionar à watchlist', wlRemove:'Remover da watchlist',
  wlTitle:'MINHA WATCHLIST', wlRecent:'VISTOS RECENTEMENTE',
  wlEmpty:'A tua watchlist está vazia.\nAnalisa uma empresa e prime ☆ para guardar.',
  wlClear:'LIMPAR TUDO',
  whatIsLbl:'O QUE É?', yourDataLbl:'O TEU DADO',
  markOk:'✓ Bom', markBad:'✗ Preocupa', markWatch:'⚠ Vigiar',
  academiaBtn:'📚 Academia', source1Lbl:'🔗 Fonte', itemDefault:'Item',
  manualNameHolder:'Ex: Inditex S.A.',
  secTechnology:'💻 Tecnologia', secConsumerCyclical:'🛍️ Consumo Cíclico',
  secConsumerDefensive:'🛒 Consumo Defensivo', secReit:'🏢 REIT',
  secFinancial:'🏦 Banco / Financeiro', secEnergy:'⚡ Energia',
  secHealthcare:'🏥 Saúde / Farmacêutica', secIndustrial:'⚙️ Industrial',
  secUtilities:'🔌 Utilities', secTelecom:'📡 Telecomunicações',
  priceHint:'Para calcular a margem de segurança',
  itemsSuffix:'itens',
  emptyAcad:'Sem artigos para este filtro.',
  whatIs:'O que é?', posSignal:'Sinal positivo', redFlagLbl:'Sinal de alerta',
  watchLbl:'A vigiar', whereToFind:'Onde encontrar', sourceLbl:'Ver fonte',
  catLFundamental:'Fundamental', catLTechnical:'Técnica',
  catLMacro:'Macro', catLQuality:'Gestão',
 },
};
// THE ONLY translation accessor — a proper function
function tr(key){ return (STRINGS[lang]||STRINGS.es)[key]||key; }

// ══════════════════════════════════════════════════════════════
// ACADEMIA EXTENDED — concepts with levels + 28 items explained
let ACADEMIA_FULL = null; // lazy-loaded from academia.json

// ══════════════════════════════════════════════════════════════
// LANG / TABS
// ══════════════════════════════════════════════════════════════
function setLang(l){
  lang=l;
  ['es','pt','en'].forEach(c=>document.getElementById('btn-'+c).classList.toggle('active',c===l));
  document.getElementById('subtitle').textContent   = tr('subtitle');
  document.getElementById('live-txt').textContent   = tr('liveAnalysis');
  document.getElementById('search-lbl').textContent = tr('searchLbl');
  document.getElementById('search-hint').textContent= tr('searchHint');
  document.getElementById('go-btn').textContent           = tr('goBtnTxt');
  document.getElementById('tab-analyzer-lbl').textContent  = tr('tabAnalyzer');
  document.getElementById('tab-academy-lbl').textContent   = tr('tabAcademy');
  const _wlbl = document.getElementById('tab-watchlist-lbl');
  if(_wlbl) _wlbl.textContent = tr('tabWatchlist');
  const _ablbl = document.getElementById('tab-about-lbl');
  if(_ablbl) _ablbl.textContent = lang==='en'?'ABOUT':lang==='pt'?'SOBRE':'SOBRE';
  renderSectorOptions();
  if(state.ticker) renderGrid();
  if(activeTab==='academy') renderAcademy();
  const gsInput=document.getElementById('gs-input');
  const _gslbl = document.getElementById('gs-trigger-lbl');
  if(_gslbl) _gslbl.textContent = {es:'Buscar',en:'Search',pt:'Pesquisar'}[l]||'Buscar';
  if(gsInput) gsInput.placeholder={es:'Buscar empresa, ticker o artículo...',en:'Search company, ticker or article...',pt:'Pesquisar empresa, ticker ou artigo...'}[l]||'Buscar...';
  // Update home stats labels
  const _statLabels={
    es:{tickers:'tickers',articles:'artículos',items:'ítems de análisis',langs:'trilingüe'},
    en:{tickers:'tickers',articles:'articles',items:'analysis items',langs:'trilingual'},
    pt:{tickers:'tickers',articles:'artigos',items:'itens de análise',langs:'trilíngue'}
  };
  const _sl=_statLabels[l]||_statLabels.es;
  try{
    document.getElementById('stat-tickers-lbl').textContent=_sl.tickers;
    document.getElementById('stat-articles-lbl').textContent=_sl.articles;
    document.getElementById('stat-items-lbl').textContent=_sl.items;
    document.getElementById('stat-langs-lbl').textContent=_sl.langs;
  }catch(e){}
}

// Renders translated <option> elements into #manual-sector
const SECTOR_KEYS = [
  ['technology','secTechnology'],['consumer_cyclical','secConsumerCyclical'],
  ['consumer_defensive','secConsumerDefensive'],['reit','secReit'],
  ['financial','secFinancial'],['energy','secEnergy'],['healthcare','secHealthcare'],
  ['industrial','secIndustrial'],['utilities','secUtilities'],['telecom','secTelecom'],
];
function renderSectorOptions(){
  const sel = document.getElementById('manual-sector');
  if(!sel) return;
  const cur = sel.value || 'technology';
  sel.innerHTML = SECTOR_KEYS.map(([v,k])=>`<option value="${v}"${v===cur?' selected':''}>${tr(k)}</option>`).join('');
}

function showTab(tab){
  // Fade out current panel
  const prev=document.getElementById(activeTab+'-content');
  if(prev && prev.style.display!=='none'){ prev.classList.add('fading'); }
  setTimeout(function(){
    if(prev) prev.classList.remove('fading');
    _applyTab(tab);
    _pushNav('tab:'+tab);
    if(tab==='academy')    renderAcademy();
    if(tab==='watchlist')  renderWatchlist();
    if(tab==='about')      renderAboutAxios();
    if(tab==='screener')   { if(typeof renderScreener  ==='function') renderScreener();   }
    if(tab==='comparador') { if(typeof renderComparador==='function') renderComparador(); }
    _setHash(tab, (tab==='analyzer'&&state.ticker)?state.ticker:null, null);
    _updateBreadcrumb();
    if(tab!=='analyzer') _afDismiss();
  }, 120);
}

// ══════════════════════════════════════════════════════════════
// SEARCH
// ══════════════════════════════════════════════════════════════
function lookupTicker(){
  const raw=document.getElementById('ticker-input').value.trim().toUpperCase();
  if(!raw) return;
  state={ticker:raw,name:'',sector:'technology',country:'',desc:'',inputs:{},marks:{},price:0};
  _loadTickerDB().then(function(){
    const entry=TICKER_DB[raw];
    if(entry){
      state.name=entry[0]; state.sector=entry[1];
      state.country=entry[2]; state.desc=entry[3];
      document.getElementById('manual-box').style.display='none';
      showCompanyHeader(); renderGrid();
      _addRecent(raw, state.name, state.sector, state.country);
      _setHash('analyzer', raw, null);
      _updateBreadcrumb();
      _saveState();
      _afFetch(raw); // ← auto-fill from Yahoo Finance
      _macroFetch();   // ← macro data from FRED
    } else {
    document.getElementById('manual-box').style.display='block';
    document.getElementById('not-found-msg').textContent   = tr('notFound');
    document.getElementById('manual-title').textContent   = tr('manualTitle');
    document.getElementById('manual-name-lbl').textContent= tr('nameLbl');
    document.getElementById('manual-sector-lbl').textContent=tr('sectorLbl');
    document.getElementById('manual-desc-lbl').textContent= tr('descLbl');
    document.getElementById('manual-confirm').textContent = tr('confirmBtn');
    document.getElementById('manual-name').placeholder = tr('manualNameHolder');
    renderSectorOptions();
    document.getElementById('co-header').classList.remove('visible');
    document.getElementById('analysis-grid').innerHTML='';
    document.getElementById('results-panel').classList.remove('visible');
  }
  }); // _loadTickerDB
}
function confirmManual(){
  state.name   =document.getElementById('manual-name').value.trim()||state.ticker;
  state.sector =document.getElementById('manual-sector').value||'technology';
  state.desc   =document.getElementById('manual-desc').value.trim();
  state.country='🌐';
  document.getElementById('manual-box').style.display='none';
  showCompanyHeader(); renderGrid();
}



// ══════════════════════════════════════════════════════════════
// THEME MANAGEMENT — dark / light / auto
// ══════════════════════════════════════════════════════════════
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('axq_theme', t);
  var btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
}
function toggleTheme() {
  var cur = document.documentElement.getAttribute('data-theme') || 'dark';
  setTheme(cur === 'dark' ? 'light' : 'dark');
}
function initTheme() {
  var saved = localStorage.getItem('axq_theme');
  if (saved) { setTheme(saved); return; }
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(prefersDark ? 'dark' : 'light');
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
    if (!localStorage.getItem('axq_theme')) setTheme(e.matches ? 'dark' : 'light');
  });
}


// AXIOS·IQ — data.js — Error Boundary, TICKER_DB, ITEMS, SC_BENCH, SECTORS



// ══════════════════════════════════════════════════════════════════════
// ERROR BOUNDARY GLOBAL
// ══════════════════════════════════════════════════════════════════════
(function(){
  function showErrToast(msg){
    const t=document.getElementById('err-toast');
    if(!t) return;
    t.textContent='⚠ '+msg;
    t.classList.add('visible');
    clearTimeout(t._tid);
    t._tid=setTimeout(()=>t.classList.remove('visible'),5000);
  }
  window.onerror=function(msg,src,line,col,err){
    console.error('[AXIOS-IQ]',msg,err);
    showErrToast('Error inesperado — recarga la página si algo no funciona.');
    return true;
  };
  window.addEventListener('unhandledrejection',function(e){
    if(e.reason && e.reason.name === 'SecurityError') { e.preventDefault(); return; }
    console.error('[AXIOS-IQ] Unhandled rejection:',e.reason);
    showErrToast('Error de red — comprueba tu conexión.');
  });
  window._showErrToast=showErrToast;
})();


// ══════════════════════════════════════════════════════════════════════
// TICKER_DB — cargado de forma asíncrona desde tickers.json
// ══════════════════════════════════════════════════════════════════════
let TICKER_DB = null;
let _tickerDBReady = false;
let _tickerDBPromise = null;

function _loadTickerDB(){
  if(_tickerDBReady) return Promise.resolve(TICKER_DB);
  if(_tickerDBPromise) return _tickerDBPromise;
  _tickerDBPromise = fetch('../tickers.json')
    .then(r=>{ if(!r.ok) throw new Error('tickers.json HTTP '+r.status); return r.json(); })
    .then(data=>{ TICKER_DB=data; _tickerDBReady=true; return data; })
    .catch(err=>{
      console.warn('tickers.json no disponible, usando DB vacía.',err);
      TICKER_DB={}; _tickerDBReady=true; return {};
    });
  return _tickerDBPromise;
}
// Pre-carga en background al abrir la app
_loadTickerDB();


const SECTORS = {
  technology:{label:"Tecnología",emoji:"💻",color:"#3b82f6",
    valMethod:"ev_fcf",
    item1_label:"P/E o EV/FCF",item6_label:"FCF Margin / ROIC",item10_label:"Rule of 40",
    notes_es:"En tecnología, el P/E alto puede estar justificado por el crecimiento. Prioriza FCF margin y Rule of 40 sobre métricas tradicionales de valor.",
    pe_fair:25,pe_cheap:15,pe_exp:45,debt_note:"La deuda es tolerable si el FCF cubre intereses holgadamente y el negocio crece >15%/año.",
    item10_desc:"Suma del % de crecimiento de ingresos y el % de margen de beneficio/FCF. >40 es excelente para SaaS o tech de crecimiento.",
    sector_links:{macro:"https://fred.stlouisfed.org/series/FEDFUNDS",val:"https://simplywall.st"},
  },
  consumer_cyclical:{label:"Consumo Cíclico",emoji:"🛍️",color:"#f59e0b",
    valMethod:"pe",
    item1_label:"P/E o EV/EBITDA",item6_label:"ROE / Margen Neto",item10_label:"Crecimiento Ventas SSS",
    notes_es:"Muy sensible al ciclo económico. Evalúa la solidez del balance en recesión y la capacidad de pricing power.",
    pe_fair:18,pe_cheap:12,pe_exp:30,debt_note:"Deuda moderada tolerable. En recesión, el apalancamiento excesivo puede ser fatal.",
    item10_desc:"Same-Store Sales (SSS): crecimiento de ventas en tiendas abiertas >1 año. Indica si el negocio crece orgánicamente.",
    sector_links:{macro:"https://fred.stlouisfed.org/series/UMCSENT",val:"https://macrotrends.net"},
  },
  consumer_defensive:{label:"Consumo Defensivo",emoji:"🛒",color:"#22c55e",
    valMethod:"ddm",
    item1_label:"P/E histórico vs actual",item6_label:"ROE / Margen Operativo",item10_label:"Pricing Power",
    notes_es:"Busca consistencia sobre crecimiento. El dividendo creciente es la prueba máxima de calidad. Evalúa si puede subir precios sin perder volumen.",
    pe_fair:22,pe_cheap:15,pe_exp:35,debt_note:"Deuda controlada, preferentemente <2x EBITDA. El flujo de caja debe cubrir dividendo con margen.",
    item10_desc:"Capacidad de subir precios por encima de la inflación sin perder cuota. Indicador de moat real. Analiza evolución histórica de márgenes.",
    sector_links:{macro:"https://fred.stlouisfed.org/series/CPIAUCSL",val:"https://dividendinvestor.com"},
  },
  reit:{label:"REIT / SOCIMI",emoji:"🏢",color:"#a78bfa",
    valMethod:"p_ffo",
    item1_label:"P/FFO (Price/Funds From Operations)",item6_label:"Tasa de Ocupación",item10_label:"WALE (Vida media contratos)",
    notes_es:"Para REITs, el FFO es más relevante que el beneficio neto. La deuda estructural es normal; lo importante es el LTV y la cobertura del dividendo por el AFFO.",
    pe_fair:16,pe_cheap:11,pe_exp:25,debt_note:"La deuda alta es estructural en REITs. Evalúa LTV (<45% es conservador), no deuda/EBITDA. El tipo de deuda (fija vs variable) es clave con tipos altos.",
    item10_desc:"Weighted Average Lease Expiry: vida media ponderada de los contratos de arrendamiento. >5 años es buena visibilidad de ingresos.",
    sector_links:{macro:"https://fred.stlouisfed.org/series/FEDFUNDS",val:"https://seekingalpha.com"},
  },
  financial:{label:"Banco / Financiero",emoji:"🏦",color:"#f472b6",
    valMethod:"pbv",
    item1_label:"P/BV (Price-to-Book Value)",item6_label:"NIM (Margen de Interés Neto)",item10_label:"Tier 1 Capital Ratio",
    notes_es:"Los bancos no se valoran como empresas normales. P/BV y ROE son las métricas clave. La calidad de los activos (NPL) es más importante que el crecimiento.",
    pe_fair:1.3,pe_cheap:0.8,pe_exp:2.0,debt_note:"Los bancos tienen apalancamiento estructural. Evalúa la ratio de capital Tier 1 (>12% es conservador) y la cobertura de morosos.",
    item10_desc:"Capital de máxima calidad como % de activos ponderados por riesgo. Regulado por Basilea III. >12% es cómodo; <10% puede generar preocupación regulatoria.",
    sector_links:{macro:"https://fred.stlouisfed.org/series/STLFSI3",val:"https://simplywall.st"},
  },
  energy:{label:"Energía",emoji:"⚡",color:"#f59e0b",
    valMethod:"ev_ebitda",
    item1_label:"EV/EBITDA o P/FCF",item6_label:"ROACE (Return on Avg. Capital Employed)",item10_label:"Coste de Producción ($/barril o $/MWh)",
    notes_es:"Sector muy cíclico vinculado al precio de commodities. El FCF breakeven price y la disciplina de capex son los factores más importantes a largo plazo.",
    pe_fair:8,pe_cheap:5,pe_exp:14,debt_note:"Deuda moderada tolerable si el FCF cubre a precios conservadores de commodity. Evalúa siempre el breakeven price del negocio.",
    item10_desc:"Precio al que la empresa genera FCF positivo. Cuanto más bajo, más resiliente es la empresa ante caídas del precio del petróleo/gas.",
    sector_links:{macro:"https://oilprice.com",val:"https://macrotrends.net"},
  },
  healthcare:{label:"Salud / Farmacéutica",emoji:"🏥",color:"#34d399",
    valMethod:"pe",
    item1_label:"P/E o EV/EBITDA",item6_label:"R&D como % de Ingresos",item10_label:"Pipeline (fases de desarrollo)",
    notes_es:"El valor futuro depende del pipeline de productos. Un patent cliff inminente puede destruir valor rápidamente. Evalúa la diversificación del portfolio.",
    pe_fair:20,pe_cheap:13,pe_exp:35,debt_note:"Deuda moderada aceptable si el FCF es robusto. Cuidado con deuda alta por adquisiciones: integracion es compleja.",
    item10_desc:"Número de productos en fase I/II/III de ensayos clínicos. Diversificación del pipeline reduce el riesgo de dependencia de un solo fármaco.",
    sector_links:{macro:"https://clinicaltrials.gov",val:"https://evaluatepharma.com"},
  },
  industrial:{label:"Industrial",emoji:"⚙️",color:"#94a3b8",
    valMethod:"ev_ebitda",
    item1_label:"EV/EBITDA o P/E",item6_label:"ROIC (Return on Invested Capital)",item10_label:"Cartera de Pedidos (Backlog)",
    notes_es:"Sector cíclico pero con ciclos largos. El ROIC sostenido >15% es señal de ventaja competitiva real. El backlog da visibilidad a los ingresos futuros.",
    pe_fair:16,pe_cheap:10,pe_exp:25,debt_note:"Deuda moderada tolerable. Importante que el negocio sea capaz de generar FCF positivo a lo largo del ciclo completo.",
    item10_desc:"Pedidos confirmados aún no entregados. Indica la visibilidad de ingresos a 12-36 meses. Un backlog creciente es señal de demanda fuerte.",
    sector_links:{macro:"https://fred.stlouisfed.org/series/INDPRO",val:"https://macrotrends.net"},
  },
  utilities:{label:"Utilities",emoji:"🔌",color:"#60a5fa",
    valMethod:"pe",
    item1_label:"P/E o EV/RAB",item6_label:"ROE regulado",item10_label:"% Ingresos Regulados",
    notes_es:"Negocio quasi-monopolístico con rentabilidad regulada. La certidumbre de los ingresos es la principal ventaja. Muy sensible a tipos de interés.",
    pe_fair:17,pe_cheap:12,pe_exp:26,debt_note:"Alta deuda es estructural en utilities. Lo clave es que la deuda tenga cobertura (DSCR >1.3x) y el dividendo esté cubierto por el beneficio regulado.",
    item10_desc:"Proporción de ingresos provenientes de tarifas reguladas por el gobierno. Mayor % = más predictible pero también más limitado en crecimiento.",
    sector_links:{macro:"https://fred.stlouisfed.org/series/FEDFUNDS",val:"https://dividendinvestor.com"},
  },
  telecom:{label:"Telecomunicaciones",emoji:"📡",color:"#818cf8",
    valMethod:"ev_ebitda",
    item1_label:"EV/EBITDA o P/FCF",item6_label:"ARPU (Ingreso Medio por Usuario)",item10_label:"Capex Intensidad (Capex/Ingresos)",
    notes_es:"Negocio de alta infraestructura con barreras de entrada regulatorias. El churn y el ARPU son los mejores indicadores de salud del negocio.",
    pe_fair:10,pe_cheap:6,pe_exp:16,debt_note:"Alta deuda es común (espectro, red). Evalúa si el FCF es suficiente para cubrir deuda, capex, dividendo y amortizaciones simultáneamente.",
    item10_desc:"Capex como % de ingresos. >20% indica negocio intensivo en capital. Telecos en expansión de fibra/5G suelen tener capex intensidad alta temporalmente.",
    sector_links:{macro:"https://www.gsma.com/r/mobileeconomy/",val:"https://macrotrends.net"},
  },
};


const ITEMS = [
 // ───────────────── FUNDAMENTAL (8) ──────────────────────────
 {id:"pe",cat:"fundamental",icon:"📊",
  label:{default:"Valoración",reit:"P/FFO / NAV",financial:"P/BV / P/E",energy:"EV/EBITDA",telecom:"EV/EBITDA",industrial:"EV/EBITDA"},
  short:"P/E, EV/EBITDA, FCF Yield y comparación con peers",
  desc:{
   default:"La valoración responde a la pregunta central: ¿estás pagando un precio razonable por los beneficios futuros? El P/E compara precio con beneficio, el EV/EBITDA compara el valor de la empresa con su generación operativa, el FCF Yield mide cuánto flujo de caja libre recibes por euro invertido. Ningún múltiplo funciona solo: lo que importa es la valoración relativa al crecimiento y al sector. Empresas caras con mucho crecimiento pueden ser mejores inversiones que empresas baratas sin crecimiento.",
   reit:"El P/FFO sustituye al P/E en REITs porque la amortización inmobiliaria distorsiona el beneficio neto. El NAV (Net Asset Value) permite ver si cotiza con prima o descuento sobre el valor real de los activos.",
   financial:"Los bancos se valoran por P/BV porque su activo principal es el balance. Un banco con ROE sostenido >12% merece P/BV >1. Para comparación entre bancos el P/E es válido.",
   energy:"EV/EBITDA normaliza la deuda y la volatilidad de márgenes propia del sector. Complementar con EV/Reservas o precio por barril.",
   telecom:"EV/EBITDA es el estándar por la alta deuda estructural del sector. EV/FCF complementa cuando hay inversión intensa en red.",
   industrial:"EV/EBITDA permite comparar industriales con diferente nivel de amortizaciones e intensidad de capital."},
  pos:{default:"Múltiplos por debajo de la media histórica del sector con crecimiento visible. FCF Yield >4% indica precio razonable. PEG <1 indica crecimiento barato.",
   reit:"P/FFO 12–18x con FFO creciente. Descuento sobre NAV añade margen de seguridad.",
   financial:"P/BV <1.5x con ROE sostenido >12%.",
   energy:"EV/EBITDA <5x en precio medio del ciclo. Reservas con bajo coste de extracción.",
   telecom:"EV/EBITDA <6x con FCF cubriendo dividendo cómodamente.",
   industrial:"EV/EBITDA <10x con márgenes estables y pricing power demostrado."},
  red:{default:"Múltiplos >2 desviaciones estándar sobre la historia propia sin crecimiento que lo justifique. FCF Yield <1%. PEG >3.",
   reit:"P/FFO >22x sin catalizador claro. Prima significativa sobre NAV.",
   financial:"P/BV >2x con ROE mediocre <10%.",
   energy:"EV/EBITDA >8x en precio de commodity bajo. Coste extracción >60% precio venta.",
   telecom:"EV/EBITDA >8x sin crecimiento de ARPU.",
   industrial:"P/E >25x sin pricing power ni crecimiento demostrable."},
  watch:{default:"Valoración justa sin catalizador. Comparar siempre contra sector y contra historia propia.",
   reit:"Descuento NAV >20% puede ser trampa de valor si los activos se deterioran.",
   financial:"P/BV en zona media — vigilar calidad crediticia.",
   energy:"Valoración muy dependiente del precio del commodity.",
   telecom:"Valoración atractiva puede reflejar riesgo estructural del modelo.",
   industrial:"Expansión de múltiplos en ciclo alto puede revertir agresivamente."},
  link:"https://finviz.com/quote.ashx?t=__TICKER__",link_label:"Ratios en Finviz"},

 {id:"rev_growth",cat:"fundamental",icon:"📈",
  label:{default:"Crecimiento de Ingresos y BPA"},
  short:"Ritmo de crecimiento de ventas y beneficio por acción",
  desc:{default:"El crecimiento es el motor de creación de valor a largo plazo. Crecimiento de ingresos = el negocio gana más clientes o sube precios. Crecimiento de EPS = el beneficio por acción aumenta (puede ser por crecimiento del negocio o por recompras). Lo ideal es que ambos crezcan, pero el EPS creciendo más rápido que los ingresos indica expansión de márgenes — señal excelente. Cuidado: crecimiento solo vía adquisiciones oculta la debilidad orgánica del negocio.",
   reit:"NOI (Net Operating Income) creciendo >3% orgánico. Same-store NOI positivo.",
   financial:"NII y comisiones creciendo en paralelo con calidad crediticia sana.",
   energy:"Producción creciendo a bajo coste incremental con reservas crecientes.",
   telecom:"ARPU (ingreso por usuario) creciendo. Churn controlado <5% anual.",
   industrial:"Backlog o cartera de pedidos creciente. Book-to-bill >1."},
  pos:{default:"Ingresos creciendo >10% YoY sostenido 3+ años. EPS creciendo ≥ ingresos. Guidance conservador que se supera históricamente.",
   reit:"Same-store NOI +3%+. Adquisiciones accretive añadiendo crecimiento.",
   financial:"Loan book sano creciendo con NIM estable o subiendo.",
   energy:"Producción creciendo a coste por barril decreciente.",
   telecom:"ARPU creciendo + upselling de servicios adicionales.",
   industrial:"Backlog >1 año de ventas. Book-to-bill >1.1."},
  red:{default:"Caída de ingresos 2 trimestres consecutivos. EPS creciendo solo vía recompras con deuda mientras el negocio se estanca. Guidance rebajado repetidamente.",
   reit:"Same-store NOI negativo indica problema operativo o de demanda.",
   financial:"Caída de márgenes de interés y volúmenes de préstamo simultánea.",
   energy:"Reservas declinando sin reinversión suficiente.",
   telecom:"ARPU cayendo por presión competitiva con churn acelerándose.",
   industrial:"Backlog cayendo con cancelaciones de pedidos crecientes."},
  watch:{default:"Crecimiento desacelerando desde niveles altos — ¿normalización o inicio de tendencia? Vigilar la calidad del crecimiento: orgánico vs inorgánico.",
   reit:"Crecimiento dependiente de adquisiciones sin yield accretive claro.",
   financial:"Crecimiento del balance más rápido que el capital disponible.",
   energy:"Crecimiento caro porque el coste de nuevos pozos es elevado.",
   telecom:"Crecimiento en mercados emergentes con mayor riesgo divisa.",
   industrial:"Crecimiento concentrado en un solo cliente o contrato."},
  link:"https://stockanalysis.com/stocks/__TICKER__/financials/",link_label:"Ingresos históricos"},

 {id:"margins",cat:"fundamental",icon:"💰",
  label:{default:"Márgenes y Rentabilidad (ROE)"},
  short:"Margen bruto, EBIT, neto y ROE",
  desc:{default:"Los márgenes revelan la calidad del negocio: cuánto se queda la empresa de cada euro de venta. El margen bruto mide la eficiencia del producto (sin gastos corporativos). El margen EBIT incorpora los costes operativos. El ROE (Return on Equity) mide la rentabilidad sobre el capital propio — empresas con ROE sostenido >15% durante 5+ años son escasas y generalmente excelentes inversiones. Un ROE alto con poca deuda es la señal más clara de un negocio de calidad excepcional.",
   reit:"Margen NOI >60%. FFO yield sobre precio >5%.",
   financial:"ROE >12%. Ratio coste/ingreso (efficiency ratio) <55%.",
   energy:"Margen EBITDA >30% en precio de commodity medio del ciclo.",
   telecom:"Margen EBITDA >35%. Margen FCF >15% tras capex de mantenimiento.",
   industrial:"Margen EBIT >10% sostenido. ROIC >10% indica creación de valor real."},
  pos:{default:"Margen bruto >40% tech/pharma, >25% consumo, >15% industrial. Margen neto >15% tech. ROE >15% sostenido 5+ años sin apalancamiento excesivo.",
   reit:"NOI margin >60%. Cobertura AFFO del dividendo >1.2x.",
   financial:"ROE >12%. Cost/income <55%. NIM estable o subiendo.",
   energy:"EBITDA margin >30% en precio medio. ROIC >8%.",
   telecom:"EBITDA margin >35%. FCF margin >15% post-capex.",
   industrial:"EBIT margin >10%. ROIC >10% indica que destruye competidores."},
  red:{default:"Compresión de márgenes sostenida 3+ trimestres. ROE declinante sin justificación cíclica. Margen bruto cayendo = pérdida de pricing power (señal grave).",
   reit:"NOI margin <50% indica ineficiencia operativa o activos de baja calidad.",
   financial:"Cost/income >70% con presión en NIM simultánea.",
   energy:"EBITDA margin <20% en precio medio — negocio marginal en el ciclo.",
   telecom:"EBITDA margin <25% con inversión en red elevada.",
   industrial:"Márgenes oscilantes sin pricing power — empresa de tipo commodity."},
  watch:{default:"Márgenes bajo presión temporal por costes de inputs o inversión en crecimiento. Lo clave: ¿es estructural (negocio empeora) o cíclico (se recuperará)?",
   reit:"Presión transitoria por obras de renovación que mejorarán activos.",
   financial:"Presión de NIM en entorno de tipos bajos — vigilar normalización.",
   energy:"Márgenes comprimidos en precio bajo del ciclo — oportunidad si el balance aguanta.",
   telecom:"Márgenes deprimidos por inversión 5G — evaluar ROI del capex.",
   industrial:"Ciclicidad de márgenes esperada — lo relevante es el mínimo del ciclo."},
  link:"https://stockanalysis.com/stocks/__TICKER__/financials/",link_label:"Márgenes históricos"},

 {id:"fcf",cat:"fundamental",icon:"💵",
  label:{default:"Free Cash Flow",reit:"FFO / AFFO",financial:"Capital Generation"},
  short:"Generación de caja libre — la métrica más difícil de manipular",
  desc:{default:"El FCF (Free Cash Flow) es el dinero real que genera el negocio después de todas las inversiones necesarias para mantenerlo y hacerlo crecer. Es la métrica más difícil de manipular contablemente porque requiere dinero en el banco, no apuntes contables. Una empresa puede tener beneficio neto positivo y FCF negativo — señal de alerta importante. El FCF Yield (FCF / Market Cap) mide cuánto flujo de caja libre recibes por euro invertido — >5% es generalmente atractivo.",
   reit:"El AFFO (Adjusted FFO) es el FCF real del REIT: FFO menos capex de mantenimiento de los activos. El AFFO debe cubrir el dividendo con margen.",
   financial:"En bancos el FCF es la generación orgánica de capital (beneficio neto – dividendos – crecimiento del balance ponderado por riesgo).",
   energy:"Distinguir FCF de mantenimiento (sostener producción) de FCF de crecimiento. El reinvestment ratio es clave.",
   telecom:"FCF después de pago de espectro e inversión en red. El apalancamiento operativo hace que mejore rápido una vez saturada la red.",
   industrial:"FCF cíclico — comparar en el punto medio del ciclo. El working capital es crítico en industriales."},
  pos:{default:"FCF Yield >4% con tendencia creciente. FCF/Net Income >80% (alta conversión). FCF creciendo en paralelo o más rápido que el EBITDA.",
   reit:"AFFO payout <85% con AFFO creciendo. Deuda/EBITDA <6x.",
   financial:"Capital Tier 1 >12% generado orgánicamente.",
   energy:"FCF positivo incluso en precio bajo del commodity. Yield FCF >8% en precio medio.",
   telecom:"FCF después de espectro cubriendo dividendo con ratio <70%.",
   industrial:"FCF positivo incluso en fondo de ciclo. Conversión FCF/EBITDA >50%."},
  red:{default:"FCF negativo de forma estructural sin inversión en crecimiento que lo justifique. FCF/Net Income <60% — posible manipulación contable del beneficio. FCF cayendo mientras el EBITDA sube.",
   reit:"AFFO payout >100% — dividendo insostenible.",
   financial:"Consumo de capital por crecimiento del balance sin ROE suficiente.",
   energy:"FCF negativo en precio alto del commodity — empresa inviable.",
   telecom:"FCF negativo en red madura — destrucción de valor.",
   industrial:"FCF negativo en ciclo alto — riesgo grave cuando llegue el ciclo bajo."},
  watch:{default:"FCF negativo transitorio por inversión en crecimiento (nueva planta, expansión). Evaluar el ROI esperado y el tiempo hasta retorno positivo.",
   reit:"FCF negativo por adquisiciones accretive — evaluar yield sobre coste.",
   financial:"Capital consumido por provisiones — ¿cíclico o estructural?",
   energy:"FCF negativo en ciclo bajo — aguanta el balance para el siguiente repunte.",
   telecom:"FCF deprimido en año de licitación de espectro — transitorio.",
   industrial:"FCF comprimido en peak de capex — evaluar vida útil de las inversiones."},
  link:"https://stockanalysis.com/stocks/__TICKER__/financials/cash-flow-statement/",link_label:"Cash Flow Statement"},

 {id:"debt",cat:"fundamental",icon:"⚖️",
  label:{default:"Balance y Deuda"},
  short:"Deuda neta, D/E ratio, liquidez y solidez del balance",
  desc:{default:"El balance es el sistema inmune de la empresa: aguanta las crisis. Una empresa con poca deuda puede sobrevivir ciclos malos y aprovechar las crisis para adquirir competidores baratos. La deuda no es mala per se — usada con prudencia apalanca el ROE. El problema es la deuda relativa a la capacidad de generarla. Deuda Neta/EBITDA indica cuántos años de generación operativa necesitas para pagarla. Current ratio mide si puedes pagar tus deudas a corto plazo.",
   reit:"Los REITs usan deuda estructuralmente. El LTV (Loan-to-Value) mide el apalancamiento sobre el valor de los activos. Hasta 40% es conservador.",
   financial:"Los bancos son el negocio del apalancamiento. El CET1 mide la solidez del capital regulatorio. >12% es confortable.",
   energy:"E&P con deuda alta son letales en ciclo bajo. Midstream puede apalancarse más por contratos take-or-pay.",
   telecom:"Alta deuda estructural por inversión en red y espectro. D/EBITDA <3x es sano.",
   industrial:"Deuda cíclica: en ciclo alto parece sana, en ciclo bajo se convierte en riesgo existencial."},
  pos:{default:"Deuda Neta/EBITDA <2x. Current ratio >1.5x. Sin vencimientos concentrados próximos. Empresas con caja neta (deuda negativa) son las más seguras.",
   reit:"LTV <40%. Deuda a tipo fijo. Vencimientos escalonados sin concentración.",
   financial:"CET1 >13%. NPL ratio <3%. Cobertura de provisiones >100%.",
   energy:"D/EBITDA <2.5x en E&P. Cobertura de intereses >5x.",
   telecom:"D/EBITDA <3x. Cobertura de intereses >4x.",
   industrial:"D/EBITDA <1.5x en fondo de ciclo. Líneas de crédito no dispuestas disponibles."},
  red:{default:"Deuda Neta/EBITDA >5x sin activos que lo respalden. Vencimientos próximos con FCF insuficiente para refinanciar. Covenants cerca de incumplirse.",
   reit:"LTV >60%. Refinanciación de deuda a tipos significativamente mayores.",
   financial:"CET1 <10% con activos de riesgo creciendo. NPLs crecientes sin provisiones.",
   energy:"D/EBITDA >4x en precio medio del ciclo.",
   telecom:"D/EBITDA >4x con FCF libre de intereses negativo.",
   industrial:"D/EBITDA >3x en ciclo alto con recesión visible en el horizonte."},
  watch:{default:"Deuda alta pero con calendario de amortización manejable y FCF suficiente. Vigilar tipo de la deuda y riesgo de refinanciación en entorno de tipos altos.",
   reit:"LTV 40-55% — manejable pero sensible a subidas de tipos.",
   financial:"Capital en zona de confort regulatorio sin margen para errores.",
   energy:"Deuda alta cubierta por hedging del precio del commodity.",
   telecom:"Deuda tras adquisición grande — evaluar sinergias y deleveraging path.",
   industrial:"Deuda estacional o de working capital — evaluar el ciclo de conversión."},
  link:"https://stockanalysis.com/stocks/__TICKER__/financials/balance-sheet/",link_label:"Balance Sheet"},

 {id:"shares",cat:"fundamental",icon:"🏦",
  label:{default:"Insiders y Política con Accionistas"},
  short:"Propiedad insiders, recompras y short interest",
  desc:{default:"¿Quién tiene la piel en el juego? Los insiders (directivos y consejo) con alta propiedad de acciones toman mejores decisiones porque sufren directamente las consecuencias. Las recompras de acciones reducen el número de acciones, aumentando el EPS — pero solo crean valor si se hacen a un precio razonable. El short interest revela cuántos inversores profesionales apuestan activamente contra la empresa — un porcentaje alto es una señal de alerta que merece investigar aunque no siempre es correcta.",
   reit:"En REITs la alineación del gestor con el inversor es crítica. Buscar skin in the game real, no solo stock options.",
   financial:"Compensación diferida en acciones con horizonte largo alinea bien. Cuidado con bonus excesivos.",
   energy:"Fundadores o familias con alta participación toman decisiones más prudentes en ciclo bajo.",
   telecom:"Recompras de deuda suelen ser más value-additive que recompras de acciones en telecom.",
   industrial:"Fundadores-operadores con alta participación crean más valor que equipos profesionales sin skin in the game."},
  pos:{default:"Insiders propietarios de >5% del capital. CEO comprando en mercado abierto. Recompras a múltiplos razonables que reducen el share count. Short interest <5%.",
   reit:"Gestor con participación significativa. Recompras de acciones con descuento sobre NAV.",
   financial:"Directivos con horizonte de 5+ años y compensación diferida en acciones.",
   energy:"Familia fundadora o CEO con >10% del capital.",
   telecom:"Recompras solo en momentos de valoración atractiva. Dividendo estable.",
   industrial:"Fundador o familia con >20% — visión de largo plazo garantizada."},
  red:{default:"Ventas masivas de insiders en mercado abierto. Short interest >20% — señal de que profesionales ven problemas ocultos. Dilución acelerada de accionistas sin creación de valor.",
   reit:"Emisiones de acciones frecuentes con descuento sobre NAV.",
   financial:"Bonus masivos en años de pérdidas o bajo rendimiento.",
   energy:"Directivos vendiendo mientras hacen declaraciones optimistas.",
   telecom:"Short interest alto en empresa que dice estar bien.",
   industrial:"Recompras de acciones propias a múltiplos altos destruyendo capital."},
  watch:{default:"Ventas de insiders por diversificación planificada y declarada. Recompras moderadas. Short interest 5-15% — investigar la tesis bajista.",
   reit:"Emisiones de acciones en rango NAV — neutral si es accretive.",
   financial:"Compensación razonable ligada a métricas de largo plazo.",
   energy:"Ventas de insiders en precio alto del ciclo — puede ser prudencia.",
   telecom:"Short interest en rango medio — sector complejo que atrae shorts.",
   industrial:"Recompras en ciclo alto pueden indicar falta de inversión en crecimiento."},
  link:"https://finviz.com/quote.ashx?t=__TICKER__",link_label:"Insider activity en Finviz"},

 {id:"dividend",cat:"fundamental",icon:"💎",
  label:{default:"Dividendo e Historial"},
  short:"Yield, payout, sostenibilidad y años de crecimiento",
  desc:{default:"El dividendo es la prueba definitiva de la solidez del negocio: para pagar dividendos hace falta dinero real, no apuntes contables. Más importante que el yield actual es la sostenibilidad (¿puede seguir pagándolo?) y la trayectoria (¿lo ha subido consistentemente?). Las empresas que llevan 10+ años subiendo el dividendo sin interrupciones son llamadas aristócratas del dividendo — muy pocas pueden mantener esa disciplina sin tener un negocio excelente y generación de caja sólida.",
   reit:"Los REITs distribuyen obligatoriamente ≥90% del FFO. El AFFO payout es la clave: <85% para ser sostenible con crecimiento del dividendo.",
   financial:"El dividendo bancario está limitado por regulación. Los bancos que suben dividendo sistemáticamente son los que mejor gestionan el capital.",
   energy:"Dividendo muy cíclico en E&P. Midstream y utilities tienen dividendos más predecibles.",
   telecom:"Alta yield típica del sector. Lo importante es si el FCF post-capex lo cubre cómodamente.",
   industrial:"Empresas industriales con dividendo creciente 10+ años tienen modelo de negocio muy robusto."},
  pos:{default:"Yield 1.5-4% con payout <60%. Dividendo creciendo 5+ años consecutivos. Mantenido en 2008 y 2020. CAGR dividendo >5% anual.",
   reit:"AFFO payout <85%. Dividendo mantenido o subido en crisis 2008 y 2020.",
   financial:"Dividendo creciendo con el beneficio. Payout <50%.",
   energy:"Dividendo cubierto por FCF incluso en precio bajo del commodity.",
   telecom:"FCF yield post-capex >6% cubriendo el dividendo con margen.",
   industrial:"Aristócrata del dividendo con >10 años de subidas consecutivas."},
  red:{default:"Payout >80% en negocio que no crece. Recorte de dividendo en los últimos 5 años. Yield >8% sin crecimiento — posible trampa de valor.",
   reit:"AFFO payout >100% — dividendo financiado con deuda o emisiones de acciones.",
   financial:"Dividendo congelado o recortado por presión regulatoria.",
   energy:"Dividendo financiado con deuda en ciclo bajo.",
   telecom:"Payout >90% con deuda alta y capex creciente.",
   industrial:"Primer recorte de dividendo en ciclo bajo después de años de subidas."},
  watch:{default:"Yield >5% sin historial de recortes — analizar sostenibilidad cuidadosamente. Payout 60-80% — sostenible pero sin margen.",
   reit:"AFFO payout 85-95% — cualquier contracción del FFO amenaza el dividendo.",
   financial:"Dividendo plano varios años — ¿problema o conservadurismo prudente?",
   energy:"Dividendo alto en ciclo alto — ¿sostenible cuando baje el commodity?",
   telecom:"Dividendo muy alto con deuda alta — evaluar prioridad de uso del FCF.",
   industrial:"Yield alto inusual para el sector — investigar causa."},
  link:"https://stockanalysis.com/stocks/__TICKER__/dividend/",link_label:"Historial de dividendos"},

 {id:"shares_out",cat:"fundamental",icon:"📋",
  label:{default:"Acciones en Circulación"},
  short:"Cuántas acciones existen y si el número crece o baja",
  desc:{default:"El número de acciones en circulación (shares outstanding) determina cuánto vale cada acción de la empresa. Si la empresa emite más acciones (dilución), cada acción representa una porción menor del negocio — el beneficio por acción (EPS) se diluye. Si recompra acciones (buybacks), cada acción representa una porción mayor — el EPS sube. Un número de acciones decreciente año a año es una señal muy positiva: la empresa devuelve capital a sus accionistas de la forma más eficiente posible."},
  pos:{default:"Número de acciones estable o decreciendo año a año (recompras activas). Tasa de dilución <1% anual. Share count cayendo >2% anual indica programa de recompras agresivo y creador de valor."},
  red:{default:"Dilución acelerada: emisión de nuevas acciones que diluye al accionista sin generar valor equivalente. Acciones creciendo >5% anual vía stock options o adquisiciones. Empresas que emiten acciones para pagar dividendos — señal muy negativa."},
  watch:{default:"Dilución moderada (1-3% anual) por stock options y RSUs — común en tech. Evaluar si la retención de talento justifica el coste de dilución."},
  link:"https://stockanalysis.com/stocks/__TICKER__/financials/?p=quarterly",link_label:"Ver evolución de acciones"},

 {id:"debt_level",cat:"fundamental",icon:"🏗️",
  label:{default:"Nivel de Deuda",reit:"LTV y Deuda",financial:"Capital / CET1",energy:"Deuda vs Reservas"},
  short:"¿Cuánta deuda tiene y puede pagarla cómodamente?",
  desc:{default:"La deuda es una herramienta: bien utilizada amplifica los retornos, mal utilizada destruye la empresa. La clave es la deuda en relación a la capacidad de generar caja. Deuda Neta / EBITDA es el ratio más usado: indica cuántos años de generación operativa necesitas para saldar toda la deuda. Por debajo de 2x es cómodo, entre 2-4x es manejable, por encima de 5x empieza a ser peligroso. Empresas sin deuda (o con caja neta) pueden sobrevivir cualquier crisis y comprar competidores en mínimos.",
   reit:"Los REITs usan deuda por definición (financian inmuebles). El LTV (Loan-to-Value) mide cuánto de los activos está financiado con deuda. <40% es conservador, >60% es preocupante en un entorno de tipos altos.",
   financial:"Los bancos son el negocio del apalancamiento. El CET1 (capital regulatorio de máxima calidad) mide la solidez: >13% es confortable, <10% es zona de alerta regulatoria.",
   energy:"En E&P la deuda es letal en ciclos bajos. Deuda/EBITDA <2x en precio medio del ciclo es lo prudente. Midstream puede apalancarse más por sus contratos take-or-pay."},
  pos:{default:"Deuda Neta/EBITDA <2x. Current ratio >1.5x (puede pagar deudas a corto plazo). Empresa con caja neta (sin deuda) — la más segura. Vencimientos de deuda escalonados sin concentración próxima.",
   reit:"LTV <40%. Deuda mayoritariamente a tipo fijo. Vencimientos distribuidos >5 años.",
   financial:"CET1 >13%. NPL ratio <2%. Cobertura de provisiones >120%.",
   energy:"Deuda/EBITDA <2.5x en precio medio. Cobertura de intereses >5x."},
  red:{default:"Deuda Neta/EBITDA >5x. Vencimientos próximos sin FCF suficiente para refinanciar. Covenants cerca de romperse. Empresa que paga deuda con más deuda.",
   reit:"LTV >60% con tipos subiendo — doble presión. Refinanciaciones a tipos muy superiores.",
   financial:"CET1 <10%. NPLs creciendo sin provisiones suficientes.",
   energy:"Deuda/EBITDA >4x en precio bajo del commodity — riesgo de insolvencia."},
  watch:{default:"Deuda alta pero con FCF suficiente y calendario de vencimientos manejable. Vigilar el coste medio de la deuda y el impacto de subidas de tipos.",
   reit:"LTV 40-55% — manejable pero sensible a tipos.",
   financial:"Capital en zona regulatoria holgada pero sin margen para errores.",
   energy:"Deuda cubierta por hedging del precio — vigilar cuando expiren los hedges."},
  link:"https://stockanalysis.com/stocks/__TICKER__/financials/balance-sheet/",link_label:"Ver deuda en Balance Sheet"},

 {id:"buybacks",cat:"fundamental",icon:"🔄",
  label:{default:"Recompra de Acciones"},
  short:"¿Destruye o crea acciones? El voto de confianza del management",
  desc:{default:"Las recompras de acciones (share buybacks) son la forma más eficiente de devolver capital a los accionistas cuando la empresa cotiza a un precio razonable. Al recomprar acciones la empresa reduce el total en circulación, lo que hace que cada acción restante represente una porción mayor del negocio — el beneficio por acción (EPS) sube mecánicamente. Warren Buffett considera las recompras a precios razonables como la señal más clara de que el management confía en el negocio. Pero cuidado: recomprar acciones sobrevaloradas destruye capital igual que una mala adquisición."},
  pos:{default:"Programa de recompras activo y consistente año a año. Share count cayendo >2% anual. Recompras realizadas históricamente en momentos de valoración atractiva (no solo en máximos). FCF suficiente para financiar recompras sin aumentar deuda."},
  red:{default:"Empresa que emite acciones (dilución) mientras promete crear valor para el accionista. Recompras masivas financiadas con deuda a múltiplos muy altos. Share count creciendo >3% anual por stock options sin compensar con buybacks."},
  watch:{default:"Recompras intermitentes sin política clara. Programa anunciado pero ejecutado parcialmente. Empresa que pausa recompras cuando el negocio se complica — puede ser prudencia o señal de problemas."},
  link:"https://stockanalysis.com/stocks/__TICKER__/financials/cash-flow-statement/",link_label:"Ver recompras en Cash Flow"},

 {id:"sector_metric",cat:"fundamental",icon:"🎯",
  label:{default:"Métrica Clave del Sector",reit:"NOI / Ocupación / LTV",financial:"NIM / NPL / CET1",energy:"Reservas / Coste extracción",telecom:"ARPU / Churn / 5G",healthcare:"Pipeline / FDA",industrial:"Backlog / Book-to-bill"},
  short:"La métrica diferenciadora que concentra el 80% de la información",
  desc:{default:"Cada sector tiene una o dos métricas que concentran el 80% de la información relevante. En tecnología SaaS el NRR (Net Revenue Retention) indica si los clientes gastan más cada año — >120% es excepcional. En retail, el same-store-sales mide el crecimiento orgánico. En semiconductores, el book-to-bill anticipa 6 meses de demanda. En seguros, el Combined Ratio indica si el negocio de suscripción es rentable. Conocer y monitorizar la métrica clave de cada sector es lo que distingue a un inversor generalista de uno especialista.",
   reit:"Tasa de ocupación (>95% excelente), NOI same-store, coste de capital vs yield de adquisiciones, LTV del portfolio.",
   financial:"NIM (Net Interest Margin), NPL ratio y cobertura, CET1, ratio coste/ingresos (efficiency ratio).",
   energy:"Coste de extracción (breakeven $/barril), reservas probadas 1P y 2P, vida de reservas, tasa de reposición.",
   telecom:"ARPU (Average Revenue Per User), churn mensual, penetración fibra, cobertura 5G y velocidad de despliegue.",
   healthcare:"Pipeline por fase (I/II/III), probabilidad histórica de aprobación, life cycle management, exclusividades de patente.",
   industrial:"Backlog (pedidos pendientes), book-to-bill ratio (>1 = demanda > oferta), pricing en renovación de contratos."},
  pos:{default:"La métrica clave del sector en tendencia positiva y superior a los principales competidores.",
   reit:"Ocupación >95%, NOI same-store +3%+, LTV <40%.",
   financial:"NIM estable o subiendo. NPLs <2% bien cubiertos. CET1 >13%.",
   energy:"Coste extracción <$40/barril. Reservas con vida >12 años. Reposición >100%.",
   telecom:"ARPU creciendo. Churn <1.5% mensual. Liderando cobertura 5G en su mercado.",
   healthcare:"3+ productos en Fase III. Patentes vigentes 5+ años en revenue principal.",
   industrial:"Backlog >1 año de ventas. Book-to-bill >1.1. Pricing en renovaciones +5%+."},
  red:{default:"La métrica clave del sector deteriorándose de forma acelerada y sin explicación temporal.",
   reit:"Ocupación <90%. NOI negativo. LTV >60% con tipos subiendo.",
   financial:"NIM comprimido + NPLs crecientes simultáneamente — efecto tijera destructivo.",
   energy:"Coste extracción >$60/barril. Reservas con vida <8 años.",
   telecom:"ARPU cayendo + churn acelerándose — pérdida sistemática de posición.",
   healthcare:"Pipeline vacío. Patentes expirando sin sucesor. Fracasos en Fase III consecutivos.",
   industrial:"Backlog cayendo + cancelaciones + presión de precios simultánea."},
  watch:{default:"La métrica clave en zona neutral. Monitorizar en próximos 2 trimestres de resultados.",
   reit:"Ocupación 90-95%. NOI flat. LTV en rango medio.",
   financial:"NIM bajo presión por ciclo de tipos pero NPLs controlados.",
   energy:"Coste extracción $40-55/barril — rentable pero sensible al precio.",
   telecom:"ARPU flat con churn estable — madurez sin crecimiento visible.",
   healthcare:"Fase II con resultados ambiguos — alta incertidumbre binaria.",
   industrial:"Book-to-bill en 1.0 — equilibrio exacto entre demanda y capacidad."},
  link:"https://stockanalysis.com/stocks/__TICKER__/",link_label:"Estadísticas del sector"},

 // ───────────────── TECHNICAL (3) ─────────────────────────────
 {id:"ma200",cat:"technical",icon:"〰️",
  label:{default:"Media Móvil 200 sesiones"},
  short:"Proximidad del precio a la MA200 — la línea más vigilada por institucionales",
  desc:{default:"La MA200 (media móvil de 200 sesiones, ~10 meses de trading) es la línea técnica más seguida por gestores institucionales y fondos de todo el mundo. Cuando el precio cotiza por encima de la MA200, la tendencia estructural es alcista y el mercado está en modo 'riesgo activado'. Por debajo de la MA200, la tendencia es bajista y los institucionales tienden a reducir exposición. Los niveles más relevantes: +5-10% sobre MA200 es sano sin sobreextensión; ±2% es la zona de decisión donde el precio puede rebotar o romper definitivamente; -10% o más señala tendencia bajista confirmada. El 'golden cross' (MA50 cruza MA200 al alza) ha generado retornos medios del +15% en los 12 meses siguientes históricamente."},
  pos:{default:"Precio >5% sobre MA200 con MA200 en pendiente positiva. Separación de +5 a +15% es la zona ideal: suficientemente alcista sin sobreextensión. MA50 > MA200 (golden cross activo). El precio lleva varios meses sobre la MA200 sin haber retrocedido — fuerza institucional continuada."},
  red:{default:"Precio >10% bajo MA200 (death cross confirmado). MA200 con pendiente negativa (tendencia bajista estructural). El precio rebotó hacia la MA200 pero fue rechazado — señal de que los vendedores superan a los compradores en ese nivel de precio."},
  watch:{default:"Precio en zona ±5% de la MA200. Esta es la zona de máxima incertidumbre técnica: el precio puede rebotar al alza (soporte) o romper a la baja. El volumen en el cruce determina la convicción del movimiento. Esperar confirmación en el cierre semanal."},
  link:"https://finviz.com/quote.ashx?t=__TICKER__",link_label:"MA200 en Finviz"},

 {id:"trend",cat:"technical",icon:"📐",
  label:{default:"Tendencia y Medias Móviles"},
  short:"Dirección del precio, MA50/200 y posición en rango 52 semanas",
  desc:{default:"La tendencia es el contexto técnico del precio. No predice el futuro pero indica el sentimiento del mercado y los niveles donde han tomado decisiones miles de inversores. La MA200 (media de 200 sesiones) es la línea más seguida: cotizar por encima indica tendencia alcista, por debajo bajista. El golden cross (MA50 cruza MA200 al alza) ha sido históricamente una señal alcista fiable. La posición en el rango de 52 semanas dice si estás comprando cerca de máximos o mínimos recientes."},
  pos:{default:"Precio >MA200 con MA200 en pendiente positiva. MA50 > MA200 (golden cross). En rango alto del año (>60%) pero sin sobreextensión. Precio haciendo máximos crecientes."},
  red:{default:"Precio <MA200 con MA200 en pendiente negativa (tendencia bajista confirmada). Death cross reciente. En mínimos del año (<30%) sin señales de capitulación ni cambio de tendencia."},
  watch:{default:"Precio cerca de MA200 (±5%) — zona de decisión. Esperar confirmación de rotura en un sentido antes de actuar. En rango medio del año (30-60%)."},
  link:"https://finviz.com/quote.ashx?t=__TICKER__",link_label:"Gráfico técnico en Finviz"},

 {id:"rsi",cat:"technical",icon:"🚀",
  label:{default:"Momentum y RSI"},
  short:"RSI(14), cambio anual y fuerza relativa vs mercado",
  desc:{default:"El momentum mide si el precio gana o pierde velocidad. El RSI (Relative Strength Index) oscila entre 0 y 100: <30 = sobreventa (posible rebote), >70 = sobrecompra (posible corrección). Pero lo más valioso es la fuerza relativa: ¿lo hace mejor o peor que el índice de referencia? Una empresa que sube menos que el mercado en rally y cae más en correcciones tiene momentum relativo negativo — señal de alerta aunque el precio suba en términos absolutos."},
  pos:{default:"RSI entre 40-65 (zona sana sin extremos). Fuerza relativa positiva vs índice en 12 meses. Precio haciendo máximos crecientes con retrocesos superficiales (<38% de Fibonacci)."},
  red:{default:"RSI >75 en contexto de mercado débil. Fuerza relativa negativa persistente (-15%+ underperformance en 12 meses). Divergencia bajista: precio en máximos pero RSI en mínimos decrecientes."},
  watch:{default:"RSI en zona extrema (>70 o <30) — buscar divergencias para confirmar señal. Fuerza relativa neutral. RSI en 50 indica equilibrio sin dirección clara."},
  link:"https://finviz.com/quote.ashx?t=__TICKER__",link_label:"RSI y momentum en Finviz"},

 {id:"support",cat:"technical",icon:"🧱",
  label:{default:"Soporte, Resistencia y Volumen"},
  short:"Zonas clave de precio y convicción del movimiento",
  desc:{default:"Los soportes son zonas donde históricamente aparece demanda (compradores). Las resistencias donde aparece oferta (vendedores). Funcionan porque el comportamiento humano es repetitivo: las órdenes stops e institucionales se acumulan en niveles redondos y en máximos/mínimos previos. El volumen confirma los movimientos: una ruptura de resistencia con volumen alto es señal fuerte y creíble; con volumen bajo es débil y probablemente falsa. El volumen creciente en días alcistas y decreciente en retrocesos es el patrón más saludable."},
  pos:{default:"Precio apoyado en soporte fuerte con volumen creciente en rebotes. Ruptura de resistencia histórica con volumen >150% de la media. Volumen alcista > volumen bajista en las últimas 4 semanas."},
  red:{default:"Rotura de soporte importante con volumen alto (señal bajista confirmada). Volumen decreciente en días alcistas — subida sin convicción institucional. Precio en resistencia fuerte sin momentum suficiente."},
  watch:{default:"Entre soporte y resistencia sin momentum claro — zona de indecisión. Esperar definición. Volumen plano sin divergencias claras."},
  link:"https://finviz.com/quote.ashx?t=__TICKER__",link_label:"Niveles técnicos en Finviz"},

 // ───────────────── MACRO (3) ──────────────────────────────────
 {id:"rates",cat:"macro",icon:"🏦",
  label:{default:"Tipos de Interés e Inflación"},
  short:"El coste del dinero y su impacto en valoración y márgenes",
  desc:{default:"Los tipos de interés son la gravedad del mercado: cuando suben, todo cae (especialmente los activos de larga duración como acciones de crecimiento). Los tipos afectan de tres formas: directamente (coste de la deuda de la empresa), en valoración (el descuento de flujos futuros sube = múltiplos caen) y en competencia (bonos y depósitos se vuelven más atractivos vs acciones). La inflación importa porque reduce el poder adquisitivo de los flujos futuros, pero también indica si la empresa tiene pricing power para trasladar costes al cliente."},
  pos:{default:"Tipos bajos o en ciclo de bajada. Inflación controlada <3%. Empresa con deuda a tipo fijo. Alta capacidad de pricing power para trasladar inflación a precios."},
  red:{default:"Tipos subiendo agresivamente. Empresa muy endeudada a tipo variable. Inflación >5% sin capacidad de repercutirla al cliente — márgenes comprometidos."},
  watch:{default:"Tipos estables en zona neutral (2-4%). Inflación entre 2-4%. Vigilar guidance de la empresa sobre impacto en costes del siguiente trimestre."},
  link:"https://fred.stlouisfed.org/series/FEDFUNDS",link_label:"Tipos de interés FRED"},

 {id:"cycle",cat:"macro",icon:"🌍",
  label:{default:"Ciclo Económico y Consenso"},
  short:"Fase del ciclo, Beta y recomendación de analistas",
  desc:{default:"No todas las empresas reaccionan igual al ciclo económico. Cíclicas (autos, materiales, lujo) se disparan en expansión y se hunden en recesión. Defensivas (farmacia, utilities, consumo básico) aguantan mejor en recesión pero se quedan atrás en expansión. La beta cuantifica esa sensibilidad: >1 amplifica los movimientos del mercado, <1 los amortigua. El consenso de analistas (1=Compra Fuerte, 5=Venta) es una señal de sentimiento institucional — útil como contexto pero no como verdad absoluta."},
  pos:{default:"Beta <0.8 en entorno recesivo (protección). Beta >1.2 en inicio de expansión. Consenso analistas Compra (1.0–2.0) con precio objetivo >20% sobre precio actual."},
  red:{default:"Beta alta en inicio de recesión. Consenso en zona Venta (>4.0). Precio objetivo medio de analistas por debajo del precio actual — señal muy negativa."},
  watch:{default:"Beta entre 0.8-1.2 (neutral). Consenso en zona Neutral (2.5-3.5). Vigilar revisiones de estimaciones — si bajan consecutivamente es señal negativa clave."},
  link:"https://finviz.com/quote.ashx?t=__TICKER__",link_label:"Consenso analistas en Finviz"},

 {id:"currency",cat:"macro",icon:"💱",
  label:{default:"Riesgo Divisa"},
  short:"Exposición a divisas y efecto en resultados consolidados",
  desc:{default:"Cuando inviertes en una empresa global, el tipo de cambio puede ser un riesgo silencioso: una empresa europea que vende en EE.UU. pierde márgenes si el dólar se debilita, aunque el negocio vaya perfectamente. El riesgo divisa tiene dos capas: el riesgo de transacción (vende y cobra en divisa extranjera) y el de traslación (consolida filiales en divisa extranjera). Las empresas con ingresos bien diversificados geográficamente tienen un hedge natural. La política de cobertura de divisa se detalla en el informe anual."},
  pos:{default:"Empresa en USD. Ingresos y costes en la misma divisa (hedge natural). Política activa de cobertura documentada. Exposición a divisas fuertes y estables."},
  red:{default:"Empresa con >50% de costes en divisa fuerte y ventas en divisa débil (Argentina, Turquía). Sin política de cobertura en empresa muy expuesta a tipo de cambio."},
  watch:{default:"Exposición moderada a divisas volátiles con cobertura parcial. Vigilar el guidance de la empresa sobre impacto divisa en resultados futuros."},
  link:"https://fred.stlouisfed.org/series/DEXUSEU",link_label:"EUR/USD en FRED"},

 // ───────────────── QUALITY / CUALITATIVO (4) ─────────────────
 // Estos 4 ítems requieren juicio del analista — no hay API que los sustituya.
 // Las descripciones guían el análisis cualitativo riguroso.

 {id:"moat",cat:"quality",icon:"🏰",
  label:{default:"Ventaja Competitiva (Moat)"},
  short:"¿Por qué los clientes no pueden irse? La barrera duradera",
  desc:{default:"Warren Buffett popularizó el concepto de moat (foso): la ventaja competitiva que protege el negocio durante años. Hay 5 tipos: (1) Efectos de red — el producto vale más cuanto más gente lo usa (Visa, Meta, Airbnb). (2) Costes de cambio — cambiar al competidor es caro o doloroso (SAP, Salesforce, Adobe). (3) Activos intangibles — patentes, marcas, licencias (LVMH, Moody's, J&J). (4) Ventaja de coste — producen más barato estructuralmente (Walmart, Ryanair). (5) Eficiencia de escala — mercado tan pequeño que solo hay espacio para uno rentable. Sin moat, cualquier rentabilidad extraordinaria será eliminada por la competencia en 3-5 años."},
  pos:{default:"Ventaja competitiva claramente identificable. Pricing power demostrado: sube precios sin perder cuota. Márgenes estables o crecientes en entorno competitivo. Retención de clientes >90% en negocios de suscripción. Morningstar otorga Wide Moat rating."},
  red:{default:"Commoditización del producto — compite solo en precio. Cuota de mercado perdiendo sistemáticamente. Márgenes comprimiéndose mientras la competencia gana posición. Sin ninguna barrera de entrada identificable."},
  watch:{default:"Moat presente pero bajo ataque de nuevos competidores o disrupción tecnológica. ¿Es el negocio defensible ante la IA, la automatización o los nuevos entrantes con menor coste?"},
  link:"https://www.morningstar.com/stocks/__TICKER__/quote",link_label:"Economic Moat en Morningstar"},

 {id:"management",cat:"quality",icon:"👔",
  label:{default:"Equipo Directivo"},
  short:"Historial, alineación de intereses y cultura de asignación de capital",
  desc:{default:"Los mejores inversores afirman que la calidad directiva es el factor que más frecuentemente infravaloran los modelos. Un CEO excelente en un negocio mediocre generalmente supera a un CEO mediocre en un gran negocio. Señales positivas: largo historial en el sector, alineación de intereses real (poseen acciones propias, no solo opciones), comunicación transparente sobre errores y planes, guidance conservador que se supera, y cultura de asignación eficiente del capital — no adquirir por crecer sino por crear valor. Los Proxy Filings (DEF 14A) en la SEC revelan la remuneración y la estructura de incentivos."},
  pos:{default:"CEO con >8 años de track record documentado en el sector. Alta propiedad de acciones compradas en mercado abierto. Guidance conservador que sistemáticamente se supera. Comunicación directa sobre errores. Reconocido por peers. Remuneración ligada a creación de valor real para el accionista."},
  red:{default:"Alta rotación de CFO y C-suite. Remuneración excesiva desconectada de resultados. Promesas sistemáticamente incumplidas. CEO que evita preguntas difíciles de analistas. Historial de adquisiciones a precios excesivos. Cambios contables frecuentes sin justificación clara."},
  watch:{default:"Cambio de CEO en empresa de alta calidad — el riesgo de transición es real aunque el sucesor sea competente. Nuevos directivos desde fuera del sector cambiando la cultura establecida."},
  link:"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=__TICKER__&type=DEF+14A",link_label:"Proxy Filing remuneración (SEC)"},

 {id:"governance",cat:"quality",icon:"🏛️",
  label:{default:"Gobierno Corporativo"},
  short:"¿Los accionistas minoritarios están protegados?",
  desc:{default:"El gobierno corporativo determina si la empresa está gestionada en beneficio de todos los accionistas o principalmente del accionista de control y los directivos. Las señales de buena gobernanza: consejo con mayoría de independientes de calidad, auditor externo Big 4 sin conflictos, política de remuneración ligada a KPIs de largo plazo, sin estructuras de doble voto que protejan insiders a costa del minoritario. Las empresas con mala gobernanza pueden ser excelentes negocios cuyo valor nunca llega al inversor minoritario — el análisis financiero positivo no sirve de nada si el management extrae valor para sí mismo."},
  pos:{default:"Consejo con mayoría de independientes de calidad contrastada. Auditor Big 4 sin conflictos. Política de remuneración ligada a creación de valor. Sin estructura de acciones de doble voto. Comunicación proactiva con accionistas minoritarios. Puntuación alta en índices ESG de gobernanza."},
  red:{default:"Accionista de control que ha diluido al minoritario en el pasado. Auditor de segunda fila o con conflictos. Consejo con mayoría de directivos sin independencia real. Transacciones entre partes vinculadas frecuentes. Sin política de dividendos ni recompras clara y predecible."},
  watch:{default:"Transición de empresa familiar a gestión profesional — puede mejorar o empeorar la gobernanza. Nuevas regulaciones ESG que impactan los requisitos de reporting."},
  link:"https://efts.sec.gov/LATEST/search-index?q=%22__TICKER__%22&forms=8-K&dateRange=custom&startdt=2024-01-01",link_label:"Filings recientes en SEC EDGAR"},

 {id:"regulatory",cat:"quality",icon:"⚖️",
  label:{default:"Riesgo Regulatorio"},
  short:"Marco legal, regulación y riesgo político del sector",
  desc:{default:"La regulación es el campo de juego: puede proteger el negocio (barreras de entrada) o destruirlo (multas, cambios de ley, expropiaciones). Los sectores más expuestos: utilities (tarifas reguladas), farmacéutico (aprobaciones FDA/EMA), financiero (capital requerido), tecnológico (antimonopolio, privacidad) y energético (emisiones, permisos). Antes de invertir, entender quién regula el sector y qué incentivos tienen los reguladores es tan importante como analizar el balance. Los filings 8-K en la SEC reportan eventos regulatorios materiales en tiempo real."},
  pos:{default:"Entorno regulatorio estable y predecible con historial de decisiones consistentes. Regulación que actúa como barrera de entrada (licencias difíciles de replicar). Sector en proceso de desregulación favorable. Empresa con excelentes relaciones históricas con reguladores."},
  red:{default:"Empresa bajo investigación regulatoria o antimonopolio activa. Sector en riesgo de legislación que impacta directamente el modelo de negocio. Dependencia de un único contrato o licencia gubernamental con riesgo de no renovación. Historial de multas regulatorias recurrentes."},
  watch:{default:"Cambio regulatorio potencial visible (elecciones, nueva legislación en proceso). Nuevas directivas europeas o americanas en consulta pública que afectan al sector."},
  link:"https://efts.sec.gov/LATEST/search-index?q=%22__TICKER__%22&forms=8-K",link_label:"Eventos regulatorios en SEC"},

 // ── RISK METRICS (auto-filled desde worker v5.1) ─────────────
 {id:"sharpe",cat:"technical",icon:"📉",
  label:{default:"Sharpe · Sortino · Volatilidad"},
  short:"Retorno ajustado a riesgo, volatilidad anualizada y máxima caída",
  desc:{default:"El Sharpe Ratio mide la rentabilidad obtenida por unidad de riesgo asumido, usando la tasa libre de riesgo real (Fed Funds via FRED) como referencia. Sharpe >1 es bueno, >2 es excelente, <0 significa que no compensas el riesgo asumido. El Sortino es más preciso: solo penaliza la volatilidad a la baja, ignorando los días positivos. La volatilidad anualizada cuantifica la variabilidad del precio: <15% defensiva, 15-25% moderada, >30% agresiva. El Max Drawdown registra la peor caída pico→valle del último año — el dolor real que habrías vivido."},
  pos:{default:"Sharpe >1.5 con Sortino >2. Volatilidad <20% (activo defensivo de calidad). Max Drawdown <15%. La divergencia positiva Sortino > Sharpe indica que las caídas son contenidas y los rallies son amplios — patrón de las mejores acciones de calidad."},
  red:{default:"Sharpe <0 (el activo no compensa ni el riesgo ni la tasa libre de riesgo). Volatilidad >40% sin retorno proporcional — gambling, no inversión. Max Drawdown >40%: habrías perdido casi la mitad del capital en el peor momento del año."},
  watch:{default:"Sharpe entre 0.5-1: retorno positivo pero ajuste a riesgo moderado. Volatilidad 20-30%. Max Drawdown 15-30%. Evaluar si el riesgo asumido está compensado por la expectativa de retorno futura."},
  link:"https://finviz.com/quote.ashx?t=__TICKER__",link_label:"Volatilidad en Finviz"},

 {id:"momentum",cat:"technical",icon:"⚡",
  label:{default:"Momentum Multi-período (1M · 3M · 6M · 12M)"},
  short:"Retorno del precio en 4 horizontes temporales usando precios reales",
  desc:{default:"El momentum es uno de los factores con mayor respaldo empírico en finanzas: las acciones que han subido más en 6-12 meses tienden a seguir superando al mercado en los meses siguientes (efecto momentum, documentado desde Jegadeesh & Titman 1993). Los 4 períodos complementan: 12M capta la tendencia estructural, 6M la tendencia intermedia, 3M el impulso reciente, 1M la aceleración o agotamiento inmediato. La consistencia entre períodos es la clave: momentum positivo en todos indica acción en tendencia sana. Divergencia (buen 12M pero 1M negativo) puede señalar agotamiento."},
  pos:{default:"Momentum positivo en los 4 períodos con aceleración (retornos crecientes a medida que acortas el horizonte: 12M>6M>3M>1M en términos de rendimiento anualizado). Outperformance consistente vs S&P 500 en períodos largos."},
  red:{default:"Momentum negativo en 12M con pérdida acelerando en períodos cortos (1M y 3M peores que 6M y 12M). Underperformance del -20%+ en 12M vs mercado. Divergencia bajista: momentum 12M positivo pero 1M y 3M profundamente negativos."},
  watch:{default:"Momentum mixto: buenos períodos largos pero cortos negativos (posible consolidación o giro). Momentum positivo pero moderado en todos los períodos — tendencia sana sin sobreextensión."},
  link:"https://finviz.com/quote.ashx?t=__TICKER__",link_label:"Momentum en Finviz"},
];

const ACADEMIA = [
  {id:'per',cat:'fundamental',icon:'📊',
   title:'P/E Ratio (Precio/Beneficio)',
   body:`<p>El ratio Precio/Beneficio (P/E) es el indicador de valoración más usado en bolsa. Divide el precio de la acción entre el beneficio por acción (EPS) anual.</p>
   <h4>¿Qué significa?</h4>
   <p>Si una acción cotiza a 100€ y el BPA es 5€, el P/E es 20. Significa que pagas 20 años de beneficios actuales por esa acción. O dicho de otra forma: el mercado espera que la empresa valga eso.</p>
   <h4>¿Cuándo es caro y cuándo barato?</h4>
   <ul><li><strong>P/E &lt; 15:</strong> Puede indicar valor (o problemas estructurales)</li><li><strong>P/E 15-25:</strong> Rango razonable para empresas maduras</li><li><strong>P/E &gt; 35:</strong> Requiere justificación por crecimiento alto</li></ul>
   <h4>Trampa del P/E</h4>
   <p>Un P/E bajo puede ser una trampa si el beneficio va a caer. Siempre analiza el P/E forward (con beneficios futuros estimados) y su evolución histórica.</p>`
  },
  {id:'moat',cat:'quality',icon:'🏰',
   title:'Moat: El Foso Competitivo',
   body:`<p>Término popularizado por Warren Buffett. Un "moat" (foso) es la ventaja competitiva duradera que protege los beneficios de una empresa de la competencia.</p>
   <h4>Los 5 tipos de moat</h4>
   <ul><li><strong>Efectos de red:</strong> Cuantos más usuarios, más valioso (Visa, Meta, Airbnb)</li><li><strong>Costes de cambio:</strong> El cliente no puede irse sin un coste alto (Oracle, Salesforce, SAP)</li><li><strong>Ventaja de costes:</strong> Producir más barato de forma estructural (Amazon, Costco)</li><li><strong>Activos intangibles:</strong> Marcas, patentes, licencias (Coca-Cola, Pfizer)</li><li><strong>Escala eficiente:</strong> Monopolio natural en mercado pequeño (utilities reguladas)</li></ul>
   <h4>¿Cómo detectarlo?</h4>
   <p>Busca márgenes altos y estables durante 10+ años, ROIC >15% sostenido, y clientes que repiten sin buscar alternativas.</p>`
  },
  {id:'fcf',cat:'fundamental',icon:'💵',
   title:'Free Cash Flow: La Métrica Real',
   body:`<p>El beneficio neto puede manipularse contablemente. El Free Cash Flow (FCF) es mucho más difícil de falsificar: es el dinero real que entra en caja.</p>
   <h4>Cálculo simplificado</h4>
   <p>FCF = Flujo de caja operativo − Capex de mantenimiento</p>
   <h4>¿Por qué es más fiable que el beneficio?</h4>
   <ul><li>No incluye amortizaciones artificiales</li><li>Refleja el ciclo real de cobros y pagos</li><li>Es lo que realmente puede distribuirse como dividendo o recompra</li></ul>
   <h4>FCF Yield</h4>
   <p>FCF Yield = FCF / Precio de mercado. Si es >5%, la empresa genera mucha caja por lo que pagas. Benchmark excelente para empresas maduras.</p>`
  },
  {id:'dcf',cat:'fundamental',icon:'🧮',
   title:'Valoración por DCF',
   body:`<p>El DCF (Discounted Cash Flow) es el método de valoración teóricamente más correcto: el valor de una empresa es la suma de todos sus flujos de caja futuros, descontados al presente.</p>
   <h4>El problema del DCF</h4>
   <p>Pequeños cambios en las hipótesis (tasa de descuento, crecimiento terminal) generan grandes variaciones en el resultado. Por eso se llama "garbage in, garbage out".</p>
   <h4>Cómo usarlo bien</h4>
   <ul><li>Usa rangos de escenarios, no un solo número</li><li>Trabaja hacia atrás: ¿qué crecimiento implica el precio actual?</li><li>Compara con múltiplos de mercado para sanity check</li></ul>
   <h4>Fórmula de Graham simplificada</h4>
   <p>V = EPS × (8.5 + 2g) donde g es el crecimiento esperado en %. Esta app usa esta fórmula como punto de partida por su simplicidad.</p>`
  },
  {id:'dividend',cat:'fundamental',icon:'🎁',
   title:'El Dividendo: Señal de Calidad',
   body:`<p>Un dividendo creciente de forma ininterrumpida durante décadas es la prueba más exigente de la calidad de un negocio. Pagar y aumentar el dividendo en recesiones requiere un modelo de negocio excepcionalmente robusto.</p>
   <h4>Clasificación de dividendos</h4>
   <ul><li><strong>Dividend King:</strong> 50+ años de crecimiento consecutivo (P&G, Coca-Cola, Johnson & Johnson)</li><li><strong>Dividend Aristocrat:</strong> 25+ años (S&P 500)</li><li><strong>Dividend Achiever:</strong> 10+ años</li></ul>
   <h4>La trampa del alto dividendo</h4>
   <p>Un yield >7% en empresa no REIT suele ser señal de peligro: el mercado ya descuenta un recorte. Siempre verifica si el dividendo está cubierto por el FCF (payout FCF <70% es saludable).</p>`
  },
  {id:'reit_basics',cat:'fundamental',icon:'🏢',
   title:'Cómo Analizar un REIT',
   body:`<p>Los REITs (Real Estate Investment Trusts) tienen una contabilidad especial. El beneficio neto no es la métrica relevante por las altas amortizaciones inmobiliarias.</p>
   <h4>Las métricas clave</h4>
   <ul><li><strong>FFO:</strong> Beneficio + Amortizaciones − Plusvalías/Minusvalías inmobiliarias</li><li><strong>AFFO:</strong> FFO − Capex de mantenimiento. Es el "verdadero" FCF de un REIT</li><li><strong>P/FFO:</strong> El equivalente al P/E. Media histórica: 15-18x</li><li><strong>LTV:</strong> Deuda / Valor activos. <45% es conservador</li></ul>
   <h4>Tipos de REIT</h4>
   <p>Logístico (PLD), Residencial (AVB, EQR), Oficinas (VNO), Retail (O, SPG), Salud (WELL), Torres (AMT, CCI), Data Centers (EQIX).</p>
   <h4>Sensibilidad a tipos</h4>
   <p>Los REITs son muy sensibles a los tipos de interés: tipos altos comprimen los múltiplos y encarecen la refinanciación. Son mejores inversiones en entorno de tipos bajando.</p>`
  },
  {id:'technical_basics',cat:'technical',icon:'📐',
   title:'Análisis Técnico Esencial',
   body:`<p>El análisis técnico estudia el comportamiento del precio y volumen para identificar patrones y tendencias. No predice el futuro, pero ofrece contexto y niveles de referencia.</p>
   <h4>Los 3 conceptos básicos</h4>
   <ul><li><strong>Tendencia:</strong> Alcista (máx y mín crecientes), bajista, o lateral</li><li><strong>Soporte/Resistencia:</strong> Niveles donde el precio tiende a detenerse</li><li><strong>Volumen:</strong> Confirma o niega el movimiento del precio</li></ul>
   <h4>El rol del AT en el largo plazo</h4>
   <p>Para el inversor de largo plazo, el AT no se usa para timing preciso sino para: (1) evitar comprar en sobrecompra extrema, (2) identificar zonas de soporte para compras escalonadas, (3) confirmar que la tendencia de largo plazo sigue intacta.</p>`
  },
  {id:'macro_basics',cat:'macro',icon:'🌍',
   title:'Macro: El Contexto que lo Cambia Todo',
   body:`<p>El análisis macroeconómico establece el contexto en el que operan todas las empresas. Incluso la mejor empresa puede caer significativamente en un entorno macro adverso.</p>
   <h4>Los 3 factores macro más importantes</h4>
   <ul><li><strong>Tipos de interés:</strong> El factor más influyente en la valoración de activos. Tipos altos = múltiplos más bajos, especialmente en growth</li><li><strong>Ciclo económico:</strong> Determina qué sectores favorece el mercado en cada fase</li><li><strong>Inflación:</strong> Afecta márgenes y poder adquisitivo. Las empresas con pricing power se defienden mejor</li></ul>
   <h4>Sectores y ciclo</h4>
   <p>Expansión → Cíclicos (industrial, consumo). Pico → Materias primas, energía. Recesión → Defensivos (utilities, consumo básico, salud). Recuperación → Financieros, industriales.</p>`
  },
];


function runValuation(state){
  const sector = state.sector;
  const cfg = SECTORS[sector]||SECTORS.technology;
  const inputs = state.inputs;
  const marks = state.marks;

  // Score calculation
  let ok=0,bad=0,watch=0,total=0;
  ITEMS.forEach(item=>{
    const m=marks[item.id];
    if(m){total++;if(m==='ok')ok++;else if(m==='bad')bad++;else if(m==='watch')watch++;}
  });
  const filled=Object.keys(inputs).filter(k=>inputs[k]&&inputs[k].trim()).length;
  const pct=total>0?Math.round((ok/total)*100):0;

  // Spider chart scores per category
  const catScores={fundamental:0,technical:0,macro:0,quality:0};
  const catTotals={fundamental:0,technical:0,macro:0,quality:0};
  ITEMS.forEach(item=>{
    const m=marks[item.id];
    if(m && catTotals[item.cat]!==undefined){
      catTotals[item.cat]++;
      if(m==='ok') catScores[item.cat]+=2;
      else if(m==='watch') catScores[item.cat]+=1;
    }
  });
  const spiderScores={
    fundamental: catTotals.fundamental>0?Math.round((catScores.fundamental/(catTotals.fundamental*2))*100):0,
    technical:   catTotals.technical>0?Math.round((catScores.technical/(catTotals.technical*2))*100):0,
    macro:       catTotals.macro>0?Math.round((catScores.macro/(catTotals.macro*2))*100):0,
    quality:     catTotals.quality>0?Math.round((catScores.quality/(catTotals.quality*2))*100):0,
  };

  // Fair value — sector-specific methods
  let fv=null,fv_bear=null,fv_bull=null,method='';
  // Extract P/E from auto-filled string like "P/E: 21.9x | EV/EBITDA: 17.8x"
  const _peStr = inputs.pe || inputs.per || '';
  const _peMatch = _peStr.match(/P\/E[:\s]*([\d.]+)/i);
  const pe_raw = _peMatch ? parseFloat(_peMatch[1]) : (parseFloat(_peStr) || 0);
  const eps_raw=parseFloat(inputs.eps_growth)||0; // growth %, NOT used as EPS anymore
  const fcf_raw=parseFloat(inputs.fcf)||0;
  // Extract first number from formatted strings like "Rev: +11.1% | EPS: +9.3%"
  function _parseGrowth(str) {
    if (!str) return 0;
    const m = String(str).match(/[+\-]?([\d.]+)%/);
    return m ? parseFloat(m[1]) : (parseFloat(str) || 0);
  }
  const rev_growth = Math.abs(_parseGrowth(inputs.rev_growth) || _parseGrowth(inputs.eps_growth) || 5);
  const current_price=parseFloat(inputs.price)||state.price||0;
  const div_yield=parseFloat(inputs.dividend)||0;
  const clamp=(v,lo,hi)=>Math.min(Math.max(v,lo),hi);

  if(sector==='reit' && pe_raw>0 && current_price>0){
    // FV = FFO_per_share × target_P/FFO
    // FFO/share = current_price / current_P/FFO
    const fp = cfg.pe_fair || 15;  // target P/FFO multiple
    const ffops = current_price / pe_raw;
    fv      = Math.round(ffops * fp * 100) / 100;
    fv_bear = Math.round(ffops * (fp * 0.75) * 100) / 100;
    fv_bull = Math.round(ffops * (fp * 1.30) * 100) / 100;
    method  = 'P/FFO (' + pe_raw.toFixed(1) + 'x → ' + fp + 'x objetivo)';
  } else if(sector==='financial'){
    // Correct P/BV valuation: FV = BookValuePerShare × target_PBV
    // BookValuePerShare = currentPrice / currentPB
    const tp = cfg.pe_fair || 1.3;  // target P/BV (1.3x for quality bank)
    const pb_current = (window._afData && window._afData.pb && parseFloat(window._afData.pb) > 0)
      ? parseFloat(window._afData.pb) : 0;
    if (current_price > 0 && pb_current > 0) {
      const bvps = current_price / pb_current;           // Book Value Per Share
      fv      = Math.round(bvps * tp * 100) / 100;
      fv_bear = Math.round(bvps * (tp * 0.70) * 100) / 100;
      fv_bull = Math.round(bvps * (tp * 1.35) * 100) / 100;
      method  = 'P/BV (' + pb_current.toFixed(1) + 'x → ' + tp + 'x objetivo)';
    } else if (pe_raw > 0 && current_price > 0) {
      // Fallback: no P/B data → use EPS × fair P/E
      const eps_v = current_price / pe_raw;
      const tpe = 14;  // fair P/E for diversified financials
      fv      = Math.round(eps_v * tpe * 100) / 100;
      fv_bear = Math.round(fv * 0.75 * 100) / 100;
      fv_bull = Math.round(fv * 1.30 * 100) / 100;
      method  = 'EPS × ' + tpe + 'x P/E justo';
    }
  } else if(sector==='consumer_defensive' && div_yield>0 && current_price>0 && rev_growth>0){
    // Gordon Growth Model: FV = D1 / (ke - g)
    // D0 = absolute annual dividend = price × yield/100
    // D1 = D0 × (1+g) — next year dividend
    const ke  = 0.08;
    const g   = clamp(rev_growth/100, 0.01, 0.05);
    const D0  = current_price * div_yield / 100;   // absolute $/€ dividend
    const D1  = D0 * (1 + g);
    fv      = Math.round(D1 / (ke - g) * 100) / 100;
    fv_bear = Math.round(fv * 0.80 * 100) / 100;
    fv_bull = Math.round(fv * 1.20 * 100) / 100;
    method  = 'DDM Gordon Growth (D0=' + D0.toFixed(2) + ', ke=8%, g=' + (g*100).toFixed(1) + '%)';
  } else if(sector==='energy'||sector==='industrial'||sector==='telecom'||sector==='utilities'){
    // For capital-heavy sectors: prefer DCF/Graham when P/E available (most accurate).
    // Use FCF × multiple as fallback when no earnings data exists.
    const _fcfStr = inputs.fcf || '';
    const _fcfMatch = _fcfStr.match(/FCF\s*Yield[:\s]*([\d.]+)%/i);
    const fcf_yield = _fcfMatch ? parseFloat(_fcfMatch[1]) : (fcf_raw > 0 && fcf_raw < 30 ? fcf_raw : 0);
    const fm = {energy:8, industrial:14, telecom:10, utilities:14}[sector] || 12;

    if (pe_raw > 0 && current_price > 0) {
      // Primary: DCF/Graham (same engine as default — works for any profitable company)
      const epsV = current_price / pe_raw;
      const g2   = clamp(rev_growth, 0, 20);
      const ke2  = 0.09, g_t2 = 0.03;
      let pv1 = 0;
      for (let yr = 1; yr <= 5; yr++) pv1 += epsV * Math.pow(1+g2/100,yr) / Math.pow(1+ke2,yr);
      const eps5b = epsV * Math.pow(1+g2/100, 5);
      const tv2   = eps5b*(1+g_t2)/(ke2-g_t2);
      const pv_tv2 = tv2/Math.pow(1+ke2,5);
      const dcf2  = pv1 + pv_tv2;
      const gra2  = epsV * (8.5 + 2*g2) * (4.4/4.8);
      // For capital-heavy sectors tilt slightly more to Graham (more conservative)
      fv      = Math.round((dcf2*0.50 + gra2*0.50) * 100) / 100;
      fv_bear = Math.round(fv * 0.72 * 100) / 100;
      fv_bull = Math.round(fv * 1.28 * 100) / 100;
      method  = 'DCF/Graham ' + cfg.label + ' (EPS=' + epsV.toFixed(2) + ', g=' + g2 + '%)';
      // Secondary: if FCF yield > 3%, blend in FCF validation (sanity check)
      if (fcf_yield >= 3 && current_price > 0) {
        const fcf_abs = current_price * fcf_yield / 100;
        const fv_fcf = fcf_abs * fm;
        // Blend: 60% DCF/Graham + 40% FCF multiple when FCF yield is reliable
        fv      = Math.round((fv*0.60 + fv_fcf*0.40) * 100) / 100;
        fv_bear = Math.round(fv * 0.72 * 100) / 100;
        fv_bull = Math.round(fv * 1.28 * 100) / 100;
        method  += ' + FCF×' + fm + 'x blend';
      }
    } else if (fcf_yield > 0 && current_price > 0) {
      // Fallback: no P/E data — use FCF × multiple only
      const fcf_abs = current_price * fcf_yield / 100;
      fv      = Math.round(fcf_abs * fm * 100) / 100;
      fv_bear = Math.round(fv * 0.70 * 100) / 100;
      fv_bull = Math.round(fv * 1.35 * 100) / 100;
      method  = 'FCF × ' + fm + 'x (yield=' + fcf_yield.toFixed(1) + '%, sin P/E)';
    }
  } else {
    // ── EPS real = precio / P/E  (mucho más preciso que usar % de crecimiento) ──
    // Intentamos obtener EPS de tres fuentes en orden de precisión:
    // 1. precio actual / P/E trailing   (lo más fiable)
    // 2. pe_raw si parece ser EPS (< 100 y > 0)
    // 3. Fallback a 0
    let epsVal = 0;
    if (current_price > 0 && pe_raw > 0 && pe_raw < 300) {
      // pe_raw viene del campo 'per' que auto-fill rellena como "P/E: 21.9x..."
      // parseFloat("P/E: 21.9x") = NaN → 0, así que extraemos el número con regex
      const peMatch = (inputs.per||'').match(/P\/E[:\s]*([\d.]+)/i);
      const peVal   = peMatch ? parseFloat(peMatch[1]) : pe_raw;
      if (peVal > 0 && peVal < 300) {
        epsVal = current_price / peVal;
      }
    }
    // Fallback: si no hay precio o P/E, intenta usar un valor numérico directo
    if (epsVal <= 0 && pe_raw > 0 && pe_raw < 50) {
      epsVal = pe_raw; // podría ser EPS introducido manualmente
    }

    const g = clamp(rev_growth, 0, 25); // cap 25% — más conservador

    if (epsVal > 0) {
      // Graham Formula (Benjamin Graham, Security Analysis):
      //   IV = EPS × (8.5 + 2g) × (4.4/Y)  where Y ≈ AAA bond yield (4.8% current)
      const graham = epsVal * (8.5 + 2 * g) * (4.4 / 4.8);

      // DCF — 2-stage: explicit 5Y growth, then terminal value discounted to present
      //   Stage 1: EPS grows at g% for 5 years
      //   Stage 2: Terminal value at perpetual g_term=3%
      //   Both stages discounted at ke=9%
      const ke = 0.09, g_term = 0.03;
      let pv_stage1 = 0;
      for (let yr = 1; yr <= 5; yr++) {
        pv_stage1 += epsVal * Math.pow(1 + g/100, yr) / Math.pow(1 + ke, yr);
      }
      const eps5     = epsVal * Math.pow(1 + g/100, 5);
      const tv       = eps5 * (1 + g_term) / (ke - g_term);   // terminal value at yr5
      const pv_tv    = tv / Math.pow(1 + ke, 5);               // discount to present
      const dcf      = pv_stage1 + pv_tv;

      fv      = Math.round((dcf * 0.55 + graham * 0.45) * 100) / 100;
      fv_bear = Math.round(fv * 0.72 * 100) / 100;
      fv_bull = Math.round(fv * 1.30 * 100) / 100;
      method  = 'DCF/Graham blend (EPS=' + epsVal.toFixed(2) + ', g=' + g + '%, ke=9%)';
    }
  }

  const mos=(fv&&current_price>0)?Math.round((1-current_price/fv)*100):null;

  // Flags
  const flags=[];
  ITEMS.forEach(item=>{
    const m=marks[item.id]; const val=inputs[item.id]||'';
    if(m==='bad') flags.push({icon:'🔴',text:`<strong>${item.label.default}:</strong> Señal negativa${val?' ('+val+')'  :''}`});
    if(m==='watch') flags.push({icon:'🟡',text:`<strong>${item.label.default}:</strong> A vigilar${val?' ('+val+')':''}`});
  });
  ITEMS.forEach(item=>{ if(marks[item.id]==='ok') flags.push({icon:'🟢',text:`<strong>${item.label.default}:</strong> Señal positiva`}); });

  // Narrative
  const sname=state.name||state.ticker||'la empresa';
  let narrative='';
  if(total===0){
    narrative='Marca al menos un ítem para obtener el resumen del análisis.';
  } else {
    const str=pct>=70?'sólido':pct>=45?'mixto':'con señales de alerta';
    narrative=`Para <strong>${sname}</strong> (${cfg.label}), el perfil es <strong>${str}</strong>: ${ok}✓ ${bad}✗ ${watch}⚠ de ${total} evaluados. `;
    if(fv){
      const mt=mos>20?` — <strong style="color:var(--green)">Margen de seguridad ${mos}%</strong>`:
               mos>0?` — Margen ajustado (${mos}%)`:mos<0?` — Prima del ${Math.abs(mos)}% sobre valor calculado`:'';
      narrative+=`Valor razonable: <strong>${fv.toFixed(2)}</strong> (${method})${mt}. `;
    }
    narrative+=`<em style="color:var(--tx3);font-size:11px">Orientativo. Verifica en fuentes oficiales.</em>`;
  }

  return {pct,ok,bad,watch,total,filled,fv,fv_bear,fv_bull,mos,narrative,flags,method,spiderScores,sectorName:cfg.label};
}





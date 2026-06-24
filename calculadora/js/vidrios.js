/* ============================================================
   VIDRIOS.JS — Catálogo de tipos de vidrio
   ============================================================
   MIGRACIÓN 24/06/2026 — DESACOPLE DE COSTOS (EN TRANSICIÓN):
   Se detectó que la tabla de materiales mostraba "Vidrio templado
   8mm" a S/1,097/m², cuando el costo de compra real (confirmado
   por Jorge: USD 26/m² ≈ S/91/m²) es 12 veces menor — porque el
   modelo anterior aplicaba el % de vidrio sobre el costo base de
   TODA la solución (perfilería + margen estructural del promedio
   histórico), y llamaba "vidrio" a esa suma completa.

   ENFOQUE DE TRANSICIÓN (decisión 24/06/2026): el TOTAL de cada
   cotización no debe cambiar todavía, porque solo tenemos un dato
   real confirmado (vidrio) y cero datos reales de perfilería —
   cambiar el costo total ahora sería reemplazar un número
   estimado por otro número todavía incompleto. Por eso este
   archivo expone DOS capas en paralelo:

   1) obtenerFactorVidrio() — el factor % LEGACY, preservado tal
      cual estaba, usado por reglasCalculo.js para el cálculo de
      costo real. El total de cualquier cotización sigue siendo
      idéntico al de antes de este cambio.
   2) obtenerPrecioVidrioM2() — el PRECIO REAL nuevo (desacoplado
      del tipo de sistema), usado SOLO para mostrar la línea
      informativa de "Vidrio" en la tabla de materiales — ayuda a
      ver el costo real de vidrio aislado, sin todavía afectar el
      precio final cotizado.

   Cuando lleguen los datos reales de perfilería (Excel
   Tarifario_Cotrina_Carga_Masiva.xlsx), se recalibra costoBasePano
   en reglasCalculo.js para que ya no incluya vidrio ni perfilería
   implícitos, se elimina el factor legacy, y obtenerPrecioVidrioM2
   pasa a ser la única fuente de verdad también para el costo.

   ESTADO DE LOS DATOS DE PRECIO REAL: SOLO "templado > 8mm" está
   CONFIRMADO por Jorge (24/06/2026, USD 26/m² × TC 3.50). Las
   demás variantes son una extrapolación PRELIMINAR a partir de
   ese único punto real (precio = precioCrudoBase × (1 + factor
   legacy), con precioCrudoBase ≈ S/79.13/m² implícito) — son
   números razonables para no dejar el catálogo vacío, pero cada
   uno debe reemplazarse por el precio real de Jorge en cuanto
   esté disponible.

   MERMA / DESPERDICIO DE CORTE: las planchas de vidrio vienen en
   formatos estándar (2440×1220mm a 3660×2440mm) y el corte a
   medida genera sobrante. obtenerPrecioVidrioM2() aplica un % de
   merma flat sobre el precio (ver FACTOR_MERMA_VIDRIO) — es una
   aproximación razonable para una cotización preliminar; un
   optimizador real de corte (nesting 2D) necesitaría conocer
   todas las medidas del proyecto a la vez, lo cual queda fuera de
   alcance de un cálculo por ítem individual como este.
   ============================================================ */

/** Precio base implícito de vidrio crudo (referencia), derivado del único dato confirmado. */
const PRECIO_CRUDO_BASE_M2 = 79.13;

/**
 * Merma/desperdicio de corte aplicada sobre el área de vidrio de
 * cada paño, como aproximación a la pérdida real de cortar
 * planchas estándar a medida. 10% es una estimación conservadora
 * típica para corte rectangular simple — VALIDAR con Jorge según
 * el tamaño real de plancha que compra y el patrón de corte que
 * usa el taller (a mayor cantidad de piezas pequeñas por plancha,
 * mayor suele ser la merma real).
 */
export const FACTOR_MERMA_VIDRIO = 0.10;

export const CATALOGO_VIDRIOS = {
  simple: {
    nombre: 'Vidrio simple',
    variantes: {
      '4mm':  { nombre: '4 mm',  precioM2: 75.17,  fuente: 'PRELIMINAR — extrapolado del dato confirmado de templado 8mm' },
      '5mm':  { nombre: '5 mm',  precioM2: 79.13,  fuente: 'PRELIMINAR — extrapolado del dato confirmado de templado 8mm' },
      '6mm':  { nombre: '6 mm',  precioM2: 81.50,  fuente: 'PRELIMINAR — extrapolado del dato confirmado de templado 8mm' },
      '8mm':  { nombre: '8 mm',  precioM2: 85.46,  fuente: 'PRELIMINAR — extrapolado del dato confirmado de templado 8mm' },
      '10mm': { nombre: '10 mm', precioM2: 90.21,  fuente: 'PRELIMINAR — extrapolado del dato confirmado de templado 8mm' },
      '12mm': { nombre: '12 mm', precioM2: 94.96,  fuente: 'PRELIMINAR — extrapolado del dato confirmado de templado 8mm' },
    },
  },
  templado: {
    nombre: 'Vidrio templado',
    variantes: {
      '6mm':  { nombre: '6 mm',  precioM2: 87.04,  fuente: 'PRELIMINAR — extrapolado del dato confirmado de templado 8mm' },
      '8mm':  { nombre: '8 mm',  precioM2: 91.00,  fuente: 'CONFIRMADO por Jorge (24/06/2026): USD 26/m² × TC 3.50' },
      '10mm': { nombre: '10 mm', precioM2: 94.96,  fuente: 'PRELIMINAR — extrapolado del dato confirmado de templado 8mm' },
      '12mm': { nombre: '12 mm', precioM2: 99.70,  fuente: 'PRELIMINAR — extrapolado del dato confirmado de templado 8mm' },
    },
  },
  laminado: {
    nombre: 'Vidrio laminado',
    variantes: {
      '3+3': { nombre: '3+3 mm', precioM2: 96.54,  fuente: 'PRELIMINAR — extrapolado del dato confirmado de templado 8mm' },
      '4+4': { nombre: '4+4 mm', precioM2: 98.91,  fuente: 'PRELIMINAR — extrapolado del dato confirmado de templado 8mm' },
      '5+5': { nombre: '5+5 mm', precioM2: 102.87, fuente: 'PRELIMINAR — extrapolado del dato confirmado de templado 8mm' },
      '6+6': { nombre: '6+6 mm', precioM2: 107.62, fuente: 'PRELIMINAR — extrapolado del dato confirmado de templado 8mm' },
      '8+8': { nombre: '8+8 mm', precioM2: 114.74, fuente: 'PRELIMINAR — extrapolado del dato confirmado de templado 8mm' },
    },
  },
  templadoLaminado: {
    nombre: 'Vidrio templado laminado',
    variantes: {
      'unico': { nombre: 'Estándar', precioM2: 114.74, fuente: 'PRELIMINAR — extrapolado del dato confirmado de templado 8mm' },
    },
  },
  insulado: {
    nombre: 'Vidrio insulado',
    variantes: {
      'dvh': { nombre: 'DVH (doble vidrio hermético)', precioM2: 110.78, fuente: 'PRELIMINAR — extrapolado del dato confirmado de templado 8mm' },
      'tvh': { nombre: 'TVH (triple vidrio hermético)', precioM2: 125.03, fuente: 'PRELIMINAR — extrapolado del dato confirmado de templado 8mm' },
    },
  },
  controlSolar: {
    nombre: 'Control solar',
    variantes: {
      'lowE':       { nombre: 'Low-E',      precioM2: 104.45, fuente: 'PRELIMINAR — extrapolado del dato confirmado de templado 8mm' },
      'reflectivo': { nombre: 'Reflectivo', precioM2: 101.29, fuente: 'PRELIMINAR — extrapolado del dato confirmado de templado 8mm' },
    },
  },
  acustico: {
    nombre: 'Vidrio acústico',
    variantes: {
      'unico': { nombre: 'Estándar', precioM2: 118.69, fuente: 'PRELIMINAR — extrapolado del dato confirmado de templado 8mm' },
    },
  },
  seguridad: {
    nombre: 'Vidrio de seguridad',
    variantes: {
      'unico': { nombre: 'Estándar', precioM2: 106.83, fuente: 'PRELIMINAR — extrapolado del dato confirmado de templado 8mm' },
    },
  },
  crudo: {
    nombre: 'Vidrio crudo',
    variantes: {
      'unico': { nombre: 'Estándar', precioM2: PRECIO_CRUDO_BASE_M2, fuente: 'PRELIMINAR — referencia base implícita del dato confirmado de templado 8mm' },
    },
  },
  otro: {
    nombre: 'Otro / a definir',
    variantes: {
      'unico': { nombre: 'A definir en visita técnica', precioM2: 94.96, fuente: 'PRELIMINAR — extrapolado del dato confirmado de templado 8mm' },
    },
  },
};

/**
 * FACTOR LEGACY (preservado, usado SOLO para no alterar el costo
 * total del proyecto mientras no se completa el dato real de
 * perfilería — ver Excel Tarifario_Cotrina_Carga_Masiva.xlsx).
 * Es exactamente el mismo % que tenía cada variante antes de la
 * migración a precio real (24/06/2026). reglasCalculo.js sigue
 * usando este factor para el cálculo de costo, así el total de
 * cualquier cotización ya hecha o por hacer NO cambia todavía.
 * obtenerPrecioVidrioM2() (más abajo) es el precio real nuevo,
 * usado SOLO para mostrar la línea informativa de "Vidrio" en la
 * tabla de materiales — no participa del cálculo de costo total
 * hasta que se recalibre costoBasePano con los datos completos
 * del Excel (vidrio + perfilería reales), momento en el que este
 * factor legacy se elimina por completo.
 */
const FACTOR_LEGACY_VIDRIO = {
  simple_4mm: -0.05, simple_5mm: 0, simple_6mm: 0.03, simple_8mm: 0.08, simple_10mm: 0.14, simple_12mm: 0.20,
  templado_6mm: 0.10, templado_8mm: 0.15, templado_10mm: 0.20, templado_12mm: 0.26,
  'laminado_3+3': 0.22, 'laminado_4+4': 0.25, 'laminado_5+5': 0.30, 'laminado_6+6': 0.36, 'laminado_8+8': 0.45,
  templadoLaminado_unico: 0.45,
  insulado_dvh: 0.40, insulado_tvh: 0.58,
  controlSolar_lowE: 0.32, controlSolar_reflectivo: 0.28,
  acustico_unico: 0.50, seguridad_unico: 0.35, crudo_unico: 0, otro_unico: 0.20,
};

export function obtenerFactorVidrio(categoria, variante) {
  return FACTOR_LEGACY_VIDRIO[`${categoria}_${variante}`] ?? 0;
}

/**
 * Devuelve el precio real S//m² (ya incluyendo merma de corte)
 * para una combinación categoría+variante. Si no existe, devuelve
 * 0 en vez de lanzar error, para que un dato corrupto no rompa el
 * cálculo completo de un proyecto con múltiples ítems.
 */
export function obtenerPrecioVidrioM2(categoria, variante) {
  const cat = CATALOGO_VIDRIOS[categoria];
  if (!cat) return 0;
  const v = cat.variantes[variante];
  const precioBase = v ? v.precioM2 : 0;
  return precioBase * (1 + FACTOR_MERMA_VIDRIO);
}

/** Precio sin merma — útil para mostrar el desglose "precio de compra" vs "merma" por separado. */
export function obtenerPrecioVidrioM2SinMerma(categoria, variante) {
  const cat = CATALOGO_VIDRIOS[categoria];
  if (!cat) return 0;
  const v = cat.variantes[variante];
  return v ? v.precioM2 : 0;
}

/** Texto de presentación, ej. "Vidrio templado 8 mm". */
export function describirVidrio(categoria, variante) {
  const cat = CATALOGO_VIDRIOS[categoria];
  if (!cat) return '—';
  const v = cat.variantes[variante];
  if (!v) return cat.nombre;
  return v.nombre === 'Estándar' ? cat.nombre : `${cat.nombre} ${v.nombre}`;
}

/** Lista plana de {categoria, variante, label} para poblar selects en cascada. */
export function listarCategoriasVidrio() {
  return Object.entries(CATALOGO_VIDRIOS).map(([key, v]) => ({ key, nombre: v.nombre }));
}

export function listarVariantesVidrio(categoria) {
  const cat = CATALOGO_VIDRIOS[categoria];
  if (!cat) return [];
  return Object.entries(cat.variantes).map(([key, v]) => ({ key, nombre: v.nombre, precioM2: v.precioM2 }));
}

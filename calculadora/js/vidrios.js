/* ============================================================
   VIDRIOS.JS — Catálogo de tipos de vidrio
   ============================================================
   Estructura jerárquica: categoría > variante (espesor/composición).
   Cada variante lleva su factor de costo (% adicional sobre el
   costo base del ítem) y su nombre de presentación.

   Los factores de las categorías base (templado, laminado, etc.)
   se migraron sin cambios desde FACTOR_VIDRIO en calculadora.js,
   para no alterar ningún número ya validado en cotizaciones reales.
   Las nuevas variantes por espesor dentro de cada categoría son
   estimaciones razonables sobre esa misma base — deben validarse
   con el equipo comercial antes de usarse en producción.
   ============================================================ */

export const CATALOGO_VIDRIOS = {
  simple: {
    nombre: 'Vidrio simple',
    variantes: {
      '4mm':  { nombre: '4 mm',  factor: -0.05 },
      '5mm':  { nombre: '5 mm',  factor: 0 },
      '6mm':  { nombre: '6 mm',  factor: 0.03 },
      '8mm':  { nombre: '8 mm',  factor: 0.08 },
      '10mm': { nombre: '10 mm', factor: 0.14 },
      '12mm': { nombre: '12 mm', factor: 0.20 },
    },
  },
  templado: {
    nombre: 'Vidrio templado',
    // Factor base de la categoría (igual al FACTOR_VIDRIO.templado original = 0.15),
    // distribuido en una progresión suave por espesor alrededor de ese valor.
    variantes: {
      '6mm':  { nombre: '6 mm',  factor: 0.10 },
      '8mm':  { nombre: '8 mm',  factor: 0.15 },
      '10mm': { nombre: '10 mm', factor: 0.20 },
      '12mm': { nombre: '12 mm', factor: 0.26 },
    },
  },
  laminado: {
    nombre: 'Vidrio laminado',
    // Factor base de la categoría (igual al FACTOR_VIDRIO.laminado original = 0.25).
    variantes: {
      '3+3': { nombre: '3+3 mm', factor: 0.22 },
      '4+4': { nombre: '4+4 mm', factor: 0.25 },
      '5+5': { nombre: '5+5 mm', factor: 0.30 },
      '6+6': { nombre: '6+6 mm', factor: 0.36 },
      '8+8': { nombre: '8+8 mm', factor: 0.45 },
    },
  },
  templadoLaminado: {
    nombre: 'Vidrio templado laminado',
    variantes: {
      'unico': { nombre: 'Estándar', factor: 0.45 }, // igual al original
    },
  },
  insulado: {
    nombre: 'Vidrio insulado',
    // Factor base de la categoría (igual al FACTOR_VIDRIO.insulado original = 0.40).
    variantes: {
      'dvh': { nombre: 'DVH (doble vidrio hermético)', factor: 0.40 },
      'tvh': { nombre: 'TVH (triple vidrio hermético)', factor: 0.58 },
    },
  },
  controlSolar: {
    nombre: 'Control solar',
    variantes: {
      'lowE':       { nombre: 'Low-E',      factor: 0.32 },
      'reflectivo': { nombre: 'Reflectivo', factor: 0.28 },
    },
  },
  acustico: {
    nombre: 'Vidrio acústico',
    variantes: {
      'unico': { nombre: 'Estándar', factor: 0.50 }, // igual al original
    },
  },
  seguridad: {
    nombre: 'Vidrio de seguridad',
    variantes: {
      'unico': { nombre: 'Estándar', factor: 0.35 }, // igual al original
    },
  },
  crudo: {
    nombre: 'Vidrio crudo',
    variantes: {
      'unico': { nombre: 'Estándar', factor: 0 }, // igual al original
    },
  },
  otro: {
    nombre: 'Otro / a definir',
    variantes: {
      'unico': { nombre: 'A definir en visita técnica', factor: 0.20 }, // igual a otroVidrio original
    },
  },
};

/**
 * Devuelve el factor de costo (decimal, ej. 0.15 = +15%) para una
 * combinación categoría+variante. Si no existe, devuelve 0 en vez
 * de lanzar error, para que un dato corrupto no rompa el cálculo
 * completo de un proyecto con múltiples ítems.
 */
export function obtenerFactorVidrio(categoria, variante) {
  const cat = CATALOGO_VIDRIOS[categoria];
  if (!cat) return 0;
  const v = cat.variantes[variante];
  return v ? v.factor : 0;
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
  return Object.entries(cat.variantes).map(([key, v]) => ({ key, nombre: v.nombre, factor: v.factor }));
}

/* ============================================================
   PERFILES.JS — Catálogo de series de perfiles / sistemas
   ============================================================
   Cada serie representa una línea de perfilería (aluminio, PVC,
   acero) con su factor de costo y los colores disponibles.

   Mapeo de continuidad con el sistema anterior (FACTOR_MATERIAL):
     aluminioNacional → serie25   (factor 0.10, igual)
     aluminioEuropeo  → serieEuropea (factor 0.25, igual)
     aluminioPremium  → serie80   (factor 0.35, igual)
     pvc              → pvc       (factor 0.20, igual)
     aceroInoxidable  → acero     (factor 0.30, igual)
   Las series 42/43 son nuevas subdivisiones dentro del rango
   aluminio nacional/europeo — deben validarse con el equipo
   comercial antes de diferenciarlas en cotizaciones reales.
   ============================================================ */

export const CATALOGO_PERFILES = {
  noAplica: {
    nombre: 'No aplica',
    factor: 0,
    colores: [],
  },
  serie25: {
    nombre: 'Serie 25 (aluminio nacional, línea económica)',
    factor: 0.10,
    colores: ['natural', 'blanco', 'negro'],
  },
  serie42: {
    nombre: 'Serie 42 (aluminio nacional, línea media)',
    factor: 0.16,
    colores: ['natural', 'blanco', 'negro', 'champagne'],
  },
  serie43: {
    nombre: 'Serie 43 (aluminio nacional, línea media-alta)',
    factor: 0.20,
    colores: ['natural', 'blanco', 'negro', 'champagne', 'madera'],
  },
  serie80: {
    nombre: 'Serie 80 (aluminio premium, alto tráfico)',
    factor: 0.35,
    colores: ['natural', 'negro', 'champagne', 'madera'],
  },
  serieEuropea: {
    nombre: 'Sistema europeo (rotura de puente térmico)',
    factor: 0.25,
    colores: ['natural', 'blanco', 'negro', 'champagne', 'madera'],
  },
  pvc: {
    nombre: 'PVC',
    factor: 0.20,
    colores: ['blanco', 'madera', 'gris'],
  },
  acero: {
    nombre: 'Acero inoxidable',
    factor: 0.30,
    colores: ['natural'],
  },
  fierro: {
    nombre: 'Fierro / estructura metálica',
    factor: 0.18,
    colores: ['natural', 'negro'],
  },
  madera: {
    nombre: 'Madera',
    factor: 0.25,
    colores: ['natural'],
  },
  otro: {
    nombre: 'Otro / a definir',
    factor: 0.15,
    colores: [],
  },
};

/**
 * PRECIO REAL DE PERFILERÍA POR METRO LINEAL (S//ml) — PLACEHOLDER.
 * Decisión del usuario (27/06/2026): tras eliminar costoBasePano del
 * cálculo (ver reglasCalculo.js), el "factor" de arriba — que solo
 * multiplicaba sobre costoBasePano — quedó sin base sobre la que
 * aplicarse, y la línea "Perfil / marco estructural" del PDF habría
 * caído a S/0. Para evitar eso, se fija un precio real de compra por
 * ml, en el mismo espíritu que PRECIO_VIDRIO_M2_USD de vidrios.js (un
 * costo de mercado real, no un % derivado).
 *
 * S/10/ml es un PLACEHOLDER explícito a falta del dato real del
 * proveedor de Jorge — el mismo orden de magnitud que ya se veía en
 * cotizaciones generadas antes de este cambio. Reemplazar por serie
 * en cuanto se tenga el precio real de compra (puede diferir bastante
 * entre serie25 económica y serie80/europea premium — por ahora se
 * usa el mismo valor para todas para no inventar una diferenciación
 * sin dato real que la respalde).
 */
const PRECIO_PERFIL_ML_PLACEHOLDER = 10;

export function obtenerPrecioPerfilMl(serie) {
  // Mismo valor para toda serie reconocida; noAplica no factura perfil.
  return serie && serie !== 'noAplica' ? PRECIO_PERFIL_ML_PLACEHOLDER : 0;
}

export const PERFIL_OBLIGATORIO_EN = ['ventana', 'fachada', 'cerramiento', 'muroCortina'];

export function obtenerFactorPerfil(serie) {
  const s = CATALOGO_PERFILES[serie];
  return s ? s.factor : 0;
}

export function describirPerfil(serie, color) {
  const s = CATALOGO_PERFILES[serie];
  if (!s) return '—';
  if (!color || s.colores.length === 0) return s.nombre;
  return `${s.nombre} · color ${color}`;
}

export function listarSeriesPerfil() {
  return Object.entries(CATALOGO_PERFILES).map(([key, v]) => ({ key, nombre: v.nombre }));
}

export function listarColoresDeSerie(serie) {
  const s = CATALOGO_PERFILES[serie];
  return s ? s.colores : [];
}

export function esPerfilObligatorio(tipoSolucion) {
  return PERFIL_OBLIGATORIO_EN.includes(tipoSolucion);
}

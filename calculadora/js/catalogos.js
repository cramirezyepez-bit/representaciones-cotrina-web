/* ============================================================
   CATALOGOS.JS — Tipos de solución y tipos de apertura
   ============================================================
   FASE 1 del motor paramétrico: tipos de apertura SIMPLES.
   Las combinaciones mixtas (fijo+corredizo, puerta+fijo lateral,
   muro cortina modular, etc.) quedan deliberadamente fuera de
   esta fase — se acordó con el usuario empezar por el núcleo de
   ítems múltiples + cálculo, antes de abordar configuraciones
   compuestas y el generador de dibujos técnicos.

   COSTO_BASE_M2 se migra sin cambios desde calculadora.js: son
   precios de venta históricos reales (682 presupuestos 2022-2026),
   no deben alterarse sin respaldo de un nuevo análisis de datos.
   ============================================================ */

export const TIPOS_SOLUCION = {
  fachada:     { nombre: 'Fachada de vidrio',        costoM2Min: 284, costoM2Max: 1259, fuente: 'Excel: 44 registros históricos' },
  mampara:     { nombre: 'Mampara de baño',          costoM2Min: 441, costoM2Max: 750,  fuente: 'Excel: 512 registros históricos' },
  ventana:     { nombre: 'Ventana de aluminio/PVC',  costoM2Min: 629, costoM2Max: 1278, fuente: 'Excel: 1153 registros históricos' },
  baranda:     { nombre: 'Baranda de vidrio',        costoM2Min: 409, costoM2Max: 445,  fuente: 'Excel: 45 registros históricos' },
  puerta:      { nombre: 'Puerta de vidrio',         costoM2Min: 588, costoM2Max: 1174, fuente: 'Excel: 175 registros históricos' },
  muroCortina: { nombre: 'Muro cortina',             costoM2Min: 284, costoM2Max: 1259, fuente: 'Agrupado con fachada; VALIDAR' },
  cerramiento: { nombre: 'Cerramiento de terraza',   costoM2Min: 441, costoM2Max: 750,  fuente: 'Sin categoría propia; usa mampara como referencia; VALIDAR' },
  divisionInterior: { nombre: 'División interior',   costoM2Min: 350, costoM2Max: 700,  fuente: 'Estimado — sin registro histórico propio; VALIDAR' },
  escaleraVidrio:   { nombre: 'Escalera con vidrio',  costoM2Min: 600, costoM2Max: 1400, fuente: 'Estimado — sin registro histórico propio; VALIDAR' },
  cerramientoPersonalizado: { nombre: 'Cerramiento personalizado', costoM2Min: 400, costoM2Max: 1300, fuente: 'A definir en visita técnica' },
};

// Tipos de apertura simples (FASE 1, sin combinaciones mixtas).
export const TIPOS_APERTURA = {
  fijo:              { nombre: 'Fijo',               hojas: 0 },
  corredizo2:        { nombre: 'Corredizo 2 hojas',  hojas: 2 },
  corredizo3:        { nombre: 'Corredizo 3 hojas',  hojas: 3 },
  corredizo4:        { nombre: 'Corredizo 4 hojas',  hojas: 4 },
  batiente:          { nombre: 'Batiente',           hojas: 1 },
  oscilobatiente:    { nombre: 'Oscilobatiente',     hojas: 1 },
  pivotante:         { nombre: 'Pivotante',          hojas: 1 },
  puerta:            { nombre: 'Puerta',             hojas: 1 },
  plegable:          { nombre: 'Plegable',           hojas: 1 },
  guillotina:        { nombre: 'Guillotina',         hojas: 1 },
  especial:          { nombre: 'Especial / a definir', hojas: 0 },
};

export const COSTO_MINIMO_PROYECTO = 450;
export const FACTOR_INSTALACION = 0.18;
export const AREA_MINIMA_POR_UNIDAD = 1;
export const UTILIDAD_MINIMA = 35;
export const UTILIDAD_MAXIMA = 55;

export const FACTOR_URGENCIA = {
  normal:     0,
  urgente:    0.15,
  evaluacion: -0.05,
};

export function listarTiposSolucion() {
  return Object.entries(TIPOS_SOLUCION).map(([key, v]) => ({ key, nombre: v.nombre }));
}

export function listarTiposApertura() {
  return Object.entries(TIPOS_APERTURA).map(([key, v]) => ({ key, nombre: v.nombre }));
}

export function obtenerCostoBaseM2Promedio(tipoSolucionKey) {
  const t = TIPOS_SOLUCION[tipoSolucionKey];
  if (!t) return 0;
  return (t.costoM2Min + t.costoM2Max) / 2;
}

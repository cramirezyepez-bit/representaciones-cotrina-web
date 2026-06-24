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
  puertaDucha: { nombre: 'Puerta de ducha',          costoM2Min: 441, costoM2Max: 750,  fuente: 'Agrupado con mampara de baño (misma familia de producto e instalación)' },
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
//
// `factor`: % adicional sobre el costo base del ítem (igual mecánica
// que FACTOR_VIDRIO/FACTOR_PERFIL). "Fijo" es la línea base (0%).
//
// Derivados de comparaciones reales en ALECOM_Tarifario_Precios_2026.xlsx
// entre configuraciones con el MISMO material y vidrio, distinta apertura:
//   - PVC 1 hoja (US$42/m²) vs 2 hojas corredizas (US$55/m²)        -> +31.0%
//   - Mampara 2 hojas corredizas (US$75) vs 4 hojas (US$85)         -> +13.3% sobre 2 hojas
//   - Mampara 2 hojas vs fijo+1 corredizo (US$80)                   -> +6.7%
//   - Mampara 2 hojas vs abatible/batiente (US$88)                  -> +17.3%
//   - Ventana corrediza (US$52) vs proyectante/basculante (US$62)   -> +19.2%
//   - PVC europeo 1 abatible (US$175) vs oscilobatiente (US$205)    -> +17.1%
//   - PVC europeo 1 abatible vs corrediza alta estanqueidad (US$195)-> +11.4%
//   - Mampara ducha 1 abatible (US$185) vs 2 corredizas (US$240)    -> +29.7%
// Con esa evidencia, "fijo" queda como base 0%, "corredizo 2 hojas"
// se fija en +28% (promedio de las comparaciones de 2 hojas vs 1),
// y cada hoja adicional de corredera suma ~+13% (lo medido entre
// 2 y 4 hojas de mampara, repartido por hoja). Oscilobatiente y
// pivotante quedan como los de mecanismo más caro, coherente con
// que el oscilobatiente combina dos sistemas de apertura en un
// solo herraje. Estos factores deben revisarse con el equipo
// comercial antes de cotizar en firme — son la mejor estimación
// disponible con datos reales, no un ajuste fino validado en obra.
export const TIPOS_APERTURA = {
  fijo:           { nombre: 'Fijo',                hojas: 0, factor: 0,    fuente: 'Línea base — sin mecanismo de apertura' },
  corredizo2:     { nombre: 'Corredizo 2 hojas',    hojas: 2, factor: 0.28, fuente: 'Tarifario 2026: PVC/mampara 1→2 hojas (+31%, +contexto mampara fijo+corredizo +6.7%)' },
  corredizo3:     { nombre: 'Corredizo 3 hojas',    hojas: 3, factor: 0.41, fuente: 'Estimado: corredizo2 + ~13% por hoja adicional (medido 2→4 hojas mampara)' },
  corredizo4:     { nombre: 'Corredizo 4 hojas',    hojas: 4, factor: 0.54, fuente: 'Tarifario 2026: mampara 2→4 hojas corredizas, +13.3% sobre 2 hojas' },
  dobleCorredizo: { nombre: 'Doble corredizo',      hojas: 4, factor: 0.60, fuente: 'Estimado: 2 pares de hojas corredizas independientes en carriles separados, +~6% sobre corredizo4 por carril doble' },
  batiente:       { nombre: 'Batiente',             hojas: 1, factor: 0.18, fuente: 'Tarifario 2026: mampara abatible vs 2 corredizas, +17.3%' },
  batienteIzquierda: { nombre: 'Batiente izquierda', hojas: 1, factor: 0.18, fuente: 'Igual a Batiente — mismo mecanismo, el lado de giro no cambia el costo de herrajes' },
  batienteDerecha:   { nombre: 'Batiente derecha',   hojas: 1, factor: 0.18, fuente: 'Igual a Batiente — mismo mecanismo, el lado de giro no cambia el costo de herrajes' },
  proyectante:    { nombre: 'Proyectante',          hojas: 1, factor: 0.22, fuente: 'Estimado: bisagras superiores + brazo proyectante, intermedio entre batiente y oscilobatiente; VALIDAR' },
  oscilobatiente: { nombre: 'Oscilobatiente',       hojas: 1, factor: 0.30, fuente: 'Tarifario 2026: PVC europeo abatible vs oscilobatiente, +17.1% sobre abatible (~+30% sobre fijo)' },
  pivotante:      { nombre: 'Pivotante',            hojas: 1, factor: 0.25, fuente: 'Estimado por similitud mecánica con batiente reforzado; VALIDAR' },
  puerta:         { nombre: 'Puerta',               hojas: 1, factor: 0.20, fuente: 'Tarifario 2026: PVC puerta corrediza vs ventana corrediza equivalente, +~20%' },
  plegable:       { nombre: 'Plegable',             hojas: 0, factor: 0.45, fuente: 'Tarifario 2026: mampara plegable (acordeón) vs 2 hojas corredizas, escalado por vidrio distinto; estimado conservador' },
  guillotina:     { nombre: 'Guillotina',           hojas: 1, factor: 0.22, fuente: 'Estimado por similitud mecánica con corredizo vertical; VALIDAR — sin referencia directa en tarifario' },
  especial:       { nombre: 'Especial / a definir', hojas: 0, factor: 0.20, fuente: 'A definir en visita técnica' },
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

export function obtenerFactorApertura(tipoAperturaKey) {
  const t = TIPOS_APERTURA[tipoAperturaKey];
  return t ? t.factor : 0;
}

export function obtenerCostoBaseM2Promedio(tipoSolucionKey) {
  const t = TIPOS_SOLUCION[tipoSolucionKey];
  if (!t) return 0;
  return (t.costoM2Min + t.costoM2Max) / 2;
}

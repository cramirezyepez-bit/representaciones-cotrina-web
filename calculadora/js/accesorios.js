/* ============================================================
   ACCESORIOS.JS — Catálogo de accesorios y prestaciones
   ============================================================
   CAMBIO DE MODELO respecto al sistema anterior:

   ANTES (FACTOR_ACCESORIOS en calculadora.js): cada accesorio era
   un checkbox binario que sumaba un % fijo sobre el costo base,
   sin noción de cantidad. Ej. "Herrajes premium" sumaba +15% sin
   importar si el ítem tenía 2 o 20 herrajes.

   AHORA: cada accesorio tiene nombre, unidad de medida, precio
   unitario en soles, y se captura una CANTIDAD real por ítem
   (o por proyecto, ver `aplicaA` más abajo). El costo del
   accesorio es `cantidad × precioUnitario`, sumado directamente
   en soles al costo del ítem — ya no como % del costo base.

   Esto es un cambio de fórmula real, no solo de interfaz: el
   equipo comercial debe revisar y ajustar los precios unitarios
   de CATALOGO_ACCESORIOS antes de usarlo para cotizar en firme.
   Los valores aquí son estimaciones de partida basadas en los
   factores porcentuales antiguos aplicados a un ítem de tamaño
   promedio (3 m²), para no arrancar de cero.
   ============================================================ */

/**
 * unidad: 'unidad' | 'metro' | 'm2' | 'tubo' | 'servicio'
 * aplicaA: 'item'     -> se cotiza por cada ítem individual (ej. bisagras de una puerta)
 *          'proyecto' -> se cotiza una sola vez para todo el proyecto (ej. transporte especial)
 */
export const CATALOGO_ACCESORIOS = {
  rodajes:             { nombre: 'Rodajes',                            unidad: 'unidad',   precioUnitario: 18,  aplicaA: 'item' },
  bisagras:            { nombre: 'Bisagras',                           unidad: 'unidad',   precioUnitario: 22,  aplicaA: 'item' },
  jaladores:           { nombre: 'Jaladores',                          unidad: 'unidad',   precioUnitario: 35,  aplicaA: 'item' },
  cerraduras:          { nombre: 'Cerraduras',                         unidad: 'unidad',   precioUnitario: 65,  aplicaA: 'item' },
  topes:               { nombre: 'Topes',                              unidad: 'unidad',   precioUnitario: 12,  aplicaA: 'item' },
  felpas:              { nombre: 'Felpas',                             unidad: 'metro',    precioUnitario: 8,   aplicaA: 'item' },
  siliconaEstructural: { nombre: 'Silicona estructural',               unidad: 'tubo',     precioUnitario: 45,  aplicaA: 'item' },
  herrajePremium:      { nombre: 'Herrajes premium (juego)',           unidad: 'unidad',   precioUnitario: 180, aplicaA: 'item' },
  peliculaSeguridad:   { nombre: 'Película de seguridad',              unidad: 'm2',       precioUnitario: 95,  aplicaA: 'item' },
  controlSolar:        { nombre: 'Tratamiento control solar',          unidad: 'm2',       precioUnitario: 110, aplicaA: 'item' },
  aislamientoAcustico: { nombre: 'Aislamiento acústico',               unidad: 'm2',       precioUnitario: 130, aplicaA: 'item' },
  // Accesorios/servicios de proyecto completo (no por ítem):
  selladoEstructural:  { nombre: 'Sellado estructural',                unidad: 'servicio', precioUnitario: 850, aplicaA: 'proyecto' },
  transporteEspecial:  { nombre: 'Transporte especial',                unidad: 'servicio', precioUnitario: 450, aplicaA: 'proyecto' },
  desmontaje:          { nombre: 'Desmontaje de estructura existente', unidad: 'servicio', precioUnitario: 380, aplicaA: 'proyecto' },
  instalacionAltura:   { nombre: 'Instalación en altura',              unidad: 'servicio', precioUnitario: 600, aplicaA: 'proyecto' },
};

/**
 * Línea de accesorio aplicada: { clave, cantidad }.
 * Calcula el subtotal en soles de una lista de líneas de accesorio.
 */
export function calcularSubtotalAccesorios(lineas = []) {
  return lineas.reduce((acc, linea) => {
    const def = CATALOGO_ACCESORIOS[linea.clave];
    if (!def) return acc;
    const cantidad = Number(linea.cantidad) || 0;
    return acc + cantidad * def.precioUnitario;
  }, 0);
}

export function describirLineaAccesorio(linea) {
  const def = CATALOGO_ACCESORIOS[linea.clave];
  if (!def) return '—';
  return `${def.nombre}: ${linea.cantidad} ${def.unidad}`;
}

export function listarAccesoriosPorAlcance(aplicaA) {
  return Object.entries(CATALOGO_ACCESORIOS)
    .filter(([, v]) => v.aplicaA === aplicaA)
    .map(([key, v]) => ({ key, ...v }));
}

/* ------------------------------------------------------------
   CAPA DE COMPATIBILIDAD CON EL SISTEMA ANTERIOR
   ------------------------------------------------------------
   El formulario actual sigue usando checkboxes con las claves
   antiguas (herrajeEstandar, sistemaCorredizo, acusticoMedio,
   etc.) que representaban % sobre costo base, no cantidad×precio.
   Esta tabla permite seguir leyendo esos checkboxes mientras se
   migra la interfaz a campos de cantidad reales, sin romper el
   cálculo de ítems creados con el formulario tal como está hoy.
   Se elimina cuando el formulario incorpore campos de cantidad
   para cada accesorio nuevo del catálogo de arriba.
   ------------------------------------------------------------ */
export const FACTOR_ACCESORIOS_LEGACY = {
  ninguno:            0,
  herrajeEstandar:    0.05,
  herrajePremium:     0.15,
  sistemaCorredizo:   0.10,
  sistemaBatiente:    0.08,
  sistemaPivotante:   0.12,
  sistemaPlegable:    0.18,
  cierreHermetico:    0.10,
  controlSolar:       0.12,
  proteccionUV:       0.08,
  aislamientoTermico: 0.15,
  acusticoBasico:     0.12,
  acusticoMedio:      0.22,
  acusticoAlto:       0.35,
  peliculaSeguridad:  0.10,
  selladoEstructural: 0.18,
  instalacionAltura:  0.20,
  desmontaje:         0.12,
  transporteEspecial: 0.10,
};

export function calcularFactorAccesoriosLegacy(clavesSeleccionadas = []) {
  return clavesSeleccionadas.reduce(
    (acc, clave) => acc + (FACTOR_ACCESORIOS_LEGACY[clave] ?? 0), 0
  );
}

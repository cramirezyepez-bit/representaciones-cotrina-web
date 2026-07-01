/**
 * MotorPerfilesVL48.js
 * ------------------------------------------------------------------
 * Lógica de despiece técnico para la Serie VL48 (Ventana Corrediza
 * Diseño Europeo, Corporación Limatambo), migrada 1:1 desde la
 * "TABLA DE DESCUENTOS - SERIE VL48" (ficha técnica oficial, pág. 19).
 *
 * X = ancho del vano (mm) | Y = alto del vano (mm)
 *
 * Perfiles (códigos de catálogo Limatambo):
 *   VL4801 Marco doble corrediza
 *   VL4803 Marco de hoja
 *   VL4804 Marco de hoja para insulado (reemplaza VL4803 si el vidrio es insulado)
 *   VL4805 Traslape de hoja
 *   VL4806 Adaptador de hoja (solo en 4 hojas)
 *
 * Restricciones de fábrica:
 *   - Dimensión máxima por hoja: 1200mm (ancho) x 2400mm (alto)
 *   - Peso máximo por hoja: 150 Kg
 *   - Vidrio: monolíticos 6/8/10mm, insulados hasta 23mm
 * ------------------------------------------------------------------
 */

export const CONFIGURACIONES_VL48 = {
  DOS_HOJAS: 'DOS_HOJAS',       // 2 hojas / 2 rieles (C/C)
  CUATRO_HOJAS: 'CUATRO_HOJAS'  // 4 hojas / 2 rieles (F/C/C/F)
};

const LIMITES_HOJA = { anchoMax: 1200, altoMax: 2400, pesoMaxKg: 150 };
const LONG_VARILLA_M = 6.0; // estándar comercial; ajustar si Limatambo confirma otro valor

export const ACCESORIOS_CATALOGO_VL48 = {
  felpaF48: { nombre: 'F48 Felpa', codigos: { gris: 'RAV0001077', negro: 'RAV0001078' } },
  garruchaCojineteSimple: { nombre: 'Garrucha Cojinete Simple', codigo: 'RAV0000990' },
  escuadraPivote: { nombre: 'Escuadra Pivote (Marco y Hoja)', codigo: 'RAV0000986' },
  escuadraAlineamiento: { nombre: 'Escuadra de Alineamiento (hoja)', codigo: 'RAV0001079' },
  kitVentana: { nombre: 'Kit Ventana (Guía/Tope/Escuadra PVC)', codigo: 'RAV0001043' },
  guiaSuperiorInferiorPVC: { nombre: 'Guía Superior e Inferior PVC', codigo: 'RAV0000995' },
  seguroAutomaticoSinFijacion: { nombre: 'Seguro Automático sin fijación', codigos: { aluminio: 'RAV0001003', negro: 'RAV0001007', blanco: 'RAV0001011' } },
  seguroAutomaticoConFijacion: { nombre: 'Seguro Automático con fijación', codigos: { aluminio: 'RAV0001005', negro: 'RAV0001009', blanco: 'RAV0001013' } },
};

/**
 * Calcula el despiece de perfiles VL48 para un vano.
 * @param {Object} p
 * @param {string} p.tipoConfiguracion - CONFIGURACIONES_VL48
 * @param {number} p.ancho - ancho del vano en mm (X)
 * @param {number} p.alto - alto del vano en mm (Y)
 * @param {number} [p.cantidad=1]
 * @param {boolean} [p.insulado=false] - si true, usa VL4804 en vez de VL4803
 */
export function calcularDespieceVL48({ tipoConfiguracion, ancho: X, alto: Y, cantidad = 1, insulado = false }) {
  validarConfiguracion(tipoConfiguracion, CONFIGURACIONES_VL48, 'VL48');
  const warnings = validarLimitesHoja(tipoConfiguracion, X, Y);

  let perfiles = [];
  let vidrios = [];

  switch (tipoConfiguracion) {
    case CONFIGURACIONES_VL48.DOS_HOJAS:
      perfiles = [
        perfil('VL4801', 'Marco doble corrediza (horizontal)', X, 2),
        perfil('VL4801', 'Marco doble corrediza (vertical)', Y, 2),
        perfil(insulado ? 'VL4804' : 'VL4803', 'Marco de hoja (horizontal)', X / 2 + 8, 4),
        perfil(insulado ? 'VL4804' : 'VL4803', 'Marco de hoja (vertical)', Y - 50, 4),
        perfil('VL4805', 'Traslape de hoja', Y - 50, 2),
      ];
      vidrios = [glassEntry(X / 2 - 95, Y - 154, 2)];
      break;

    case CONFIGURACIONES_VL48.CUATRO_HOJAS:
      perfiles = [
        perfil('VL4801', 'Marco doble corrediza (horizontal)', X, 2),
        perfil('VL4801', 'Marco doble corrediza (vertical)', Y, 2),
        perfil(insulado ? 'VL4804' : 'VL4803', 'Marco de hoja (horizontal)', X / 4 + 17, 8),
        perfil(insulado ? 'VL4804' : 'VL4803', 'Marco de hoja (vertical)', Y - 50, 8),
        perfil('VL4805', 'Traslape de hoja', Y - 50, 4),
        perfil('VL4806', 'Adaptador de hoja', Y - 50, 1),
      ];
      vidrios = [glassEntry(X / 4 - 83, Y - 154, 4)];
      break;
  }

  perfiles = perfiles.map(pf => ({ ...pf, cant: pf.cant * cantidad }));
  vidrios = vidrios.map(v => ({ ...v, cant: v.cant * cantidad }));

  const perfilesConCorte = perfiles.map(pf => calcularCompraBarras(pf, LONG_VARILLA_M));
  const areaVidrioM2 = vidrios.reduce((acc, v) => acc + (v.ancho * v.alto / 1_000_000) * v.cant, 0);
  const areaVanoM2 = round2((X * Y / 1_000_000) * cantidad);

  return {
    serie: 'VL48', tipoConfiguracion,
    ancho: X, alto: Y, cantidad, insulado,
    areaVanoM2, areaVidrioM2: round3(areaVidrioM2),
    perfiles: perfilesConCorte,
    vidrios,
    accesoriosSugeridos: sugerirAccesoriosVL48(tipoConfiguracion, cantidad),
    limites: LIMITES_HOJA,
    warnings
  };
}

function sugerirAccesoriosVL48(tipoConfiguracion, cantidad) {
  const nHojasMoviles = { DOS_HOJAS: 2, CUATRO_HOJAS: 2 }[tipoConfiguracion];
  return [
    { nombre: 'Garrucha Cojinete Simple', codigo: ACCESORIOS_CATALOGO_VL48.garruchaCojineteSimple.codigo, cant: nHojasMoviles * 2 * cantidad },
    { nombre: 'Kit Ventana (Guía/Tope/Escuadra)', codigo: ACCESORIOS_CATALOGO_VL48.kitVentana.codigo, cant: 1 * cantidad },
    { nombre: 'F48 Felpa', codigo: ACCESORIOS_CATALOGO_VL48.felpaF48.codigos.negro, cant: null, nota: 'se vende por metro lineal, calcular contra perímetro de hoja' },
  ];
}

/* ------------------------------------------------------------------ */
/* Helpers compartidos (mismo patrón que MotorPerfilesVL46.js)         */
/* ------------------------------------------------------------------ */
function perfil(codigo, nombre, largo, cant) {
  return { codigo, nombre, largo: round1(largo), cant };
}
function glassEntry(ancho, alto, cant) {
  return { nombre: 'VIDRIO', ancho: round1(ancho), alto: round1(alto), cant };
}
function calcularCompraBarras(pf, longVarillaM) {
  const metrosNecesarios = round3((pf.largo * pf.cant) / 1000);
  const varillasAComprar = Math.ceil(metrosNecesarios / longVarillaM);
  const metrosComprados = varillasAComprar * longVarillaM;
  return { ...pf, metrosNecesarios, varillasAComprar, sobranteM: round3(metrosComprados - metrosNecesarios) };
}
function validarConfiguracion(tipo, enumObj, serieNombre) {
  if (!Object.values(enumObj).includes(tipo)) {
    throw new Error(`Configuración desconocida para ${serieNombre}: ${tipo}`);
  }
}
function validarLimitesHoja(tipoConfiguracion, X, Y) {
  const nHojas = { DOS_HOJAS: 2, CUATRO_HOJAS: 4 }[tipoConfiguracion];
  const anchoHoja = X / nHojas;
  const warnings = [];
  if (anchoHoja > LIMITES_HOJA.anchoMax) warnings.push(`Ancho de hoja (${round1(anchoHoja)}mm) excede el máximo de fábrica (${LIMITES_HOJA.anchoMax}mm).`);
  if (Y > LIMITES_HOJA.altoMax) warnings.push(`Alto de hoja (${Y}mm) excede el máximo de fábrica (${LIMITES_HOJA.altoMax}mm).`);
  return warnings;
}
function round1(n) { return Math.round(n * 10) / 10; }
function round2(n) { return Math.round(n * 100) / 100; }
function round3(n) { return Math.round(n * 1000) / 1000; }

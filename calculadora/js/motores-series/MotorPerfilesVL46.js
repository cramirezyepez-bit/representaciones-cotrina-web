/**
 * MotorPerfilesVL46.js
 * ------------------------------------------------------------------
 * Lógica de despiece técnico para la Serie VL46 (Ventana Corrediza
 * Diseño Europeo, Corporación Limatambo), migrada 1:1 desde la
 * "TABLA DE DESCUENTOS - SERIE VL46" (ficha técnica oficial, pág. 6).
 *
 * X = ancho del vano (mm) | Y = alto del vano (mm)
 *
 * Perfiles (códigos de catálogo Limatambo):
 *   VL4601 Marco doble corrediza (2 rieles)
 *   VL4604 Adaptador marco triple corrediza (3 rieles)
 *   VL4605 Marco de hoja
 *   VL4602 Marco de hoja para insulado (reemplaza VL4605 si el vidrio es insulado)
 *   VL4603 Traslape
 *   VL4606 Adaptador de hoja (solo en 4 hojas)
 *   VL4607 Marco fijo
 *   VL4608 Junquillo de vidrio 6mm y 8mm (solo marco fijo)
 *
 * Restricciones de fábrica:
 *   - Dimensión máxima por hoja: 1200mm (ancho) x 1900mm (alto)
 *   - Peso máximo por hoja: 80 Kg
 *   - Vidrio: monolíticos 6/8/10mm, insulados hasta 19mm
 * ------------------------------------------------------------------
 */

export const CONFIGURACIONES_VL46 = {
  DOS_HOJAS: 'DOS_HOJAS',       // 2 hojas / 2 rieles (C/C)
  TRES_HOJAS: 'TRES_HOJAS',     // 3 hojas / 3 rieles (C/C/C)
  CUATRO_HOJAS: 'CUATRO_HOJAS', // 4 hojas / 2 rieles (F/C/C/F)
  MARCO_FIJO: 'MARCO_FIJO'      // paño fijo independiente
};

const LIMITES_HOJA = { anchoMax: 1200, altoMax: 1900, pesoMaxKg: 80 };
const LONG_VARILLA_M = 6.0; // estándar comercial; ajustar si Limatambo confirma otro valor

export const ACCESORIOS_CATALOGO_VL46 = {
  felpaF46: { nombre: 'F46 Felpa', codigos: { gris: 'RAV0001017', negro: 'RAV0001018' } },
  garruchaCojineteSimple: { nombre: 'Garrucha Cojinete Simple (80Kg)', codigo: 'RAV0000988' },
  escuadraPivote: {
    nombre: 'Escuadra Pivote',
    codigos: { marco: 'RAV0000980', supMarcoVL4604: 'RAV0000981', hoja: 'RAV0000982' }
  },
  escuadraAlineamiento: { nombre: 'Escuadra de Alineamiento (hoja)', codigo: 'RAV0001045' },
  kitVentana: { nombre: 'Kit Ventana (Guía/Tope/Cortaviento PVC)', codigo: 'RAV0001027' },
  contraseguro: { nombre: 'Contraseguro', codigo: 'RAV0001016' },
  lenguetaSeguros: { nombre: 'Lengüeta de Seguros', codigo: 'RAV0001015' },
  seguroAutomaticoSinFijacion: { nombre: 'Seguro Automático sin fijación', codigos: { aluminio: 'RAV0001003', negro: 'RAV0001007', blanco: 'RAV0001011' } },
  seguroAutomaticoConFijacion: { nombre: 'Seguro Automático con fijación', codigos: { aluminio: 'RAV0001005', negro: 'RAV0001009', blanco: 'RAV0001013' } },
};

/**
 * Calcula el despiece de perfiles VL46 para un vano.
 * @param {Object} p
 * @param {string} p.tipoConfiguracion - CONFIGURACIONES_VL46
 * @param {number} p.ancho - ancho del vano en mm (X)
 * @param {number} p.alto - alto del vano en mm (Y)
 * @param {number} [p.cantidad=1]
 * @param {boolean} [p.insulado=false] - si true, usa VL4602 en vez de VL4605 (por tabla del fabricante)
 */
export function calcularDespieceVL46({ tipoConfiguracion, ancho: X, alto: Y, cantidad = 1, insulado = false }) {
  validarConfiguracion(tipoConfiguracion, CONFIGURACIONES_VL46, 'VL46');
  const warnings = validarLimitesHoja(tipoConfiguracion, X, Y);

  let perfiles = [];
  let vidrios = [];

  switch (tipoConfiguracion) {
    case CONFIGURACIONES_VL46.DOS_HOJAS:
      perfiles = [
        perfil('VL4601', 'Marco doble corrediza (horizontal)', X, 2),
        perfil('VL4601', 'Marco doble corrediza (vertical)', Y, 2),
        perfil(insulado ? 'VL4602' : 'VL4605', 'Marco de hoja (horizontal)', X / 2 - 1, 4),
        perfil(insulado ? 'VL4602' : 'VL4605', 'Marco de hoja (vertical)', Y - 66, 4),
        perfil('VL4603', 'Traslape', Y - 66, 2),
      ];
      vidrios = [glassEntry(X / 2 - 101, Y - 167, 2)];
      break;

    case CONFIGURACIONES_VL46.TRES_HOJAS:
      perfiles = [
        perfil('VL4604', 'Adaptador marco triple corrediza (horizontal)', X, 2),
        perfil('VL4604', 'Adaptador marco triple corrediza (vertical)', Y, 2),
        perfil(insulado ? 'VL4602' : 'VL4605', 'Marco de hoja (horizontal)', X / 3 + 19, 6),
        perfil(insulado ? 'VL4602' : 'VL4605', 'Marco de hoja (vertical)', Y - 66, 6),
        perfil('VL4603', 'Traslape', Y - 66, 4),
      ];
      vidrios = [glassEntry(X / 3 - 81, Y - 167, 3)];
      break;

    case CONFIGURACIONES_VL46.CUATRO_HOJAS:
      perfiles = [
        perfil('VL4601', 'Marco doble corrediza (horizontal)', X, 2),
        perfil('VL4601', 'Marco doble corrediza (vertical)', Y, 2),
        perfil(insulado ? 'VL4602' : 'VL4605', 'Marco de hoja (horizontal)', X / 4 + 14, 8),
        perfil(insulado ? 'VL4602' : 'VL4605', 'Marco de hoja (vertical)', Y - 66, 8),
        perfil('VL4603', 'Traslape', Y - 66, 4),
        perfil('VL4606', 'Adaptador de hoja', Y - 66, 1),
      ];
      vidrios = [glassEntry(X / 4 - 87, Y - 167, 4)];
      break;

    case CONFIGURACIONES_VL46.MARCO_FIJO:
      perfiles = [
        perfil('VL4607', 'Marco fijo (horizontal)', X, 2),
        perfil('VL4607', 'Marco fijo (vertical)', Y, 2),
        perfil('VL4608', 'Junquillo de vidrio (horizontal)', X - 52, 2),
        perfil('VL4608', 'Junquillo de vidrio (vertical)', Y - 92, 2),
      ];
      vidrios = [glassEntry(X - 67, Y - 67, 1)];
      break;
  }

  perfiles = perfiles.map(pf => ({ ...pf, cant: pf.cant * cantidad }));
  vidrios = vidrios.map(v => ({ ...v, cant: v.cant * cantidad }));

  const perfilesConCorte = perfiles.map(pf => calcularCompraBarras(pf, LONG_VARILLA_M));
  const areaVidrioM2 = vidrios.reduce((acc, v) => acc + (v.ancho * v.alto / 1_000_000) * v.cant, 0);
  const areaVanoM2 = round2((X * Y / 1_000_000) * cantidad);

  return {
    serie: 'VL46', tipoConfiguracion,
    ancho: X, alto: Y, cantidad, insulado,
    areaVanoM2, areaVidrioM2: round3(areaVidrioM2),
    perfiles: perfilesConCorte,
    vidrios,
    accesoriosSugeridos: sugerirAccesoriosVL46(tipoConfiguracion, cantidad),
    limites: LIMITES_HOJA,
    warnings
  };
}

function sugerirAccesoriosVL46(tipoConfiguracion, cantidad) {
  const nHojasMoviles = { DOS_HOJAS: 2, TRES_HOJAS: 3, CUATRO_HOJAS: 2, MARCO_FIJO: 0 }[tipoConfiguracion];
  // Nota: MARCO_FIJO no lleva garruchas/seguros; TRES_HOJAS típicamente 2 correderas + 1 fija (ver plano),
  // CUATRO_HOJAS típicamente F/C/C/F (2 correderas centrales) -> ajustar según tipología real del proyecto.
  return [
    { nombre: 'Garrucha Cojinete Simple 80Kg', codigo: ACCESORIOS_CATALOGO_VL46.garruchaCojineteSimple.codigo, cant: nHojasMoviles * 2 * cantidad },
    { nombre: 'Kit Ventana (Guía/Tope/Cortaviento)', codigo: ACCESORIOS_CATALOGO_VL46.kitVentana.codigo, cant: 1 * cantidad },
    { nombre: 'F46 Felpa', codigo: ACCESORIOS_CATALOGO_VL46.felpaF46.codigos.negro, cant: null, nota: 'se vende por metro lineal, calcular contra perímetro de hoja' },
  ];
}

/* ------------------------------------------------------------------ */
/* Helpers compartidos (mismo patrón que MotorPerfilesSerie25.js)      */
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
  const nHojas = { DOS_HOJAS: 2, TRES_HOJAS: 3, CUATRO_HOJAS: 4, MARCO_FIJO: 1 }[tipoConfiguracion];
  const anchoHoja = X / nHojas;
  const warnings = [];
  if (anchoHoja > LIMITES_HOJA.anchoMax) warnings.push(`Ancho de hoja (${round1(anchoHoja)}mm) excede el máximo de fábrica (${LIMITES_HOJA.anchoMax}mm).`);
  if (Y > LIMITES_HOJA.altoMax) warnings.push(`Alto de hoja (${Y}mm) excede el máximo de fábrica (${LIMITES_HOJA.altoMax}mm).`);
  return warnings;
}
function round1(n) { return Math.round(n * 10) / 10; }
function round2(n) { return Math.round(n * 100) / 100; }
function round3(n) { return Math.round(n * 1000) / 1000; }

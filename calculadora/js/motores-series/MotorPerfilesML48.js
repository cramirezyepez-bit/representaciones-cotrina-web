/**
 * MotorPerfilesML48.js
 * ------------------------------------------------------------------
 * Lógica de despiece técnico para la Serie ML48 (Mampara Corrediza
 * Diseño Europeo, Corporación Limatambo), migrada 1:1 desde la
 * "TABLA DE DESCUENTOS - SERIE ML48" (ficha técnica oficial, pág. 24).
 *
 * X = ancho del vano (mm) | Y = alto del vano (mm)
 *
 * Perfiles (códigos de catálogo Limatambo):
 *   ML4801 Marco doble corrediza (2 rieles)
 *   ML4802 Marco triple corrediza (3 rieles)
 *   ML4803 Marco de hoja
 *   ML4804 Marco de hoja para insulado (reemplaza ML4803 si el vidrio es insulado)
 *   ML4805 Traslape de hoja
 *   VL4806 Adaptador de hoja (solo en 4 hojas; código compartido con VL48 en la ficha)
 *
 * Restricciones de fábrica:
 *   - Dimensión máxima por hoja: 1500mm (ancho) x 3000mm (alto)
 *   - Peso máximo por hoja: 150 Kg
 *   - Vidrio: monolíticos 6/8/10mm, insulados hasta 23mm
 *   - Marco de 100mm (doble) y 146mm (triple)
 * ------------------------------------------------------------------
 */

export const CONFIGURACIONES_ML48 = {
  DOS_HOJAS: 'DOS_HOJAS',       // C/C o F/C - 2 hojas / 2 rieles
  TRES_HOJAS: 'TRES_HOJAS',     // C/C/C - 3 hojas / 3 rieles
  CUATRO_HOJAS: 'CUATRO_HOJAS'  // F/C/C/F - 4 hojas / 2 rieles
};

const LIMITES_HOJA = { anchoMax: 1500, altoMax: 3000, pesoMaxKg: 150 };
const LONG_VARILLA_M = 6.0; // estándar comercial; ajustar si Limatambo confirma otro valor

export const ACCESORIOS_CATALOGO_ML48 = {
  felpaF48: { nombre: 'F48 Felpa', codigos: { gris: 'RAV0001077', negro: 'RAV0001078' } },
  garruchaCojineteTandem: { nombre: 'Garrucha Cojinete Tandem', codigo: 'RAV0000991' },
  escuadraPivote: { nombre: 'Escuadra Pivote (Marco y Hoja)', codigo: 'RAV0000986' },
  escuadraAlineamiento: { nombre: 'Escuadra de Alineamiento (hoja)', codigo: 'RAV0001079' },
  kitVentana: { nombre: 'Kit Ventana (Guía/Tope/Escuadra PVC)', codigo: 'RAV0001044' },
  guiaSuperiorInferiorPVC: { nombre: 'Guía Superior e Inferior PVC', codigo: 'RAV0000995' },
  seguroManualSinFijacion: { nombre: 'Seguro Manual sin fijación', codigos: { aluminio: 'RAV0001004', negro: 'RAV0001008', blanco: 'RAV0001012' } },
  seguroManualConFijacion: { nombre: 'Seguro Manual con fijación', codigos: { aluminio: 'RAV0001006', negro: 'RAV0001010', blanco: 'RAV0001014' } },
};

/**
 * Calcula el despiece de perfiles ML48 para un vano.
 * @param {Object} p
 * @param {string} p.tipoConfiguracion - CONFIGURACIONES_ML48
 * @param {number} p.ancho - ancho del vano en mm (X)
 * @param {number} p.alto - alto del vano en mm (Y)
 * @param {number} [p.cantidad=1]
 * @param {boolean} [p.insulado=false] - si true, usa ML4804 en vez de ML4803
 */
export function calcularDespieceML48({ tipoConfiguracion, ancho: X, alto: Y, cantidad = 1, insulado = false }) {
  validarConfiguracion(tipoConfiguracion, CONFIGURACIONES_ML48, 'ML48');
  const warnings = validarLimitesHoja(tipoConfiguracion, X, Y);

  let perfiles = [];
  let vidrios = [];

  switch (tipoConfiguracion) {
    case CONFIGURACIONES_ML48.DOS_HOJAS:
      perfiles = [
        perfil('ML4801', 'Marco doble corrediza (horizontal)', X, 2),
        perfil('ML4801', 'Marco doble corrediza (vertical)', Y, 2),
        perfil(insulado ? 'ML4804' : 'ML4803', 'Marco de hoja (horizontal)', X / 2 + 15, 4),
        perfil(insulado ? 'ML4804' : 'ML4803', 'Marco de hoja (vertical)', Y - 56, 4),
        perfil('ML4805', 'Traslape de hoja', Y - 56, 2),
      ];
      vidrios = [glassEntry(X / 2 - 119, Y - 190, 2)];
      break;

    case CONFIGURACIONES_ML48.TRES_HOJAS:
      perfiles = [
        perfil('ML4802', 'Marco triple corrediza (horizontal)', X, 2),
        perfil('ML4802', 'Marco triple corrediza (vertical)', Y, 2),
        perfil(insulado ? 'ML4804' : 'ML4803', 'Marco de hoja (horizontal)', X / 3 + 34, 6),
        perfil(insulado ? 'ML4804' : 'ML4803', 'Marco de hoja (vertical)', Y - 56, 6),
        perfil('ML4805', 'Traslape de hoja', Y - 56, 4),
      ];
      vidrios = [glassEntry(X / 3 - 95, Y - 190, 3)];
      break;

    case CONFIGURACIONES_ML48.CUATRO_HOJAS:
      perfiles = [
        perfil('ML4801', 'Marco doble corrediza (horizontal)', X, 2),
        perfil('ML4801', 'Marco doble corrediza (vertical)', Y, 2),
        perfil(insulado ? 'ML4804' : 'ML4803', 'Marco de hoja (horizontal)', X / 4 + 27, 8),
        perfil(insulado ? 'ML4804' : 'ML4803', 'Marco de hoja (vertical)', Y - 56, 8),
        perfil('ML4805', 'Traslape de hoja', Y - 56, 4),
        perfil('VL4806', 'Adaptador de hoja', Y - 56, 1),
      ];
      vidrios = [glassEntry(X / 4 - 107, Y - 190, 4)];
      break;
  }

  perfiles = perfiles.map(pf => ({ ...pf, cant: pf.cant * cantidad }));
  vidrios = vidrios.map(v => ({ ...v, cant: v.cant * cantidad }));

  const perfilesConCorte = perfiles.map(pf => calcularCompraBarras(pf, LONG_VARILLA_M));
  const areaVidrioM2 = vidrios.reduce((acc, v) => acc + (v.ancho * v.alto / 1_000_000) * v.cant, 0);
  const areaVanoM2 = round2((X * Y / 1_000_000) * cantidad);

  return {
    serie: 'ML48', tipoConfiguracion,
    ancho: X, alto: Y, cantidad, insulado,
    areaVanoM2, areaVidrioM2: round3(areaVidrioM2),
    perfiles: perfilesConCorte,
    vidrios,
    accesoriosSugeridos: sugerirAccesoriosML48(tipoConfiguracion, cantidad),
    limites: LIMITES_HOJA,
    warnings
  };
}

function sugerirAccesoriosML48(tipoConfiguracion, cantidad) {
  const nHojasMoviles = { DOS_HOJAS: 2, TRES_HOJAS: 3, CUATRO_HOJAS: 2 }[tipoConfiguracion];
  return [
    { nombre: 'Garrucha Cojinete Tandem', codigo: ACCESORIOS_CATALOGO_ML48.garruchaCojineteTandem.codigo, cant: nHojasMoviles * 2 * cantidad },
    { nombre: 'Kit Ventana (Guía/Tope/Escuadra)', codigo: ACCESORIOS_CATALOGO_ML48.kitVentana.codigo, cant: 1 * cantidad },
    { nombre: 'F48 Felpa', codigo: ACCESORIOS_CATALOGO_ML48.felpaF48.codigos.negro, cant: null, nota: 'se vende por metro lineal, calcular contra perímetro de hoja' },
  ];
}

/* ------------------------------------------------------------------ */
/* Helpers compartidos (mismo patrón que MotorPerfilesML46.js)         */
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
  const nHojas = { DOS_HOJAS: 2, TRES_HOJAS: 3, CUATRO_HOJAS: 4 }[tipoConfiguracion];
  const anchoHoja = X / nHojas;
  const warnings = [];
  if (anchoHoja > LIMITES_HOJA.anchoMax) warnings.push(`Ancho de hoja (${round1(anchoHoja)}mm) excede el máximo de fábrica (${LIMITES_HOJA.anchoMax}mm).`);
  if (Y > LIMITES_HOJA.altoMax) warnings.push(`Alto de hoja (${Y}mm) excede el máximo de fábrica (${LIMITES_HOJA.altoMax}mm).`);
  return warnings;
}
function round1(n) { return Math.round(n * 10) / 10; }
function round2(n) { return Math.round(n * 100) / 100; }
function round3(n) { return Math.round(n * 1000) / 1000; }

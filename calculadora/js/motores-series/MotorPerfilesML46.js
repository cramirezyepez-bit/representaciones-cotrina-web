/**
 * MotorPerfilesML46.js
 * ------------------------------------------------------------------
 * Lógica de despiece técnico para la Serie ML46 (Mampara Corrediza
 * Diseño Europeo, Corporación Limatambo), migrada 1:1 desde la
 * "TABLA DE DESCUENTOS - SERIE ML46" (ficha técnica oficial, pág. 11).
 *
 * X = ancho del vano (mm) | Y = alto del vano (mm)
 *
 * Perfiles (códigos de catálogo Limatambo):
 *   ML4601 Marco doble corrediza (2 rieles)
 *   ML4604 Adaptador marco triple corrediza (3 rieles)
 *   ML4605 Marco de hoja
 *   ML4602 Marco de hoja para insulado (según ficha, usar en vez de ML4605 si aplica)
 *   ML4603 Traslape
 *   ML4606 Adaptador de hoja (solo en 4 hojas)
 *
 * Restricciones de fábrica:
 *   - Dimensión máxima por hoja: 1500mm (ancho) x 3000mm (alto)
 *   - Peso máximo por hoja: 150 Kg
 *   - Vidrio: monolíticos 6/8/10/12mm, insulados hasta 23mm
 *   - Armado con cortes a 45°, unión con escuadras
 * ------------------------------------------------------------------
 */

export const CONFIGURACIONES_ML46 = {
  DOS_HOJAS: 'DOS_HOJAS',       // C/C o F/C - 2 hojas / 2 rieles
  TRES_HOJAS: 'TRES_HOJAS',     // C/C/C - 3 hojas / 3 rieles
  CUATRO_HOJAS: 'CUATRO_HOJAS'  // F/C/C/F - 4 hojas / 2 rieles
};

const LIMITES_HOJA = { anchoMax: 1500, altoMax: 3000, pesoMaxKg: 150 };
const LONG_VARILLA_M = 6.0; // estándar comercial; ajustar si Limatambo confirma otro valor

export const ACCESORIOS_CATALOGO_ML46 = {
  felpaF46: { nombre: 'F46 Felpa', codigos: { gris: 'RAV0001017', negro: 'RAV0001018' } },
  garruchaCojineteTandem: { nombre: 'Garrucha Cojinete Tandem (150Kg)', codigo: 'RAV0000989' },
  escuadraPivote: {
    nombre: 'Escuadra Pivote',
    codigos: { marcoML4601: 'RAV0000983', supMarcoML4604: 'RAV0000984', hoja: 'RAV0000985' }
  },
  escuadraAlineamiento: { nombre: 'Escuadra de Alineamiento (hoja ML4602/ML4605)', codigo: 'RAV0001040' },
  kitMampara: { nombre: 'Kit Mampara (Guía/Tope/Cortaviento PVC)', codigo: 'RAV0001026' },
  contraseguro: { nombre: 'Contraseguro', codigo: 'RAV0001016' },
  lenguetaSeguros: { nombre: 'Lengüeta de Seguros', codigo: 'RAV0001015' },
  seguroManualSinFijacion: { nombre: 'Seguro Manual sin fijación', codigos: { aluminio: 'RAV0001004', negro: 'RAV0001008', blanco: 'RAV0001012' } },
  seguroManualConFijacion: { nombre: 'Seguro Manual con fijación', codigos: { aluminio: 'RAV0001006', negro: 'RAV0001010', blanco: 'RAV0001014' } },
};

/**
 * Calcula el despiece de perfiles ML46 para un vano.
 * @param {Object} p
 * @param {string} p.tipoConfiguracion - CONFIGURACIONES_ML46
 * @param {number} p.ancho - ancho del vano en mm (X)
 * @param {number} p.alto - alto del vano en mm (Y)
 * @param {number} [p.cantidad=1]
 * @param {boolean} [p.insulado=false] - si true, usa ML4602 en vez de ML4605
 */
export function calcularDespieceML46({ tipoConfiguracion, ancho: X, alto: Y, cantidad = 1, insulado = false }) {
  validarConfiguracion(tipoConfiguracion, CONFIGURACIONES_ML46, 'ML46');
  const warnings = validarLimitesHoja(tipoConfiguracion, X, Y);

  let perfiles = [];
  let vidrios = [];

  switch (tipoConfiguracion) {
    case CONFIGURACIONES_ML46.DOS_HOJAS:
      perfiles = [
        perfil('ML4601', 'Marco doble corrediza (horizontal)', X, 2),
        perfil('ML4601', 'Marco doble corrediza (vertical)', Y, 2),
        perfil(insulado ? 'ML4602' : 'ML4605', 'Marco de hoja (horizontal)', X / 2 - 2, 4),
        perfil(insulado ? 'ML4602' : 'ML4605', 'Marco de hoja (vertical)', Y - 77, 4),
        perfil('ML4603', 'Traslape', Y - 77, 2),
      ];
      vidrios = [glassEntry(X / 2 - 124, Y - 200, 2)];
      break;

    case CONFIGURACIONES_ML46.TRES_HOJAS:
      perfiles = [
        perfil('ML4601', 'Marco doble corrediza (horizontal)', X, 2),
        perfil('ML4601', 'Marco doble corrediza (vertical)', Y, 2),
        perfil('ML4604', 'Adaptador marco triple corrediza (horizontal)', X, 2),
        perfil('ML4604', 'Adaptador marco triple corrediza (vertical)', Y, 2),
        perfil(insulado ? 'ML4602' : 'ML4605', 'Marco de hoja (horizontal)', X / 3 + 23, 6),
        perfil(insulado ? 'ML4602' : 'ML4605', 'Marco de hoja (vertical)', Y - 77, 6),
        perfil('ML4603', 'Traslape', Y - 77, 4),
      ];
      vidrios = [glassEntry(X / 3 - 98, Y - 200, 3)];
      break;

    case CONFIGURACIONES_ML46.CUATRO_HOJAS:
      perfiles = [
        perfil('ML4601', 'Marco doble corrediza (horizontal)', X, 2),
        perfil('ML4601', 'Marco doble corrediza (vertical)', Y, 2),
        perfil(insulado ? 'ML4602' : 'ML4605', 'Marco de hoja (horizontal)', X / 4 + 17, 8),
        perfil(insulado ? 'ML4602' : 'ML4605', 'Marco de hoja (vertical)', Y - 77, 8),
        perfil('ML4603', 'Traslape', Y - 77, 4),
        perfil('ML4606', 'Adaptador de hoja', Y - 77, 1),
      ];
      vidrios = [glassEntry(X / 4 - 105, Y - 200, 4)];
      break;
  }

  perfiles = perfiles.map(pf => ({ ...pf, cant: pf.cant * cantidad }));
  vidrios = vidrios.map(v => ({ ...v, cant: v.cant * cantidad }));

  const perfilesConCorte = perfiles.map(pf => calcularCompraBarras(pf, LONG_VARILLA_M));
  const areaVidrioM2 = vidrios.reduce((acc, v) => acc + (v.ancho * v.alto / 1_000_000) * v.cant, 0);
  const areaVanoM2 = round2((X * Y / 1_000_000) * cantidad);

  return {
    serie: 'ML46', tipoConfiguracion,
    ancho: X, alto: Y, cantidad, insulado,
    areaVanoM2, areaVidrioM2: round3(areaVidrioM2),
    perfiles: perfilesConCorte,
    vidrios,
    accesoriosSugeridos: sugerirAccesoriosML46(tipoConfiguracion, cantidad),
    limites: LIMITES_HOJA,
    warnings
  };
}

function sugerirAccesoriosML46(tipoConfiguracion, cantidad) {
  const nHojasMoviles = { DOS_HOJAS: 2, TRES_HOJAS: 3, CUATRO_HOJAS: 2 }[tipoConfiguracion];
  // Nota: en CUATRO_HOJAS la tipología típica F/C/C/F tiene 2 correderas centrales;
  // ajustar nHojasMoviles según la tipología real elegida por el cliente.
  return [
    { nombre: 'Garrucha Cojinete Tandem 150Kg', codigo: ACCESORIOS_CATALOGO_ML46.garruchaCojineteTandem.codigo, cant: nHojasMoviles * 2 * cantidad },
    { nombre: 'Kit Mampara (Guía/Tope/Cortaviento)', codigo: ACCESORIOS_CATALOGO_ML46.kitMampara.codigo, cant: 1 * cantidad },
    { nombre: 'F46 Felpa', codigo: ACCESORIOS_CATALOGO_ML46.felpaF46.codigos.negro, cant: null, nota: 'se vende por metro lineal, calcular contra perímetro de hoja' },
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

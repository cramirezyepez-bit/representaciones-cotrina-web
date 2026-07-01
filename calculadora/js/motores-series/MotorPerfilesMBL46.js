/**
 * MotorPerfilesMBL46.js
 * ------------------------------------------------------------------
 * Lógica de despiece técnico para la Serie MBL46 (Puerta Batiente
 * Diseño Europeo, Corporación Limatambo), migrada 1:1 desde la
 * "TABLA DE DESCUENTOS - SERIE MBL46" (ficha técnica oficial, pág. 31).
 *
 * X = ancho del vano (mm) | Y = alto del vano (mm)
 *
 * Perfiles (códigos de catálogo Limatambo):
 *   MBL4601 Marco lateral
 *   MBL4604 Montante de hoja pesada
 *   MBL4609 Adaptador cristal simple
 *   MBL4610 Tope central (solo doble batiente)
 *
 * Restricciones de fábrica:
 *   - Dimensión máxima por hoja: 1000mm (ancho) x 2400mm (alto)
 *   - Peso máximo por hoja: 150 Kg
 *   - Vidrio: monolíticos 6/8/10mm, insulados hasta 20mm
 *   - Sección de marco: 80mm
 * ------------------------------------------------------------------
 */

export const CONFIGURACIONES_MBL46 = {
  UNA_HOJA: 'UNA_HOJA',     // Batiente simple
  DOS_HOJAS: 'DOS_HOJAS'    // Doble batiente
};

const LIMITES_HOJA = { anchoMax: 1000, altoMax: 2400, pesoMaxKg: 150 };
const LONG_VARILLA_M = 6.0; // estándar comercial; ajustar si Limatambo confirma otro valor

export const ACCESORIOS_CATALOGO_MBL46 = {
  bisagra: { nombre: 'Bisagra Serie MBL46', codigos: { blanco: 'RAF0000669', aluminio: 'RAF0000667', negro: 'RAF0000668' } },
  cerraduraLlaveManija: { nombre: 'Cerradura con llave + manija', codigos: { blanco: 'RAF0000671', aluminio: 'RAV0001081', negro: 'RAV0001082' } },
  felpaF15: { nombre: 'F15 Felpa', codigos: { gris: 'RAV0000310', negro: 'RAV0000314' } },
};

/**
 * Calcula el despiece de perfiles MBL46 para un vano.
 * @param {Object} p
 * @param {string} p.tipoConfiguracion - CONFIGURACIONES_MBL46
 * @param {number} p.ancho - ancho del vano en mm (X)
 * @param {number} p.alto - alto del vano en mm (Y)
 * @param {number} [p.cantidad=1]
 */
export function calcularDespieceMBL46({ tipoConfiguracion, ancho: X, alto: Y, cantidad = 1 }) {
  validarConfiguracion(tipoConfiguracion, CONFIGURACIONES_MBL46, 'MBL46');
  const warnings = validarLimitesHoja(tipoConfiguracion, X, Y);

  let perfiles = [];
  let vidrios = [];

  switch (tipoConfiguracion) {
    case CONFIGURACIONES_MBL46.UNA_HOJA:
      perfiles = [
        perfil('MBL4601', 'Marco lateral (horizontal)', X, 1),
        perfil('MBL4601', 'Marco lateral (vertical)', Y, 4),
        perfil('MBL4604', 'Montante de hoja pesada (horizontal)', X - 36, 1),
        perfil('MBL4604', 'Montante de hoja pesada (vertical)', Y - 28, 4),
        perfil('MBL4609', 'Adaptador cristal simple (horizontal)', X - 235, 2),
        perfil('MBL4609', 'Adaptador cristal simple (vertical)', Y - 227, 2),
        perfil('MBL4610', 'Tope central (vertical)', Y - 10, 1),
      ];
      vidrios = [glassEntry(X - 210, Y - 201, 1)];
      break;

    case CONFIGURACIONES_MBL46.DOS_HOJAS:
      perfiles = [
        perfil('MBL4601', 'Marco lateral (horizontal)', (X - 39) / 2, 1),
        perfil('MBL4601', 'Marco lateral (vertical)', Y, 4),
        perfil('MBL4604', 'Montante de hoja pesada (horizontal)', (X - 39) / 2, 2),
        perfil('MBL4604', 'Montante de hoja pesada (vertical)', Y - 28, 4),
        perfil('MBL4609', 'Adaptador cristal simple (horizontal)', (X - 437) / 2, 2),
        perfil('MBL4609', 'Adaptador cristal simple (vertical)', Y - 227, 2),
        perfil('MBL4610', 'Tope central (vertical)', Y - 10, 1),
      ];
      vidrios = [glassEntry((X - 368) / 2, Y - 201, 2)];
      break;
  }

  perfiles = perfiles.map(pf => ({ ...pf, cant: pf.cant * cantidad }));
  vidrios = vidrios.map(v => ({ ...v, cant: v.cant * cantidad }));

  const perfilesConCorte = perfiles.map(pf => calcularCompraBarras(pf, LONG_VARILLA_M));
  const areaVidrioM2 = vidrios.reduce((acc, v) => acc + (v.ancho * v.alto / 1_000_000) * v.cant, 0);
  const areaVanoM2 = round2((X * Y / 1_000_000) * cantidad);

  return {
    serie: 'MBL46', tipoConfiguracion,
    ancho: X, alto: Y, cantidad,
    areaVanoM2, areaVidrioM2: round3(areaVidrioM2),
    perfiles: perfilesConCorte,
    vidrios,
    accesoriosSugeridos: sugerirAccesoriosMBL46(tipoConfiguracion, cantidad),
    limites: LIMITES_HOJA,
    warnings
  };
}

function sugerirAccesoriosMBL46(tipoConfiguracion, cantidad) {
  const nHojas = { UNA_HOJA: 1, DOS_HOJAS: 2 }[tipoConfiguracion];
  return [
    { nombre: 'Bisagra Serie MBL46', codigo: ACCESORIOS_CATALOGO_MBL46.bisagra.codigos.negro, cant: nHojas * 3 * cantidad, nota: '3 bisagras por hoja, estándar de fábrica' },
    { nombre: 'Cerradura con llave + manija', codigo: ACCESORIOS_CATALOGO_MBL46.cerraduraLlaveManija.codigos.negro, cant: 1 * cantidad },
    { nombre: 'F15 Felpa', codigo: ACCESORIOS_CATALOGO_MBL46.felpaF15.codigos.negro, cant: null, nota: 'se vende por metro lineal, calcular contra perímetro de marco' },
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
  const nHojas = { UNA_HOJA: 1, DOS_HOJAS: 2 }[tipoConfiguracion];
  const anchoHoja = X / nHojas;
  const warnings = [];
  if (anchoHoja > LIMITES_HOJA.anchoMax) warnings.push(`Ancho de hoja (${round1(anchoHoja)}mm) excede el máximo de fábrica (${LIMITES_HOJA.anchoMax}mm).`);
  if (Y > LIMITES_HOJA.altoMax) warnings.push(`Alto de hoja (${Y}mm) excede el máximo de fábrica (${LIMITES_HOJA.altoMax}mm).`);
  return warnings;
}
function round1(n) { return Math.round(n * 10) / 10; }
function round2(n) { return Math.round(n * 100) / 100; }
function round3(n) { return Math.round(n * 1000) / 1000; }

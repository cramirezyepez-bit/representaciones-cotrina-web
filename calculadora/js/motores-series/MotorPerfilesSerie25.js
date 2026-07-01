/**
 * MotorPerfilesSerie25.js
 * ------------------------------------------------------------------
 * Lógica de despiece técnico para la Serie 25 (ventanas/mamparas correderas),
 * migrada 1:1 desde las fórmulas del archivo SERIE25_V5.xlsx
 * (hojas: "02 hojas", "03 hojas", "03 hojas (FIJO EXTERIOR)", "04 hojas", "06 hojas").
 *
 * No copia resultados: replica las reglas de descuento de cada perfil,
 * para que el sistema pueda calcular cualquier medida, no solo las de ejemplo.
 *
 * Códigos de perfil (referencia catálogo, según encabezados del Excel):
 *   2501 Riel superior | 2502 Riel inferior | 2509 Jamba
 *   2505 Zócalo        | 2504 Cabezal       | 2510 Parante
 *   2507 Traslapo
 *
 * Uso:
 *   const resultado = calcularDespieceSerie25({
 *     tipoConfiguracion: 'DOS_HOJAS', // ver CONFIGURACIONES
 *     ancho: 1972, alto: 1332, cantidad: 1
 *   });
 * ------------------------------------------------------------------
 */

export const CONFIGURACIONES_SERIE25 = {
  DOS_HOJAS: 'DOS_HOJAS',                 // 2 hojas correderas
  TRES_HOJAS: 'TRES_HOJAS',               // 1 fijo interior + 2 correderas
  TRES_HOJAS_FIJO_EXT: 'TRES_HOJAS_FIJO_EXT', // 1 fijo exterior + 2 correderas
  CUATRO_HOJAS: 'CUATRO_HOJAS',           // 4 hojas correderas
  SEIS_HOJAS: 'SEIS_HOJAS'                // 2 fijos exteriores + 4 correderas
};

// Precio de venta por m² y longitud de varilla comercial, por configuración
// (valores base del Excel; deben venir del tarifario real de Jorge cuando esté listo)
const PARAMS_CONFIG = {
  DOS_HOJAS:            { precioM2: 360, longVarilla: 6.00, nHojas: 2 },
  TRES_HOJAS:           { precioM2: 380, longVarilla: 6.00, nHojas: 3 },
  TRES_HOJAS_FIJO_EXT:  { precioM2: 410, longVarilla: 5.98, nHojas: 3 },
  CUATRO_HOJAS:         { precioM2: 410, longVarilla: 6.00, nHojas: 4 },
  SEIS_HOJAS:           { precioM2: null, longVarilla: 5.95, nHojas: 6 } // precio no definido en el Excel fuente
};

/**
 * Calcula el despiece de perfiles para un vano de Serie 25.
 * @param {Object} p
 * @param {string} p.tipoConfiguracion - una de CONFIGURACIONES_SERIE25
 * @param {number} p.ancho - ancho del vano en mm
 * @param {number} p.alto - alto del vano en mm
 * @param {number} p.cantidad - cantidad de vanos idénticos
 * @param {number} [p.precioM2] - override de precio, si no se usa el default de config
 * @returns {Object} despiece completo: perfiles, vidrio, accesorios, precio
 */
export function calcularDespieceSerie25({ tipoConfiguracion, ancho, alto, cantidad = 1, precioM2 }) {
  if (!PARAMS_CONFIG[tipoConfiguracion]) {
    throw new Error(`Configuración desconocida: ${tipoConfiguracion}`);
  }
  const cfg = PARAMS_CONFIG[tipoConfiguracion];
  const areaM2 = (ancho * alto / 1_000_000) * cantidad;
  const precio = (precioM2 ?? cfg.precioM2);

  let perfiles, vidrios, accesorios;

  switch (tipoConfiguracion) {
    case CONFIGURACIONES_SERIE25.DOS_HOJAS:
      ({ perfiles, vidrios, accesorios } = despieceDosHojas(ancho, alto, cantidad));
      break;
    case CONFIGURACIONES_SERIE25.TRES_HOJAS:
      ({ perfiles, vidrios, accesorios } = despieceTresHojas(ancho, alto, cantidad));
      break;
    case CONFIGURACIONES_SERIE25.TRES_HOJAS_FIJO_EXT:
      ({ perfiles, vidrios, accesorios } = despieceTresHojasFijoExt(ancho, alto, cantidad));
      break;
    case CONFIGURACIONES_SERIE25.CUATRO_HOJAS:
      ({ perfiles, vidrios, accesorios } = despieceCuatroHojas(ancho, alto, cantidad));
      break;
    case CONFIGURACIONES_SERIE25.SEIS_HOJAS:
      ({ perfiles, vidrios, accesorios } = despieceSeisHojas(ancho, alto, cantidad));
      break;
  }

  // Optimización de corte: barras comerciales necesarias por perfil
  const perfilesConCorte = perfiles.map(p => calcularCompraBarras(p, cfg.longVarilla));

  return {
    tipoConfiguracion,
    ancho, alto, cantidad,
    areaM2: round2(areaM2),
    precioVenta: precio != null ? round2(areaM2 * precio) : null,
    perfiles: perfilesConCorte,
    vidrios,
    accesorios,
    longVarillaComercial: cfg.longVarilla
  };
}

/* ------------------------------------------------------------------ */
/* DOS HOJAS (hoja "02 hojas" del Excel)                              */
/* ------------------------------------------------------------------ */
function despieceDosHojas(ancho, alto, cant) {
  const perfiles = [
    { codigo: 2501, nombre: 'RIEL SUPERIOR', largo: ancho - 16, cant: 1 * cant },
    { codigo: 2502, nombre: 'RIEL INFERIOR', largo: ancho - 16, cant: 1 * cant },
    { codigo: 2509, nombre: 'JAMBA',         largo: alto,       cant: 2 * cant },
    { codigo: 2505, nombre: 'ZOCALO',        largo: (ancho / 2) + 1, cant: 2 * cant },
    { codigo: 2504, nombre: 'CABEZAL',       largo: (ancho / 2) + 3, cant: 2 * cant },
    { codigo: 2510, nombre: 'PARANTE',       largo: alto - 33,  cant: 2 * cant },
    { codigo: 2507, nombre: 'TRASLAPO',      largo: alto - 33,  cant: 2 * cant },
  ];
  const vidrios = [
    { nombre: 'VIDRIO HOJA CORREDIZA', ancho: (ancho / 2) - 60, alto: alto - 123, cant: 2 * cant }
  ];
  const accesorios = [
    { nombre: 'GARRUCHAS', cant: cant * 4 },
    { nombre: 'SEGURO AUTO', cant: cant * 2 },
    { nombre: 'GUIAS', cant: cant * 8 },
  ];
  return { perfiles, vidrios, accesorios };
}

/* ------------------------------------------------------------------ */
/* TRES HOJAS: 1 fijo interior + 2 correderas (hoja "03 hojas")       */
/* ------------------------------------------------------------------ */
function despieceTresHojas(ancho, alto, cant) {
  const perfiles = [
    { codigo: 2501, nombre: 'RIEL SUPERIOR', largo: ancho - 17, cant: 1 * cant },
    { codigo: 2502, nombre: 'RIEL INFERIOR', largo: ancho - 17, cant: 1 * cant },
    { codigo: 2509, nombre: 'JAMBA',         largo: alto,       cant: 3 * cant },
    { codigo: 2505, nombre: 'ZOCALO',        largo: (ancho / 3) + 13, cant: 3 * cant },
    { codigo: 2504, nombre: 'CABEZAL',       largo: (ancho / 3) + 15, cant: 2 * cant },
    { codigo: 2510, nombre: 'PARANTE',       largo: alto - 33,  cant: 4 * cant },
  ];
  const vidrios = [
    { nombre: 'VIDRIO FIJO',      ancho: (ancho / 3) - 41, alto: alto - 125, cant: 1 * cant },
    { nombre: 'VIDRIO CORREDIZO', ancho: (ancho / 3) - 51, alto: alto - 125, cant: 2 * cant },
  ];
  const accesorios = [
    { nombre: 'GARRUCHAS', cant: cant * 4 },
    { nombre: 'SEGURO AUTO', cant: cant * 2 },
    { nombre: 'GUIAS', cant: cant * 8 },
  ];
  return { perfiles, vidrios, accesorios };
}

/* ------------------------------------------------------------------ */
/* TRES HOJAS FIJO EXTERIOR (hoja "03 hojas (FIJO EXTERIOR)")          */
/* Perfiles de zócalo/cabezal/parante/traslapo se suman entre el      */
/* tramo corredizo y el tramo fijo exterior (dos sub-series por vano) */
/* ------------------------------------------------------------------ */
function despieceTresHojasFijoExt(ancho, alto, cant) {
  const perfiles = [
    { codigo: 2501, nombre: 'RIEL SUPERIOR', largo: ancho - 17, cant: 1 * cant },
    { codigo: 2502, nombre: 'RIEL INFERIOR', largo: ancho - 17, cant: 1 * cant },
    { codigo: 2509, nombre: 'JAMBA',         largo: alto,       cant: 2 * cant },
    // ZOCALO: corredizo + fijo exterior
    { codigo: 2505, nombre: 'ZOCALO (corredizo)', largo: (ancho / 3) + 9,  cant: 2 * cant },
    { codigo: 2505, nombre: 'ZOCALO (fijo ext.)',  largo: (ancho / 3) + 31, cant: 1 * cant },
    // CABEZAL: corredizo + fijo exterior
    { codigo: 2504, nombre: 'CABEZAL (corredizo)', largo: (ancho / 3) + 11, cant: 1 * cant },
    { codigo: 2504, nombre: 'CABEZAL (fijo ext.)',  largo: (ancho / 3) + 31, cant: 1 * cant },
    // PARANTE: corredizo + fijo exterior
    { codigo: 2510, nombre: 'PARANTE (corredizo)', largo: alto - 33, cant: 3 * cant },
    { codigo: 2510, nombre: 'PARANTE (fijo ext.)',  largo: alto,      cant: 1 * cant }, // = ALTO tal cual (Y15)
    // TRASLAPO: corredizo + fijo exterior
    { codigo: 2507, nombre: 'TRASLAPO (corredizo)', largo: alto - 33, cant: 1 * cant },
  ];
  const vidrios = [
    { nombre: 'VIDRIO CORREDIZO', ancho: (ancho / 3) - 50, alto: alto - 121, cant: 2 * cant },
    { nombre: 'VIDRIO FIJO',      ancho: (ancho / 3) - 32, alto: alto - 89,  cant: 1 * cant },
  ];
  const accesorios = [
    { nombre: 'GARRUCHAS', cant: cant * 4 },
    { nombre: 'SEGURO AUTO', cant: cant * 2 },
  ];
  return { perfiles, vidrios, accesorios };
}

/* ------------------------------------------------------------------ */
/* CUATRO HOJAS (hoja "04 hojas")                                     */
/* ------------------------------------------------------------------ */
function despieceCuatroHojas(ancho, alto, cant) {
  const perfiles = [
    { codigo: 2501, nombre: 'RIEL SUPERIOR', largo: ancho - 17, cant: 1 * cant },
    { codigo: 2502, nombre: 'RIEL INFERIOR', largo: ancho - 17, cant: 1 * cant },
    { codigo: 2509, nombre: 'JAMBA',         largo: alto,       cant: 2 * cant },
    { codigo: 2505, nombre: 'ZOCALO',        largo: (ancho / 4) + 7,  cant: 2 * cant },
    { codigo: 2504, nombre: 'CABEZAL',       largo: (ancho / 4) + 9,  cant: 4 * cant },
    { codigo: 2521, nombre: 'ADAPTADOR',     largo: alto - 33,  cant: 1 * cant },
    { codigo: 2507, nombre: 'TRASLAPO',      largo: alto - 33,  cant: 4 * cant },
  ];
  const vidrios = [
    { nombre: 'VIDRIO HOJA CORREDIZA', ancho: (ancho / 4) - 59, alto: alto - 122, cant: 4 * cant }
  ];
  const accesorios = [
    { nombre: 'GARRUCHAS', cant: cant * 4 },
    { nombre: 'SEGURO AUTO', cant: cant * 2 },
    { nombre: 'GUIAS', cant: cant * 8 },
  ];
  return { perfiles, vidrios, accesorios };
}

/* ------------------------------------------------------------------ */
/* SEIS HOJAS: 2 fijos exteriores + 4 correderas (hoja "06 hojas")    */
/* ------------------------------------------------------------------ */
function despieceSeisHojas(ancho, alto, cant) {
  const perfiles = [
    { codigo: 2501, nombre: 'RIEL SUPERIOR', largo: ancho - 17, cant: 1 * cant },
    { codigo: 2502, nombre: 'RIEL INFERIOR', largo: ancho - 17, cant: 1 * cant },
    { codigo: 2509, nombre: 'JAMBA',         largo: alto,       cant: 2 * cant },
    { codigo: 2505, nombre: 'ZOCALO (corredizo)', largo: (ancho / 6) + 12, cant: 4 * cant },
    { codigo: 2505, nombre: 'ZOCALO (fijo ext.)',  largo: (ancho / 6) + 31, cant: 2 * cant },
    { codigo: 2504, nombre: 'CABEZAL (corredizo)', largo: (ancho / 6) + 14, cant: 2 * cant },
    { codigo: 2504, nombre: 'CABEZAL (fijo ext.)',  largo: (ancho / 6) + 31, cant: 2 * cant },
    { codigo: 2507, nombre: 'TRASLAPO', largo: alto - 33, cant: 6 * cant },
    { codigo: 2510, nombre: 'PARANTE (fijo ext.)', largo: alto, cant: 2 * cant },
    { codigo: 2999, nombre: 'ADAPTADOR', largo: alto - 33, cant: 1 * cant },
  ];
  const vidrios = [
    { nombre: 'VIDRIO CORREDIZO', ancho: (ancho / 6) - 58, alto: alto - 125, cant: 4 * cant },
    { nombre: 'VIDRIO FIJO',      ancho: (ancho / 6) - 38, alto: alto - 92,  cant: 2 * cant },
  ];
  const accesorios = [
    { nombre: 'GARRUCHAS', cant: cant * 8 },
    { nombre: 'SEGURO AUTO', cant: cant * 2 },
    { nombre: 'GUIAS', cant: cant * 20 },
  ];
  return { perfiles, vidrios, accesorios };
}

/* ------------------------------------------------------------------ */
/* Optimización de corte / compra de barras comerciales                */
/* Replica: SUMPRODUCT(cant, largo)/1000, ROUNDUP(metros/varilla,0)    */
/* ------------------------------------------------------------------ */
function calcularCompraBarras(perfil, longVarillaM) {
  // Si hay varias entradas del mismo perfil lógico (ej. zócalo corredizo+fijo),
  // el llamador debe pre-sumarlas si quiere una única línea de compra;
  // aquí se trata cada objeto de perfil individualmente.
  const metrosNecesarios = round3((perfil.largo * perfil.cant) / 1000);
  const varillasAComprar = Math.ceil(metrosNecesarios / longVarillaM);
  const metrosComprados = varillasAComprar * longVarillaM;
  const sobranteM = round3(metrosComprados - metrosNecesarios);

  return {
    ...perfil,
    metrosNecesarios,
    varillasAComprar,
    sobranteM
  };
}

function round2(n) { return Math.round(n * 100) / 100; }
function round3(n) { return Math.round(n * 1000) / 1000; }

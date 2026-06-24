/* ============================================================
   REGLASCALCULO.JS — Motor de cálculo paramétrico
   ============================================================
   MIGRACIÓN A MODELO DE PAÑOS (FRAME + PANELS + OPENINGS):
   El motor ya no calcula "un factor de apertura/vidrio ponderado
   sobre el costo base total del ítem" — eso era una aproximación
   correcta mientras todo el vano compartía un único vidrio, pero
   deja de tener sentido en cuanto cada paño puede llevar un
   vidrio distinto (ej. [F][M][M][F] con el F en vidrio templado
   y el M en laminado). Ahora el costo se calcula PASO POR PAÑO:
   cada paño tiene su propia área, su propio costo base proporcional
   a esa área, y sus propios factores de apertura/vidrio/perfil
   aplicados solo sobre ESE costo base — y luego se suman.

   COMPATIBILIDAD: un ítem "simple" (sin configurar paños a mano)
   se resuelve, vía resolverPanos() en panos.js, como una lista de
   UN solo paño que ocupa todo el ancho del vano con el vidrio del
   ítem. Para ese caso, costoBasePaño = costoBase del ítem completo
   y el resultado es exactamente el mismo número que el motor
   anterior — no hay regresión para los miles de cotizaciones que
   ya se hicieron con el modelo de un solo vidrio por ítem.
   ============================================================ */

import { TIPOS_SOLUCION, AREA_MINIMA_POR_UNIDAD, COSTO_MINIMO_PROYECTO, FACTOR_INSTALACION, FACTOR_URGENCIA, obtenerFactorApertura, TIPOS_APERTURA } from './catalogos.js';
import { obtenerFactorVidrio, obtenerPrecioVidrioM2, describirVidrio } from './vidrios.js';
import { obtenerFactorPerfil } from './perfiles.js';
import { calcularSubtotalAccesorios, calcularFactorAccesoriosLegacy } from './accesorios.js';
import { calcularAccesoriosAutomaticos } from './despieceTecnico.js';
import { resolverPanos, sumaAnchosPanos, notacionPanos } from './panos.js';

/**
 * Calcula el costo y despiece técnico de UN paño dentro de un
 * ítem. `areaPano` ya viene resuelta (ancho del paño × alto del
 * vano o alto propio del paño), multiplicada por la cantidad de
 * unidades del ítem completo (un ítem con cantidad=3 repite la
 * misma configuración de paños 3 veces).
 */
function calcularPano(pano, { refBase, perfilSerie, accesoriosLegacy, cantidad, altoVano }) {
  const anchoPano = Number(pano.anchoModulo) || 0;
  const altoPano = pano.altoModulo != null ? Number(pano.altoModulo) : Number(altoVano) || 0;

  const areaPanoPorUnidad = Math.max(anchoPano * altoPano, 0); // el mínimo de 1m² se aplica al ítem completo, no por paño
  const areaPanoTotal = areaPanoPorUnidad * Number(cantidad);

  const precioBaseM2Promedio = (refBase.costoM2Min + refBase.costoM2Max) / 2;
  const costoBasePano = precioBaseM2Promedio * areaPanoTotal;

  const factorApertura = obtenerFactorApertura(pano.tipoApertura);
  const factorVidrio = obtenerFactorVidrio(pano.vidrioCategoria, pano.vidrioVariante);
  const factorPerfil = obtenerFactorPerfil(perfilSerie);
  const factorAccesoriosLegacy = calcularFactorAccesoriosLegacy(accesoriosLegacy);

  const adicionalApertura = costoBasePano * factorApertura;
  const adicionalVidrio = costoBasePano * factorVidrio;
  const adicionalPerfil = costoBasePano * factorPerfil;
  const adicionalAccesoriosLegacy = costoBasePano * factorAccesoriosLegacy;

  // Precio REAL de vidrio (desacoplado del tipo de sistema, ver vidrios.js)
  // — SOLO informativo para la tabla de materiales (rules.js). No participa
  // del cálculo de costoBasePano/subtotalTecnicoPano hasta que se recalibre
  // con datos completos de perfilería (ver Excel de carga masiva).
  const vidrioRealEstimado = obtenerPrecioVidrioM2(pano.vidrioCategoria, pano.vidrioVariante) * areaPanoTotal;

  // Despiece técnico (perfiles ml + accesorios reales) por paño: el
  // ancho/alto de la geometría es el del paño, no el del vano completo,
  // así un paño fijo angosto no hereda los rodajes de su vecino corredizo.
  const despieceAuto = calcularAccesoriosAutomaticos({
    tipoApertura: pano.tipoApertura, composicion: null, esMixto: false,
    ancho: anchoPano, alto: altoPano, cantidad,
  });
  const subtotalAccesoriosAuto = calcularSubtotalAccesorios(despieceAuto.lineas);

  const subtotalTecnicoPano = costoBasePano + adicionalApertura + adicionalVidrio + adicionalPerfil
    + adicionalAccesoriosLegacy + subtotalAccesoriosAuto;

  return {
    tipoApertura: pano.tipoApertura,
    nombreApertura: TIPOS_APERTURA[pano.tipoApertura] ? TIPOS_APERTURA[pano.tipoApertura].nombre : pano.tipoApertura,
    anchoModulo: anchoPano, altoModulo: altoPano,
    areaPanoPorUnidad, areaPanoTotal,
    vidrioCategoria: pano.vidrioCategoria, vidrioVariante: pano.vidrioVariante,
    nombreVidrio: describirVidrio(pano.vidrioCategoria, pano.vidrioVariante),
    costoBasePano, adicionalApertura, adicionalVidrio, adicionalPerfil, adicionalAccesoriosLegacy,
    vidrioRealEstimado,
    despiecePerfiles: despieceAuto.despiece,
    accesoriosAuto: despieceAuto.lineas,
    subtotalAccesoriosAuto,
    subtotalTecnicoPano,
  };
}

/**
 * Calcula el costo de UN ítem del proyecto, como la suma de sus
 * paños (ver resolverPanos en panos.js para cómo se resuelve un
 * ítem simple, una composición legacy, o paños explícitos).
 *
 * @param {Object} item - Datos del ítem:
 *   tipoSolucion, ancho, alto, cantidad,
 *   tipoApertura / composicion / panos — ver panos.js,
 *   vidrioCategoria, vidrioVariante (usados solo si el ítem no
 *     define paños propios, como vidrio único de respaldo),
 *   perfilSerie, perfilColor,
 *   accesorios: [{clave, cantidad}]  (nuevo modelo, alcance ítem completo)
 *   accesoriosLegacy: ['herrajePremium', ...] (checkboxes antiguos, opcional)
 * @returns {Object} desglose completo del costo del ítem, con `panosCalculados`
 *   detallando cada paño individual para la UI y el PDF.
 */
export function calcularItem(item) {
  const {
    tipoSolucion,
    ancho = 0,
    alto = 0,
    cantidad = 1,
    tipoApertura = 'fijo',
    composicion = null,
    vidrioCategoria,
    vidrioVariante,
    perfilSerie = 'noAplica',
    accesorios = [],
    accesoriosLegacy = [],
  } = item;

  const refBase = TIPOS_SOLUCION[tipoSolucion];
  if (!refBase) {
    throw new Error(`Tipo de solución desconocido: "${tipoSolucion}"`);
  }

  const panos = resolverPanos(item);
  const esMixto = panos.length > 1;

  if (esMixto) {
    const sumaAnchos = sumaAnchosPanos(panos);
    const toleranciaCm = 0.01 * panos.length;
    if (Math.abs(sumaAnchos - Number(ancho)) > toleranciaCm) {
      throw new Error(
        `La suma de anchos de los paños (${sumaAnchos.toFixed(2)} m) no coincide con el ` +
        `ancho total del ítem (${Number(ancho).toFixed(2)} m). Revisa la configuración.`
      );
    }
  }

  const panosCalculados = panos.map(p => calcularPano(p, { refBase, perfilSerie, accesoriosLegacy, cantidad, altoVano: alto }));

  // Área con mínimo facturable por unidad aplicado al VANO completo
  // (regla original preservada: un vano pequeño sigue facturando
  // como mínimo 1 m² por unidad, sin importar cuántos paños tenga).
  const areaPorUnidadSinMinimo = panosCalculados.reduce((acc, p) => acc + p.areaPanoPorUnidad, 0);
  const areaPorUnidad = Math.max(areaPorUnidadSinMinimo, AREA_MINIMA_POR_UNIDAD);
  const areaTotal = areaPorUnidad * Number(cantidad);

  // Si el área real cae por debajo del mínimo facturable, se escala el
  // costoBase agregado proporcionalmente para no perder el piso mínimo
  // que antes garantizaba COSTO_MINIMO_PROYECTO a nivel de ítem completo.
  const costoBaseSinPiso = panosCalculados.reduce((acc, p) => acc + p.costoBasePano, 0);
  const factorEscalaPorMinimo = areaPorUnidadSinMinimo > 0 ? areaPorUnidad / areaPorUnidadSinMinimo : 1;
  const costoBase = Math.max(costoBaseSinPiso * factorEscalaPorMinimo, COSTO_MINIMO_PROYECTO);

  const adicionalApertura = panosCalculados.reduce((acc, p) => acc + p.adicionalApertura, 0);
  const adicionalVidrio = panosCalculados.reduce((acc, p) => acc + p.adicionalVidrio, 0);
  const adicionalPerfil = panosCalculados.reduce((acc, p) => acc + p.adicionalPerfil, 0);
  const adicionalAccesoriosLegacy = panosCalculados.reduce((acc, p) => acc + p.adicionalAccesoriosLegacy, 0);
  const subtotalAccesoriosAuto = panosCalculados.reduce((acc, p) => acc + p.subtotalAccesoriosAuto, 0);

  // Accesorios del nuevo modelo (cantidad × precio unitario, en soles directos),
  // a nivel de ítem completo (no por paño — ej. "sellado estructural" aplica
  // a todo el vano, no a cada paño individualmente).
  const subtotalAccesoriosNuevos = calcularSubtotalAccesorios(accesorios);

  const subtotalTecnico = costoBase + adicionalApertura + adicionalVidrio + adicionalPerfil
    + adicionalAccesoriosLegacy + subtotalAccesoriosNuevos + subtotalAccesoriosAuto;

  const costoInstalacion = subtotalTecnico * FACTOR_INSTALACION;

  const nombreAperturaCompuesto = esMixto
    ? panos.map(p => TIPOS_APERTURA[p.tipoApertura] ? TIPOS_APERTURA[p.tipoApertura].nombre : p.tipoApertura).join(' + ')
    : (TIPOS_APERTURA[tipoApertura] ? TIPOS_APERTURA[tipoApertura].nombre : '—');

  // despiecePerfiles agregado del ítem completo (suma de todos los paños),
  // para no romper el código existente (cotizador.js, pdfGenerator.js) que
  // ya lee `c.despiecePerfiles.totalMl` a nivel de ítem.
  const despiecePerfiles = panosCalculados.reduce((acc, p) => ({
    marcoSuperior: acc.marcoSuperior + p.despiecePerfiles.marcoSuperior,
    marcoInferior: acc.marcoInferior + p.despiecePerfiles.marcoInferior,
    jambaIzquierda: acc.jambaIzquierda + p.despiecePerfiles.jambaIzquierda,
    jambaDerecha: acc.jambaDerecha + p.despiecePerfiles.jambaDerecha,
    marcoPerimetral: acc.marcoPerimetral + p.despiecePerfiles.marcoPerimetral,
    parantes: acc.parantes + p.despiecePerfiles.parantes,
    hojasMl: acc.hojasMl + p.despiecePerfiles.hojasMl,
    totalMl: acc.totalMl + p.despiecePerfiles.totalMl,
    totalHojas: acc.totalHojas + p.despiecePerfiles.totalHojas,
    fuente: p.despiecePerfiles.fuente,
  }), { marcoSuperior: 0, marcoInferior: 0, jambaIzquierda: 0, jambaDerecha: 0, marcoPerimetral: 0, parantes: 0, hojasMl: 0, totalMl: 0, totalHojas: 0, fuente: '' });

  // accesoriosAuto agregado: mismas claves sumadas entre paños (ej. 2
  // paños corredizos cada uno con 4 rodajes -> 8 rodajes en total).
  const accesoriosAutoMapa = {};
  panosCalculados.forEach(p => {
    p.accesoriosAuto.forEach(linea => {
      if (!accesoriosAutoMapa[linea.clave]) accesoriosAutoMapa[linea.clave] = { ...linea };
      else accesoriosAutoMapa[linea.clave].cantidad += linea.cantidad;
    });
  });
  const accesoriosAuto = Object.values(accesoriosAutoMapa);

  return {
    tipoSolucion,
    nombreSolucion: refBase.nombre,
    tipoApertura,
    composicion: esMixto ? composicion : null,
    panos,
    panosCalculados,
    notacionPanos: notacionPanos(panos),
    esMixto,
    nombreApertura: nombreAperturaCompuesto,
    ancho: Number(ancho), alto: Number(alto), cantidad: Number(cantidad),
    areaPorUnidad, areaTotal,
    vidrioCategoria, vidrioVariante,
    perfilSerie,
    accesorios, accesoriosLegacy,
    costoBase,
    adicionalApertura, adicionalVidrio, adicionalPerfil, adicionalAccesoriosLegacy, subtotalAccesoriosNuevos,
    despiecePerfiles,
    accesoriosAuto,
    subtotalAccesoriosAuto,
    subtotalTecnico,
    costoInstalacion,
    costoItemAntesUrgencia: subtotalTecnico + costoInstalacion,
  };
}

/**
 * Calcula el proyecto completo: suma de todos los ítems +
 * accesorios de alcance "proyecto" + urgencia + utilidad comercial.
 *
 * @param {Array} items - lista de ítems ya calculados con calcularItem()
 * @param {Array} accesoriosProyecto - [{clave, cantidad}] alcance proyecto
 * @param {string} urgencia - 'normal' | 'urgente' | 'evaluacion'
 * @param {number} utilidadPct - % de utilidad comercial (ej. 40)
 */
export function calcularProyecto(itemsCalculados, accesoriosProyecto = [], urgencia = 'normal', utilidadPct = 0) {
  const costoItemsSubtotal = itemsCalculados.reduce((acc, it) => acc + it.costoItemAntesUrgencia, 0);
  const costoAccesoriosProyecto = calcularSubtotalAccesorios(accesoriosProyecto);

  const subtotalAntesUrgencia = costoItemsSubtotal + costoAccesoriosProyecto;

  const factorUrgencia = FACTOR_URGENCIA[urgencia] ?? 0;
  const costoTotalAntesUtilidad = subtotalAntesUrgencia * (1 + factorUrgencia);

  const montoUtilidad = costoTotalAntesUtilidad * (Number(utilidadPct) / 100);
  const precioFinal = costoTotalAntesUtilidad + montoUtilidad;

  const areaTotalProyecto = itemsCalculados.reduce((acc, it) => acc + it.areaTotal, 0);

  // Agregación para el resumen económico estructurado (brief punto 5):
  // separa "costos directos" (material + vidrio + accesorios/herrajes,
  // que viven dentro de costoBase/adicionales de cada ítem) de
  // "servicios" (instalación de cada ítem + accesorios de alcance
  // proyecto como transporte, desmontaje, instalación en altura).
  const costosDirectosVidrioPerfilAccesorios = itemsCalculados.reduce((acc, it) =>
    acc + it.costoBase + it.adicionalApertura + it.adicionalVidrio + it.adicionalPerfil
      + it.adicionalAccesoriosLegacy + it.subtotalAccesoriosNuevos + it.subtotalAccesoriosAuto, 0);
  const costoManoDeObraInstalacion = itemsCalculados.reduce((acc, it) => acc + it.costoInstalacion, 0);
  const costoServiciosProyecto = costoAccesoriosProyecto;

  return {
    items: itemsCalculados,
    accesoriosProyecto,
    costoItemsSubtotal,
    costoAccesoriosProyecto,
    subtotalAntesUrgencia,
    urgencia, factorUrgencia,
    costoTotalAntesUtilidad,
    utilidadPct: Number(utilidadPct),
    montoUtilidad,
    precioFinal,
    areaTotalProyecto,
    cantidadItems: itemsCalculados.length,
    resumenEconomico: {
      costosDirectos: costosDirectosVidrioPerfilAccesorios,
      manoDeObraInstalacion: costoManoDeObraInstalacion,
      serviciosProyecto: costoServiciosProyecto,
    },
  };
}

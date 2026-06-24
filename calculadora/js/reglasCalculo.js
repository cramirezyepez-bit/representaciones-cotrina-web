/* ============================================================
   REGLASCALCULO.JS — Motor de cálculo paramétrico
   ============================================================
   Migrado y modularizado desde calcularPresupuesto() en
   calculadora.js. La fórmula NO cambió: se preservan todos los
   factores y el orden de operaciones original (costo base ->
   adicionales técnicos -> instalación -> urgencia -> utilidad).

   Diferencia clave respecto al original: estas funciones operan
   sobre UN ítem a la vez (calcularItem) y sobre una LISTA de
   ítems de un proyecto (calcularProyecto), en vez de asumir un
   único formulario global. Esto es lo que habilita "múltiples
   ítems en un mismo proyecto" pedido en el brief.
   ============================================================ */

import { TIPOS_SOLUCION, AREA_MINIMA_POR_UNIDAD, COSTO_MINIMO_PROYECTO, FACTOR_INSTALACION, FACTOR_URGENCIA, obtenerFactorApertura, TIPOS_APERTURA } from './catalogos.js';
import { obtenerFactorVidrio } from './vidrios.js';
import { obtenerFactorPerfil } from './perfiles.js';
import { calcularSubtotalAccesorios, calcularFactorAccesoriosLegacy } from './accesorios.js';
import { calcularAccesoriosAutomaticos } from './despieceTecnico.js';

/**
 * Calcula el factor de apertura efectivo de un ítem.
 *
 * Caso simple (sin composición): el factor es directamente el
 * de TIPOS_APERTURA[tipoApertura].
 *
 * Caso mixto (con composición, ej. fijo+corredizo): el factor es
 * el PROMEDIO PONDERADO POR ANCHO de cada módulo. Esto refleja
 * que un vano de 3m con 1m fijo (factor 0) + 2m corredizo
 * (factor 0.28) cuesta proporcionalmente más que todo fijo y
 * menos que todo corredizo, según cuánto mecanismo real tiene
 * cada parte del vano:
 *   factor = (1m × 0 + 2m × 0.28) / 3m = 0.187
 *
 * Si la suma de anchos de los módulos no coincide con el ancho
 * total del ítem (más allá de una tolerancia de redondeo de
 * 1 cm por módulo), se lanza un error explícito en vez de
 * calcular silenciosamente con datos inconsistentes — un error
 * de composición mal capturada en un sistema de cotización no
 * debe pasar desapercibido.
 */
function calcularFactorAperturaEfectivo(tipoApertura, composicion, anchoTotal) {
  if (!composicion || composicion.length <= 1) {
    return { factor: obtenerFactorApertura(tipoApertura), esMixto: false };
  }

  const sumaAnchos = composicion.reduce((acc, m) => acc + Number(m.anchoModulo || 0), 0);
  const toleranciaCm = 0.01 * composicion.length;
  if (Math.abs(sumaAnchos - Number(anchoTotal)) > toleranciaCm) {
    throw new Error(
      `La suma de anchos de los módulos (${sumaAnchos.toFixed(2)} m) no coincide con el ` +
      `ancho total del ítem (${Number(anchoTotal).toFixed(2)} m). Revisa la composición.`
    );
  }

  const factorPonderado = composicion.reduce((acc, m) => {
    const f = obtenerFactorApertura(m.tipoApertura);
    return acc + f * (Number(m.anchoModulo) / Number(anchoTotal));
  }, 0);

  return { factor: factorPonderado, esMixto: true };
}

/**
 * Calcula el costo de UN ítem del proyecto.
 *
 * @param {Object} item - Datos del ítem:
 *   tipoSolucion, ancho, alto, cantidad,
 *   tipoApertura ('fijo' | 'corredizo2' | 'batiente' | ... ver catalogos.js)
 *     — se ignora si `composicion` tiene más de 1 módulo,
 *   composicion (opcional): [{ tipoApertura, anchoModulo }, ...]
 *     para combinaciones mixtas (fijo+corredizo, puerta+fijo
 *     lateral, etc). La suma de anchoModulo debe igualar `ancho`.
 *   vidrioCategoria, vidrioVariante,
 *   perfilSerie, perfilColor,
 *   accesorios: [{clave, cantidad}]  (nuevo modelo)
 *   accesoriosLegacy: ['herrajePremium', ...] (checkboxes antiguos, opcional)
 * @returns {Object} desglose completo del costo del ítem
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

  // Área con mínimo facturable por unidad (regla original preservada).
  const areaPorUnidad = Math.max(Number(ancho) * Number(alto), AREA_MINIMA_POR_UNIDAD);
  const areaTotal = areaPorUnidad * Number(cantidad);

  // Costo base = precio histórico promedio por m² × área total, con piso mínimo.
  const precioBaseM2Promedio = (refBase.costoM2Min + refBase.costoM2Max) / 2;
  let costoBase = precioBaseM2Promedio * areaTotal;
  costoBase = Math.max(costoBase, COSTO_MINIMO_PROYECTO);

  // Adicionales porcentuales sobre costo base (apertura + vidrio + perfil + accesorios legacy).
  const { factor: factorApertura, esMixto } = calcularFactorAperturaEfectivo(tipoApertura, composicion, ancho);
  const factorVidrio = obtenerFactorVidrio(vidrioCategoria, vidrioVariante);
  const factorPerfil = obtenerFactorPerfil(perfilSerie);
  const factorAccesoriosLegacy = calcularFactorAccesoriosLegacy(accesoriosLegacy);

  const adicionalApertura = costoBase * factorApertura;
  const adicionalVidrio = costoBase * factorVidrio;
  const adicionalPerfil = costoBase * factorPerfil;
  const adicionalAccesoriosLegacy = costoBase * factorAccesoriosLegacy;

  // Accesorios del nuevo modelo (cantidad × precio unitario, en soles directos).
  const subtotalAccesoriosNuevos = calcularSubtotalAccesorios(accesorios);

  // Despiece técnico automático: metros lineales de perfil + cantidades
  // reales de accesorios (rodajes, bisagras, felpas, etc.) derivadas de
  // la geometría y el tipo de apertura. Estas líneas se suman al costo
  // del ítem en soles directos, igual que los accesorios manuales —
  // así el "precio sugerido" ya refleja el consumo real de herrajes,
  // no solo un % estimado sobre el costo base.
  const despieceAuto = calcularAccesoriosAutomaticos({ tipoApertura, composicion, esMixto, ancho, alto, cantidad });
  const subtotalAccesoriosAuto = calcularSubtotalAccesorios(despieceAuto.lineas);

  const subtotalTecnico = costoBase + adicionalApertura + adicionalVidrio + adicionalPerfil
    + adicionalAccesoriosLegacy + subtotalAccesoriosNuevos + subtotalAccesoriosAuto;

  const costoInstalacion = subtotalTecnico * FACTOR_INSTALACION;

  const nombreAperturaCompuesto = esMixto
    ? composicion.map(m => TIPOS_APERTURA[m.tipoApertura] ? TIPOS_APERTURA[m.tipoApertura].nombre : m.tipoApertura).join(' + ')
    : (TIPOS_APERTURA[tipoApertura] ? TIPOS_APERTURA[tipoApertura].nombre : '—');

  return {
    tipoSolucion,
    nombreSolucion: refBase.nombre,
    tipoApertura,
    composicion: esMixto ? composicion : null,
    esMixto,
    nombreApertura: nombreAperturaCompuesto,
    ancho: Number(ancho), alto: Number(alto), cantidad: Number(cantidad),
    areaPorUnidad, areaTotal,
    vidrioCategoria, vidrioVariante,
    perfilSerie,
    accesorios, accesoriosLegacy,
    costoBase,
    adicionalApertura, adicionalVidrio, adicionalPerfil, adicionalAccesoriosLegacy, subtotalAccesoriosNuevos,
    despiecePerfiles: despieceAuto.despiece,
    accesoriosAuto: despieceAuto.lineas,
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

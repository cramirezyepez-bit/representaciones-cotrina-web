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

import { TIPOS_SOLUCION, AREA_MINIMA_POR_UNIDAD, COSTO_MINIMO_PROYECTO, FACTOR_INSTALACION, FACTOR_URGENCIA } from './catalogos.js';
import { obtenerFactorVidrio } from './vidrios.js';
import { obtenerFactorPerfil } from './perfiles.js';
import { calcularSubtotalAccesorios, calcularFactorAccesoriosLegacy } from './accesorios.js';

/**
 * Calcula el costo de UN ítem del proyecto.
 *
 * @param {Object} item - Datos del ítem:
 *   tipoSolucion, ancho, alto, cantidad,
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

  // Adicionales porcentuales sobre costo base (vidrio + perfil + accesorios legacy).
  const factorVidrio = obtenerFactorVidrio(vidrioCategoria, vidrioVariante);
  const factorPerfil = obtenerFactorPerfil(perfilSerie);
  const factorAccesoriosLegacy = calcularFactorAccesoriosLegacy(accesoriosLegacy);

  const adicionalVidrio = costoBase * factorVidrio;
  const adicionalPerfil = costoBase * factorPerfil;
  const adicionalAccesoriosLegacy = costoBase * factorAccesoriosLegacy;

  // Accesorios del nuevo modelo (cantidad × precio unitario, en soles directos).
  const subtotalAccesoriosNuevos = calcularSubtotalAccesorios(accesorios);

  const subtotalTecnico = costoBase + adicionalVidrio + adicionalPerfil
    + adicionalAccesoriosLegacy + subtotalAccesoriosNuevos;

  const costoInstalacion = subtotalTecnico * FACTOR_INSTALACION;

  return {
    tipoSolucion,
    nombreSolucion: refBase.nombre,
    ancho: Number(ancho), alto: Number(alto), cantidad: Number(cantidad),
    areaPorUnidad, areaTotal,
    vidrioCategoria, vidrioVariante,
    perfilSerie,
    accesorios, accesoriosLegacy,
    costoBase,
    adicionalVidrio, adicionalPerfil, adicionalAccesoriosLegacy, subtotalAccesoriosNuevos,
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
  };
}

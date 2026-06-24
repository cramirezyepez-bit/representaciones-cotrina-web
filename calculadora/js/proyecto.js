/* ============================================================
   PROYECTO.JS — Modelo de datos: Proyecto con múltiples ítems
   ============================================================
   Este módulo no estaba en la lista original del brief, pero es
   la pieza central que habilita "un proyecto puede tener V1, V2,
   V3, V4 ... cada uno independiente, con agregar/duplicar/editar/
   eliminar". Sin un modelo de datos propio para esto, la lógica
   de ítems múltiples quedaría dispersa en el DOM — exactamente
   lo que el brief pide evitar ("no quiero lógica dispersa").

   Estado en memoria (sin backend, sin localStorage por defecto:
   se pierde al recargar la página, igual que el formulario
   original de un solo ítem). Si se requiere persistencia entre
   sesiones, es una extensión futura explícita, no asumida aquí.
   ============================================================ */

import { calcularItem, calcularProyecto } from './reglasCalculo.js';

let _items = [];          // [{ id, codigo, datosOriginales, calculo }]
let _accesoriosProyecto = []; // [{ clave, cantidad }]
let _contadorCodigo = 0;

function _generarCodigo() {
  _contadorCodigo += 1;
  return `V${_contadorCodigo}`;
}

/**
 * Agrega un nuevo ítem al proyecto a partir de los datos crudos
 * del formulario. Ejecuta el cálculo inmediatamente y lo guarda
 * junto al ítem, para no tener que recalcular cada vez que se
 * lee la lista.
 */
export function agregarItem(datosFormulario) {
  const calculo = calcularItem(datosFormulario);
  const item = {
    id: crypto.randomUUID ? crypto.randomUUID() : `item_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    codigo: _generarCodigo(),
    datosOriginales: { ...datosFormulario },
    calculo,
  };
  _items.push(item);
  return item;
}

/** Duplica un ítem existente (mismo código + sufijo, nuevo id). */
export function duplicarItem(id) {
  const original = _items.find(it => it.id === id);
  if (!original) return null;
  const calculo = calcularItem(original.datosOriginales);
  const copia = {
    id: crypto.randomUUID ? crypto.randomUUID() : `item_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    codigo: _generarCodigo(),
    datosOriginales: { ...original.datosOriginales },
    calculo,
  };
  const idx = _items.findIndex(it => it.id === id);
  _items.splice(idx + 1, 0, copia);
  return copia;
}

/** Edita un ítem existente con nuevos datos crudos y recalcula. */
export function editarItem(id, nuevosDatos) {
  const idx = _items.findIndex(it => it.id === id);
  if (idx === -1) return null;
  const calculo = calcularItem(nuevosDatos);
  _items[idx] = {
    ..._items[idx],
    datosOriginales: { ...nuevosDatos },
    calculo,
  };
  return _items[idx];
}

export function eliminarItem(id) {
  const idx = _items.findIndex(it => it.id === id);
  if (idx === -1) return false;
  _items.splice(idx, 1);
  return true;
}

export function obtenerItems() {
  return _items.slice(); // copia defensiva, evita mutación externa accidental
}

export function obtenerItemPorId(id) {
  return _items.find(it => it.id === id) || null;
}

export function vaciarProyecto() {
  _items = [];
  _accesoriosProyecto = [];
  _contadorCodigo = 0;
}

export function establecerAccesoriosProyecto(lineas) {
  _accesoriosProyecto = lineas.slice();
}

export function obtenerAccesoriosProyecto() {
  return _accesoriosProyecto.slice();
}

/**
 * Recalcula y devuelve el resumen completo del proyecto: cada
 * ítem con su desglose + totales agregados (instalación,
 * urgencia, utilidad, precio final).
 */
export function obtenerResumenProyecto(urgencia, utilidadPct) {
  const itemsCalculados = _items.map(it => it.calculo);
  const resumen = calcularProyecto(itemsCalculados, _accesoriosProyecto, urgencia, utilidadPct);
  // Adjuntar código e id de cada ítem al resumen, para que la UI
  // pueda mostrar "V1", "V2"... junto a cada línea de desglose.
  resumen.itemsConCodigo = _items.map((it, i) => ({
    id: it.id,
    codigo: it.codigo,
    datosOriginales: it.datosOriginales,
    calculo: resumen.items[i],
  }));
  return resumen;
}

export function contarItems() {
  return _items.length;
}

/* ============================================================
   RULES.JS — Reglas centrales de materiales y servicios
   ============================================================
   PROPÓSITO: este módulo es el único lugar donde se decide "qué
   líneas de tabla (Material | Descripción | Unidad | Cantidad |
   P. Unit. | Total) genera un ítem ya calculado". Antes de este
   módulo, esa traducción no existía como tabla explícita — solo
   vivían números agregados (costoBase, adicionalVidrio, etc.)
   dentro de calcularItem(). rules.js NO recalcula nada: LEE el
   resultado de calcularItem() (reglasCalculo.js) y lo traduce a
   líneas de material/servicio, evitando que esa traducción se
   reescriba por separado en cotizador.js (pantalla) y en
   pdfGenerator.js (PDF) — los dos consumen las mismas funciones
   de aquí, así que una tabla nunca puede desincronizarse de la
   otra.

   QUÉ NO HACE ESTE ARCHIVO: no es un refactor de catalogos.js,
   vidrios.js, perfiles.js, accesorios.js, despieceTecnico.js —
   esos módulos siguen siendo la fuente de verdad de cada dominio
   (qué factor tiene cada vidrio, qué regla de mercado define la
   cantidad de rodajes, etc.) y rules.js los importa tal cual.
   Fusionarlos en un solo archivo gigante sería repetir el error
   que el brief pide evitar ("lógica dispersa") con otro nombre:
   un archivo monolítico no es lo mismo que reglas centralizadas.
   Aquí se centraliza la ORQUESTACIÓN (qué tabla se genera a partir
   de qué cálculo), no la definición de cada dominio.

   CONSISTENCIA MATEMÁTICA: el total de la tabla de materiales +
   la tabla de servicios de un ítem debe igualar exactamente
   `costoItemAntesUrgencia` ya validado en reglasCalculo.js — si
   no calzara, la tabla "bonita" mentiría sobre el precio real.
   Para lograrlo, el precio unitario de vidrio y perfil de cada
   paño se DERIVA del costo ya calculado (costoBasePano y sus
   adicionales), no se inventa un precio de catálogo aparte que
   podría no sumar lo mismo.
   ============================================================ */

import { CATALOGO_ACCESORIOS } from './accesorios.js';
import { describirPerfil, obtenerPrecioPerfilMl } from './perfiles.js';
import { NOMBRES_ACCESORIO_AUTO } from './despieceTecnico.js';

/** Crea una línea de material con su total ya calculado (cantidad × precioUnitario). */
function lineaMaterial({ material, descripcion, unidad, cantidad, precioUnitario, origen }) {
  const total = cantidad * precioUnitario;
  return { material, descripcion, unidad, cantidad, precioUnitario, total, origen };
}

/** Crea una línea de servicio con su total ya calculado. */
function lineaServicio({ descripcion, unidad, cantidad, precioUnitario, origen }) {
  const total = cantidad * precioUnitario;
  return { descripcion, unidad, cantidad, precioUnitario, total, origen };
}

/**
 * Genera las líneas de material de VIDRIO de un ítem, una por
 * paño (un [F][M][F] con 3 vidrios distintos da 3 líneas, no 1).
 *
 * CAMBIO (27/06/2026) — eliminación de "Estructura / base":
 * antes esta función generaba DOS líneas por paño: el vidrio real
 * y una línea "Estructura / base [solución]" que cubría el resto
 * de costoBasePano (el precio histórico de mercado de la categoría
 * completa). El usuario identificó que ese concepto duplicaba el
 * costo de perfilería, que YA se factura aparte en
 * materialPerfilDeItem (por metro lineal real) — costoBasePano
 * incluía implícitamente perfilería + mano de obra + margen, y
 * adicionalPerfil (mostrado en la línea de Perfil) era un % más
 * calculado SOBRE ese mismo costoBasePano. Por decisión explícita
 * del usuario, costoBasePano se eliminó del cálculo central (ver
 * calcularPano en reglasCalculo.js) y, en consecuencia, esta línea
 * ya no se genera: solo queda el vidrio real de mercado por paño.
 */
function materialesVidrioDeItem(itemCalculado) {
  const { codigo, panosCalculados } = itemCalculado;
  const lineas = [];
  panosCalculados.forEach((p, i) => {
    const letra = String.fromCharCode(65 + i);
    const area = p.areaPanoTotal;
    const descripcionPano = panosCalculados.length > 1 ? `${codigo ? codigo + '-' : ''}Paño ${letra}` : (codigo || 'Paño único');

    const costoVidrioReal = p.vidrioRealEstimado ?? p.adicionalVidrio; // fallback por compatibilidad
    const precioUnitarioVidrio = area > 0 ? costoVidrioReal / area : 0;
    lineas.push(lineaMaterial({
      material: p.nombreVidrio,
      descripcion: descripcionPano,
      unidad: 'm²',
      cantidad: Number(area.toFixed(2)),
      precioUnitario: Number(precioUnitarioVidrio.toFixed(2)),
      origen: 'vidrio',
    }));
  });
  return lineas;
}

/**
 * Genera la línea de material de PERFIL de un ítem (agregada,
 * no por paño individual, porque el sistema/serie de perfilería
 * es uno solo para todo el vano — distinto del vidrio, que sí
 * puede variar por paño). El precio por ml es el precio REAL de
 * mercado de la serie (obtenerPrecioPerfilMl en perfiles.js),
 * multiplicado por los metros lineales reales del despiece técnico.
 *
 * CAMBIO (27/06/2026): antes el precio por ml se DERIVABA de
 * adicionalPerfil + adicionalApertura (% calculados sobre
 * costoBasePano). Al eliminar costoBasePano del cálculo (decisión
 * del usuario — ver reglasCalculo.js), esos adicionales quedaron en
 * 0, así que esta línea pasó a usar un precio real de mercado por ml
 * en vez de un % derivado — el mismo enfoque que ya se usaba para el
 * vidrio (vidrioRealEstimado vs. costoBasePano).
 */
function materialPerfilDeItem(itemCalculado) {
  const { codigo, perfilSerie, despiecePerfiles } = itemCalculado;
  if (!despiecePerfiles || !despiecePerfiles.totalMl) return null;
  const precioUnitario = obtenerPrecioPerfilMl(perfilSerie);
  return lineaMaterial({
    material: perfilSerie !== 'noAplica' ? describirPerfil(perfilSerie) : 'Perfil / marco estructural',
    descripcion: codigo || 'Perimetral + intermedios',
    unidad: 'ml',
    cantidad: Number(despiecePerfiles.totalMl.toFixed(1)),
    precioUnitario: Number(precioUnitario.toFixed(2)),
    origen: 'perfil',
  });
}

/**
 * Genera las líneas de material de ACCESORIOS de un ítem
 * (rodajes, bisagras, felpas, etc. — ya vienen con cantidad real
 * desde despieceTecnico.js, aquí solo se traduce a fila de tabla
 * con el precio unitario de CATALOGO_ACCESORIOS).
 */
function materialesAccesoriosDeItem(itemCalculado) {
  const { codigo, accesoriosAuto = [] } = itemCalculado;
  return accesoriosAuto
    .filter(l => l.cantidad > 0)
    .map(l => {
      const def = CATALOGO_ACCESORIOS[l.clave];
      const nombre = NOMBRES_ACCESORIO_AUTO[l.clave] || (def ? def.nombre : l.clave);
      const precioUnitario = def ? def.precioUnitario : 0;
      const unidad = l.unidad === 'unidad' ? 'und' : (l.unidad === 'metro' ? 'ml' : (def ? def.unidad : l.unidad));
      return lineaMaterial({
        material: nombre,
        descripcion: codigo || '—',
        unidad,
        cantidad: l.cantidad,
        precioUnitario,
        origen: 'accesorio',
      });
    });
}

/**
 * Línea de material para el adicional de accesorios "legacy"
 * (checkboxes antiguos tipo "herrajes premium", "control solar",
 * etc. que suman % sobre costo base, sin una cantidad de mercado
 * real que mostrar). Se expone como una sola línea de ajuste
 * técnico — necesaria para que materiales+servicios sume EXACTO
 * el costo real del ítem; sin ella, marcar estos checkboxes haría
 * que la tabla mostrara menos de lo que realmente se cobra.
 */
function materialAjusteLegacyDeItem(itemCalculado) {
  const { codigo, adicionalAccesoriosLegacy, accesoriosLegacy = [] } = itemCalculado;
  if (!adicionalAccesoriosLegacy || adicionalAccesoriosLegacy <= 0) return null;
  const nombres = accesoriosLegacy.map(c => CATALOGO_ACCESORIOS[c]?.nombre || c).join(', ');
  return lineaMaterial({
    material: 'Prestaciones técnicas adicionales',
    descripcion: `${codigo || ''}${nombres ? ' — ' + nombres : ''}`.trim() || '—',
    unidad: 'glb',
    cantidad: 1,
    precioUnitario: Number(adicionalAccesoriosLegacy.toFixed(2)),
    origen: 'accesorioLegacy',
  });
}

/**
 * Línea de material para el AJUSTE DE PISO MÍNIMO (costoBase).
 * Desde que se eliminó costoBasePano del cálculo (decisión del
 * usuario, 27/06/2026 — ver reglasCalculo.js), `costoBase` ya NO es
 * "precio histórico de mercado": es el monto que falta para que el
 * ítem alcance el piso mínimo (COSTO_MINIMO_PROYECTO, S/450) cuando
 * la suma de sus costos técnicos reales (vidrio, perfil, accesorios)
 * no llega a ese piso por sí sola — típico en ítems muy pequeños.
 * Se muestra como línea explícita, igual que
 * materialAjusteLegacyDeItem, para que materiales+servicios sume
 * EXACTO el costo real del ítem.
 */
function materialAjustePisoMinimoDeItem(itemCalculado) {
  const { codigo, costoBase } = itemCalculado;
  if (!costoBase || costoBase <= 0) return null;
  return lineaMaterial({
    material: 'Ajuste a mínimo facturable del ítem',
    descripcion: codigo || '—',
    unidad: 'glb',
    cantidad: 1,
    precioUnitario: Number(costoBase.toFixed(2)),
    origen: 'pisoMinimo',
  });
}

/**
 * Genera TODAS las líneas de material de un ítem ya calculado:
 * vidrio (por paño) + perfil (agregado) + accesorios automáticos.
 * No incluye accesorios manuales con cantidad propia (accesorios[])
 * ni accesorios legacy (%), que se exponen aparte en
 * materialesAccesoriosManualesDeItem() para no romper la suma —
 * esos dos modelos siguen sumando en soles directos al costo del
 * ítem sin una "cantidad de mercado" que mostrar como línea real.
 */
export function generarMaterialesDeItem(itemCalculado) {
  const lineas = [
    ...materialesVidrioDeItem(itemCalculado),
    ...materialesAccesoriosDeItem(itemCalculado),
  ];
  const lineaPerfil = materialPerfilDeItem(itemCalculado);
  if (lineaPerfil) lineas.push(lineaPerfil);
  const lineaLegacy = materialAjusteLegacyDeItem(itemCalculado);
  if (lineaLegacy) lineas.push(lineaLegacy);
  const lineaPisoMinimo = materialAjustePisoMinimoDeItem(itemCalculado);
  if (lineaPisoMinimo) lineas.push(lineaPisoMinimo);
  return lineas;
}

/**
 * Genera las líneas de SERVICIO de un ítem: mano de obra e
 * instalación (siempre presente, es costoInstalacion ya calculado
 * con FACTOR_INSTALACION) más los accesorios "manuales" del ítem
 * (accesorios[] con cantidad propia que el usuario ingresó, ej.
 * "control solar" o "aislamiento acústico" aplicado a ese ítem).
 */
export function generarServiciosDeItem(itemCalculado) {
  const { codigo, costoInstalacion, areaTotal, accesorios = [] } = itemCalculado;
  const lineas = [];

  if (costoInstalacion > 0) {
    lineas.push(lineaServicio({
      descripcion: `Instalación — ${codigo || 'ítem'}`,
      unidad: 'glb',
      cantidad: 1,
      precioUnitario: Number(costoInstalacion.toFixed(2)),
      origen: 'instalacion',
    }));
  }

  accesorios.filter(l => l.cantidad > 0).forEach(l => {
    const def = CATALOGO_ACCESORIOS[l.clave];
    if (!def) return;
    lineas.push(lineaServicio({
      descripcion: `${def.nombre} — ${codigo || 'ítem'}`,
      unidad: def.unidad === 'm2' ? 'm²' : def.unidad,
      cantidad: l.cantidad,
      precioUnitario: def.precioUnitario,
      origen: 'accesorioManual',
    }));
  });

  return lineas;
}

/**
 * Genera las líneas de SERVICIO de alcance proyecto completo
 * (sellado estructural, transporte, desmontaje, instalación en
 * altura — los accesorios con aplicaA:'proyecto' del catálogo).
 */
export function generarServiciosDeProyecto(accesoriosProyecto = []) {
  return accesoriosProyecto
    .filter(l => l.cantidad > 0)
    .map(l => {
      const def = CATALOGO_ACCESORIOS[l.clave];
      if (!def) return null;
      return lineaServicio({
        descripcion: `${def.nombre} (proyecto completo)`,
        unidad: def.unidad === 'm2' ? 'm²' : def.unidad,
        cantidad: l.cantidad,
        precioUnitario: def.precioUnitario,
        origen: 'proyecto',
      });
    })
    .filter(Boolean);
}

/**
 * Construye la tabla de materiales y la tabla de servicios
 * completas para un proyecto (todos sus ítems + accesorios de
 * proyecto), en el formato exacto pedido: Material/Descripción/
 * Unidad/Cantidad/P.Unit/Total para materiales, y Descripción/
 * Unidad/Cantidad/P.Unit/Total para servicios.
 *
 * @param {Object} resumenProyecto - objeto de obtenerResumenProyecto() en proyecto.js
 * @returns {{ materiales: Array, servicios: Array, totalMateriales: number, totalServicios: number }}
 */
export function construirTablasProyecto(resumenProyecto) {
  const materiales = [];
  const servicios = [];

  (resumenProyecto.itemsConCodigo || []).forEach(it => {
    const itemConCodigo = { ...it.calculo, codigo: it.codigo };
    materiales.push(...generarMaterialesDeItem(itemConCodigo));
    servicios.push(...generarServiciosDeItem(itemConCodigo));
  });

  servicios.push(...generarServiciosDeProyecto(resumenProyecto.accesoriosProyecto));

  const totalMateriales = materiales.reduce((acc, l) => acc + l.total, 0);
  const totalServicios = servicios.reduce((acc, l) => acc + l.total, 0);

  return { materiales, servicios, totalMateriales, totalServicios };
}

/* ============================================================
   RESUMEN ECONÓMICO CON IGV CONFIGURABLE (Prioridad 5)
   ============================================================
   Capa final sobre calcularProyecto() (reglasCalculo.js): agrega
   Subtotal / IGV / Total, con el IGV activable u opcional. No
   reemplaza resumenEconomico (Costos directos/Mano de obra/
   Servicios) ya existente — se construye ENCIMA de precioFinal,
   que sigue siendo el precio con utilidad ya aplicada.
   ============================================================ */
export const PORCENTAJE_IGV_PERU = 18;

export function calcularResumenConIgv(precioFinal, { igvActivo = false, porcentajeIgv = PORCENTAJE_IGV_PERU } = {}) {
  const subtotal = precioFinal;
  const montoIgv = igvActivo ? subtotal * (porcentajeIgv / 100) : 0;
  const total = subtotal + montoIgv;
  return { subtotal, igvActivo, porcentajeIgv, montoIgv, total };
}

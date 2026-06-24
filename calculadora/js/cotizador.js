/* ============================================================
   COTIZADOR.JS — Orquestador de la interfaz (Fase 1)
   ============================================================
   Conecta el formulario existente (sin tocar su diseño) con el
   nuevo modelo de Proyecto con múltiples ítems. Reemplaza el
   flujo anterior de "calcular un ítem y mostrarlo" por "agregar
   ítem a una lista, mostrar totales del proyecto completo".

   MAPEO DE VALORES DEL FORMULARIO ACTUAL AL NUEVO MODELO:
   El <select id="tipoVidrio"> sigue usando valores planos
   (templado, laminado, etc.) sin espesor explícito. Mientras esa
   parte de la interfaz no se actualice con selects de espesor
   real, se asume un espesor representativo por categoría (el más
   usado según el equipo comercial) para no bloquear el flujo.
   Esto queda marcado como deuda de UI a resolver en la fase 2,
   cuando el formulario incorpore selects de espesor real.

   El <select id="materialSistema"> usa valores antiguos
   (aluminioNacional, aluminioEuropeo, etc.) que se mapean 1:1 a
   las series nuevas equivalentes en perfiles.js.
   ============================================================ */

import { agregarItem, duplicarItem, eliminarItem, obtenerItems, obtenerResumenProyecto, vaciarProyecto, establecerAccesoriosProyecto, obtenerAccesoriosProyecto } from './proyecto.js';
import { describirVidrio } from './vidrios.js';
import { describirPerfil } from './perfiles.js';
import { CATALOGO_ACCESORIOS, listarAccesoriosPorAlcance } from './accesorios.js';
import { TIPOS_SOLUCION } from './catalogos.js';

// --- Mapeo del <select id="tipoVidrio"> legacy a categoría+variante nuevos ---
const MAPEO_VIDRIO_LEGACY = {
  crudo:            { categoria: 'crudo',     variante: 'unico' },
  templado:         { categoria: 'templado',  variante: '8mm' },   // espesor más usado según equipo comercial
  laminado:         { categoria: 'laminado',  variante: '4+4' },
  insulado:         { categoria: 'insulado',  variante: 'dvh' },
  templadoLaminado: { categoria: 'templadoLaminado', variante: 'unico' },
  acustico:         { categoria: 'acustico',  variante: 'unico' },
  seguridad:        { categoria: 'seguridad', variante: 'unico' },
  otroVidrio:       { categoria: 'otro',      variante: 'unico' },
};

// --- Mapeo del <select id="materialSistema"> legacy a series de perfiles.js ---
const MAPEO_PERFIL_LEGACY = {
  noAplica:         'noAplica',
  aluminioNacional: 'serie25',
  aluminioEuropeo:  'serieEuropea',
  aluminioPremium:  'serie80',
  pvc:              'pvc',
  aceroInoxidable:  'acero',
  fierro:           'fierro',
  madera:           'madera',
  otroMaterial:     'otro',
};

function formatearSoles(numero) {
  return 'S/ ' + (Math.round(numero) || 0).toLocaleString('es-PE');
}

function leerDatosFormulario() {
  const get = (id) => document.getElementById(id);
  const tipoSolucion = get('tipoSolucion').value;
  const tipoApertura = get('tipoApertura').value || 'fijo';
  const ancho = get('ancho').value;
  const alto = get('alto').value;
  const cantidad = get('cantidad').value;
  const tipoVidrioLegacy = get('tipoVidrio').value;
  const materialLegacy = get('materialSistema').value || 'noAplica';

  const mapeoVidrio = MAPEO_VIDRIO_LEGACY[tipoVidrioLegacy] || { categoria: 'crudo', variante: 'unico' };
  const perfilSerie = MAPEO_PERFIL_LEGACY[materialLegacy] || 'noAplica';

  const accesoriosLegacy = Array.from(document.querySelectorAll('input[name="accesorios"]:checked'))
    .map(cb => cb.value)
    .filter(v => v !== 'ninguno');

  return {
    tipoSolucion,
    tipoApertura,
    ancho, alto, cantidad,
    vidrioCategoria: mapeoVidrio.categoria,
    vidrioVariante: mapeoVidrio.variante,
    perfilSerie,
    accesorios: [], // accesorios con cantidad real — se incorporan cuando el formulario tenga esos campos (fase 2)
    accesoriosLegacy,
    // Metadatos de contexto, no usados por el motor de cálculo pero
    // útiles para mostrar en la lista de ítems:
    colorAluminio: get('colorAluminio').value,
  };
}

function validarDatosMinimos(datos) {
  const errores = [];
  if (!datos.tipoSolucion) errores.push('Selecciona el tipo de solución.');
  if (!datos.ancho || Number(datos.ancho) <= 0) errores.push('Ingresa un ancho válido.');
  if (!datos.alto || Number(datos.alto) <= 0) errores.push('Ingresa un alto válido.');
  if (!datos.cantidad || Number(datos.cantidad) < 1) errores.push('Ingresa una cantidad válida.');
  if (!document.getElementById('tipoVidrio').value) errores.push('Selecciona el tipo de vidrio.');
  return errores;
}

/* ------------------------------------------------------------
   RENDER: lista de ítems del proyecto
   ------------------------------------------------------------ */
function renderItems() {
  const items = obtenerItems();
  const itemsEmpty = document.getElementById('itemsEmpty');
  const itemsList = document.getElementById('itemsList');
  const itemsProyectoAcc = document.getElementById('itemsProyectoAcc');

  if (items.length === 0) {
    itemsEmpty.hidden = false;
    itemsList.hidden = true;
    itemsProyectoAcc.hidden = true;
    return;
  }

  itemsEmpty.hidden = true;
  itemsList.hidden = false;
  itemsProyectoAcc.hidden = false;

  itemsList.innerHTML = items.map(it => {
    const c = it.calculo;
    const desc = `${c.nombreSolucion} ${c.nombreApertura !== 'Fijo' ? '· ' + c.nombreApertura + ' ' : ''}· ${describirVidrio(c.vidrioCategoria, c.vidrioVariante)}${c.perfilSerie !== 'noAplica' ? ' · ' + describirPerfil(c.perfilSerie) : ''}`;
    return `
      <div class="item-row" data-id="${it.id}">
        <div class="item-row-main">
          <span class="item-codigo">${it.codigo}</span>
          <div class="item-info">
            <strong>${desc}</strong>
            <span class="item-medidas">${c.ancho.toFixed(2)} x ${c.alto.toFixed(2)} m · cant. ${c.cantidad} · ${c.areaTotal.toFixed(2)} m²</span>
          </div>
        </div>
        <div class="item-row-precio">${formatearSoles(c.costoItemAntesUrgencia)}</div>
        <div class="item-row-actions">
          <button type="button" class="item-btn-dup" data-action="duplicar" data-id="${it.id}" title="Duplicar ítem">⧉</button>
          <button type="button" class="item-btn-del" data-action="eliminar" data-id="${it.id}" title="Eliminar ítem">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderAccesoriosProyecto() {
  const grid = document.getElementById('accesoriosProyectoGrid');
  const lineasActuales = obtenerAccesoriosProyecto();
  const mapaActual = Object.fromEntries(lineasActuales.map(l => [l.clave, l.cantidad]));

  const accesoriosProyecto = listarAccesoriosPorAlcance('proyecto');
  grid.innerHTML = accesoriosProyecto.map(acc => `
    <label class="check-item check-item-cantidad">
      <span>${acc.nombre}</span>
      <input type="number" min="0" step="1" value="${mapaActual[acc.key] || 0}"
             data-clave-accesorio="${acc.key}" class="input-cantidad-accesorio">
    </label>
  `).join('');

  grid.querySelectorAll('.input-cantidad-accesorio').forEach(input => {
    input.addEventListener('change', actualizarAccesoriosProyectoDesdeUI);
  });
}

function actualizarAccesoriosProyectoDesdeUI() {
  const inputs = document.querySelectorAll('.input-cantidad-accesorio');
  const lineas = Array.from(inputs)
    .map(inp => ({ clave: inp.dataset.claveAccesorio, cantidad: Number(inp.value) || 0 }))
    .filter(l => l.cantidad > 0);
  establecerAccesoriosProyecto(lineas);
  actualizarResultado();
}

/* ------------------------------------------------------------
   RENDER: resultado / totales del proyecto
   ------------------------------------------------------------ */
function actualizarResultado() {
  const resultEmpty = document.getElementById('resultEmpty');
  const resultContent = document.getElementById('resultContent');
  const items = obtenerItems();

  if (items.length === 0) {
    resultEmpty.hidden = false;
    resultContent.hidden = true;
    window.__ultimoResumenProyecto = null;
    return;
  }

  const urgencia = document.getElementById('urgencia').value || 'normal';
  const utilidadPct = Number(document.getElementById('utilidad').value) || 0;
  const distrito = document.getElementById('distrito').value || '—';

  const resumen = obtenerResumenProyecto(urgencia, utilidadPct);

  resultEmpty.hidden = true;
  resultContent.hidden = false;

  document.getElementById('resultCantidadItems').textContent = resumen.cantidadItems;
  document.getElementById('resultArea').textContent = resumen.areaTotalProyecto.toFixed(2) + ' m²';
  document.getElementById('resultDistrito').textContent = distrito;

  document.getElementById('bdCostoBase').textContent = formatearSoles(resumen.costoItemsSubtotal);
  document.getElementById('bdAccesorios').textContent = formatearSoles(resumen.costoAccesoriosProyecto);
  const montoAjusteUrgencia = resumen.costoTotalAntesUtilidad - resumen.subtotalAntesUrgencia;
  document.getElementById('bdInstalacion').textContent = formatearSoles(montoAjusteUrgencia);
  document.getElementById('bdCostoTotal').textContent = formatearSoles(resumen.costoTotalAntesUtilidad);
  document.getElementById('bdUtilidadPct').textContent = resumen.utilidadPct + '%';
  document.getElementById('bdUtilidadMonto').textContent = formatearSoles(resumen.montoUtilidad);
  document.getElementById('resultPrecioFinal').textContent = formatearSoles(resumen.precioFinal);

  // Puente de compatibilidad con el PDF/WhatsApp legacy (calculadora.js),
  // que todavía lee `ultimoCalculo` de un solo ítem. Se expone aquí el
  // resumen agregado del proyecto para que ese código no falle, aunque
  // el diseño visual del PDF para múltiples ítems es una migración
  // pendiente (fase de pdfGenerator.js, fuera del alcance de esta fase).
  window.__ultimoResumenProyecto = resumen;
}

/* ------------------------------------------------------------
   EVENTOS
   ------------------------------------------------------------ */
function manejarAgregarItem() {
  const formAlert = document.getElementById('formAlert');
  const datos = leerDatosFormulario();
  const errores = validarDatosMinimos(datos);

  if (errores.length > 0) {
    formAlert.textContent = errores.join(' ');
    formAlert.hidden = false;
    return;
  }
  formAlert.hidden = true;

  agregarItem(datos);
  renderItems();
  renderAccesoriosProyecto();
  actualizarResultado();

  // Limpiar solo los campos específicos del ítem (no cliente/distrito/utilidad,
  // que normalmente se repiten para todos los ítems del mismo proyecto).
  ['tipoSolucion', 'ancho', 'alto', 'cantidad', 'tipoVidrio', 'materialSistema'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('tipoApertura').value = 'fijo';
  document.querySelectorAll('input[name="accesorios"]:checked').forEach(cb => cb.checked = false);
}

function manejarListaClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === 'duplicar') duplicarItem(id);
  if (action === 'eliminar') eliminarItem(id);
  renderItems();
  actualizarResultado();
}

function manejarLimpiarTodo() {
  const form = document.getElementById('calcForm');
  form.reset();
  vaciarProyecto();
  document.getElementById('formAlert').hidden = true;
  renderItems();
  renderAccesoriosProyecto();
  actualizarResultado();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnAgregarItem').addEventListener('click', manejarAgregarItem);
  document.getElementById('itemsList').addEventListener('click', manejarListaClick);
  document.getElementById('btnLimpiar').addEventListener('click', manejarLimpiarTodo);

  // Recalcular el proyecto si cambian variables comerciales globales
  // (urgencia, utilidad, distrito) sin necesidad de re-agregar ítems.
  ['urgencia', 'utilidad', 'distrito'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', actualizarResultado);
    if (el) el.addEventListener('input', actualizarResultado);
  });

  renderItems();
  renderAccesoriosProyecto();
  actualizarResultado();
});

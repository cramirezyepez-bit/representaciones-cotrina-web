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

import { agregarItem, editarItem, duplicarItem, eliminarItem, obtenerItems, obtenerItemPorId, obtenerResumenProyecto, vaciarProyecto, establecerAccesoriosProyecto, obtenerAccesoriosProyecto } from './proyecto.js';
import { describirVidrio } from './vidrios.js';
import { describirPerfil } from './perfiles.js';
import { CATALOGO_ACCESORIOS, listarAccesoriosPorAlcance } from './accesorios.js';
import { TIPOS_SOLUCION, listarTiposApertura } from './catalogos.js';
import { construirHtmlPdfProyecto } from './pdfGenerator.js';
import { generarDibujoItem, tieneDibujo } from './svgGenerator.js';
import { describirLineaAccesorioAuto } from './despieceTecnico.js';
import { ICONOS_TIPO_SOLUCION, ICONOS_TIPO_APERTURA, ICONOS_DUCHA, VARIANTES_DUCHA } from './iconosConfigurador.js';
import { CODIGO_CORTO_APERTURA } from './panos.js';
import { construirTablasProyecto, calcularResumenConIgv } from './rules.js';
import { importarPresupuestoExcel } from './excelImporter.js';
import { construirHtmlPdfExcel } from './pdfGeneratorExcel.js';

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
  vl46:             'vl46',
  ml46:             'ml46',
  pvc:              'pvc',
  aceroInoxidable:  'acero',
  fierro:           'fierro',
  madera:           'madera',
  otroMaterial:     'otro',
};

/** Inverso de MAPEO_VIDRIO_LEGACY: dada una categoría de vidrio (panos.js/vidrios.js), devuelve la clave legacy más cercana para preseleccionar el <select> de vidrio por paño. */
function claveLegacyDeVidrio(categoria) {
  const entrada = Object.entries(MAPEO_VIDRIO_LEGACY).find(([, v]) => v.categoria === categoria);
  return entrada ? entrada[0] : 'crudo';
}

function formatearSoles(numero) {
  return 'S/ ' + (Math.round(numero) || 0).toLocaleString('es-PE');
}

/** ID del ítem actualmente en edición (null si se está agregando uno nuevo). */
let _idEnEdicion = null;

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

  const composicion = leerComposicionMixta();
  const panos = leerPanosCompuestos();

  return {
    tipoSolucion,
    tipoApertura,
    composicion,
    panos,
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

/* ------------------------------------------------------------
   CONFIGURADOR VISUAL DE ÍCONOS: Tipo de sistema, Tipo de
   apertura, y variantes de Puerta de ducha. Cada grilla es un
   conjunto de tarjetas con ícono SVG + etiqueta; al hacer click
   se sincroniza el valor en el <select> oculto correspondiente
   (fuente de verdad para leerDatosFormulario/validaciones), y se
   re-disparan los eventos que ya dependían de esos selects.
   ------------------------------------------------------------ */
const ETIQUETAS_TIPO_SOLUCION = {
  fachada: 'Fachada', mampara: 'Mampara', puertaDucha: 'Puerta de ducha',
  ventana: 'Ventana', baranda: 'Baranda', puerta: 'Puerta', muroCortina: 'Muro de vidrio',
  cerramiento: 'Cerramiento', divisionInterior: 'División de oficina', cerramientoPersonalizado: 'Personalizado',
};
const ORDEN_TIPO_SOLUCION = ['ventana', 'mampara', 'muroCortina', 'divisionInterior', 'puerta', 'puertaDucha', 'baranda', 'cerramientoPersonalizado'];

const ETIQUETAS_TIPO_APERTURA = {
  fijo: 'Fijo', corredizo2: 'Corredizo', dobleCorredizo: 'Doble corredizo',
  batienteIzquierda: 'Batiente izq.', batienteDerecha: 'Batiente der.',
  proyectante: 'Proyectante', oscilobatiente: 'Oscilobatiente', puerta: 'Puerta',
};
const ORDEN_TIPO_APERTURA = ['fijo', 'corredizo2', 'dobleCorredizo', 'batienteIzquierda', 'batienteDerecha', 'proyectante', 'oscilobatiente', 'puerta'];

function renderGridIconos(contenedorId, iconos, orden, etiquetas, valorActual, onSeleccionar) {
  const cont = document.getElementById(contenedorId);
  cont.innerHTML = orden.map(key => `
    <button type="button" class="icon-card ${key === valorActual ? 'is-selected' : ''}" data-valor="${key}" role="radio" aria-checked="${key === valorActual}">
      <span class="icon-card-svg">${iconos[key] || ''}</span>
      <span class="icon-card-label">${etiquetas[key] || key}</span>
    </button>
  `).join('');
  cont.querySelectorAll('.icon-card').forEach(btn => {
    btn.addEventListener('click', () => {
      cont.querySelectorAll('.icon-card').forEach(b => { b.classList.remove('is-selected'); b.setAttribute('aria-checked', 'false'); });
      btn.classList.add('is-selected');
      btn.setAttribute('aria-checked', 'true');
      onSeleccionar(btn.dataset.valor);
    });
  });
}

function renderGridTipoSolucion(valorActual = '') {
  renderGridIconos('gridTipoSolucion', ICONOS_TIPO_SOLUCION, ORDEN_TIPO_SOLUCION, ETIQUETAS_TIPO_SOLUCION, valorActual, (valor) => {
    const select = document.getElementById('tipoSolucion');
    select.value = valor;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    actualizarVisibilidadVariantesDucha(valor);
    resincronizarModoPanos();
  });
}

/**
 * Si ya hay paños configurados en el constructor y el usuario
 * cambia el tipo de sistema (ej. de Ventana a Puerta de ducha),
 * las filas existentes deben pasar del modo simple (F/M) al modo
 * avanzado o viceversa — preservando ancho, alto y vidrio ya
 * ingresados, solo reconstruyendo el selector de apertura con el
 * conjunto de opciones correcto para el nuevo tipo de sistema.
 */
function resincronizarModoPanos() {
  const modulosWrap = document.getElementById('composicionModulos');
  const filas = Array.from(modulosWrap.children);
  if (filas.length === 0) return;

  const modoNuevoEsSimple = usaClasificacionSimplePano(document.getElementById('tipoSolucion').value);

  filas.forEach(fila => {
    const modoActualEsSimple = fila.dataset.modoApertura === 'simple';
    if (modoActualEsSimple === modoNuevoEsSimple) return; // ya está en el modo correcto

    const selectApertura = fila.querySelector('.mod-tipo-apertura');
    const valorActual = selectApertura.value;
    // Traducir el valor actual al nuevo conjunto de opciones: de simple a
    // avanzado, F/M se traduce a su tipoApertura real concreto; de avanzado
    // a simple, cualquier apertura con mecanismo se simplifica a "M".
    const nuevoValor = modoNuevoEsSimple
      ? letraSimpleDeApertura(valorActual)
      : (CLASIFICACION_SIMPLE_PANO[valorActual]?.tipoAperturaReal || valorActual);

    fila.dataset.modoApertura = modoNuevoEsSimple ? 'simple' : 'avanzado';
    selectApertura.innerHTML = opcionesTipoApertura(nuevoValor, modoNuevoEsSimple);
  });
  actualizarNotacionPanos();
}

function renderGridTipoApertura(valorActual = 'fijo') {
  renderGridIconos('gridTipoApertura', ICONOS_TIPO_APERTURA, ORDEN_TIPO_APERTURA, ETIQUETAS_TIPO_APERTURA, valorActual, (valor) => {
    const select = document.getElementById('tipoApertura');
    select.value = valor;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    // Si el usuario elige manualmente una apertura simple, deseleccionamos
    // cualquier variante de ducha activa (ya no aplica un preset de ducha).
    document.querySelectorAll('#gridVariantesDucha .icon-card').forEach(b => b.classList.remove('is-selected'));
  });
}

const ETIQUETAS_DUCHA = Object.fromEntries(Object.entries(VARIANTES_DUCHA).map(([k, v]) => [k, v.label]));
const ORDEN_DUCHA = Object.keys(VARIANTES_DUCHA);

function renderGridVariantesDucha() {
  renderGridIconos('gridVariantesDucha', ICONOS_DUCHA, ORDEN_DUCHA, ETIQUETAS_DUCHA, '', (valor) => {
    aplicarVarianteDucha(valor);
  });
}

/**
 * Aplica una variante visual de puerta de ducha al formulario:
 * si es una apertura simple, selecciona esa tarjeta en el grid
 * de apertura; si es una composición (ej. abatible + fijo),
 * activa el modo composición mixta y precarga los módulos con
 * las proporciones sugeridas sobre el ancho ya ingresado (si hay).
 */
function aplicarVarianteDucha(valorClaveDucha) {
  const variante = VARIANTES_DUCHA[valorClaveDucha];
  if (!variante) return;

  if (!variante.composicion) {
    document.getElementById('chkComposicionMixta').checked = false;
    document.getElementById('composicionMixta').hidden = true;
    document.getElementById('tipoApertura').disabled = false;
    document.getElementById('composicionModulos').innerHTML = '';
    actualizarVisibilidadAccesoriosApertura();
    const select = document.getElementById('tipoApertura');
    select.value = variante.tipoApertura;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    // El grid de apertura no tiene una tarjeta "batiente" genérica (solo
    // izq./der.), así que para resaltar visualmente usamos batienteIzquierda
    // como representación por defecto cuando el valor real es "batiente".
    const valorVisualGrid = variante.tipoApertura === 'batiente' ? 'batienteIzquierda' : variante.tipoApertura;
    renderGridTipoApertura(valorVisualGrid);
    // Re-marcar la tarjeta de ducha elegida (renderGridTipoApertura no la toca, pero
    // por las dudas reforzamos la selección visual tras el re-render del otro grid).
    document.querySelectorAll('#gridVariantesDucha .icon-card').forEach(b => {
      b.classList.toggle('is-selected', b.dataset.valor === valorClaveDucha);
    });
    return;
  }

  // Composición: activar checkbox y precargar módulos con anchos
  // proporcionales sobre el ancho total ya ingresado (o vacío si no hay).
  document.getElementById('chkComposicionMixta').checked = true;
  document.getElementById('composicionMixta').hidden = false;
  document.getElementById('tipoApertura').disabled = true;
  const modulosWrap = document.getElementById('composicionModulos');
  modulosWrap.innerHTML = '';
  const anchoTotal = Number(document.getElementById('ancho').value) || 0;
  variante.composicion.forEach((m, i) => {
    const anchoSugerido = anchoTotal ? (anchoTotal * m.proporcion).toFixed(2) : '';
    modulosWrap.appendChild(crearFilaModulo(i + 1, m.tipoApertura, anchoSugerido));
  });
  validarSumaComposicion();
  actualizarNotacionPanos();
  actualizarVisibilidadAccesoriosApertura();
}

function actualizarVisibilidadVariantesDucha(tipoSolucionValor) {
  const grupo = document.getElementById('grupoVariantesDucha');
  const esDucha = tipoSolucionValor === 'puertaDucha';
  grupo.hidden = !esDucha;
  if (esDucha) renderGridVariantesDucha();
}

/* ------------------------------------------------------------
   COMPOSICIÓN MIXTA: agregar/quitar módulos, leer del DOM,
   validar que la suma de anchos coincida con el ancho del ítem.
   ------------------------------------------------------------ */
function chkComposicionActivo() {
  return document.getElementById('chkComposicionMixta').checked;
}

function leerComposicionMixta() {
  if (!chkComposicionActivo()) return null;
  const filas = document.querySelectorAll('.composicion-modulo-row');
  const modulos = Array.from(filas).map(fila => ({
    tipoApertura: fila.querySelector('.mod-tipo-apertura').value,
    anchoModulo: Number(fila.querySelector('.mod-ancho').value) || 0,
  }));
  return modulos.length > 1 ? modulos : null;
}

/**
 * Lee los paños configurados en el constructor de composición
 * mixta, incluyendo el vidrio propio de cada uno (modelo
 * FRAME+PANELS+OPENINGS). Devuelve null si la composición mixta
 * no está activa o tiene menos de 2 paños — en ese caso el ítem
 * se resuelve como "simple" (un solo paño) en panos.js, usando
 * el vidrio único del formulario principal.
 */
function leerPanosCompuestos() {
  if (!chkComposicionActivo()) return null;
  const filas = document.querySelectorAll('.composicion-modulo-row');
  const panos = Array.from(filas).map(fila => {
    const vidrioLegacy = fila.querySelector('.mod-vidrio').value;
    const mapeo = MAPEO_VIDRIO_LEGACY[vidrioLegacy] || { categoria: 'crudo', variante: 'unico' };
    const valorAperturaUI = fila.querySelector('.mod-tipo-apertura').value;
    // Si la fila está en modo simple (F/M), traducir a un tipoApertura
    // real concreto antes de exponerlo — el motor de cálculo siempre
    // recibe un tipoApertura válido de catalogos.js, nunca la letra UI.
    const esSimple = fila.dataset.modoApertura === 'simple';
    const tipoApertura = esSimple
      ? (CLASIFICACION_SIMPLE_PANO[valorAperturaUI]?.tipoAperturaReal || 'fijo')
      : valorAperturaUI;
    const altoInput = fila.querySelector('.mod-alto').value;
    return {
      tipoApertura,
      anchoModulo: Number(fila.querySelector('.mod-ancho').value) || 0,
      altoModulo: altoInput !== '' ? Number(altoInput) : null,
      vidrioCategoria: mapeo.categoria,
      vidrioVariante: mapeo.variante,
    };
  });
  return panos.length > 1 ? panos : null;
}

/**
 * Clasificación SIMPLE de paño (F = Fijo, M = Móvil) para sistemas
 * estándar (ventana, mampara, PVC, aluminio) — el usuario no
 * necesita saber si "M" significa corredizo, batiente u otro
 * mecanismo: esa decisión técnica se resuelve con un valor por
 * defecto razonable y la descripción comercial completa se sigue
 * generando a nivel del sistema completo (describirItemAutomatico
 * en pdfGenerator.js), no por paño. El motor de cálculo no cambia:
 * "M" simplemente se traduce a un tipoApertura real concreto antes
 * de llegar a calcularItem(), igual que cualquier otro paño.
 */
const CLASIFICACION_SIMPLE_PANO = {
  F: { label: 'Fijo', tipoAperturaReal: 'fijo' },
  M: { label: 'Móvil', tipoAperturaReal: 'corredizoSimple' },
};

/** Tipos de sistema donde el usuario solo ve la clasificación simple F/M. */
const SISTEMAS_CLASIFICACION_SIMPLE = ['ventana', 'mampara', 'muroCortina', 'divisionInterior'];

/** ¿Este tipo de solución debe mostrar solo F/M en el constructor de paños? */
function usaClasificacionSimplePano(tipoSolucion) {
  return SISTEMAS_CLASIFICACION_SIMPLE.includes(tipoSolucion);
}

/**
 * Dado un tipoApertura real (el que ya entiende el motor de
 * cálculo), devuelve la letra simple F/M que le corresponde para
 * mostrarla preseleccionada si el usuario edita un ítem ya
 * guardado. Cualquier apertura con mecanismo (corredizo, batiente,
 * etc.) se interpreta como "M"; solo "fijo" es "F".
 */
function letraSimpleDeApertura(tipoApertura) {
  return tipoApertura === 'fijo' ? 'F' : 'M';
}

function opcionesTipoApertura(seleccionado, modoSimple) {
  if (modoSimple) {
    return Object.entries(CLASIFICACION_SIMPLE_PANO).map(([letra, def]) =>
      `<option value="${letra}" ${letra === seleccionado ? 'selected' : ''}>${letra} — ${def.label}</option>`
    ).join('');
  }
  return listarTiposApertura().map(t =>
    `<option value="${t.key}" ${t.key === seleccionado ? 'selected' : ''}>${t.nombre}</option>`
  ).join('');
}

const OPCIONES_VIDRIO_PANO = [
  { value: 'crudo', label: 'Crudo' },
  { value: 'templado', label: 'Templado' },
  { value: 'laminado', label: 'Laminado' },
  { value: 'insulado', label: 'Insulado (DVH)' },
  { value: 'templadoLaminado', label: 'Templado laminado' },
  { value: 'acustico', label: 'Acústico' },
  { value: 'seguridad', label: 'Seguridad' },
];

function opcionesVidrioPano(seleccionado) {
  return OPCIONES_VIDRIO_PANO.map(v =>
    `<option value="${v.value}" ${v.value === seleccionado ? 'selected' : ''}>${v.label}</option>`
  ).join('');
}

/**
 * Crea una fila de paño dentro del constructor de composición
 * mixta: tipo de apertura (simple F/M o avanzada según el tipo de
 * sistema), vidrio propio, ancho y alto independientes (modelo
 * FRAME+PANELS+OPENINGS) — cada paño puede tener su propia
 * medida completa, no solo su ancho dentro del vano.
 */
function crearFilaModulo(numero, tipoAperturaDefault = 'fijo', anchoDefault = '', vidrioLegacyDefault = '', altoDefault = '') {
  const modoSimple = usaClasificacionSimplePano(document.getElementById('tipoSolucion').value);
  const valorAperturaInicial = modoSimple ? letraSimpleDeApertura(tipoAperturaDefault) : tipoAperturaDefault;

  const fila = document.createElement('div');
  fila.className = 'composicion-modulo-row';
  fila.dataset.modoApertura = modoSimple ? 'simple' : 'avanzado';
  fila.innerHTML = `
    <span class="mod-label">Paño ${letraPanoUI(numero - 1)}</span>
    <select class="mod-tipo-apertura">${opcionesTipoApertura(valorAperturaInicial, modoSimple)}</select>
    <select class="mod-vidrio">${opcionesVidrioPano(vidrioLegacyDefault)}</select>
    <input type="number" class="mod-ancho" min="0" step="0.01" placeholder="Ancho (m)" value="${anchoDefault}">
    <input type="number" class="mod-alto" min="0" step="0.01" placeholder="Alto (m, opcional)" value="${altoDefault}">
    <button type="button" class="btn-quitar-modulo" title="Quitar paño">✕</button>
  `;
  fila.querySelector('.btn-quitar-modulo').addEventListener('click', () => {
    fila.remove();
    renumerarModulos();
    validarSumaComposicion();
  });
  fila.querySelector('.mod-ancho').addEventListener('input', validarSumaComposicion);
  fila.querySelector('.mod-tipo-apertura').addEventListener('change', actualizarNotacionPanos);
  return fila;
}

function letraPanoUI(indice) {
  const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (indice < 26) return LETRAS[indice];
  return LETRAS[Math.floor(indice / 26) - 1] + LETRAS[indice % 26];
}

function renumerarModulos() {
  document.querySelectorAll('.composicion-modulo-row .mod-label').forEach((lbl, i) => {
    lbl.textContent = `Paño ${letraPanoUI(i)}`;
  });
  actualizarNotacionPanos();
}

/** Pinta la notación tipo "[F][M][M][F]" en vivo según los paños actuales del constructor. */
function actualizarNotacionPanos() {
  const el = document.getElementById('composicionNotacion');
  if (!el) return;
  const filas = document.querySelectorAll('.composicion-modulo-row .mod-tipo-apertura');
  if (filas.length === 0) { el.textContent = ''; return; }
  const notacion = Array.from(filas).map(sel => {
    // El valor puede ser la letra simple "F"/"M" (modo estándar) o un
    // tipoApertura real avanzado (corredizo2, batiente, etc.) — ambos
    // casos deben resolver a un código corto de una letra para [F][M][F].
    const codigo = (sel.value === 'F' || sel.value === 'M') ? sel.value : (CODIGO_CORTO_APERTURA[sel.value] || '?');
    return `[${codigo}]`;
  }).join('');
  el.textContent = notacion;
}

function validarSumaComposicion() {
  const elSuma = document.getElementById('composicionSuma');
  const anchoItem = Number(document.getElementById('ancho').value) || 0;
  const filas = document.querySelectorAll('.composicion-modulo-row .mod-ancho');
  const suma = Array.from(filas).reduce((acc, inp) => acc + (Number(inp.value) || 0), 0);

  if (filas.length < 2) {
    elSuma.textContent = 'Agrega al menos 2 paños para una composición mixta.';
    elSuma.className = 'field-hint field-hint-tight composicion-suma';
    return false;
  }
  if (!anchoItem) {
    elSuma.textContent = `Suma de paños: ${suma.toFixed(2)} m. Ingresa el ancho total del ítem para validar.`;
    elSuma.className = 'field-hint field-hint-tight composicion-suma';
    return false;
  }
  const diferencia = Math.abs(suma - anchoItem);
  if (diferencia > 0.02) {
    elSuma.textContent = `⚠ La suma de paños (${suma.toFixed(2)} m) no coincide con el ancho total del ítem (${anchoItem.toFixed(2)} m).`;
    elSuma.className = 'field-hint field-hint-tight composicion-suma suma-error';
    return false;
  }
  elSuma.textContent = `✓ Suma de paños: ${suma.toFixed(2)} m — coincide con el ancho total.`;
  elSuma.className = 'field-hint field-hint-tight composicion-suma suma-ok';
  return true;
}

function inicializarComposicionMixta() {
  const chk = document.getElementById('chkComposicionMixta');
  const contenedor = document.getElementById('composicionMixta');
  const selectAperturaSimple = document.getElementById('tipoApertura');
  const modulosWrap = document.getElementById('composicionModulos');
  const btnAgregar = document.getElementById('btnAgregarModulo');

  chk.addEventListener('change', () => {
    contenedor.hidden = !chk.checked;
    selectAperturaSimple.disabled = chk.checked;
    if (chk.checked && modulosWrap.children.length === 0) {
      modulosWrap.appendChild(crearFilaModulo(1, 'fijo'));
      modulosWrap.appendChild(crearFilaModulo(2, 'corredizo2'));
      validarSumaComposicion();
      actualizarNotacionPanos();
    }
    actualizarVisibilidadAccesoriosApertura();
  });

  btnAgregar.addEventListener('click', () => {
    const numero = modulosWrap.children.length + 1;
    modulosWrap.appendChild(crearFilaModulo(numero));
    validarSumaComposicion();
    actualizarNotacionPanos();
  });

  document.getElementById('ancho').addEventListener('input', validarSumaComposicion);
  actualizarVisibilidadAccesoriosApertura();
}

/**
 * Las 4 opciones "Sistema corredizo/batiente/pivotante/plegable"
 * en Accesorios y prestaciones técnicas duplican lo que ya se
 * define en el grid de apertura principal o, con más razón, en
 * el constructor de paños — cuando la composición mixta está
 * activa, la apertura de cada paño ya quedó 100% especificada
 * ahí, y dejar estos checkboxes visibles solo invita a marcar
 * algo redundante o contradictorio con lo ya configurado (riesgo
 * real de doble-cobro o de una descripción comercial inconsistente).
 * Por eso se ocultan únicamente mientras hay composición de paños
 * activa; en un ítem simple (sin paños) siguen disponibles como
 * atajo rápido, igual que siempre.
 */
function actualizarVisibilidadAccesoriosApertura() {
  const compuestoActivo = chkComposicionActivo();
  const hint = document.getElementById('hintSistemaApertura');
  document.querySelectorAll('.check-item-sistema-apertura').forEach(label => {
    label.hidden = compuestoActivo;
    if (compuestoActivo) {
      const input = label.querySelector('input[type="checkbox"]');
      if (input) input.checked = false; // no dejar marcada una opción oculta
    }
  });
  if (hint) hint.hidden = !compuestoActivo;
}

function resetearComposicionMixta() {
  document.getElementById('chkComposicionMixta').checked = false;
  document.getElementById('composicionMixta').hidden = true;
  document.getElementById('tipoApertura').disabled = false;
  document.getElementById('composicionModulos').innerHTML = '';
  document.getElementById('composicionSuma').textContent = '';
  const elNotacion = document.getElementById('composicionNotacion');
  if (elNotacion) elNotacion.textContent = '';
  actualizarVisibilidadAccesoriosApertura();
}

function validarDatosMinimos(datos) {
  const errores = [];
  if (!datos.tipoSolucion) errores.push('Selecciona el tipo de solución.');
  if (!datos.ancho || Number(datos.ancho) <= 0) errores.push('Ingresa un ancho válido.');
  if (!datos.alto || Number(datos.alto) <= 0) errores.push('Ingresa un alto válido.');
  if (!datos.cantidad || Number(datos.cantidad) < 1) errores.push('Ingresa una cantidad válida.');
  if (!chkComposicionActivo() && !document.getElementById('tipoVidrio').value) {
    errores.push('Selecciona el tipo de vidrio.');
  }
  if (chkComposicionActivo()) {
    if (!datos.composicion || datos.composicion.length < 2) {
      errores.push('Agrega al menos 2 paños para una composición mixta, o desmarca la casilla.');
    } else if (!validarSumaComposicion()) {
      errores.push('La suma de anchos de los paños no coincide con el ancho total del ítem.');
    }
  }
  return errores;
}

function formatearMl(n) {
  return `${Number(n).toFixed(1)} ml`;
}

function construirDetalleTecnico(it) {
  const c = it.calculo;
  const d = c.despiecePerfiles || {};
  const accAuto = c.accesoriosAuto || [];

  const dibujoSvg = tieneDibujo(c.tipoSolucion) ? generarDibujoItem(c) : null;
  const vista2d = dibujoSvg
    ? `<div class="detalle-vista2d">${dibujoSvg}</div>`
    : `<div class="detalle-vista2d"><span style="color:var(--acero-claro);font-size:11px;">Sin vista técnica disponible para este tipo de solución.</span></div>`;

  const perfilesHtml = `
    <div class="detalle-bloque">
      <h5>Perfiles</h5>
      <ul>
        <li><span>Marco superior</span><span>${formatearMl(d.marcoSuperior || 0)}</span></li>
        <li><span>Marco inferior</span><span>${formatearMl(d.marcoInferior || 0)}</span></li>
        <li><span>Jamba izquierda</span><span>${formatearMl(d.jambaIzquierda || 0)}</span></li>
        <li><span>Jamba derecha</span><span>${formatearMl(d.jambaDerecha || 0)}</span></li>
        <li><span>Parantes / divisiones</span><span>${formatearMl(d.parantes || 0)}</span></li>
        <li><span>Hojas móviles</span><span>${formatearMl(d.hojasMl || 0)}</span></li>
        <li><span><b>Total perfil</b></span><span><b>${formatearMl(d.totalMl || 0)}</b></span></li>
      </ul>
    </div>`;

  const esMultiPano = c.panosCalculados && c.panosCalculados.length > 1;
  const vidrioHtml = esMultiPano
    ? `<div class="detalle-bloque">
        <h5>Vidrio por paño</h5>
        <ul>
          ${c.panosCalculados.map((p, i) => `<li><span>Paño ${String.fromCharCode(65 + i)} (${Number(p.anchoModulo).toFixed(2)} m)</span><span>${p.nombreVidrio}</span></li>`).join('')}
          <li><span><b>Área total</b></span><span><b>${c.areaTotal.toFixed(2)} m²</b></span></li>
          ${c.perfilSerie !== 'noAplica' ? `<li><span>Sistema / serie</span><span>${describirPerfil(c.perfilSerie)}</span></li>` : ''}
        </ul>
      </div>`
    : `<div class="detalle-bloque">
        <h5>Vidrio</h5>
        <ul>
          <li><span>Tipo</span><span>${describirVidrio(c.vidrioCategoria, c.vidrioVariante)}</span></li>
          <li><span>Área unitaria</span><span>${c.areaPorUnidad.toFixed(2)} m²</span></li>
          <li><span>Área total</span><span>${c.areaTotal.toFixed(2)} m²</span></li>
          ${c.perfilSerie !== 'noAplica' ? `<li><span>Sistema / serie</span><span>${describirPerfil(c.perfilSerie)}</span></li>` : ''}
        </ul>
      </div>`;

  const accesoriosHtml = accAuto.length
    ? `<div class="detalle-bloque">
        <h5>Accesorios (cantidad real)</h5>
        <ul>
          ${accAuto.map(l => `<li><span>${describirLineaAccesorioAuto(l).split(':')[0]}</span><span>${describirLineaAccesorioAuto(l).split(':')[1].trim()}</span></li>`).join('')}
        </ul>
      </div>`
    : `<div class="detalle-bloque">
        <h5>Accesorios (cantidad real)</h5>
        <ul><li><span>Sin mecanismo de apertura — no requiere herrajes.</span><span></span></li></ul>
      </div>`;

  return `
    ${vista2d}
    ${perfilesHtml}
    ${vidrioHtml}
    ${accesoriosHtml}
    <p class="detalle-nota">Cantidades de perfil y accesorios calculadas con reglas estándar de mercado según tipo de apertura, número de hojas y medidas — estimación preliminar a validar con taller antes de fabricar.</p>
  `;
}

/* ------------------------------------------------------------
   RENDER: lista de ítems del proyecto (tarjetas horizontales)
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
    const serieTexto = c.perfilSerie !== 'noAplica' ? describirPerfil(c.perfilSerie) : '—';
    const esMultiPanoSpec = c.panosCalculados && c.panosCalculados.length > 1;
    const aperturaTexto = esMultiPanoSpec ? `${c.notacionPanos} ${c.nombreApertura}` : c.nombreApertura;
    const vidrioTexto = esMultiPanoSpec
      ? c.panosCalculados.map((p, i) => `${String.fromCharCode(65 + i)}: ${p.nombreVidrio}`).join(' · ')
      : describirVidrio(c.vidrioCategoria, c.vidrioVariante);
    return `
      <div class="item-card" data-id="${it.id}">
        <div class="item-card-top">
          <span class="item-codigo">${it.codigo}</span>
          <div class="item-specs">
            <div class="item-spec"><span class="item-spec-label">Solución</span><span class="item-spec-value">${c.nombreSolucion}</span></div>
            <div class="item-spec"><span class="item-spec-label">Serie</span><span class="item-spec-value">${serieTexto}</span></div>
            <div class="item-spec"><span class="item-spec-label">Apertura</span><span class="item-spec-value">${aperturaTexto}</span></div>
            <div class="item-spec"><span class="item-spec-label">Vidrio</span><span class="item-spec-value">${vidrioTexto}</span></div>
            <div class="item-spec"><span class="item-spec-label">Medidas</span><span class="item-spec-value">${c.ancho.toFixed(2)} × ${c.alto.toFixed(2)} m</span></div>
            <div class="item-spec"><span class="item-spec-label">Cantidad</span><span class="item-spec-value">${c.cantidad}</span></div>
            <div class="item-spec"><span class="item-spec-label">Área total</span><span class="item-spec-value">${c.areaTotal.toFixed(2)} m²</span></div>
          </div>
          <div class="item-row-precio">${formatearSoles(c.costoItemAntesUrgencia)}</div>
          <div class="item-row-actions">
            <button type="button" class="item-btn-toggle" data-action="toggle" data-id="${it.id}" title="Ver desglose técnico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <button type="button" class="item-btn-editar" data-action="editar" data-id="${it.id}" title="Editar ítem">✎</button>
            <button type="button" class="item-btn-dup" data-action="duplicar" data-id="${it.id}" title="Duplicar ítem">⧉</button>
            <button type="button" class="item-btn-del" data-action="eliminar" data-id="${it.id}" title="Eliminar ítem">✕</button>
          </div>
        </div>
        <div class="item-detalle" id="detalle-${it.id}" hidden>
          ${construirDetalleTecnico(it)}
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
  const tablasCard = document.getElementById('tablasCard');
  const observacionesCard = document.getElementById('observacionesCard');
  const items = obtenerItems();

  if (items.length === 0) {
    resultEmpty.hidden = false;
    resultContent.hidden = true;
    tablasCard.hidden = true;
    observacionesCard.hidden = true;
    window.__ultimoResumenProyecto = null;
    return;
  }

  const urgencia = document.getElementById('urgencia').value || 'normal';
  const utilidadPct = Number(document.getElementById('utilidad').value) || 0;
  const distrito = document.getElementById('distrito').value || '—';

  const resumen = obtenerResumenProyecto(urgencia, utilidadPct);

  resultEmpty.hidden = true;
  resultContent.hidden = false;
  tablasCard.hidden = false;
  observacionesCard.hidden = false;

  document.getElementById('resultCantidadItems').textContent = resumen.cantidadItems;
  document.getElementById('resultArea').textContent = resumen.areaTotalProyecto.toFixed(2) + ' m²';
  document.getElementById('resultDistrito').textContent = distrito;

  document.getElementById('bdCostoBase').textContent = formatearSoles(resumen.resumenEconomico.costosDirectos);
  document.getElementById('bdManoObra').textContent = formatearSoles(resumen.resumenEconomico.manoDeObraInstalacion);
  document.getElementById('bdAccesorios').textContent = formatearSoles(resumen.resumenEconomico.serviciosProyecto);
  const montoAjusteUrgencia = resumen.costoTotalAntesUtilidad - resumen.subtotalAntesUrgencia;
  document.getElementById('bdInstalacion').textContent = formatearSoles(montoAjusteUrgencia);
  document.getElementById('bdCostoTotal').textContent = formatearSoles(resumen.costoTotalAntesUtilidad);
  document.getElementById('bdUtilidadPct').textContent = resumen.utilidadPct + '%';
  document.getElementById('bdUtilidadMonto').textContent = formatearSoles(resumen.montoUtilidad);
  document.getElementById('resultPrecioFinal').textContent = formatearSoles(resumen.precioFinal);

  // Resumen con IGV configurable (Subtotal / IGV / Total).
  const igvActivo = document.getElementById('chkIgvActivo').checked;
  const resumenIgv = calcularResumenConIgv(resumen.precioFinal, { igvActivo });
  document.getElementById('bdSubtotalIgv').textContent = formatearSoles(resumenIgv.subtotal);
  document.getElementById('filaIgv').hidden = !igvActivo;
  document.getElementById('bdMontoIgv').textContent = formatearSoles(resumenIgv.montoIgv);
  document.getElementById('bdTotalConIgv').textContent = formatearSoles(resumenIgv.total);

  // Tablas de materiales y servicios (Prioridad 1 y 2).
  renderTablasMaterialesServicios(resumen);

  // Puente de compatibilidad con el PDF/WhatsApp legacy (calculadora.js),
  // que todavía lee `ultimoCalculo` de un solo ítem. Se expone aquí el
  // resumen agregado del proyecto para que ese código no falle, aunque
  // el diseño visual del PDF para múltiples ítems es una migración
  // pendiente (fase de pdfGenerator.js, fuera del alcance de esta fase).
  window.__ultimoResumenProyecto = resumen;
}

/**
 * Renderiza las tablas de materiales y servicios del proyecto
 * (Material/Descripción/Unidad/Cantidad/P.Unit/Total y
 * Descripción/Unidad/Cantidad/P.Unit/Total respectivamente),
 * construidas por rules.js a partir del mismo cálculo que ya
 * alimenta el resumen económico — una sola fuente de verdad.
 */
function renderTablasMaterialesServicios(resumenProyecto) {
  const { materiales, servicios, totalMateriales, totalServicios } = construirTablasProyecto(resumenProyecto);

  const bodyMateriales = document.getElementById('tablaMaterialesBody');
  bodyMateriales.innerHTML = materiales.length
    ? materiales.map(l => `
        <tr>
          <td class="celda-material">${l.material}</td>
          <td class="celda-desc">${l.descripcion}</td>
          <td>${l.unidad}</td>
          <td class="num">${l.cantidad}</td>
          <td class="num">${formatearSoles(l.precioUnitario)}</td>
          <td class="num">${formatearSoles(l.total)}</td>
        </tr>`).join('')
    : `<tr><td colspan="6" class="tabla-vacia">Sin materiales calculados todavía.</td></tr>`;
  document.getElementById('totalMaterialesTabla').textContent = formatearSoles(totalMateriales);

  const bodyServicios = document.getElementById('tablaServiciosBody');
  bodyServicios.innerHTML = servicios.length
    ? servicios.map(l => `
        <tr>
          <td class="celda-desc">${l.descripcion}</td>
          <td>${l.unidad}</td>
          <td class="num">${l.cantidad}</td>
          <td class="num">${formatearSoles(l.precioUnitario)}</td>
          <td class="num">${formatearSoles(l.total)}</td>
        </tr>`).join('')
    : `<tr><td colspan="5" class="tabla-vacia">Sin servicios calculados todavía.</td></tr>`;
  document.getElementById('totalServiciosTabla').textContent = formatearSoles(totalServicios);
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

  if (_idEnEdicion) {
    editarItem(_idEnEdicion, datos);
    _idEnEdicion = null;
    document.getElementById('btnAgregarItemTexto').textContent = 'Agregar ítem a la lista';
    document.getElementById('btnAgregarItem').classList.remove('btn-editando');
  } else {
    agregarItem(datos);
  }
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
  resetearComposicionMixta();
  renderGridTipoSolucion('');
  renderGridTipoApertura('fijo');
  document.getElementById('grupoVariantesDucha').hidden = true;
}

function manejarListaClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;

  if (action === 'toggle') {
    const detalle = document.getElementById(`detalle-${id}`);
    if (detalle) {
      detalle.hidden = !detalle.hidden;
      btn.classList.toggle('is-open', !detalle.hidden);
    }
    return;
  }

  if (action === 'editar') {
    cargarItemEnFormulario(id);
    return;
  }

  if (action === 'duplicar') duplicarItem(id);
  if (action === 'eliminar') eliminarItem(id);
  renderItems();
  actualizarResultado();
}

/**
 * Carga los datos de un ítem existente en el formulario para
 * edición. Al presionar "Agregar ítem a la lista" después de
 * editar, se actualiza el ítem original en vez de crear uno nuevo
 * (ver `_idEnEdicion` y `manejarAgregarItem`).
 */
function cargarItemEnFormulario(id) {
  const item = obtenerItemPorId(id);
  if (!item) return;
  const d = item.datosOriginales;
  const set = (idEl, valor) => { const el = document.getElementById(idEl); if (el) el.value = valor ?? ''; };

  set('tipoSolucion', d.tipoSolucion);
  set('ancho', d.ancho);
  set('alto', d.alto);
  set('cantidad', d.cantidad);
  set('colorAluminio', d.colorAluminio);
  renderGridTipoSolucion(d.tipoSolucion);
  actualizarVisibilidadVariantesDucha(d.tipoSolucion);

  // Vidrio/material legacy: buscar la clave legacy que mapea a la categoría/serie guardada.
  const tipoVidrioSelect = document.getElementById('tipoVidrio');
  Array.from(tipoVidrioSelect.options).forEach(opt => {
    const mapeo = MAPEO_VIDRIO_LEGACY[opt.value];
    if (mapeo && mapeo.categoria === d.vidrioCategoria) tipoVidrioSelect.value = opt.value;
  });
  const materialSelect = document.getElementById('materialSistema');
  Array.from(materialSelect.options).forEach(opt => {
    if (MAPEO_PERFIL_LEGACY[opt.value] === d.perfilSerie) materialSelect.value = opt.value;
  });

  resetearComposicionMixta();
  const panosParaEditar = (d.panos && d.panos.length > 1) ? d.panos : null;
  const composicionParaEditar = panosParaEditar || (d.composicion && d.composicion.length > 1 ? d.composicion : null);
  if (composicionParaEditar) {
    document.getElementById('chkComposicionMixta').checked = true;
    document.getElementById('composicionMixta').hidden = false;
    document.getElementById('tipoApertura').disabled = true;
    const modulosWrap = document.getElementById('composicionModulos');
    composicionParaEditar.forEach((m, i) => {
      const vidrioLegacy = m.vidrioCategoria ? claveLegacyDeVidrio(m.vidrioCategoria) : '';
      modulosWrap.appendChild(crearFilaModulo(i + 1, m.tipoApertura, m.anchoModulo, vidrioLegacy, m.altoModulo ?? ''));
    });
    validarSumaComposicion();
    actualizarNotacionPanos();
    renderGridTipoApertura('');
  } else {
    set('tipoApertura', d.tipoApertura || 'fijo');
    renderGridTipoApertura(d.tipoApertura || 'fijo');
  }
  actualizarVisibilidadAccesoriosApertura();

  document.querySelectorAll('input[name="accesorios"]:checked').forEach(cb => cb.checked = false);
  const clavesSistemaApertura = ['sistemaCorredizo', 'sistemaBatiente', 'sistemaPivotante', 'sistemaPlegable'];
  (d.accesoriosLegacy || []).forEach(clave => {
    if (chkComposicionActivo() && clavesSistemaApertura.includes(clave)) return; // oculto: no restaurar
    const cb = document.querySelector(`input[name="accesorios"][value="${clave}"]`);
    if (cb) cb.checked = true;
  });

  _idEnEdicion = id;
  document.getElementById('btnAgregarItemTexto').textContent = 'Guardar cambios del ítem';
  document.getElementById('btnAgregarItem').classList.add('btn-editando');

  document.getElementById('calcForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function manejarLimpiarTodo() {
  const form = document.getElementById('calcForm');
  form.reset();
  vaciarProyecto();
  resetearComposicionMixta();
  _idEnEdicion = null;
  document.getElementById('btnAgregarItemTexto').textContent = 'Agregar ítem a la lista';
  document.getElementById('btnAgregarItem').classList.remove('btn-editando');
  document.getElementById('formAlert').hidden = true;
  renderGridTipoSolucion('');
  renderGridTipoApertura('fijo');
  document.getElementById('grupoVariantesDucha').hidden = true;
  renderItems();
  renderAccesoriosProyecto();
  actualizarResultado();
}

/**
 * Espera a que todas las <img> dentro de un contenedor terminen de
 * cargar/decodificar. Mismo patrón ya verificado en calculadora.js
 * (corrige el bug histórico de "render en blanco" por capturar antes
 * de que la imagen tuviera contenido pintado). Aquí las imágenes son
 * SVG data-URI generados localmente (carga prácticamente instantánea),
 * pero se mantiene la misma robustez por si en el futuro se agregan
 * fotos reales al PDF.
 */
function esperarImagenesListas(contenedor) {
  const imgs = Array.from(contenedor.querySelectorAll('img'));
  if (!imgs.length) return Promise.resolve();
  const esperarUna = (img) => new Promise((resolve) => {
    const finalizar = () => resolve();
    const timeoutId = setTimeout(finalizar, 4000);
    const listo = () => { clearTimeout(timeoutId); finalizar(); };
    if (img.complete && img.naturalWidth > 0) {
      if (typeof img.decode === 'function') img.decode().then(listo).catch(listo);
      else listo();
      return;
    }
    img.addEventListener('load', () => {
      if (typeof img.decode === 'function') img.decode().then(listo).catch(listo);
      else listo();
    }, { once: true });
    img.addEventListener('error', listo, { once: true });
  });
  return Promise.all(imgs.map(esperarUna));
}

/**
 * Calcula los puntos de corte "seguros" (en píxeles del canvas) a partir
 * de los límites reales de los bloques no-cortables del documento: cada
 * fila de ítem, el bloque de totales, el bloque de firma y el footer.
 * Devuelve la lista de los bordes inferiores (`bottom`) de cada bloque,
 * en el mismo sistema de coordenadas que el canvas (que captura a
 * `scale: 2`, de ahí el factor de escala recibido).
 */
function calcularPuntosDeCorte(nodoPdf, factorEscala) {
  const selectorBloques = '.item-row, .acc-row, .totales, .bloque-firma, .foot';
  const bloques = Array.from(nodoPdf.querySelectorAll(selectorBloques));
  const rectRaiz = nodoPdf.getBoundingClientRect();
  return bloques
    .map(el => (el.getBoundingClientRect().bottom - rectRaiz.top) * factorEscala)
    .sort((a, b) => a - b);
}

/**
 * Inserta un canvas (capturado con html2canvas) en un documento jsPDF,
 * repartiéndolo en tantas páginas A4 como haga falta cuando el contenido
 * es más alto que una sola página.
 *
 * BUG ORIGINAL: el código anterior calculaba `altoA4` proporcional al
 * canvas completo y lo insertaba en una sola página A4 de 297mm fijos.
 * Cuando el contenido real (ej. un presupuesto con 10+ ítems) superaba
 * esa altura, jsPDF simplemente NO DIBUJABA lo que sobraba del límite
 * de la página — sin error, sin aviso, el resto del documento
 * desaparecía en silencio (footer, total, últimos ítems, según cuánto
 * sobrara). Esto reproduce exactamente el síntoma reportado: PDFs de
 * presupuestos largos que salían "incompletos" en una sola hoja.
 *
 * FIX (versión con corte inteligente): en vez de cortar el canvas en
 * franjas de altura fija sin mirar el contenido (lo que a veces partía
 * una fila a la mitad, o dejaba una página siguiente casi en blanco con
 * solo el footer), se recibe opcionalmente `puntosDeCorte` — los bordes
 * inferiores reales de cada bloque no-cortable (filas, totales, firma,
 * footer). Cada página avanza hasta el punto de corte más cercano por
 * debajo del límite de 297mm sin pasarlo, así el corte siempre cae en
 * un espacio entre bloques, nunca a mitad de uno. Si no se reciben
 * puntos de corte (o el bloque es tan alto que no cabe ninguno), se usa
 * el límite fijo de página como respaldo, igual que antes.
 */
function agregarCanvasComoPaginasA4(doc, canvas, puntosDeCorte = []) {
  const anchoA4mm = 210;
  const altoA4mm = 297;
  const altoMaxFranjaPx = Math.floor((altoA4mm * canvas.width) / anchoA4mm);
  // Margen de tolerancia: el `canvas.height` real (de html2canvas) y los
  // bordes medidos en el DOM con getBoundingClientRect() casi nunca
  // coinciden al píxel exacto (redondeos de subpíxel, bordes de 1px,
  // etc.). Sin este margen, un resto de pocos píxeles al final del
  // documento generaba una página adicional casi en blanco.
  const UMBRAL_RESTO_INSIGNIFICANTE_PX = 6;

  let yOffsetPx = 0;
  let esPrimeraPagina = true;
  while (canvas.height - yOffsetPx > UMBRAL_RESTO_INSIGNIFICANTE_PX) {
    const limiteFranjaPx = yOffsetPx + altoMaxFranjaPx;
    let finFranjaPx = Math.min(limiteFranjaPx, canvas.height);

    // Buscar el punto de corte real más cercano (de abajo hacia arriba)
    // que no exceda el límite de la página y que avance al menos un
    // poco respecto al inicio de esta franja (evita bucles infinitos
    // si un único bloque, ej. una fila muy alta, ya supera una página).
    const candidatos = puntosDeCorte.filter(p => p > yOffsetPx + altoMaxFranjaPx * 0.3 && p <= limiteFranjaPx);
    if (candidatos.length > 0) finFranjaPx = candidatos[candidatos.length - 1];

    // Si el punto de corte elegido deja un resto insignificante después
    // (el caso típico: el último bloque del documento termina a 1-2px
    // del borde real del canvas), se extiende esta franja hasta el final
    // en vez de dejar ese resto para una página nueva.
    if (canvas.height - finFranjaPx <= UMBRAL_RESTO_INSIGNIFICANTE_PX) finFranjaPx = canvas.height;

    const altoEstaFranjaPx = Math.min(finFranjaPx - yOffsetPx, canvas.height - yOffsetPx);

    const canvasFranja = document.createElement('canvas');
    canvasFranja.width = canvas.width;
    canvasFranja.height = altoEstaFranjaPx;
    const ctx = canvasFranja.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasFranja.width, canvasFranja.height);
    ctx.drawImage(canvas, 0, yOffsetPx, canvas.width, altoEstaFranjaPx, 0, 0, canvas.width, altoEstaFranjaPx);

    const imagenFranja = canvasFranja.toDataURL('image/jpeg', 0.92);
    const altoFranjaMm = (altoEstaFranjaPx * anchoA4mm) / canvas.width;

    if (!esPrimeraPagina) doc.addPage();
    doc.addImage(imagenFranja, 'JPEG', 0, 0, anchoA4mm, altoFranjaMm);

    yOffsetPx += altoEstaFranjaPx;
    esPrimeraPagina = false;
  }
}

async function manejarGenerarPdf() {
  const items = obtenerItems();
  if (items.length === 0) {
    const formAlert = document.getElementById('formAlert');
    formAlert.textContent = 'Agrega al menos un ítem a la lista antes de generar el PDF.';
    formAlert.hidden = false;
    return;
  }
  if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
    alert('No se pudo cargar el generador de PDF. Verifica tu conexión e intenta de nuevo.');
    return;
  }

  const btnGenerarPdf = document.getElementById('btnGenerarPdf');
  const htmlOriginalBoton = btnGenerarPdf.innerHTML;
  btnGenerarPdf.disabled = true;
  btnGenerarPdf.innerHTML = 'Generando PDF…';

  let contenedorTemporal = null;
  try {
    const urgencia = document.getElementById('urgencia').value || 'normal';
    const utilidadPct = Number(document.getElementById('utilidad').value) || 0;
    const resumenProyecto = obtenerResumenProyecto(urgencia, utilidadPct);

    const cliente = document.getElementById('nombreCliente').value.trim() || '—';
    const ruc = document.getElementById('rucCliente').value.trim() || 'No registrado';
    const distrito = document.getElementById('distrito').value.trim() || '—';
    const urgenciaTexto = { normal: 'Normal', urgente: 'Urgente', evaluacion: 'Proyecto en evaluación' }[urgencia] || '—';
    const tienePlanosTexto = document.getElementById('tienePlanos').value === 'si' ? 'Sí' : 'No';

    const fechaHoy = new Date();
    const numeroPropuesta = 'COT-' + fechaHoy.getFullYear() +
      String(fechaHoy.getMonth() + 1).padStart(2, '0') +
      String(fechaHoy.getDate()).padStart(2, '0') + '-' +
      String(fechaHoy.getHours()).padStart(2, '0') +
      String(fechaHoy.getMinutes()).padStart(2, '0');
    const fechaTexto = fechaHoy.toLocaleDateString('es-PE');

    const igvActivo = document.getElementById('chkIgvActivo').checked;
    const observaciones = {
      formaPago: document.getElementById('obsFormaPago').value.trim(),
      tiempoEntrega: document.getElementById('obsTiempoEntrega').value.trim(),
      garantia: document.getElementById('obsGarantia').value.trim(),
      validez: document.getElementById('obsValidez').value.trim(),
      tecnicas: document.getElementById('obsTecnicas').value.trim(),
    };

    const htmlPropuesta = construirHtmlPdfProyecto({
      resumenProyecto, cliente, ruc, distrito, urgenciaTexto, tienePlanosTexto, numeroPropuesta, fechaTexto,
      igvActivo, observaciones,
    });

    contenedorTemporal = document.createElement('div');
    contenedorTemporal.style.position = 'fixed';
    contenedorTemporal.style.top = '0';
    contenedorTemporal.style.left = '-9999px';
    contenedorTemporal.style.zIndex = '-1';
    contenedorTemporal.innerHTML = htmlPropuesta;
    document.body.appendChild(contenedorTemporal);

    await esperarImagenesListas(contenedorTemporal);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const nodoPdf = contenedorTemporal.querySelector('#pdfRoot');
    const canvas = await window.html2canvas(nodoPdf, {
      scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
    });
    const factorEscala = canvas.width / nodoPdf.getBoundingClientRect().width;
    const puntosDeCorte = calcularPuntosDeCorte(nodoPdf, factorEscala);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    agregarCanvasComoPaginasA4(doc, canvas, puntosDeCorte);

    const nombreArchivo = `Cotizacion_${numeroPropuesta}_${cliente.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    doc.save(nombreArchivo);
  } finally {
    if (contenedorTemporal && contenedorTemporal.parentNode) {
      contenedorTemporal.parentNode.removeChild(contenedorTemporal);
    }
    btnGenerarPdf.disabled = false;
    btnGenerarPdf.innerHTML = htmlOriginalBoton;
  }
}

/* ============================================================
   IMPORTAR PRESUPUESTO DESDE EXCEL (módulo temporal)
   ============================================================
   Ver excelImporter.js y pdfGeneratorExcel.js para el detalle de
   por qué este flujo NO reutiliza calcularItem()/manejarGenerarPdf()
   tal cual: los ítems importados no pasan por el motor de cálculo,
   así que necesitan su propio render de vista previa y su propia
   función de construcción de HTML para el PDF (construirHtmlPdfExcel),
   aunque SÍ reutilizan el mismo motor de dibujo SVG y la misma
   captura html2canvas + jsPDF que el flujo manual.
   ------------------------------------------------------------ */
let _ultimaImportacionExcel = null; // { cliente, ruc, distrito, direccion, fecha, numeroPresupuesto, lineasFirmante, etiquetaCliente, itemsImportados }

/** Renderiza el HTML dado a un PDF A4 y lo descarga — misma lógica de captura que manejarGenerarPdf(), extraída aquí para no duplicarla. */
async function renderizarHtmlComoPdf(htmlContenido, nombreArchivo) {
  if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
    alert('No se pudo cargar el generador de PDF. Verifica tu conexión e intenta de nuevo.');
    return;
  }
  let contenedorTemporal = null;
  try {
    contenedorTemporal = document.createElement('div');
    contenedorTemporal.style.position = 'fixed';
    contenedorTemporal.style.top = '0';
    contenedorTemporal.style.left = '-9999px';
    contenedorTemporal.style.zIndex = '-1';
    contenedorTemporal.innerHTML = htmlContenido;
    document.body.appendChild(contenedorTemporal);

    await esperarImagenesListas(contenedorTemporal);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const nodoPdf = contenedorTemporal.querySelector('#pdfRoot');
    const canvas = await window.html2canvas(nodoPdf, {
      scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
    });
    const factorEscala = canvas.width / nodoPdf.getBoundingClientRect().width;
    const puntosDeCorte = calcularPuntosDeCorte(nodoPdf, factorEscala);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    agregarCanvasComoPaginasA4(doc, canvas, puntosDeCorte);
    doc.save(nombreArchivo);
  } finally {
    if (contenedorTemporal && contenedorTemporal.parentNode) {
      contenedorTemporal.parentNode.removeChild(contenedorTemporal);
    }
  }
}

function mostrarMensajesImportExcel(errores) {
  const cont = document.getElementById('importExcelMensajes');
  if (!errores || errores.length === 0) {
    cont.hidden = true;
    cont.innerHTML = '';
    return;
  }
  cont.hidden = false;
  cont.className = 'import-excel-mensajes es-advertencia';
  cont.innerHTML = `<b>Revisa lo siguiente antes de generar el PDF:</b><ul>${errores.map(e => `<li>${e}</li>`).join('')}</ul>`;
}

function mostrarErrorCriticoImportExcel(mensaje) {
  const cont = document.getElementById('importExcelMensajes');
  cont.hidden = false;
  cont.className = 'import-excel-mensajes es-error';
  cont.innerHTML = `<b>No se pudo leer el archivo:</b> ${mensaje}`;
  document.getElementById('importExcelPreview').hidden = true;
}

function renderPreviewImportExcel(resultado) {
  const { cliente, ruc, distrito, itemsImportados } = resultado;
  const total = itemsImportados.reduce((acc, it) => acc + (Number(it.precio) || 0), 0);

  document.getElementById('importExcelResumen').innerHTML =
    `Cliente: <b>${cliente}</b> &nbsp;·&nbsp; ${itemsImportados.length} ítem(s) &nbsp;·&nbsp; Total: <b>${formatearSoles(total)}</b>`;

  const tbody = document.getElementById('tablaImportExcelBody');
  tbody.innerHTML = itemsImportados.map(it => `
    <tr>
      <td class="celda-material">${it.codigo}</td>
      <td class="celda-desc">${it.tipoTexto}${it.tipoReconocido ? '' : ' <span title="Tipo no reconocido: se incluirá sin dibujo técnico">⚠</span>'}</td>
      <td>${it.ancho != null && it.alto != null ? `${Number(it.ancho).toFixed(2)} × ${Number(it.alto).toFixed(2)} m` : '—'}</td>
      <td class="num">${it.cantidad}</td>
      <td class="num">${formatearSoles(it.precio)}</td>
    </tr>
  `).join('');

  document.getElementById('importExcelPreview').hidden = false;
}

async function manejarArchivoExcelSeleccionado(archivo) {
  document.getElementById('importExcelNombreArchivo').textContent = archivo.name;
  mostrarMensajesImportExcel(null);
  document.getElementById('importExcelPreview').hidden = true;

  try {
    const arrayBuffer = await archivo.arrayBuffer();
    const resultado = importarPresupuestoExcel(arrayBuffer);
    _ultimaImportacionExcel = resultado;
    mostrarMensajesImportExcel(resultado.errores);
    renderPreviewImportExcel(resultado);
  } catch (e) {
    _ultimaImportacionExcel = null;
    mostrarErrorCriticoImportExcel(e.message || String(e));
  }
}

async function manejarGenerarPdfExcel() {
  if (!_ultimaImportacionExcel || _ultimaImportacionExcel.itemsImportados.length === 0) return;
  const btn = document.getElementById('btnGenerarPdfExcel');
  const htmlOriginalBoton = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = 'Generando PDF…';

  try {
    const { cliente, ruc, distrito, direccion, fecha, numeroPresupuesto, lineasFirmante, etiquetaCliente, itemsImportados } = _ultimaImportacionExcel;
    const fechaHoy = new Date();
    const numeroPropuesta = 'COT-' + fechaHoy.getFullYear() +
      String(fechaHoy.getMonth() + 1).padStart(2, '0') +
      String(fechaHoy.getDate()).padStart(2, '0') + '-' +
      String(fechaHoy.getHours()).padStart(2, '0') +
      String(fechaHoy.getMinutes()).padStart(2, '0');
    const fechaTexto = fecha || fechaHoy.toLocaleDateString('es-PE');
    const numeroParaArchivo = numeroPresupuesto || numeroPropuesta; // preferir el número real del Excel para que el archivo sea identificable a simple vista

    const htmlPropuesta = construirHtmlPdfExcel({
      itemsImportados, cliente, ruc, distrito, direccion, fechaTexto, numeroPropuesta,
      numeroPresupuesto, lineasFirmante, etiquetaCliente,
    });
    const nombreArchivo = `Cotizacion_${numeroParaArchivo}_${cliente.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    await renderizarHtmlComoPdf(htmlPropuesta, nombreArchivo);
  } finally {
    btn.disabled = false;
    btn.innerHTML = htmlOriginalBoton;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnAgregarItem').addEventListener('click', manejarAgregarItem);
  document.getElementById('itemsList').addEventListener('click', manejarListaClick);
  document.getElementById('btnLimpiar').addEventListener('click', manejarLimpiarTodo);
  document.getElementById('btnGenerarPdf').addEventListener('click', manejarGenerarPdf);
  inicializarComposicionMixta();

  // Configurador visual de íconos: sistema, apertura, variantes de ducha.
  renderGridTipoSolucion('');
  renderGridTipoApertura('fijo');

  // Recalcular el proyecto si cambian variables comerciales globales
  // (urgencia, utilidad, distrito) sin necesidad de re-agregar ítems.
  ['urgencia', 'utilidad', 'distrito'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', actualizarResultado);
    if (el) el.addEventListener('input', actualizarResultado);
  });
  document.getElementById('chkIgvActivo').addEventListener('change', actualizarResultado);

  // Importar presupuesto desde Excel (módulo temporal)
  const inputExcel = document.getElementById('inputExcelPresupuesto');
  document.getElementById('btnSeleccionarExcel').addEventListener('click', () => inputExcel.click());
  inputExcel.addEventListener('change', () => {
    if (inputExcel.files && inputExcel.files[0]) manejarArchivoExcelSeleccionado(inputExcel.files[0]);
  });
  document.getElementById('btnGenerarPdfExcel').addEventListener('click', manejarGenerarPdfExcel);

  renderItems();
  renderAccesoriosProyecto();
  actualizarResultado();
});

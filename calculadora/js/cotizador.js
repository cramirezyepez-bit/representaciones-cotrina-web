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

  return {
    tipoSolucion,
    tipoApertura,
    composicion,
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
  cerramiento: 'Cerramiento', divisionInterior: 'División', cerramientoPersonalizado: 'Personalizado',
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
  });
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

function opcionesTipoApertura(seleccionado) {
  return listarTiposApertura().map(t =>
    `<option value="${t.key}" ${t.key === seleccionado ? 'selected' : ''}>${t.nombre}</option>`
  ).join('');
}

function crearFilaModulo(numero, tipoAperturaDefault = 'fijo', anchoDefault = '') {
  const fila = document.createElement('div');
  fila.className = 'composicion-modulo-row';
  fila.innerHTML = `
    <span class="mod-label">Módulo ${numero}</span>
    <select class="mod-tipo-apertura">${opcionesTipoApertura(tipoAperturaDefault)}</select>
    <input type="number" class="mod-ancho" min="0" step="0.01" placeholder="Ancho (m)" value="${anchoDefault}">
    <button type="button" class="btn-quitar-modulo" title="Quitar módulo">✕</button>
  `;
  fila.querySelector('.btn-quitar-modulo').addEventListener('click', () => {
    fila.remove();
    renumerarModulos();
    validarSumaComposicion();
  });
  fila.querySelector('.mod-ancho').addEventListener('input', validarSumaComposicion);
  return fila;
}

function renumerarModulos() {
  document.querySelectorAll('.composicion-modulo-row .mod-label').forEach((lbl, i) => {
    lbl.textContent = `Módulo ${i + 1}`;
  });
}

function validarSumaComposicion() {
  const elSuma = document.getElementById('composicionSuma');
  const anchoItem = Number(document.getElementById('ancho').value) || 0;
  const filas = document.querySelectorAll('.composicion-modulo-row .mod-ancho');
  const suma = Array.from(filas).reduce((acc, inp) => acc + (Number(inp.value) || 0), 0);

  if (filas.length < 2) {
    elSuma.textContent = 'Agrega al menos 2 módulos para una composición mixta.';
    elSuma.className = 'field-hint field-hint-tight composicion-suma';
    return false;
  }
  if (!anchoItem) {
    elSuma.textContent = `Suma de módulos: ${suma.toFixed(2)} m. Ingresa el ancho total del ítem para validar.`;
    elSuma.className = 'field-hint field-hint-tight composicion-suma';
    return false;
  }
  const diferencia = Math.abs(suma - anchoItem);
  if (diferencia > 0.02) {
    elSuma.textContent = `⚠ La suma de módulos (${suma.toFixed(2)} m) no coincide con el ancho total del ítem (${anchoItem.toFixed(2)} m).`;
    elSuma.className = 'field-hint field-hint-tight composicion-suma suma-error';
    return false;
  }
  elSuma.textContent = `✓ Suma de módulos: ${suma.toFixed(2)} m — coincide con el ancho total.`;
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
    }
  });

  btnAgregar.addEventListener('click', () => {
    const numero = modulosWrap.children.length + 1;
    modulosWrap.appendChild(crearFilaModulo(numero));
    validarSumaComposicion();
  });

  document.getElementById('ancho').addEventListener('input', validarSumaComposicion);
}

function resetearComposicionMixta() {
  document.getElementById('chkComposicionMixta').checked = false;
  document.getElementById('composicionMixta').hidden = true;
  document.getElementById('tipoApertura').disabled = false;
  document.getElementById('composicionModulos').innerHTML = '';
  document.getElementById('composicionSuma').textContent = '';
}

function validarDatosMinimos(datos) {
  const errores = [];
  if (!datos.tipoSolucion) errores.push('Selecciona el tipo de solución.');
  if (!datos.ancho || Number(datos.ancho) <= 0) errores.push('Ingresa un ancho válido.');
  if (!datos.alto || Number(datos.alto) <= 0) errores.push('Ingresa un alto válido.');
  if (!datos.cantidad || Number(datos.cantidad) < 1) errores.push('Ingresa una cantidad válida.');
  if (!document.getElementById('tipoVidrio').value) errores.push('Selecciona el tipo de vidrio.');
  if (chkComposicionActivo()) {
    if (!datos.composicion || datos.composicion.length < 2) {
      errores.push('Agrega al menos 2 módulos para una composición mixta, o desmarca la casilla.');
    } else if (!validarSumaComposicion()) {
      errores.push('La suma de anchos de los módulos no coincide con el ancho total del ítem.');
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

  const vidrioHtml = `
    <div class="detalle-bloque">
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
    return `
      <div class="item-card" data-id="${it.id}">
        <div class="item-card-top">
          <span class="item-codigo">${it.codigo}</span>
          <div class="item-specs">
            <div class="item-spec"><span class="item-spec-label">Solución</span><span class="item-spec-value">${c.nombreSolucion}</span></div>
            <div class="item-spec"><span class="item-spec-label">Serie</span><span class="item-spec-value">${serieTexto}</span></div>
            <div class="item-spec"><span class="item-spec-label">Apertura</span><span class="item-spec-value">${c.nombreApertura}</span></div>
            <div class="item-spec"><span class="item-spec-label">Vidrio</span><span class="item-spec-value">${describirVidrio(c.vidrioCategoria, c.vidrioVariante)}</span></div>
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

  document.getElementById('bdCostoBase').textContent = formatearSoles(resumen.resumenEconomico.costosDirectos);
  document.getElementById('bdManoObra').textContent = formatearSoles(resumen.resumenEconomico.manoDeObraInstalacion);
  document.getElementById('bdAccesorios').textContent = formatearSoles(resumen.resumenEconomico.serviciosProyecto);
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
  if (d.composicion && d.composicion.length > 1) {
    document.getElementById('chkComposicionMixta').checked = true;
    document.getElementById('composicionMixta').hidden = false;
    document.getElementById('tipoApertura').disabled = true;
    const modulosWrap = document.getElementById('composicionModulos');
    d.composicion.forEach((m, i) => {
      modulosWrap.appendChild(crearFilaModulo(i + 1, m.tipoApertura, m.anchoModulo));
    });
    validarSumaComposicion();
    renderGridTipoApertura('');
  } else {
    set('tipoApertura', d.tipoApertura || 'fijo');
    renderGridTipoApertura(d.tipoApertura || 'fijo');
  }

  document.querySelectorAll('input[name="accesorios"]:checked').forEach(cb => cb.checked = false);
  (d.accesoriosLegacy || []).forEach(clave => {
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

    const htmlPropuesta = construirHtmlPdfProyecto({
      resumenProyecto, cliente, ruc, distrito, urgenciaTexto, tienePlanosTexto, numeroPropuesta, fechaTexto,
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
    const imagenCanvas = canvas.toDataURL('image/jpeg', 0.92);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const anchoA4 = 210;
    const altoA4 = (canvas.height * anchoA4) / canvas.width;
    doc.addImage(imagenCanvas, 'JPEG', 0, 0, anchoA4, altoA4);

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

  renderItems();
  renderAccesoriosProyecto();
  actualizarResultado();
});

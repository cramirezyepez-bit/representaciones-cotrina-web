/**
 * panelDespieceInterno.js
 * ------------------------------------------------------------------
 * Panel de "Despiece y costeo de serie": mientras el equipo comercial
 * llena Ancho / Alto / Cantidad y elige un Material del sistema que
 * corresponde a una serie con motor de cálculo real — Serie 25
 * (nacional, económica) o Corporación Limatambo (VL46, ML46, VL48,
 * ML48, MBL46) — este módulo calcula el despiece técnico exacto
 * (perfiles, cortes, vidrio, compra de varillas, accesorios) y un
 * costeo de instalación + armado (formato plantilla "COTIZADOR"
 * interna: movilidad, tipo de cambio, S/xm² instalación, S/xm²
 * armado, otro costo) — sin depender de abrir el Excel SERIE25_V5.xlsx
 * ni de llamar a Limatambo por cada cotización.
 *
 * DISEÑO INTENCIONAL: módulo completamente desacoplado de
 * cotizador.js / proyecto.js / pdfGenerator.js.
 *   - No participa en el cálculo de precio del ítem.
 *   - No se agrega al proyecto ni se exporta en el PDF del cliente.
 *   - Es solo una vista de apoyo para el equipo comercial en pantalla.
 * Esto evita tocar la lógica de precios existente (pendiente de que
 * Jorge confirme costos reales por serie) y evita cualquier riesgo
 * de que el despiece técnico interno termine filtrándose al cliente.
 * ------------------------------------------------------------------
 */

import { calcularDespieceVL46, CONFIGURACIONES_VL46 } from './motores-series/MotorPerfilesVL46.js';
import { calcularDespieceML46, CONFIGURACIONES_ML46 } from './motores-series/MotorPerfilesML46.js';
import { calcularDespieceVL48, CONFIGURACIONES_VL48 } from './motores-series/MotorPerfilesVL48.js';
import { calcularDespieceML48, CONFIGURACIONES_ML48 } from './motores-series/MotorPerfilesML48.js';
import { calcularDespieceMBL46, CONFIGURACIONES_MBL46 } from './motores-series/MotorPerfilesMBL46.js';
import { calcularDespieceSerie25, CONFIGURACIONES_SERIE25 } from './motores-series/MotorPerfilesSerie25.js';

// Mapa: valor del <select id="materialSistema"> -> motor + config + etiquetas de variante
const MOTORES_SERIE = {
  vl46: {
    calcular: calcularDespieceVL46,
    variantes: [
      { value: CONFIGURACIONES_VL46.DOS_HOJAS, label: '2 hojas / 2 rieles (C/C)' },
      { value: CONFIGURACIONES_VL46.TRES_HOJAS, label: '3 hojas / 3 rieles (C/C/C)' },
      { value: CONFIGURACIONES_VL46.CUATRO_HOJAS, label: '4 hojas / 2 rieles (F/C/C/F)' },
      { value: CONFIGURACIONES_VL46.MARCO_FIJO, label: 'Marco fijo' },
    ],
    limitesTexto: 'Máx. por hoja: 1200mm x 1900mm — peso máx. 80 Kg. Vidrio: 6/8/10mm monolítico, insulado hasta 19mm.'
  },
  ml46: {
    calcular: calcularDespieceML46,
    variantes: [
      { value: CONFIGURACIONES_ML46.DOS_HOJAS, label: '2 hojas / 2 rieles (C/C o F/C)' },
      { value: CONFIGURACIONES_ML46.TRES_HOJAS, label: '3 hojas / 3 rieles (C/C/C)' },
      { value: CONFIGURACIONES_ML46.CUATRO_HOJAS, label: '4 hojas / 2 rieles (F/C/C/F)' },
    ],
    limitesTexto: 'Máx. por hoja: 1500mm x 3000mm — peso máx. 150 Kg. Vidrio: 6/8/10/12mm monolítico, insulado hasta 23mm.'
  },
  vl48: {
    calcular: calcularDespieceVL48,
    variantes: [
      { value: CONFIGURACIONES_VL48.DOS_HOJAS, label: '2 hojas / 2 rieles (C/C)' },
      { value: CONFIGURACIONES_VL48.CUATRO_HOJAS, label: '4 hojas / 2 rieles (F/C/C/F)' },
    ],
    limitesTexto: 'Máx. por hoja: 1200mm x 2400mm — peso máx. 150 Kg. Vidrio: 6/8/10mm monolítico, insulado hasta 23mm.'
  },
  ml48: {
    calcular: calcularDespieceML48,
    variantes: [
      { value: CONFIGURACIONES_ML48.DOS_HOJAS, label: '2 hojas / 2 rieles (C/C o F/C)' },
      { value: CONFIGURACIONES_ML48.TRES_HOJAS, label: '3 hojas / 3 rieles (C/C/C)' },
      { value: CONFIGURACIONES_ML48.CUATRO_HOJAS, label: '4 hojas / 2 rieles (F/C/C/F)' },
    ],
    limitesTexto: 'Máx. por hoja: 1500mm x 3000mm — peso máx. 150 Kg. Vidrio: 6/8/10mm monolítico, insulado hasta 23mm.'
  },
  mbl46: {
    calcular: calcularDespieceMBL46,
    variantes: [
      { value: CONFIGURACIONES_MBL46.UNA_HOJA, label: '1 hoja (batiente simple)' },
      { value: CONFIGURACIONES_MBL46.DOS_HOJAS, label: '2 hojas (doble batiente)' },
    ],
    limitesTexto: 'Máx. por hoja: 1000mm x 2400mm — peso máx. 150 Kg. Vidrio: 6/8/10mm monolítico, insulado hasta 20mm.',
    sinInsulado: true // MBL46 no tiene variante de perfil para insulado en la ficha
  },
  // Serie 25 (aluminio nacional, económica) — valor legacy del select es
  // 'aluminioNacional', mapeado a 'serie25' en MAPEO_PERFIL_LEGACY de
  // cotizador.js. Se replica aquí el mismo valor de <select> para
  // engancharlo directamente sin duplicar el <select id="materialSistema">.
  aluminioNacional: {
    calcular: calcularDespieceSerie25,
    variantes: [
      { value: CONFIGURACIONES_SERIE25.DOS_HOJAS, label: '2 hojas correderas' },
      { value: CONFIGURACIONES_SERIE25.TRES_HOJAS, label: '3 hojas (1 fijo interior + 2 correderas)' },
      { value: CONFIGURACIONES_SERIE25.TRES_HOJAS_FIJO_EXT, label: '3 hojas (1 fijo exterior + 2 correderas)' },
      { value: CONFIGURACIONES_SERIE25.CUATRO_HOJAS, label: '4 hojas correderas' },
      { value: CONFIGURACIONES_SERIE25.SEIS_HOJAS, label: '6 hojas (2 fijos exteriores + 4 correderas)' },
    ],
    limitesTexto: 'Serie 25 nacional — línea económica. Precio de venta por m² pendiente de confirmar con Jorge para SEIS_HOJAS.',
    sinInsulado: true, // el motor Serie25 no distingue variante de perfil insulado
    esSerie25: true // marca para la normalización de resultado (nombres de campo distintos)
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const $materialSistema = document.getElementById('materialSistema');
  const $ancho = document.getElementById('ancho');
  const $alto = document.getElementById('alto');
  const $cantidad = document.getElementById('cantidad');
  const $panel = document.getElementById('panelSerieExacta');
  const $variante = document.getElementById('serieExactaVariante');
  const $insulado = document.getElementById('serieExactaInsulado');
  const $limites = document.getElementById('serieExactaLimites');
  const $resultado = document.getElementById('serieExactaResultado');

  if (!$materialSistema || !$panel) return; // defensivo: si el HTML no tiene estos IDs, no hacer nada

  function serieActual() {
    return MOTORES_SERIE[$materialSistema.value] || null;
  }

  function poblarVariantes(serie) {
    $variante.innerHTML = '<option value="" disabled selected>Selecciona una opción</option>';
    serie.variantes.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.value;
      opt.textContent = v.label;
      $variante.appendChild(opt);
    });
    $limites.textContent = serie.limitesTexto;
    $insulado.closest('.field').style.display = serie.sinInsulado ? 'none' : '';
  }

  function actualizarVisibilidadPanel() {
    const serie = serieActual();
    if (serie) {
      $panel.hidden = false;
      poblarVariantes(serie);
    } else {
      $panel.hidden = true;
      $resultado.innerHTML = '';
    }
  }

  function mmDesdeMetros(valorMetros) {
    const n = parseFloat(valorMetros);
    return Number.isFinite(n) ? Math.round(n * 1000) : null;
  }

  function recalcular() {
    const serie = serieActual();
    if (!serie || $panel.hidden) return;

    const tipoConfiguracion = $variante.value;
    const anchoMM = mmDesdeMetros($ancho.value);
    const altoMM = mmDesdeMetros($alto.value);
    const cantidad = parseInt($cantidad.value, 10) || 1;
    const insulado = $insulado.value === 'si';

    if (!tipoConfiguracion || !anchoMM || !altoMM) {
      $resultado.innerHTML = '<p class="field-hint field-hint-tight">Completa Ancho, Alto y la Configuración para ver el despiece.</p>';
      document.getElementById('costeoResultado').innerHTML = '';
      return;
    }

    let despiece;
    try {
      despiece = serie.sinInsulado
        ? serie.calcular({ tipoConfiguracion, ancho: anchoMM, alto: altoMM, cantidad })
        : serie.calcular({ tipoConfiguracion, ancho: anchoMM, alto: altoMM, cantidad, insulado });
    } catch (e) {
      $resultado.innerHTML = `<p class="field-hint field-hint-tight">Error de cálculo: ${e.message}</p>`;
      return;
    }

    if (serie.esSerie25) despiece = normalizarSerie25(despiece);

    $resultado.innerHTML = renderDespiece(despiece);
    actualizarCosteo(despiece.areaVanoM2);
  }

  // Serie25 devuelve areaM2/accesorios/vidrios sin warnings ni areaVidrioM2;
  // los motores Limatambo devuelven areaVanoM2/accesoriosSugeridos/warnings/
  // areaVidrioM2. Se normaliza aquí para reusar el mismo renderDespiece().
  function normalizarSerie25(d) {
    const areaVidrioM2 = d.vidrios.reduce((acc, v) => acc + (v.ancho * v.alto / 1_000_000) * v.cant, 0);
    return {
      ...d,
      areaVanoM2: d.areaM2,
      areaVidrioM2: Math.round(areaVidrioM2 * 1000) / 1000,
      accesoriosSugeridos: d.accesorios.map(a => ({ nombre: a.nombre, codigo: '—', cant: a.cant, nota: null })),
      warnings: d.precioVenta !== null
        ? []
        : ['Precio de venta por m² no definido para esta configuración en el Excel fuente — usar el bloque de costeo manual de abajo.']
    };
  }

  function actualizarCosteo(areaVanoM2) {
    const movilidad = parseFloat(document.getElementById('costeoMovilidad').value) || 0;
    const instalacionM2 = parseFloat(document.getElementById('costeoInstalacionM2').value) || 0;
    const armadoM2 = parseFloat(document.getElementById('costeoArmadoM2').value) || 0;
    const otro = parseFloat(document.getElementById('costeoOtro').value) || 0;

    const costoInstalacion = round2(instalacionM2 * areaVanoM2);
    const costoArmado = round2(armadoM2 * areaVanoM2);
    const totalManoObraYOtros = round2(costoInstalacion + costoArmado + movilidad + otro);
    const precioXm2 = areaVanoM2 > 0 ? round2(totalManoObraYOtros / areaVanoM2) : 0;

    document.getElementById('costeoResultado').innerHTML = `
      <table class="serie-exacta-tabla">
        <tbody>
          <tr><td>Área total (m²)</td><td>${areaVanoM2}</td></tr>
          <tr><td>Instalación (${instalacionM2} x ${areaVanoM2})</td><td>S/ ${costoInstalacion}</td></tr>
          <tr><td>Armado (${armadoM2} x ${areaVanoM2})</td><td>S/ ${costoArmado}</td></tr>
          <tr><td>Movilidad</td><td>S/ ${movilidad}</td></tr>
          <tr><td>Otro costo</td><td>S/ ${otro}</td></tr>
          <tr class="costeo-total"><td><strong>Total mano de obra + otros (S/)</strong></td><td><strong>S/ ${totalManoObraYOtros}</strong></td></tr>
          <tr class="costeo-total"><td><strong>Equivalente por m² (S/)</strong></td><td><strong>S/ ${precioXm2}</strong></td></tr>
        </tbody>
      </table>
      <p class="field-hint field-hint-tight">Este total NO incluye material (perfil + vidrio) — súmalo aparte según el despiece de arriba y el tarifario de Jorge.</p>
    `;
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  function renderDespiece(d) {
    const warningsHtml = d.warnings.length
      ? `<div class="serie-exacta-warning">⚠ ${d.warnings.join(' ')}</div>`
      : '';

    const perfilesRows = d.perfiles.map(p => `
      <tr>
        <td>${p.codigo}</td>
        <td>${p.nombre}</td>
        <td>${p.largo} mm</td>
        <td>${p.cant}</td>
        <td>${p.metrosNecesarios} m</td>
        <td>${p.varillasAComprar} varilla(s) (6m)</td>
      </tr>`).join('');

    const vidriosRows = d.vidrios.map(v => `
      <tr><td colspan="2">Vidrio</td><td>${v.ancho} x ${v.alto} mm</td><td>${v.cant}</td><td colspan="2"></td></tr>`).join('');

    const accesoriosRows = d.accesoriosSugeridos.map(a => `
      <li>${a.nombre} <code>${a.codigo}</code>${a.cant !== null ? ` — cant. ${a.cant}` : ''}${a.nota ? ` <span class="serie-exacta-nota">(${a.nota})</span>` : ''}</li>`).join('');

    return `
      ${warningsHtml}
      <p class="field-hint field-hint-tight">
        Área de vano: ${d.areaVanoM2} m² · Área de vidrio: ${d.areaVidrioM2} m²
      </p>
      <table class="serie-exacta-tabla">
        <thead>
          <tr><th>Código</th><th>Perfil</th><th>Largo corte</th><th>Cant.</th><th>Metros</th><th>Compra</th></tr>
        </thead>
        <tbody>
          ${perfilesRows}
          ${vidriosRows}
        </tbody>
      </table>
      <p class="serie-exacta-accesorios-titulo">Accesorios sugeridos:</p>
      <ul class="serie-exacta-accesorios">${accesoriosRows}</ul>
    `;
  }

  $materialSistema.addEventListener('change', actualizarVisibilidadPanel);
  [$variante, $insulado, $ancho, $alto, $cantidad].forEach(el => {
    el.addEventListener('input', recalcular);
    el.addEventListener('change', recalcular);
  });
  ['costeoMovilidad', 'costeoTipoCambio', 'costeoInstalacionM2', 'costeoArmadoM2', 'costeoOtro'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', recalcular);
  });

  actualizarVisibilidadPanel(); // estado inicial
});

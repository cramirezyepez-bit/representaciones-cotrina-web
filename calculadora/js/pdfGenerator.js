/* ============================================================
   PDFGENERATOR.JS — PDF profesional multi-ítem
   ============================================================
   Reemplaza el formato anterior (1 render grande + resumen
   lateral, pensado para un solo ítem) por una tabla de ítems:
   código, dibujo técnico SVG (solo ventana/puerta/mampara, sin
   dibujo de accesorios), descripción autogenerada, cantidad,
   precio unitario, total — más el resumen de totales del
   proyecto completo al final.

   Reutiliza la paleta de colores y los datos de empresa del
   sistema anterior (calculadora.js) para mantener consistencia
   visual entre ambos PDFs durante la transición.
   ============================================================ */

import { generarDibujoItemDataUri, obtenerDimensionesDibujo, tieneDibujo } from './svgGenerator.js';
import { describirVidrio } from './vidrios.js';
import { describirPerfil } from './perfiles.js';
import { describirLineaAccesorioAuto } from './despieceTecnico.js';
import { CATALOGO_ACCESORIOS } from './accesorios.js';
import { calcularResumenConIgv } from './rules.js';

/**
 * fitDrawingToPage() — calcula cómo encajar el dibujo técnico de
 * un ítem dentro de su celda del PDF SIN recortes ni distorsión.
 *
 * DIAGNÓSTICO DEL RECORTE ORIGINAL: el SVG generado en
 * svgGenerator.js no declaraba `width`/`height` propios (solo
 * `viewBox`). Un <svg> usado como `src` de un <img> sin esos
 * atributos tiene, por especificación CSS, un tamaño intrínseco
 * por defecto de 300×150px — totalmente ajeno a la proporción
 * real del viewBox (ej. 100×54 para una ventana de 4.4×1.6 m).
 * Al fijar `width:104px; height:auto` en el <img>, el navegador
 * calculaba el alto a partir de ESE 300×150 ficticio, no del
 * viewBox real. html2canvas rasteriza el DOM ya resuelto por el
 * navegador, así que heredaba ese error: el lienzo capturado no
 * coincidía con el dibujo real, y solo se veía una esquina
 * ampliada — exactamente el síntoma reportado.
 *
 * CORRECCIÓN ROBUSTA (dos capas, no una sola):
 * 1) svgGenerator.js ahora declara width/height = viewBox en el
 *    <svg> raíz, así el navegador tiene un tamaño intrínseco
 *    correcto de partida (fix de la causa raíz).
 * 2) Esta función además calcula el encaje de forma EXPLÍCITA
 *    (sin depender de que el navegador lo infiera bien), dando
 *    al <img> un width/height en píxeles ya resueltos — más
 *    robusto ante cualquier motor de renderizado, incluido
 *    html2canvas, que es sensible a depender de cálculos
 *    automáticos de CSS para contenido SVG.
 *
 * @param {number} dibujoWidth  - ancho real del dibujo (unidades del viewBox)
 * @param {number} dibujoHeight - alto real del dibujo (unidades del viewBox)
 * @param {number} cajaWidth   - ancho disponible en la página/celda (px)
 * @param {number} cajaHeight  - alto disponible en la página/celda (px)
 * @returns {{ width: number, height: number, offsetX: number, offsetY: number }}
 *   width/height ya escalados manteniendo proporción (nunca exceden la caja),
 *   offsetX/offsetY para centrar el dibujo dentro de la caja disponible.
 */
function fitDrawingToPage(dibujoWidth, dibujoHeight, cajaWidth, cajaHeight) {
  if (!dibujoWidth || !dibujoHeight || !cajaWidth || !cajaHeight) {
    return { width: cajaWidth || 0, height: cajaHeight || 0, offsetX: 0, offsetY: 0 };
  }
  // Escala máxima permitida: la menor entre encajar por ancho o por alto,
  // para que el dibujo COMPLETO entre siempre dentro de la caja disponible
  // (nunca se recorta, manteniendo siempre su relación de aspecto real).
  const escala = Math.min(cajaWidth / dibujoWidth, cajaHeight / dibujoHeight);
  const width = dibujoWidth * escala;
  const height = dibujoHeight * escala;
  // Centrado: el espacio sobrante (si lo hay, porque la caja no es
  // exactamente proporcional al dibujo) se reparte por igual a los lados.
  const offsetX = (cajaWidth - width) / 2;
  const offsetY = (cajaHeight - height) / 2;
  return { width, height, offsetX, offsetY };
}

const PDF_COLOR = {
  azulMarino: '#07131C',
  azulMarino2: '#08151E',
  naranjaCobre: '#D57B37',
  blanco: '#FFFFFF',
  negroCarbon: '#1D1D1D',
  grisOscuro: '#555555',
  grisMedio: '#6B6B6B',
  grisClaro: '#D9D9D9',
  fondoSuave: '#F4F2EE',
};

const EMPRESA = {
  nombre: 'COTRINA Proyectos',
  eslogan: 'Soluciones Arquitectónicas en Vidrio y Aluminio',
  correo: 'cotrinaproyectos@gmail.com',
  whatsapp: '+51 957 441 379',
  web: 'cotrinaproyectos.github.io',
  instagram: '@representacionescotrina',
  ciudad: 'Lima, Perú',
};

function formatearSoles(n) {
  return 'S/ ' + (Math.round(n) || 0).toLocaleString('es-PE');
}

/**
 * Descripción técnica automática de un ítem, en el espíritu
 * "tipo Thermia" pedido en el brief original: una frase que
 * resume tipo de solución, apertura, vidrio y perfil.
 *
 * Si el ítem tiene un único paño (caso simple, la inmensa mayoría
 * de las cotizaciones existentes), la frase es idéntica a la de
 * siempre. Si tiene varios paños con vidrios distintos, se agrega
 * la notación [F][M][F] y el detalle de vidrio por paño, porque
 * "con vidrio templado" deja de ser una frase verdadera cuando
 * cada paño lleva algo diferente.
 */
function describirItemAutomatico(itemCalculado) {
  const { nombreSolucion, nombreApertura, vidrioCategoria, vidrioVariante, perfilSerie, ancho, alto, areaTotal, panosCalculados, notacionPanos } = itemCalculado;
  const perfilTexto = perfilSerie !== 'noAplica' ? describirPerfil(perfilSerie) : null;
  const aperturaTexto = nombreApertura && nombreApertura !== 'Fijo' ? ` de apertura ${nombreApertura.toLowerCase()}` : ' fija';

  const esMultiPano = panosCalculados && panosCalculados.length > 1;
  const vidrioTexto = esMultiPano
    ? 'vidrios según paño (ver detalle)'
    : describirVidrio(vidrioCategoria, vidrioVariante).toLowerCase();

  let frase = `${nombreSolucion}${aperturaTexto}${esMultiPano ? ` configuración ${notacionPanos}` : ''}, con ${vidrioTexto}`;
  if (perfilTexto) frase += ` y sistema ${perfilTexto.toLowerCase()}`;
  frase += `, compuesta por marco perimetral, ${nombreApertura !== 'Fijo' ? 'hojas móviles, ' : ''}accesorios y sellado perimetral.`;

  const detalleVidrioPorPano = esMultiPano
    ? panosCalculados.map((p, i) => `${String.fromCharCode(65 + i)}: ${p.nombreVidrio}`).join(' · ')
    : null;

  return {
    frase,
    medidas: `${Number(ancho).toFixed(2)} × ${Number(alto).toFixed(2)} m`,
    superficie: `${Number(areaTotal).toFixed(2)} m²`,
    detalleVidrioPorPano,
  };
}

/**
 * Construye el HTML completo del PDF para un proyecto con N
 * ítems. `resumenProyecto` es el objeto devuelto por
 * obtenerResumenProyecto() en proyecto.js (incluye itemsConCodigo).
 */
export function construirHtmlPdfProyecto({ resumenProyecto, cliente, ruc, distrito, urgenciaTexto, tienePlanosTexto, numeroPropuesta, fechaTexto, igvActivo = false, observaciones = {} }) {
  const resumenIgv = calcularResumenConIgv(resumenProyecto.precioFinal, { igvActivo });
  // Caja disponible para el dibujo dentro de la celda gráfica de la tabla
  // (en px, ya con margen interno restado) — fitDrawingToPage() calcula la
  // escala y el centrado dentro de estos límites, así el dibujo COMPLETO
  // siempre entra sin recortarse, sin importar cuán ancho o alto sea el vano.
  const CAJA_DIBUJO_W = 104;
  const CAJA_DIBUJO_H = 110;

  const filasItems = resumenProyecto.itemsConCodigo.map(it => {
    const c = it.calculo;
    const desc = describirItemAutomatico(c);
    const dibujoUri = tieneDibujo(c.tipoSolucion) ? generarDibujoItemDataUri(c) : null;
    const dimDibujo = tieneDibujo(c.tipoSolucion) ? obtenerDimensionesDibujo(c) : null;
    const encaje = dimDibujo ? fitDrawingToPage(dimDibujo.width, dimDibujo.height, CAJA_DIBUJO_W, CAJA_DIBUJO_H) : null;
    const precioUnitario = c.costoItemAntesUrgencia / c.cantidad;

    const d = c.despiecePerfiles || {};
    const accAuto = c.accesoriosAuto || [];
    const perfilesTexto = d.totalMl
      ? `Perfiles: marco ${(d.marcoPerimetral || 0).toFixed(1)} ml · parantes/hojas ${((d.parantes || 0) + (d.hojasMl || 0)).toFixed(1)} ml · total ${d.totalMl.toFixed(1)} ml`
      : '';
    const accesoriosTexto = accAuto.length
      ? `Accesorios: ${accAuto.map(l => describirLineaAccesorioAuto(l)).join(' · ')}`
      : '';

    return `
      <tr class="item-row">
        <td class="cell-codigo">${it.codigo}</td>
        <td class="cell-grafico">
          ${dibujoUri && encaje
            ? `<div class="item-svg-caja" style="width:${CAJA_DIBUJO_W}px;height:${CAJA_DIBUJO_H}px;">
                 <img src="${dibujoUri}" class="item-svg" alt="Dibujo técnico ${it.codigo}"
                      width="${Math.round(encaje.width)}" height="${Math.round(encaje.height)}"
                      style="width:${encaje.width.toFixed(1)}px;height:${encaje.height.toFixed(1)}px;margin-left:${encaje.offsetX.toFixed(1)}px;margin-top:${encaje.offsetY.toFixed(1)}px;"/>
               </div>`
            : `<span class="sin-dibujo">—</span>`}
        </td>
        <td class="cell-desc">
          <p class="desc-frase">${desc.frase}</p>
          <p class="desc-medidas">Medidas: <b>${desc.medidas}</b> &nbsp;·&nbsp; Superficie: <b>${desc.superficie}</b></p>
          ${desc.detalleVidrioPorPano ? `<p class="desc-tecnico"><b>Vidrio por paño:</b> ${desc.detalleVidrioPorPano}</p>` : ''}
          ${perfilesTexto ? `<p class="desc-tecnico">${perfilesTexto}</p>` : ''}
          ${accesoriosTexto ? `<p class="desc-tecnico">${accesoriosTexto}</p>` : ''}
        </td>
        <td class="cell-num">${c.cantidad}</td>
        <td class="cell-num">${formatearSoles(precioUnitario)}</td>
        <td class="cell-num cell-total">${formatearSoles(c.costoItemAntesUrgencia)}</td>
      </tr>`;
  }).join('');

  const filasAccesoriosProyecto = resumenProyecto.accesoriosProyecto.length
    ? `<tr class="acc-row"><td colspan="6">
        <b>Servicios incluidos:</b> ${resumenProyecto.accesoriosProyecto.map(l => {
          const nombre = CATALOGO_ACCESORIOS[l.clave]?.nombre || l.clave;
          return l.cantidad > 1 ? `${nombre} (×${l.cantidad})` : nombre;
        }).join(', ')}
      </td></tr>`
    : '';

  return `
    <div id="pdfRoot" style="width:794px;background:${PDF_COLOR.blanco};font-family:'Inter',system-ui,sans-serif;color:${PDF_COLOR.negroCarbon};">
      <style>
        #pdfRoot *{ box-sizing:border-box; margin:0; padding:0; }
        #pdfRoot .head{ background:${PDF_COLOR.azulMarino}; padding:22px 36px; display:flex; align-items:center; justify-content:space-between; min-height:92px; }
        #pdfRoot .head-left{ display:flex; flex-direction:column; gap:4px; }
        #pdfRoot .head-logo{ color:${PDF_COLOR.blanco}; font-size:21px; font-weight:800; letter-spacing:0.02em; }
        #pdfRoot .head-eslogan{ color:#AEB7BD; font-size:10.5px; font-weight:500; }
        #pdfRoot .head-right{ text-align:right; display:flex; flex-direction:column; gap:4px; }
        #pdfRoot .head-title{ color:${PDF_COLOR.naranjaCobre}; font-size:15px; font-weight:800; letter-spacing:0.06em; }
        #pdfRoot .head-meta{ color:${PDF_COLOR.blanco}; font-size:10px; opacity:0.85; }

        #pdfRoot .cliente-bar{ display:flex; flex-wrap:wrap; gap:8px 28px; padding:16px 36px; background:${PDF_COLOR.fondoSuave}; font-size:9.5px; color:${PDF_COLOR.grisOscuro}; }
        #pdfRoot .cliente-bar span{ white-space:nowrap; }
        #pdfRoot .cliente-bar b{ color:${PDF_COLOR.negroCarbon}; }

        #pdfRoot table.items-table{ width:100%; border-collapse:collapse; margin:18px 0; }
        #pdfRoot .items-table thead th{ background:${PDF_COLOR.azulMarino2}; color:${PDF_COLOR.blanco}; font-size:8.5px; text-transform:uppercase; letter-spacing:0.04em; padding:8px 10px; text-align:left; }
        #pdfRoot .items-table thead th.cell-num{ text-align:right; }
        #pdfRoot .item-row{ border-bottom:1px solid ${PDF_COLOR.grisClaro}; }
        #pdfRoot .item-row td{ padding:10px; vertical-align:top; font-size:9.5px; }
        #pdfRoot .cell-codigo{ font-weight:800; color:${PDF_COLOR.naranjaCobre}; white-space:nowrap; }
        #pdfRoot .cell-grafico{ width:118px; }
        #pdfRoot .item-svg-caja{ position:relative; display:block; overflow:hidden; }
        #pdfRoot .item-svg{ display:block; }
        #pdfRoot .sin-dibujo{ color:${PDF_COLOR.grisClaro}; font-size:14px; }
        #pdfRoot .cell-desc{ max-width:280px; }
        #pdfRoot .desc-frase{ line-height:1.4; margin-bottom:4px; }
        #pdfRoot .desc-medidas{ font-size:8.3px; color:${PDF_COLOR.grisMedio}; }
        #pdfRoot .desc-tecnico{ font-size:8px; color:${PDF_COLOR.grisMedio}; line-height:1.5; margin-top:3px; }
        #pdfRoot .cell-num{ text-align:right; white-space:nowrap; font-weight:600; }
        #pdfRoot .cell-total{ color:${PDF_COLOR.negroCarbon}; font-weight:800; }
        #pdfRoot .acc-row td{ padding:8px 10px; font-size:8.8px; color:${PDF_COLOR.grisOscuro}; background:${PDF_COLOR.fondoSuave}; }

        #pdfRoot .totales{ margin:0 36px 18px; display:flex; justify-content:flex-end; }
        #pdfRoot .totales-box{ width:320px; }
        #pdfRoot .t-row{ display:flex; justify-content:space-between; font-size:9.5px; color:${PDF_COLOR.grisOscuro}; padding:5px 0; }
        #pdfRoot .t-row b{ color:${PDF_COLOR.negroCarbon}; }
        #pdfRoot .t-row-total{ border-top:1px solid ${PDF_COLOR.grisClaro}; margin-top:4px; padding-top:8px; }
        #pdfRoot .precio-final-box{ background:${PDF_COLOR.azulMarino2}; color:${PDF_COLOR.blanco}; border-radius:6px; padding:12px 14px; margin-top:10px; display:flex; justify-content:space-between; align-items:center; }
        #pdfRoot .precio-final-lbl{ font-size:9px; text-transform:uppercase; letter-spacing:0.05em; opacity:0.75; }
        #pdfRoot .precio-final-val{ font-size:17px; font-weight:800; color:${PDF_COLOR.naranjaCobre}; }

        #pdfRoot .nota-legal{ margin:0 36px 16px; padding:10px 14px; background:${PDF_COLOR.fondoSuave}; border-radius:5px; font-size:8.3px; color:${PDF_COLOR.grisMedio}; line-height:1.4; }

        #pdfRoot .seccion-titulo{ font-size:12px; font-weight:800; color:${PDF_COLOR.azulMarino}; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:8px; padding-bottom:6px; border-bottom:2px solid ${PDF_COLOR.naranjaCobre}; }
        #pdfRoot .seccion-observaciones{ margin:0 36px 18px; padding:14px 16px; background:${PDF_COLOR.fondoSuave}; border-radius:6px; }
        #pdfRoot .obs-grid{ display:grid; grid-template-columns:1fr 1fr; gap:8px 24px; margin-bottom:8px; }
        #pdfRoot .obs-item{ display:flex; flex-direction:column; gap:1px; font-size:8.8px; }
        #pdfRoot .obs-label{ font-size:7.5px; text-transform:uppercase; letter-spacing:0.04em; color:${PDF_COLOR.grisMedio}; }
        #pdfRoot .obs-tecnicas{ font-size:8.3px; color:${PDF_COLOR.grisOscuro}; line-height:1.4; border-top:1px solid ${PDF_COLOR.grisClaro}; padding-top:8px; }

        #pdfRoot .foot{ background:${PDF_COLOR.azulMarino}; padding:16px 36px; display:flex; justify-content:space-between; gap:16px; min-height:54px; align-items:center; }
        #pdfRoot .foot-block{ color:${PDF_COLOR.blanco}; font-size:8.5px; line-height:1.5; }
        #pdfRoot .foot-block b{ display:block; font-size:9.5px; margin-bottom:2px; }
        #pdfRoot .foot-block.right{ text-align:right; }
      </style>

      <div class="head">
        <div class="head-left">
          <span class="head-logo">${EMPRESA.nombre}</span>
          <span class="head-eslogan">${EMPRESA.eslogan}</span>
        </div>
        <div class="head-right">
          <span class="head-title">PROPUESTA PRELIMINAR</span>
          <span class="head-meta">N° ${numeroPropuesta} &nbsp;·&nbsp; Emitido: ${fechaTexto}</span>
        </div>
      </div>

      <div class="cliente-bar">
        <span>Cliente: <b>${cliente}</b></span>
        <span>RUC/DNI: <b>${ruc}</b></span>
        <span>Distrito: <b>${distrito}</b></span>
        <span>Urgencia: <b>${urgenciaTexto}</b></span>
        <span>¿Planos/fotos?: <b>${tienePlanosTexto}</b></span>
      </div>

      <div style="padding:0 36px;">
        <table class="items-table">
          <thead>
            <tr>
              <th>Ítem</th>
              <th>Gráfico</th>
              <th>Descripción</th>
              <th class="cell-num">Cant.</th>
              <th class="cell-num">P. Unit.</th>
              <th class="cell-num">Total</th>
            </tr>
          </thead>
          <tbody>
            ${filasItems}
            ${filasAccesoriosProyecto}
          </tbody>
        </table>
      </div>

      <div class="totales">
        <div class="totales-box">
          <div class="t-row t-row-total"><span>Subtotal</span><b>${formatearSoles(resumenIgv.subtotal)}</b></div>
          ${igvActivo ? `<div class="t-row"><span>IGV (${resumenIgv.porcentajeIgv}%)</span><b>${formatearSoles(resumenIgv.montoIgv)}</b></div>` : ''}
          <div class="precio-final-box">
            <span class="precio-final-lbl">${igvActivo ? 'Total (incl. IGV)' : 'Total'}</span>
            <span class="precio-final-val">${formatearSoles(resumenIgv.total)}</span>
          </div>
        </div>
      </div>

      <p class="nota-legal">
        Precio preliminar sujeto a visita técnica, validación de medidas, accesorios, herrajes y condiciones de
        instalación. Los dibujos técnicos son representaciones esquemáticas de la configuración de apertura.
        Las cantidades de perfil (ml) y accesorios de cada ítem se calculan con reglas estándar de mercado según
        tipo de apertura, número de hojas y medidas — estimación preliminar a validar con taller antes de fabricar.
      </p>

      ${observaciones && (observaciones.formaPago || observaciones.garantia || observaciones.tiempoEntrega || observaciones.validez || observaciones.tecnicas) ? `
      <div class="seccion-observaciones">
        <h3 class="seccion-titulo">Condiciones comerciales</h3>
        <div class="obs-grid">
          ${observaciones.formaPago ? `<div class="obs-item"><span class="obs-label">Forma de pago</span><span>${observaciones.formaPago}</span></div>` : ''}
          ${observaciones.tiempoEntrega ? `<div class="obs-item"><span class="obs-label">Tiempo de entrega</span><span>${observaciones.tiempoEntrega}</span></div>` : ''}
          ${observaciones.garantia ? `<div class="obs-item"><span class="obs-label">Garantía</span><span>${observaciones.garantia}</span></div>` : ''}
          ${observaciones.validez ? `<div class="obs-item"><span class="obs-label">Validez de la oferta</span><span>${observaciones.validez}</span></div>` : ''}
        </div>
        ${observaciones.tecnicas ? `<p class="obs-tecnicas">${observaciones.tecnicas}</p>` : ''}
      </div>` : ''}

      <div class="foot">
        <div class="foot-block">
          <b>${EMPRESA.nombre} S.A.C.</b>
          ${EMPRESA.ciudad}
        </div>
        <div class="foot-block">
          <b>${EMPRESA.web}</b>
          ${EMPRESA.correo}
        </div>
        <div class="foot-block right">
          <b>WhatsApp ${EMPRESA.whatsapp}</b>
          ${EMPRESA.instagram}
        </div>
      </div>
    </div>
  `;
}

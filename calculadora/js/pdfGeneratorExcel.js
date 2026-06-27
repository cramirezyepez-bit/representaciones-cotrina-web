/* ============================================================
   PDFGENERATOREXCEL.JS — PDF para presupuestos importados desde Excel
   ============================================================
   Módulo TEMPORAL hermano de pdfGenerator.js. NO reemplaza ni
   modifica pdfGenerator.js: ese archivo construye su tabla a
   partir de un `itemCalculado` (salida de calcularItem() en
   reglasCalculo.js), con campos como despiecePerfiles,
   accesoriosAuto o nombreApertura que solo el motor de cálculo
   produce. Los ítems importados desde Excel NO pasan por ese
   motor — el brief es explícito: "el sistema NO debe calcular
   precios ni modificar la información del presupuesto". Fabricar
   esos campos con datos inventados ensuciaría el PDF con un
   desglose técnico que no existe en el Excel real.

   En su lugar, esta función construye una tabla más simple
   (código, dibujo técnico, descripción tal cual del Excel,
   cantidad, precio tal cual del Excel) pero:
     - Reutiliza el mismo motor de dibujo SVG (svgGenerator.js)
       sin tocarlo ni duplicarlo.
     - Reutiliza la misma paleta de colores y datos de empresa de
       pdfGenerator.js (PDF_COLOR, EMPRESA, formatearSoles) — el
       PDF resultante es visualmente indistinguible del PDF del
       cotizador manual/inteligente.
     - Reutiliza fitDrawingToPage() vía las mismas funciones de
       svgGenerator.js, replicando el mismo cálculo de encaje que
       ya está probado en pdfGenerator.js (ver ese archivo para el
       diagnóstico completo del bug de recorte que motivó este
       cálculo explícito de escala/centrado).

   COMPATIBILIDAD FUTURA: cuando el cotizador inteligente esté
   terminado y el Excel desaparezca, este archivo simplemente deja
   de importarse desde cotizador.js. El motor de dibujo
   (svgGenerator.js) nunca depende de este archivo ni del Excel.
   ============================================================ */

import { generarDibujoItemDataUri, obtenerDimensionesDibujo, tieneDibujo } from './svgGenerator.js';
import { PDF_COLOR, EMPRESA, formatearSoles, fitDrawingToPage } from './pdfGenerator.js';

const CAJA_DIBUJO_W = 104;
const CAJA_DIBUJO_H = 110;

/** Normaliza texto para comparar sin sensibilidad a mayúsculas/espacios extra (evita repetir la misma frase dos veces cuando tipoTexto y descripcion coinciden). */
function normalizar(texto) {
  return String(texto || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Construye el HTML completo del PDF para un presupuesto
 * importado desde Excel. `itemsImportados` es la lista devuelta
 * por importarPresupuestoExcel() en excelImporter.js.
 */
export function construirHtmlPdfExcel({ itemsImportados, cliente, ruc, distrito, fechaTexto, numeroPropuesta }) {
  const total = itemsImportados.reduce((acc, it) => acc + (Number(it.precio) || 0), 0);

  const filasItems = itemsImportados.map(it => {
    const itemParaDibujo = it.tipoSolucion ? { tipoSolucion: it.tipoSolucion, panos: it.panos, ancho: it.ancho, alto: it.alto, cantidad: it.cantidad } : null;
    const dibujoUri = itemParaDibujo && tieneDibujo(it.tipoSolucion) ? generarDibujoItemDataUri(itemParaDibujo) : null;
    const dimDibujo = itemParaDibujo && tieneDibujo(it.tipoSolucion) ? obtenerDimensionesDibujo(itemParaDibujo) : null;
    const encaje = dimDibujo ? fitDrawingToPage(dimDibujo.width, dimDibujo.height, CAJA_DIBUJO_W, CAJA_DIBUJO_H) : null;
    const precioUnitario = it.cantidad > 0 ? it.precio / it.cantidad : it.precio;

    const descripcionTexto = it.descripcion && normalizar(it.descripcion) !== normalizar(it.tipoTexto) ? it.descripcion : '';
    const medidasTexto = `${Number(it.ancho).toFixed(2)} × ${Number(it.alto).toFixed(2)} m`;
    const colorTexto = it.colorAluminio ? ` &nbsp;·&nbsp; Color: <b>${it.colorAluminio}</b>` : '';

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
          <p class="desc-frase">${it.tipoTexto}${descripcionTexto ? ' — ' + descripcionTexto : ''}</p>
          <p class="desc-medidas">Medidas: <b>${medidasTexto}</b>${colorTexto}</p>
        </td>
        <td class="cell-num">${it.cantidad}</td>
        <td class="cell-num">${formatearSoles(precioUnitario)}</td>
        <td class="cell-num cell-total">${formatearSoles(it.precio)}</td>
      </tr>`;
  }).join('');

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
        #pdfRoot .cell-num{ text-align:right; white-space:nowrap; font-weight:600; }
        #pdfRoot .cell-total{ color:${PDF_COLOR.negroCarbon}; font-weight:800; }

        #pdfRoot .totales{ margin:0 36px 18px; display:flex; justify-content:flex-end; }
        #pdfRoot .totales-box{ width:320px; }
        #pdfRoot .precio-final-box{ background:${PDF_COLOR.azulMarino2}; color:${PDF_COLOR.blanco}; border-radius:6px; padding:12px 14px; margin-top:10px; display:flex; justify-content:space-between; align-items:center; }
        #pdfRoot .precio-final-lbl{ font-size:9px; text-transform:uppercase; letter-spacing:0.05em; opacity:0.75; }
        #pdfRoot .precio-final-val{ font-size:17px; font-weight:800; color:${PDF_COLOR.naranjaCobre}; }

        #pdfRoot .nota-legal{ margin:0 36px 16px; padding:10px 14px; background:${PDF_COLOR.fondoSuave}; border-radius:5px; font-size:8.3px; color:${PDF_COLOR.grisMedio}; line-height:1.4; }

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
          </tbody>
        </table>
      </div>

      <div class="totales">
        <div class="totales-box">
          <div class="precio-final-box">
            <span class="precio-final-lbl">Total</span>
            <span class="precio-final-val">${formatearSoles(total)}</span>
          </div>
        </div>
      </div>

      <p class="nota-legal">
        Precio preliminar según presupuesto elaborado por el equipo comercial. Los dibujos técnicos son
        representaciones esquemáticas de la configuración de apertura, generadas automáticamente a partir
        del tipo de producto indicado — sujeto siempre a visita técnica y validación final de medidas.
      </p>

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

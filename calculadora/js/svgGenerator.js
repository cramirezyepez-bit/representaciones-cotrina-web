/* ============================================================
   SVGGENERATOR.JS — Dibujos técnicos 2D
   ============================================================
   Alcance acordado con el usuario: SOLO ventana, puerta y
   mampara. NO se dibujan accesorios individuales (bisagras,
   rodajes, etc.) — el dibujo representa únicamente el vano y
   sus hojas/mecanismo de apertura, en proporción real ancho:alto.

   Estilo: líneas finas (stroke, sin relleno de color), flechas
   de apertura simples, numeración de hojas cuando aplica —
   inspirado en las fichas técnicas tipo Thermia/Schüco que
   sirvieron de referencia en el brief original.

   Cada función devuelve un string SVG completo (con su propio
   viewBox), listo para insertarse en el DOM o en el PDF vía
   html2canvas. El viewBox usa una escala fija de 100 unidades
   de ancho para simplificar el cálculo de proporciones; el
   alto se ajusta a la relación real ancho:alto del ítem.
   ============================================================ */

const TIPOS_CON_DIBUJO = ['ventana', 'puerta', 'mampara'];

const COLOR_LINEA = '#1A1A1A';
const COLOR_VIDRIO = '#CFE3EC';
const COLOR_MARCO = '#5B6B73';
const GROSOR_MARCO = 3;
const GROSOR_HOJA = 1.6;

/** ¿Este tipo de solución tiene dibujo técnico disponible? */
export function tieneDibujo(tipoSolucion) {
  return TIPOS_CON_DIBUJO.includes(tipoSolucion);
}

function escalaAlto(ancho, alto, anchoSvg = 100) {
  const relacion = alto / ancho;
  return Math.max(40, Math.min(160, anchoSvg * relacion));
}

function flechaDoble(x1, y1, x2, y2) {
  // Flecha bidireccional simple para indicar apertura corredera.
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  const head = 4;
  const perp = { x: -uy, y: ux };
  return `
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${COLOR_LINEA}" stroke-width="0.8"/>
    <polyline points="${x1 + ux * head + perp.x * head / 2},${y1 + uy * head + perp.y * head / 2} ${x1},${y1} ${x1 + ux * head - perp.x * head / 2},${y1 + uy * head - perp.y * head / 2}" fill="none" stroke="${COLOR_LINEA}" stroke-width="0.8"/>
    <polyline points="${x2 - ux * head + perp.x * head / 2},${y2 - uy * head + perp.y * head / 2} ${x2},${y2} ${x2 - ux * head - perp.x * head / 2},${y2 - uy * head - perp.y * head / 2}" fill="none" stroke="${COLOR_LINEA}" stroke-width="0.8"/>
  `;
}

function trianguloApertura(x1, y1, x2, y2, x3, y3) {
  // Triángulo punteado clásico para indicar batiente/oscilobatiente,
  // con el vértice en la bisagra y la base en el lado de apertura.
  return `<polyline points="${x1},${y1} ${x2},${y2} ${x3},${y3}" fill="none" stroke="${COLOR_LINEA}" stroke-width="0.6" stroke-dasharray="2,1.5"/>`;
}

/* ------------------------------------------------------------
   FIJO — un solo paño de vidrio, sin mecanismo.
   ------------------------------------------------------------ */
function dibujarFijo(w, h) {
  return `
    <rect x="2" y="2" width="${w - 4}" height="${h - 4}" fill="none" stroke="${COLOR_MARCO}" stroke-width="${GROSOR_MARCO}"/>
    <rect x="5" y="5" width="${w - 10}" height="${h - 10}" fill="${COLOR_VIDRIO}" stroke="${COLOR_LINEA}" stroke-width="${GROSOR_HOJA}"/>
  `;
}

/* ------------------------------------------------------------
   CORREDIZO — N hojas en carriles paralelos, con flecha
   horizontal indicando el desplazamiento.
   ------------------------------------------------------------ */
function dibujarCorredizo(w, h, nHojas) {
  const margenMarco = 4;
  const anchoUtil = w - margenMarco * 2;
  const anchoHoja = anchoUtil / nHojas;
  let hojas = '';
  for (let i = 0; i < nHojas; i++) {
    const x = margenMarco + i * anchoHoja;
    hojas += `<rect x="${x + 1.5}" y="${margenMarco + 1}" width="${anchoHoja - 3}" height="${h - margenMarco * 2 - 2}" fill="${COLOR_VIDRIO}" stroke="${COLOR_LINEA}" stroke-width="${GROSOR_HOJA}"/>`;
  }
  const yFlecha = h / 2;
  const flecha = flechaDoble(margenMarco + 4, yFlecha, w - margenMarco - 4, yFlecha);
  return `
    <rect x="2" y="2" width="${w - 4}" height="${h - 4}" fill="none" stroke="${COLOR_MARCO}" stroke-width="${GROSOR_MARCO}"/>
    ${hojas}
    ${flecha}
  `;
}

/* ------------------------------------------------------------
   BATIENTE / PIVOTANTE — bisagra lateral, flecha diagonal hacia
   adentro del vano indicando el giro de la hoja.
   ------------------------------------------------------------ */
function dibujarBatiente(w, h) {
  const m = 4;
  const triangulo = trianguloApertura(w - m, m, w / 2, h / 2, w - m, h - m);
  return `
    <rect x="2" y="2" width="${w - 4}" height="${h - 4}" fill="none" stroke="${COLOR_MARCO}" stroke-width="${GROSOR_MARCO}"/>
    <rect x="${m + 1.5}" y="${m + 1}" width="${w - m * 2 - 3}" height="${h - m * 2 - 2}" fill="${COLOR_VIDRIO}" stroke="${COLOR_LINEA}" stroke-width="${GROSOR_HOJA}"/>
    ${triangulo}
    <circle cx="${m + 2}" cy="${h / 2}" r="1.4" fill="${COLOR_LINEA}"/>
  `;
}

/* ------------------------------------------------------------
   OSCILOBATIENTE — combina el triángulo de batiente (giro
   lateral) con una segunda indicación horizontal corta arriba
   (bascula hacia adentro desde el lado superior).
   ------------------------------------------------------------ */
function dibujarOscilobatiente(w, h) {
  const m = 4;
  const base = dibujarBatiente(w, h);
  const triBascula = trianguloApertura(m, m, w / 2, h * 0.32, w - m, m);
  return `${base}${triBascula}`;
}

/* ------------------------------------------------------------
   PUERTA — una sola hoja, marco más robusto, manija indicada
   con un pequeño rectángulo, sin vidrio completo (paño inferior
   ciego representado con línea horizontal, típico de puertas).
   ------------------------------------------------------------ */
function dibujarPuerta(w, h) {
  const m = 4;
  const yDivision = h * 0.32; // panel ciego inferior + vidrio superior, proporción referencial
  const triangulo = trianguloApertura(w - m, m, w / 2, h / 2, w - m, h - m);
  return `
    <rect x="2" y="2" width="${w - 4}" height="${h - 4}" fill="none" stroke="${COLOR_MARCO}" stroke-width="${GROSOR_MARCO + 1}"/>
    <rect x="${m + 1.5}" y="${m + 1}" width="${w - m * 2 - 3}" height="${yDivision - m}" fill="${COLOR_VIDRIO}" stroke="${COLOR_LINEA}" stroke-width="${GROSOR_HOJA}"/>
    <rect x="${m + 1.5}" y="${yDivision}" width="${w - m * 2 - 3}" height="${h - yDivision - m - 1}" fill="#EDEDED" stroke="${COLOR_LINEA}" stroke-width="${GROSOR_HOJA}"/>
    ${triangulo}
    <rect x="${w - m - 3}" y="${h / 2 - 4}" width="2" height="8" fill="${COLOR_LINEA}"/>
  `;
}

/* ------------------------------------------------------------
   PLEGABLE — varias hojas tipo acordeón, líneas en zigzag.
   ------------------------------------------------------------ */
function dibujarPlegable(w, h, nHojas = 4) {
  const m = 4;
  const anchoUtil = w - m * 2;
  const anchoHoja = anchoUtil / nHojas;
  let hojas = '';
  const yZig = m + (h - m * 2) * 0.18;
  let zigzag = `M ${m} ${yZig}`;
  for (let i = 0; i < nHojas; i++) {
    const x = m + i * anchoHoja;
    hojas += `<line x1="${x}" y1="${m}" x2="${x}" y2="${h - m}" stroke="${COLOR_LINEA}" stroke-width="${GROSOR_HOJA}"/>`;
    const xMed = x + anchoHoja * (i % 2 === 0 ? 0.85 : 0.15);
    zigzag += ` L ${xMed} ${i % 2 === 0 ? yZig + (h - m * 2) * 0.12 : yZig - (h - m * 2) * 0.06}`;
  }
  zigzag += ` L ${w - m} ${yZig}`;
  return `
    <rect x="2" y="2" width="${w - 4}" height="${h - 4}" fill="none" stroke="${COLOR_MARCO}" stroke-width="${GROSOR_MARCO}"/>
    <rect x="${m + 1}" y="${m + 1}" width="${anchoUtil - 2}" height="${h - m * 2 - 2}" fill="${COLOR_VIDRIO}" opacity="0.5"/>
    <path d="${zigzag}" fill="none" stroke="${COLOR_LINEA}" stroke-width="0.7" stroke-dasharray="1.5,1"/>
    ${hojas}
  `;
}

/* ------------------------------------------------------------
   GUILLOTINA — dos paños superpuestos verticalmente, flecha
   vertical indicando el desplazamiento.
   ------------------------------------------------------------ */
function dibujarGuillotina(w, h) {
  const m = 4;
  const yMedio = h / 2;
  const flecha = flechaDoble(w / 2, m + 4, w / 2, h - m - 4);
  return `
    <rect x="2" y="2" width="${w - 4}" height="${h - 4}" fill="none" stroke="${COLOR_MARCO}" stroke-width="${GROSOR_MARCO}"/>
    <rect x="${m + 1}" y="${m + 1}" width="${w - m * 2 - 2}" height="${yMedio - m - 1}" fill="${COLOR_VIDRIO}" stroke="${COLOR_LINEA}" stroke-width="${GROSOR_HOJA}"/>
    <rect x="${m + 1}" y="${yMedio}" width="${w - m * 2 - 2}" height="${h - yMedio - m - 1}" fill="${COLOR_VIDRIO}" stroke="${COLOR_LINEA}" stroke-width="${GROSOR_HOJA}"/>
    ${flecha}
  `;
}

/**
 * Genera el SVG técnico de un ítem ya calculado (objeto devuelto
 * por calcularItem en reglasCalculo.js). Devuelve null si el
 * tipo de solución no tiene dibujo soportado (según el alcance
 * acordado: solo ventana, puerta, mampara).
 */
export function generarDibujoItem(itemCalculado) {
  const { tipoSolucion, tipoApertura, ancho, alto, cantidad } = itemCalculado;
  if (!tieneDibujo(tipoSolucion)) return null;

  const w = 100;
  const h = escalaAlto(ancho || 1, alto || 1, w);

  let contenido = '';
  switch (tipoApertura) {
    case 'corredizo2': contenido = dibujarCorredizo(w, h, 2); break;
    case 'corredizo3': contenido = dibujarCorredizo(w, h, 3); break;
    case 'corredizo4': contenido = dibujarCorredizo(w, h, 4); break;
    case 'batiente':
    case 'pivotante':  contenido = dibujarBatiente(w, h); break;
    case 'oscilobatiente': contenido = dibujarOscilobatiente(w, h); break;
    case 'puerta':     contenido = dibujarPuerta(w, h); break;
    case 'plegable':   contenido = dibujarPlegable(w, h); break;
    case 'guillotina': contenido = dibujarGuillotina(w, h); break;
    case 'fijo':
    case 'especial':
    default:           contenido = dibujarFijo(w, h);
  }

  const etiquetaMedidas = `${Number(ancho).toFixed(2)} × ${Number(alto).toFixed(2)} m`;
  const etiquetaCantidad = cantidad > 1 ? ` (×${cantidad})` : '';

  return `
    <svg viewBox="0 0 ${w} ${h + 14}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
      <g>${contenido}</g>
      <text x="${w / 2}" y="${h + 10}" font-size="5.5" text-anchor="middle" fill="${COLOR_LINEA}">${etiquetaMedidas}${etiquetaCantidad}</text>
    </svg>
  `;
}

/**
 * Devuelve el SVG como data URI (para usar en <img src="..."> o
 * en jsPDF.addImage en el generador de PDF), o null si el tipo
 * de solución no tiene dibujo soportado.
 */
export function generarDibujoItemDataUri(itemCalculado) {
  const svg = generarDibujoItem(itemCalculado);
  if (!svg) return null;
  const svgLimpio = svg.replace(/\s+/g, ' ').trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgLimpio)}`;
}

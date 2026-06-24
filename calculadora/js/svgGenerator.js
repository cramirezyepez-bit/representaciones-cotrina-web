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

const TIPOS_CON_DIBUJO = ['ventana', 'puerta', 'mampara', 'puertaDucha', 'divisionInterior'];

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
  // Proporción real, sin clamp: el viewBox debe reflejar fielmente la
  // relación ancho:alto del vano (ej. 4.4×1.6 m = relación 2.75:1, una
  // puerta 0.9×2.1 m = relación 1:2.33). Antes esta función forzaba el
  // resultado entre 40 y 160, lo que distorsionaba vanos muy anchos o
  // muy verticales. El ajuste a cualquier caja disponible (pantalla o
  // PDF) sin recortar ni distorsionar lo resuelve fitDrawingToPage() en
  // pdfGenerator.js, que escala manteniendo esta proporción real — así
  // que aquí ya no hace falta limitar el rango.
  const relacion = alto / ancho;
  return Math.max(8, anchoSvg * relacion); // solo evita un alto absurdamente cercano a cero
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
function dibujarModuloSegunApertura(tipoApertura, w, h) {
  switch (tipoApertura) {
    case 'corredizo2': return dibujarCorredizo(w, h, 2);
    case 'corredizo3': return dibujarCorredizo(w, h, 3);
    case 'corredizo4':
    case 'dobleCorredizo': return dibujarCorredizo(w, h, 4);
    case 'batiente':
    case 'batienteIzquierda':
    case 'batienteDerecha':
    case 'proyectante':
    case 'pivotante':  return dibujarBatiente(w, h);
    case 'oscilobatiente': return dibujarOscilobatiente(w, h);
    case 'puerta':     return dibujarPuerta(w, h);
    case 'plegable':   return dibujarPlegable(w, h);
    case 'guillotina': return dibujarGuillotina(w, h);
    case 'fijo':
    case 'especial':
    default:           return dibujarFijo(w, h);
  }
}

/* ------------------------------------------------------------
   Color de vidrio aproximado por categoría — solo para que el
   dibujo distinga visualmente paños con vidrio distinto (ej. un
   paño en templado vs uno en laminado), no es una réplica exacta
   del aspecto real del vidrio.
   ------------------------------------------------------------ */
const COLOR_VIDRIO_POR_CATEGORIA = {
  crudo: '#D9EAF0',
  simple: '#D9EAF0',
  templado: '#B8D9E8',
  laminado: '#9BC3D8',
  templadoLaminado: '#7FAFC9',
  insulado: '#6BA0BC',
  controlSolar: '#5C8FA3',
  acustico: '#A8C8D2',
  seguridad: '#8FBFD9',
  otro: '#D9EAF0',
};

function colorVidrioDe(categoria) {
  return COLOR_VIDRIO_POR_CATEGORIA[categoria] || COLOR_VIDRIO;
}

/**
 * Dibuja una composición de paños (ej. fijo + corredizo2) como una
 * fila de franjas verticales, cada una con el ancho proporcional
 * a su anchoModulo dentro del vano total. Cada función de dibujo
 * individual ya está verificada visualmente para un módulo de
 * w=100 — en vez de reescribirlas para aceptar coordenadas
 * arbitrarias (riesgo de introducir bugs en dibujos ya probados),
 * se reutilizan tal cual dentro de un <g transform="translate+scale">
 * por módulo, lo que las "encoge/traslada" sin tocar su lógica
 * interna de coordenadas. Si el paño trae vidrioCategoria propia,
 * se sobreescribe el color de vidrio de ese módulo específico para
 * que un [F] en templado se distinga de un [M] en laminado.
 *
 * ALTO INDEPENDIENTE POR PAÑO: si un paño define su propio
 * `altoModulo` (distinto del alto general del vano — ej. un panel
 * fijo más bajo junto a una puerta más alta), se dibuja a su
 * propia escala vertical y se alinea contra el borde INFERIOR del
 * vano (h_max), que es como se construyen realmente estos sistemas:
 * los marcos asientan sobre el mismo nivel de piso, y es el marco
 * superior el que varía en altura entre paños.
 */
function dibujarComposicion(w, hMax, panos, anchoTotal, altoVanoReal, conLetras = true) {
  let x = 0;
  const grupos = panos.map((pano, i) => {
    const anchoFraccion = Number(pano.anchoModulo) / Number(anchoTotal);
    const anchoSvg = w * anchoFraccion;
    const escalaX = anchoSvg / 100;

    // Alto propio del paño (si lo define) relativo al alto del vano —
    // un paño con altoModulo menor se dibuja más bajo y se alinea contra
    // el piso (offsetY lo desplaza desde arriba, dejando el hueco arriba).
    const tieneAltoPropio = pano.altoModulo != null && Number(pano.altoModulo) > 0;
    const hPano = tieneAltoPropio ? hMax * (Number(pano.altoModulo) / Number(altoVanoReal)) : hMax;
    const hPanoClamp = Math.min(Math.max(hPano, 4), hMax);
    const offsetY = hMax - hPanoClamp;

    const contenidoModulo = dibujarModuloSegunApertura(pano.tipoApertura, 100, hPanoClamp);
    const colorPano = pano.vidrioCategoria ? colorVidrioDe(pano.vidrioCategoria) : null;
    // Si el paño tiene un color de vidrio distinto al genérico, se
    // inyecta como variable CSS local que sobreescribe COLOR_VIDRIO
    // únicamente dentro de este <g> (los rects de vidrio usan
    // fill="${COLOR_VIDRIO}" literal, así que se sustituye en el string).
    const contenidoConColor = colorPano
      ? contenidoModulo.replaceAll(COLOR_VIDRIO, colorPano)
      : contenidoModulo;
    const letra = conLetras
      ? `<circle cx="14" cy="${offsetY + 11}" r="7" fill="#fff" stroke="${COLOR_MARCO}" stroke-width="1" opacity="0.92"/><text x="14" y="${offsetY + 13.8}" font-size="8.5" font-weight="800" text-anchor="middle" fill="${COLOR_MARCO}">${letraPano(i)}</text>`
      : '';
    const grupo = `<g transform="translate(${x},${offsetY}) scale(${escalaX},1)">${contenidoConColor}<g transform="scale(${1 / escalaX},1)">${letra}</g></g>`;
    x += anchoSvg;
    return grupo;
  });
  const marcoExterior = `<rect x="1" y="1" width="${w - 2}" height="${hMax - 2}" fill="none" stroke="${COLOR_MARCO}" stroke-width="${GROSOR_MARCO}"/>`;
  let divisores = '';
  let xDiv = 0;
  for (let i = 0; i < panos.length - 1; i++) {
    xDiv += w * (Number(panos[i].anchoModulo) / Number(anchoTotal));
    divisores += `<line x1="${xDiv}" y1="2" x2="${xDiv}" y2="${hMax - 2}" stroke="${COLOR_MARCO}" stroke-width="${GROSOR_MARCO * 0.8}"/>`;
  }
  return `${grupos.join('')}${divisores}${marcoExterior}`;
}

function letraPano(indice) {
  const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (indice < 26) return LETRAS[indice];
  return LETRAS[Math.floor(indice / 26) - 1] + LETRAS[indice % 26];
}

/**
 * Devuelve las dimensiones reales (ancho × alto, en las mismas
 * unidades del viewBox) del dibujo técnico de un ítem, sin
 * generar el SVG completo — usado por fitDrawingToPage() en
 * pdfGenerator.js para calcular la escala y el centrado
 * correctos ANTES de insertar la imagen en la página, en vez de
 * depender de que el navegador calcule "height:auto" a partir
 * de un SVG sin tamaño intrínseco (la causa real del recorte:
 * un <svg> sin width/height propios tiene un tamaño por defecto
 * de 300×150px en CSS, que no guarda relación con el viewBox
 * real — por eso un vano muy ancho y bajo, como 4.4×1.6 m,
 * terminaba mostrando solo una esquina ampliada).
 */
export function obtenerDimensionesDibujo(itemCalculado) {
  const { tipoSolucion, ancho, alto } = itemCalculado;
  if (!tieneDibujo(tipoSolucion)) return null;
  const w = 100;
  const h = escalaAlto(ancho || 1, alto || 1, w);
  return { width: w, height: h + 14 };
}

/**
 * Genera el SVG técnico de un ítem ya calculado (objeto devuelto
 * por calcularItem en reglasCalculo.js). Devuelve null si el
 * tipo de solución no tiene dibujo soportado (según el alcance
 * acordado: ventana, puerta, mampara, puerta de ducha, división).
 * Usa `panos` (siempre presente desde la migración a FRAME+PANELS+
 * OPENINGS) en vez de `composicion` — un ítem simple resuelve a
 * un único paño, así que esta función ya no necesita una rama
 * "esMixto vs no mixto": dibuja la composición de N paños, donde
 * N=1 es exactamente el caso de siempre.
 */
export function generarDibujoItem(itemCalculado) {
  const { tipoSolucion, panos, ancho, alto, cantidad } = itemCalculado;
  if (!tieneDibujo(tipoSolucion)) return null;

  const w = 100;
  const h = escalaAlto(ancho || 1, alto || 1, w);
  const listaPanos = panos && panos.length ? panos : [{ tipoApertura: itemCalculado.tipoApertura, anchoModulo: ancho }];

  const contenido = dibujarComposicion(w, h, listaPanos, ancho, alto, listaPanos.length > 1);

  const etiquetaMedidas = `${Number(ancho).toFixed(2)} × ${Number(alto).toFixed(2)} m`;
  const etiquetaCantidad = cantidad > 1 ? ` (×${cantidad})` : '';

  return `
    <svg viewBox="0 0 ${w} ${h + 14}" width="${w}" height="${h + 14}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
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

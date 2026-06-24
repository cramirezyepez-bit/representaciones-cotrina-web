/* ============================================================
   ICONOSCONFIGURADOR.JS — SVG de íconos para el configurador
   visual de tipo de sistema, apertura y puertas de ducha
   ============================================================
   Cada función devuelve un string SVG (viewBox 0 0 64 64,
   stroke-based, sin relleno de color salvo el vidrio en un tono
   suave) pensado para verse bien tanto a 48px (grilla de íconos)
   como impreso en una tarjeta seleccionada. Usa `currentColor`
   para el trazo, así el botón controla el color vía CSS según
   esté seleccionado o no.

   Estos íconos son SOLO para el selector visual (UI) — no deben
   confundirse con los dibujos técnicos reales de svgGenerator.js,
   que se calculan a partir de medidas reales del ítem y se usan
   en el PDF. Aquí buscamos reconocimiento rápido de la opción,
   no precisión dimensional.
   ============================================================ */

const STROKE = 2.4;

function svgWrap(contenido) {
  return `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">${contenido}</svg>`;
}

/* ------------------------------------------------------------
   ÍCONOS — TIPO DE SISTEMA
   ------------------------------------------------------------ */
export const ICONOS_TIPO_SOLUCION = {
  ventana: svgWrap(`
    <rect x="10" y="14" width="44" height="36" rx="1" stroke="currentColor" stroke-width="${STROKE}"/>
    <line x1="32" y1="14" x2="32" y2="50" stroke="currentColor" stroke-width="${STROKE}"/>
    <line x1="10" y1="32" x2="54" y2="32" stroke="currentColor" stroke-width="${STROKE}"/>
  `),
  mampara: svgWrap(`
    <rect x="8" y="12" width="48" height="40" rx="1" stroke="currentColor" stroke-width="${STROKE}"/>
    <line x1="29" y1="12" x2="29" y2="52" stroke="currentColor" stroke-width="${STROKE}"/>
    <line x1="35" y1="12" x2="35" y2="52" stroke="currentColor" stroke-width="${STROKE}"/>
    <path d="M14 32 L22 32 M18 28 L22 32 L18 36" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  `),
  muroCortina: svgWrap(`
    <rect x="6" y="8" width="52" height="48" stroke="currentColor" stroke-width="${STROKE}"/>
    <line x1="6" y1="24" x2="58" y2="24" stroke="currentColor" stroke-width="1.6"/>
    <line x1="6" y1="40" x2="58" y2="40" stroke="currentColor" stroke-width="1.6"/>
    <line x1="22" y1="8" x2="22" y2="56" stroke="currentColor" stroke-width="1.6"/>
    <line x1="42" y1="8" x2="42" y2="56" stroke="currentColor" stroke-width="1.6"/>
  `),
  divisionInterior: svgWrap(`
    <line x1="32" y1="8" x2="32" y2="56" stroke="currentColor" stroke-width="${STROKE}"/>
    <rect x="14" y="14" width="18" height="42" stroke="currentColor" stroke-width="1.4" opacity="0.5"/>
    <rect x="32" y="14" width="18" height="42" stroke="currentColor" stroke-width="1.4" opacity="0.5"/>
    <line x1="32" y1="8" x2="58" y2="8" stroke="currentColor" stroke-width="${STROKE}"/>
  `),
  puerta: svgWrap(`
    <rect x="16" y="8" width="32" height="48" rx="1" stroke="currentColor" stroke-width="${STROKE}"/>
    <line x1="16" y1="8" x2="16" y2="56" stroke="currentColor" stroke-width="${STROKE}"/>
    <circle cx="42" cy="32" r="1.6" fill="currentColor"/>
    <path d="M48 8 A40 40 0 0 1 48 56" stroke="currentColor" stroke-width="1" stroke-dasharray="2,2" opacity="0.5"/>
  `),
  puertaDucha: svgWrap(`
    <rect x="10" y="10" width="20" height="44" rx="1" stroke="currentColor" stroke-width="${STROKE}"/>
    <rect x="34" y="10" width="20" height="44" rx="1" stroke="currentColor" stroke-width="${STROKE}"/>
    <path d="M38 14 L50 14 M46 10 L50 14 L46 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M38 50 L50 50 M46 46 L50 50 L46 54" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  `),
  baranda: svgWrap(`
    <line x1="8" y1="54" x2="56" y2="54" stroke="currentColor" stroke-width="${STROKE}"/>
    <rect x="12" y="20" width="12" height="34" stroke="currentColor" stroke-width="1.6"/>
    <rect x="26" y="20" width="12" height="34" stroke="currentColor" stroke-width="1.6"/>
    <rect x="40" y="20" width="12" height="34" stroke="currentColor" stroke-width="1.6"/>
    <line x1="8" y1="18" x2="56" y2="18" stroke="currentColor" stroke-width="${STROKE}"/>
  `),
  cerramientoPersonalizado: svgWrap(`
    <circle cx="32" cy="32" r="22" stroke="currentColor" stroke-width="${STROKE}" stroke-dasharray="5,4"/>
    <path d="M32 22 v20 M22 32 h20" stroke="currentColor" stroke-width="${STROKE}" stroke-linecap="round"/>
  `),
};

/* ------------------------------------------------------------
   ÍCONOS — TIPO DE APERTURA / PAÑO
   ------------------------------------------------------------ */
export const ICONOS_TIPO_APERTURA = {
  fijo: svgWrap(`
    <rect x="14" y="12" width="36" height="40" rx="1" stroke="currentColor" stroke-width="${STROKE}"/>
    <circle cx="32" cy="32" r="1.8" fill="currentColor"/>
  `),
  corredizo2: svgWrap(`
    <rect x="10" y="12" width="44" height="40" rx="1" stroke="currentColor" stroke-width="${STROKE}"/>
    <line x1="32" y1="12" x2="32" y2="52" stroke="currentColor" stroke-width="1.6"/>
    <path d="M14 32 L26 32 M18 28 L14 32 L18 36" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M50 32 L38 32 M46 28 L50 32 L46 36" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  `),
  corredizo3: svgWrap(`
    <rect x="8" y="12" width="48" height="40" rx="1" stroke="currentColor" stroke-width="${STROKE}"/>
    <line x1="24" y1="12" x2="24" y2="52" stroke="currentColor" stroke-width="1.4"/>
    <line x1="40" y1="12" x2="40" y2="52" stroke="currentColor" stroke-width="1.4"/>
    <path d="M12 32 L20 32 M16 28 L12 32 L16 36" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M52 32 L44 32 M48 28 L52 32 L48 36" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  `),
  dobleCorredizo: svgWrap(`
    <rect x="8" y="12" width="48" height="40" rx="1" stroke="currentColor" stroke-width="${STROKE}"/>
    <line x1="20" y1="12" x2="20" y2="52" stroke="currentColor" stroke-width="1.4"/>
    <line x1="32" y1="12" x2="32" y2="52" stroke="currentColor" stroke-width="1.4"/>
    <line x1="44" y1="12" x2="44" y2="52" stroke="currentColor" stroke-width="1.4"/>
    <path d="M24 32 L30 32 M27 29 L24 32 L27 35" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M40 32 L34 32 M37 29 L40 32 L37 35" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  `),
  batienteIzquierda: svgWrap(`
    <rect x="14" y="12" width="36" height="40" rx="1" stroke="currentColor" stroke-width="${STROKE}"/>
    <path d="M50 14 L16 32 L50 50" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3,2" fill="none"/>
    <circle cx="50" cy="32" r="1.6" fill="currentColor"/>
  `),
  batienteDerecha: svgWrap(`
    <rect x="14" y="12" width="36" height="40" rx="1" stroke="currentColor" stroke-width="${STROKE}"/>
    <path d="M14 14 L48 32 L14 50" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3,2" fill="none"/>
    <circle cx="14" cy="32" r="1.6" fill="currentColor"/>
  `),
  proyectante: svgWrap(`
    <rect x="14" y="14" width="36" height="36" rx="1" stroke="currentColor" stroke-width="${STROKE}"/>
    <path d="M16 16 L32 30 L48 16" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3,2" fill="none"/>
    <circle cx="32" cy="14" r="1.6" fill="currentColor"/>
  `),
  oscilobatiente: svgWrap(`
    <rect x="14" y="12" width="36" height="40" rx="1" stroke="currentColor" stroke-width="${STROKE}"/>
    <path d="M50 14 L16 32 L50 50" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3,2" fill="none"/>
    <path d="M16 14 L32 26 L48 14" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3,2" fill="none"/>
    <circle cx="50" cy="32" r="1.4" fill="currentColor"/>
  `),
  puerta: svgWrap(`
    <rect x="18" y="8" width="30" height="48" rx="1" stroke="currentColor" stroke-width="${STROKE}"/>
    <line x1="18" y1="8" x2="18" y2="56" stroke="currentColor" stroke-width="${STROKE}"/>
    <circle cx="42" cy="32" r="1.8" fill="currentColor"/>
    <path d="M48 10 A38 38 0 0 1 48 54" stroke="currentColor" stroke-width="1" stroke-dasharray="2,2" opacity="0.5"/>
  `),
};

/* ------------------------------------------------------------
   ÍCONOS — VARIANTES DE PUERTA DE DUCHA
   ------------------------------------------------------------
   Mapean a composiciones de la lógica existente: cada variante
   se traduce a un tipoApertura simple o a una `composicion`
   (lista de módulos fijo/corredizo/batiente) con anchos
   proporcionales sugeridos, que el usuario puede ajustar.
   ------------------------------------------------------------ */
export const ICONOS_DUCHA = {
  fijaCorredizaUna: svgWrap(`
    <rect x="8" y="10" width="20" height="44" rx="1" stroke="currentColor" stroke-width="${STROKE}"/>
    <rect x="32" y="10" width="24" height="44" rx="1" stroke="currentColor" stroke-width="${STROKE}"/>
    <line x1="28" y1="10" x2="28" y2="54" stroke="currentColor" stroke-width="1.6"/>
    <path d="M38 32 L50 32 M46 28 L50 32 L46 36" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  `),
  corredizaDosHojas: svgWrap(`
    <rect x="8" y="10" width="48" height="44" rx="1" stroke="currentColor" stroke-width="${STROKE}"/>
    <line x1="32" y1="10" x2="32" y2="54" stroke="currentColor" stroke-width="1.6"/>
    <path d="M12 32 L24 32 M18 28 L12 32 L18 36" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M52 32 L40 32 M46 28 L52 32 L46 36" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  `),
  batiente: svgWrap(`
    <rect x="14" y="10" width="36" height="44" rx="1" stroke="currentColor" stroke-width="${STROKE}"/>
    <path d="M50 12 L18 32 L50 52" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3,2" fill="none"/>
    <circle cx="50" cy="32" r="1.6" fill="currentColor"/>
  `),
  abatibleFijo: svgWrap(`
    <rect x="8" y="10" width="22" height="44" rx="1" stroke="currentColor" stroke-width="${STROKE}"/>
    <rect x="34" y="10" width="22" height="44" rx="1" stroke="currentColor" stroke-width="${STROKE}"/>
    <path d="M30 12 L52 32 L30 52" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3,2" fill="none"/>
    <circle cx="30" cy="32" r="1.5" fill="currentColor"/>
  `),
  angular90: svgWrap(`
    <path d="M14 54 L14 18 L48 18" stroke="currentColor" stroke-width="${STROKE}" fill="none" stroke-linecap="square"/>
    <rect x="14" y="18" width="2" height="36" fill="currentColor" opacity="0.15"/>
    <rect x="14" y="18" width="34" height="2" fill="currentColor" opacity="0.15"/>
    <path d="M20 50 L20 24 M44 22 L20 22" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2.5,2" opacity="0.7"/>
    <path d="M16 40 L24 40 M20 36 L24 40 L20 44" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>
  `),
  frenteTresHojas: svgWrap(`
    <rect x="6" y="14" width="52" height="38" rx="1" stroke="currentColor" stroke-width="${STROKE}"/>
    <line x1="23" y1="14" x2="23" y2="52" stroke="currentColor" stroke-width="1.4"/>
    <line x1="41" y1="14" x2="41" y2="52" stroke="currentColor" stroke-width="1.4"/>
    <path d="M27 33 L37 33 M33 29 L37 33 L33 37" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
  `),
};

/** Metadatos de cada variante de ducha: etiqueta + mapeo a apertura/composición. */
export const VARIANTES_DUCHA = {
  fijaCorredizaUna:   { label: 'Corrediza 1 hoja fija + 1 corrediza', tipoApertura: null, composicion: [{ tipoApertura: 'fijo', proporcion: 0.45 }, { tipoApertura: 'corredizo2', proporcion: 0.55 }] },
  corredizaDosHojas:  { label: 'Corrediza 2 hojas', tipoApertura: 'corredizo2', composicion: null },
  batiente:           { label: 'Batiente', tipoApertura: 'batiente', composicion: null },
  abatibleFijo:       { label: 'Abatible + fijo', tipoApertura: null, composicion: [{ tipoApertura: 'fijo', proporcion: 0.5 }, { tipoApertura: 'batiente', proporcion: 0.5 }] },
  angular90:          { label: 'Angular 90°', tipoApertura: 'batiente', composicion: null, esAngular: true },
  frenteTresHojas:    { label: 'Frente 3 hojas (2 corredizas)', tipoApertura: 'corredizo3', composicion: null },
};

/* ============================================================
   PANOS.JS — Modelo de paño individual dentro de un ítem
   ============================================================
   Concepto FRAME + PANELS + OPENINGS del brief: un ítem (un
   vano físico, ej. "ventana de la sala") puede estar compuesto
   por N paños independientes, cada uno con su propia apertura,
   medidas y vidrio — ej. [F][M][M][F] = fijo + 2 corredizos +
   fijo, donde el paño F de la izquierda puede llevar un vidrio
   distinto al M central.

   RELACIÓN CON EL SISTEMA ANTERIOR (composición mixta):
   La "composición mixta" ya existente (un ítem con varios
   módulos {tipoApertura, anchoModulo}) es el antecesor directo
   de este modelo — le faltaban dos cosas: vidrio independiente
   por módulo, y alto independiente por módulo (para casos como
   una puerta con un panel fijo lateral más bajo). Un ítem
   "simple" (sin composición) se sigue representando aquí como
   un array de paños con un único elemento — no hay dos caminos
   de cálculo paralelos, solo un caso general (N paños) cuyo
   caso particular N=1 es el ítem de siempre.

   Cada paño es una entidad con código propio (A, B, C...) que,
   combinado con el código del ítem (V1, V2...), da identificadores
   como "V1-A", "V1-B" — visibles en la UI y en el PDF.
   ============================================================ */

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Letra de paño según índice (0->A, 1->B, ..., 26->AA, ...). */
export function letraPano(indice) {
  if (indice < 26) return LETRAS[indice];
  return LETRAS[Math.floor(indice / 26) - 1] + LETRAS[indice % 26];
}

/**
 * Crea un paño con valores por defecto razonables, heredando
 * tipo de apertura, vidrio y ancho del ítem padre cuando no se
 * especifican — así "agregar un paño" nunca deja campos vacíos
 * que rompan el cálculo.
 */
export function crearPano({
  tipoApertura = 'fijo',
  anchoModulo = 0,
  altoModulo = null, // null = usa el alto del vano (ítem), no uno propio
  vidrioCategoria = 'crudo',
  vidrioVariante = 'unico',
} = {}) {
  return { tipoApertura, anchoModulo: Number(anchoModulo) || 0, altoModulo: altoModulo != null ? Number(altoModulo) : null, vidrioCategoria, vidrioVariante };
}

/**
 * Construye la lista de paños por defecto para un ítem "simple"
 * (sin configuración manual de paños): un único paño que ocupa
 * todo el ancho/alto del vano, con el tipoApertura y vidrio que
 * ya tenía el ítem. Esto es lo que permite tratar TODO ítem como
 * "N paños" sin que el caso simple requiera código especial en
 * el motor de cálculo.
 */
export function panosDesdeItemSimple({ tipoApertura, ancho, vidrioCategoria, vidrioVariante }) {
  return [crearPano({ tipoApertura, anchoModulo: Number(ancho) || 0, altoModulo: null, vidrioCategoria, vidrioVariante })];
}

/**
 * Migra la `composicion` mixta del sistema anterior (sin vidrio
 * por módulo) al modelo de paños: cada módulo se vuelve un paño,
 * heredando el vidrio único que tenía el ítem completo. Permite
 * que datos antiguos (composicion sin panos) sigan funcionando
 * sin romper nada ya guardado o ya generado en sesiones previas.
 */
export function panosDesdeComposicionLegacy(composicion, { vidrioCategoria, vidrioVariante }) {
  return composicion.map(m => crearPano({
    tipoApertura: m.tipoApertura,
    anchoModulo: m.anchoModulo,
    altoModulo: null,
    vidrioCategoria, vidrioVariante,
  }));
}

/**
 * Punto único de entrada: dado un ítem crudo del formulario,
 * devuelve SIEMPRE una lista de paños no vacía, sin importar si
 * vino con `panos` explícitos (configurador nuevo), `composicion`
 * legacy (sin vidrio por módulo), o ni una cosa ni la otra (ítem
 * simple de un solo paño). El motor de cálculo (reglasCalculo.js)
 * solo necesita conocer esta función — nunca itera composicion
 * directamente.
 */
export function resolverPanos(item) {
  if (item.panos && item.panos.length > 0) {
    return item.panos.map(p => crearPano(p));
  }
  if (item.composicion && item.composicion.length > 1) {
    return panosDesdeComposicionLegacy(item.composicion, item);
  }
  return panosDesdeItemSimple(item);
}

/** Código de apertura legible para mostrar en el dibujo 2D / UI (ej. "F", "M", "B"). */
export const CODIGO_CORTO_APERTURA = {
  fijo: 'F',
  corredizo2: 'M', corredizo3: 'M', corredizo4: 'M', dobleCorredizo: 'M',
  batiente: 'B', batienteIzquierda: 'B', batienteDerecha: 'B',
  proyectante: 'P', oscilobatiente: 'O', pivotante: 'B',
  puerta: 'D', plegable: 'M', guillotina: 'M', especial: '?',
};

/** Suma de anchos de una lista de paños (para validar contra el ancho total del ítem). */
export function sumaAnchosPanos(panos) {
  return panos.reduce((acc, p) => acc + (Number(p.anchoModulo) || 0), 0);
}

/** Texto tipo "[F][M][M][F]" para mostrar la configuración de paños de un vistazo. */
export function notacionPanos(panos) {
  return panos.map(p => `[${CODIGO_CORTO_APERTURA[p.tipoApertura] || '?'}]`).join('');
}

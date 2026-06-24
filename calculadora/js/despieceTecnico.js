/* ============================================================
   DESPIECETECNICO.JS — Despiece automático de perfiles y
   accesorios según reglas prácticas de mercado
   ============================================================
   OBJETIVO: que cada ítem muestre, sin que el usuario tenga que
   tipear nada extra, cuántos metros lineales de perfil lleva
   (marco superior/inferior, jambas, parantes y hojas) y cuántas
   unidades reales de cada accesorio (rodajes, bisagras, felpas,
   burletes, silicona, etc.) corresponden a su configuración.

   ALCANCE Y HONESTIDAD DE LOS NÚMEROS:
   Estas son reglas técnicas ESTÁNDAR DE MERCADO para carpintería
   de aluminio/PVC/vidrio (rodajes por hoja corredera, cerraduras
   por hoja batiente, felpa = perímetro de hoja, etc.), no una
   ficha de despiece de fábrica calculada hoja por hoja con cortes
   a 45°/90° reales. Sirven para que el equipo comercial tenga una
   cifra realista de partida en la cotización preliminar y en el
   PDF — el taller siempre valida el despiece exacto antes de
   fabricar. Cada función deja explícito de dónde sale el número.

   GEOMETRÍA ASUMIDA (simplificada pero coherente):
   - Marco perimetral: 2×ancho + 2×alto (no se restan traslapes,
     que es lo que asumiría una pre-cotización, no el corte final).
   - Parantes verticales entre hojas: (nHojas - 1) × alto, para
     configuraciones corredizas/plegables con hojas en línea.
   - Cada hoja individual también tiene su propio marco de hoja
     (perímetro de la hoja), que es lo que realmente lleva felpa/
     burlete perimetral.
   ============================================================ */

import { TIPOS_APERTURA } from './catalogos.js';

/** Nº de hojas reales de un tipo de apertura (fijo = 1 paño sin mecanismo). */
function hojasDe(tipoApertura) {
  const t = TIPOS_APERTURA[tipoApertura];
  if (!t) return 1;
  return Math.max(t.hojas, 1); // "fijo" tiene hojas:0 en catalogos.js, pero igual es 1 paño físico
}

/**
 * Geometría de perfiles en metros lineales (ml) para UNA unidad
 * del ítem (se multiplica por `cantidad` más arriba en quien
 * consuma este módulo).
 */
export function calcularDespiecePerfiles({ tipoApertura, ancho, alto, composicion, esMixto }) {
  const w = Number(ancho) || 0;
  const h = Number(alto) || 0;

  // En composición mixta, cada módulo aporta su propio marco interno
  // (separador entre módulos) — se aproxima sumando un parante extra
  // por cada división entre módulos, además del marco exterior único.
  const nModulos = esMixto && composicion && composicion.length > 1 ? composicion.length : 1;
  const nHojasPorModulo = esMixto && composicion
    ? composicion.map(m => hojasDe(m.tipoApertura))
    : [hojasDe(tipoApertura)];
  const totalHojas = nHojasPorModulo.reduce((a, b) => a + b, 0);

  const marcoSuperior = w;
  const marcoInferior = w;
  const jambaIzquierda = h;
  const jambaDerecha = h;
  const marcoPerimetral = marcoSuperior + marcoInferior + jambaIzquierda + jambaDerecha;

  // Parantes: divisores entre módulos (composición mixta) + divisores
  // entre hojas dentro de cada módulo corredizo/plegable (nHojas - 1).
  const parantesEntreModulos = Math.max(nModulos - 1, 0) * h;
  const parantesEntreHojas = nHojasPorModulo.reduce((acc, n) => acc + Math.max(n - 1, 0), 0) * h;
  const totalParantes = parantesEntreModulos + parantesEntreHojas;

  // Marco propio de cada hoja móvil (perímetro de hoja, aprox. hoja
  // de igual alto que el vano y ancho = ancho del vano / nHojas del módulo).
  let mlHojas = 0;
  if (esMixto && composicion) {
    composicion.forEach(m => {
      const nH = hojasDe(m.tipoApertura);
      const anchoModulo = Number(m.anchoModulo) || 0;
      const anchoHoja = nH > 0 ? anchoModulo / nH : anchoModulo;
      mlHojas += nH * (2 * anchoHoja + 2 * h);
    });
  } else {
    const nH = totalHojas;
    const anchoHoja = nH > 0 ? w / nH : w;
    mlHojas = nH * (2 * anchoHoja + 2 * h);
  }

  const totalMl = marcoPerimetral + totalParantes + mlHojas;

  return {
    marcoSuperior, marcoInferior, jambaIzquierda, jambaDerecha, marcoPerimetral,
    parantes: totalParantes,
    hojasMl: mlHojas,
    totalMl,
    totalHojas,
    fuente: 'Estimación geométrica de mercado (perímetro de marco + parantes + perímetro de hoja). Validar despiece exacto en taller antes de fabricar.',
  };
}

/* ------------------------------------------------------------
   REGLAS DE ACCESORIOS POR HOJA / PERÍMETRO
   ------------------------------------------------------------
   Cada regla expresa: cantidad por hoja, o cantidad por metro
   lineal de perímetro de hoja, según lo que es estándar en el
   mercado de carpintería de aluminio/PVC en Lima. Se documenta
   la fuente de cada regla para que el equipo comercial pueda
   ajustarla con conocimiento real de taller.
   ------------------------------------------------------------ */
const REGLAS_POR_TIPO_APERTURA = {
  fijo: {
    rodajes: 0, bisagras: 0, cerraduras: 0, jaladores: 0, topes: 0, carros: 0, escuadras: 0,
  },
  corredizoSimple: { rodajesPorHoja: 2, jaladoresPorHoja: 1, cerradurasPorModulo: 1, topesPorModulo: 1, carrosPorHoja: 0, escuadrasPorHoja: 4 },
  corredizo2: { rodajesPorHoja: 2, jaladoresPorHoja: 1, cerradurasPorModulo: 1, topesPorModulo: 2, carrosPorHoja: 0, escuadrasPorHoja: 4 },
  corredizo3: { rodajesPorHoja: 2, jaladoresPorHoja: 1, cerradurasPorModulo: 1, topesPorModulo: 2, carrosPorHoja: 0, escuadrasPorHoja: 4 },
  corredizo4: { rodajesPorHoja: 2, jaladoresPorHoja: 1, cerradurasPorModulo: 1, topesPorModulo: 2, carrosPorHoja: 0, escuadrasPorHoja: 4 },
  dobleCorredizo: { rodajesPorHoja: 2, jaladoresPorHoja: 1, cerradurasPorModulo: 2, topesPorModulo: 4, carrosPorHoja: 0, escuadrasPorHoja: 4 },
  guillotina: { rodajesPorHoja: 2, jaladoresPorHoja: 1, cerradurasPorModulo: 1, topesPorModulo: 2, carrosPorHoja: 0, escuadrasPorHoja: 4 },
  batiente: { bisagrasPorHoja: 3, cerradurasPorHoja: 1, jaladoresPorHoja: 1, topesPorModulo: 1, escuadrasPorHoja: 4 },
  batienteIzquierda: { bisagrasPorHoja: 3, cerradurasPorHoja: 1, jaladoresPorHoja: 1, topesPorModulo: 1, escuadrasPorHoja: 4 },
  batienteDerecha: { bisagrasPorHoja: 3, cerradurasPorHoja: 1, jaladoresPorHoja: 1, topesPorModulo: 1, escuadrasPorHoja: 4 },
  proyectante: { bisagrasPorHoja: 2, cerradurasPorHoja: 1, jaladoresPorHoja: 1, topesPorModulo: 1, escuadrasPorHoja: 4 },
  oscilobatiente: { bisagrasPorHoja: 3, cerradurasPorHoja: 1, jaladoresPorHoja: 1, topesPorModulo: 1, escuadrasPorHoja: 4 },
  pivotante: { bisagrasPorHoja: 2, cerradurasPorHoja: 1, jaladoresPorHoja: 1, escuadrasPorHoja: 4 },
  puerta: { bisagrasPorHoja: 3, cerradurasPorHoja: 1, jaladoresPorHoja: 1, topesPorModulo: 1, escuadrasPorHoja: 4 },
  plegable: { bisagrasPorHoja: 2, rodajesPorHoja: 1, jaladoresPorHoja: 1, cerradurasPorModulo: 1, escuadrasPorHoja: 4 },
  especial: { escuadrasPorHoja: 4 },
};

const FUENTE_REGLAS = 'Regla estándar de mercado para carpintería de aluminio/PVC (no ficha de fábrica) — validar con Jorge antes de cotizar en firme.';

/**
 * Calcula la lista de líneas de accesorio (clave + cantidad) que
 * corresponden automáticamente a un ítem, según su tipo de
 * apertura (o composición mixta), número de hojas y geometría.
 * No incluye accesorios "opcionales" del catálogo (control solar,
 * película de seguridad, etc.) — esos siguen siendo selección
 * manual del usuario, porque no se derivan de la geometría.
 */
export function calcularAccesoriosAutomaticos({ tipoApertura, composicion, esMixto, ancho, alto, cantidad }) {
  const h = Number(alto) || 0;
  const cant = Number(cantidad) || 1;
  const despiece = calcularDespiecePerfiles({ tipoApertura, ancho, alto, composicion, esMixto });

  const modulos = esMixto && composicion && composicion.length > 1
    ? composicion.map(m => ({ tipoApertura: m.tipoApertura, ancho: Number(m.anchoModulo) || 0 }))
    : [{ tipoApertura, ancho: Number(ancho) || 0 }];

  const acumulado = {
    rodajes: 0, bisagras: 0, cerraduras: 0, jaladores: 0, topes: 0, carros: 0, escuadras: 0,
  };

  modulos.forEach(mod => {
    const regla = REGLAS_POR_TIPO_APERTURA[mod.tipoApertura] || REGLAS_POR_TIPO_APERTURA.especial;
    const nHojas = hojasDe(mod.tipoApertura);

    acumulado.rodajes += (regla.rodajesPorHoja || 0) * nHojas;
    acumulado.bisagras += (regla.bisagrasPorHoja || 0) * nHojas;
    acumulado.cerraduras += (regla.cerradurasPorHoja || 0) * nHojas + (regla.cerradurasPorModulo || 0);
    acumulado.jaladores += (regla.jaladoresPorHoja || 0) * nHojas;
    acumulado.topes += (regla.topesPorModulo || 0);
    acumulado.carros += (regla.carrosPorHoja || 0) * nHojas;
    acumulado.escuadras += (regla.escuadrasPorHoja || 0) * nHojas;
  });

  // Felpas y burletes: van por el perímetro de cada hoja móvil
  // (sellado entre hoja y marco) — se redondea hacia arriba al
  // medio metro más cercano, que es como se compra en rollo.
  const redondearMedioMetro = (n) => Math.ceil(n * 2) / 2;
  const felpasMl = redondearMedioMetro(despiece.hojasMl);
  const burletesMl = redondearMedioMetro(despiece.marcoPerimetral);

  // Silicona estructural: 1 tubo cubre aproximadamente 6 ml de
  // sellado perimetral (regla práctica de obra para cordón de 6mm).
  const mlSelladoTotal = despiece.marcoPerimetral + despiece.parantes;
  const siliconaTubos = Math.max(1, Math.ceil(mlSelladoTotal / 6));

  // Tornillos: estimación práctica de mercado, 1 cada 30cm de marco
  // perimetral + 4 por escuadra de hoja.
  const tornillos = Math.ceil(despiece.marcoPerimetral / 0.3) + acumulado.escuadras * 2;

  const lineas = [
    { clave: 'rodajes', cantidad: acumulado.rodajes * cant, unidad: 'unidad' },
    { clave: 'bisagras', cantidad: acumulado.bisagras * cant, unidad: 'unidad' },
    { clave: 'cerraduras', cantidad: acumulado.cerraduras * cant, unidad: 'unidad' },
    { clave: 'jaladores', cantidad: acumulado.jaladores * cant, unidad: 'unidad' },
    { clave: 'topes', cantidad: acumulado.topes * cant, unidad: 'unidad' },
    { clave: 'escuadras', cantidad: acumulado.escuadras * cant, unidad: 'unidad' },
    { clave: 'felpas', cantidad: Number((felpasMl * cant).toFixed(1)), unidad: 'metro' },
    { clave: 'burletes', cantidad: Number((burletesMl * cant).toFixed(1)), unidad: 'metro' },
    { clave: 'siliconaEstructural', cantidad: siliconaTubos * cant, unidad: 'tubo' },
    { clave: 'tornillos', cantidad: tornillos * cant, unidad: 'unidad' },
  ].filter(l => l.cantidad > 0);

  return { lineas, despiece, fuente: FUENTE_REGLAS };
}

/** Nombre legible de cada clave de accesorio automático, para UI/PDF. */
export const NOMBRES_ACCESORIO_AUTO = {
  rodajes: 'Rodajes',
  bisagras: 'Bisagras',
  cerraduras: 'Cerraduras',
  jaladores: 'Jaladores',
  topes: 'Topes',
  escuadras: 'Escuadras',
  felpas: 'Felpas',
  burletes: 'Burletes',
  siliconaEstructural: 'Silicona estructural',
  tornillos: 'Tornillos',
};

export function describirLineaAccesorioAuto(linea) {
  const nombre = NOMBRES_ACCESORIO_AUTO[linea.clave] || linea.clave;
  const cantidadTexto = linea.unidad === 'unidad'
    ? `${Math.round(linea.cantidad)} ${linea.cantidad === 1 ? 'unidad' : 'unidades'}`
    : linea.unidad === 'metro'
      ? `${linea.cantidad} m`
      : `${linea.cantidad} ${linea.cantidad === 1 ? 'tubo' : 'tubos'}`;
  return `${nombre}: ${cantidadTexto}`;
}

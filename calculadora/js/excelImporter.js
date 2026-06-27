/* ============================================================
   EXCELIMPORTER.JS — Importación de presupuesto desde Excel
   ============================================================
   Módulo TEMPORAL (ver brief): mientras el cotizador inteligente
   no calcula automáticamente, el equipo comercial sigue armando
   el presupuesto en Excel — con el MISMO formato histórico que
   Jorge ya usa hoy (ver "Presupuesto_26000.xlsx": 711 hojas
   reales, mismo layout de columnas). Este módulo SOLO lee esa
   información y la convierte a objetos JavaScript — no calcula
   precios, no corrige ni interpreta montos, no toca
   reglasCalculo.js.

   Responsabilidad única: Excel → objetos JS validados.
   No sabe nada de SVG ni de PDF. Cuando el cotizador inteligente
   esté terminado, este archivo deja de llamarse desde cotizador.js
   y el resto del sistema sigue funcionando exactamente igual.

   ------------------------------------------------------------
   FORMATO REAL ESPERADO (una sola hoja por archivo, igual al
   formato histórico de Jorge — sin columna "Tipo" explícita):

     Cabecera (texto libre, columna A = etiqueta, columna D = valor):
       "Cliente"         (fila variable) → valor en columna D
       "Dirección Obra"  o "Dirección"   → valor en columna D (se usa como distrito)
       "Fecha"                           → valor en columna D
     (la posición exacta de fila no importa: se busca por etiqueta)

     Tabla de ítems: se ubica la fila de encabezados buscando la
     palabra "ITEM" en alguna celda — desde la fila siguiente, una
     fila = un ítem, hasta encontrar una fila que contenga "TOTAL".
       B: Código/zona | C: Cantidad | D: Ancho (m) | E: "x" (se ignora)
       F: Alto (m) | G: Descripción (texto libre) | K: "S/" (se ignora)
       L: Precio
     Filas sin datos de ancho/alto/precio en este rango (ej. títulos
     de sección como "ESTRUCTURAS Y MAMPARAS DE CRISTAL", o líneas de
     condiciones comerciales que a veces quedan dentro del rango) se
     ignoran en silencio, no se reportan como error.

   ------------------------------------------------------------
   DETECCIÓN DE PRODUCTO Y APERTURA (sin columna "Tipo"):
   Como el Excel real de Jorge no indica el tipo de producto ni el
   tipo de apertura en una columna separada, se infieren a partir
   de palabras clave en la descripción (columna G). Esto es
   necesariamente una heurística — el texto comercial no siempre
   trae esa información explícita — así que:
     - Si NO se detecta ninguna palabra de producto reconocida, el
       ítem se conserva sin dibujo (igual que un tipo no reconocido
       en el diseño anterior): se lista en el PDF con su descripción
       y precio tal cual, sin gráfico.
     - Si se detecta producto pero NO palabra de apertura, se asume
       "fijo" — es la opción visual más simple y conservadora
       cuando el texto no especifica mecanismo de apertura (la
       mayoría de los casos reales: "Estructura de aluminio... y
       cristal laminado", sin mencionar fijo/corredizo).
     - Si el texto menciona "fija" Y "corrediza" a la vez (ej.
       "Mampara fija y corrediza"), se dibuja como composición de
       2 paños [Fijo][Corredizo] repartiendo el ancho total en
       mitades iguales — no hay otra información en el texto para
       saber la proporción real entre ambos paños.
   ============================================================ */

import { crearPano } from './panos.js';

/** Palabras clave de producto, en orden de prioridad (la primera que matchea gana). */
const PALABRAS_PRODUCTO = [
  { palabra: 'ventana',     tipoSolucion: 'ventana' },
  { palabra: 'puerta',      tipoSolucion: 'puerta' },
  { palabra: 'baranda',     tipoSolucion: 'baranda' },
  { palabra: 'muro cortina', tipoSolucion: 'muroCortina' },
  { palabra: 'fachada',     tipoSolucion: 'fachada' },
  { palabra: 'mampara',     tipoSolucion: 'mampara' },
  { palabra: 'estructura',  tipoSolucion: 'cerramiento' },
  { palabra: 'cerramiento', tipoSolucion: 'cerramiento' },
];

/** Normaliza texto para comparar sin sensibilidad a mayúsculas/espacios extra. */
function normalizar(texto) {
  return String(texto || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Detecta el tipo de solución (producto) a partir de la descripción libre. Devuelve null si no reconoce ninguna palabra clave. */
function detectarProducto(descripcion) {
  const d = normalizar(descripcion);
  for (const { palabra, tipoSolucion } of PALABRAS_PRODUCTO) {
    if (d.includes(palabra)) return tipoSolucion;
  }
  return null;
}

/**
 * Detecta el/los paño(s) de apertura a partir de la descripción libre.
 * Devuelve una lista de especificaciones { tipoApertura, fraccionAncho }
 * que luego se traduce a paños reales con el ancho total del ítem.
 *   - "fija" + "corrediza" en el mismo texto → 2 paños 50/50
 *   - solo "corrediza"/"corredizo" → 1 paño corredizo2 (ancho completo)
 *   - solo "fija"/"fijo" → 1 paño fijo (ancho completo)
 *   - ninguna palabra de apertura → 1 paño fijo por defecto (ancho completo)
 */
function detectarEsquemaApertura(descripcion) {
  const d = normalizar(descripcion);
  const tieneFijo = /\bfij[ao]s?\b/.test(d);
  const tieneCorredizo = /corrediz/.test(d);
  if (tieneFijo && tieneCorredizo) {
    return [{ tipoApertura: 'fijo', fraccionAncho: 0.5 }, { tipoApertura: 'corredizo2', fraccionAncho: 0.5 }];
  }
  if (tieneCorredizo) return [{ tipoApertura: 'corredizo2', fraccionAncho: 1 }];
  return [{ tipoApertura: 'fijo', fraccionAncho: 1 }]; // incluye el caso "fijo" explícito y el caso sin ninguna palabra (default conservador)
}

/** Construye la lista de paños reales (panos.js) para un ítem, repartiendo el ancho total según el esquema de apertura detectado. */
function construirPanosDesdeDescripcion(descripcion, anchoTotal) {
  const esquema = detectarEsquemaApertura(descripcion);
  return esquema.map(({ tipoApertura, fraccionAncho }) => crearPano({
    tipoApertura,
    anchoModulo: Number(anchoTotal) * fraccionAncho,
    altoModulo: null,
    vidrioCategoria: 'crudo', // no se conoce la categoría real del vidrio a partir del texto libre; solo afecta el color del dibujo, no el precio
    vidrioVariante: 'unico',
  }));
}

/** Busca, en la hoja, la primera celda de columna A cuyo texto coincida EXACTAMENTE con `etiqueta` (evita que, p.ej., "Dirección" capture por error la fila "Dirección Obra"); devuelve el valor de la celda de columna D (índice 3) de esa misma fila, o '' si no se encuentra. */
function buscarValorPorEtiqueta(filas, etiqueta) {
  const etiquetaNorm = normalizar(etiqueta);
  for (const fila of filas) {
    const colA = normalizar(fila[0]);
    if (colA === etiquetaNorm) {
      const valor = fila[3]; // columna D
      return valor != null ? String(valor).trim() : '';
    }
  }
  return '';
}

/**
 * Busca el número de presupuesto real (ej. "PRESUPUESTO : 26130"), cuya
 * posición de columna varía entre archivos (a veces en J/K/L, según el
 * ancho de las columnas de cada hoja) — a diferencia de Cliente/Fecha,
 * que siempre usan A y D. Se busca la celda con la etiqueta en
 * cualquier columna y se toma el primer valor no vacío que aparezca
 * después de ella en la misma fila (saltando los ":" sueltos).
 */
function buscarNumeroPresupuesto(filas) {
  for (const fila of filas) {
    const idxEtiqueta = fila.findIndex(celda => normalizar(celda).includes('presupuesto'));
    if (idxEtiqueta === -1) continue;
    for (let i = idxEtiqueta + 1; i < fila.length; i++) {
      const v = fila[i];
      if (v != null && normalizar(v) !== ':' && String(v).trim() !== '') return String(v).trim();
    }
  }
  return '';
}

/**
 * Extrae el bloque de firma que Jorge ya incluye al final de cada
 * presupuesto (nombre del firmante + dirección + correo + teléfono,
 * en columna B; "EL CLIENTE" en una columna a la derecha de la primera
 * línea). Se busca a partir de la fila "TOTAL": las primeras filas no
 * vacías de columna B después de esa fila componen el bloque.
 */
function extraerBloqueFirma(filas) {
  const idxTotal = filas.findIndex(fila => fila.some(celda => normalizar(celda) === 'total'));
  if (idxTotal === -1) return { lineasFirmante: [], etiquetaCliente: '' };

  const lineasFirmante = [];
  let etiquetaCliente = '';
  for (let i = idxTotal + 1; i < filas.length; i++) {
    const fila = filas[i];
    const colB = fila[1];
    if (colB != null && String(colB).trim() !== '') {
      lineasFirmante.push(String(colB).trim());
      if (!etiquetaCliente) {
        const restoFila = fila.find((celda, idx) => idx > 1 && celda != null && String(celda).trim() !== '');
        if (restoFila) etiquetaCliente = String(restoFila).trim();
      }
    } else if (lineasFirmante.length > 0) {
      break; // primera fila vacía tras haber empezado a capturar: fin del bloque
    }
  }
  return { lineasFirmante, etiquetaCliente };
}

/** Ubica el índice de fila (0-based, dentro de `filas`) que contiene los encabezados de la tabla de ítems, identificándola por la celda "ITEM" en cualquier columna. */
function buscarFilaEncabezados(filas) {
  for (let i = 0; i < filas.length; i++) {
    if (filas[i].some(celda => normalizar(celda) === 'item')) return i;
  }
  return -1;
}

/**
 * Valida y normaliza una fila cruda de la tabla de ítems (layout real:
 * B=código/zona, C=cantidad, D=ancho, E="x", F=alto, G=descripción,
 * K="S/", L=precio). Devuelve { item, error, esFilaIgnorable }:
 *   - esFilaIgnorable=true: la fila no tiene forma de ítem (sin ancho/
 *     alto/precio numéricos) y se ignora en silencio — son títulos de
 *     sección ("ESTRUCTURAS Y MAMPARAS DE CRISTAL") o líneas sueltas
 *     de condiciones comerciales que a veces caen dentro del rango.
 *   - item=null + error: la fila SÍ parece un ítem (tiene algunos
 *     datos) pero le falta algo imprescindible — se reporta para que
 *     el usuario lo revise, no se omite en silencio.
 */
function procesarFilaItem(fila, numeroFilaExcel) {
  const codigo = fila[1];     // B
  const cantidadRaw = fila[2]; // C
  const anchoRaw = fila[3];    // D
  const altoRaw = fila[5];     // F
  const descripcion = fila[6]; // G
  const precioRaw = fila[11];  // L

  const tieneAlgunDato = [codigo, cantidadRaw, anchoRaw, altoRaw, descripcion, precioRaw]
    .some(v => v !== null && v !== undefined && String(v).trim() !== '');
  if (!tieneAlgunDato) return { item: null, error: null, esFilaIgnorable: true };

  const ancho = Number(anchoRaw);
  const alto = Number(altoRaw);
  const cantidad = Number(cantidadRaw) || 1;
  const precio = Number(precioRaw);

  const anchoPresente = anchoRaw != null && String(anchoRaw).trim() !== '' && !isNaN(ancho) && ancho > 0;
  const altoPresente = altoRaw != null && String(altoRaw).trim() !== '' && !isNaN(alto) && alto > 0;
  const precioPresente = precioRaw != null && String(precioRaw).trim() !== '' && !isNaN(precio);

  // Fila sin medidas ni precio numérico: no es un ítem cotizable (título
  // de sección, nota suelta) — se ignora en silencio, no es un error.
  const pareceItem = anchoPresente || altoPresente || precioPresente;
  if (!pareceItem) return { item: null, error: null, esFilaIgnorable: true };

  const errores = [];
  // Las medidas son OPCIONALES como par: muchos ítems del presupuesto real
  // son servicios sin vano físico (desmontaje, acarreo, eliminación de
  // materiales, subida de cristales) — no tienen ancho×alto y eso es
  // válido, simplemente se listan sin dibujo técnico. Lo que SÍ es un
  // error de captura es tener solo una de las dos medidas (ej. ancho sin
  // alto), porque ahí sí se esperaba un vano y falta un dato.
  const tieneAmbasMedidas = anchoPresente && altoPresente;
  const tieneNingunaMedida = !anchoPresente && !altoPresente;
  if (!tieneAmbasMedidas && !tieneNingunaMedida) {
    if (!anchoPresente) errores.push('"Ancho" inválido o vacío (columna D) — falta junto a un "Alto" sí presente');
    if (!altoPresente) errores.push('"Alto" inválido o vacío (columna F) — falta junto a un "Ancho" sí presente');
  }
  if (!precioPresente) errores.push('"Precio" inválido o vacío (columna L)');

  if (errores.length > 0) {
    return { item: null, error: `Fila ${numeroFilaExcel}: ${errores.join(', ')}. Se omitió este ítem.`, esFilaIgnorable: false };
  }

  const tieneMedidas = tieneAmbasMedidas; // por el chequeo anterior, en este punto o están ambas o ninguna
  const descripcionTexto = descripcion ? String(descripcion).trim() : '';
  const tipoSolucion = tieneMedidas ? detectarProducto(descripcionTexto) : null; // sin medidas no hay vano que dibujar, aunque la descripción mencione "mampara"/"ventana"
  const panos = tipoSolucion ? construirPanosDesdeDescripcion(descripcionTexto, ancho) : null;

  const item = {
    codigo: codigo ? String(codigo).trim() : `Ítem fila ${numeroFilaExcel}`,
    tipoTexto: descripcionTexto || 'Sin descripción',
    tipoReconocido: !!tipoSolucion,
    tipoSolucion,
    panos,
    ancho: tieneMedidas ? ancho : null,
    alto: tieneMedidas ? alto : null,
    cantidad,
    colorAluminio: '', // no hay columna propia de color en este formato; el color queda implícito en la descripción
    descripcion: '', // el texto completo ya está en tipoTexto (no hay columna separada de "Tipo" corto vs. "Descripción" larga en este formato) — se deja vacío para que pdfGeneratorExcel.js no lo concatene y duplique el mismo texto
    precio,
  };
  return { item, error: null, esFilaIgnorable: false };
}

/**
 * Punto de entrada del módulo. Recibe un ArrayBuffer (contenido
 * crudo del archivo .xlsx leído con FileReader) y devuelve:
 *   { cliente, ruc, distrito, direccion, direccionObra, fecha,
 *     numeroPresupuesto, lineasFirmante, etiquetaCliente,
 *     itemsImportados, errores }
 * Lanza Error solo si el archivo no se puede leer en absoluto
 * (no es un .xlsx válido) o no tiene tabla de ítems reconocible —
 * errores de fila individual NO detienen la importación completa.
 */
export function importarPresupuestoExcel(arrayBuffer) {
  if (typeof XLSX === 'undefined') {
    throw new Error('No se pudo cargar el lector de Excel (SheetJS). Verifica tu conexión e intenta de nuevo.');
  }

  let workbook;
  try {
    workbook = XLSX.read(arrayBuffer, { type: 'array' });
  } catch (e) {
    throw new Error('El archivo no parece ser un Excel válido (.xlsx). Verifica el archivo e inténtalo de nuevo.');
  }

  const nombreHoja = workbook.SheetNames[0];
  const hoja = workbook.Sheets[nombreHoja];
  if (!hoja) {
    throw new Error('El archivo Excel no tiene ninguna hoja legible.');
  }

  const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: null });

  const cliente = buscarValorPorEtiqueta(filas, 'Cliente') || '—';
  const ruc = buscarValorPorEtiqueta(filas, 'RUC') || 'No registrado';
  const direccion = buscarValorPorEtiqueta(filas, 'Dirección') || '';
  const direccionObra = buscarValorPorEtiqueta(filas, 'Dirección Obra') || '';
  const distrito = direccionObra || direccion || '—';
  const fecha = buscarValorPorEtiqueta(filas, 'Fecha') || '';
  const numeroPresupuesto = buscarNumeroPresupuesto(filas);
  const { lineasFirmante, etiquetaCliente } = extraerBloqueFirma(filas);

  const idxEncabezados = buscarFilaEncabezados(filas);
  if (idxEncabezados === -1) {
    throw new Error('No se encontró la tabla de ítems: revisa que exista una fila de encabezados con "ITEM" (columna B), siguiendo el formato habitual del presupuesto.');
  }

  const itemsImportados = [];
  const errores = [];

  for (let i = idxEncabezados + 1; i < filas.length; i++) {
    const fila = filas[i];
    if (!fila) continue;
    const esFilaTotal = fila.some(celda => normalizar(celda) === 'total');
    if (esFilaTotal) break; // fin de la tabla de ítems

    const { item, error } = procesarFilaItem(fila, i + 1); // +1: número de fila Excel real (1-indexado), coincide con lo que vería el usuario al abrir el archivo
    if (error) errores.push(error);
    if (item) itemsImportados.push(item);
  }

  if (itemsImportados.length === 0 && errores.length === 0) {
    throw new Error('No se encontraron ítems en la tabla. Verifica que las filas debajo del encabezado tengan ancho, alto y precio.');
  }

  const itemsSinMedidas = itemsImportados.filter(it => it.ancho == null);
  const itemsConMedidasSinTipo = itemsImportados.filter(it => it.ancho != null && !it.tipoReconocido);
  if (itemsConMedidasSinTipo.length > 0) {
    errores.push(
      `${itemsConMedidasSinTipo.length} ítem(s) con medidas pero sin un tipo de producto reconocible en la descripción (se incluirán en el PDF sin dibujo técnico): ` +
      itemsConMedidasSinTipo.map(it => it.codigo).join(', ') + '.'
    );
  }
  if (itemsSinMedidas.length > 0) {
    errores.push(
      `${itemsSinMedidas.length} ítem(s) sin ancho/alto (servicios como desmontaje, acarreo o eliminación de materiales): ` +
      itemsSinMedidas.map(it => it.codigo).join(', ') + '. Se incluyen en el PDF con su precio, sin dibujo — esto es normal para este tipo de servicio.'
    );
  }

  return { cliente, ruc, distrito, direccion, direccionObra, fecha, numeroPresupuesto, lineasFirmante, etiquetaCliente, itemsImportados, errores };
}

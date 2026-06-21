// ============================================================
// ALECOM Proyectos — Cotizador interno (equipo comercial)
// Lógica de costos, utilidad, validación de formulario y WhatsApp
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  /* ========================================================
     CONFIGURACIÓN DE COSTOS BASADA EN "PRESUPUESTO 26000"
     ========================================================
     El archivo Excel "Presupuesto 26000" (ALECOM Proyectos)
     contiene 711 hojas: cada una es una cotización histórica real
     ya cerrada con el cliente (número de presupuesto, medidas,
     descripción del sistema y PRECIO FINAL de línea). NO contiene
     un desglose interno de costo base + materiales + mano de obra +
     margen, ni una fórmula de utilidad — cada hoja solo trae una
     suma (=SUM) de los precios finales de cada ítem del presupuesto.

     Por lo tanto, NO fue posible extraer "costo base" y "% de
     utilidad" directamente del Excel, porque esa información no
     está en el archivo. Lo que SÍ se extrajo, mediante análisis
     cuantitativo de las 711 hojas, fue el PRECIO DE VENTA REAL
     por m² que la empresa ha cobrado históricamente, segmentado
     por tipo de sistema (se filtraron líneas de mantenimiento/
     reparación, que no son sistemas nuevos completos):

       Categoría              n      P25      Mediana   P75
       Ventanas (alum/PVC)   1153   S/629     S/843     S/1,278
       Mamparas               512   S/441     S/591     S/750
       Puertas de vidrio      175   S/588     S/946     S/1,174
       Barandas                45   S/409     S/435     S/445
       Fachadas/muro cortina   44   S/284     S/411     S/1,259

     Estos precios de venta históricos (P25–P75) se usan abajo como
     punto de partida para el "costo base estimado" por m², asumiendo
     que ya incluyen materiales + mano de obra + transporte + margen
     histórico aplicado en cada cotización pasada. Esto es una
     APROXIMACIÓN, no el costo real de insumos.

     ⚠️ VALIDAR CON EL EQUIPO COMERCIAL:
     - Estos valores son precio de VENTA histórico, no costo de
       insumos puro. Si el equipo comercial tiene el costeo real
       (precio de vidrio por m², perfiles, mano de obra, etc.),
       debe reemplazar COSTO_BASE_M2 por esos valores y ajustar
       FACTOR_UTILIDAD_HISTORICA en consecuencia.
     - "Cerramiento de terraza" no tiene categoría propia en el
       Excel (se mezcla con mamparas/ventanas según el caso) —
       se usó el valor de mampara como referencia más cercana;
       debe validarse con el equipo comercial.
     - Los precios varían mucho por año (2022–2026) por inflación
       y tipo de cambio; estos valores mezclan los 5 años. Se
       recomienda recalibrar con cotizaciones recientes (2025-2026)
       cuando se tenga tiempo de hacer un análisis más fino.
     ======================================================== */

  // Precio de venta histórico real por m², usado como "costo base
  // estimado" de partida (incluye materiales + mano de obra +
  // transporte según el histórico de la empresa). [min, max] = P25–P75.
  const COSTO_BASE_M2 = {
    fachada:      { min: 284, max: 1259, nombre: 'Fachada de vidrio',         fuente: 'Excel: 44 registros históricos' },
    mampara:      { min: 441, max: 750,  nombre: 'Mampara de baño',          fuente: 'Excel: 512 registros históricos' },
    ventana:      { min: 629, max: 1278, nombre: 'Ventana de aluminio/PVC',  fuente: 'Excel: 1153 registros históricos' },
    baranda:      { min: 409, max: 445,  nombre: 'Baranda de vidrio',        fuente: 'Excel: 45 registros históricos' },
    puerta:       { min: 588, max: 1174, nombre: 'Puerta de vidrio',         fuente: 'Excel: 175 registros históricos' },
    muroCortina:  { min: 284, max: 1259, nombre: 'Muro cortina',             fuente: 'Excel: agrupado con fachada (misma familia constructiva); VALIDAR' },
    cerramiento:  { min: 441, max: 750,  nombre: 'Cerramiento de terraza',   fuente: 'Sin categoría propia en Excel; se usó mampara como referencia; VALIDAR' },
  };

  // Costo mínimo facturable por proyecto (S/), independiente del
  // área. Referencial — ajustar con el costo real de movilizar un
  // equipo de instalación + materiales mínimos.
  const COSTO_MINIMO_PROYECTO = 450;

  // Factor de instalación: % adicional sobre (costo base + material
  // + vidrio + accesorios) para cubrir mano de obra de instalación.
  // Referencial — el Excel no separa este costo, se estima en base
  // a práctica de mercado para vidrio/aluminio en Lima.
  const FACTOR_INSTALACION = 0.18; // 18%

  // Factor de urgencia: % adicional sobre el costo total por
  // prioridad de taller / cuadrilla. "Evaluación" lleva un pequeño
  // descuento referencial porque normalmente no tiene plazo fijo.
  const FACTOR_URGENCIA = {
    normal:     0,
    urgente:    0.15,
    evaluacion: -0.05,
  };

  // Rango de utilidad comercial permitido (%).
  const UTILIDAD_MINIMA = 35;
  const UTILIDAD_MAXIMA = 55;

  // Factores por tipo de vidrio (% adicional sobre costo base).
  const FACTOR_VIDRIO = {
    crudo:           0,
    templado:        0.15,
    laminado:        0.25,
    insulado:        0.40,
    templadoLaminado:0.45,
    acustico:        0.50,
    seguridad:       0.35,
    otroVidrio:      0.20,
  };

  // Factores por material del sistema / marco (% adicional sobre costo base).
  const FACTOR_MATERIAL = {
    noAplica:         0,
    aluminioNacional: 0.10,
    aluminioEuropeo:  0.25,
    aluminioPremium:  0.35,
    pvc:              0.20,
    aceroInoxidable:  0.30,
    fierro:           0.18,
    madera:           0.25,
    otroMaterial:     0.15,
  };

  // Servicios donde el material del sistema/marco es OBLIGATORIO.
  const MATERIAL_OBLIGATORIO_EN = ['ventana', 'fachada', 'cerramiento', 'muroCortina'];

  // Factores por accesorio/prestación técnica (% adicional sobre costo base).
  // Son acumulativos: se suman todos los que estén seleccionados.
  const FACTOR_ACCESORIOS = {
    ninguno:            0,
    herrajeEstandar:    0.05,
    herrajePremium:     0.15,
    sistemaCorredizo:   0.10,
    sistemaBatiente:    0.08,
    sistemaPivotante:   0.12,
    sistemaPlegable:    0.18,
    cierreHermetico:    0.10,
    controlSolar:       0.12,
    proteccionUV:       0.08,
    aislamientoTermico: 0.15,
    acusticoBasico:     0.12,
    acusticoMedio:      0.22,
    acusticoAlto:       0.35,
    peliculaSeguridad:  0.10,
    selladoEstructural: 0.18,
    instalacionAltura:  0.20,
    desmontaje:         0.12,
    transporteEspecial: 0.10,
  };

  // Área mínima facturable por unidad, en m².
  const AREA_MINIMA_POR_UNIDAD = 1;

  // Número de WhatsApp del equipo comercial (formato internacional, sin "+" ni espacios).
  const WHATSAPP_NUMERO = '51957441379';

  /* ========================================================
     REFERENCIAS AL DOM
     ======================================================== */

  const form = document.getElementById('calcForm');
  const formAlert = document.getElementById('formAlert');
  const formWarning = document.getElementById('formWarning');
  const btnLimpiar = document.getElementById('btnLimpiar');

  const resultEmpty = document.getElementById('resultEmpty');
  const resultContent = document.getElementById('resultContent');
  const resultTipo = document.getElementById('resultTipo');
  const resultArea = document.getElementById('resultArea');
  const resultDistrito = document.getElementById('resultDistrito');
  const resultPrecioFinal = document.getElementById('resultPrecioFinal');
  const resultRecoBox = document.getElementById('resultRecoBox');
  const resultReco = document.getElementById('resultReco');
  const btnWhatsapp = document.getElementById('btnWhatsapp');

  const bdCostoBase = document.getElementById('bdCostoBase');
  const bdMaterial = document.getElementById('bdMaterial');
  const bdVidrio = document.getElementById('bdVidrio');
  const bdAccesorios = document.getElementById('bdAccesorios');
  const bdInstalacion = document.getElementById('bdInstalacion');
  const bdCostoTotal = document.getElementById('bdCostoTotal');
  const bdUtilidadPct = document.getElementById('bdUtilidadPct');
  const bdUtilidadMonto = document.getElementById('bdUtilidadMonto');

  const campos = {
    nombreCliente: document.getElementById('nombreCliente'),
    rucCliente: document.getElementById('rucCliente'),
    tipoCliente: document.getElementById('tipoCliente'),
    tipoSolucion: document.getElementById('tipoSolucion'),
    ancho: document.getElementById('ancho'),
    alto: document.getElementById('alto'),
    cantidad: document.getElementById('cantidad'),
    tipoVidrio: document.getElementById('tipoVidrio'),
    materialSistema: document.getElementById('materialSistema'),
    colorAluminio: document.getElementById('colorAluminio'),
    utilidad: document.getElementById('utilidad'),
    distrito: document.getElementById('distrito'),
    urgencia: document.getElementById('urgencia'),
    tienePlanos: document.getElementById('tienePlanos'),
  };

  const accesoriosCheckboxes = Array.from(document.querySelectorAll('input[name="accesorios"]'));
  const accNinguno = document.getElementById('accNinguno');
  const hintMaterial = document.getElementById('hintMaterial');
  const btnGenerarPdf = document.getElementById('btnGenerarPdf');

  // Guarda el resultado del último cálculo válido, para que el botón
  // "Generar PDF" no tenga que recalcular ni depender del submit.
  let ultimoCalculo = null;

  /* ========================================================
     UTILIDADES
     ======================================================== */

  function formatearSoles(numero){
    return 'S/ ' + Math.round(numero).toLocaleString('es-PE');
  }

  function mostrarAlerta(mensaje, camposInvalidos = []){
    formAlert.textContent = mensaje;
    formAlert.classList.add('is-visible');

    Object.values(campos).forEach(c => c && c.classList.remove('is-invalid'));
    camposInvalidos.forEach(c => c && c.classList.add('is-invalid'));

    formAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function ocultarAlerta(){
    formAlert.classList.remove('is-visible');
    formAlert.textContent = '';
  }

  function mostrarAviso(mensaje){
    formWarning.textContent = mensaje;
    formWarning.classList.add('is-visible');
  }

  function ocultarAviso(){
    formWarning.classList.remove('is-visible');
    formWarning.textContent = '';
  }

  /* ========================================================
     LÓGICA: "SIN ACCESORIOS ESPECIALES" ES MUTUAMENTE
     EXCLUSIVO CON CUALQUIER OTRO ACCESORIO
     ======================================================== */

  accesoriosCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb === accNinguno && cb.checked) {
        accesoriosCheckboxes.forEach(otro => {
          if (otro !== accNinguno) otro.checked = false;
        });
      } else if (cb !== accNinguno && cb.checked) {
        accNinguno.checked = false;
      }
    });
  });

  /* ========================================================
     LÓGICA: MATERIAL DEL SISTEMA OBLIGATORIO SEGÚN SERVICIO
     ======================================================== */

  function actualizarObligatoriedadMaterial(){
    const tipo = campos.tipoSolucion.value;
    const esObligatorio = MATERIAL_OBLIGATORIO_EN.includes(tipo);
    campos.materialSistema.required = esObligatorio;
    document.getElementById('reqMaterial').style.display = esObligatorio ? 'inline' : 'none';
    hintMaterial.textContent = esObligatorio
      ? 'Obligatorio para este tipo de solución.'
      : 'Opcional para mamparas, barandas y puertas — depende del diseño.';
  }
  campos.tipoSolucion.addEventListener('change', actualizarObligatoriedadMaterial);
  actualizarObligatoriedadMaterial();

  /* ========================================================
     VALIDACIÓN DE CAMPOS OBLIGATORIOS
     ======================================================== */

  function validarFormulario(){
    const invalidos = [];

    if (!campos.nombreCliente.value.trim()) invalidos.push(campos.nombreCliente);
    if (!campos.tipoSolucion.value) invalidos.push(campos.tipoSolucion);
    if (!campos.ancho.value || Number(campos.ancho.value) <= 0) invalidos.push(campos.ancho);
    if (!campos.alto.value || Number(campos.alto.value) <= 0) invalidos.push(campos.alto);
    if (!campos.cantidad.value || Number(campos.cantidad.value) < 1) invalidos.push(campos.cantidad);
    if (!campos.tipoVidrio.value) invalidos.push(campos.tipoVidrio);
    if (campos.materialSistema.required && !campos.materialSistema.value) invalidos.push(campos.materialSistema);
    if (!campos.utilidad.value) invalidos.push(campos.utilidad);
    if (!campos.distrito.value.trim()) invalidos.push(campos.distrito);
    if (!campos.urgencia.value) invalidos.push(campos.urgencia);
    if (!campos.tienePlanos.value) invalidos.push(campos.tienePlanos);

    if (invalidos.length > 0){
      mostrarAlerta(
        'Por favor completa los campos resaltados antes de calcular el presupuesto.',
        invalidos
      );
      return false;
    }

    // Regla: % de utilidad mínimo recomendado 35%.
    const utilidad = Number(campos.utilidad.value);
    if (utilidad < UTILIDAD_MINIMA){
      mostrarAlerta(`La utilidad mínima recomendada es ${UTILIDAD_MINIMA}%.`, [campos.utilidad]);
      return false;
    }

    ocultarAlerta();

    // Aviso (no bloqueante): utilidad por encima del máximo recomendado.
    if (utilidad > UTILIDAD_MAXIMA){
      mostrarAviso('Verificar si el precio final sigue siendo competitivo.');
    } else {
      ocultarAviso();
    }

    return true;
  }

  /* ========================================================
     CÁLCULO DEL PRESUPUESTO
     ======================================================== */

  function obtenerAccesoriosSeleccionados(){
    return accesoriosCheckboxes
      .filter(cb => cb.checked && cb.value !== 'ninguno')
      .map(cb => cb.value);
  }

  function calcularPresupuesto(){
    const tipoSolucion = campos.tipoSolucion.value;
    const ancho = Number(campos.ancho.value);
    const alto = Number(campos.alto.value);
    const cantidad = Number(campos.cantidad.value);
    const tipoVidrio = campos.tipoVidrio.value;
    const materialSistema = campos.materialSistema.value || 'noAplica';
    const utilidadPct = Number(campos.utilidad.value);
    const urgencia = campos.urgencia.value;
    const accesoriosSeleccionados = obtenerAccesoriosSeleccionados();

    // Área por unidad, con mínimo facturable de 1 m².
    const areaPorUnidad = Math.max(ancho * alto, AREA_MINIMA_POR_UNIDAD);
    const areaTotal = areaPorUnidad * cantidad;

    // --- Costo base (precio de venta histórico real, ver config arriba) ---
    const refBase = COSTO_BASE_M2[tipoSolucion];
    const precioBaseM2Promedio = (refBase.min + refBase.max) / 2;
    let costoBase = precioBaseM2Promedio * areaTotal;
    costoBase = Math.max(costoBase, COSTO_MINIMO_PROYECTO);

    // --- Adicionales por especificación técnica (% sobre costo base) ---
    const factorVidrio = FACTOR_VIDRIO[tipoVidrio] ?? 0;
    const factorMaterial = FACTOR_MATERIAL[materialSistema] ?? 0;
    const factorAccesorios = accesoriosSeleccionados.reduce(
      (acc, key) => acc + (FACTOR_ACCESORIOS[key] ?? 0), 0
    );

    const adicionalVidrio = costoBase * factorVidrio;
    const adicionalMaterial = costoBase * factorMaterial;
    const adicionalAccesorios = costoBase * factorAccesorios;

    // Subtotal antes de instalación y urgencia.
    const subtotalTecnico = costoBase + adicionalVidrio + adicionalMaterial + adicionalAccesorios;

    // --- Costo de instalación ---
    const costoInstalacion = subtotalTecnico * FACTOR_INSTALACION;

    // --- Ajuste por urgencia (aplicado sobre el costo total) ---
    const factorUrgencia = FACTOR_URGENCIA[urgencia] ?? 0;
    const costoTotalAntesUtilidad = (subtotalTecnico + costoInstalacion) * (1 + factorUrgencia);

    // --- Utilidad comercial ---
    const montoUtilidad = costoTotalAntesUtilidad * (utilidadPct / 100);
    const precioFinal = costoTotalAntesUtilidad + montoUtilidad;

    return {
      tipoSolucion,
      nombreSolucion: refBase.nombre,
      tipoCliente: campos.tipoCliente ? campos.tipoCliente.value : 'residencial',
      ancho, alto, cantidad,
      areaPorUnidad, areaTotal,
      costoBase,
      adicionalVidrio, adicionalMaterial, adicionalAccesorios,
      costoInstalacion,
      costoTotalAntesUtilidad,
      utilidadPct,
      montoUtilidad,
      precioFinal,
      accesoriosSeleccionados,
      materialSistema,
    };
  }

  /* ========================================================
     RECOMENDACIONES TÉCNICAS POR COMBINACIÓN
     ======================================================== */

  function generarRecomendacionBase(datos){
    const { tipoSolucion, materialSistema, tipoVidrio: _tv } = datos;
    const tipoVidrio = campos.tipoVidrio.value;
    const accesorios = datos.accesoriosSeleccionados;

    // Combinaciones específicas solicitadas, evaluadas en orden de especificidad.
    if (tipoSolucion === 'ventana' && materialSistema === 'aluminioEuropeo' && tipoVidrio === 'acustico') {
      return 'Recomendación: solución adecuada para aislamiento acústico en zonas urbanas de alto tránsito.';
    }
    if (tipoSolucion === 'mampara' && tipoVidrio === 'templado' && accesorios.includes('herrajePremium')) {
      return 'Recomendación: solución ideal para baños modernos con acabado premium.';
    }
    if (tipoSolucion === 'fachada' && tipoVidrio === 'insulado' && accesorios.includes('controlSolar')) {
      return 'Recomendación: solución eficiente para control térmico y reducción de radiación.';
    }
    if (tipoSolucion === 'baranda' && tipoVidrio === 'templadoLaminado') {
      return 'Recomendación: solución recomendada por seguridad y resistencia.';
    }
    if (tipoSolucion === 'muroCortina' && materialSistema === 'aluminioPremium' && accesorios.includes('selladoEstructural')) {
      return 'Recomendación: validar cálculo estructural y especificaciones técnicas del proyecto.';
    }

    // Recomendaciones genéricas de respaldo por tipo de solución.
    const generica = {
      fachada: 'Para fachadas, el espesor de cristal y el anclaje a la estructura del edificio deben definirse con un plano de obra. Se recomienda visita técnica antes de cerrar especificaciones.',
      mampara: 'En mamparas de baño, el cristal templado de 8mm es el estándar más usado. Un acabado frameless puede ubicar el costo final en el extremo superior del rango.',
      ventana: 'Para ventanas, el sistema y color de aluminio influyen directamente en el aislamiento térmico y acústico. En zonas costeras o de viento fuerte, considerar sistema europeo.',
      baranda: 'Las barandas de vidrio con uso estructural requieren cristal templado de 10mm o 12mm como mínimo, según norma de seguridad en altura vigente.',
      puerta: 'En puertas, evaluar si el acceso requiere apertura corrediza o pivotante — cambia el tipo de herraje y puede afectar el presupuesto final.',
      muroCortina: 'Los muros cortina son sistemas estructurales que requieren cálculo de carga de viento y anclaje a la edificación. Es indispensable revisión de planos antes de cotizar en firme.',
      cerramiento: 'Para cerramientos de terraza, el sistema corredizo o plegable es el más usado para maximizar la apertura hacia el exterior. El ancho libre por hoja es clave.',
    };
    return generica[tipoSolucion] || 'Validar medidas finales con visita técnica antes de confirmar el presupuesto.';
  }

  // Frase adicional para clientes profesionales (arquitecto, diseñador,
  // constructora) — se añade al final de la recomendación técnica sin
  // alterar la lógica de negocio existente por combinación.
  const CIERRE_PROFESIONAL = {
    arquitecto: ' Quedamos a disposición de tu estudio para coordinar planos y detalles constructivos antes de la visita técnica.',
    'diseñador': ' Podemos coordinar directamente contigo los acabados y especificaciones para mantener la coherencia del proyecto.',
    constructora: ' Quedamos disponibles para coordinar cronograma de obra y condiciones de instalación con tu equipo técnico.',
  };

  function generarRecomendacion(datos){
    const base = generarRecomendacionBase(datos);
    const cierre = CIERRE_PROFESIONAL[datos.tipoCliente];
    return cierre ? base + cierre : base;
  }

  /* ========================================================
     RENDERIZADO DEL RESULTADO EN PANTALLA
     ======================================================== */

  function mostrarResultado(datos){
    resultEmpty.hidden = true;
    resultContent.hidden = false;

    resultTipo.textContent = datos.nombreSolucion;
    resultArea.textContent = `${datos.areaTotal.toFixed(2)} m²`;
    resultDistrito.textContent = campos.distrito.value.trim();

    bdCostoBase.textContent = formatearSoles(datos.costoBase);
    bdMaterial.textContent = formatearSoles(datos.adicionalMaterial);
    bdVidrio.textContent = formatearSoles(datos.adicionalVidrio);
    bdAccesorios.textContent = formatearSoles(datos.adicionalAccesorios);
    bdInstalacion.textContent = formatearSoles(datos.costoInstalacion);
    bdCostoTotal.textContent = formatearSoles(datos.costoTotalAntesUtilidad);
    bdUtilidadPct.textContent = `${datos.utilidadPct}%`;
    bdUtilidadMonto.textContent = formatearSoles(datos.montoUtilidad);

    resultPrecioFinal.textContent = formatearSoles(datos.precioFinal);

    const reco = generarRecomendacion(datos);
    if (reco) {
      resultReco.textContent = reco;
      resultRecoBox.hidden = false;
    } else {
      resultRecoBox.hidden = true;
    }

    actualizarEnlaceWhatsapp(datos);

    resultContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ========================================================
     TEXTOS LEGIBLES PARA WHATSAPP
     ======================================================== */

  const TEXTO_VIDRIO = {
    crudo: 'Vidrio crudo', templado: 'Vidrio templado', laminado: 'Vidrio laminado',
    insulado: 'Vidrio insulado (DVH)', templadoLaminado: 'Vidrio templado laminado',
    acustico: 'Vidrio acústico', seguridad: 'Vidrio de seguridad', otroVidrio: 'Otro',
  };

  const TEXTO_MATERIAL = {
    noAplica: 'No aplica', aluminioNacional: 'Aluminio nacional', aluminioEuropeo: 'Aluminio europeo',
    aluminioPremium: 'Aluminio premium', pvc: 'PVC', aceroInoxidable: 'Acero inoxidable',
    fierro: 'Fierro / estructura metálica', madera: 'Madera', otroMaterial: 'Otro',
  };

  const TEXTO_ACCESORIOS = {
    herrajeEstandar: 'Herrajes estándar', herrajePremium: 'Herrajes premium',
    sistemaCorredizo: 'Sistema corredizo', sistemaBatiente: 'Sistema batiente',
    sistemaPivotante: 'Sistema pivotante', sistemaPlegable: 'Sistema plegable',
    cierreHermetico: 'Cierre hermético', controlSolar: 'Control solar',
    proteccionUV: 'Protección UV', aislamientoTermico: 'Aislamiento térmico',
    acusticoBasico: 'Aislamiento acústico básico', acusticoMedio: 'Aislamiento acústico medio',
    acusticoAlto: 'Aislamiento acústico alto', peliculaSeguridad: 'Película de seguridad',
    selladoEstructural: 'Sellado estructural', instalacionAltura: 'Instalación en altura',
    desmontaje: 'Desmontaje de estructura existente', transporteEspecial: 'Transporte especial',
  };

  /* ========================================================
     MENSAJE PRECARGADO DE WHATSAPP (uso interno/comercial)
     ======================================================== */

  function actualizarEnlaceWhatsapp(datos){
    const cliente = campos.nombreCliente.value.trim();
    const distrito = campos.distrito.value.trim();
    const tipoVidrioTexto = TEXTO_VIDRIO[campos.tipoVidrio.value] || '—';
    const materialTexto = TEXTO_MATERIAL[datos.materialSistema] || '—';
    const accesoriosTexto = datos.accesoriosSeleccionados.length
      ? datos.accesoriosSeleccionados.map(a => TEXTO_ACCESORIOS[a] || a).join(', ')
      : 'Sin accesorios especiales';

    const mensaje =
`Hola, necesito validar una propuesta preliminar para ${cliente}.

*Proyecto:* ${datos.nombreSolucion}
*Medidas:* ${datos.ancho} x ${datos.alto} m, cantidad ${datos.cantidad}
*Área estimada:* ${datos.areaTotal.toFixed(2)} m²
*Distrito:* ${distrito}
*Vidrio:* ${tipoVidrioTexto}
*Sistema/marco:* ${materialTexto}
*Accesorios:* ${accesoriosTexto}
*Utilidad aplicada:* ${datos.utilidadPct}%
*Precio final sugerido:* ${formatearSoles(datos.precioFinal)}

Solicito validación técnica para confirmar cotización.`;

    const url = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
    btnWhatsapp.setAttribute('href', url);
  }

  /* ========================================================
     DATOS DE LA EMPRESA (para el encabezado del PDF)
     ======================================================== */
  const EMPRESA = {
    nombre: 'ALECOM Proyectos',
    eslogan: 'Soluciones Arquitectónicas en Vidrio y Aluminio',
    correo: 'alecomproyectos@gmail.com',
    whatsapp: '+51 957 441 379',
    web: 'alecomproyectos.github.io',
    instagram: '@alecomproyectos',
    ciudad: 'Lima, Perú',
  };

  /* ========================================================
     BIBLIOTECA DE RENDERS / IMÁGENES REPRESENTATIVAS
     ------------------------------------------------------------
     ⚠️ IMPORTANTE — alcance real de esta función:
     No se generan renders 3D fotorrealistas variables según la
     combinación exacta de vidrio + marco + color + accesorios
     (eso requiere un motor de render o un servicio de generación
     de imágenes, que no está disponible en este entorno).
     En su lugar, cada tipo de solución tiene UNA imagen
     representativa de alta calidad (foto real, no renderizada),
     seleccionada automáticamente según el tipo de solución
     elegido en el formulario. Si en el futuro el equipo comercial
     cuenta con fotos propias de proyectos terminados por
     categoría, deben reemplazar estas URLs por las propias
     (lo ideal es usar fotos reales de obra de ALECOM).
     Fuente actual: fotografías con licencia Unsplash (uso
     comercial libre, sin atribución requerida) + 1 foto real de
     ALECOM para fachada. Las 7 categorías tienen ahora una imagen
     propia y distinta entre sí (antes, puerta y cerramiento
     reutilizaban por error la foto de fachada). Todas verificadas
     con licencia gratuita antes de su uso.
     ======================================================== */
  const RENDERS_POR_SOLUCION = {
    fachada:     { url: 'img/proyectos/proyecto-04.jpg', credito: 'Obra ejecutada por ALECOM Proyectos' },
    muroCortina: { url: 'https://images.unsplash.com/photo-1745015446589-7ee6f702d8c1?w=1400&q=80', credito: 'Imagen referencial — Fabian Kleiser / Unsplash' },
    ventana:     { url: 'https://images.unsplash.com/photo-1758565811176-ccd94357a844?w=1400&q=80', credito: 'Imagen referencial — Caroline Badran / Unsplash' },
    mampara:     { url: 'https://images.unsplash.com/photo-1723257891127-0d1ea314a720?w=1400&q=80', credito: 'Imagen referencial — Alex Tyson / Unsplash' },
    baranda:     { url: 'https://images.unsplash.com/photo-1771904488645-fa6ebf7a2d06?w=1400&q=80', credito: 'Imagen referencial — Wesley Shen / Unsplash' },
    puerta:      { url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1400&q=80', credito: 'Imagen referencial — Nastuh Abootalebi / Unsplash' },
    cerramiento: { url: 'https://images.unsplash.com/photo-1758216862102-04782596be32?w=1400&q=80', credito: 'Imagen referencial — Artur Piterov / Unsplash' },
  };

  // Cache en memoria de imágenes ya convertidas a dataURL, para no
  // volver a descargarlas si el comercial genera varios PDFs seguidos.
  const cacheImagenesPdf = {};

  /**
   * Descarga (o toma de cache) la imagen representativa de una
   * categoría y la devuelve como dataURL base64, lista para
   * doc.addImage(). Si falla la descarga (sin internet, imagen
   * caída, etc.), devuelve null y el PDF se genera sin imagen
   * en vez de romperse.
   */
  async function obtenerImagenRenderComoDataUrl(tipoSolucion){
    if (cacheImagenesPdf[tipoSolucion]) return cacheImagenesPdf[tipoSolucion];

    const config = RENDERS_POR_SOLUCION[tipoSolucion] || RENDERS_POR_SOLUCION.fachada;
    try {
      const respuesta = await fetch(config.url);
      const blob = await respuesta.blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(lector.result);
        lector.onerror = reject;
        lector.readAsDataURL(blob);
      });
      cacheImagenesPdf[tipoSolucion] = { dataUrl, credito: config.credito };
      return cacheImagenesPdf[tipoSolucion];
    } catch (err){
      console.warn('No se pudo cargar la imagen representativa para el PDF:', err);
      return null;
    }
  }

  // Textos descriptivos por tipo de solución, usados para redactar el
  // alcance del servicio en el PDF como párrafo (no como tabla técnica).
  const DESCRIPCION_SERVICIO = {
    fachada: 'Suministro e instalación de fachada de vidrio con sistema de aluminio, según las medidas y especificaciones del proyecto.',
    mampara: 'Suministro e instalación de mampara de baño en vidrio templado, con acabados y herrajes acordes al diseño del ambiente.',
    ventana: 'Suministro e instalación de ventana(s) en aluminio o PVC, con cristal y sistema de apertura según especificación.',
    baranda: 'Suministro e instalación de baranda de vidrio con pasamanos, cumpliendo criterios de seguridad para uso en altura.',
    puerta: 'Suministro e instalación de puerta de vidrio con marco y herrajes según el tipo de apertura requerido.',
    muroCortina: 'Suministro e instalación de muro cortina en sistema de aluminio y vidrio, según diseño y cálculo estructural del proyecto.',
    cerramiento: 'Suministro e instalación de cerramiento de terraza con sistema corredizo o plegable, según el diseño del ambiente.',
  };

  /* ========================================================
     GENERACIÓN DE PDF PARA EL CLIENTE
     ------------------------------------------------------------
     Este PDF se construye como una plantilla HTML/CSS real
     (no con las primitivas de dibujo de jsPDF), se renderiza
     off-screen, se captura con html2canvas y se inserta como
     imagen en un documento jsPDF de tamaño A4. Esto permite un
     layout de grilla (2 columnas arriba, 3 columnas abajo) fiel
     al diseño de propuesta comercial premium solicitado.

     Esta versión SÍ incluye el desglose de costos (costo base,
     materiales/sistema, accesorios, instalación, subtotal,
     % utilidad, monto de utilidad) dentro del propio PDF, en la
     columna "DESGLOSE DE COSTOS" — a diferencia de la versión
     anterior de este documento. Si en el futuro se requiere
     volver a un PDF sin desglose de costos (solo precio final)
     para evitar mostrarlo al cliente, comentar/quitar el bloque
     "columnaCostos" de construirHtmlPdf() y dejar solo el total.
     ======================================================== */

  // Paleta de colores exacta pedida para el PDF (independiente de
  // la paleta del sitio/cotizador en pantalla, que no se modifica).
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

  // Iconos lineales (SVG inline, trazo simple) para cada ítem del
  // resumen lateral y para el bloque de recomendación.
  const PDF_ICONOS = {
    solucion: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/></svg>',
    sistema: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M9 21V9"/></svg>',
    vidrio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 3h14l1 5-8 13L4 8z"/><path d="M5 3l7 5 7-5M4 8h16"/></svg>',
    color: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/></svg>',
    accesorios: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    area: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M8 3v4M16 3v4M3 11h18"/></svg>',
    distrito: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.4"/></svg>',
    urgencia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
    planos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg>',
    escudo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5z"/><path d="M9 12l2 2 4-4"/></svg>',
  };

  /**
   * Construye el HTML completo de la propuesta (string), siguiendo
   * el layout: encabezado de 2 bloques, sección principal de 2
   * columnas (render 68% / resumen 32%), sección inferior de 3
   * columnas (costos / especificaciones / recomendación), y pie
   * de página de 3 bloques. Todo el CSS va embebido inline en el
   * propio HTML para que html2canvas lo capture sin depender de
   * hojas de estilo externas.
   */
  function construirHtmlPdf(datos, imagenDataUrl, numeroPropuesta, fechaTexto){
    const cliente = campos.nombreCliente.value.trim() || '—';
    const ruc = campos.rucCliente.value.trim() || 'No registrado';
    const distrito = campos.distrito.value.trim() || '—';
    const tipoVidrioTexto = TEXTO_VIDRIO[campos.tipoVidrio.value] || '—';
    const materialTexto = TEXTO_MATERIAL[datos.materialSistema] || '—';
    const colorAluminioTexto = {
      natural: 'Natural', negro: 'Negro', blanco: 'Blanco', champagne: 'Champagne', madera: 'Acabado madera',
    }[campos.colorAluminio.value] || '—';
    const urgenciaTexto = {
      normal: 'Normal', urgente: 'Urgente', evaluacion: 'Proyecto en evaluación',
    }[campos.urgencia.value] || '—';
    const tienePlanosTexto = campos.tienePlanos.value === 'si' ? 'Sí' : 'No';
    const accesoriosTexto = datos.accesoriosSeleccionados.length
      ? datos.accesoriosSeleccionados.map(a => TEXTO_ACCESORIOS[a] || a).join(', ')
      : 'Sin accesorios especiales';

    const recomendacion = (generarRecomendacion(datos) || '').replace(/^Recomendación:\s*/i, '');

    const filaResumen = (icono, etiqueta, valor) => `
      <div class="r-item">
        <span class="r-ico">${PDF_ICONOS[icono]}</span>
        <span class="r-txt">
          <span class="r-lbl">${etiqueta}</span>
          <span class="r-val">${valor}</span>
        </span>
      </div>`;

    const filaCosto = (etiqueta, monto, esTotal) => `
      <div class="c-row${esTotal ? ' c-row-total' : ''}">
        <span>${etiqueta}</span>
        <span>${monto}</span>
      </div>`;

    return `
      <div id="pdfRoot" style="width:794px;background:${PDF_COLOR.blanco};font-family:'Inter',system-ui,sans-serif;color:${PDF_COLOR.negroCarbon};">

        <style>
          #pdfRoot *{ box-sizing:border-box; margin:0; padding:0; }
          #pdfRoot .head{ background:${PDF_COLOR.azulMarino}; padding:22px 36px; display:flex; align-items:center; justify-content:space-between; min-height:92px; }
          #pdfRoot .head-left{ display:flex; flex-direction:column; gap:4px; }
          #pdfRoot .head-logo{ color:${PDF_COLOR.blanco}; font-size:21px; font-weight:800; letter-spacing:0.02em; }
          #pdfRoot .head-eslogan{ color:#AEB7BD; font-size:10.5px; font-weight:500; letter-spacing:0.01em; }
          #pdfRoot .head-right{ text-align:right; display:flex; flex-direction:column; gap:4px; }
          #pdfRoot .head-title{ color:${PDF_COLOR.naranjaCobre}; font-size:15px; font-weight:800; letter-spacing:0.06em; }
          #pdfRoot .head-meta{ color:${PDF_COLOR.blanco}; font-size:10px; opacity:0.85; }

          #pdfRoot .main{ display:flex; padding:28px 36px 10px; gap:24px; }
          #pdfRoot .col-render{ width:68%; }
          #pdfRoot .render-img{ width:100%; height:380px; object-fit:cover; border-radius:6px; display:block; }
          #pdfRoot .render-note{ color:${PDF_COLOR.grisMedio}; font-size:9.5px; margin-top:8px; line-height:1.4; }

          #pdfRoot .col-resumen{ width:32%; }
          #pdfRoot .r-title{ color:${PDF_COLOR.negroCarbon}; font-size:12.5px; font-weight:800; letter-spacing:0.04em; padding-bottom:8px; border-bottom:2px solid ${PDF_COLOR.naranjaCobre}; margin-bottom:14px; }
          #pdfRoot .r-item{ display:flex; align-items:flex-start; gap:10px; margin-bottom:13px; }
          #pdfRoot .r-ico{ width:17px; height:17px; flex-shrink:0; color:${PDF_COLOR.naranjaCobre}; margin-top:1px; }
          #pdfRoot .r-ico svg{ width:100%; height:100%; }
          #pdfRoot .r-txt{ display:flex; flex-direction:column; gap:2px; min-width:0; }
          #pdfRoot .r-lbl{ font-size:8.3px; text-transform:uppercase; letter-spacing:0.04em; color:${PDF_COLOR.grisMedio}; font-weight:600; }
          #pdfRoot .r-val{ font-size:11px; color:${PDF_COLOR.negroCarbon}; font-weight:700; line-height:1.35; word-break:break-word; }

          #pdfRoot .lower{ display:flex; padding:18px 36px 0; gap:0; margin-top:6px; }
          #pdfRoot .lower-col{ flex:1; padding:18px 20px; }
          #pdfRoot .lower-col + .lower-col{ border-left:1px solid ${PDF_COLOR.grisClaro}; }
          #pdfRoot .lower-title{ font-size:10.5px; font-weight:800; letter-spacing:0.05em; color:${PDF_COLOR.negroCarbon}; margin-bottom:6px; }
          #pdfRoot .lower-rule{ height:1px; background:${PDF_COLOR.grisClaro}; margin-bottom:12px; }

          #pdfRoot .c-row{ display:flex; justify-content:space-between; gap:8px; font-size:9.5px; color:${PDF_COLOR.grisOscuro}; padding:5px 0; }
          #pdfRoot .c-row span:last-child{ font-weight:700; color:${PDF_COLOR.negroCarbon}; white-space:nowrap; }
          #pdfRoot .c-row-total{ border-top:1px solid ${PDF_COLOR.grisClaro}; margin-top:4px; padding-top:8px; }
          #pdfRoot .c-row-total span{ color:${PDF_COLOR.negroCarbon} !important; font-weight:800 !important; }
          #pdfRoot .precio-final-box{ background:${PDF_COLOR.azulMarino2}; color:${PDF_COLOR.blanco}; border-radius:6px; padding:12px 14px; margin-top:12px; }
          #pdfRoot .precio-final-lbl{ font-size:8px; text-transform:uppercase; letter-spacing:0.05em; opacity:0.75; margin-bottom:4px; }
          #pdfRoot .precio-final-val{ font-size:16.5px; font-weight:800; color:${PDF_COLOR.naranjaCobre}; }

          #pdfRoot .esp-list{ list-style:none; display:flex; flex-direction:column; gap:9px; }
          #pdfRoot .esp-list li{ font-size:9.5px; color:${PDF_COLOR.grisOscuro}; line-height:1.45; padding-left:13px; position:relative; }
          #pdfRoot .esp-list li::before{ content:'•'; color:${PDF_COLOR.naranjaCobre}; position:absolute; left:0; font-size:13px; line-height:1; top:-1px; }
          #pdfRoot .esp-list b{ color:${PDF_COLOR.negroCarbon}; }

          #pdfRoot .reco-text{ font-size:9.8px; color:${PDF_COLOR.grisOscuro}; line-height:1.55; margin-bottom:14px; }
          #pdfRoot .reco-ico{ width:22px; height:22px; color:${PDF_COLOR.naranjaCobre}; margin-left:auto; opacity:0.85; }
          #pdfRoot .reco-ico svg{ width:100%; height:100%; }

          #pdfRoot .nota-legal{ margin:14px 36px 0; padding:10px 14px; background:${PDF_COLOR.fondoSuave}; border-radius:5px; font-size:8.3px; color:${PDF_COLOR.grisMedio}; line-height:1.4; }

          #pdfRoot .foot{ background:${PDF_COLOR.azulMarino}; margin-top:18px; padding:16px 36px; display:flex; justify-content:space-between; gap:16px; min-height:58px; align-items:center; }
          #pdfRoot .foot-block{ color:${PDF_COLOR.blanco}; font-size:8.5px; line-height:1.5; }
          #pdfRoot .foot-block b{ display:block; font-size:9.5px; margin-bottom:2px; }
          #pdfRoot .foot-block.right{ text-align:right; }
        </style>

        <!-- ===== ENCABEZADO ===== -->
        <div class="head">
          <div class="head-left">
            <span class="head-logo">ALECOM PROYECTOS</span>
            <span class="head-eslogan">${EMPRESA.eslogan}</span>
          </div>
          <div class="head-right">
            <span class="head-title">PROPUESTA PRELIMINAR</span>
            <span class="head-meta">N° ${numeroPropuesta} &nbsp;·&nbsp; Emitido: ${fechaTexto}</span>
          </div>
        </div>

        <!-- ===== SECCIÓN PRINCIPAL: render + resumen ===== -->
        <div class="main">
          <div class="col-render">
            ${imagenDataUrl ? `<img class="render-img" src="${imagenDataUrl}" />` : ''}
            <p class="render-note">Render referencial basado en las opciones seleccionadas. El diseño final será confirmado en la visita técnica.</p>
          </div>
          <div class="col-resumen">
            <div class="r-title">RESUMEN DE LA COTIZACIÓN</div>
            ${filaResumen('solucion', 'Tipo de solución', datos.nombreSolucion)}
            ${filaResumen('sistema', 'Sistema', materialTexto)}
            ${filaResumen('vidrio', 'Tipo de vidrio', tipoVidrioTexto)}
            ${filaResumen('sistema', 'Sistema / marco', materialTexto)}
            ${filaResumen('color', 'Color de aluminio', colorAluminioTexto)}
            ${filaResumen('accesorios', 'Accesorios', accesoriosTexto)}
            ${filaResumen('area', 'Área total', datos.areaTotal.toFixed(2) + ' m²')}
            ${filaResumen('distrito', 'Distrito', distrito)}
            ${filaResumen('urgencia', 'Nivel de urgencia', urgenciaTexto)}
            ${filaResumen('planos', '¿Tiene planos o fotos?', tienePlanosTexto)}
          </div>
        </div>

        <!-- ===== SECCIÓN INFERIOR: 3 columnas ===== -->
        <div class="lower">
          <div class="lower-col">
            <div class="lower-title">DESGLOSE DE COSTOS</div>
            <div class="lower-rule"></div>
            ${filaCosto('Costo base', formatearSoles(datos.costoBase))}
            ${filaCosto('Materiales y sistema', formatearSoles(datos.adicionalMaterial))}
            ${filaCosto('Accesorios y adicionales', formatearSoles(datos.adicionalVidrio + datos.adicionalAccesorios))}
            ${filaCosto('Instalación', formatearSoles(datos.costoInstalacion))}
            ${filaCosto('Subtotal', formatearSoles(datos.costoTotalAntesUtilidad), true)}
            ${filaCosto('% Utilidad aplicada', datos.utilidadPct + '%')}
            ${filaCosto('Monto de utilidad', formatearSoles(datos.montoUtilidad))}
            <div class="precio-final-box">
              <div class="precio-final-lbl">Precio final sugerido</div>
              <div class="precio-final-val">${formatearSoles(datos.precioFinal)}</div>
            </div>
          </div>

          <div class="lower-col">
            <div class="lower-title">ESPECIFICACIONES TÉCNICAS</div>
            <div class="lower-rule"></div>
            <ul class="esp-list">
              <li><b>Vidrio:</b> ${tipoVidrioTexto}, según área y uso especificados.</li>
              <li><b>Sistema o marco:</b> ${materialTexto}, color ${colorAluminioTexto.toLowerCase()}.</li>
              <li><b>Herrajes:</b> ${accesoriosTexto}.</li>
              <li><b>Sellos e instalación:</b> sellado perimetral y fijación según condiciones de obra, confirmados en visita técnica.</li>
            </ul>
          </div>

          <div class="lower-col">
            <div class="lower-title">RECOMENDACIÓN</div>
            <div class="lower-rule"></div>
            <p class="reco-text">${recomendacion || 'Validar medidas finales con visita técnica antes de confirmar el presupuesto.'}</p>
            <span class="reco-ico">${PDF_ICONOS.escudo}</span>
          </div>
        </div>

        <!-- ===== NOTA LEGAL ===== -->
        <div class="nota-legal">
          Precio preliminar sujeto a visita técnica, validación de medidas, accesorios, herrajes y condiciones de instalación.
        </div>

        <!-- ===== PIE DE PÁGINA ===== -->
        <div class="foot">
          <div class="foot-block">
            <b>ALECOM Proyectos S.A.C.</b>
            RUC: [pendiente de registrar]
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

  /**
   * Espera a que todas las <img> dentro de `contenedor` terminen de
   * cargar y decodificar. Usa img.decode() cuando está disponible
   * (más fiable que 'load' para garantizar que el frame ya se puede
   * pintar en un canvas); si decode() no existe o falla, recurre a
   * los eventos load/error. Cada imagen tiene un timeout individual
   * de 4s para que una imagen caída nunca cuelgue la generación del
   * PDF completo — en ese caso simplemente se continúa sin bloquear.
   *
   * Causa raíz del bug histórico de "render en blanco" en el PDF: se
   * usaba un setTimeout fijo de 60ms antes de llamar a html2canvas,
   * insuficiente cuando la imagen va embebida como dataURL base64
   * (puede pesar varios cientos de KB y tardar más en decodificarse
   * en el navegador del usuario). No era un problema de CORS: el
   * fetch de la imagen ya se completaba con éxito antes de este
   * punto — el fallo era de timing en el pintado del <img>.
   */
  function esperarImagenesListas(contenedor){
    const imgs = Array.from(contenedor.querySelectorAll('img'));
    if (!imgs.length) return Promise.resolve();

    const esperarUna = (img) => new Promise((resolve) => {
      const finalizar = () => resolve();
      const timeoutId = setTimeout(finalizar, 4000);

      const yaCargada = img.complete && img.naturalWidth > 0;
      if (yaCargada && typeof img.decode === 'function'){
        img.decode().then(() => { clearTimeout(timeoutId); finalizar(); }).catch(() => { clearTimeout(timeoutId); finalizar(); });
        return;
      }
      if (yaCargada){
        clearTimeout(timeoutId);
        finalizar();
        return;
      }
      img.addEventListener('load', () => {
        if (typeof img.decode === 'function'){
          img.decode().then(() => { clearTimeout(timeoutId); finalizar(); }).catch(() => { clearTimeout(timeoutId); finalizar(); });
        } else {
          clearTimeout(timeoutId);
          finalizar();
        }
      }, { once: true });
      img.addEventListener('error', () => { clearTimeout(timeoutId); finalizar(); }, { once: true });
    });

    return Promise.all(imgs.map(esperarUna));
  }

  async function generarPdfCliente(){
    if (!ultimoCalculo){
      mostrarAlerta('Primero calcula un presupuesto para poder generar el PDF.');
      return;
    }
    if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined'){
      mostrarAlerta('No se pudo cargar el generador de PDF. Verifica tu conexión e intenta de nuevo.');
      return;
    }

    const htmlOriginalBoton = btnGenerarPdf.innerHTML;
    btnGenerarPdf.disabled = true;
    btnGenerarPdf.innerHTML = 'Generando PDF…';

    let contenedorTemporal = null;

    try {
      const datos = ultimoCalculo;
      const cliente = campos.nombreCliente.value.trim() || '—';

      const fechaHoy = new Date();
      const numeroPropuesta = 'COT-' + fechaHoy.getFullYear() +
        String(fechaHoy.getMonth() + 1).padStart(2, '0') +
        String(fechaHoy.getDate()).padStart(2, '0') + '-' +
        String(fechaHoy.getHours()).padStart(2, '0') +
        String(fechaHoy.getMinutes()).padStart(2, '0');
      const fechaTexto = fechaHoy.toLocaleDateString('es-PE');

      // 1. Descargar la imagen representativa (con cache y fallback null).
      const imagenInfo = await obtenerImagenRenderComoDataUrl(datos.tipoSolucion);

      // 2. Construir el HTML de la propuesta y montarlo fuera de pantalla.
      const htmlPropuesta = construirHtmlPdf(datos, imagenInfo ? imagenInfo.dataUrl : null, numeroPropuesta, fechaTexto);

      contenedorTemporal = document.createElement('div');
      contenedorTemporal.style.position = 'fixed';
      contenedorTemporal.style.top = '0';
      contenedorTemporal.style.left = '-9999px';
      contenedorTemporal.style.zIndex = '-1';
      contenedorTemporal.innerHTML = htmlPropuesta;
      document.body.appendChild(contenedorTemporal);

      // Esperar a que TODAS las imágenes del contenedor temporal
      // terminen de cargar y decodificar antes de capturar.
      await esperarImagenesListas(contenedorTemporal);

      // Frame adicional de seguridad para que el navegador termine de
      // aplicar fuentes/estilos tras la decodificación de imágenes.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      // 3. Capturar la plantilla como imagen de alta resolución.
      const nodoPdf = contenedorTemporal.querySelector('#pdfRoot');
      const canvas = await window.html2canvas(nodoPdf, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imagenCanvas = canvas.toDataURL('image/jpeg', 0.92);

      // 4. Insertar la imagen capturada en un documento jsPDF A4.
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const anchoA4 = 210;
      const altoA4 = (canvas.height * anchoA4) / canvas.width;
      doc.addImage(imagenCanvas, 'JPEG', 0, 0, anchoA4, altoA4);

      // Si el contenido excede una página A4, jsPDF simplemente corta
      // la imagen en la primera página; para esta plantilla (pensada
      // para caber en una sola página A4) esto es aceptable. Si en el
      // futuro el resumen crece mucho (muchos accesorios), considerar
      // paginar la captura en vez de una sola imagen larga.

      const nombreArchivo = `Cotizacion_${numeroPropuesta}_${cliente.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      doc.save(nombreArchivo);

    } finally {
      if (contenedorTemporal && contenedorTemporal.parentNode){
        contenedorTemporal.parentNode.removeChild(contenedorTemporal);
      }
      btnGenerarPdf.disabled = false;
      btnGenerarPdf.innerHTML = htmlOriginalBoton;
    }
  }

  /* ========================================================
     EVENTOS
     ======================================================== */

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;
    const datos = calcularPresupuesto();
    ultimoCalculo = datos;
    mostrarResultado(datos);
  });

  Object.values(campos).forEach(campo => {
    if (!campo) return;
    campo.addEventListener('input', () => campo.classList.remove('is-invalid'));
    campo.addEventListener('change', () => campo.classList.remove('is-invalid'));
  });

  btnLimpiar.addEventListener('click', () => {
    form.reset();
    ocultarAlerta();
    ocultarAviso();
    Object.values(campos).forEach(c => c && c.classList.remove('is-invalid'));
    actualizarObligatoriedadMaterial();
    resultContent.hidden = true;
    resultEmpty.hidden = false;
    ultimoCalculo = null;
  });

  btnGenerarPdf.addEventListener('click', generarPdfCliente);

});

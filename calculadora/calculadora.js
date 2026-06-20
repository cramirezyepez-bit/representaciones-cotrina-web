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

  function generarRecomendacion(datos){
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
     ALECOM para fachada. Todas verificadas con licencia gratuita
     antes de su uso.
     ======================================================== */
  const RENDERS_POR_SOLUCION = {
    fachada:     { url: 'img/proyectos/proyecto-04.jpg', credito: 'Obra ejecutada por ALECOM Proyectos' },
    muroCortina: { url: 'https://images.unsplash.com/photo-1745015446589-7ee6f702d8c1?w=1400&q=80', credito: 'Imagen referencial — Fabian Kleiser / Unsplash' },
    ventana:     { url: 'https://images.unsplash.com/photo-1758565811176-ccd94357a844?w=1400&q=80', credito: 'Imagen referencial — Caroline Badran / Unsplash' },
    mampara:     { url: 'https://images.unsplash.com/photo-1723257891127-0d1ea314a720?w=1400&q=80', credito: 'Imagen referencial — Alex Tyson / Unsplash' },
    baranda:     { url: 'https://images.unsplash.com/photo-1771904488645-fa6ebf7a2d06?w=1400&q=80', credito: 'Imagen referencial — Wesley Shen / Unsplash' },
    puerta:      { url: 'img/proyectos/proyecto-04.jpg', credito: 'Obra ejecutada por ALECOM Proyectos' },
    cerramiento: { url: 'img/proyectos/proyecto-04.jpg', credito: 'Obra ejecutada por ALECOM Proyectos' },
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
     IMPORTANTE: este PDF es para uso EXTERNO (se entrega al
     cliente). Por eso NO incluye costo base, % de utilidad,
     monto de utilidad, adicionales por accesorios/material/vidrio
     ni costo de instalación por separado — toda esa información
     es de uso interno del equipo comercial y vive únicamente en
     el panel de pantalla, nunca en este documento.
     El PDF solo muestra: datos del cliente, descripción del
     servicio en texto, y el precio final ya consolidado.
     ======================================================== */

  async function generarPdfCliente(){
    if (!ultimoCalculo){
      mostrarAlerta('Primero calcula un presupuesto para poder generar el PDF.');
      return;
    }
    if (typeof window.jspdf === 'undefined'){
      mostrarAlerta('No se pudo cargar el generador de PDF. Verifica tu conexión e intenta de nuevo.');
      return;
    }

    // Deshabilitar el botón mientras se descarga la imagen, para evitar
    // doble clic y para dar feedback de que algo está pasando.
    const htmlOriginalBoton = btnGenerarPdf.innerHTML;
    btnGenerarPdf.disabled = true;
    btnGenerarPdf.innerHTML = 'Generando PDF…';

    try {
      const datos = ultimoCalculo;
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });

      const colorNegro = [6, 20, 27];
      const colorNaranja = [224, 123, 57];
      const colorGris = [90, 100, 107];
      const margenX = 20;
      const anchoUtil = 210 - margenX * 2;
      let y = 18;

      // --- Encabezado: logo + eslogan ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(...colorNegro);
      doc.text(EMPRESA.nombre, margenX, y);

      y += 5.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...colorNaranja);
      doc.text(EMPRESA.eslogan, margenX, y);

      y += 5;
      doc.setDrawColor(...colorNaranja);
      doc.setLineWidth(0.8);
      doc.line(margenX, y, 210 - margenX, y);

      // --- Título y número de propuesta ---
      y += 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14.5);
      doc.setTextColor(...colorNegro);
      doc.text('Propuesta Preliminar', margenX, y);

      const fechaHoy = new Date();
      const numeroPropuesta = 'COT-' + fechaHoy.getFullYear() +
        String(fechaHoy.getMonth() + 1).padStart(2, '0') +
        String(fechaHoy.getDate()).padStart(2, '0') + '-' +
        String(fechaHoy.getHours()).padStart(2, '0') +
        String(fechaHoy.getMinutes()).padStart(2, '0');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...colorGris);
      doc.text(`N° ${numeroPropuesta}`, 210 - margenX, y - 4, { align: 'right' });
      doc.text(`Emitido: ${fechaHoy.toLocaleDateString('es-PE')}`, 210 - margenX, y + 1, { align: 'right' });

      // --- Render del producto (área destacada, ~40% de la primera página) ---
      y += 6;
      const altoImagen = 80; // ~40% de los ~200mm de área de contenido en A4
      const imagenInfo = await obtenerImagenRenderComoDataUrl(datos.tipoSolucion);

      if (imagenInfo && imagenInfo.dataUrl){
        try {
          doc.addImage(imagenInfo.dataUrl, 'JPEG', margenX, y, anchoUtil, altoImagen, undefined, 'FAST');
          doc.setDrawColor(225, 225, 225);
          doc.setLineWidth(0.3);
          doc.rect(margenX, y, anchoUtil, altoImagen);
          y += altoImagen + 3;
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.setTextColor(150, 150, 150);
          doc.text(imagenInfo.credito, margenX, y);
          y += 7;
        } catch (errImg){
          console.warn('No se pudo insertar la imagen en el PDF:', errImg);
        }
      }

      // --- Resumen de la cotización ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(...colorNegro);
      doc.text('Resumen de la cotización', margenX, y);
      y += 1.5;
      doc.setDrawColor(225, 225, 225);
      doc.setLineWidth(0.3);
      doc.line(margenX, y, 210 - margenX, y);

      const cliente = campos.nombreCliente.value.trim() || '—';
      const ruc = campos.rucCliente.value.trim();
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

      const filasResumen = [
        ['Cliente', cliente],
        ['RUC / DNI', ruc || 'No registrado'],
        ['Tipo de solución', datos.nombreSolucion],
        ['Sistema / marco', materialTexto],
        ['Tipo de vidrio', tipoVidrioTexto],
        ['Color de aluminio', colorAluminioTexto],
        ['Accesorios', accesoriosTexto],
        ['Área total', `${datos.areaTotal.toFixed(2)} m²`],
        ['Distrito', distrito],
        ['Urgencia', urgenciaTexto],
        ['¿Tiene planos o fotos?', tienePlanosTexto],
      ];

      y += 6;
      doc.setFontSize(9.5);
      filasResumen.forEach(([etiqueta, valor]) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorGris);
        doc.text(etiqueta + ':', margenX, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colorNegro);
        const lineasValor = doc.splitTextToSize(String(valor), anchoUtil - 48);
        doc.text(lineasValor, margenX + 48, y);
        y += Math.max(lineasValor.length * 4.6, 5.4);
      });

      // --- Caja de precio final (sin desglose de costos ni utilidad) ---
      y += 6;
      const cajaAlto = 24;
      doc.setFillColor(245, 243, 238);
      doc.setDrawColor(...colorNaranja);
      doc.setLineWidth(0.6);
      doc.roundedRect(margenX, y, anchoUtil, cajaAlto, 2, 2, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...colorGris);
      doc.text('INVERSIÓN TOTAL DEL PROYECTO', margenX + 8, y + 8);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(17);
      doc.setTextColor(...colorNegro);
      doc.text(formatearSoles(datos.precioFinal) + ' (incluye IGV)', margenX + 8, y + 18);

      y += cajaAlto + 10;

      // --- Salto de página para especificaciones técnicas y condiciones ---
      if (y > 230){
        doc.addPage();
        y = 22;
      }

      // --- Especificaciones técnicas ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(...colorNegro);
      doc.text('Especificaciones técnicas', margenX, y);
      y += 1.5;
      doc.setDrawColor(225, 225, 225);
      doc.line(margenX, y, 210 - margenX, y);

      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...colorNegro);
      const descripcionBase = DESCRIPCION_SERVICIO[datos.tipoSolucion] || '';
      const medidasTexto = `Medidas referenciales: ${datos.ancho} m de ancho x ${datos.alto} m de alto` +
        (datos.cantidad > 1 ? `, cantidad de ${datos.cantidad} unidades` : '') +
        ` (área aproximada de ${datos.areaTotal.toFixed(2)} m²).`;
      const parrafoServicio = `${descripcionBase} ${medidasTexto} Vidrio especificado: ${tipoVidrioTexto}. Sistema/marco: ${materialTexto}.`;
      const lineasServicio = doc.splitTextToSize(parrafoServicio, anchoUtil);
      doc.text(lineasServicio, margenX, y);
      y += lineasServicio.length * 5 + 4;

      if (datos.accesoriosSeleccionados.length){
        const lineaAcc = `Accesorios y prestaciones incluidas: ${accesoriosTexto}.`;
        const lineasAcc = doc.splitTextToSize(lineaAcc, anchoUtil);
        doc.text(lineasAcc, margenX, y);
        y += lineasAcc.length * 5 + 4;
      }

      const lineaInstalacion = 'Consideraciones de instalación: el plazo y procedimiento se confirman tras la visita técnica, según accesos al lugar de trabajo, altura de instalación y condiciones de la estructura existente.';
      const lineasInstalacion = doc.splitTextToSize(lineaInstalacion, anchoUtil);
      doc.text(lineasInstalacion, margenX, y);
      y += lineasInstalacion.length * 5 + 8;

      // --- Recomendación técnica ---
      const recomendacion = generarRecomendacion(datos);
      if (recomendacion){
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11.5);
        doc.setTextColor(...colorNegro);
        doc.text('Recomendación técnica', margenX, y);
        y += 1.5;
        doc.line(margenX, y, 210 - margenX, y);
        y += 7;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9.5);
        doc.setTextColor(...colorGris);
        const lineasReco = doc.splitTextToSize(recomendacion.replace(/^Recomendación:\s*/i, ''), anchoUtil);
        doc.text(lineasReco, margenX, y);
        y += lineasReco.length * 5 + 8;
      }

      // --- Nota legal ---
      if (y > 250){ doc.addPage(); y = 22; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...colorNegro);
      doc.text('Nota legal', margenX, y);
      y += 1.5;
      doc.setDrawColor(225, 225, 225);
      doc.line(margenX, y, 210 - margenX, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...colorGris);
      const notaLegal = 'El presente documento constituye un presupuesto preliminar referencial. El precio definitivo será validado mediante visita técnica, verificación de medidas, accesorios, herrajes y condiciones reales de instalación. Validez de la propuesta: 15 días calendario desde la fecha de emisión.';
      const lineasNota = doc.splitTextToSize(notaLegal, anchoUtil);
      doc.text(lineasNota, margenX, y);

      // --- Pie de página (en todas las páginas generadas) ---
      const totalPaginas = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPaginas; p++){
        doc.setPage(p);
        const piePosY = 287;
        doc.setDrawColor(225, 225, 225);
        doc.setLineWidth(0.3);
        doc.line(margenX, piePosY - 9, 210 - margenX, piePosY - 9);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...colorGris);
        doc.text(`${EMPRESA.web}  ·  ${EMPRESA.correo}  ·  WhatsApp ${EMPRESA.whatsapp}  ·  ${EMPRESA.instagram}`, margenX, piePosY - 3);
        doc.text(`Página ${p} de ${totalPaginas}`, 210 - margenX, piePosY - 3, { align: 'right' });
      }

      const nombreArchivo = `Cotizacion_${numeroPropuesta}_${cliente.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      doc.save(nombreArchivo);

    } finally {
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

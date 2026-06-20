// ============================================================
// Representaciones Cotrina — Cotizador interno (equipo comercial)
// Lógica de costos, utilidad, validación de formulario y WhatsApp
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  /* ========================================================
     CONFIGURACIÓN DE COSTOS BASADA EN "PRESUPUESTO 26000"
     ========================================================
     El archivo Excel "Presupuesto 26000" (Representaciones Cotrina)
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
     EVENTOS
     ======================================================== */

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;
    const datos = calcularPresupuesto();
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
  });

});

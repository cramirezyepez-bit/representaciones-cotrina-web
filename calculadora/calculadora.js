// ============================================================
// Representaciones Cotrina — Calculadora de presupuesto referencial
// Lógica de cálculo, validación de formulario y envío a WhatsApp
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  /* ========================================================
     1. CONFIGURACIÓN DE PRECIOS Y FACTORES (editable aquí)
     ======================================================== */

  // Precio referencial por m² para cada tipo de solución [mínimo, máximo].
  // Actualizar estos valores cuando cambien las listas de precios.
  const PRECIOS_BASE = {
    fachada:     { min: 450, max: 750,  nombre: 'Fachada de vidrio' },
    mampara:     { min: 380, max: 650,  nombre: 'Mampara de baño' },
    ventana:     { min: 320, max: 580,  nombre: 'Ventana de aluminio' },
    baranda:     { min: 420, max: 700,  nombre: 'Baranda de vidrio' },
    puerta:      { min: 500, max: 850,  nombre: 'Puerta de vidrio' },
    muroCortina: { min: 650, max: 1100, nombre: 'Muro cortina' },
    cerramiento: { min: 480, max: 850,  nombre: 'Cerramiento de terraza' },
  };

  // Factores adicionales por especificación técnica.
  // Se SUMAN entre sí (no se multiplican) antes de aplicarse al rango base.
  // Ejemplo: vidrio insulado (+0.25) + aluminio premium (+0.30) + urgente (+0.15) = +0.70 → x1.70
  const FACTOR_VIDRIO = {
    crudo:     0,
    templado:  0,     // se toma como estándar de la industria, sin recargo
    laminado:  0.12,
    insulado:  0.25,
  };

  const FACTOR_ALUMINIO = {
    noAplica:  0,
    nacional:  0,
    europeo:   0.18,
    premium:   0.30,
  };

  const FACTOR_URGENCIA = {
    normal:     0,
    evaluacion: 0,
    urgente:    0.15,
  };

  // Área mínima facturable por unidad, en m².
  const AREA_MINIMA_POR_UNIDAD = 1;

  // Número de WhatsApp de la empresa (formato internacional, sin "+" ni espacios).
  const WHATSAPP_NUMERO = '51957441379';

  /* ========================================================
     2. REFERENCIAS AL DOM
     ======================================================== */

  const form = document.getElementById('calcForm');
  const formAlert = document.getElementById('formAlert');
  const btnLimpiar = document.getElementById('btnLimpiar');

  const resultEmpty = document.getElementById('resultEmpty');
  const resultContent = document.getElementById('resultContent');
  const resultTipo = document.getElementById('resultTipo');
  const resultArea = document.getElementById('resultArea');
  const resultDistrito = document.getElementById('resultDistrito');
  const resultRango = document.getElementById('resultRango');
  const resultReco = document.getElementById('resultReco');
  const btnWhatsapp = document.getElementById('btnWhatsapp');

  const campos = {
    tipoSolucion: document.getElementById('tipoSolucion'),
    ancho: document.getElementById('ancho'),
    alto: document.getElementById('alto'),
    cantidad: document.getElementById('cantidad'),
    tipoVidrio: document.getElementById('tipoVidrio'),
    sistemaAluminio: document.getElementById('sistemaAluminio'),
    colorAluminio: document.getElementById('colorAluminio'),
    distrito: document.getElementById('distrito'),
    urgencia: document.getElementById('urgencia'),
    tienePlanos: document.getElementById('tienePlanos'),
  };

  /* ========================================================
     3. UTILIDADES
     ======================================================== */

  // Formatea un número como moneda peruana, sin decimales.
  function formatearSoles(numero){
    return 'S/ ' + Math.round(numero).toLocaleString('es-PE');
  }

  // Muestra un mensaje de alerta amable y resalta los campos vacíos.
  function mostrarAlerta(mensaje, camposInvalidos = []){
    formAlert.textContent = mensaje;
    formAlert.classList.add('is-visible');

    Object.values(campos).forEach(c => c.classList.remove('is-invalid'));
    camposInvalidos.forEach(c => c.classList.add('is-invalid'));

    formAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function ocultarAlerta(){
    formAlert.classList.remove('is-visible');
    formAlert.textContent = '';
  }

  /* ========================================================
     4. VALIDACIÓN DE CAMPOS OBLIGATORIOS
     ======================================================== */

  function validarFormulario(){
    const invalidos = [];

    if (!campos.tipoSolucion.value) invalidos.push(campos.tipoSolucion);
    if (!campos.ancho.value || Number(campos.ancho.value) <= 0) invalidos.push(campos.ancho);
    if (!campos.alto.value || Number(campos.alto.value) <= 0) invalidos.push(campos.alto);
    if (!campos.cantidad.value || Number(campos.cantidad.value) < 1) invalidos.push(campos.cantidad);
    if (!campos.tipoVidrio.value) invalidos.push(campos.tipoVidrio);
    if (!campos.sistemaAluminio.value) invalidos.push(campos.sistemaAluminio);
    if (!campos.distrito.value.trim()) invalidos.push(campos.distrito);
    if (!campos.urgencia.value) invalidos.push(campos.urgencia);
    if (!campos.tienePlanos.value) invalidos.push(campos.tienePlanos);

    if (invalidos.length > 0){
      mostrarAlerta(
        'Por favor completa los campos resaltados antes de calcular tu presupuesto. Son necesarios para darte un rango confiable.',
        invalidos
      );
      return false;
    }

    ocultarAlerta();
    return true;
  }

  /* ========================================================
     5. CÁLCULO DEL PRESUPUESTO
     ======================================================== */

  function calcularPresupuesto(){
    const tipoSolucion = campos.tipoSolucion.value;
    const ancho = Number(campos.ancho.value);
    const alto = Number(campos.alto.value);
    const cantidad = Number(campos.cantidad.value);
    const tipoVidrio = campos.tipoVidrio.value;
    const sistemaAluminio = campos.sistemaAluminio.value;
    const urgencia = campos.urgencia.value;

    // Área por unidad, con mínimo facturable de 1 m².
    const areaPorUnidad = Math.max(ancho * alto, AREA_MINIMA_POR_UNIDAD);
    const areaTotal = areaPorUnidad * cantidad;

    // Rango base según el precio por m² del tipo de solución.
    const precios = PRECIOS_BASE[tipoSolucion];
    const rangoBaseMin = precios.min * areaTotal;
    const rangoBaseMax = precios.max * areaTotal;

    // Factor adicional acumulado (aditivo) por especificaciones técnicas.
    const factorAdicional =
      FACTOR_VIDRIO[tipoVidrio] +
      FACTOR_ALUMINIO[sistemaAluminio] +
      FACTOR_URGENCIA[urgencia];

    const factorTotal = 1 + factorAdicional;

    const rangoFinalMin = rangoBaseMin * factorTotal;
    const rangoFinalMax = rangoBaseMax * factorTotal;

    return {
      tipoSolucion,
      nombreSolucion: precios.nombre,
      areaPorUnidad,
      areaTotal,
      cantidad,
      ancho,
      alto,
      rangoFinalMin,
      rangoFinalMax,
      factorAdicional,
    };
  }

  /* ========================================================
     6. RECOMENDACIÓN TÉCNICA BREVE
     ======================================================== */

  function generarRecomendacion(datos){
    const recomendaciones = {
      fachada: 'Para fachadas, el espesor de cristal y el anclaje a la estructura del edificio deben definirse con un plano de obra. Te recomendamos una visita técnica antes de cerrar especificaciones.',
      mampara: 'En mamparas de baño, el cristal templado de 8mm es el estándar más usado. Si buscas un acabado sin marco visible (frameless), el costo final puede ubicarse en el extremo superior del rango.',
      ventana: 'Para ventanas, el sistema y color de aluminio influyen directamente en el aislamiento térmico y acústico. Si el proyecto está cerca al mar o zonas de viento fuerte, considera un sistema europeo.',
      baranda: 'Las barandas de vidrio con uso estructural requieren cristal templado de 10mm o 12mm como mínimo, según la norma de seguridad en altura vigente.',
      puerta: 'En puertas, evalúa si el acceso requiere apertura corrediza o pivotante — esto cambia el tipo de herraje y puede afectar el presupuesto final.',
      muroCortina: 'Los muros cortina son sistemas estructurales que requieren cálculo de carga de viento y anclaje a la edificación. Es indispensable una revisión de planos antes de cotizar en firme.',
      cerramiento: 'Para cerramientos de terraza, el sistema corredizo o plegable es el más usado para maximizar la apertura hacia el exterior. El ancho libre por hoja es clave para definir el sistema correcto.',
    };

    return recomendaciones[datos.tipoSolucion] || 'Te recomendamos validar las medidas finales con una visita técnica antes de confirmar el presupuesto.';
  }

  /* ========================================================
     7. RENDERIZADO DEL RESULTADO EN PANTALLA
     ======================================================== */

  function mostrarResultado(datos){
    resultEmpty.hidden = true;
    resultContent.hidden = false;

    resultTipo.textContent = datos.nombreSolucion;
    resultArea.textContent = `${datos.areaTotal.toFixed(2)} m²`;
    resultDistrito.textContent = campos.distrito.value.trim();
    resultRango.textContent = `${formatearSoles(datos.rangoFinalMin)} — ${formatearSoles(datos.rangoFinalMax)}`;
    resultReco.textContent = generarRecomendacion(datos);

    actualizarEnlaceWhatsapp(datos);

    resultContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ========================================================
     8. MENSAJE PRECARGADO DE WHATSAPP
     ======================================================== */

  function actualizarEnlaceWhatsapp(datos){
    const distrito = campos.distrito.value.trim();
    const tienePlanos = campos.tienePlanos.value === 'si' ? 'Sí' : 'No';
    const urgenciaTexto = {
      normal: 'Normal',
      urgente: 'Urgente',
      evaluacion: 'Proyecto en evaluación',
    }[campos.urgencia.value];
    const colorAluminioTexto = {
      natural: 'Natural',
      negro: 'Negro',
      blanco: 'Blanco',
      champagne: 'Champagne',
      madera: 'Acabado madera',
    }[campos.colorAluminio.value] || 'No especificado';

    const mensaje =
`Hola, quisiera una asesoría técnica para mi proyecto.

*Tipo de solución:* ${datos.nombreSolucion}
*Medidas:* ${datos.ancho} m (ancho) x ${datos.alto} m (alto) x ${datos.cantidad} unidad(es)
*Área estimada:* ${datos.areaTotal.toFixed(2)} m²
*Color de aluminio:* ${colorAluminioTexto}
*Distrito:* ${distrito}
*Rango estimado:* ${formatearSoles(datos.rangoFinalMin)} — ${formatearSoles(datos.rangoFinalMax)}
*Urgencia:* ${urgenciaTexto}
*¿Tiene planos o fotos?:* ${tienePlanos}

Quisiera validar este presupuesto referencial con un especialista. Gracias.`;

    const url = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
    btnWhatsapp.setAttribute('href', url);
  }

  /* ========================================================
     9. EVENTOS
     ======================================================== */

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!validarFormulario()) return;

    const datos = calcularPresupuesto();
    mostrarResultado(datos);
  });

  // Quita el resaltado de error apenas el usuario empieza a corregir un campo.
  Object.values(campos).forEach(campo => {
    campo.addEventListener('input', () => campo.classList.remove('is-invalid'));
    campo.addEventListener('change', () => campo.classList.remove('is-invalid'));
  });

  btnLimpiar.addEventListener('click', () => {
    form.reset();
    ocultarAlerta();
    Object.values(campos).forEach(c => c.classList.remove('is-invalid'));
    resultContent.hidden = true;
    resultEmpty.hidden = false;
  });

});

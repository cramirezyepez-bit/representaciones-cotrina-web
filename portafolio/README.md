# Portafolio — Cotrina Proyectos

Portafolio digital de proyectos de **Cotrina Proyectos**, organizado por **proyecto**
(no por foto suelta). Vive dentro del sitio principal, en `/portafolio`.

Sitio estático — **HTML, CSS y JavaScript puro (ES Modules)**. Sin frameworks, sin
build step. Usa hash routing (`#/` y `#/proyecto/<slug>`) para funcionar 100% en
GitHub Pages sin configuración de servidor.

## ⚠️ Contenido simulado — pendiente de reemplazar

Los **9 proyectos**, sus **nombres, ubicaciones, arquitectos, constructoras, áreas
y descripciones son simulados** (a pedido explícito, como punto de partida visual).
Las fotografías son reales, pero **su asignación a cada proyecto es una agrupación
sugerida**, no un registro real de qué foto pertenece a qué obra.

**Antes de compartir el portafolio con clientes reales, reemplazar en `js/projects-data.js`:**
- Nombre y ubicación real de cada proyecto
- Arquitecto / constructora reales (o quitar el campo si no aplica)
- Área real
- Descripción real
- Reasignar las fotos correctas a cada proyecto (ver sección siguiente)

## Taxonomía de proyectos

| Grupo | Proyectos | Fotos |
|---|---|---|
| Playa | Casa Asia, Casa Punta Hermosa | 30 |
| Campo | Casa La Molina, Casa Casuarinas | 34 |
| Residencial | Edificio Barranco, Departamento Miraflores, Casa San Borja, Casa San Isidro | 31 |
| Oficinas | Oficinas San Isidro | 12 |

Cada tarjeta de proyecto en el home muestra una ficha resumen: nombre, tipo de uso
(Residencial/Corporativo), distrito, hasta 4 servicios con check (✓) y cantidad de
fotografías — igual al formato acordado.

## Estructura del proyecto

```
portafolio/
├── index.html          # shell de la app: header, vista grid, vista detalle, lightbox
├── css/style.css        # todos los estilos
├── js/
│   ├── projects-data.js # los 8 proyectos + sus fotos (EDITAR AQUÍ)
│   └── app.js            # routing, filtros, ficha técnica, galería, lightbox, buscador
└── assets/img/
    ├── barandas/{cover.jpg, thumb/, full/}
    ├── mamparas-cristal/
    ├── mamparas-oficina/
    ├── puertas-ducha/
    ├── sistemas-thermia/
    └── ventanas-termoacusticas/
```

Las carpetas `assets/img/` se mantienen organizadas por **tipo de sistema**
(igual que antes), pero ahora cada foto se **referencia desde uno o más proyectos**
en `projects-data.js` en vez de mostrarse suelta.

## Cómo funciona la navegación

- `#/` → grid de proyectos (portada del portafolio)
- `#/proyecto/casa-casuarinas` → ficha técnica + galería filtrable de ese proyecto

Los enlaces son compartibles directamente: `.../portafolio/index.html#/proyecto/casa-asia`
abre ese proyecto específico.

## Cómo editar un proyecto existente

Abre `js/projects-data.js`. Cada proyecto tiene esta forma:

```js
{
  "slug": "casa-casuarinas",           // usado en la URL, no cambiar sin avisar
  "name": "Casa Casuarinas",
  "location": "Las Casuarinas, Santiago de Surco",
  "category": "residencial",            // residencial | comercial | interiorismo
  "type": "Vivienda unifamiliar de lujo",
  "area": "480 m² construidos",         // opcional: quitar la línea si no aplica
  "architect": "Estudio Lima Arquitectura", // opcional
  "builder": null,                      // opcional
  "description": "...",
  "services": ["Barandas", "Puertas de Ducha", "Sistemas Thermia"],
  "cover": "assets/img/sistemas-thermia/thumb/01.jpg",
  "coverFull": "assets/img/sistemas-thermia/full/01.jpg",
  "photoCount": 18,
  "items": [
    { "id": "barandas-01", "service": "Barandas", "title": "Baranda 01",
      "thumb": "assets/img/barandas/thumb/01.jpg", "full": "assets/img/barandas/full/01.jpg" },
    ...
  ]
}
```

Los campos `area`, `architect` y `builder` son opcionales: si no aplican, se pueden
quitar del objeto (o dejar en `null`) y esa fila simplemente no aparece en la ficha técnica.

Los `services` se calculan a partir de las etiquetas `service` presentes en `items`
— los filtros dentro del proyecto se generan automáticamente según lo que ese
proyecto realmente tiene, para no mostrar botones que devuelvan 0 resultados.

## Cómo agregar un proyecto nuevo

1. Coloca las fotos nuevas en la carpeta de categoría que corresponda (`thumb/` y
   `full/`, mismo nombre de archivo en ambas — ver instrucciones de tamaño abajo).
2. Agrega un objeto nuevo al array `PROJECTS` en `js/projects-data.js`, con un
   `slug` único (sin espacios ni tildes) y sus `items` apuntando a las fotos.
3. Guarda y publica (commit + push). No hace falta tocar HTML ni CSS.

## Cómo agregar fotos a un proyecto existente

Agrega un objeto nuevo al array `items` de ese proyecto, con las rutas a la foto
(en `thumb/` y `full/`), y actualiza `photoCount`.

## Tamaño recomendado de imágenes

- `thumb/`: máx. ~900px de ancho (para el grid)
- `full/`: máx. ~1920px de ancho (para el lightbox)

## Personalización pendiente

- **WhatsApp**: ya conectado al número real (+51 957441379) en botón flotante,
  footer y menú móvil.
- **Imagen de vista previa al compartir** (Open Graph): en el `<head>` de
  `index.html`, actualmente usa `assets/img/sistemas-thermia/cover.jpg`.

## Categorías de proyecto y servicios

Grupos de nivel superior (filtro principal del home): **Playa, Campo, Residencial,
Oficinas** — ver tabla arriba.

Cada tarjeta también muestra un **tipo de uso**: "Residencial" para viviendas,
"Corporativo" para oficinas — se calcula automáticamente según el grupo.

Los servicios (filtros dentro de cada proyecto, y checklist en la tarjeta del home)
se definen libremente por foto en `projects-data.js` (campo `service` de cada item),
así que un mismo tipo de foto puede tener una etiqueta distinta según el contexto del
proyecto (ej. las mismas mamparas de vidrio aparecen como "Mamparas" en un proyecto
residencial y como "Divisiones de Cristal" en Oficinas San Isidro).

## Rendimiento

- **Lazy loading**: todas las imágenes usan `loading="lazy"` — solo se descargan
  las que entran en pantalla.
- **WebP + fallback JPG**: cada foto del grid/galería se sirve como `<picture>` con
  una fuente WebP (~30–40% más liviana) y JPG de respaldo para navegadores antiguos.
  Las fotos del lightbox (tamaño completo) se mantienen en JPG optimizado.
- No se cargan las 107 fotos al entrar al home — solo las 9 portadas de proyecto;
  las fotos de cada galería se cargan al abrir ese proyecto específico.

## Responsive — breakpoints reales

La grilla de proyectos **cambia de columnas** (no solo escala) según el ancho:

| Rango | Columnas |
|---|---|
| ≥ 1440px (laptop grande, desktop, 1600, 1920) | 4 |
| 1200–1439px (laptop estándar/pequeña, incl. 1366) | 3 |
| 1024–1199px (tablet horizontal) | 3 |
| 641–1023px (tablet vertical) | 2 |
| ≤ 640px (celular) | 1 |

En celular, las tarjetas se comprimen agresivamente (imagen más corta, tipografía
y paddings reducidos, subtítulo del home oculto) para que se vean ~3 proyectos
completos en la primera pantalla sin scroll. En desktop (1440px) se ven ~8 de 9
tarjetas sin scroll — llevarlo a las 9 exactas exigiría reducir aún más el texto
de cada tarjeta y se sacrificaría legibilidad, así que se dejó en ese punto de
equilibrio. Avísame si prefieres empujarlo más.

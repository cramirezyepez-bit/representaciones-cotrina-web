# Portafolio — Cotrina Proyectos

Portafolio digital de proyectos de **Cotrina Proyectos**, listo para publicarse en GitHub Pages y compartirse por WhatsApp, LinkedIn o correo con arquitectos, constructoras y clientes.

Sitio estático — **HTML, CSS y JavaScript puro (ES Modules)**. Sin frameworks, sin build step, sin dependencias que instalar.

## Estructura del proyecto

```
/
├── index.html          # página única: header, filtros, grid, lightbox, footer
├── css/
│   └── style.css       # todos los estilos (dark navy + copper)
├── js/
│   ├── data.js         # categorías + lista de las 107 fotos (EDITAR AQUÍ)
│   └── app.js          # lógica: filtros, búsqueda, lightbox, compartir
└── assets/
    └── img/
        ├── barandas/
        │   ├── cover.jpg
        │   ├── thumb/   # versión liviana para el grid (~900px)
        │   └── full/    # versión para el lightbox (~1920px)
        ├── mamparas-cristal/
        ├── mamparas-oficina/
        ├── puertas-ducha/
        ├── sistemas-thermia/
        └── ventanas-termoacusticas/
```

Todas las imágenes originales (213MB en total) fueron comprimidas a JPG optimizado
(~26MB en total) para que el sitio cargue rápido, sin perder calidad visual perceptible.

## Cómo ver el sitio localmente

No necesitas instalar nada. Desde esta carpeta:

```bash
python3 -m http.server 8080
```

Y abre `http://localhost:8080` en tu navegador.

(También funciona abriendo `index.html` directamente en el navegador, aunque
algunos navegadores restringen módulos JS con `file://` — por eso se recomienda
el servidor local de arriba para probar.)

## Cómo publicarlo en GitHub Pages

1. Crea un repositorio en GitHub (sugerido: `portafolio-cotrina-proyectos`).
2. Sube todo el contenido de esta carpeta a la rama `main`.
3. En GitHub: **Settings → Pages → Source → Deploy from a branch → main / (root)**.
4. Tu portafolio quedará publicado en:
   `https://TU-USUARIO.github.io/portafolio-cotrina-proyectos/`

## Cómo agregar o reemplazar proyectos

Cada foto tiene **dos versiones**: una liviana para el grid (`thumb/`) y una
grande para el lightbox (`full/`). Para agregar fotos nuevas:

1. Coloca la foto optimizada en la carpeta de la categoría correspondiente,
   dentro de `thumb/` (ideal: máx. 900px de ancho) y `full/` (ideal: máx. 1920px de ancho),
   con el mismo nombre de archivo en ambas (ej. `26.jpg`).
2. Abre `js/data.js` y agrega una entrada nueva al array `ITEMS`, siguiendo el
   mismo formato que las existentes:

```js
{
  "id": "barandas-26",
  "category": "barandas",
  "title": "Baranda 26",
  "thumb": "assets/img/barandas/thumb/26.jpg",
  "full": "assets/img/barandas/full/26.jpg"
},
```

3. Guarda y vuelve a publicar (commit + push). No hace falta tocar el HTML ni el CSS.

Para **crear una categoría nueva** (ej. "Fachadas"): agrega el objeto a `CATEGORIES`
en `js/data.js` (con un `slug` único) y crea la carpeta correspondiente en `assets/img/`.

## Personalización pendiente (marcado con placeholders)

- **Número de WhatsApp**: buscar `51999999999` en `index.html` (aparece 2 veces:
  botón flotante y menú móvil) y reemplazar por el número real de Cotrina Proyectos.
- **Imagen de vista previa al compartir** (Open Graph): actualmente usa
  `assets/img/sistemas-thermia/cover.jpg`. Se puede cambiar en el `<head>` de
  `index.html` (`og:image` y `twitter:image`).

## Categorías actuales

| Categoría | Fotos |
|---|---|
| Barandas | 22 |
| Mamparas de Cristal Templado | 11 |
| Mamparas de Oficina | 8 |
| Puertas de Ducha | 25 |
| Sistemas Thermia | 24 |
| Ventanas Termoacústicas | 17 |
| **Total** | **107** |

# Motores de despiece por serie (fabricante real)

Esta carpeta contiene el despiece EXACTO por serie de perfilería, migrado
directamente de fichas técnicas / Excel de fabricante — no las reglas
genéricas aproximadas de `despieceTecnico.js`.

| Archivo | Fuente | Estado |
|---|---|---|
| `MotorPerfilesSerie25.js` | `SERIE25_V5.xlsx` (Excel interno, fórmulas Tabla3/Tabla2/Tabla285/Tabla5/Tabla2857) | Validado contra fórmulas reales del Excel |
| `MotorPerfilesVL46.js` | "Series Europeas Edición II" — Corporación Limatambo, Tabla de Descuentos Serie VL46 (pág. 6) | Fórmulas oficiales del fabricante |
| `MotorPerfilesML46.js` | "Serie ML46 – Mampara Corrediza" — Corporación Limatambo, Tabla de Descuentos Serie ML46 (pág. 11) | Fórmulas oficiales del fabricante |
| `MotorPerfilesVL48.js` | "Series Europeas Edición III" — Corporación Limatambo, Tabla de Descuentos Serie VL48 (pág. 19) | Fórmulas oficiales del fabricante |
| `MotorPerfilesML48.js` | "Series Europeas Edición III" — Corporación Limatambo, Tabla de Descuentos Serie ML48 (pág. 24) | Fórmulas oficiales del fabricante |
| `MotorPerfilesMBL46.js` | "Series Europeas Edición III" — Corporación Limatambo, Tabla de Descuentos Serie MBL46 - Puerta Batiente (pág. 31) | Fórmulas oficiales del fabricante |

Pendiente de agregar como motor propio: Sistema a 90° de la Serie ML46
(pág. 15-16 de la ficha) — requiere dos anchos independientes (X1, X2)
en vez de un solo X, por lo que necesita una firma de función distinta
a `calcularDespieceML46`. Se deja fuera de esta tanda para no romper el
patrón `{ancho, alto}` que comparten los 5 motores actuales.

## Pendiente de integrar en `cotizador.js`

Estos motores **todavía NO están conectados** a la UI del cotizador ni a
`reglasCalculo.js` / `despieceTecnico.js`. Hoy el cotizador calcula el
despiece con reglas genéricas de mercado (perímetro, hojas, felpa por
metro, etc. — ver cabecera de `despieceTecnico.js`), válidas como
aproximación comercial pero no como el corte técnico real de fábrica.

Integrar estos motores implica decidir:
1. Cómo el usuario selecciona la serie exacta (Serie 25 / VL46 / ML46 / …)
   dentro de un ítem, distinto del selector actual de "sistema de perfil"
   en `perfiles.js` (que hoy solo aplica un factor de precio, no un
   despiece real).
2. Si el despiece exacto reemplaza o complementa la tabla de accesorios
   automáticos actual del PDF.
3. Precios reales de venta por m² para VL46/ML46 (hoy en `perfiles.js`
   ambas comparten el mismo factor 0.25 que `serieEuropea`, como
   placeholder — pendiente de que Jorge confirme el precio real).

Próximas series a agregar (pendientes de ficha técnica): Serie 20,
Serie 62, Serie 80, Puerta de ducha corrediza, Puerta de ducha batiente.

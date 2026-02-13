# Reglas de Diseño de PRINT (Guía Reutilizable)

## 1. Propósito
Definir un estándar de diseño para replicar la experiencia de PRINT en otros proyectos del lab, manteniendo consistencia visual, interacción y estructura de vistas.

## 2. Stack y base UI
- Framework: React + TypeScript + Vite.
- Estilos: Tailwind CSS como sistema principal.
- Visualización: D3 (redes/pathways) y Recharts (métricas resumen).
- Tema base: interfaz oscura con alto contraste y acentos en verde/teal.

## 3. Sistema visual (tokens)

### 3.1 Colores base
- Fondo principal: gradiente `slate-950 -> slate-900 -> slate-950`.
- Superficies: `slate-900/50` o `slate-800/50` con `backdrop-blur`.
- Bordes: `slate-700` / `slate-800`.
- Texto principal: `white` / `slate-200`.
- Texto secundario: `slate-400` / `slate-500`.
- Color de marca/acento: `emerald-500` + `teal-600`.

### 3.2 Colores semánticos
- Activación: `emerald-500`.
- Represión: `red-500`.
- Desconocido: `slate-600`.
- Fuentes de evidencia:
  - `TARGET`: `emerald-500`
  - `DAP`: `blue-500` (en landing puede aparecer cian/violeta por demostración)
  - `CHIP`: `violet-500` (en landing puede aparecer cian)

### 3.3 Tipografía y pesos
- Fuente global: `Inter, sans-serif`.
- Jerarquía recomendada:
  - Títulos de módulo: `text-xl` + `font-bold` o `font-black`.
  - Etiquetas y controles: `text-xs`/`text-sm` + `font-bold`.
  - Meta/ayuda: `text-[10px]` a `text-xs`.

### 3.4 Forma y profundidad
- Radio:
  - Contenedores principales: `rounded-3xl`.
  - Controles/botones: `rounded-xl`/`rounded-2xl`.
  - Pills/chips: `rounded-full`.
- Sombra: `shadow-2xl` (cards) y `shadow-lg` (controles activos).
- Efecto vidrio: combinación de `bg-.../50` + `backdrop-blur-xl`.

## 4. Layout de aplicación
- Estructura fija de dos paneles:
  - Sidebar izquierda (`w-72`) con navegación y branding.
  - Área principal derecha con header superior + contenido scrolleable.
- Altura total: `h-screen`.
- Patrón mobile:
  - Sidebar off-canvas con overlay.
  - Botón hamburguesa en header (`md:hidden`).

## 5. Navegación y arquitectura de vistas
- Vistas principales:
  - `Explore Data`
  - `Network View`
  - `Enrichment`
  - `AI` (resultado analítico)
- Landing inicial opcional con guardado en `localStorage` (`print_landing_seen`).
- Botón activo siempre con gradiente de marca (`emerald -> teal`) y sombra.

## 6. Patrones de componentes

### 6.1 Cards/paneles
- Siempre con:
  - fondo translúcido oscuro,
  - borde sutil,
  - esquinas redondeadas amplias,
  - separación interna generosa (`p-6` típico).

### 6.2 Controles
- Selectores y inputs sobre `slate-800/50` + borde `slate-700`.
- Estado `focus`: anillo de color de marca (`focus:ring-emerald-500` o teal).
- Toggles binarios (ej. `AND/OR`, `ID/Symbol`) como grupo segmentado.

### 6.3 Tablas
- Encabezados en mayúsculas compactas (`text-[10px] uppercase tracking-widest`).
- Filas con hover suave (`hover:bg-emerald-500/5`).
- Límite de render para performance:
  - Explorer: mostrar hasta 100 filas.
  - Enrichment: mostrar hasta 50 filas.

### 6.4 Badges/chips
- Evidencia/fuente en pills pequeñas (`text-[9px]`, `font-black`).
- Dirección regulatoria con badge semántico (verde/rojo/gris).
- Prioridad TF en chips con estado on/off.

## 7. Reglas de visualización de redes

### 7.1 Convenciones de nodos
- TF: triángulo.
- Gen target: círculo (views direct/hierarchical) o rectángulo redondeado (pathway).
- Compuesto: círculo gris con gradiente.

### 7.2 Convenciones de aristas
- Activación: flecha verde.
- Represión: rojo (en pathway con marcador tipo barra).
- Interacción desconocida: gris.

### 7.3 Interacción D3
- Soporte obligatorio de:
  - zoom con rueda,
  - pan con drag,
  - reset con doble click o botón.
- Tooltips nativos (`title`) para detalles biológicos.
- Leyenda visible en overlay para interpretación rápida.

## 8. Filtros y lógica de interacción
- Debounce en búsqueda textual (~350 ms).
- Filtros combinables:
  - término GO,
  - TF prioritario,
  - fuente(s) de evidencia,
  - umbral de evidencia,
  - scope de red (global/direct/cascade),
  - modo fuente `OR/AND`.
- Exportación TSV con selector de formato (`Gene ID` o `Symbol`).

## 9. Estados de UX
- Loading global con spinner + mensaje de progreso.
- Estados vacíos explícitos por vista (ej. “Select TF…”, “No targets found”).
- Error visible en banner dismissible.
- Mensajes breves, directos y orientados a acción.

## 10. Branding y contenido institucional
- Incluir logotipo de PRINT en sidebar/header/landing.
- Mantener pie de créditos con lab y referencia de integración de datos.
- Mantener voz científica aplicada: exploración de hipótesis, contexto GO, regulación TF-target.

## 11. Checklist para portar a otro proyecto
- Replicar layout `sidebar + header + content`.
- Reusar paleta base `slate + emerald/teal`.
- Mantener componentes tipo card con blur y bordes suaves.
- Aplicar convenciones visuales de nodos/aristas/fuentes.
- Mantener comportamiento responsive con sidebar móvil.
- Incluir estados completos: loading, vacío, error, éxito.
- Conservar legibilidad de tablas y límites de render.

## 12. Archivos de referencia en este repo
- `App.tsx`
- `components/Landing.tsx`
- `components/StatsPanel.tsx`
- `components/NetworkVisualization.tsx`
- `components/DirectTargetsView.tsx`
- `components/HierarchicalView.tsx`
- `components/PathwayVisualization.tsx`
- `components/EnrichmentPanel.tsx`
- `index.css`

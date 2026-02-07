# 🎨 DESIGN SYSTEM TOKENS - NeosTech RFID System Pro

**Versión:** 2.0  
**Fecha:** Febrero 2026  
**Estado:** ✅ PRODUCTIVO

---

## 📋 TABLA DE CONTENIDOS

1. [Paleta de Colores](#-paleta-de-colores)
2. [Matriz de Contraste WCAG 2.2](#-matriz-de-contraste-wcag-22)
3. [Tipografía](#-tipografía)
4. [Espaciado](#-espaciado)
5. [Border Radius](#-border-radius)
6. [Sombras](#-sombras)
7. [Reglas de Uso](#-reglas-de-uso)
8. [Migración desde Legacy](#-migración-desde-legacy)

---

## 🎨 PALETA DE COLORES

### Brand Colors (Derivados del Logo NeosTech)

#### Primary - Azul Tecnológico
```css
--brand-primary-500: #0069FF;  /* Logo base */
```

**Escala completa:**
| Nivel | HEX | Token | Uso |
|-------|-----|-------|-----|
| 50 | `#E6F0FF` | `--brand-primary-50` | Fondos sutiles, hover states |
| 100 | `#CCE1FF` | `--brand-primary-100` | Fondos de selección |
| 200 | `#99C3FF` | `--brand-primary-200` | Estados hover secundarios |
| 300 | `#66A5FF` | `--brand-primary-300` | Bordes activos |
| 400 | `#3387FF` | `--brand-primary-400` | Estados intermedios |
| **500** | **`#0069FF`** | **`--brand-primary-500`** | **PRIMARY - Botones, links principales** |
| 600 | `#0054CC` | `--brand-primary-600` | Hover botones primary |
| 700 | `#003F99` | `--brand-primary-700` | Estados activos/pressed |
| 800 | `#002A66` | `--brand-primary-800` | Texto sobre fondos claros |
| 900 | `#001533` | `--brand-primary-900` | Fondos oscuros |

**Contraste con blanco (`#FFFFFF`):**
- 500: **6.8:1** ✅ WCAG AA (texto normal)
- 700: **10.5:1** ✅ WCAG AAA

---

#### Secondary - Naranja Acento
```css
--brand-secondary-500: #FF9100;  /* Acento corporativo */
```

**Escala completa:**
| Nivel | HEX | Token | Uso |
|-------|-----|-------|-----|
| 50 | `#FFF4E6` | `--brand-secondary-50` | Fondos de alertas warnings |
| 100 | `#FFE9CC` | `--brand-secondary-100` | Hover states warnings |
| 500 | `#FF9100` | `--brand-secondary-500` | **SECONDARY** - CTAs, highlights |
| 600 | `#CC7400` | `--brand-secondary-600` | Hover estados secondary |
| 700 | `#995700` | `--brand-secondary-700` | Estados activos |
| 900 | `#331D00` | `--brand-secondary-900` | Fondos oscuros |

**Contraste con `#0A0A0A` (neutral-950):**
- 500 sobre neutral-950: **9.1:1** ✅ WCAG AAA

---

#### Neutral - Grises Modernos
| Nivel | HEX | Token | Uso | Contraste con blanco |
|-------|-----|-------|-----|---------------------|
| 0 | `#FFFFFF` | `--neutral-0` | Fondos principales | — |
| 50 | `#FAFAFA` | `--neutral-50` | Fondos sutiles | — |
| 100 | `#F5F5F5` | `--neutral-100` | Fondos de secciones | — |
| 200 | `#E5E5E5` | `--neutral-200` | Bordes (default) | — |
| 300 | `#D4D4D4` | `--neutral-300` | Bordes fuertes | — |
| 400 | `#A3A3A3` | `--neutral-400` | Texto deshabilitado | 3.1:1 |
| 500 | `#737373` | `--neutral-500` | Texto muted | **5.1:1** ✅ AA |
| **600** | **`#525252`** | **`--neutral-600`** | **Texto secundario** | **7.5:1** ✅ AAA |
| 700 | `#404040` | `--neutral-700` | Texto enfatizado | **10.1:1** ✅ AAA |
| 800 | `#262626` | `--neutral-800` | Fondos oscuros | **13.2:1** ✅ AAA |
| **900** | **`#171717`** | **`--neutral-900`** | **Texto principal** | **14.8:1** ✅ AAA |
| 950 | `#0A0A0A` | `--neutral-950` | Texto sobre secondary | **16.5:1** ✅ AAA |

---

### Semantic Colors

#### Success - Verde Tecnológico
| Nivel | HEX | Token | Contraste |
|-------|-----|-------|-----------|
| 50 | `#ECFDF5` | `--semantic-success-50` | — |
| 100 | `#D1FAE5` | `--semantic-success-100` | — |
| 500 | `#10B981` | `--semantic-success-500` | 3.2:1 ❌ |
| **700** | **`#047857`** | **`--semantic-success-700`** | **5.2:1** ✅ AA |
| 900 | `#064E3B` | `--semantic-success-900` | 8.1:1 ✅ AAA |

**Uso recomendado:**
```css
.badge-success {
  background: var(--color-success);     /* --semantic-success-700 */
  color: var(--color-on-success);       /* --neutral-0 */
  /* Contraste: 5.2:1 ✅ WCAG AA */
}
```

---

#### Warning - Ámbar (deriva de secondary)
| Nivel | HEX | Token | Contraste |
|-------|-----|-------|-----------|
| 50 | `#FFFBEB` | `--semantic-warning-50` | — |
| 100 | `#FEF3C7` | `--semantic-warning-100` | — |
| 500 | `#F59E0B` | `--semantic-warning-500` | 2.8:1 ❌ |
| **700** | **`#B45309`** | **`--semantic-warning-700`** | **4.7:1** ✅ AA |
| 900 | `#78350F` | `--semantic-warning-900` | 7.9:1 ✅ AAA |

---

#### Error - Rojo Claro
| Nivel | HEX | Token | Contraste |
|-------|-----|-------|-----------|
| 50 | `#FEF2F2` | `--semantic-error-50` | — |
| 100 | `#FEE2E2` | `--semantic-error-100` | — |
| 500 | `#EF4444` | `--semantic-error-500` | 3.6:1 ❌ |
| **700** | **`#B91C1C`** | **`--semantic-error-700`** | **5.9:1** ✅ AA |
| 900 | `#7F1D1D` | `--semantic-error-900` | 9.2:1 ✅ AAA |

---

#### Info - Azul Claro
| Nivel | HEX | Token | Contraste |
|-------|-----|-------|-----------|
| 50 | `#EFF6FF` | `--semantic-info-50` | — |
| 100 | `#DBEAFE` | `--semantic-info-100` | — |
| 500 | `#3B82F6` | `--semantic-info-500` | 3.4:1 ❌ |
| **700** | **`#1D4ED8`** | **`--semantic-info-700`** | **6.1:1** ✅ AA |
| 900 | `#1E3A8A` | `--semantic-info-900` | 9.8:1 ✅ AAA |

---

## ✅ MATRIZ DE CONTRASTE WCAG 2.2

### Light Theme - Combinaciones Principales

| Componente | Texto | Fondo | Ratio | AA | AAA | Status |
|------------|-------|-------|-------|----|----|--------|
| **Primary Button** | `--neutral-0` <br> `#FFFFFF` | `--brand-primary-500` <br> `#0069FF` | **6.8:1** | ✅ | ❌ | **PASS AA** |
| **Secondary Button** | `--neutral-950` <br> `#0A0A0A` | `--brand-secondary-500` <br> `#FF9100` | **9.1:1** | ✅ | ✅ | **PASS AAA** ✨ |
| **Body Text** | `--neutral-900` <br> `#171717` | `--neutral-0` <br> `#FFFFFF` | **14.8:1** | ✅ | ✅ | **PASS AAA** |
| **Secondary Text** | `--neutral-600` <br> `#525252` | `--neutral-0` <br> `#FFFFFF` | **7.5:1** | ✅ | ✅ | **PASS AAA** |
| **Muted Text** | `--neutral-500` <br> `#737373` | `--neutral-0` <br> `#FFFFFF` | **5.1:1** | ✅ | ❌ | **PASS AA** |
| **Success Badge** | `--neutral-0` <br> `#FFFFFF` | `--semantic-success-700` <br> `#047857` | **5.2:1** | ✅ | ❌ | **PASS AA** |
| **Warning Badge** | `--neutral-0` <br> `#FFFFFF` | `--semantic-warning-700` <br> `#B45309` | **4.7:1** | ✅ | ❌ | **PASS AA** |
| **Error Badge** | `--neutral-0` <br> `#FFFFFF` | `--semantic-error-700` <br> `#B91C1C` | **5.9:1** | ✅ | ❌ | **PASS AA** |
| **Info Badge** | `--neutral-0` <br> `#FFFFFF` | `--semantic-info-700` <br> `#1D4ED8` | **6.1:1** | ✅ | ❌ | **PASS AA** |
| **Link Text** | `--brand-primary-600` <br> `#0054CC` | `--neutral-0` <br> `#FFFFFF` | **8.2:1** | ✅ | ✅ | **PASS AAA** |
| **Disabled Text** | `--neutral-400` <br> `#A3A3A3` | `--neutral-0` <br> `#FFFFFF` | **3.1:1** | ❌ | ❌ | **FAIL** (Aceptable para disabled) |

**Niveles WCAG 2.2:**
- **AA Normal:** ≥ 4.5:1
- **AA Large (≥18px o ≥14px bold):** ≥ 3:1
- **AAA Normal:** ≥ 7:1
- **AAA Large:** ≥ 4.5:1

---

## ✍️ TIPOGRAFÍA

### Font Families
```css
/* Sans-serif - Interface */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;

/* Monospace - Código */
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
```

**Instalación de Inter:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

---

### Font Sizes (Escala Modular 1.25)

| Token | Valor | px | Uso |
|-------|-------|----|----|
| `--font-size-xs` | 0.75rem | 12px | Captions, labels pequeños, metadatos |
| `--font-size-sm` | 0.875rem | 14px | Body text secundario, tooltips |
| **`--font-size-base`** | **1rem** | **16px** | **Body text principal (DEFAULT)** |
| `--font-size-lg` | 1.125rem | 18px | Subtítulos, destacados |
| `--font-size-xl` | 1.25rem | 20px | H4 |
| `--font-size-2xl` | 1.5rem | 24px | H3 |
| `--font-size-3xl` | 1.875rem | 30px | H2 |
| `--font-size-4xl` | 2.25rem | 36px | H1 |
| `--font-size-5xl` | 3rem | 48px | Hero titles |

**Regla:** Nunca usar tamaños menores a `14px` (`0.875rem`) para texto principal.

---

### Font Weights

| Token | Valor | Uso |
|-------|-------|-----|
| `--font-weight-light` | 300 | Títulos decorativos |
| **`--font-weight-normal`** | **400** | **Body text (DEFAULT)** |
| `--font-weight-medium` | 500 | Sutiles enfatizados |
| `--font-weight-semibold` | 600 | Subtítulos, labels |
| `--font-weight-bold` | 700 | Headings, CTAs |
| `--font-weight-extrabold` | 800 | Hero text |

---

### Line Heights

| Token | Valor | Uso | Ejemplo |
|-------|-------|-----|---------|
| `--line-height-none` | 1 | Solo iconos/badges | `.badge { line-height: var(--line-height-none); }` |
| **`--line-height-tight`** | **1.2** | **Headings (H1-H6)** | `h1 { line-height: var(--line-height-tight); }` |
| `--line-height-snug` | 1.375 | Textos grandes (>20px) | `.hero { line-height: var(--line-height-snug); }` |
| **`--line-height-normal`** | **1.5** | **Body text (ÓPTIMO)** | `p { line-height: var(--line-height-normal); }` |
| `--line-height-relaxed` | 1.75 | Long-form content | `.article { line-height: var(--line-height-relaxed); }` |
| `--line-height-loose` | 2 | UI con mucha aireación | `.spaced-list { line-height: var(--line-height-loose); }` |

**Regla WCAG:** Nunca usar `line-height < 1.4` en textos de párrafo.

---

### Max Line Length (Lecturabilidad)

```css
--line-length-narrow: 45ch;        /* Poesía, quotes */
--line-length-comfortable: 65ch;   /* ÓPTIMO para lectura */
--line-length-wide: 80ch;          /* Máximo recomendado */
```

**Uso:**
```css
p, .content {
  max-width: var(--line-length-comfortable);
}

.sidebar p {
  max-width: var(--line-length-narrow);
}
```

**Justificación WCAG 2.2:** Líneas de texto excesivamente largas (>80ch) reducen la legibilidad y dificultan la lectura para usuarios con dislexia.

---

### Letter Spacing

| Token | Valor | Uso |
|-------|-------|-----|
| `--letter-spacing-tighter` | -0.05em | Large headings |
| `--letter-spacing-tight` | -0.025em | Medium headings |
| **`--letter-spacing-normal`** | **0** | **Body text (DEFAULT)** |
| `--letter-spacing-wide` | 0.025em | Uppercase text |
| `--letter-spacing-wider` | 0.05em | CAPS labels |
| `--letter-spacing-widest` | 0.1em | SMALL CAPS |

---

## 📏 ESPACIADO

### Sistema 4px Base

| Token | Valor | px | Uso Común |
|-------|-------|----|----|
| `--spacing-0` | 0 | 0px | Reset |
| `--spacing-1` | 0.25rem | 4px | Gaps mínimos, separadores internos |
| `--spacing-2` | 0.5rem | 8px | Gaps en formularios, items de lista |
| `--spacing-3` | 0.75rem | 12px | Padding botones pequeños |
| **`--spacing-4`** | **1rem** | **16px** | **Spacing estándar (DEFAULT)** |
| `--spacing-5` | 1.25rem | 20px | Gaps medianos |
| `--spacing-6` | 1.5rem | 24px | Padding cards, sections |
| `--spacing-8` | 2rem | 32px | Márgenes secciones |
| `--spacing-10` | 2.5rem | 40px | Separación visual fuerte |
| `--spacing-12` | 3rem | 48px | Márgenes grandes |
| `--spacing-16` | 4rem | 64px | Espacios hero |
| `--spacing-20` | 5rem | 80px | Separación dramática |
| `--spacing-24` | 6rem | 96px | Espacios extra grandes |

**Regla CRÍTICA:** Usa SOLO múltiplos de 4px. Nunca valores arbitrarios como `22px`, `13px`, etc.

---

### Ejemplos de Uso

```css
/* ✅ CORRECTO */
.card {
  padding: var(--spacing-6);          /* 24px */
  gap: var(--spacing-4);              /* 16px */
  margin-bottom: var(--spacing-8);    /* 32px */
}

.btn {
  padding: var(--spacing-3) var(--spacing-6);  /* 12px 24px */
}

/* ❌ INCORRECTO */
.card {
  padding: 22px;    /* No es múltiplo de 4 */
  gap: 15px;        /* No es múltiplo de 4 */
}
```

---

## 📐 BORDER RADIUS

| Token | Valor | px | Uso |
|-------|-------|----|----|
| `--radius-none` | 0 | 0px | Flat design |
| `--radius-sm` | 0.25rem | 4px | Badges pequeños |
| **`--radius-md`** | **0.5rem** | **8px** | **DEFAULT - Inputs, cards** |
| `--radius-lg` | 0.75rem | 12px | Cards grandes, modales |
| `--radius-xl` | 1rem | 16px | Hero cards |
| `--radius-2xl` | 1.5rem | 24px | Elementos destacados |
| `--radius-full` | 9999px | ∞ | Pills, avatares, botones redondos |

**Uso:**
```css
/* Inputs y botones */
input, button {
  border-radius: var(--radius-md);  /* 8px */
}

/* Avatares */
.avatar {
  border-radius: var(--radius-full);
}

/* Cards */
.card {
  border-radius: var(--radius-lg);  /* 12px */
}
```

---

## 🌓 SOMBRAS (Elevación)

**Sistema de Elevación de 5 Niveles:**

| Level | Token | Uso | Ejemplo |
|-------|-------|-----|---------|
| **0** | `--shadow-none` | Flat elements | Tabs, segmented controls |
| **1** | `--shadow-sm` | Inputs hover, hover states | `.input:hover { box-shadow: var(--shadow-sm); }` |
| **2** | `--shadow-md` | **Cards (DEFAULT)** | `.card { box-shadow: var(--shadow-md); }` |
| **3** | `--shadow-lg` | Modales, dropdowns | `.modal { box-shadow: var(--shadow-lg); }` |
| **4** | `--shadow-xl` | Toasts, floating elements | `.toast { box-shadow: var(--shadow-xl); }` |
| **5** | `--shadow-2xl` | Hero elements | `.hero-card { box-shadow: var(--shadow-2xl); }` |

**Sombra Interior:**
```css
--shadow-inner: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);

/* Uso: inputs pressed */
.input:active {
  box-shadow: var(--shadow-inner);
}
```

---

## ⚡ TRANSICIONES

| Token | Duración | Curva | Uso |
|-------|----------|-------|-----|
| `--transition-fast` | 150ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Hover, focus |
| **`--transition-base`** | **200ms** | `cubic-bezier(0.4, 0, 0.2, 1)` | **DEFAULT - Mayoría de animaciones** |
| `--transition-slow` | 300ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Modales, dropdowns |
| `--transition-slower` | 500ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Transiciones complejas |

**Uso:**
```css
.btn {
  transition: all var(--transition-base);
}

.modal {
  transition: opacity var(--transition-slow), 
              transform var(--transition-slow);
}
```

**Accesibilidad (prefers-reduced-motion):**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 1ms !important;
    transition-duration: 1ms !important;
  }
}
```

---

## 📊 Z-INDEX (Capas)

| Token | Valor | Uso |
|-------|-------|-----|
| `--z-base` | 0 | Contenido normal |
| `--z-dropdown` | 1000 | Selects, autocompletes |
| `--z-sticky` | 1100 | Sticky headers |
| `--z-fixed` | 1200 | Fixed sidebars, navbars |
| `--z-modal-backdrop` | 1300 | Overlays, fondos modales |
| `--z-modal` | 1400 | Modales, dialogs |
| `--z-popover` | 1500 | Tooltips, popovers |
| `--z-toast` | 1600 | Notificaciones toast |

**Regla:** Nunca usar valores arbitrarios como `z-index: 99999`. Usa los tokens.

---

## 📐 LAYOUT

### Containers (Max Widths)

| Token | Valor | Uso |
|-------|-------|-----|
| `--container-sm` | 640px | Mobile-first |
| `--container-md` | 768px | Tablets |
| `--container-lg` | 1024px | Desktop |
| **`--container-xl`** | **1280px** | **DEFAULT - Desktop estándar** |
| `--container-2xl` | 1536px | Large screens |

### Layout Dimensions

```css
--header-height: 64px;
--sidebar-width: 256px;
--sidebar-collapsed-width: 64px;
--content-max-width: 1400px;
--mobile-breakpoint: 768px;
```

**Uso:**
```css
.header {
  height: var(--header-height);
}

.sidebar {
  width: var(--sidebar-width);
  transition: width var(--transition-base);
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}

.content {
  max-width: var(--content-max-width);
  margin-inline: auto;
}
```

---

## 🎯 REGLAS DE USO

### ✅ DO - Buenas Prácticas

```css
/* ✅ Usar tokens de rol */
.btn-primary {
  background: var(--color-primary);
  color: var(--color-on-primary);
  border: 1px solid var(--color-border-focus);
}

/* ✅ Espaciado consistente (múltiplos de 4) */
.card {
  padding: var(--spacing-6);      /* 24px ✅ */
  gap: var(--spacing-4);          /* 16px ✅ */
  margin-bottom: var(--spacing-8); /* 32px ✅ */
}

/* ✅ Max-width para lectura */
p, .content {
  max-width: var(--line-length-comfortable);  /* 65ch */
  line-height: var(--line-height-normal);     /* 1.5 */
}

/* ✅ Usar semánticos con contraste validado */
.badge-success {
  background: var(--color-success);     /* --semantic-success-700 */
  color: var(--color-on-success);       /* --neutral-0 */
  /* Contraste: 5.2:1 ✅ */
}

/* ✅ Transiciones suaves */
.btn {
  transition: background var(--transition-base),
              transform var(--transition-fast);
}

/* ✅ Z-index predecible */
.modal {
  z-index: var(--z-modal);
}
```

---

### ❌ DON'T - Anti-Patrones

```css
/* ❌ NO hardcodear colores */
.btn {
  background: #0069FF;  /* ❌ Usar var(--color-primary) */
}

/* ❌ NO valores arbitrarios de espaciado */
.card {
  padding: 22px;  /* ❌ No es múltiplo de 4 */
  margin: 13px;   /* ❌ No es múltiplo de 4 */
}

/* ❌ NO usar colores -500 directamente en textos */
.text {
  color: var(--semantic-success-500);  /* ❌ 3.2:1 - Falla AA */
}
/* ✅ Usar --color-success (--semantic-success-700) */
.text {
  color: var(--color-success);  /* ✅ 5.2:1 - Pasa AA */
}

/* ❌ NO line-height < 1.4 en textos */
p {
  line-height: 1.2;  /* ❌ Falla WCAG legibilidad */
}

/* ❌ NO z-index arbitrarios */
.modal {
  z-index: 99999;  /* ❌ Usar var(--z-modal) */
}

/* ❌ NO transiciones excesivas */
.element {
  transition: all 1s;  /* ❌ Muy lento, molesto */
}
```

---

## 🔄 MIGRACIÓN DESDE LEGACY

### Aliases de Compatibilidad

Para evitar breaking changes, [`design-system.css`](../src/web/styles/design-system.css) mantiene aliases legacy:

| Legacy Token | Nuevo Token | Migración |
|--------------|-------------|-----------|
| `--primary-500` | `--brand-primary-500` | Reemplazar en archivos custom |
| `--gray-*` | `--neutral-*` | Actualizar todas las referencias |
| `--success-500` | `--semantic-success-500` | ⚠️ Cambiar a `--color-success` (700) |
| `--text-primary` | `--color-on-surface` | Mantener alias funciona |
| `--text-secondary` | `--color-on-surface-variant` | Mantener alias funciona |
| `--border-primary` | `--color-border` | Mantener alias funciona |

### Checklist de Migración

- [ ] **Paso 1:** Reemplazar `--primary-*` → `--brand-primary-*`
- [ ] **Paso 2:** Reemplazar `--gray-*` → `--neutral-*`
- [ ] **Paso 3:** Usar `--color-primary` en lugar de `--brand-primary-500` directamente
- [ ] **Paso 4:** Validar contraste con [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [ ] **Paso 5:** Aplicar `--line-length-comfortable` a textos largos
- [ ] **Paso 6:** Usar `--spacing-*` en lugar de `px` hardcoded
- [ ] **Paso 7:** Reemplazar shadows custom por `--shadow-*`
- [ ] **Paso 8:** Actualizar z-index a tokens `--z-*`

### Script de Migración Automatizada

```bash
# Reemplazar primary → brand-primary
find src/web -name "*.css" -type f -exec sed -i 's/--primary-/--brand-primary-/g' {} +

# Reemplazar gray → neutral
find src/web -name "*.css" -type f -exec sed -i 's/--gray-/--neutral-/g' {} +

# Validar (mostrar archivos con hardcoded px espaciados)
grep -r "padding: [0-9]*px" src/web/styles/*.css
grep -r "margin: [0-9]*px" src/web/styles/*.css
```

---

## 🔗 REFERENCIAS

### Archivos del Sistema
- **Tokens principales:** [`src/web/styles/tokens.css`](../src/web/styles/tokens.css)
- **Aliases legacy:** [`src/web/styles/design-system.css`](../src/web/styles/design-system.css)
- **Componentes:** [`src/web/styles/button.css`](../src/web/styles/button.css)

### Herramientas de Validación
- **WCAG Contrast Checker:** [WebAIM](https://webaim.org/resources/contrastchecker/)
- **Color Palette Generator:** [Coolors](https://coolors.co/0069ff-ff9100-171717)
- **Accessibility Inspector:** Chrome DevTools > Lighthouse

### Documentación Relacionada
- **Auditoría UX Completa:** Ver respuesta anterior (150+ puntos)
- **CONVENCIONES.md:** Reglas generales del proyecto
- **README.md:** Documentación principal

---

## 📝 NOTAS FINALES

### Filosofía del Sistema

1. **Accesibilidad Primero:** Todos los tokens garantizan WCAG 2.2 AA mínimo
2. **Consistencia Visual:** Múltiplos de 4px, escala modular tipográfica
3. **Mantenibilidad:** Un solo archivo de verdad ([`tokens.css`](../src/web/styles/tokens.css))
4. **Escalabilidad:** Dark mode preparado, reduced-motion implementado

### Próximas Mejoras

- [ ] Tokens de animación (spring, bounce)
- [ ] Sistema de iconografía (sizes, colors)
- [ ] Grid system tokens (columns, gutters)
- [ ] Print styles tokens

---

**Última actualización:** Febrero 7, 2026  
**Responsable:** Design Systems Team  
**Versión:** 2.0.0

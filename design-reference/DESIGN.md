---
name: Naprocs Skill Intelligence
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#434655'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#4e45d5'
  on-secondary: '#ffffff'
  secondary-container: '#6860ef'
  on-secondary-container: '#fffbff'
  tertiary: '#005a82'
  on-tertiary: '#ffffff'
  tertiary-container: '#0074a6'
  on-tertiary-container: '#e4f2ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#e3dfff'
  secondary-fixed-dim: '#c3c0ff'
  on-secondary-fixed: '#100069'
  on-secondary-fixed-variant: '#372abf'
  tertiary-fixed: '#c9e6ff'
  tertiary-fixed-dim: '#89ceff'
  on-tertiary-fixed: '#001e2f'
  on-tertiary-fixed-variant: '#004c6e'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
  tabular-data:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system establishes a focused, high-precision environment tailored for institutional administrators, instructors, and career-driven students. The visual language merges modern enterprise SaaS utility with the structured clarity of an academic command center. 

The aesthetic is anchored in an elevated corporate modern style, utilizing controlled micro-elevations, crisp borders, and purposeful contrast. Interactions must feel deliberate, responsive, and trustworthy—eliminating cognitive clutter so that heavy operational flows like attendance reconciliation, student analytics, and curriculum scheduling remain frictionless.

## Colors

The color system is engineered to provide high data legibility, swift visual triaging, and hierarchical priority across administrative matrices.

### Core Functional Rules
- **Canvas & Surfaces:** The default application canvas utilizes `#F8FAFC`. Structured surfaces and cards sit on `#FFFFFF` bordered by `#E2E8F0`. High-density breakout modules or secondary panel tiers use `#F1F5F9`.
- **Text & Hierarchy:** Main headers and crucial data points rely on `#0F172A`. Body text, standard descriptions, and table rows use `#1E293B`, while metadata and secondary captions drop to `#64748B`.
- **Semantic Data States:**
  - **Success (Present / Completed):** Solid `#10B981` text and iconography paired with `#ECFDF5` container surfaces.
  - **Danger (Absent / Critical / Overdue):** Solid `#EF4444` paired with `#FEF2F2` containers.
  - **Warning (Late / Review / Pending):** Solid `#F59E0B` with `#FFFBEB` background tints.
  - **Informational (Excused / Scheduled):** Solid `#0EA5E9` with `#E0F2FE` background tints.
- Never use semantic color backgrounds without corresponding high-contrast foreground labels to guarantee WCAG AAA compliance across data dense grids.

## Typography

The type system blends the energetic structural geometry of Plus Jakarta Sans for titles and KPI metrics with the hyper-functional, neutral screen legibility of Inter for continuous interfaces.

### Application Rules
- **Tabular Numerics:** Enable `font-feature-settings: "tnum" 1` across all attendance counts, timestamps, percentage rates, and grade registers to ensure strict columnar vertical alignment.
- **Display Figures:** Metric card readouts use `display-lg` with tight tracking (`-0.02em`) to project confidence and instant scannability.
- **Labels & Microcopy:** Badges, role pills, and column keys utilize `label-sm` with slight uppercase treatment and tracking (`letter-spacing: 0.03em`) for immediate recognition.

## Layout & Spacing

The layout is built upon an adaptive desktop grid with a permanent collapsible operational frame:

- **Desktop (1280px+):** Employs a persistent 260px left sidebar (collapsible to 72px icon-only), fixed 64px header, and a 12-column fluid content area with `1.5rem` (`24px`) gutters and `2rem` (`32px`) canvas margins.
- **Tablet (768px - 1279px):** Sidebar collapses into a slide-over off-canvas navigation drawer. Content transitions to an 8-column layout with `1.5rem` gutters.
- **Mobile (< 768px):** Single-column stack. Main margin compresses to `1rem` (`16px`) with `1rem` gutters. Attendance registers shift from horizontal tables to card-based vertical timelines.

Grid nesting must maintain layout symmetry: primary KPI metrics span 3 columns on desktop, 4 on tablet, and full-width on mobile. Data grids and interactive attendance rosters reserve a minimum of 8 columns on desktop to preserve table cell readability.

## Elevation & Depth

Visual hierarchy uses crisp boundaries paired with layered, ambient depth rather than aggressive drop shadows.

- **Level 0 (Canvas Base):** Flat `#F8FAFC`, no shadow.
- **Level 1 (Card & Content Containers):** `#FFFFFF` surface enclosed with `1px solid #E2E8F0` and an ultra-subtle ambient lift: `0px 1px 3px 0px rgba(15, 23, 42, 0.05), 0px 1px 2px -1px rgba(15, 23, 42, 0.05)`.
- **Level 2 (Dropdowns, Popovers, Active Cards):** `0px 4px 6px -1px rgba(15, 23, 42, 0.07), 0px 2px 4px -2px rgba(15, 23, 42, 0.05)`.
- **Level 3 (Modals & Overlays):** Positioned against a `rgba(15, 23, 42, 0.4)` backdrop blur (`backdrop-filter: blur(4px)`) with `0px 20px 25px -5px rgba(15, 23, 42, 0.1), 0px 8px 10px -6px rgba(15, 23, 42, 0.08)`.

## Shapes

The design system standardizes on a balanced `0.5rem` (8px) base curvature to preserve geometric discipline while maintaining modern softness.

- **Inputs, Buttons, Dropdowns:** `0.5rem` (`rounded`)
- **Metric Cards, Modals, Content Panels:** `1rem` (`rounded-lg` / `rounded-xl` equivalent in scaled terms)
- **Status Pills, Avatars, QR Scanner Targets:** Full circular pills (`9999px`) for quick-glance status chips and student profile rings.

## Components

### Buttons
- **Primary:** Solid `#2563EB` background with `#FFFFFF` text. Hover shifts to `#1E40AF`. Active transitions to scale `0.98`. Focus ring: `2px solid #FFFFFF`, `4px solid #3B82F6`.
- **Secondary:** Outlined `#E2E8F0` with `#0F172A` text and `#FFFFFF` background. Hover triggers `#F1F5F9`.
- **Destructive:** Solid `#EF4444` background with `#FFFFFF` text, transitioning to `#DC2626` on hover.

### Status Indicators & Badges
- **Live / QR Attendance Pulse:** A compound circular indicator consisting of a central 8px solid dot surrounded by a concentric pulsing ring (`animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite`).
  - Active Session: `#10B981` dot with `#A7F3D0` pulse.
  - Idle/Standby: `#F59E0B` dot with `#FDE68A` pulse.
- **Attendance Chips:** Compact labels with `0.25rem` vertical and `0.625rem` horizontal padding. Present is `#ECFDF5` background with `#065F46` text; Absent is `#FEF2F2` background with `#991B1B` text.

### Data & Attendance Grid
- **Headers:** `#F8FAFC` background, `11px` uppercase typography (`label-sm`), subtle border divider at `#E2E8F0`.
- **Rows:** Alternating hover highlight with `#F8FAFC`. Active rows highlight with a left `3px` accent border in `#2563EB`. Cell padding is set strictly at `12px 16px` for dense scanning.

### Input Fields & Controls
- **Text Inputs:** Height of 40px, surface `#FFFFFF`, border `#CBD5E1`. On focus: border shifts to `#2563EB` with an ambient glow (`box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15)`).
- **Checkboxes & Radios:** Size is `16x16px`, corner radius `4px` for checkboxes and `50%` for radios. Unchecked state has a `#CBD5E1` border; checked state fills with `#2563EB` featuring crisp white vector marks.

### Cards & Metric Panels
- **Standard Card:** Pure `#FFFFFF` background, `1px solid #E2E8F0`, `1rem` (`16px`) inner padding, containing header action slots, metric value displays, and contextual trend indicators (e.g., `+4.2% from last week` in `#059669`).
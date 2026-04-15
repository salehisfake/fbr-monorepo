// apps/web/src/lib/tokens.ts
//
// Single source of truth for all design values.
// Import from here — not from individual component files.
//
// Palette hex lives in PALETTE below; `designTokensCss()` injects the same values
// as `:root` custom properties (see app/layout.tsx). CSS modules use `var(--fbr-*)`.

// ── Color palette (Tailwind zinc) ─────────────────────────────────────────────

const PALETTE = {
  'fbr-zinc-50':  '#fafafa',
  'fbr-zinc-100': '#f4f4f5',
  'fbr-zinc-200': '#e4e4e7',
  'fbr-zinc-300': '#d4d4d8',
  'fbr-zinc-400': '#9f9fa9',
  'fbr-zinc-500': '#71717b',
  'fbr-zinc-600': '#52525c',
  'fbr-zinc-700': '#3f3f46',
  'fbr-zinc-800': '#27272a',
  'fbr-white':    '#ffffff',
} as const

/** RGB components for #3f3f46 — keep aligned with fbr-zinc-700 */
const ZINC_700_RGB = '63, 63, 70'

export const INTERACTIVE = {
  HOVER_BG:  `rgba(${ZINC_700_RGB}, 0.06)`,
  ACTIVE_BG: `rgba(${ZINC_700_RGB}, 0.12)`,
} as const

export const COLORS = {
  ZINC_50:  PALETTE['fbr-zinc-50'],
  ZINC_100: PALETTE['fbr-zinc-100'],
  ZINC_200: PALETTE['fbr-zinc-200'],
  ZINC_300: PALETTE['fbr-zinc-300'],
  ZINC_400: PALETTE['fbr-zinc-400'],
  ZINC_500: PALETTE['fbr-zinc-500'],
  ZINC_600: PALETTE['fbr-zinc-600'],
  ZINC_700: PALETTE['fbr-zinc-700'],
  ZINC_800: PALETTE['fbr-zinc-800'],
  WHITE:    PALETTE['fbr-white'],

  // Semantic aliases (used across graph + UI)
  BLACK:    PALETTE['fbr-zinc-700'],
  MID:      PALETTE['fbr-zinc-500'],
  MIDLIGHT: PALETTE['fbr-zinc-400'],
  LIGHT:    PALETTE['fbr-zinc-300'],
  OFFWHITE: PALETTE['fbr-zinc-50'],
} as const

/**
 * Semi-transparent and effect tokens exposed as CSS variables.
 * Use in inline styles where `var(--fbr-*)` is valid.
 */
export const CV = {
  scrollbarThumb:    'var(--fbr-scrollbar-thumb)',
  zinc700FillMuted:  'var(--fbr-zinc-700-fill-muted)',
  interactiveHover:  'var(--fbr-interactive-hover)',
  interactiveActive: 'var(--fbr-interactive-active)',
} as const

/** Serializes PALETTE + derived alphas into a `:root { ... }` block for global injection. */
export function designTokensCss(): string {
  const hexLines = (Object.keys(PALETTE) as (keyof typeof PALETTE)[]).map(
    (k) => `  --${k}: ${PALETTE[k]};`,
  )
  return `:root {
${hexLines.join('\n')}
  --fbr-scrollbar-thumb: rgba(0, 0, 0, 0.35);
  --fbr-zinc-700-fill-muted: rgba(${ZINC_700_RGB}, 0.15);
  --fbr-interactive-hover: ${INTERACTIVE.HOVER_BG};
  --fbr-interactive-active: ${INTERACTIVE.ACTIVE_BG};
}
`
}

// ── Glass-morphism presets ────────────────────────────────────────────────────
// Each surface has a consistent background opacity and blur radius.
// Use glassStyle() to spread all three CSS properties at once — this ensures
// the WebkitBackdropFilter (Safari) prefix is never accidentally omitted.

export const GLASS = {
  WINDOW:   { bg: 'rgba(255, 255, 255, 0.8)', blur: 'blur(12px)'  },
  MENUBAR:  { bg: 'rgba(255,255,255,0.8)',  blur: 'blur(12px)'  },
  DROPDOWN: { bg: 'rgba(250,250,250,0.8)',  blur: 'blur(12px)' },
  /** Bottom-bar store flyout — portaled to body so backdrop samples the graph; needs lower fill + stronger blur to read */
  STORE_FLYOUT: { bg: 'rgba(250,250,250,0.62)', blur: 'blur(18px) saturate(1.1)' },
}

/** Returns the three CSS properties needed for a glass surface. Spread into a style object. */
export function glassStyle(preset: keyof typeof GLASS) {
  const { bg, blur } = GLASS[preset]
  return {
    background:           bg,
    backdropFilter:       blur,
    WebkitBackdropFilter: blur,
  }
}

// ── Z-index scale ─────────────────────────────────────────────────────────────

export const Z = {
  CONTENT:  2,
  TEXTURE:  8,      // paper/noise layers inside Window
  CHROME:   10,     // close button, panel chrome
  EDGE:     9990,   // Desktop right-edge hover zone
  MENUBAR:  9995,
  DROPDOWN: 10000,
  TOOLTIP:  10050,
}

// ── Border radius ─────────────────────────────────────────────────────────────

export const RADIUS = {
  SM:   '1px',
  MD:   '1px',
  LG:   '1px',
  PILL: '1px',
  FULL: '50%',
}

// ── Animation durations ───────────────────────────────────────────────────────

export const DURATION = {
  INSTANT:    '45ms',   // micro-interactions (close icon scale)
  FAST:       '120ms',  // content transitions (PostContent swap)
  NORMAL:     '200ms',  // zoom transitions
  SLOW:       '250ms',  // zoom-to-fit
  FILM_GRAIN: '420ms',  // film grain shift cycle
  ORB_RIPPLE: '3.8s',   // graph node ripple animation
  WINDOW_IN:  '220ms',  // window spawn spring
  WINDOW_OUT: '140ms',  // window close collapse — keep in sync with Window.tsx setTimeout
  STRIP_PAN:  '280ms',  // viewOffset translate (strip camera move)
}

// ── Responsive breakpoints (px) ───────────────────────────────────────────────

export const BREAKPOINTS = {
  MOBILE: 768,
}

// ── Layout constants (px) ─────────────────────────────────────────────────────

export const LAYOUT = {
  MENUBAR_HEIGHT: 36,
  /** Inset around the desktop window strip (px). */
  WINDOW_GAP:     12,
  /** Padding inside each mobile window carousel page (px). */
  WINDOW_GAP_MOBILE: 0,
  /**
   * Horizontal gap between adjacent desktop window panes (px).
   * Two panes + one gutter span `100vw - 2 * WINDOW_GAP`.
   */
  WINDOW_GUTTER:  12,
}

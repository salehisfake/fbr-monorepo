// apps/web/src/lib/tokens.ts
//
// Single source of truth for all design values.
// Import from here — not from individual component files.

// ── Color palette (Tailwind zinc) ─────────────────────────────────────────────

export const COLORS = {
  ZINC_50:  '#fafafa',
  ZINC_100: '#f4f4f5',
  ZINC_200: '#e4e4e7',
  ZINC_300: '#d4d4d8',
  ZINC_400: '#9f9fa9',
  ZINC_500: '#71717b',
  ZINC_600: '#52525c',
  ZINC_700: '#3f3f46',
  ZINC_800: '#27272a',
  WHITE:    '#ffffff',

  // Semantic aliases (used across graph + UI)
  BLACK:    '#3f3f46',  // zinc-700
  MID:      '#71717b',  // zinc-500
  MIDLIGHT: '#9f9fa9',  // zinc-400
  LIGHT:    '#d4d4d8',  // zinc-300
  OFFWHITE: '#fafafa',  // zinc-50
}

// ── Glass-morphism presets ────────────────────────────────────────────────────
// Each surface has a consistent background opacity and blur radius.
// Use glassStyle() to spread all three CSS properties at once — this ensures
// the WebkitBackdropFilter (Safari) prefix is never accidentally omitted.

export const GLASS = {
  WINDOW:   { bg: 'rgba(255, 255, 255, 0.9)', blur: 'blur(12px)'  },
  MENUBAR:  { bg: 'rgba(255,255,255,0.6)',  blur: 'blur(4px)'  },
  DROPDOWN: { bg: 'rgba(250,250,250,0.9)',  blur: 'blur(12px)' },
  /** Menubar store flyout — portaled to body so backdrop samples the graph; needs lower fill + stronger blur to read */
  STORE_FLYOUT: { bg: 'rgba(250,250,250,0.62)', blur: 'blur(18px) saturate(1.1)' },
  DOTS:     { bg: 'rgba(255,255,255,0.7)',  blur: 'blur(8px)'  },
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
  CAROUSEL: 9999,
  DROPDOWN: 10000,
  TOOLTIP:  10050,
}

// ── Border radius ─────────────────────────────────────────────────────────────

export const RADIUS = {
  SM:   '2px',   // small buttons (collapse)
  MD:   '3px',   // windows
  LG:   '4px',   // code blocks, images
  PILL: '20px',  // carousel dot container
  FULL: '50%',   // circular dots
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

// ── Interactive states ────────────────────────────────────────────────────────

export const INTERACTIVE = {
  HOVER_BG:  'rgba(63,63,70,0.06)',
  ACTIVE_BG: 'rgba(63,63,70,0.12)',
}

// ── Layout constants (px) ─────────────────────────────────────────────────────

export const LAYOUT = {
  MENUBAR_HEIGHT: 24,
  /** Inset around the desktop window strip (px). Mobile: padding inside each window carousel page. */
  WINDOW_GAP:     12,
  /**
   * Horizontal gap between adjacent desktop window panes (px).
   * Two panes + one gutter span `100vw - 2 * WINDOW_GAP`.
   */
  WINDOW_GUTTER:  12,
}

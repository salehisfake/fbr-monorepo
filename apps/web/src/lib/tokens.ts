// apps/web/src/lib/tokens.ts
//
// Single source of truth for all design values.
// Import from here — not from individual component files.
//
// Palette hex lives in PALETTE below; `designTokensCss()` injects the same values
// as `:root` custom properties (see app/layout.tsx). CSS modules use `var(--fbr-*)`.

// ── Color palette (Tailwind zinc) ─────────────────────────────────────────────

const PALETTE = {
  'fbr-zinc-50':  '#ffffff',
  'fbr-zinc-100': '#E7E7E7',
  'fbr-zinc-200': '#E7E7E7',
  'fbr-zinc-300': '#E7E7E7',
  'fbr-zinc-400': '#434343',
  'fbr-zinc-500': '#434343',
  'fbr-zinc-600': '#434343',
  'fbr-zinc-700': '#0C0C0C',
  'fbr-zinc-800': '#0C0C0C',
  'fbr-white':    '#ffffff',
} as const

export const INTERACTIVE = {
  HOVER_BG:  PALETTE['fbr-zinc-100'],
  ACTIVE_BG: PALETTE['fbr-zinc-200'],
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

/** Derived color tokens exposed as CSS variables. */
export const CV = {
  scrollbarThumb:    'var(--fbr-scrollbar-thumb)',
  zinc700FillMuted:  'var(--fbr-zinc-700-fill-muted)',
  interactiveHover:  'var(--fbr-interactive-hover)',
  interactiveActive: 'var(--fbr-interactive-active)',
} as const

/** Serializes PALETTE + derived colors into a `:root { ... }` block for global injection. */
export function designTokensCss(): string {
  const hexLines = (Object.keys(PALETTE) as (keyof typeof PALETTE)[]).map(
    (k) => `  --${k}: ${PALETTE[k]};`,
  )
  return `:root {
${hexLines.join('\n')}
  --fbr-scrollbar-thumb: ${PALETTE['fbr-zinc-500']};
  --fbr-zinc-700-fill-muted: ${PALETTE['fbr-zinc-300']};
  --fbr-interactive-hover: ${INTERACTIVE.HOVER_BG};
  --fbr-interactive-active: ${INTERACTIVE.ACTIVE_BG};
}
`
}

/** Global scrollbar look (Firefox + WebKit). Injected in <head> so it applies before paint. */
export function scrollbarCss(): string {
  const s = 'html.fbr-scrollbars, html.fbr-scrollbars *'
  return `
${s} {
  scrollbar-width: thin;
  scrollbar-color: var(--fbr-zinc-500) var(--fbr-white);
}

${s}::-webkit-scrollbar {
  width: 14px;
  height: 14px;
}

${s}::-webkit-scrollbar-track {
  background: var(--fbr-white);
  border-left: 1px solid var(--fbr-zinc-200);
}

${s}::-webkit-scrollbar-thumb {
  background: var(--fbr-zinc-500);
  border: 1px solid var(--fbr-zinc-700);
  min-height: 28px;
  border-radius: 0;
}

${s}::-webkit-scrollbar-thumb:hover {
  background: var(--fbr-zinc-700);
}

${s}::-webkit-scrollbar-corner {
  background: var(--fbr-white);
}

${s}::-webkit-scrollbar-button {
  display: block;
  width: 14px;
  height: 14px;
  background: var(--fbr-white);
  border-left: 1px solid var(--fbr-zinc-200);
  border-top: 1px solid var(--fbr-zinc-200);
}

${s}::-webkit-scrollbar-button:single-button:vertical:decrement,
${s}::-webkit-scrollbar-button:single-button:vertical:increment {
  border-bottom: 1px solid var(--fbr-zinc-200);
}
`.trim()
}

// ── Z-index scale ─────────────────────────────────────────────────────────────

export const Z = {
  CONTENT:  2,
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
  ORB_RIPPLE: '3.8s',   // graph node ripple animation
  WINDOW_IN:  '220ms',  // window spawn spring
  WINDOW_OUT: '140ms',  // window close collapse — keep in sync with Window.tsx setTimeout
}

// ── Responsive breakpoints (px) ───────────────────────────────────────────────

export const BREAKPOINTS = {
  MOBILE: 768,
}

// ── Layout constants (px) ─────────────────────────────────────────────────────

export const LAYOUT = {
  MENUBAR_HEIGHT: 36,
  /** Inset around the desktop viewer (px). */
  WINDOW_GAP:     12,
}

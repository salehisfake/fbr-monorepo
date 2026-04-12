// apps/web/src/components/desktop/Desktop.tsx
'use client'

import { useEffect, useState } from 'react'
import DexGraph from '@/components/graph/DexGraph'
import CarouselDots from './CarouselDots'
import Window from './Window'
import MenuBar from './MenuBar'
import {
  useLayoutStore,
  parsePostPath,
  postPathFromSlug,
} from './useLayoutStore'
import { COLORS, Z, RADIUS, BREAKPOINTS, LAYOUT, DURATION } from '@/lib/tokens'

/** Width of one desktop pane: two panes + gutter fill `100vw - 2*WINDOW_GAP`. */
function desktopPaneWidthCss(): string {
  const { WINDOW_GAP: inset, WINDOW_GUTTER: gutter } = LAYOUT
  return `calc((100vw - ${2 * inset}px - ${gutter}px) / 2)`
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < BREAKPOINTS.MOBILE)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

/**
 * On mount: syncs open post from `/posts/[slug]` (or legacy `?p=`), or `initialSlug` on `/`.
 * Browser back/forward uses the pathname; `/` clears windows (graph home).
 */
function useUrlSync(initialSlug?: string) {
  const openPost = useLayoutStore((s) => s.openPost)
  useEffect(() => {
    const url       = new URL(window.location.href)
    const legacyP   = url.searchParams.get('p')
    if (legacyP !== null && legacyP !== '') {
      const path = postPathFromSlug(legacyP)
      window.history.replaceState({ slug: legacyP }, '', path + window.location.hash)
    }

    const parsed = parsePostPath(window.location.pathname)
    if (parsed.kind === 'home') {
      if (initialSlug) openPost(initialSlug, { replace: true })
      return
    }
    openPost(parsed.slug, { replace: true })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handler = () => {
      const parsed = parsePostPath(window.location.pathname)
      if (parsed.kind === 'home') {
        useLayoutStore.setState({ windows: [], focusedId: null, viewOffset: 0, mobileActivePage: 0 })
        return
      }
      openPost(parsed.slug, { skipPushState: true })
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [openPost])
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false
  const el = target as HTMLElement
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true
  if (el.isContentEditable) return true
  return el.closest('[contenteditable="true"]') !== null
}

/**
 * Desktop only: ← / → move to the previous/next window (wraps). Same as changing
 * focused window — `focusWindow` also pans the strip when the target is off-screen.
 * Ignored while typing in inputs and when any modifier key is held.
 */
function DesktopKeyboardNav() {
  const focusAdjacent = useLayoutStore((s) => s.focusAdjacentWindow)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (useLayoutStore.getState().windows.length === 0) return
      if (isTypingTarget(e.target)) return
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        focusAdjacent(-1)
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        focusAdjacent(1)
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [focusAdjacent])

  return null
}

// ── Component ─────────────────────────────────────────────────────────────────

interface DesktopProps {
  initialSlug?: string
}

export default function Desktop({ initialSlug }: DesktopProps) {
  const isMobile = useIsMobile()
  useUrlSync(initialSlug)

  const windows         = useLayoutStore((s) => s.windows)
  const focusedId       = useLayoutStore((s) => s.focusedId)
  const viewOffset      = useLayoutStore((s) => s.viewOffset)
  const panelVisible    = useLayoutStore((s) => s.panelVisible)
  const panelCollapsed  = useLayoutStore((s) => s.panelCollapsed)
  const setPanelCollapsed = useLayoutStore((s) => s.setPanelCollapsed)
  const focusWindow     = useLayoutStore((s) => s.focusWindow)
  const closeWindow     = useLayoutStore((s) => s.closeWindow)

  const [showEdgeButton, setShowEdgeButton] = useState(false)

  const panelActive = panelVisible && !panelCollapsed && windows.length > 0

  if (isMobile) {
    return <MobileLayout />
  }

  // ── Desktop: horizontal window strip ─────────────────────────────────────

  return (
    <div
      style={{
        width:      '100vw',
        height:     '100vh',
        position:   'relative',
        overflow:   'hidden',
        paddingTop: `${LAYOUT.MENUBAR_HEIGHT}px`,
        boxSizing:  'border-box',
      }}
    >
      <MenuBar />
      <DesktopKeyboardNav />

      {/* Graph fills the full viewport behind windows */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <DexGraph enableWindowOffset={true} />
      </div>

      {/* Window strip — clips off-screen windows, translates to show active pair.
          Outer flex uses pointer-events: none so clicks pass through to the graph
          in the uncovered region (e.g. beside the strip when only one pane is open).
          Only each window cell re-enables pointer-events. */}
      <div
        style={{
          position:      'absolute',
          top:           LAYOUT.MENUBAR_HEIGHT + LAYOUT.WINDOW_GAP,
          left:          LAYOUT.WINDOW_GAP,
          right:         LAYOUT.WINDOW_GAP,
          bottom:        LAYOUT.WINDOW_GAP,
          overflow:      'hidden',
          zIndex:        Z.CHROME,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display:       'flex',
            gap:           `${LAYOUT.WINDOW_GUTTER}px`,
            width:         'max-content',
            height:        '100%',
            transform:     `translateX(calc(${-viewOffset} * (100vw - ${2 * LAYOUT.WINDOW_GAP}px + ${LAYOUT.WINDOW_GUTTER}px) / 2))`,
            transition:    `transform ${DURATION.STRIP_PAN} cubic-bezier(0.22, 1, 0.36, 1)`,
            pointerEvents: 'none',
          }}
        >
          {windows.map((w) => (
            <div
              key={w.id}
              style={{
                width:         desktopPaneWidthCss(),
                height:        '100%',
                flexShrink:    0,
                pointerEvents: panelActive ? 'auto' : 'none',
              }}
            >
              <Window
                node={w}
                isActive={focusedId === w.id}
                onFocus={() => focusWindow(w.id)}
                onClose={() => closeWindow(w.id)}
                alwaysVisible={false}
              />
            </div>
          ))}
          {/* Trailing graph slot: same width as a pane; clicks pass through to the graph */}
          {windows.length > 0 && (
            <div
              aria-hidden
              style={{
                width:         desktopPaneWidthCss(),
                height:        '100%',
                flexShrink:    0,
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
      </div>

      {/* Right-edge hover zone — collapse / restore the strip */}
      <div
        onMouseEnter={() => setShowEdgeButton(true)}
        onMouseLeave={() => setShowEdgeButton(false)}
        style={{
          position:      'fixed',
          top:           0,
          right:         0,
          width:         '28px',
          height:        '100%',
          zIndex:        Z.EDGE,
          pointerEvents: 'auto',
        }}
      >
        {showEdgeButton && (
          <button
            onClick={() => setPanelCollapsed(!panelCollapsed)}
            style={{
              position:       'absolute',
              top:            '50%',
              right:          '6px',
              transform:      'translateY(-50%)',
              width:          '20px',
              height:         '20px',
              background:     COLORS.OFFWHITE,
              border:         `1px solid ${COLORS.LIGHT}`,
              borderRadius:   RADIUS.SM,
              cursor:         'pointer',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       '9px',
              color:          COLORS.BLACK,
              fontFamily:     'var(--font-mplus), sans-serif',
              lineHeight:     1,
              padding:        0,
              boxShadow:      '0 1px 4px rgba(0,0,0,0.06)',
            }}
            title={panelCollapsed ? 'Show viewer' : 'Hide viewer'}
          >
            {panelCollapsed ? '←' : '→'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Mobile sub-component ──────────────────────────────────────────────────────

function MobileLayout() {
  const windows          = useLayoutStore((s) => s.windows)
  const focusedId        = useLayoutStore((s) => s.focusedId)
  const mobileActivePage = useLayoutStore((s) => s.mobileActivePage)
  const focusWindow      = useLayoutStore((s) => s.focusWindow)
  const closeWindow      = useLayoutStore((s) => s.closeWindow)

  const totalPages = 1 + windows.length

  return (
    <div
      style={{
        width:      '100vw',
        height:     '100vh',
        position:   'relative',
        overflow:   'hidden',
        paddingTop: `${LAYOUT.MENUBAR_HEIGHT}px`,
        boxSizing:  'border-box',
      }}
    >
      <MenuBar />
      {/* Carousel track: graph page + one page per open window */}
      <div
        style={{
          display:    'flex',
          width:      `${totalPages * 100}vw`,
          height:     '100%',
          transform:  `translateX(${-mobileActivePage * 100}vw)`,
          transition: `transform ${DURATION.STRIP_PAN} cubic-bezier(0.22, 1, 0.36, 1)`,
        }}
      >
        {/* Page 0: graph */}
        <div style={{ width: '100vw', height: '100vh', flexShrink: 0 }}>
          <DexGraph enableWindowOffset={false} />
        </div>

        {/* Pages 1+: one per open window */}
        {windows.map((w) => (
          <div
            key={w.id}
            style={{
              width:      '100vw',
              height:     '100vh',
              flexShrink: 0,
              padding:    LAYOUT.WINDOW_GAP,
              boxSizing:  'border-box',
            }}
          >
            <Window
              node={w}
              isActive={focusedId === w.id}
              onFocus={() => focusWindow(w.id)}
              onClose={() => closeWindow(w.id)}
              alwaysVisible={true}
            />
          </div>
        ))}
      </div>

      <CarouselDots />
    </div>
  )
}

// apps/web/src/components/desktop/Desktop.tsx
'use client'

import { useEffect, useState } from 'react'
import DexGraph from '@/components/graph/DexGraph'
import LayoutRenderer from './LayoutRenderer'
import CarouselDots from './CarouselDots'
import Window from './Window'
import MenuBar from './MenuBar'
import {
  useLayoutStore,
  getLeaves,
  getFocusedSlug,
} from './useLayoutStore'
import { COLORS } from '@/components/graph/graphConstants'

interface DesktopProps {
  /** Provided by SSR pages (e.g. /posts/[slug]) so the correct post opens on
   *  first paint before client-side URL parsing kicks in. */
  initialSlug?: string
}

export default function Desktop({ initialSlug }: DesktopProps) {
  const openPost        = useLayoutStore((s) => s.openPost)
  const root            = useLayoutStore((s) => s.root)
  const panelVisible    = useLayoutStore((s) => s.panelVisible)
  const panelCollapsed  = useLayoutStore((s) => s.panelCollapsed)
  const setPanelCollapsed = useLayoutStore((s) => s.setPanelCollapsed)
  const focusedSlug     = useLayoutStore(getFocusedSlug)

  const [isMobile,       setIsMobile]       = useState(false)
  const [showEdgeButton, setShowEdgeButton] = useState(false)

  // ── Responsive breakpoint ─────────────────────────────────────────────────

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── URL initialisation ────────────────────────────────────────────────────
  // On mount, read the ?p= query param or fall back to initialSlug or 'index'.
  // Use replaceState so the initial load does not add an extra history entry.

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const slug   = params.get('p') || initialSlug || 'index'
    openPost(slug, { replace: true })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Browser back / forward ────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      const slug = (e.state as { slug?: string } | null)?.slug || 'index'
      openPost(slug, { skipPushState: true })
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [openPost])

  // ── Derived layout values ─────────────────────────────────────────────────

  // Panel expands to 50vw for any non-index content, otherwise sits at 25vw.
  const isExpanded  = focusedSlug !== 'index'
  const viewerWidth = isExpanded ? '50vw' : '25vw'

  // Pointer events are disabled when the panel is logically hidden so the
  // graph underneath stays fully interactive. Window.tsx snaps visibility from
  // panelVisible (no transitions). clip-path is not used — it breaks backdrop-filter.
  const panelActive = panelVisible && !panelCollapsed && root !== null

  // ── Mobile: horizontal carousel ───────────────────────────────────────────

  if (isMobile) {
    return <MobileLayout />
  }

  // ── Desktop: fixed right-anchored panel ──────────────────────────────────

  return (
    <div
      style={{
        width:    '100vw',
        height:   '100vh',
        position: 'relative',
        overflow: 'hidden',
        paddingTop: '24px',
        boxSizing: 'border-box',
      }}
    >
      <MenuBar />
      {/* Graph fills the full viewport */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <DexGraph />
      </div>

      {/* Window panel — right-anchored */}
      <div
        style={{
          position:      'absolute',
          top:           20,
          right:         0,
          bottom:        0,
          width:         viewerWidth,
          maxWidth:      '50vw',
          zIndex:        10,
          overflow:      'hidden',
          boxSizing:     'border-box',
          pointerEvents: panelActive ? 'auto' : 'none',
        }}
      >
        {root && <LayoutRenderer node={root} />}
      </div>

      {/* Right-edge hover zone — collapse / restore the panel */}
      <div
        onMouseEnter={() => setShowEdgeButton(true)}
        onMouseLeave={() => setShowEdgeButton(false)}
        style={{
          position:      'fixed',
          top:           0,
          right:         0,
          width:         '28px',
          height:        '100%',
          zIndex:        9990,
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
              borderRadius:   '2px',
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
// Kept separate so the hook calls above are always for the desktop layout tree.

function MobileLayout() {
  const root             = useLayoutStore((s) => s.root)
  const focusedId        = useLayoutStore((s) => s.focusedId)
  const mobileActivePage = useLayoutStore((s) => s.mobileActivePage)
  const focusWindow      = useLayoutStore((s) => s.focusWindow)
  const closeWindow      = useLayoutStore((s) => s.closeWindow)

  const leaves     = getLeaves(root)
  const totalPages = 1 + leaves.length

  return (
    <div
      style={{
        width:    '100vw',
        height:   '100vh',
        position: 'relative',
        overflow: 'hidden',
        paddingTop: '24px',
        boxSizing: 'border-box',
      }}
    >
      <MenuBar />
      {/* Carousel track: graph page + one page per open window */}
      <div
        style={{
          display:    'flex',
          width:      `${totalPages * 100}vw`,
          height:     '100%',
          transform: `translateX(-${mobileActivePage * 100}vw)`,
        }}
      >
        {/* Page 0: graph */}
        <div style={{ width: '100vw', height: '100vh', flexShrink: 0 }}>
          <DexGraph />
        </div>

        {/* Pages 1+: one per open window */}
        {leaves.map((leaf) => (
          <div key={leaf.id} style={{ width: '100vw', height: '100vh', flexShrink: 0 }}>
            <Window
              node={leaf}
              isActive={focusedId === leaf.id}
              onFocus={() => focusWindow(leaf.id)}
              onClose={() => closeWindow(leaf.id)}
              alwaysVisible={true}
            />
          </div>
        ))}
      </div>

      <CarouselDots />
    </div>
  )
}

// apps/web/src/components/desktop/Desktop.tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import DexGraph from '@/components/graph/DexGraph'
import Window from './Window'
import MenuBar from './MenuBar'
import {
  useLayoutStore,
  parseContentPath,
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
  const openTag  = useLayoutStore((s) => s.openTag)
  useEffect(() => {
    const url       = new URL(window.location.href)
    const legacyP   = url.searchParams.get('p')
    if (legacyP !== null && legacyP !== '') {
      const path = postPathFromSlug(legacyP)
      window.history.replaceState({ slug: legacyP }, '', path + window.location.hash)
    }

    const parsed = parseContentPath(window.location.pathname)
    if (parsed.kind === 'home') {
      if (initialSlug) openPost(initialSlug, { replace: true })
      return
    }
    if (parsed.kind === 'tag') {
      openTag(parsed.tagSlug, { replace: true })
      return
    }
    openPost(parsed.slug, { replace: true })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handler = () => {
      const parsed = parseContentPath(window.location.pathname)
      if (parsed.kind === 'home') {
        useLayoutStore.setState({ windows: [], focusedId: null, viewOffset: 0, mobileActivePage: 0 })
        return
      }
      if (parsed.kind === 'tag') {
        openTag(parsed.tagSlug, { skipPushState: true })
        return
      }
      openPost(parsed.slug, { skipPushState: true })
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [openPost, openTag])
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
        paddingBottom: `${2 * LAYOUT.WINDOW_GAP + LAYOUT.MENUBAR_HEIGHT}px`,
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
          top:           LAYOUT.WINDOW_GAP,
          left:          LAYOUT.WINDOW_GAP,
          right:         LAYOUT.WINDOW_GAP,
          bottom:        2 * LAYOUT.WINDOW_GAP + LAYOUT.MENUBAR_HEIGHT,
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
              border:         `1px solid ${COLORS.ZINC_200}`,
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
  const focusGraphTail   = useLayoutStore((s) => s.focusGraphTail)
  const focusWindow      = useLayoutStore((s) => s.focusWindow)
  const closeWindow      = useLayoutStore((s) => s.closeWindow)
  const setMobileActivePage = useLayoutStore((s) => s.setMobileActivePage)

  const totalPages = 1 + windows.length
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)
  const touchDxRef = useRef(0)
  const touchDyRef = useRef(0)
  const swipeIntentRef = useRef<'none' | 'horizontal' | 'vertical'>('none')
  const [dragOffsetPx, setDragOffsetPx] = useState(0)

  const goToPage = useCallback((page: number) => {
    const clamped = Math.max(0, Math.min(page, windows.length))
    if (clamped === 0) {
      if (windows.length > 0) focusGraphTail()
      else setMobileActivePage(0)
      return
    }
    const w = windows[clamped - 1]
    if (w) focusWindow(w.id)
  }, [windows, focusWindow, focusGraphTail, setMobileActivePage])

  useEffect(() => {
    if (mobileActivePage <= windows.length) return
    goToPage(windows.length)
  }, [mobileActivePage, windows.length, goToPage])

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null
    touchStartYRef.current = e.touches[0]?.clientY ?? null
    touchDxRef.current = 0
    touchDyRef.current = 0
    swipeIntentRef.current = 'none'
    setDragOffsetPx(0)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return
    const currentX = e.touches[0]?.clientX
    const currentY = e.touches[0]?.clientY
    if (typeof currentX !== 'number') return
    if (typeof currentY !== 'number') return
    const dx = currentX - touchStartXRef.current
    const dy = currentY - touchStartYRef.current
    touchDxRef.current = dx
    touchDyRef.current = dy

    if (swipeIntentRef.current === 'none') {
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
      if (absDx < 8 && absDy < 8) return
      swipeIntentRef.current = absDx > absDy ? 'horizontal' : 'vertical'
    }

    if (swipeIntentRef.current === 'horizontal') {
      setDragOffsetPx(dx)
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (touchStartXRef.current === null) return
    if (swipeIntentRef.current !== 'horizontal') {
      touchStartXRef.current = null
      touchStartYRef.current = null
      touchDxRef.current = 0
      touchDyRef.current = 0
      swipeIntentRef.current = 'none'
      setDragOffsetPx(0)
      return
    }

    const threshold = Math.max(36, window.innerWidth * 0.14)
    const dx = touchDxRef.current

    let nextPage = mobileActivePage
    if (dx <= -threshold) nextPage = mobileActivePage + 1
    else if (dx >= threshold) nextPage = mobileActivePage - 1

    goToPage(nextPage)
    touchStartXRef.current = null
    touchStartYRef.current = null
    touchDxRef.current = 0
    touchDyRef.current = 0
    swipeIntentRef.current = 'none'
    setDragOffsetPx(0)
  }, [mobileActivePage, goToPage])

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        width:      '100vw',
        height:     '100vh',
        position:   'relative',
        overflow:   'hidden',
        paddingBottom: `${2 * LAYOUT.WINDOW_GAP + LAYOUT.MENUBAR_HEIGHT}px`,
        boxSizing:  'border-box',
      }}
    >
      <MenuBar isMobile />
      {/* Graph is a fixed background layer on mobile. */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <DexGraph enableWindowOffset={false} />
      </div>

      {/* Swipe track: page 0 is intentionally empty so the graph remains visible. */}
      <div
        style={{
          position:   'absolute',
          top:        0,
          left:       0,
          right:      0,
          bottom:     2 * LAYOUT.WINDOW_GAP + LAYOUT.MENUBAR_HEIGHT,
          zIndex:     Z.CHROME,
          display:    'flex',
          width:      `${totalPages * 100}vw`,
          height:     `calc(100% - ${2 * LAYOUT.WINDOW_GAP + LAYOUT.MENUBAR_HEIGHT}px)`,
          transform:  `translateX(calc(${-mobileActivePage * 100}vw + ${dragOffsetPx}px))`,
          transition: dragOffsetPx === 0
            ? `transform ${DURATION.STRIP_PAN} cubic-bezier(0.22, 1, 0.36, 1)`
            : 'none',
          pointerEvents: mobileActivePage === 0 ? 'none' : 'auto',
        }}
      >
        {/* Page 0: transparent on purpose (fixed graph lives behind). */}
        <div aria-hidden style={{ width: '100vw', height: '100%', flexShrink: 0 }} />

        {/* Pages 1+: one per open window */}
        {windows.map((w) => (
          <div
            key={w.id}
            style={{
              width:      '100vw',
              height:     '100%',
              flexShrink: 0,
              padding:    LAYOUT.WINDOW_GAP_MOBILE,
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
    </div>
  )
}

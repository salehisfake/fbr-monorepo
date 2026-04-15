// apps/web/src/components/desktop/Desktop.tsx
'use client'

import { useEffect, useState } from 'react'
import DexGraph from '@/components/graph/DexGraph'
import Window from './Window'
import MenuBar from './MenuBar'
import {
  useLayoutStore,
  parseContentPath,
  postPathFromSlug,
} from './useLayoutStore'
import { BREAKPOINTS, LAYOUT, Z } from '@/lib/tokens'

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
 * On mount: syncs open post from /posts/[slug] (or legacy ?p=), or initialSlug on /.
 * Browser back/forward uses pathname; / closes the current window.
 */
function useUrlSync(initialSlug?: string) {
  const openPost = useLayoutStore((s) => s.openPost)
  const openTag  = useLayoutStore((s) => s.openTag)

  useEffect(() => {
    const url     = new URL(window.location.href)
    const legacyP = url.searchParams.get('p')
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
        useLayoutStore.setState({ windows: [], focusedId: null })
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

interface DesktopProps {
  initialSlug?: string
}

export default function Desktop({ initialSlug }: DesktopProps) {
  const isMobile = useIsMobile()
  useUrlSync(initialSlug)

  const windows     = useLayoutStore((s) => s.windows)
  const focusWindow = useLayoutStore((s) => s.focusWindow)
  const closeWindow = useLayoutStore((s) => s.closeWindow)

  const NAV_RAIL_WIDTH = 46
  const NAV_GAP = 0
  const activeWindow = windows[0] ?? null
  const topInsetPx = isMobile ? 0 : LAYOUT.WINDOW_GAP
  const sideInsetPx = isMobile ? 0 : LAYOUT.WINDOW_GAP + NAV_RAIL_WIDTH + NAV_GAP
  const bottomInsetPx = isMobile ? 0 : LAYOUT.WINDOW_GAP
  const availableWidthCss = `calc(100vw - ${2 * sideInsetPx}px)`
  const availableHeightCss = `calc(100vh - ${topInsetPx + bottomInsetPx}px)`

  return (
    <div
      style={{
        width:      '100vw',
        height:     '100vh',
        position:   'relative',
        overflow:   'hidden',
      }}
    >
      {!isMobile && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: Z.MENUBAR,
          pointerEvents: 'auto',
        }}>
          <MenuBar />
        </div>
      )}

      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <DexGraph />
      </div>

      {activeWindow && (
        <div
          style={{
            position:      'absolute',
            top:           topInsetPx,
            left:          sideInsetPx,
            right:         sideInsetPx,
            bottom:        bottomInsetPx,
            zIndex:        Z.CHROME,
            pointerEvents: 'none',
            display:       'flex',
            alignItems:    'center',
            justifyContent:'flex-start',
          }}
        >
          <div
            style={{
              width:         `min(${availableWidthCss}, calc(${availableHeightCss} / 1.36))`,
              aspectRatio:   '1 / 1.36',
              maxWidth:      '100%',
              maxHeight:     '100%',
              pointerEvents: 'auto',
            }}
          >
            <Window
              node={activeWindow}
              onFocus={() => focusWindow(activeWindow.id)}
              onClose={() => closeWindow(activeWindow.id)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

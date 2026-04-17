'use client'

import GlassSurface from '@/components/GlassSurface'
import FBRLogo from '@/components/FBRLogo'
import { useLayoutStore } from './useLayoutStore'
import { COLORS, CV, DURATION, LAYOUT } from '@/lib/tokens'
import styles from './MenuBar.module.css'

interface MenuBarProps {
  isMobile?: boolean
}

export default function MenuBar({ isMobile = false }: MenuBarProps) {
  const windows             = useLayoutStore((s) => s.windows)
  const mobileActivePage    = useLayoutStore((s) => s.mobileActivePage)
  const setMobileActivePage = useLayoutStore((s) => s.setMobileActivePage)
  const focusWindow         = useLayoutStore((s) => s.focusWindow)
  const focusGraphTail      = useLayoutStore((s) => s.focusGraphTail)

  const totalDots = 1 + windows.length
  const mobilePageLabel = mobileActivePage === 0 ? 'Graph' : 'Viewer'
  const mobilePageCounter = `${Math.min(mobileActivePage + 1, totalDots)}/${totalDots}`

  const handleDotClick = (pageIndex: number) => {
    if (pageIndex === 0) {
      if (windows.length > 0) focusGraphTail()
      else setMobileActivePage(0)
      return
    }
    setMobileActivePage(pageIndex)
    const w = windows[pageIndex - 1]
    if (w) focusWindow(w.id)
  }

  return (
    <GlassSurface
      glass='MENUBAR'
      className={`${styles.bar} ${isMobile ? styles.barMobile : styles.barDesktop}`}
      style={{
        position: 'fixed',
        ...(isMobile
          ? {
              top: 0,
              left: 0,
              right: 0,
            }
          : {
              top: 0,
              left: 0,
              bottom: 0,
              width: `${LAYOUT.MENUBAR_HEIGHT}px`,
            }),
      }}
    >
      <div className={`${styles.brandRow} ${isMobile ? styles.brandRowMobile : styles.brandRowDesktop}`}>
        <FBRLogo />
        <span className={`${styles.brandTitle} ${isMobile ? '' : styles.brandTitleVertical}`}>FBR dex</span>
      </div>

      {isMobile && windows.length > 0 && (
        <div className={styles.mobilePager} aria-label='Mobile view pager'>
          <span className={styles.mobilePagerLabel}>{mobilePageLabel}</span>
          <div className={styles.dotsZone} role='tablist' aria-label='Switch view'>
            {Array.from({ length: totalDots }, (_, i) => {
              const isActive = mobileActivePage === i
              return (
                <button
                  key={i}
                  role='tab'
                  aria-selected={isActive}
                  aria-label={i === 0 ? 'Graph view' : `Window ${i}`}
                  onClick={() => handleDotClick(i)}
                  style={{
                    width:        isActive ? '34px' : '12px',
                    height:       '12px',
                    borderRadius: '2px',
                    background:   isActive ? COLORS.BLACK : CV.zinc700FillMuted,
                    border:       `1px solid ${COLORS.ZINC_200}`,
                    transition:   `width ${DURATION.FAST} ease`,
                    cursor:       'pointer',
                    padding:      0,
                    flexShrink:   0,
                  }}
                />
              )
            })}
          </div>
          <span className={styles.mobilePagerCount}>{mobilePageCounter}</span>
        </div>
      )}
    </GlassSurface>
  )
}

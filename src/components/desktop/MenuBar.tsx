'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { COLORS } from '@/components/graph/graphConstants'
import DitherOverlay from '@/components/DitherOverlay'
import { getFocusedSlug, useLayoutStore } from './useLayoutStore'
import { useMenuStore } from './useMenuStore'

const BAR_HEIGHT = 24

function formatDateTime(value: Date): string {
  const yyyy = value.getFullYear()
  const mm = String(value.getMonth() + 1).padStart(2, '0')
  const dd = String(value.getDate()).padStart(2, '0')
  const hh = String(value.getHours()).padStart(2, '0')
  const min = String(value.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

function MenuButton({
  id,
  label,
  isOpen,
  onOpen,
}: {
  id: string
  label: string
  isOpen: boolean
  onOpen: (id: string) => void
}) {
  return (
    <button
      onClick={() => onOpen(isOpen ? '' : id)}
      style={{
        height: BAR_HEIGHT - 2,
        border: 'none',
        background: isOpen ? 'rgba(0,0,0,0.08)' : 'transparent',
        color: COLORS.BLACK,
        padding: '0 9px',
        fontFamily: 'var(--font-mplus), sans-serif',
        fontSize: 11,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

function MenuItem({
  label,
  shortcut,
  checked = false,
  onClick,
}: {
  label: string
  shortcut?: string
  checked?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        border: 'none',
        background: 'transparent',
        color: COLORS.BLACK,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 14px',
        fontFamily: 'var(--font-mplus), sans-serif',
        fontSize: 11,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span>{checked ? `✓ ${label}` : label}</span>
      {shortcut ? <span style={{ color: COLORS.MID }}>{shortcut}</span> : <span />}
    </button>
  )
}

function MenuDivider() {
  return <div style={{ height: 1, background: COLORS.LIGHT, opacity: 0.8 }} />
}

export default function MenuBar() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [nowLabel, setNowLabel] = useState(() => formatDateTime(new Date()))
  const openMenu = useMenuStore((s) => s.openMenu)
  const setOpenMenu = useMenuStore((s) => s.setOpenMenu)
  const labelMode = useMenuStore((s) => s.labelMode)
  const setLabelMode = useMenuStore((s) => s.setLabelMode)
  const simPreset = useMenuStore((s) => s.simPreset)
  const setSimPreset = useMenuStore((s) => s.setSimPreset)
  const showDebugOverlay = useMenuStore((s) => s.showDebugOverlay)
  const setShowDebugOverlay = useMenuStore((s) => s.setShowDebugOverlay)

  const panelCollapsed = useLayoutStore((s) => s.panelCollapsed)
  const setPanelCollapsed = useLayoutStore((s) => s.setPanelCollapsed)
  const focusedId = useLayoutStore((s) => s.focusedId)
  const closeWindow = useLayoutStore((s) => s.closeWindow)
  const splitOpen = useLayoutStore((s) => s.splitOpen)
  const focusedSlug = useLayoutStore(getFocusedSlug)

  const safeFocusedSlug = focusedSlug || 'index'

  const logGraphData = () => window.dispatchEvent(new CustomEvent('fbr:graph-log-data'))
  const resetZoom = () => window.dispatchEvent(new CustomEvent('fbr:graph-reset-zoom'))
  const zoomToFit = () => window.dispatchEvent(new CustomEvent('fbr:graph-zoom-fit'))

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpenMenu(null)
    }
    window.addEventListener('mousedown', onMouseDown)
    return () => window.removeEventListener('mousedown', onMouseDown)
  }, [setOpenMenu])

  useEffect(() => {
    const tick = () => setNowLabel(formatDateTime(new Date()))
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [])

  const menuDropdown = useMemo(() => {
    const baseStyle: CSSProperties = {
      position: 'absolute',
      top: BAR_HEIGHT,
      minWidth: 180,
      border: `1px solid ${COLORS.LIGHT}`,
      background: 'rgba(250,250,250,0.9)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
      zIndex: 10000,
      overflow: 'hidden',
    }

    if (openMenu === 'view') {
      return (
        <div style={{ ...baseStyle, left: 0 }}>
          <MenuItem label='Focus hop' checked={labelMode === 'focus'} onClick={() => setLabelMode('focus')} />
          <MenuItem label='All' checked={labelMode === 'all'} onClick={() => setLabelMode('all')} />
          <MenuDivider />
          <MenuItem label='Reset zoom' shortcut='Ctrl+0' onClick={resetZoom} />
          <MenuItem label='Zoom to fit' shortcut='Ctrl+Shift+F' onClick={zoomToFit} />
        </div>
      )
    }

    if (openMenu === 'window') {
      return (
        <div style={{ ...baseStyle, left: 42 }}>
          <MenuItem label='Split window' shortcut='⇧click' onClick={() => splitOpen(safeFocusedSlug)} />
          <MenuItem
            label={panelCollapsed ? 'Expand panel' : 'Collapse panel'}
            onClick={() => setPanelCollapsed(!panelCollapsed)}
          />
          <MenuItem
            label='Close focused window'
            onClick={() => {
              if (focusedId) closeWindow(focusedId)
            }}
          />
        </div>
      )
    }

    if (openMenu === 'graph') {
      return (
        <div style={{ ...baseStyle, left: 98 }}>
          <MenuItem label='Calm' checked={simPreset === 'calm'} onClick={() => setSimPreset('calm')} />
          <MenuItem label='Balanced' checked={simPreset === 'balanced'} onClick={() => setSimPreset('balanced')} />
          <MenuItem label='Dynamic' checked={simPreset === 'dynamic'} onClick={() => setSimPreset('dynamic')} />
          <MenuDivider />
          <MenuItem label='Weighted' checked={true} />
          <MenuItem label='Fixed tags' checked={false} />
        </div>
      )
    }

    if (openMenu === 'dev') {
      return (
        <div style={{ ...baseStyle, left: 149 }}>
          <MenuItem
            label='Debug overlay'
            checked={showDebugOverlay}
            onClick={() => setShowDebugOverlay(!showDebugOverlay)}
          />
          <MenuItem label='Performance mode' checked={false} />
          <MenuDivider />
          <MenuItem label='Log graph data' onClick={logGraphData} />
        </div>
      )
    }

    if (openMenu === 'help') {
      return (
        <div style={{ ...baseStyle, left: 190 }}>
          <MenuItem
            label='Keyboard shortcuts'
            onClick={() => window.alert('Shift+Click node: split window\nClick node: replace focused window')}
          />
          <MenuDivider />
          <MenuItem label='About FBR' onClick={() => window.alert('FBR dex')} />
        </div>
      )
    }
    return null
  }, [
    openMenu,
    labelMode,
    setLabelMode,
    panelCollapsed,
    setPanelCollapsed,
    focusedId,
    closeWindow,
    splitOpen,
    safeFocusedSlug,
    simPreset,
    setSimPreset,
    showDebugOverlay,
    setShowDebugOverlay,
  ])

  return (
    <div
      ref={rootRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: BAR_HEIGHT,
        zIndex: 9995,
        borderBottom: `1px solid ${COLORS.LIGHT}`,
        background: `rgba(255,255,255,0.6)`,
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, opacity: 0.2 }}><DitherOverlay position='absolute' zIndex={1} strategy='screen' /></div>
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 2 }}>
        <span
          style={{
            fontFamily: 'var(--font-mplus), sans-serif',
            fontSize: 11,
            fontWeight: 700,
            color: COLORS.BLACK,
            marginRight: 10,
            padding: '0 6px',
          }}
        >
          FBR dex
        </span>
      </div>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2,
          fontFamily: 'var(--font-mplus), sans-serif',
          fontSize: 11,
          color: COLORS.MID,
          letterSpacing: '0.02em',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {nowLabel}
      </div>
      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <MenuButton id='view' label='View' isOpen={openMenu === 'view'} onOpen={(id) => setOpenMenu(id || null)} />
        <MenuButton id='window' label='Window' isOpen={openMenu === 'window'} onOpen={(id) => setOpenMenu(id || null)} />
        <MenuButton id='graph' label='Graph' isOpen={openMenu === 'graph'} onOpen={(id) => setOpenMenu(id || null)} />
        <MenuButton id='dev' label='Dev' isOpen={openMenu === 'dev'} onOpen={(id) => setOpenMenu(id || null)} />
        <MenuButton id='help' label='Help' isOpen={openMenu === 'help'} onOpen={(id) => setOpenMenu(id || null)} />
        {menuDropdown}
      </div>
    </div>
  )
}


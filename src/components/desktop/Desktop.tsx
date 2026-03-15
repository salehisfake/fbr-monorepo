// apps/web/src/components/desktop/Desktop.tsx
'use client'

import { useEffect } from 'react'
import DexGraph from '@/components/graph/DexGraph'
import WindowManager from './WindowManager'
import Taskbar from './Taskbar'
import { useWindowStore } from './useWindowStore'

interface DesktopProps {
  initialSlug?: string
}

export default function Desktop({ initialSlug }: DesktopProps) {
  const openWindow = useWindowStore((s) => s.openWindow)

  useEffect(() => {
    if (!initialSlug) return
    openWindow({
      type:    'post',
      slug:    initialSlug,
      title:   initialSlug,
      originX: typeof window !== 'undefined' ? window.innerWidth * 0.75  : 900,
      originY: typeof window !== 'undefined' ? window.innerHeight / 2 : 400,
    })
  }, [initialSlug])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <DexGraph />
      </div>
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        <WindowManager />
      </div>
      <Taskbar />
    </div>
  )
}
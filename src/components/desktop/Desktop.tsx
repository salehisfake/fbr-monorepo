// apps/web/src/components/desktop/Desktop.tsx
'use client'

import DexGraph from '@/components/graph/DexGraph'
import WindowManager from './WindowManager'
import Taskbar from './Taskbar'

export default function Desktop() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
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
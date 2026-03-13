// apps/web/src/components/desktop/WindowManager.tsx
'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useWindowStore } from './useWindowStore'
import Window from './Window'
import SnapPreview from './SnapPreview'
import type { SnapZone } from './snapUtils'

export default function WindowManager() {
  const { windows } = useWindowStore()
  const [snapPreview, setSnapPreview] = useState<SnapZone>(null)

  return (
    <>
      <SnapPreview zone={snapPreview} />
      <AnimatePresence>
        {windows.map((win) => (
          <Window
            key={win.id}
            win={win}
            onSnapPreview={setSnapPreview}
          />
        ))}
      </AnimatePresence>
    </>
  )
}
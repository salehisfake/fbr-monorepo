// apps/web/src/components/desktop/WindowManager.tsx
'use client'

import { AnimatePresence } from 'framer-motion'
import { useWindowStore } from './useWindowStore'
import Window from './Window'

export default function WindowManager() {
  const { windows } = useWindowStore()

  return (
    <AnimatePresence>
      {windows.map((win) => (
        <Window
          key={win.id}
          win={win}
        />
      ))}
    </AnimatePresence>
  )
}
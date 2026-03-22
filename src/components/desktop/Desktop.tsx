'use client'

import { useEffect, useRef, useState } from 'react'
import DexGraph from '@/components/graph/DexGraph'
import WindowManager from './WindowManager'
import Taskbar from './Taskbar'
import { useWindowStore } from './useWindowStore'

interface DesktopProps {
  initialSlug?: string
}

export default function Desktop({ initialSlug }: DesktopProps) {
  const openWindow = useWindowStore((s) => s.openWindow)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ active: boolean; startX: number; scrollStart: number }>({
    active: false,
    startX: 0,
    scrollStart: 0,
  })
  const [scrollX, setScrollX] = useState(0)
  const [maxScroll, setMaxScroll] = useState(1)
  const [vw, setVw] = useState(0)

  useEffect(() => {
    if (!initialSlug) return
    openWindow({
      type: 'post',
      slug: initialSlug,
      title: initialSlug,
      originX: window.innerWidth * 0.75,
      originY: window.innerHeight / 2,
    })
  }, [initialSlug, openWindow])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    document.body.style.cursor = 'grab'

    const update = () => {
      setVw(window.innerWidth)
      setMaxScroll(Math.max(el.scrollWidth - window.innerWidth, 1))
    }

    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollX(el.scrollLeft)
          ticking = false
        })
        ticking = true
      }
    }

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('button, a, input, [data-window], [data-interactive]')) return
      dragRef.current = {
        active: true,
        startX: e.clientX,
        scrollStart: el.scrollLeft,
      }
      document.body.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.active) return
      const delta = dragRef.current.startX - e.clientX
      el.scrollLeft = dragRef.current.scrollStart + delta
    }

    const handleMouseUp = () => {
      if (!dragRef.current.active) return
      dragRef.current.active = false
      document.body.style.cursor = 'grab'
      document.body.style.userSelect = ''
    }

    update()
    window.addEventListener('resize', update)
    el.addEventListener('scroll', handleScroll)
    el.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('resize', update)
      el.removeEventListener('scroll', handleScroll)
      el.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
    }
  }, [])

  const maxDrift = vw * 0.08
  const bgOffset = (scrollX / maxScroll) * maxDrift

  return (
    <div
      ref={scrollRef}
      style={{
        width: '100vw',
        height: '100vh',
        overflowX: 'scroll',
        overflowY: 'hidden',
        position: 'relative',
      }}
    >
      {/* Background: fixed to viewport, parallax drift only */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: vw > 0 ? vw + maxDrift : '100vw',
          height: '100vh',
          zIndex: 0,
          willChange: 'transform',
          transform: `translateX(${-bgOffset}px)`,
        }}
      >
        <DexGraph />
      </div>

      {/* Foreground: pointer events none, interactions handled by children */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        <WindowManager />
      </div>

      <Taskbar />
    </div>
  )
}
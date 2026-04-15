'use client'

import { useEffect } from 'react'

const ROOT_CLASS = 'fbr-scrollbars'

export default function ScrollbarStyles() {
  useEffect(() => {
    const root = document.documentElement
    root.classList.add(ROOT_CLASS)

    const styleEl = document.createElement('style')
    styleEl.setAttribute('data-fbr-scrollbar-styles', 'true')
    styleEl.textContent = `
      .${ROOT_CLASS} * {
        scrollbar-width: thin;
        scrollbar-color: var(--fbr-scrollbar-thumb) transparent;
      }

      .${ROOT_CLASS} *::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      .${ROOT_CLASS} *::-webkit-scrollbar-track {
        background: transparent;
      }

      .${ROOT_CLASS} *::-webkit-scrollbar-thumb {
        background: var(--fbr-scrollbar-thumb);
        border-radius: 0;
        border: none;
      }

      .${ROOT_CLASS} *::-webkit-scrollbar-button {
        display: none;
        width: 0;
        height: 0;
      }
    `

    document.head.appendChild(styleEl)

    return () => {
      root.classList.remove(ROOT_CLASS)
      styleEl.remove()
    }
  }, [])

  return null
}

'use client'

import { create } from 'zustand'

export type SimPreset = 'calm' | 'balanced' | 'dynamic'

interface MenuStore {
  openMenu: string | null
  simPreset: SimPreset
  showDebugOverlay: boolean

  setOpenMenu: (id: string | null) => void
  setSimPreset: (v: SimPreset) => void
  setShowDebugOverlay: (v: boolean) => void
}

export const useMenuStore = create<MenuStore>((set) => ({
  openMenu: null,
  simPreset: 'balanced',
  showDebugOverlay: false,

  setOpenMenu: (id) => set({ openMenu: id }),
  setSimPreset: (v) => set({ simPreset: v }),
  setShowDebugOverlay: (v) => set({ showDebugOverlay: v }),
}))


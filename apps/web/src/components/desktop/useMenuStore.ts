'use client'

import { create } from 'zustand'

export type LabelMode = 'focus' | 'all'
export type SimPreset = 'calm' | 'balanced' | 'dynamic'

interface MenuStore {
  openMenu: string | null
  labelMode: LabelMode
  simPreset: SimPreset
  showDebugOverlay: boolean

  setOpenMenu: (id: string | null) => void
  setLabelMode: (v: LabelMode) => void
  setSimPreset: (v: SimPreset) => void
  setShowDebugOverlay: (v: boolean) => void
}

export const useMenuStore = create<MenuStore>((set) => ({
  openMenu: null,
  labelMode: 'focus',
  simPreset: 'balanced',
  showDebugOverlay: false,

  setOpenMenu: (id) => set({ openMenu: id }),
  setLabelMode: (v) => set({ labelMode: v }),
  setSimPreset: (v) => set({ simPreset: v }),
  setShowDebugOverlay: (v) => set({ showDebugOverlay: v }),
}))


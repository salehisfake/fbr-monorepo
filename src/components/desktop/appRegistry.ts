// apps/web/src/components/desktop/appRegistry.ts
import type { ComponentType } from 'react'
import type { AppType, AppState } from './useLayoutStore'
import PostApp from './PostApp'

// Each entry maps an AppType to its React component and a title-getter.
// To add a new app: extend AppType + AppState in useLayoutStore.ts, create the
// component, and add it here — the window manager requires no other changes.

export interface AppRegistryEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTitle: (state: any) => string
}

export const APP_REGISTRY: Record<AppType, AppRegistryEntry> = {
  post: {
    component: PostApp,
    getTitle:  (state: AppState['post']) => state.slug.replace(/-/g, ' '),
  },
}

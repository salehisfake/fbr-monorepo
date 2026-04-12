// apps/web/src/components/desktop/AppHost.tsx
'use client'

import type { WindowItem } from './useLayoutStore'
import { APP_REGISTRY } from './appRegistry'

/** Looks up the right app component for a window item and renders it. */
export default function AppHost({ node }: { node: WindowItem }) {
  const { component: App } = APP_REGISTRY[node.appType]
  // appState is typed to match the component via APP_REGISTRY, cast needed here
  // because TypeScript can't narrow through the registry's Record<AppType, …>.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <App {...(node.appState as any)} />
}

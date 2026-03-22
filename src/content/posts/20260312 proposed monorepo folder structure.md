---
authors:
  - Saleh
  - Claude
categories:
  - DEV
projects: null
tags:
  - fbrapp
  - fbrDex
created: '2026-02-17T15:58'
updated: '2026-03-18T13:57'
pubDate: '2026-03-19'
title: 20260312 Proposed Monorepo Folder Structure
description: '> Full monorepo structure for the Next. js + Expo + tRPC + Supabase platform.'
---
# Suggested File \& Folder Structure

> Full monorepo structure for the Next.js + Expo + tRPC + Supabase platform.
> All paths are relative to the repository root.

---

```
/
├── apps/
│   ├── web/                                   ← Next.js 15 web platform
│   │   ├── app/
│   │   │   ├── layout.tsx                     ← Root layout (persistent shell, never remounts)
│   │   │   ├── page.tsx                       ← OS Desktop entry point (client component)
│   │   │   ├── not-found.tsx                  ← Global 404 page
│   │   │   ├── loading.tsx                    ← Global loading UI
│   │   │   │
│   │   │   ├── posts/
│   │   │   │   └── \[slug]/
│   │   │   │       ├── page.tsx               ← Static post page (server component)
│   │   │   │       └── opengraph-image.tsx    ← Auto-generated OG image per post
│   │   │   │
│   │   │   ├── tags/
│   │   │   │   └── \[tag]/
│   │   │   │       └── page.tsx               ← Static tag index page (server component)
│   │   │   │
│   │   │   └── api/
│   │   │       ├── graph/
│   │   │       │   └── route.ts               ← Static graph JSON endpoint
│   │   │       ├── posts/
│   │   │       │   └── \[slug]/
│   │   │       │       └── route.ts           ← Static post JSON endpoint
│   │   │       └── trpc/
│   │   │           └── \[trpc]/
│   │   │               └── route.ts           ← tRPC HTTP handler
│   │   │
│   │   ├── components/
│   │   │   │
│   │   │   ├── desktop/
│   │   │   │   ├── Desktop.tsx                ← Orchestrator — composes graph + windows
│   │   │   │   └── Taskbar.tsx                ← Open window list, global controls
│   │   │   │
│   │   │   ├── graph/
│   │   │   │   ├── DexGraph.tsx               ← D3 force graph (fires events only, no state)
│   │   │   │   ├── GraphControls.tsx          ← Zoom, filter, search UI
│   │   │   │   └── useGraphData.ts            ← Hook: fetches /api/graph.json
│   │   │   │
│   │   │   ├── windows/
│   │   │   │   ├── WindowManager.tsx          ← Renders all open windows from store
│   │   │   │   ├── Window.tsx                 ← react-rnd wrapper + OS chrome
│   │   │   │   ├── WindowTitleBar.tsx         ← Drag handle, min/max/close buttons
│   │   │   │   ├── WindowContent.tsx          ← Routes to correct app by window type
│   │   │   │   └── useWindowStore.ts          ← Zustand store: open, close, focus, resize
│   │   │   │
│   │   │   ├── apps/                          ← Content rendered inside windows
│   │   │   │   ├── PostContent.tsx            ← Renders fetched post HTML inside window
│   │   │   │   ├── SocialDashboard.tsx        ← Social interaction data app
│   │   │   │   └── SettingsApp.tsx            ← User preferences app
│   │   │   │
│   │   │   ├── post/
│   │   │   │   ├── PostLayout.tsx             ← Layout wrapper for standalone post pages
│   │   │   │   ├── PostHeader.tsx             ← Title, date, tags for post pages
│   │   │   │   └── PostNav.tsx                ← Previous / next post navigation
│   │   │   │
│   │   │   └── ui/                            ← Generic reusable UI primitives
│   │   │       ├── Button.tsx
│   │   │       ├── Badge.tsx
│   │   │       └── Spinner.tsx
│   │   │
│   │   ├── lib/
│   │   │   ├── trpc/
│   │   │   │   ├── client.ts                  ← tRPC client for web
│   │   │   │   └── provider.tsx               ← TRPCProvider wrapper
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts                  ← Supabase browser client
│   │   │   │   └── server.ts                  ← Supabase server client (Server Components)
│   │   │   └── utils.ts                       ← Shared utility functions
│   │   │
│   │   ├── hooks/
│   │   │   ├── useUrlWindowSync.ts            ← Syncs ?post=slug URL param with window store
│   │   │   └── useTheme.ts                    ← Dark/light mode
│   │   │
│   │   ├── styles/
│   │   │   └── global.css                     ← Tailwind v4 imports + custom theme tokens
│   │   │
│   │   ├── public/
│   │   │   ├── favicon.ico
│   │   │   ├── og-default.png                 ← Default Open Graph image
│   │   │   └── fonts/                         ← Self-hosted font files
│   │   │
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.ts
│   │   └── .env.local                         ← Never commit — see .env.example
│   │
│   └── mobile/                                ← Expo React Native app
│       ├── app/                               ← Expo Router file-based routing
│       │   ├── \_layout.tsx                    ← Root layout
│       │   ├── index.tsx                      ← Home screen
│       │   ├── post/
│       │   │   └── \[slug].tsx                 ← Post detail screen
│       │   └── social/
│       │       └── index.tsx                  ← Social dashboard screen
│       │
│       ├── components/
│       │   ├── PostCard.tsx
│       │   └── SocialFeed.tsx
│       │
│       ├── lib/
│       │   └── trpc/
│       │       └── client.ts                  ← tRPC client for mobile (same API, different transport)
│       │
│       ├── app.json
│       ├── eas.json                           ← EAS Build config for iOS + Android
│       └── tsconfig.json
│
├── packages/
│   │
│   ├── api/                                   ← tRPC router (shared by web + mobile)
│   │   ├── src/
│   │   │   ├── routers/
│   │   │   │   ├── posts.ts                   ← Post metadata queries
│   │   │   │   ├── graph.ts                   ← Graph node + edge queries
│   │   │   │   ├── social.ts                  ← Social platform interaction data
│   │   │   │   └── user.ts                    ← User preferences, bookmarks
│   │   │   ├── trpc.ts                        ← tRPC init, context, protectedProcedure
│   │   │   └── index.ts                       ← Root router (merges all routers)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── db/                                    ← Prisma schema + database utilities
│   │   ├── prisma/
│   │   │   ├── schema.prisma                  ← Single source of truth for DB schema
│   │   │   ├── migrations/                    ← Auto-generated migration history
│   │   │   └── seed.ts                        ← Seed script (runs sync-content internally)
│   │   ├── src/
│   │   │   └── index.ts                       ← Prisma client export
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── content/                               ← Markdown corpus + build tooling
│   │   ├── posts/                             ← All markdown content nodes
│   │   │   ├── my-first-post.md
│   │   │   ├── another-post.md
│   │   │   └── ...
│   │   ├── scripts/
│   │   │   ├── sync-content.ts                ← Upserts post metadata into DB at deploy
│   │   │   └── build-graph.ts                 ← Generates /api/graph.json from DB + content
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui/                                    ← Shared React components (web + mobile)
│   │   ├── src/
│   │   │   ├── Button.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── index.ts                       ← Barrel export
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── types/                                 ← Shared TypeScript types
│       ├── src/
│       │   ├── content.ts                     ← Post, Tag, GraphNode, GraphEdge types
│       │   ├── windows.ts                     ← Window, WindowType types
│       │   ├── social.ts                      ← SocialInteraction, Platform types
│       │   └── index.ts                       ← Barrel export
│       ├── package.json
│       └── tsconfig.json
│
├── scripts/
│   └── check-env.ts                           ← Validates required env vars before build
│
├── .github/
│   └── workflows/
│       ├── ci.yml                             ← Lint, typecheck, test on every PR
│       └── deploy.yml                         ← Deploy to Vercel on merge to main
│
├── .vscode/
│   ├── extensions.json                        ← Recommended extensions for the team
│   └── settings.json                          ← Shared editor settings
│
├── turbo.json                                 ← Turborepo pipeline config
├── pnpm-workspace.yaml                        ← pnpm monorepo workspace definition
├── package.json                               ← Root package.json (scripts only)
├── tsconfig.base.json                         ← Base TypeScript config extended by all packages
├── .env.example                               ← Template — copy to .env.local, never commit secrets
├── .gitignore
└── README.md
```


## Key Structural Decisions

|Decision|Rationale|
|-|-|
|`apps/web/components/` split by concern|Graph, windows, apps, and post components are entirely separate — no cross-contamination of concerns|
|`packages/content/` owns all markdown|Content is framework-agnostic, consumed by the sync script and independently versioned|
|`packages/api/` owns all tRPC routers|One router definition consumed identically by web and mobile — no duplication|
|`packages/types/` owns all shared types|Types flow from a single source into both apps, preventing drift|
|`packages/db/prisma/seed.ts` calls `sync-content`|One command seeds both the database and regenerates graph JSON|
|`hooks/useUrlWindowSync.ts` isolated|URL ↔ window state logic lives in one place, not scattered across components|
|`components/apps/` separate from `components/windows/`|The windowing chrome (drag, resize, titlebar) is decoupled from what renders inside the window|



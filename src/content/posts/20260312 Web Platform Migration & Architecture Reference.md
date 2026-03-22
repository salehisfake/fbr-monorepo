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
title: 20260312 Web Platform Migration & Architecture Reference
description: Astro → Next. js · Full Stack Platform Version 1.
---
# Platform Migration \& Architecture Reference

**Astro → Next.js · Full Stack Platform**
Version 1.0 · 2026
*Confidential — Internal Engineering Document*

---

# 1\. Why We Migrated

This document exists to capture the full rationale, architecture, and development practices for our migration from Astro to Next.js. It is intended as a living reference for all engineers working on the platform.

## 1.1 The Original Stack

The site began as a content-first project built on Astro 5 with a D3 force-directed graph as the primary navigation interface. Markdown files formed the content corpus, served as static HTML at build time. A React island handled the interactive graph and a DOMParser-based overlay rendered post content inline.

## 1.2 What Changed

The scope of the platform expanded significantly beyond a content site. Three new requirements made Astro the wrong long-term foundation:

* A live database-connected app for customer social platform interaction data, accessible inline on the site
* A persistent OS-style desktop interface with multiple draggable, resizable windows
* Standalone iOS and Android applications sharing business logic with the web platform

> \*\*Note:\*\* Astro has no native server runtime for live database queries, no story for sharing logic with a mobile app, and its zero-JS philosophy actively works against a platform where JavaScript IS the product.

## 1.3 Why Next.js

|Concern|Detail|
|-|-|
|Persistent shell|App Router layouts don't remount — window state, graph state and open panels survive navigation natively. Astro required URL param workarounds.|
|Live data|Server Components and API routes run at request time against a live database. No separate backend infrastructure needed.|
|Mobile sharing|React codebase shared with Expo. tRPC provides one end-to-end typed API consumed by both web and mobile.|
|Content at scale|generateStaticParams handles the markdown corpus with ISR — pages regenerate on demand, avoiding full rebuilds.|
|No philosophical tension|The entire platform is React. No island boundaries, no client:only workarounds, no mental model switching.|

---

# 2\. Core Technology Stack

## 2.1 Stack Overview

|Layer|Technology|Purpose|
|-|-|-|
|Web Framework|Next.js 15 (App Router)|Hybrid static + server rendered web platform|
|Mobile|Expo (React Native)|iOS and Android apps sharing logic with web|
|API Layer|tRPC|End-to-end typesafe API consumed by web and mobile|
|Database|Supabase (Postgres)|Primary data store + auth + real-time subscriptions|
|ORM|Prisma|Type-safe database queries, schema management, migrations|
|Auth|Supabase Auth|JWT-based authentication, row-level security|
|State (client)|Zustand|Window manager, graph state, UI state|
|Graph viz|D3.js v7|Force-directed content graph|
|Windowing|react-rnd|Draggable, resizable window components|
|Animation|Framer Motion|Window open/close/minimise transitions|
|Styling|Tailwind CSS v4|Utility-first styling throughout|
|Content|MDX + gray-matter|Markdown corpus with typed frontmatter|
|Monorepo|Turborepo|Shared packages across web and mobile|
|Deployment|Vercel|Web hosting, ISR, edge functions|

## 2.2 Monorepo Structure

The entire platform lives in a single Turborepo monorepo. This enables shared types, shared API client code, and shared UI components between the web and mobile applications.

```
apps/
  web/              ← Next.js web platform
  mobile/           ← Expo iOS + Android app
packages/
  api/              ← tRPC router definitions
  db/               ← Prisma schema + queries
  ui/               ← Shared React components
  types/            ← Shared TypeScript types
  content/          ← Markdown files + build scripts
```

> \*\*Note:\*\* The `packages/` directory is the critical advantage of the monorepo. Business logic, types, and API definitions written once are consumed identically by both the web app and the mobile app.

\---

# 3\. Data Architecture

The platform uses a hybrid data model. Static content lives in markdown files and is processed at build time. Dynamic, user-specific, and social data lives in the database and is fetched at runtime.

## 3.1 Where Data Lives

| Data Type                         | Location                    | Rationale                                                 |
| --------------------------------- | --------------------------- | --------------------------------------------------------- |
| Post body / content               | Markdown files (Git)        | Version controlled, fast static output, zero runtime cost |
| Post metadata (title, tags, slug) | Database (synced at deploy) | Queryable, relatable to users and social data             |
| Graph node relationships          | Database                    | Dynamic edge weights driven by user behaviour             |
| User accounts                     | Supabase Auth               | JWT tokens, row-level security policies                   |
| Social platform interactions      | Database                    | Live, API-ingested, real-time capable                     |
| User window state                 | Zustand (client memory)     | Ephemeral UI state, not persisted                         |
| User preferences                  | Database                    | Persisted across sessions and devices                     |

## 3.2 The Hybrid Content Model

Markdown files remain the canonical source of truth for post content. They are NOT moved into the database. Instead, a sync script runs at deploy time to upsert lightweight metadata records into Postgres, enabling content nodes to participate in relational queries against user data.

```ts
// scripts/sync-content.ts — runs as part of build pipeline
const posts = await getContentFiles('./content/posts')

for (const post of posts) {
  await db.post.upsert({
    where: { slug: post.slug },
    update: { title: post.title, tags: post.tags },
    create: { slug: post.slug, title: post.title, tags: post.tags }
  })
}
```

> \*\*Note:\*\* The post body never enters the database. Only slug, title, and tags are synced. This keeps the database lean and the static HTML output fast.

## 3.3 Data Flow Diagram

The following describes how data moves through the platform for the two primary surfaces:

### Static Content Pages (/posts/\[slug])

* Build time: gray-matter parses frontmatter from .md files
* generateStaticParams produces all static routes
* Next.js renders pure HTML — zero JavaScript, fully crawlable
* Vercel CDN caches and serves globally
* ISR regenerates individual pages on demand when content changes

### OS Desktop Interface (/)

* Client component mounts the full Desktop island
* D3 fetches /api/graph.json — pre-built at deploy time from content sync
* User clicks node → Zustand opens a Window
* Window fetches /api/posts/\[slug].json — static JSON endpoint
* Social data panel fetches live from tRPC → Supabase
* URL updates via history.pushState for shareability

\---

# 4\. Architecture \& API Overview

## 4.1 Next.js App Router Layout

Every route in the App Router declares its own rendering strategy. The OS desktop is a client component. All content pages are server components rendered statically.

```
app/
  layout.tsx              ← Root layout (persistent shell, never remounts)
  page.tsx                ← OS Desktop (client component)
  posts/
    \[slug]/
      page.tsx            ← Static post page (server component)
  tags/
    \[tag]/
      page.tsx            ← Static tag index (server component)
  api/
    graph/
      route.ts            ← Static graph JSON endpoint
    posts/
      \[slug]/
        route.ts          ← Static post JSON endpoint
    trpc/
      \[trpc]/
        route.ts          ← tRPC handler (live data)
```

## 4.2 tRPC API Layer

tRPC provides end-to-end type safety from the database to both the web and mobile clients. The router is defined once in `packages/api` and consumed identically in both apps.

### Router Structure

```
packages/api/src/routers/
  posts.ts       ← Post metadata queries
  graph.ts       ← Graph edge + node queries
  social.ts      ← Social platform interaction data
  user.ts        ← User preferences, bookmarks
  index.ts       ← Root router (merges all)
```

### Example: Social Data Router

```ts
export const socialRouter = router({
  getInteractions: protectedProcedure
    .input(z.object({ postSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.socialInteraction.findMany({
        where: { postSlug: input.postSlug, userId: ctx.user.id }
      })
    })
})
```

> \*\*Note:\*\* `protectedProcedure` automatically validates the Supabase JWT. Unauthenticated requests are rejected before reaching the database.

## 4.3 Static JSON Endpoints

Content data needed by the client-side graph and window system is pre-built as static JSON at deploy time. These files are cached at the CDN edge and served instantly — no database hit required.

|Endpoint|Purpose|
|-|-|
|/api/graph.json|All nodes and edges for the D3 graph. Rebuilt on every deploy from content sync.|
|/api/posts/\[slug].json|Rendered HTML + metadata for a single post. Used by the Window component to load content without page navigation.|

## 4.4 OS Desktop Architecture

The OS interface is composed of three independent concerns that communicate only through a shared Zustand store.

```
Desktop.tsx                ← Orchestrator, client component
  ├── DexGraph.tsx          ← D3 only, fires onNodeClick events
  ├── WindowManager.tsx     ← Renders all open windows
  │     └── Window.tsx      ← react-rnd wrapper + OS chrome
  │           └── WindowContent.tsx  ← Fetches + renders post/app
  └── Taskbar.tsx           ← Open window list, global controls
```

### Communication Pattern

* DexGraph fires `onNodeClick(node)` — knows nothing about windows
* Desktop passes `onNodeClick` to `windowStore.openWindow(node)`
* WindowManager reads `windowStore.windows` and renders each Window
* Window is fully self-contained — drag, resize, focus, close via store

### Zustand Window Store

```ts
interface WindowState {
  windows: Window\[]
  openWindow:  (node: Node) => void
  closeWindow: (id: string) => void
  focusWindow: (id: string) => void   // manages z-index stack
  minimise:    (id: string) => void
  maximise:    (id: string) => void
}
```

\---

# 5\. Database Schema

## 5.1 Core Tables

The Prisma schema defines the following core tables. Full schema lives in `packages/db/schema.prisma`.

### Post (content metadata only)

```prisma
model Post {
  id          String   @id @default(cuid())
  slug        String   @unique
  title       String
  tags        String\[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  interactions SocialInteraction\[]
  edges       GraphEdge\[]
}
```

### GraphEdge (dynamic relationships)

```prisma
model GraphEdge {
  id       String  @id @default(cuid())
  sourceId String
  targetId String
  weight   Float   @default(1.0)  // driven by shared behaviour
  source   Post    @relation('source', fields: \[sourceId], references: \[id])
  target   Post    @relation('target', fields: \[targetId], references: \[id])
}
```

### SocialInteraction

```prisma
model SocialInteraction {
  id        String   @id @default(cuid())
  userId    String
  postSlug  String
  platform  String   // 'twitter' | 'instagram' | etc
  type      String   // 'like' | 'share' | 'comment'
  data      Json
  createdAt DateTime @default(now())
  post      Post     @relation(fields: \[postSlug], references: \[slug])
}
```

\---

# 6\. Developer Environment Setup

## 6.1 Prerequisites

|Tool|Version|Notes|
|-|-|-|
|Node.js|v20 LTS or higher|Use nvm for version management|
|pnpm|v9+|Required — npm and yarn are not supported in this monorepo|
|Git|Latest||
|Supabase CLI|Latest|For local database + auth emulation|
|VS Code|Recommended|Install recommended extensions from .vscode/extensions.json|

## 6.2 First-Time Setup

Run the following commands in order after cloning the repository:

```bash
# 1. Install all dependencies across the monorepo
pnpm install

# 2. Copy environment variable templates
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env.local

# 3. Start local Supabase (runs Postgres + Auth + Studio)
supabase start

# 4. Push the database schema
pnpm db:push

# 5. Seed the database with content metadata
pnpm db:seed
```

## 6.3 Environment Variables

The following environment variables are required. Obtain values from the project lead or Supabase dashboard.

|Variable|Description|
|-|-|
|NEXT\_PUBLIC\_SUPABASE\_URL|Supabase project URL. Use http://localhost:54321 for local dev.|
|NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY|Supabase anonymous key. Safe to expose to the client.|
|SUPABASE\_SERVICE\_ROLE\_KEY|Server-only. Never expose to the client. Used in API routes only.|
|DATABASE\_URL|Postgres connection string. Provided by Supabase.|
|NEXT\_PUBLIC\_APP\_URL|Full public URL of the web app. Used for canonical URLs and OG tags.|

## 6.4 Daily Development Commands

|Command|Purpose|
|-|-|
|`pnpm dev`|Start all apps and packages in watch mode via Turborepo|
|`pnpm dev --filter=web`|Start only the Next.js web app|
|`pnpm dev --filter=mobile`|Start only the Expo mobile app|
|`pnpm build`|Production build of all apps|
|`pnpm db:studio`|Open Prisma Studio — visual database browser|
|`pnpm db:migrate`|Create and apply a new database migration|
|`pnpm db:seed`|Re-seed the database from markdown content|
|`pnpm lint`|Run ESLint across the monorepo|
|`pnpm typecheck`|Run TypeScript type checking across the monorepo|
|`pnpm test`|Run all tests|

\---

# 7\. Quick Start Application Overview

## 7.1 The Two Surfaces

The platform presents users with two distinct but connected surfaces. Understanding the difference is essential for knowing where to make changes.

### Surface 1: Static Content Pages

Routes: `/posts/\[slug]`, `/tags/\[tag]`, `/about`

* Rendered as pure HTML at build time — zero JavaScript shipped
* Fully crawlable by search engines with proper meta tags and canonical URLs
* Each post has its own URL, title, description, and Open Graph image
* These pages are the SEO foundation of the platform
* Files live in: `apps/web/app/posts/\[slug]/page.tsx`

### Surface 2: The OS Desktop

Route: `/`

* A fully client-side React application — the entire interactive OS lives here
* D3 force-directed graph as the primary navigation layer
* Clicking any node opens its content in a draggable, resizable window
* Multiple windows can be open simultaneously and arranged by the user
* URL updates to `/?post=slug` when a window is open, enabling direct links
* Files live in: `apps/web/app/page.tsx` + `components/desktop/`

## 7.2 Adding a New Content Node

Adding new content to the platform is a three-step process:

**1. Create the markdown file**

```markdown
# content/posts/my-new-post.md
---
title: My New Post
description: A short description for SEO and graph preview
tags: \[design, code]
date: 2026-03-12
---

Post body content here...
```

**2. Deploy — the sync script handles the rest**

On deploy, the content sync script automatically upserts the new post metadata into the database, regenerates `graph.json`, and creates the static post page and JSON endpoint.

**3. (Optional) Add explicit graph connections in frontmatter**

```markdown
---
connections: \[other-post-slug, another-post]
---
```

## 7.3 Adding a New Window App

The windowing system supports arbitrary React components as window content — not just markdown posts. To add a new app that opens in a window:

* Create the component in `components/apps/MyApp.tsx`
* Register it in the WindowContent router:

```ts
// components/windows/WindowContent.tsx
const apps = {
  'post':        PostContent,
  'social-dash': SocialDashboard,   // ← new app
  'settings':    SettingsApp,
}
```

* Open it programmatically from anywhere:

```ts
const { openWindow } = useWindowStore()
openWindow({ id: 'social-dash', type: 'social-dash', title: 'Social Dashboard' })
```

\---

# 8\. Pattern Documentation

## 8.1 Data Fetching Patterns

### Pattern: Static data in windows (content posts)

Always use the pre-built static JSON endpoint. Never fetch the full rendered HTML page.

```ts
// ✅ Correct
const post = await fetch(`/api/posts/${slug}.json`).then(r => r.json())

// ❌ Wrong — scrapes full HTML, fragile, slow
const html = await fetch(`/posts/${slug}`).then(r => r.text())
```

### Pattern: Live data in windows (social, user data)

Always use tRPC. Never call Supabase directly from client components.

```ts
// ✅ Correct — typesafe, auth handled automatically
const { data } = trpc.social.getInteractions.useQuery({ postSlug })

// ❌ Wrong — bypasses auth layer, no type safety
const { data } = supabase.from('interactions').select('\*')
```

## 8.2 Window Management Patterns

### Pattern: Opening a window

Always go through the Zustand store. Never manage window state locally in a component.

```ts
// ✅ Correct — centralised state
const { openWindow } = useWindowStore()
openWindow({ id: node.slug, type: 'post', title: node.title })
```

### Pattern: Preventing duplicate windows

The window store checks for existing IDs before opening:

```ts
openWindow: (node) => set(state => {
  if (state.windows.find(w => w.id === node.id)) {
    return focusWindow(node.id)  // bring existing window to front
  }
  return { windows: \[...state.windows, newWindow(node)] }
})
```

## 8.3 SEO Patterns

### Pattern: Static post pages

Every post page must export a `generateMetadata` function. Never hardcode meta values.

```ts
export async function generateMetadata({ params }) {
  const post = getPost(params.slug)
  return {
    title: post.title,
    description: post.description,
    openGraph: { title: post.title, images: \[post.ogImage] },
    alternates: { canonical: `/posts/${post.slug}` }
  }
}
```

### Pattern: Overlay URLs

When a window is open, the URL updates to `/?post=slug`. This overlay URL must declare a canonical pointing to the standalone post page to prevent duplicate content indexing.

```ts
// app/page.tsx — reads searchParams, sets canonical dynamically
export async function generateMetadata({ searchParams }) {
  if (searchParams.post) {
    return { alternates: { canonical: `/posts/${searchParams.post}` } }
  }
}
```

## 8.4 Component Boundaries

|Component|Type|Rule|
|-|-|-|
|app/posts/\[slug]/page.tsx|Server Component|No useState, no useEffect, no browser APIs|
|app/page.tsx (Desktop)|Client Component|Must be wrapped in Suspense|
|DexGraph.tsx|Client Component|D3 only — no data fetching, no window logic|
|WindowManager.tsx|Client Component|Reads from windowStore only — no direct fetch|
|Window.tsx|Client Component|react-rnd wrapper — no business logic|
|WindowContent.tsx|Client Component|Routes to correct app component by window type|

## 8.5 Code Quality Rules

The following rules are enforced by ESLint and should be followed in all new code:

* Never use `any` as a TypeScript type. Use `unknown` and narrow explicitly.
* Never call Supabase directly from a client component. Always use tRPC.
* Never fetch a full HTML page to extract content. Use the JSON endpoints.
* Never put business logic in `Window.tsx` or `DexGraph.tsx`. They are pure UI.
* Never commit `console.log` statements. Use the project logger utility.
* Always export `generateMetadata` from post and tag page components.
* Always handle loading and error states in window content components.

\---

# 9\. Migration Checklist

Use this checklist to track progress of the Astro to Next.js migration.

## Phase 1: Foundation

* \[ ] Initialise Turborepo monorepo
* \[ ] Create apps/web as Next.js 15 app
* \[ ] Configure Tailwind v4 in Next.js
* \[ ] Set up Supabase project and local dev environment
* \[ ] Configure Prisma schema and run initial migration
* \[ ] Implement tRPC router skeleton

## Phase 2: Content Migration

* \[ ] Copy markdown content corpus to packages/content
* \[ ] Implement generateStaticParams for all post pages
* \[ ] Implement generateMetadata for all post pages
* \[ ] Build content sync script (markdown → database metadata)
* \[ ] Build static JSON endpoints for graph and posts
* \[ ] Verify SEO output matches or exceeds Astro output

## Phase 3: OS Desktop

* \[ ] Migrate D3 graph component to Next.js client component
* \[ ] Implement Zustand window store
* \[ ] Implement react-rnd Window component
* \[ ] Implement WindowManager and WindowContent router
* \[ ] Connect graph node clicks to window store
* \[ ] Implement URL routing (?post=slug pattern)
* \[ ] Implement Framer Motion window animations

## Phase 4: Live Data

* \[ ] Implement Supabase Auth (sign up, sign in, JWT)
* \[ ] Implement social data ingestion pipeline
* \[ ] Build social dashboard window app component
* \[ ] Connect tRPC social router to Supabase

## Phase 5: Mobile

* \[ ] Initialise Expo app in apps/mobile
* \[ ] Configure tRPC client in Expo
* \[ ] Share packages/ui components where applicable
* \[ ] Implement core screens in React Native
* \[ ] Configure EAS Build for iOS and Android

\---

# 10\. Key Decisions Log

A record of significant architectural decisions and the reasoning behind them.

| Decision      | Chosen                                                                     | Rejected \& Why                                                                             |
| ------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Web framework | Next.js — native hybrid rendering, persistent layouts, no island tension   | Astro — no server runtime, fights platform scope; Gatsby — effectively abandoned by Netlify |
| Mobile        | Expo — React knowledge reuse, shared logic via monorepo, OTA updates       | Flutter — separate language (Dart), no code sharing; native — too costly                    |
| API layer     | tRPC — end-to-end type safety, one definition for web + mobile             | REST — no type safety across boundary; GraphQL — overkill for this scope                    |
| Database      | Supabase — Postgres + Auth + real-time in one platform, generous free tier | PlanetScale — no row-level security; Firebase — non-relational, harder to query             |
| Content in DB | Metadata only — slug, title, tags synced at deploy time                    | Full content in DB — adds runtime cost, loses version control, no benefit                   |
| Windowing     | react-rnd — drag + resize in one library, well maintained                  | Custom implementation — significant engineering cost for solved problem                     |
| Monorepo tool | Turborepo — fast, minimal config, excellent pnpm integration               | Nx — heavier, more complex for our scale                                                    |

\---

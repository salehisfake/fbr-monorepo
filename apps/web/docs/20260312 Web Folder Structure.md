---
authors:
  - Claude
categories:
projects:
tags:
  - fbrDex
created: 2026-02-17T15:58
updated: 2026-03-20T08:47
---
```
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── error.tsx
│   │   ├── global-error.tsx
│   │   ├── not-found.tsx
│   │   ├── favicon.ico
│   │   ├── opengraph-image.tsx
│   │   ├── sitemap.ts
│   │   ├── robots.ts
│   │   │
│   │   ├── (desktop)/
│   │   │   └── page.tsx
│   │   │
│   │   ├── (content)/
│   │   │   ├── layout.tsx
│   │   │   ├── posts/
│   │   │   │   └── [slug]/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── loading.tsx
│   │   │   │       ├── error.tsx
│   │   │   │       └── _components/
│   │   │   │           ├── PostHeader.tsx
│   │   │   │           └── PostNav.tsx
│   │   │   └── tags/
│   │   │       └── [tag]/
│   │   │           └── page.tsx
│   │   │
│   │   └── api/
│   │       ├── graph/route.ts
│   │       ├── posts/[slug]/route.ts
│   │       └── trpc/[trpc]/route.ts
│   │
│   ├── components/
│   │   ├── desktop/
│   │   ├── graph/
│   │   ├── windows/
│   │   ├── apps/
│   │   └── ui/
│   │
│   ├── lib/
│   ├── hooks/
│   └── styles/
│
├── public/
│   └── fonts/
│
├── next.config.ts
└── tsconfig.json

```

## Next.js and the App Router

Next.js is the web framework. Next.JS uses a routing system, where the folder structure inside `app/` directly determines the URLs of your site.

```
app/page.tsx              → yoursite.com/
app/posts/page.tsx        → yoursite.com/posts
app/posts/[slug]/page.tsx → yoursite.com/posts/anything-here
```

The square brackets `[slug]` mean that segment is dynamic — it matches any value, and that value gets passed into your component as a parameter.

### Special files

Next.js reserves certain filenames inside the `app/` folder. Each one does something specific:

- `layout.tsx`
	- wraps all pages inside that folder. Critically, it **never remounts** when you navigate between pages. This is how your OS shell stays alive.
- `page.tsx` 
	- the actual content of a route. Without this file, the route doesn't exist publicly. The `page.tsx` under `src\app\` is the index page. 
- `loading.tsx`
	- shown automatically while the page is loading. React Suspense handles this.
- `error.tsx` 
	- shown automatically when something throws an error.
- `not-found.tsx` 
	- shown when you call `notFound()` or a route doesn't exist.
- `route.ts` 
	- defines an API endpoint instead of a page.

### Route groups `(folder)`

Wrapping a folder name in parentheses creates a route group. The folder name is completely invisible to the URL — it's purely for organisation. The real power is that each route group can have its own `layout.tsx`, meaning different sections of your site can have entirely different chrome, headers, and shells.

```
app/
├── (desktop)/
│   └── page.tsx        → yoursite.com/  (no header, full-screen OS)
└── (content)/
    ├── layout.tsx       → wraps all content pages with header/footer
    └── posts/[slug]/
        └── page.tsx    → yoursite.com/posts/my-post
```

### Private folders `_folder`

Prefixing a folder with an underscore tells Next.js to completely ignore it for routing. It's a safe place to put components, utilities, or helpers that belong to a specific route but shouldn't be publicly accessible as pages.

### `src/` folder

Entirely optional. It just moves your application code one level deeper, keeping the root of your project clean — only config files like `next.config.ts` and `tsconfig.json` live at the root, while all your actual code lives inside `src/`.

---

## Server Components vs Client Components

This is probably the most important concept to understand in modern Next.js, and the most commonly confused.

By default, every component in the App Router is a **Server Component**. This means it runs on the server at build time or request time, and the user receives pure HTML. It can directly access the database, read files, fetch from APIs — but it cannot use `useState`, `useEffect`, or any browser APIs.

A **Client Component** is opted into by adding `'use client'` at the top of the file. It runs in the browser and can use all React hooks and browser APIs. But it cannot directly access the server.

tsx

```tsx
// Server Component — default, no directive needed
// Runs on server, can access DB, cannot use hooks
export default async function PostPage({ params }) {
  const post = await db.post.findUnique({ where: { slug: params.slug } })
  return <article>{post.content}</article>
}

// Client Component — needs directive
'use client'
// Runs in browser, can use hooks, cannot access DB
export default function WindowManager() {
  const [windows, setWindows] = useState([])
  return <div>{/* ... */}</div>
}
```

For your project specifically:

- All your content pages (`/posts/[slug]`) are Server Components — they produce pure HTML, are crawlable by Google, and ship zero JavaScript
- Your OS desktop (`/`) is a Client Component — it needs D3, drag and drop, window state, all of which require the browser

---

## Static vs Dynamic rendering

Next.js decides at build time whether a page should be:

- **Static** — rendered once at build time, cached forever, served instantly from a CDN. This is what your post pages should be.
- **Dynamic** — rendered fresh on every request, hitting the server each time. This is what live data pages need.

`generateStaticParams` tells Next.js which dynamic routes to pre-render at build time:

ts

```ts
export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map(post => ({ slug: post.slug }))
}
```

Next.js will call this at build time, get the list of all slugs, and pre-render a static HTML page for each one.

**ISR (Incremental Static Regeneration)** is a middle ground — pages start as static but can be regenerated in the background after a certain time, or on demand when content changes. For a large markdown corpus, this means you don't have to rebuild the entire site every time you add a post.

---

## The Database Layer

### Supabase

Supabase is a hosted Postgres database with extra features built on top — authentication, real-time subscriptions, and row-level security. You interact with it either through Prisma or their own client library.

### Prisma

Prisma is the ORM — the layer between your code and the database. Instead of writing raw SQL, you write TypeScript:

ts

```ts
// Instead of: SELECT * FROM posts WHERE slug = 'my-post'
const post = await db.post.findUnique({ where: { slug: 'my-post' } })
```

Prisma also manages your database schema. You define your tables in `schema.prisma`, run a migration command, and Prisma updates the actual database to match.

### The hybrid content model

Your markdown files are the canonical source of content. They never move into the database. Instead, at deploy time, a sync script reads all the frontmatter (title, tags, slug) from every markdown file and upserts lightweight records into Postgres. This means:

- Content body stays in Git — version controlled, fast to serve as static HTML
- Content metadata lives in the database — queryable, relatable to users and social data

The graph edges between nodes can then be stored in the database and weighted dynamically by user behaviour, rather than being hardcoded in frontmatter.

---

## The API Layer (tRPC)

tRPC is how your frontend talks to your backend for live data. It's an alternative to building a REST or GraphQL API, with one crucial advantage: complete TypeScript type safety from the database all the way to the component that displays the data.

Without tRPC, you'd define an API endpoint, return some JSON, and then separately define a TypeScript type on the frontend that you hope matches what the server actually returns. If the server changes, the frontend silently breaks.

With tRPC, there's one definition. The frontend knows exactly what types it will receive because it's literally reading the same type definitions as the server. If something changes, TypeScript tells you immediately everywhere it's broken.

ts

```ts
// Server defines the router once
const socialRouter = router({
  getInteractions: protectedProcedure
    .input(z.object({ postSlug: z.string() }))
    .query(({ input }) => db.socialInteraction.findMany(...))
})

// Client calls it with full type safety — no manual type definitions needed
const { data } = trpc.social.getInteractions.useQuery({ postSlug: 'my-post' })
// data is automatically typed correctly
```

The same tRPC router is consumed by both Next.js and Expo. Your mobile app calls the exact same API with the exact same types as your web app.

---

## The OS Interface

### Zustand

Zustand is a state management library. For your windowing system, it holds the array of currently open windows and all the operations you can do to them. Any component anywhere in the tree can read from or write to this store.

The reason this matters architecturally is that it decouples the graph from the windows. The D3 graph component doesn't need to know anything about windows — it just fires an event. The window store handles everything else.

### react-rnd

A React library that makes any element draggable and resizable. Each `Window` component in your OS interface is essentially a `react-rnd` wrapper with your OS chrome (title bar, close/minimise/maximise buttons) styled on top of it.

### D3

D3 is a data visualisation library that manipulates the DOM directly. In React, this creates a tension — React wants to own the DOM, D3 wants to own the DOM. The solution is to give D3 a single `<svg>` element via a `useRef`, and let D3 do whatever it wants inside that element while React ignores it.

The graph's only job is to render nodes and fire `onNodeClick` when a node is clicked. It knows nothing about windows, content, or routing. That separation is what makes the architecture maintainable.

### URL sync

When a window opens, the URL updates to `?post=my-post-slug` via `history.pushState`. This means:

- Users can copy and share a link to a specific open window
- The browser back button works naturally
- When someone visits that URL directly, the page loads and the window opens automatically

For SEO, this overlay URL declares a canonical tag pointing to the standalone post page — telling Google to index `/posts/my-post` rather than `/?post=my-post`.

---

## The Mobile App (Expo)

Expo is a framework on top of React Native, which lets you build iOS and Android apps using React. Because both Next.js and Expo use React, you can share a significant amount of code between them — particularly the tRPC client, TypeScript types, and some UI logic.

Expo Router mirrors Next.js's file-based routing, so the mental model translates directly. EAS Build is Expo's cloud build service that compiles your app into the actual `.ipa` and `.apk` files submitted to the App Store and Play Store.

---

## How it all connects

At runtime, this is what actually happens for each scenario:

**Google crawls a post:** Google visits `/posts/my-post` → Next.js serves pure static HTML generated at build time → Google indexes it fully with correct title, description, and canonical URL. Zero JavaScript involved.

**A user visits the site:** Browser loads `/` → Next.js serves the OS shell → React mounts the Desktop client component → D3 fetches the pre-built `graph.json` → the force graph renders with all content nodes.

**A user clicks a node:** `onNodeClick` fires → Zustand opens a new window → `WindowContent` fetches `/api/posts/my-post.json` (a static JSON file) → the post content renders inside the draggable window → URL updates to `/?post=my-post`.

**A user opens the social dashboard:** Window opens → `SocialDashboard` component mounts → tRPC query fires → Supabase returns live social interaction data → data renders in the window.

**A mobile user opens the app:** Expo app loads → tRPC client connects to the same API → same data, same types, no duplication.
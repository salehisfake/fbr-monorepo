---
authors:
  - Saleh
  - Claude
categories:
projects:
tags:
  - fbrDex
created: 2026-02-17T15:58
updated: 2026-03-20T08:47
---
In our site, we've got some route.ts files in `web/src/app/api`

# What are route.ts files?

`route.ts` is Next.js's way of creating an API endpoint.

When Next.js sees a file called `route.ts` inside the `app/` folder, it treats it as an API endpoint rather than a page. Instead of rendering HTML for a browser, it handles HTTP requests and returns data — usually JSON.

## The naming convention

The file conventions in Next.js work like this:

```
app/posts/[slug]/page.tsx     → renders a webpage at /posts/my-post
app/api/posts/[slug]/route.ts → handles API requests at /api/posts/my-post
```

`page.tsx` = a webpage a user visits in their browser `route.ts` = an API endpoint that returns data

## What's inside it

A `route.ts` file exports functions named after HTTP methods:

ts

```ts
// Handles GET requests
export async function GET(request: Request) {
  return Response.json({ message: "hello" })
}

// Handles POST requests
export async function POST(request: Request) {
  const body = await request.json()
  // do something with body
  return Response.json({ success: true })
}
```

When your browser or your React component makes a `fetch()` call to `/api/posts/my-post`, Next.js routes that request to the matching `route.ts` file and runs the `GET` function.

## Why it lives inside `app/`

Because Next.js uses the folder structure for everything — both pages and API endpoints follow the same file-based routing system. The `api/` folder name is just a convention to keep endpoints organised and separate from pages, but technically you could put a `route.ts` anywhere inside `app/`.


# Our route.ts files

We have two data endpoints under API right now that the interactive parts of the site will use at runtime.

## The post JSON endpoint (`/api/posts/[slug]`)

When a user clicks a node in your D3 graph, a window opens. That window needs to display the post content. Instead of loading the entire post page inside the window, it fetches just the data it needs from this endpoint.

It returns something like:

json

```json
{
  "slug": "my-first-post",
  "title": "My First Post",
  "description": "A short description",
  "pubDate": "2026-03-12",
  "tags": ["design", "code"],
  "html": "<article><h1>My First Post</h1><p>Body content...</p></article>"
}
```

Your `WindowContent` component fetches this and renders the `html` field directly inside the window. Clean, fast, no page navigation required.

## The graph endpoint (`/api/graph`)

This is what your D3 force graph reads to know what nodes and edges to draw. It returns every post as a node, and the relationships between posts as edges.

It returns something like:

json

```json
{
  "nodes": [
    { "id": "my-first-post", "title": "My First Post", "tags": ["design"] },
    { "id": "another-post", "title": "Another Post", "tags": ["design", "code"] }
  ],
  "edges": [
    { "source": "my-first-post", "target": "another-post" }
  ]
}
```

The edge between those two posts exists because they share the `design` tag. D3 reads this data and draws a line between them on the graph.

## Why JSON endpoints rather than just using the page directly

You already have the post pages at `/posts/[slug]` which render full HTML. You might wonder why you need a separate JSON endpoint.

The answer is that the full page includes everything — your layout, header, footer, navigation, fonts, CSS. If you loaded that inside a window you'd be loading two complete pages simultaneously, which is exactly the iframe problem we discussed earlier. The JSON endpoint returns only the raw data the window actually needs — nothing more.
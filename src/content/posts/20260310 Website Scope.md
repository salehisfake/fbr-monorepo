---
authors:
  - Saleh
categories:
  - journals
projects:
  - ROM-02281956
tags:
  - fbrDex
created: '2026-02-17T15:58'
updated: '2026-03-20T08:47'
pubDate: '2026-03-19'
title: 20260310 Website Scope
description: >-
  A SPA is a web application that loads only one HTML file and dynamically
  updates content using javascript without full page reloads.   Done correctly,
  this gives a fast, app-like interactive experience.
---
## Single-page applications (SPA)

A **SPA** is a web application that loads only one HTML file and dynamically updates content using javascript without full page reloads. 

Done correctly, this gives a fast, app-like interactive experience. Think Gmail, Facebook, Netflix, etc. Thinking of FBRdex as a SPA gives me a good starting point for addressing our existing issues. 

### SPA's: routing
A key aspect of SPA's is routing, that is using client-side routing to manage URL changes & navigation without server requests for new pages. 

### Issues with Existing System

#### *1. Initial load times and overall performance* 

This is probably due to D3 animations, poor structure and use of iframes. 

#### *2. SEO: Requires advanced handling (server-side rendering?)*

If content is stored in MDX/Markdown files in the repository that should make it somewhat crawlable by search engines, but for proper linking to site pages - we need the system to serve standard HTML pages. 

#### *3. Managing browser history/state* 

We need URL's to take you to the dex with the correct page shown on top.

Currently, the dex works by respondong to node clicks by opening it's associated link as a iframe over the graph. Going to the page link directly opens the page as a isolated thing. We don't want that. 

> Before we go into solving these problems, let's take a look at PostHogs implementation

# Posthog Case Study


## Technology #Stack
### Example: PostHog
My main source of reference is [PostHog](https://posthog.com/), The site is built as a static website using a modern JavaScript stack:

|Layer|Technology|Purpose|
|---|---|---|
|**Build System**|Gatsby 4.25.9|Static site generation, GraphQL data layer|
|**Frontend Framework**|React 18.2.0|UI component library|
|**Content Format**|MDX/Markdown|Documentation and handbook authoring|
|**Styling**|Tailwind CSS 3.4.14|Utility-first CSS framework|
|**Deployment**|Vercel|CDN hosting, preview deploys|
|**Package Manager**|Yarn 1.22.19|Dependency management|
|**Node Version**|22.x|Runtime environment|

### #SEO and content processing pipeline

*This is how Gatsby processes content for SEO while maintaining the OS interface*

#### Motivation

PostHog.com needs to maintain **SEO optimization** while presenting content through an interactive desktop OS interface. The challenge is that traditional single-page applications with complex JavaScript routing are difficult for search engines to crawl and index properly. The system must serve standard HTML pages for SEO while providing the rich OS experience for users.

#### Details

The solution uses **Gatsby's static site generation** to create SEO-friendly HTML pages while layering the OS interface on top. At build time, Gatsby processes MDX content files through the filesystem plugin and MDX plugin , converting them into static HTML pages. These pages are fully crawlable by search engines with proper meta tags and URLs.

When users visit the site, the Gatsby browser API wraps each page in the OS chrome through `wrapPageElement` , transforming the static page into an interactive window. The **Vercel routing configuration** maintains SEO by handling URL rewrites and redirects , ensuring clean URLs and preserving link equity while supporting the dynamic nature of the OS interface.

This hybrid approach gives PostHog the best of both worlds: excellent SEO performance from static generation plus the engaging desktop experience from the OS interface.


---

# Solving our issues

Basically we're implementing practices from more tried and tested SPA approaches:
### Replacing the iFrame with react-side content rendering 
When a node is clicked, fetch the post's rendered HTML (or markdown) via an API endpoint or pre-built JSON, and render it directly inside the popup `<div>` using `dangerouslySetInnerHTML` or a markdown renderer like `marked`. This keeps the graph alive while showing content inline -- true SPA behavior without the iframe overhead.

### URL-driven content overlay with SEO-friendly standalone pages

This is a well-established pattern (think Google Images: click an image, URL changes, overlay appears; visit that URL directly, same result; the underlying page is also crawlable standalone). 

That needs 3 things working together:

1. Standalone blog post pages (already exist, need SEO fixes)

The current `/posts/[...slug].astro` pages already render each post as a full, crawlable page. But the SEO component has broken placeholders (`site_name: "Your Site Name"`, empty OG description, hardcoded canonical `/current-page`). Each post page needs:

- Dynamic `<title>`, `<meta description>`, and Open Graph tags pulled from the post's frontmatter
- A correct canonical URL (`https://fbrrom.com/posts/my-post`)
- Proper internal linking (previous/next post, breadcrumbs, tag pages)

2. URL-driven graph overlay (needs building)

When a node is clicked on the graph:

- The URL changes to `/?post=my-post-slug` (or `/posts/my-post` with a special hash/param) using `history.pushState` -- no full page reload
- The slide-in panel renders the post content (fetched as HTML or pre-built JSON, not an iframe)
- Pressing back restores the clean `/` URL and closes the panel

When someone visits `/?post=my-post-slug` directly:

- The graph page loads
- On mount, it reads the query param, fetches that post's content, and opens the overlay automatically

3. Proper `<link>` relationships for SEO

The overlay URL (`/?post=my-post-slug`) should include a `<link rel="canonical">` pointing to the standalone post page (`/posts/my-post-slug`). This tells Google: "the real page is over there, don't index this overlay version." This way:

- Crawlers index the standalone `/posts/my-post-slug` pages (full SEO)
- Users on the graph get the interactive overlay experience
- No duplicate content penalty
### Changes Required

|Change|Scope|
|---|---|
|Fix SEO component to accept dynamic per-page title/description/canonical|Medium -- update `Seo.astro` + all layouts to pass props|
|Replace iframe with fetched HTML content in the popup|Medium -- modify `dexGraph.tsx` popup to use `fetch()` + `dangerouslySetInnerHTML`|
|Add `history.pushState` on node click to update URL|Small -- ~10 lines in `dexGraph.tsx`|
|Read URL params on graph mount to auto-open overlay|Small -- ~15 lines in `useEffect`|
|Add canonical link pointing overlay URLs to standalone pages|Small -- conditional `<link>` tag|
|Ensure standalone post pages have proper meta tags, structured data|Medium -- update `BlogLayout.astro`|

---

### What crawlers will see

- Googlebot visits `/posts/my-post` --> Full standalone HTML page with proper meta tags, crawlable content, internal links. Indexed normally.
- Googlebot visits `/?post=my-post` --> Graph page with `<link rel="canonical" href="/posts/my-post">`. Google consolidates this to the standalone page. No duplicate content.
- User clicks node on graph --> URL changes to `/?post=my-post`, panel slides in with content. Feels like an SPA. Back button works.
- User pastes `/?post=my-post` in browser --> Graph loads, overlay opens automatically with that post.
    
This is the same pattern used by Airbnb (listing overlays on map), Instagram (post overlays on grid), and Google Images. It's robust and SEO-safe.

---

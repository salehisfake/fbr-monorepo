---
authors: null
categories: null
projects: null
tags:
  - fbrDex
created: '2026-02-17T15:58'
updated: '2026-03-20T08:48'
pubDate: '2026-03-19'
title: 20260313 Node Click Data Flow
description: ''
---
```
DexGraph node click

→ openWindow({ type: 'post', slug, title })
→ Zustand store adds WindowItem 
→ WindowManager renders Window 
→ Window renders PostContent 
→ PostContent fetches /api/posts/[slug] 
→ renders HTML
```

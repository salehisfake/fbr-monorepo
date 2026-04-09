---
authors:
categories:
projects:
tags:
  - fbrDex
created: 2026-02-17T15:58
updated: 2026-03-20T08:48
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

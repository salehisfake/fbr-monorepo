---
authors:
  - Saleh
categories: null
projects: null
tags:
  - fbrDex
created: '2026-02-17T15:58'
updated: '2026-03-20T08:47'
pubDate: '2026-03-19'
title: 20260312 Monorepo Dependencies
description: "- PNPM \t- Alterative package manager better at managing packages for monorepos.  If the app and the site use the same packages, they only need downloading once \t\t- Use  into root monorepo to run everything on a localhost - Turbo \t- A high-performance build system for JavaScript/TypeScript monorepos."
---
- PNPM
	- Alterative package manager better at managing packages for monorepos. If the app and the site use the same packages, they only need downloading once
		- Use `pnpm dev` into root monorepo to run everything on a localhost
- Turbo
	- A high-performance build system for JavaScript/TypeScript monorepos. Located in the root, it defines task dependencies, caching rules, and parallelization settings to optimize build, lint, and test commands. It enables faster, incremental builds by tracking changes across packages.
- Typescript
	- Create "interfaces", which are rules that describe what components should look like for error management. 
- D3
	- Force-directed network graph, repurposed for site navigation
- Zustand
	- Small state management API in the React space. 
		- This will be used for managing an array of open windows

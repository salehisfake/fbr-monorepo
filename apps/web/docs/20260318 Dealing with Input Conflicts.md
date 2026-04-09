---
authors:
categories:
projects:
tags:
  - fbrDex
created: 2025-09-28T15:30
updated: 2026-03-20T08:48
---
We have 3 competing elements that share gestures: 

- The D3 graph (pan + zoom)
- The window content (scroll within)
- The window manager (horizontal pan)
	- This is the horizontal strip that windows live on

These all needs intuitive separation with the priority being mobile touch-based users. 

The core model is: **scroll is always local, drag is always global** (within window content). However, if windows are grabbable and repositionable, this breaks that pattern. It can be solved with making it a "long grab" to reposition a window, but I'm curious if this is necessary at all.

Dragging the window manager will also move the background graph at a slow rate, to suggest perspective. Rather than moving the site, we are moving our perspective left and right.

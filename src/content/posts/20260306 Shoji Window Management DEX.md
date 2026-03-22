---
authors:
  - arikami
categories:
  - designs
projects:
  - ROM-02281956
tags:
  - fbrDex
updated: '2026-03-17T19:59'
created: '2026-03-06T15:50'
pubDate: '2026-03-19'
title: 20260306 Shoji Window Management DEX
description: >-
  FBR DEX will be taking a novel approach to web where we are using applets and
  window management to display and interact with the site.   There will be
  single page application pagination where URL changes with object focus but
  page remains desktop with internally rendered objects/pages.
---
# FBR DEX Desktop Environment 

FBR DEX will be taking a novel approach to web where we are using applets and window management to display and interact with the site. 
There will be single page application pagination where URL changes with object focus but page remains desktop with internally rendered objects/pages.

## Stimuli x References
- Hyprland
- Quickshell
- Niri
- Linux Desktop Environments in General
- Posthog (for page-nation)

# Primary Components
- Panels
	- Handles
- Island (frame, bar, not sure name yet)
- Launcher
- Helper

# Mechanics

## Focus
Focus follows cursor. Cursor can be manipulated with shortcuts.
Focus is signified using transparency and handle darkness. 95% opacity when out of focus. Handle is also greyer when out of focus.

## Window Ordering and Spawning
When a new window is opened it opens to the right and pushes the desktop along to the left to enable focus.
New objects are always opened in focus unless opened with `ctrl + click` or `ctrl + return` 

Object opens to right -> desktop slides to left -> handle darkens -> opacity switches to focused state


---
created: '2026-02-12T17:30'
updated: '2026-02-23T12:57'
authors:
  - vy
tags:
  - fbrapp
  - UI
pubDate: '2026-03-19'
title: 20260212 FBR App Overview Of Pages
description: >-
  What the pages are and any requirements/ideas so far Where the feed and search
  page is.  The homepage is designed for the purpose of user discovery and
  exploration.
connections:
  - 20251125%20github%20interface%20case%20study
  - 20260212%20fbr%20app%20components%20masterpage
---
# Overview of Pages
What the pages are and any requirements/ideas so far

## Homepage
Where the feed and search page is. The homepage is designed for the purpose of user discovery and exploration.

Feed consists of content that the user follows, and content that is staff recommended aka 'spotlights'. We want something small (like a label or icon) to distinguish between content that is a spotlight vs followed content.

Search page might have three search views: a map view, a node and axis view, and tag view.
- Map view: for when users search up anything location-related. It will display triangulations between the coffee bean origin, roaster, and brewer
- Node and axis (graph) view: works the same way the graph view on the FBRDex works. Allows users to explore connections through to other things
- Tag view: while users are typing, the natural language they use converts to tags

![](searchpage.pdf)

![](Screenshot%202026-02-21%20at%209.13.32%20am.png)![](Screenshot%202026-02-21%20at%209.13.05%20am%201.png)



## Record
Page where data of a user's current brew session is uploaded from the mdot and displayed. Information recorded by the mdot includes: bean weight, water weight, brew time, bloom time, pour geometry, and location. 

The pour geometry is to look like a graph of where/hour the pour is happening.

People can also add in more information post-brew like equipment used, brew temperature, coffee specs (species, origin, age, roaster, darkness/roast profile), review of flavour profile, and notes.

Review of flavour profile is to be formatted as a pentagonal radar chart based on sweetness, acidity, body, mouthfeel, and clarity. 

![500](IMG_6036.jpg)

## Log
Page where all personal brew sessions of a user are stored. Taking inspiration from [Github's contribution heatmap](20251125%20Github%20Interface%20Case%20Study.md), the log could be formatted like a heatmap calendar. There will be a gradient colour scale to signify the amount of brew sessions a user has done in a day. For example, one brew will be green 1 while three or more brews will be green 3.

![](logpdf.pdf)

## Profile
Page displaying info on the user with customisable widgets. A default layout of a profile needs to be created. However, the user can choose to keep this view or customise their own layout by adding/removing or moving around widgets (this is where different views of [components](20260212%20FBR%20app%20Components%20Masterpage.md) comes into play).

Some requirements/direction for this page have been made:
- On a user's profile, there will be a smaller version of their Log (the heatmap calendar) similar to Github's heatmap
- Refer to Anilist profiles as they show a great example of a profile that showcases content/activity stats rather than being interaction focused
	- Notice that the content shown doesn't really allow for commenting/liking, rather it showcases user's favourites, activity history, spread of genres
	- ![](Screenshot%202026-02-23%20at%2012.42.54%20pm.png)

--- 

Next: [Components](20260212%20FBR%20app%20Components%20Masterpage.md)

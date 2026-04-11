// scripts/build-graph.ts
//
// Usage:  npx tsx scripts/build-graph.ts
//
// This script is the single entry point for keeping your content and graph in
// sync. It runs three steps in order:
//
//   1. syncFrontmatter — writes any derived / discovered fields (pubDate,
//      title, description, connections) back to each post's .md file on disk.
//      This replaces the old add-missing-pubdate.mjs script.
//
//   2. getAllPosts — re-reads all posts (with freshly-synced frontmatter) and
//      sorts them by date.
//
//   3. buildGraphData → graph.json — writes the D3-ready node/edge payload.
//
// Wire it up in package.json so it runs automatically:
//
//   "scripts": {
//     "prebuild":    "npx tsx scripts/build-graph.ts",
//     "predev":      "npx tsx scripts/build-graph.ts",
//     "build-graph": "npx tsx scripts/build-graph.ts"
//   }

import { getAllPosts, syncFrontmatter } from '../apps/web/src/lib/content'
import { buildGraphData } from '../apps/web/src/lib/graph'
import fs from 'fs'
import path from 'path'

async function main() {
  // ── Step 1: sync frontmatter on disk ──────────────────────────────────
  //
  // Load posts first so we can derive any missing fields, then write them
  // back to the source .md files before the graph is built.
  // This is safe to run repeatedly — existing values are never overwritten.

  console.log('⟳  Syncing frontmatter…')
  const postsForSync = await getAllPosts()
  await syncFrontmatter(postsForSync)

  // ── Step 2: reload with synced data ───────────────────────────────────
  //
  // Re-read from disk so the graph reflects the now-canonical frontmatter
  // (especially connections that were just written back).

  const posts = await getAllPosts()

  // ── Step 3: build and write graph.json ────────────────────────────────

  console.log('\n⟳  Building graph…')
  const { data: graphData, warnings } = buildGraphData(posts)

  for (const w of warnings) {
    if (w.code === 'BFS_ROOT_MISSING') {
      console.error(`\n✗  [${w.code}] ${w.message}`)
      process.exit(1)
    }
    console.warn(`   ⚠  [${w.code}]${w.sourceId ? ` (${w.sourceId})` : ''} ${w.message}`)
  }

  const outputPath = path.join(
    process.cwd(),
    'apps/web/public/graph.json'
  )

  fs.writeFileSync(outputPath, JSON.stringify(graphData, null, 2))

  console.log('\n✓  Graph built successfully')
  console.log(`   Nodes : ${graphData.nodes.length}`)
  console.log(`   Edges : ${graphData.edges.length}`)
  console.log(`   Output: ${outputPath}`)
}

main().catch(err => {
  console.error('✗  build-graph failed:', err)
  process.exit(1)
})
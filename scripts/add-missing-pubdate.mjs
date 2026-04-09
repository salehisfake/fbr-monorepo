// scripts/add-missing-pubdate.mjs

import fs from 'fs'
import path from 'path'

const CONTENT_DIR = path.join(
  'C:\\Users\\admin\\FBR\\FBR-WEBSITE-CODE\\FBRmonorepo\\apps\\web\\src\\content\\posts'
)
const TODAY = new Date().toISOString().split('T')[0]

const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'))

let updated = 0

for (const file of files) {
  const filePath = path.join(CONTENT_DIR, file)
  const content = fs.readFileSync(filePath, 'utf8')

  if (content.includes('pubDate:')) continue

  const updated_content = content.replace(
    /^---\n/,
    `---\npubDate: ${TODAY}\n`
  )

  fs.writeFileSync(filePath, updated_content, 'utf8')
  console.log(`Added pubDate to: ${file}`)
  updated++
}

console.log(`\nDone. Updated ${updated} files.`)
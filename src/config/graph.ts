// apps/web/src/config/graph.ts

export interface TagConfig {
  icon?: string
  description?: string
  subtags?: string[]
}

export const TAG_CONFIG: Record<string, TagConfig> = {
  "FBR Cafe": {
    icon: "icon-cafe.svg",
    description: "Coffee culture and cafe experiences",
    subtags: ["Coffee", "Food", "Events"]
  },
  "Cuts n Cups": {
    icon: "icon-cuts.svg",
    description: "Hair styling and grooming services",
    subtags: ["Recordings", "Events", "Bookings"]
  },
  "Design Faction": {
    icon: "icon-design.svg",
    description: "Creative design projects and visual identity"
  }
}

export function getParentTag(tag: string): string | null {
  for (const [parentName, config] of Object.entries(TAG_CONFIG)) {
    if (config.subtags?.some(s => s.toLowerCase() === tag.toLowerCase())) {
      return parentName
    }
  }
  return null
}

export function getParentTags(tag: string): string[] {
  const parent = getParentTag(tag)
  return parent ? [parent] : []
}

export function getTagConfig(tag: string): TagConfig | null {
  const entry = Object.entries(TAG_CONFIG).find(
    ([name]) => name.toLowerCase() === tag.toLowerCase()
  )
  return entry ? entry[1] : null
}
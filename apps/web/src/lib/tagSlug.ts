/** Normalizes a tag string to a URL/graph id token (matches `buildGraphData` tag ids). */
export function slugifyTag(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
}

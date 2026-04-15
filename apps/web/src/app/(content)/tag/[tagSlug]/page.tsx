import Desktop from '@/components/desktop/Desktop'
import { getAllPosts } from '@/lib/content'
import { formatTagDisplay } from '@/lib/formatTagDisplay'
import { slugifyTag } from '@/lib/tagSlug'

export async function generateMetadata({ params }: { params: Promise<{ tagSlug: string }> }) {
  const { tagSlug } = await params
  const canonical = slugifyTag(tagSlug)
  const label = formatTagDisplay(canonical)

  const posts = await getAllPosts()
  const taggedCount = posts.filter((p) =>
    (p.frontmatter.tags ?? []).some((t) => slugifyTag(t) === canonical),
  ).length

  const noteWord = taggedCount === 1 ? 'note' : 'notes'
  const title = `${label} — ${taggedCount} ${noteWord}`
  const description = `Index of ${taggedCount} ${noteWord} tagged ${label}.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  }
}

export default function TagPage() {
  return <Desktop />
}

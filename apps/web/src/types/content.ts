export interface PostFrontmatter {
  title: string
  description: string
  tags: string[]
  pubDate: string
  connections?: string[]
}

export interface Post {
  slug: string
  frontmatter: PostFrontmatter
  content: string
}


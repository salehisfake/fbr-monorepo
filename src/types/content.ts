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

export interface GraphNode {
  id: string
  title: string
  tags: string[]
}

export interface GraphEdge {
  source: string
  target: string
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}
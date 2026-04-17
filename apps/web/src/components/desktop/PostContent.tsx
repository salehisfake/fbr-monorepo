// apps/web/src/components/desktop/PostContent.tsx
'use client'

import styles from './PostContent.module.css'
import { usePost } from './usePost'
import { MDXRemote } from 'next-mdx-remote'
import ContactForm from '@/components/forms/ContactForm'
import NewsletterForm from '@/components/forms/NewsletterForm'
import EmbeddedStore from '@/components/store/EmbeddedStore'
import Link from 'next/link'
import { formatTagDisplay } from '@/lib/formatTagDisplay'
import { slugifyTag } from '@/lib/tagSlug'
import { postPathFromSlug, tagPathFromSlug } from './useLayoutStore'

const mdxComponents = {
  ContactForm,
  NewsletterForm,
  EmbeddedStore,
}

/** Display title for a connection slug (linked post). */
function formatConnectionTitle(slug: string): string {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export default function PostContent({ slug }: { slug: string }) {
  const { post, isLoading, isVisible, error } = usePost(slug)

  if (isLoading && !post) {
    return <div className={styles.stateMessage}>Loading...</div>
  }

  if ((error && !post) || !post) {
    return <div className={styles.stateMessage}>Could not load post.</div>
  }

  return (
    <div className={styles.root}>
      <div className={`${styles.inner} ${isVisible ? styles.contentVisible : styles.contentHidden}`}>
        <p className={styles.title}>{post.title}</p>

        <div className={styles.postContent}>
          <MDXRemote {...post.mdxSource} components={mdxComponents} />
        </div>

        {(post.tags.some((t) => slugifyTag(t)) ||
          post.connections.filter(Boolean).length > 0) && (
          <section className={styles.metaSection} aria-label="Tags and related posts">
            {post.tags.some((t) => slugifyTag(t)) && (
              <ul className={styles.tagList}>
                {post.tags.map((t) => {
                  const tagSlug = slugifyTag(t)
                  if (!tagSlug) return null
                  return (
                    <li key={tagSlug}>
                      <Link href={tagPathFromSlug(tagSlug)} className={styles.tagChip}>
                        {formatTagDisplay(t)}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}

            {post.connections.filter(Boolean).length > 0 && (
              <ul className={styles.connectionList}>
                {post.connections.filter(Boolean).map((connSlug) => (
                  <li key={connSlug}>
                    <Link href={postPathFromSlug(connSlug)} className={styles.connectionLink}>
                      {formatConnectionTitle(connSlug)}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

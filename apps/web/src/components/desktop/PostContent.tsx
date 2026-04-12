// apps/web/src/components/desktop/PostContent.tsx
'use client'

import styles from './PostContent.module.css'
import { usePost } from './usePost'
import { MDXRemote } from 'next-mdx-remote'
import ContactForm from '@/components/forms/ContactForm'
import NewsletterForm from '@/components/forms/NewsletterForm'
import PreorderCTA from '@/components/store/PreorderCTA'

const mdxComponents = {
  ContactForm,
  NewsletterForm,
  PreorderCTA,
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
        <p className={styles.meta}>
          {new Date(post.pubDate).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
          {post.tags.length > 0 && ` · ${post.tags.join(', ')}`}
        </p>

        <div className={styles.postContent}>
          <MDXRemote {...post.mdxSource} components={mdxComponents} />
        </div>
      </div>
    </div>
  )
}

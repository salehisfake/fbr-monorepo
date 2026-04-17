'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLayoutStore } from './useLayoutStore'
import { formatTagDisplay } from '@/lib/formatTagDisplay'
import { slugifyTag } from '@/lib/tagSlug'
import styles from './TagIndexView.module.css'
import textStyles from './TextStyles.module.css'

interface PostIndexRow {
  slug:        string
  title:       string
  description: string
  pubDate:     string
  tags:        string[]
}

export default function TagIndexView({ tagSlug }: { tagSlug: string }) {
  const openPost = useLayoutStore((s) => s.openPost)
  const [rows, setRows] = useState<PostIndexRow[] | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/post-index')
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed')
        return r.json() as Promise<PostIndexRow[]>
      })
      .then((data) => {
        if (!cancelled) setRows(data)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const matching = useMemo(() => {
    if (!rows) return []
    return rows
      .filter((p) => p.tags.some((t) => slugifyTag(t) === tagSlug))
      .sort(
        (a, b) =>
          new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
      )
  }, [rows, tagSlug])

  const onRowClick = useCallback(
    (e: React.MouseEvent, slug: string) => {
      e.stopPropagation()
      openPost(slug)
    },
    [openPost],
  )

  const label = formatTagDisplay(tagSlug)

  return (
    <div className={styles.root}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <h1 className={styles.tagTitle}>{label}</h1>
          <p className={`${styles.subtitle} ${textStyles.metaText}`}>
            {loadError
              ? 'Could not load index'
              : rows === null
                ? 'Loading…'
                : `${matching.length} ${matching.length === 1 ? 'note' : 'notes'}`}
          </p>
        </header>

        {loadError && (
          <p className={styles.empty}>
            Something went wrong while loading the library. Try again later.
          </p>
        )}

        {!loadError && rows === null && (
          <p className={styles.loading}>Gathering notes…</p>
        )}

        {!loadError && rows !== null && matching.length === 0 && (
          <p className={styles.empty}>
            No notes use this tag yet. Tags appear when listed in frontmatter or as
            hashtags in the body.
          </p>
        )}

        {!loadError && matching.length > 0 && (
          <ul className={styles.list}>
            {matching.map((p) => (
              <li key={p.slug}>
                <button
                  type="button"
                  className={styles.row}
                  onClick={(e) => onRowClick(e, p.slug)}
                >
                  <div className={styles.rowInner}>
                    <p className={styles.rowTitle}>{p.title}</p>
                    {p.description ? (
                      <p className={styles.rowDesc}>{p.description}</p>
                    ) : null}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// apps/web/src/app/layout.tsx
import './mplus-fonts.css'
import FilmGrainOverlay from '@/components/FilmGrainOverlay'
import ScrollbarStyles from '@/components/ScrollbarStyles'
import { designTokensCss } from '@/lib/tokens'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <head>
        <style
          id="fbr-design-tokens"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: designTokensCss() }}
        />
      </head>
      <body style={{ margin: 0, height: '100%', fontFamily: 'var(--font-mplus)' }}>
        <ScrollbarStyles />
        {children}
        <FilmGrainOverlay />
      </body>
    </html>
  )
}
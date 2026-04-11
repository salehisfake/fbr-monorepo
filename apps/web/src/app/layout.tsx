// apps/web/src/app/layout.tsx
import './mplus-fonts.css'
import FilmGrainOverlay from '@/components/FilmGrainOverlay'
import ScrollbarStyles from '@/components/ScrollbarStyles'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <body style={{ margin: 0, height: '100%', fontFamily: 'var(--font-mplus)' }}>
        <ScrollbarStyles />
        {children}
        <FilmGrainOverlay />
      </body>
    </html>
  )
}
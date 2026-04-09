// apps/web/src/app/layout.tsx
import { M_PLUS_1 } from 'next/font/google'
import FilmGrainOverlay from '@/components/FilmGrainOverlay'

const mplus = M_PLUS_1({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mplus',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mplus.variable} style={{ height: '100%' }}>
      <body style={{ margin: 0, height: '100%', fontFamily: 'var(--font-mplus)' }}>
        {children}
        <FilmGrainOverlay />
      </body>
    </html>
  )
}
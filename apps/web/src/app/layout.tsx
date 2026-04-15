// apps/web/src/app/layout.tsx
import './mplus-fonts.css'
import { designTokensCss, scrollbarCss } from '@/lib/tokens'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="fbr-scrollbars" style={{ height: '100%' }}>
      <head>
        <style
          id="fbr-design-tokens"
          dangerouslySetInnerHTML={{ __html: designTokensCss() }}
        />
        <style
          id="fbr-scrollbar"
          dangerouslySetInnerHTML={{ __html: scrollbarCss() }}
        />
      </head>
      <body style={{ margin: 0, height: '100%', fontFamily: 'var(--font-mplus)' }}>
        {children}
      </body>
    </html>
  )
}
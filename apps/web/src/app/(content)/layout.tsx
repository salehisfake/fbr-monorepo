// apps/web/src/app/(content)/layout.tsx

export default function ContentLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <main>
      {children}
    </main>
  )
}
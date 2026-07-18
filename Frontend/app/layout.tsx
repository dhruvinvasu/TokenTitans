import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HR Automation System',
  description: 'AI-powered hiring: resume matching, secure aptitude testing, and HR insights.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { StoreProvider } from '@/lib/store'
import { AuthProvider } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Prasan - Business Suite',
  description: 'Professional accounting and CRM for Parasnath Jeans',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground" suppressHydrationWarning>
        <AuthProvider>
          <StoreProvider>
            {children}
            {process.env.NODE_ENV === 'production' && <Analytics />}
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

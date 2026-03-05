import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#060910',
}

export const metadata: Metadata = {
  title: 'Smart Attendance Tracker',
  description: 'AI-powered attendance management for college students',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Attendance',
  },
  formatDetection: {
    telephone: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ background: '#060910', color: '#e2e8f0' }}>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0c1220',
              color: '#e2e8f0',
              border: '1px solid rgba(255,255,255,0.08)',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#4ade80', secondary: '#0c1220' },
            },
            error: {
              iconTheme: { primary: '#f87171', secondary: '#0c1220' },
            },
          }}
        />
        {children}
      </body>
    </html>
  )
}
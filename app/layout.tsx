import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import './globals.css'
import FirebaseInit from '../components/FirebaseInit';
import { AuthProvider } from '../lib/AuthContext';
import { Toaster } from '../components/ui/toaster';
import { ModuleVisibilityProvider } from '../lib/moduleVisibility';

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-sans',
})
const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: 'Academic Universe',
  description: 'AI-powered platform for holistic student growth tracking, IQ/EQ analytics, and verified credential management.',
  generator: 'Next.js',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        <AuthProvider>
          <FirebaseInit />
          <ModuleVisibilityProvider>
            {children}
          </ModuleVisibilityProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}

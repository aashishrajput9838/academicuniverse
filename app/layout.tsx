import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import './globals.css'
import FirebaseInit from '../components/FirebaseInit';
import { AuthProvider } from '../lib/authContext';

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

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
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>
          <FirebaseInit />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}

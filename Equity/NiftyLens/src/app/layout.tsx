import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NiftyLens — Indian Stock Market Dashboard',
  description: 'Real-time NSE/BSE price dashboard with technical indicators, portfolio tracking, and F&O option chain.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 font-sans antialiased">
        {children}
      </body>
    </html>
  )
}

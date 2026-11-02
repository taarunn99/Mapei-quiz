import './globals.css'
import { Inter, Rajdhani, Fraunces } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-inter', display: 'swap' })
const rajdhani = Rajdhani({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-rajdhani', display: 'swap' })
const fraunces = Fraunces({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-fraunces', display: 'swap' })

export const metadata = {
  title: 'LapizBlue Staff Quiz',
  description: 'Staff training quiz - Mapei Product Knowledge Assessment',
  icons: { icon: '/favicon.svg' },
}

export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' }

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${rajdhani.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  )
}

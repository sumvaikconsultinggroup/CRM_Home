import './globals.css'
import { Toaster } from 'sonner'

export const metadata = {
  title: 'BuildCRM - Construction & Home Improvement CRM',
  description: 'Comprehensive CRM/ERP solution for construction and home improvement businesses',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}

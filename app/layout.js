import './globals.css'
import { Toaster } from 'sonner'
import Script from 'next/script'

export const metadata = {
  title: 'BuildCRM - Construction & Home Improvement CRM',
  description: 'Comprehensive CRM/ERP solution for construction and home improvement businesses',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Model Viewer for 3D Models */}
        <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js" async></script>
      </head>
      <body className="min-h-screen bg-background antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}

"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "./Sidebar"
import { Navbar } from "./Navbar"
import { X } from "lucide-react"

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Automatically close mobile menu when navigating to a new route
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  if (pathname === "/login" || pathname.startsWith("/print")) {
    return <>{children}</>
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr] print:grid-cols-1 print:block">
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer Panel */}
      {isMobileMenuOpen && (
        <div className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-background shadow-2xl transition-all duration-300 md:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute right-3 top-3.5 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none"
          >
            <X className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">Close menu</span>
          </button>
          <Sidebar onNavClick={() => setIsMobileMenuOpen(false)} />
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden border-r bg-muted/40 md:block print:hidden">
        <Sidebar />
      </div>

      <div className="flex flex-col print:block">
        <div className="print:hidden">
          <Navbar onMenuClick={() => setIsMobileMenuOpen(true)} />
        </div>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-slate-100/70 print:p-8 print:bg-white print:block overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}

"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "./Sidebar"
import { Navbar } from "./Navbar"

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === "/login" || pathname.startsWith("/print")) {
    return <>{children}</>
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr] print:grid-cols-1 print:block">
      <div className="hidden border-r bg-muted/40 md:block print:hidden">
        <Sidebar />
      </div>
      <div className="flex flex-col print:block">
        <div className="print:hidden">
          <Navbar />
        </div>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-slate-50/50 print:p-8 print:bg-white print:block">
          {children}
        </main>
      </div>
    </div>
  )
}

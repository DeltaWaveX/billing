"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Package,
  Boxes,
  ShoppingCart,
  Truck,
  UserCog,
  Receipt,
  Tags,
  BarChart3,
  ChevronDown,
  ChevronUp,
  LogOut,
} from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Master Items", href: "/items", icon: Package },
  { name: "Master Units", href: "/units", icon: Boxes },
  { name: "Retail Billing", href: "/retail", icon: ShoppingCart },
  { name: "Wholesale Billing", href: "/wholesale", icon: Truck },
  { name: "Users", href: "/users", icon: UserCog, adminOnly: true },
  { name: "Expenses", href: "/expenses", icon: Receipt },
  { name: "Expense Categories", href: "/expense-categories", icon: Tags },
  {
    name: "Sale Reports",
    icon: BarChart3,
    subItems: [
      { name: "$ wholesale sales", href: "/reports/wholesale" },
      { name: "Daily Sales", href: "/reports" },
      { name: "$ Retail sales", href: "/reports/retail" },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [reportsOpen, setReportsOpen] = useState(true)

  // Filter items based on user role
  const visibleItems = navItems.filter(item => {
    if (item.adminOnly && user?.role !== 1) {
      return false
    }
    return true
  })

  const initials = user?.fist_name ? user.fist_name.substring(0, 2).toUpperCase() : "US"

  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/40 justify-between">
      <div>
        <div className="flex h-14 items-center border-b px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Package className="h-6 w-6 text-[#6b4783]" />
            <span className="text-[#6b4783]">BillingSystem</span>
          </Link>
        </div>
        <div className="py-2">
          <nav className="grid items-start px-4 text-sm font-medium space-y-1">
            {visibleItems.map((item, index) => {
              if (item.subItems) {
                const isAnyChildActive = item.subItems.some((child) => pathname === child.href)
                return (
                  <div key={index} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setReportsOpen(!reportsOpen)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-[#6b4783] hover:bg-slate-100",
                        isAnyChildActive ? "text-[#6b4783] bg-slate-100 font-semibold" : ""
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </div>
                      {reportsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {reportsOpen && (
                      <div className="mt-1 flex flex-col space-y-1 pl-9 pr-3">
                        {item.subItems.map((child, childIndex) => (
                          <Link
                            key={childIndex}
                            href={child.href}
                            className={cn(
                              "flex items-center rounded-lg px-3 py-1.5 text-muted-foreground transition-all hover:text-[#6b4783] hover:bg-slate-100",
                              pathname === child.href ? "bg-slate-100 text-[#6b4783] font-semibold" : ""
                            )}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              const isActive = pathname === item.href
              return (
                <Link
                  key={index}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-[#6b4783] hover:bg-slate-100",
                    isActive ? "bg-slate-100 text-[#6b4783] font-semibold" : ""
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      <div className="mt-auto border-t p-4 flex flex-col gap-2 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-[#6b4783] font-bold text-sm">
            {initials}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold truncate text-slate-800">
              {user?.fist_name} {user?.last_name || ""}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.role === 1 ? "Administrator" : "Biller/Cashier"}
            </p>
          </div>
        </div>
        <Button 
          onClick={logout} 
          variant="outline" 
          size="sm" 
          className="w-full gap-2 border-red-200 text-red-600 hover:text-red-700 hover:bg-red-50 mt-1"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  )
}

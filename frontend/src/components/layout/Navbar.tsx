"use client"

import { Bell, Search, User, Menu } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/components/auth-provider"

export function Navbar({ onMenuClick }: { onMenuClick?: () => void } = {}) {
  const { user, logout } = useAuth()

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 md:px-6 lg:h-[60px]">
      {onMenuClick && (
        <Button
          variant="outline"
          size="icon"
          className="md:hidden shrink-0 h-9 w-9"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5 text-slate-700" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      )}
      <div className="w-full flex-1" />
      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
        <Bell className="h-4 w-4" />
        <span className="sr-only">Toggle notifications</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="secondary" size="icon" className="rounded-full" />}>
          <User className="h-5 w-5" />
          <span className="sr-only">Toggle user menu</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 p-3 shadow-lg border rounded-xl">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex flex-col space-y-1.5 p-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-800 leading-none">
                    {user?.fist_name} {user?.last_name || ""}
                  </p>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-100 text-[#6b4783]">
                    {user?.role === 1 ? "Admin" : "Cashier"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground break-all leading-snug">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="my-2" />
          <DropdownMenuItem onClick={logout} className="text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer font-medium">
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

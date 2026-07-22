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
      <div className="w-full flex-1">
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-1/3"
            />
          </div>
        </form>
      </div>
      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
        <Bell className="h-4 w-4" />
        <span className="sr-only">Toggle notifications</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="secondary" size="icon" className="rounded-full" />}>
          <User className="h-5 w-5" />
          <span className="sr-only">Toggle user menu</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold text-slate-800 leading-none">
                  {user?.fist_name} {user?.last_name || ""}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-none">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer">
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

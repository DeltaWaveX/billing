"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { authStorage, User } from "@/lib/api"
import { RefreshCw } from "lucide-react"

interface AuthContextType {
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const storedToken = authStorage.getToken()
    const storedUser = authStorage.getUser()

    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(storedUser)
      
      const adminOnlyRoutes = ["/", "/users", "/reports", "/reports/wholesale", "/reports/retail"]
      const isAdmin = storedUser.role === 1

      // If user is at login screen but already has a session, redirect to appropriate home
      if (pathname === "/login") {
        router.push(isAdmin ? "/" : "/retail")
      } else if (!isAdmin && adminOnlyRoutes.includes(pathname)) {
        // Prevent cashier/staff from viewing admin-only pages
        router.push("/retail")
      }
    } else {
      setToken(null)
      setUser(null)
      
      // If not logged in and not at login page, redirect to login
      if (pathname !== "/login") {
        router.push("/login")
      }
    }
    setLoading(false)
  }, [pathname, router])

  const login = (newToken: string, newUser: User) => {
    authStorage.saveSession(newToken, newUser)
    setToken(newToken)
    setUser(newUser)
    router.push(newUser.role === 1 ? "/" : "/retail")
  }

  const logout = () => {
    authStorage.clearSession()
    setToken(null)
    setUser(null)
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-[#6b4783]" />
      </div>
    )
  }

  // Render children normally, or hide if unauthorized
  const isPublicPage = pathname === "/login"
  const isAuthenticated = !!token

  if (!isAuthenticated && !isPublicPage) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-[#6b4783]" />
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

"use client"

import React, { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { authApi, usersApi, User } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Lock, Mail, User as UserIcon, RefreshCw } from "lucide-react"

type AuthMode = "login" | "signup"

export default function LoginPage() {
  const { login } = useAuth()
  const [mode, setMode] = useState<AuthMode>("login")
  
  // Login & Shared states
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Signup states
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError("Please enter both email and password.")
      return
    }

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)
      const res = await authApi.login({ email, password })
      login(res.token, res.user)
    } catch (err: any) {
      console.error(err)
      if (err.message && err.message.includes("NetworkError") || err.message.includes("Failed to fetch")) {
        setError("Network Error: Could not reach the backend server.")
      } else {
        setError("Invalid email credentials or password.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName || !email || !password || !confirmPassword) {
      setError("Please fill in all required fields.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const payload: User = {
        fist_name: firstName,
        last_name: lastName || "Staff",
        email: email,
        password: password,
        role: 2, // Default to biller/cashier role
        photourl: null,
      }

      await usersApi.create(payload)
      setSuccess("Account registered successfully! Please log in.")
      setMode("login")
      
      // Clear signup fields
      setFirstName("")
      setLastName("")
      setPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      console.error(err)
      setError("Registration failed. Email may already be in use.")
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setError(null)
    setSuccess(null)
    setMode(mode === "login" ? "signup" : "login")
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-50 overflow-hidden">
      {/* Decorative clean background patterns */}
      <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-slate-200/40 to-transparent pointer-events-none" />
      
      <div className="z-10 w-full max-w-[420px] px-4 py-8">
        <Card className="border border-slate-200 bg-white text-slate-900 shadow-xl">
          <CardHeader className="space-y-1 text-center pb-4">
            <CardTitle className="text-3xl font-extrabold tracking-tight text-black">
              FLTR Billing
            </CardTitle>
            <CardDescription className="text-slate-500">
              {mode === "login" 
                ? "Sign in to your account to process billing" 
                : "Create a new staff or manager account"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                {error}
              </div>
            )}
            
            {success && (
              <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
                {success}
              </div>
            )}

            {mode === "login" ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-slate-700 font-medium">Email Address</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@fltrbilling.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 border-slate-200 bg-white text-slate-900 focus-visible:ring-black"
                      disabled={loading}
                      required
                    />
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 border-slate-200 bg-white text-slate-900 focus-visible:ring-black"
                      disabled={loading}
                      required
                    />
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-black hover:bg-slate-900 text-white transition-all font-semibold mt-2"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-slate-700 font-medium">First Name</Label>
                    <div className="relative">
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="pl-9 border-slate-200 bg-white text-slate-900 focus-visible:ring-black"
                        disabled={loading}
                        required
                      />
                      <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-slate-700 font-medium">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="border-slate-200 bg-white text-slate-900 focus-visible:ring-black"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-slate-700 font-medium">Email Address</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@fltrbilling.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 border-slate-200 bg-white text-slate-900 focus-visible:ring-black"
                      disabled={loading}
                      required
                    />
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>


                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 border-slate-200 bg-white text-slate-900 focus-visible:ring-black"
                        disabled={loading}
                        required
                      />
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">Confirm</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-9 border-slate-200 bg-white text-slate-900 focus-visible:ring-black"
                        disabled={loading}
                        required
                      />
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-black hover:bg-slate-900 text-white transition-all font-semibold mt-2"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Signing up...
                    </span>
                  ) : (
                    "Register Account"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-center border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm font-semibold text-black hover:underline"
              disabled={loading}
            >
              {mode === "login"
                ? "Don't have an account? Sign Up"
                : "Already have an account? Sign In"}
            </button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

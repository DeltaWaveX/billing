"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Search, Eye, Edit, Trash2, RefreshCw } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { usersApi, User } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"

export default function UsersPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Dialog state
  const [isOpen, setIsOpen] = useState(false)

  // Form states
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState("biller")

  if (user?.role !== 1) {
    return (
      <div className="flex-1 p-6 text-center space-y-4">
        <div className="mx-auto max-w-md p-6 border border-red-200 bg-red-50 text-red-700 rounded-lg shadow-sm">
          <h3 className="text-lg font-bold">Access Denied</h3>
          <p className="text-sm mt-1">
            Only administrators are authorized to manage or view user accounts.
          </p>
        </div>
      </div>
    )
  }

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await usersApi.getAll()
      setUsers(data)
      setError(null)
    } catch (e) {
      console.error(e)
      setError("Failed to load users list.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const openAddDialog = () => {
    setName("")
    setPassword("")
    setConfirmPassword("")
    setRole("biller")
    setIsOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return
    try {
      setLoading(true)
      await usersApi.delete(id)
      await loadUsers()
    } catch (e) {
      console.error(e)
      alert("Failed to delete user.")
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !password) {
      alert("Please fill in all required fields.")
      return
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match.")
      return
    }

    try {
      setLoading(true)
      const parts = name.trim().split(" ")
      const fistName = parts[0]
      const lastName = parts.slice(1).join(" ")

      // Auto-generate unique placeholder email based on name
      const rand = Math.floor(1000 + Math.random() * 9000)
      const mockEmail = `${fistName.toLowerCase()}${rand}@fltrbilling.com`

      const payload: User = {
        fist_name: fistName, // Map to Django typo field
        last_name: lastName || "Staff",
        email: mockEmail,
        password: password,
        role: role === "Administrator" ? 1 : 2,
        photourl: null,
      }

      await usersApi.create(payload)
      setIsOpen(false)
      await loadUsers()
    } catch (e) {
      console.error(e)
      alert("Failed to add new user.")
      setLoading(false)
    }
  }

  const filteredUsers = users.filter((u) => {
    const fullName = `${u.fist_name} ${u.last_name}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">Manage staff access and roles.</p>
        </div>
        <Button onClick={openAddDialog} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
          <Plus className="h-4 w-4" />
          Add New User
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4 py-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={loadUsers} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex h-[350px] items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-[#6b4783]" />
        </div>
      ) : error ? (
        <div className="p-6 text-center text-destructive font-medium bg-red-50 rounded-md">{error}</div>
      ) : (
        <div className="rounded-md border bg-white overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-medium w-[50px]">#</TableHead>
                <TableHead className="font-medium">Name</TableHead>
                <TableHead className="font-medium">Email</TableHead>
                <TableHead className="font-medium">Photo</TableHead>
                <TableHead className="font-medium">Role</TableHead>
                <TableHead className="font-medium text-right w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user, index) => {
                  const roleStr = user.role === 1 ? "Administrator" : "biller"
                  const initial = user.fist_name.substring(0, 2).toUpperCase()
                  return (
                    <TableRow key={user.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-bold">{user.fist_name} {user.last_name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initial}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <Badge variant={user.role === 1 ? "default" : "secondary"}>
                          {roleStr}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button onClick={() => user.id && handleDelete(user.id)} variant="destructive" size="sm" className="h-7 w-7 p-0 rounded-sm">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No users found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      
      <div className="mt-4 text-sm font-medium text-[#6b4783]">
        Records : {filteredUsers.length} of {users.length}
      </div>

      {/* Add User Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-xl">Add New User</DialogTitle>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              <div className="space-y-2">
                <Label className="font-medium">Name <span className="text-destructive">*</span></Label>
                <Input 
                  placeholder="Enter Name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label className="font-medium">Password <span className="text-destructive">*</span></Label>
                <Input 
                  type="password" 
                  placeholder="Enter Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Confirm Password <span className="text-destructive">*</span></Label>
                <Input 
                  type="password" 
                  placeholder="Confirm Password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Role <span className="text-destructive">*</span></Label>
                <Select value={role} onValueChange={(v) => setRole(v ?? "biller")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a value ..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Administrator">Administrator</SelectItem>
                    <SelectItem value="biller">biller</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full sm:w-auto px-8 bg-green-600 hover:bg-green-700 text-white">Submit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

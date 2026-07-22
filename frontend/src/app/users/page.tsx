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
import { Plus, Search, Edit, Trash2, RefreshCw } from "lucide-react"
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
  const [editingUser, setEditingUser] = useState<User | null>(null)

  // Form states
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
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
    setEditingUser(null)
    setName("")
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setRole("biller")
    setIsOpen(true)
  }

  const openEditDialog = (userToEdit: User) => {
    setEditingUser(userToEdit)
    setName(`${userToEdit.fist_name} ${userToEdit.last_name || ""}`.trim())
    setEmail(userToEdit.email)
    setPassword("")
    setConfirmPassword("")
    setRole(userToEdit.role === 1 ? "Administrator" : "biller")
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
    if (!name) {
      alert("Please enter the user name.")
      return
    }

    if (!editingUser && (!password || !email)) {
      alert("Please fill in all required fields.")
      return
    }

    if (password && password !== confirmPassword) {
      alert("Passwords do not match.")
      return
    }

    try {
      setLoading(true)
      const parts = name.trim().split(" ")
      const fistName = parts[0]
      const lastName = parts.slice(1).join(" ")

      let userEmail = email.trim()
      if (!userEmail) {
        const rand = Math.floor(1000 + Math.random() * 9000)
        userEmail = `${fistName.toLowerCase()}${rand}@fltrbilling.com`
      }

      const payload: Partial<User> = {
        fist_name: fistName,
        last_name: lastName || "Staff",
        email: userEmail,
        role: role === "Administrator" ? 1 : 2,
      }

      if (password) {
        payload.password = password
      }

      if (editingUser && editingUser.id) {
        await usersApi.update(editingUser.id, payload as User)
      } else {
        await usersApi.create(payload as User)
      }

      setIsOpen(false)
      await loadUsers()
    } catch (e) {
      console.error(e)
      alert(editingUser ? "Failed to update user." : "Failed to add new user.")
      setLoading(false)
    }
  }

  const uQuery = searchQuery.trim().toLowerCase()
  const filteredUsers = users
    .filter((u) => {
      if (!uQuery) return true
      const fullName = `${u.fist_name} ${u.last_name}`.toLowerCase()
      return fullName.includes(uQuery) || u.email.toLowerCase().includes(uQuery)
    })
    .sort((a, b) => {
      if (!uQuery) return 0
      const aName = `${a.fist_name} ${a.last_name}`.toLowerCase()
      const bName = `${b.fist_name} ${b.last_name}`.toLowerCase()
      const aStarts = aName.startsWith(uQuery) || a.email.toLowerCase().startsWith(uQuery)
      const bStarts = bName.startsWith(uQuery) || b.email.toLowerCase().startsWith(uQuery)
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      return aName.indexOf(uQuery) - bName.indexOf(uQuery)
    })

  return (
    <div className="flex-1 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">Manage staff access and roles.</p>
        </div>
        <Button onClick={openAddDialog} className="gap-2 bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Add New User
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 py-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-8 w-full"
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
        <div className="rounded-md border bg-white overflow-x-auto shadow-sm">
          <Table className="min-w-[650px]">
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
                filteredUsers.map((u, index) => {
                  const roleStr = u.role === 1 ? "Administrator" : "biller"
                  const initial = u.fist_name.substring(0, 2).toUpperCase()
                  return (
                    <TableRow key={u.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-bold">{u.fist_name} {u.last_name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initial}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <Badge variant={u.role === 1 ? "default" : "secondary"}>
                          {roleStr}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button onClick={() => openEditDialog(u)} variant="outline" size="sm" className="h-8 px-2 border-slate-300 hover:bg-slate-100">
                            <Edit className="h-3.5 w-3.5 mr-1 text-slate-700" /> Edit
                          </Button>
                          <Button onClick={() => u.id && handleDelete(u.id)} variant="destructive" size="sm" className="h-8 px-2">
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
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

      {/* Add / Edit User Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-xl">
                {editingUser ? "Edit User Details" : "Add New User"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              <div className="space-y-2">
                <Label className="font-medium">Name <span className="text-destructive">*</span></Label>
                <Input 
                  placeholder="Enter Full Name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Email Address</Label>
                <Input 
                  type="email"
                  placeholder="Enter Email Address" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                />
              </div>
              
              <div className="space-y-2">
                <Label className="font-medium">
                  Password {editingUser ? <span className="text-xs text-muted-foreground font-normal">(Leave blank to keep unchanged)</span> : <span className="text-destructive">*</span>}
                </Label>
                <Input 
                  type="password" 
                  placeholder={editingUser ? "New password (optional)" : "Enter Password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!editingUser} 
                />
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Confirm Password</Label>
                <Input 
                  type="password" 
                  placeholder="Confirm Password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required={!!password} 
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
              <Button type="submit" className="w-full sm:w-auto px-8 bg-green-600 hover:bg-green-700 text-white">
                {editingUser ? "Update User" : "Submit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

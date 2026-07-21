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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Search, Plus, MoreHorizontal, FileText, RefreshCw, Trash2, Edit } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { customersApi, Customer } from "@/lib/api"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Dialog state
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  // Form states
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [gst, setGst] = useState("")
  const [custType, setCustType] = useState("1") // 1: Retail, 2: Wholesale

  const loadCustomers = async () => {
    try {
      setLoading(true)
      const data = await customersApi.getAll()
      setCustomers(data)
      setError(null)
    } catch (e) {
      console.error(e)
      setError("Failed to load customers.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [])

  const openAddDialog = () => {
    setEditingId(null)
    setName("")
    setPhone("")
    setGst("")
    setCustType("1")
    setIsOpen(true)
  }

  const openEditDialog = (customer: Customer) => {
    if (customer.id) setEditingId(customer.id)
    setName(customer.name || "")
    setPhone(customer.phone)
    setGst(customer.gstin || "")
    setCustType(customer.type.toString())
    setIsOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this customer?")) return
    try {
      setLoading(true)
      await customersApi.delete(id)
      await loadCustomers()
    } catch (e) {
      console.error(e)
      alert("Failed to delete customer.")
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !phone) {
      alert("Name and Contact Number are required.")
      return
    }

    try {
      setLoading(true)
      const payload: Customer = {
        name,
        phone,
        gstin: gst || null,
        type: parseInt(custType),
      }
      if (editingId) {
        await customersApi.update(editingId, payload)
      } else {
        await customersApi.create(payload)
      }
      setIsOpen(false)
      setEditingId(null)
      await loadCustomers()
    } catch (e) {
      console.error(e)
      alert("Failed to save customer.")
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter(
    (c) =>
      (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.phone.includes(searchQuery)
  )

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
          <p className="text-muted-foreground">Manage your retail and wholesale customers.</p>
        </div>
        <Button onClick={openAddDialog} className="gap-2 bg-[#6b4783] hover:bg-[#563969] text-white">
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4 py-4">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers by name or phone..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={loadCustomers} className="gap-2">
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
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer, index) => (
                  <TableRow key={customer.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-bold">{customer.name || "Walk-in Customer"}</TableCell>
                    <TableCell className="text-blue-600 font-semibold">{customer.phone}</TableCell>
                    <TableCell>{customer.gstin || <span className="text-muted-foreground">N/A</span>}</TableCell>
                    <TableCell>
                      <Badge variant={customer.type === 2 ? "default" : "secondary"}>
                        {customer.type === 2 ? "Wholesale" : "Retail"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button 
                          onClick={() => openEditDialog(customer)} 
                          variant="outline" 
                          size="sm" 
                          className="h-7 px-2 text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button 
                          onClick={() => customer.id && handleDelete(customer.id)} 
                          variant="destructive" 
                          size="sm" 
                          className="h-7 px-2"
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No customers found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Customer Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Customer" : "Add New Customer"}</DialogTitle>
              <DialogDescription>
                Enter customer details here. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name <span className="text-destructive">*</span></Label>
                <Input 
                  id="name" 
                  placeholder="John Doe or Company Ltd" 
                  className="col-span-3" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="contact" className="text-right">Contact <span className="text-destructive">*</span></Label>
                <Input 
                  id="contact" 
                  placeholder="Mobile Number" 
                  className="col-span-3" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} 
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="gst" className="text-right">GSTIN</Label>
                <Input 
                  id="gst" 
                  placeholder="Optional" 
                  className="col-span-3" 
                  value={gst} 
                  onChange={(e) => setGst(e.target.value)} 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="custType" className="text-right">Type <span className="text-destructive">*</span></Label>
                <Select value={custType} onValueChange={(v) => setCustType(v ?? "1")}>
                  <SelectTrigger id="custType" className="col-span-3">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Retail</SelectItem>
                    <SelectItem value="2">Wholesale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-[#6b4783] hover:bg-[#563969] text-white">Save Customer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

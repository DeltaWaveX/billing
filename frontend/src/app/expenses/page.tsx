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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, Search, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { expensesApi, Expense } from "@/lib/api"
import { defaultCategories } from "@/app/expense-categories/page"

export default function ExpensesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [isOpen, setIsOpen] = useState(false)

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedCategory, setSelectedCategory] = useState("")
  const [customCategory, setCustomCategory] = useState("")
  const [showCustomCatInput, setShowCustomCatInput] = useState(false)
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("Cash")
  const [note, setNote] = useState("")

  const loadExpenses = async () => {
    try {
      setLoading(true)
      const data = await expensesApi.getAll()
      setExpenses(data)
      setError(null)
    } catch (e) {
      console.error(e)
      setError("Failed to load expenses list.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExpenses()
  }, [])

  const openAddDialog = () => {
    setDate(new Date().toISOString().split('T')[0])
    setSelectedCategory("")
    setCustomCategory("")
    setShowCustomCatInput(false)
    setAmount("")
    setMethod("Cash")
    setNote("")
    setIsOpen(true)
  }

  const handleCategoryChange = (val: string) => {
    setSelectedCategory(val)
    if (val === "other") {
      setShowCustomCatInput(true)
    } else {
      setShowCustomCatInput(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this expense?")) return
    try {
      setLoading(true)
      await expensesApi.delete(id)
      await loadExpenses()
    } catch (e) {
      console.error(e)
      alert("Failed to delete expense.")
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCategory || !amount) {
      alert("Category and Amount are required.")
      return
    }

    try {
      setLoading(true)
      const finalCategory = selectedCategory === "other" ? customCategory : selectedCategory
      
      // Pack extra fields (date, method) in the description so we don't need migrations
      const packedDescription = `[${date}] [${method}] ${note || "No details"}`

      const payload: Expense = {
        amount: parseFloat(amount) || 0,
        category: finalCategory,
        description: packedDescription
      }

      await expensesApi.create(payload)
      setIsOpen(false)
      await loadExpenses()
    } catch (e) {
      console.error(e)
      alert("Failed to save expense.")
      setLoading(false)
    }
  }

  // Parse packed description into structured values
  const parseDescription = (desc: string) => {
    let parsedDate = ""
    let parsedMethod = "N/A"
    let cleanNote = desc

    const dateMatch = desc.match(/^\[(\d{4}-\d{2}-\d{2})\]/)
    if (dateMatch) {
      parsedDate = dateMatch[1]
      cleanNote = cleanNote.replace(dateMatch[0], "").trim()
    }

    const methodMatch = cleanNote.match(/^\[([^\]]+)\]/)
    if (methodMatch) {
      parsedMethod = methodMatch[1]
      cleanNote = cleanNote.replace(methodMatch[0], "").trim()
    }

    return {
      date: parsedDate || "N/A",
      method: parsedMethod,
      note: cleanNote
    }
  }

  const filteredExpenses = expenses.filter(
    (exp) =>
      exp.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Expenses</h2>
          <p className="text-muted-foreground">Log and manage your daily business expenses.</p>
        </div>
        <Button onClick={openAddDialog} className="gap-2 bg-[#6b4783] hover:bg-[#563969] text-white">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4 py-4">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search expenses by category or description..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={loadExpenses} className="gap-2">
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
                <TableHead>Date Logged</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Note / Details</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((exp, index) => {
                  const details = parseDescription(exp.description)
                  return (
                    <TableRow key={exp.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{details.date}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{exp.category}</Badge>
                      </TableCell>
                      <TableCell>{details.note}</TableCell>
                      <TableCell>{details.method}</TableCell>
                      <TableCell className="text-right font-medium text-red-500">
                        ₹{parseFloat(String(exp.amount)).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          onClick={() => exp.id && handleDelete(exp.id)} 
                          variant="destructive" 
                          size="sm" 
                          className="h-7 w-7 p-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No expenses found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Expense Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
              <DialogDescription>
                Record a new expense entry.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
                <Select value={selectedCategory} onValueChange={(v) => handleCategoryChange(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {defaultCategories.map(c => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="other">Other (Input Custom Category)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {showCustomCatInput && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="customCat">Custom Category Name <span className="text-destructive">*</span></Label>
                  <Input 
                    id="customCat" 
                    placeholder="Enter custom category name" 
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹) <span className="text-destructive">*</span></Label>
                <Input 
                  id="amount" 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">Payment Method</Label>
                <Select value={method} onValueChange={(v) => setMethod(v ?? "Cash")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="note">Note / Description</Label>
                <Input 
                  id="note" 
                  placeholder="What was this expense for?" 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-[#6b4783] hover:bg-[#563969] text-white">Save Expense</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

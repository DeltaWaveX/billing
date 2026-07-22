"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, RefreshCw } from "lucide-react"
import { expensesApi } from "@/lib/api"

export interface CategoryItem {
  id: number | string
  name: string
  description: string
}

export const defaultCategories: CategoryItem[] = [
  { id: "d1", name: "Electricity", description: "Monthly shop electricity bills" },
  { id: "d2", name: "Tea & Snacks", description: "Daily refreshments for staff" },
  { id: "d3", name: "Transport", description: "Delivery and logistics expenses" },
  { id: "d4", name: "Rent", description: "Shop premises rent" },
  { id: "d5", name: "Maintenance", description: "Repairs and cleaning" },
]

export default function ExpenseCategoriesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadCategories = async () => {
    try {
      setLoading(true)
      const expenses = await expensesApi.getAll()

      // Extract unique categories in use
      const activeCats = new Set<string>()
      expenses.forEach(e => {
        if (e.category && e.category.trim()) {
          activeCats.add(e.category.trim())
        }
      })

      const mergedList = [...defaultCategories]
      let idx = 1
      activeCats.forEach(catName => {
        const exists = defaultCategories.some(d => d.name.toLowerCase() === catName.toLowerCase())
        if (!exists) {
          mergedList.push({
            id: `a${idx++}`,
            name: catName,
            description: "Custom user-defined category"
          })
        }
      })

      setCategories(mergedList)
    } catch (e) {
      console.error("Failed to load active expense categories:", e)
      setCategories(defaultCategories)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const catQuery = searchQuery.trim().toLowerCase()
  const filteredCategories = categories
    .filter(
      (cat) =>
        !catQuery ||
        cat.name.toLowerCase().includes(catQuery) ||
        cat.description.toLowerCase().includes(catQuery)
    )
    .sort((a, b) => {
      if (!catQuery) return 0
      const aName = a.name.toLowerCase()
      const bName = b.name.toLowerCase()
      const aStarts = aName.startsWith(catQuery)
      const bStarts = bName.startsWith(catQuery)
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      return aName.indexOf(catQuery) - bName.indexOf(catQuery)
    })

  if (loading) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-[#6b4783]" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 md:w-2/3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Expense Categories</h2>
          <p className="text-muted-foreground">List of categories used by logged expenses.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 py-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            className="pl-8 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-white overflow-x-auto shadow-sm mt-4">
        <Table className="min-w-[500px]">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Category Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories.map((cat) => {
              const isDefault = String(cat.id).startsWith("d")
              return (
                <TableRow key={cat.id}>
                  <TableCell className="font-bold">{cat.name}</TableCell>
                  <TableCell className="text-muted-foreground">{cat.description}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDefault ? "bg-muted text-muted-foreground" : "bg-green-100 text-green-800"}`}>
                      {isDefault ? "Standard Default" : "Custom/In-Use"}
                    </span>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

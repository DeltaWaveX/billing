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
import { productsApi } from "@/lib/api"

export interface UnitItem {
  id: number | string
  printLabel: string
  name: string
}

export const defaultUnits: UnitItem[] = [
  { id: "d1", printLabel: "B", name: "BAGS" },
  { id: "d2", printLabel: "T", name: "TIN" },
  { id: "d3", printLabel: "C", name: "COT" },
  { id: "d4", printLabel: "P", name: "PIECES" },
  { id: "d5", printLabel: "L", name: "LITERS" },
  { id: "d6", printLabel: "K", name: "KGS" },
]

export const dummyUnits = defaultUnits // For backward compatibility/imports

export default function UnitsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [units, setUnits] = useState<UnitItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadUnits = async () => {
    try {
      setLoading(true)
      const products = await productsApi.getAll()
      
      // Extract unique unit names from products
      const activeUnitsMap = new Map<string, string>()
      products.forEach(p => {
        if (p.unit && p.unit.trim()) {
          const val = p.unit.trim().toUpperCase()
          // Infer abbreviation printLabel
          const label = val.substring(0, 1)
          activeUnitsMap.set(val, label)
        }
      })

      // Start with default units
      const mergedList: UnitItem[] = [...defaultUnits]

      // Add active units from products that aren't already defaults
      let idx = 1
      activeUnitsMap.forEach((label, name) => {
        const exists = defaultUnits.some(d => d.name.toUpperCase() === name)
        if (!exists) {
          mergedList.push({
            id: `a${idx++}`,
            printLabel: label,
            name: name,
          })
        }
      })

      setUnits(mergedList)
    } catch (e) {
      console.error("Failed to load active units:", e)
      setUnits(defaultUnits)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUnits()
  }, [])

  const filteredUnits = units.filter(
    (unit) =>
      unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.printLabel.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-[#6b4783]" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">List of Units</h2>
          <p className="text-muted-foreground">List of units in use by your product inventory.</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 py-2">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search units..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">#</TableHead>
              <TableHead>Print label</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUnits.map((unit, index) => {
              const isDefault = String(unit.id).startsWith("d")
              return (
                <TableRow key={unit.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{unit.printLabel}</TableCell>
                  <TableCell>{unit.name}</TableCell>
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
      
      <div className="text-sm font-medium text-[#6b4783] pt-2 px-1">
        Records : {filteredUnits.length} of {units.length}
      </div>
    </div>
  )
}

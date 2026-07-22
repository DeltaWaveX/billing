"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, RefreshCw, Plus, Edit, Trash2 } from "lucide-react"
import { unitsApi, Unit } from "@/lib/api"

export default function UnitsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  
  // Form state
  const [name, setName] = useState("")
  const [printLabel, setPrintLabel] = useState("")
  const [saving, setSaving] = useState(false)

  const loadUnits = async () => {
    try {
      setLoading(true)
      const data = await unitsApi.getAll()
      setUnits(data)
    } catch (e) {
      console.error("Failed to load units:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUnits()
  }, [])

  const handleOpenAdd = () => {
    setEditingUnit(null)
    setName("")
    setPrintLabel("")
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (unit: Unit) => {
    setEditingUnit(unit)
    setName(unit.name)
    setPrintLabel(unit.print_label)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this unit?")) return
    try {
      setLoading(true)
      await unitsApi.delete(id)
      await loadUnits()
    } catch (e) {
      console.error("Failed to delete unit:", e)
      alert("Failed to delete unit")
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name || !printLabel) {
      alert("Please enter both Name and Print Label")
      return
    }
    
    setSaving(true)
    try {
      if (editingUnit && editingUnit.id) {
        await unitsApi.update(editingUnit.id, { name, print_label: printLabel })
      } else {
        await unitsApi.create({ name, print_label: printLabel })
      }
      setIsDialogOpen(false)
      await loadUnits()
    } catch (e) {
      console.error("Failed to save unit:", e)
      alert("Failed to save unit")
    } finally {
      setSaving(false)
    }
  }

  const uQuery = searchQuery.trim().toLowerCase()
  const filteredUnits = units
    .filter(
      (unit) =>
        !uQuery ||
        unit.name.toLowerCase().includes(uQuery) ||
        unit.print_label.toLowerCase().includes(uQuery)
    )
    .sort((a, b) => {
      if (!uQuery) return 0
      const aName = a.name.toLowerCase()
      const bName = b.name.toLowerCase()
      const aStarts = aName.startsWith(uQuery) || a.print_label.toLowerCase().startsWith(uQuery)
      const bStarts = bName.startsWith(uQuery) || b.print_label.toLowerCase().startsWith(uQuery)
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      return aName.indexOf(uQuery) - bName.indexOf(uQuery)
    })

  if (loading && units.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-[#6b4783]" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">List of Units</h2>
          <p className="text-muted-foreground">List of units in use by your product inventory.</p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-[#6b4783] hover:bg-[#563969] text-white w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Add Unit
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 py-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search units..."
            className="pl-8 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-white overflow-x-auto">
        <Table className="min-w-[500px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">#</TableHead>
              <TableHead>Print label</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUnits.length > 0 ? filteredUnits.map((unit, index) => (
              <TableRow key={unit.id}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell>{unit.print_label}</TableCell>
                <TableCell>{unit.name}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(unit)}>
                    <Edit className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => unit.id && handleDelete(unit.id)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="text-sm font-medium text-[#6b4783] pt-2 px-1">
        Records : {filteredUnits.length} of {units.length}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUnit ? "Edit Unit" : "Add Unit"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="e.g. KILOGRAMS" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Print Label</label>
              <Input 
                value={printLabel} 
                onChange={e => setPrintLabel(e.target.value)} 
                placeholder="e.g. KG" 
              />
            </div>
            <Button 
              onClick={handleSave} 
              className="w-full bg-[#6b4783] hover:bg-[#563969] text-white"
              disabled={saving}
            >
              {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Unit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

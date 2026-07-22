"use client"

import { useState, useEffect } from "react"
import Sanscript from "@indic-transliteration/sanscript"
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
import { Search, Plus, Edit, Trash2, RefreshCw } from "lucide-react"
import { productsApi, barcodeMappingsApi, unitsApi, Product, BarcodeMapping, Unit } from "@/lib/api"

export default function ItemsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [items, setItems] = useState<(Product & { barcode: string; barcodeId?: number })[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Dialog states
  const [isOpen, setIsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<(Product & { barcode: string; barcodeId?: number }) | null>(null)

  // Form states
  const [nameEn, setNameEn] = useState("")
  const [nameTe, setNameTe] = useState("")
  const [nameSecondary, setNameSecondary] = useState("")
  const [barcodeOption, setBarcodeOption] = useState<"AGBC" | "CBC">("AGBC")
  const [barcodeValue, setBarcodeValue] = useState("")
  const [selectedUnit, setSelectedUnit] = useState("")
  const [customUnit, setCustomUnit] = useState("")
  const [showCustomUnitInput, setShowCustomUnitInput] = useState(false)
  const [isWeightOrPieces, setIsWeightOrPieces] = useState("pieces")
  const [purchasePrice, setPurchasePrice] = useState("")
  const [retailPercentage, setRetailPercentage] = useState("")
  const [wholesalePercentage, setWholesalePercentage] = useState("")
  const [retailPrice, setRetailPrice] = useState("")
  const [wholesalePrice, setWholesalePrice] = useState("")
  const [stock, setStock] = useState("")

  const loadData = async () => {
    try {
      setLoading(true)
      const [products, barcodes, unitsData] = await Promise.all([
        productsApi.getAll(true),
        barcodeMappingsApi.getAll(),
        unitsApi.getAll()
      ])

      const mapped = products.map((p) => {
        const barcodeObj = barcodes.find((b) => b.product_id === p.id)
        return {
          ...p,
          barcode: barcodeObj ? barcodeObj.barcode : "",
          barcodeId: barcodeObj ? barcodeObj.id : undefined,
        }
      })
      setItems(mapped)
      setUnits(unitsData)
      setError(null)
    } catch (e: any) {
      console.error(e)
      setError("Failed to load products list.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleTranslate = (text: string) => {
    if (!text.trim()) return
    try {
      // Transliterate English phonetics to Telugu script
      const transliterated = Sanscript.t(text.toLowerCase(), "itrans", "telugu")
      setNameTe(transliterated)
    } catch (e) {
      console.error("Transliteration failed:", e)
    }
  }

  const openAddDialog = () => {
    setEditingItem(null)
    setNameEn("")
    setNameTe("")
    setNameSecondary("")
    setBarcodeOption("AGBC")
    setBarcodeValue("")
    setSelectedUnit("")
    setCustomUnit("")
    setShowCustomUnitInput(false)
    setIsWeightOrPieces("pieces")
    setPurchasePrice("")
    setRetailPercentage("")
    setWholesalePercentage("")
    setRetailPrice("")
    setWholesalePrice("")
    setStock("")
    setIsOpen(true)
  }

  const openEditDialog = (item: Product & { barcode: string; barcodeId?: number }) => {
    setEditingItem(item)
    // Try to parse out En/Te names from composite name (EnName/TeName/Barcode)
    const parts = item.name.split("/")
    setNameEn(parts[0] || item.name)
    setNameTe(parts[1] || "")
    if (parts.length >= 4) {
      setNameSecondary(parts[2] || "")
    } else {
      setNameSecondary("")
    }
    setBarcodeOption("CBC")
    setBarcodeValue(item.barcode)
    
    // Check if unit is in defaults
    const isStandard = units.some(d => d.print_label.toLowerCase() === item.unit.toLowerCase())
    if (isStandard) {
      setSelectedUnit(item.unit.toLowerCase())
      setShowCustomUnitInput(false)
    } else {
      setSelectedUnit("other")
      setCustomUnit(item.unit)
      setShowCustomUnitInput(true)
    }
    
    setPurchasePrice(String(item.purchaseprice))
    setRetailPercentage(String(item.retailpercentage))
    setWholesalePercentage(String(item.wholesalepercentage))
    setRetailPrice(String(item.retailprice))
    setWholesalePrice(String(item.wholesaleprice))
    setStock(item.stock !== null ? String(item.stock) : "")
    setIsOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return
    try {
      setLoading(true)
      await productsApi.delete(id)
      await loadData()
    } catch (e) {
      console.error(e)
      alert("Failed to delete product.")
      setLoading(false)
    }
  }

  const handleUnitChange = (val: string) => {
    setSelectedUnit(val)
    if (val === "other") {
      setShowCustomUnitInput(true)
    } else {
      setShowCustomUnitInput(false)
    }
  }

  // Auto calculate prices when purchase price or percentages change
  const handlePurchasePriceChange = (val: string) => {
    setPurchasePrice(val)
    const pPrice = parseFloat(val) || 0
    if (retailPercentage) {
      const rPct = parseFloat(retailPercentage) || 0
      setRetailPrice((pPrice * (1 + rPct / 100)).toFixed(2))
    }
    if (wholesalePercentage) {
      const wPct = parseFloat(wholesalePercentage) || 0
      setWholesalePrice((pPrice * (1 + wPct / 100)).toFixed(2))
    }
  }

  const handleRetailPercentageChange = (val: string) => {
    setRetailPercentage(val)
    const pPrice = parseFloat(purchasePrice) || 0
    const rPct = parseFloat(val) || 0
    setRetailPrice((pPrice * (1 + rPct / 100)).toFixed(2))
  }

  const handleWholesalePercentageChange = (val: string) => {
    setWholesalePercentage(val)
    const pPrice = parseFloat(purchasePrice) || 0
    const wPct = parseFloat(val) || 0
    setWholesalePrice((pPrice * (1 + wPct / 100)).toFixed(2))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameEn || !purchasePrice || !retailPrice || !wholesalePrice) {
      alert("Please fill in all required fields.")
      return
    }

    try {
      setLoading(true)
      const finalUnit = selectedUnit === "other" ? customUnit : selectedUnit.toUpperCase()
      const finalBarcode = barcodeOption === "AGBC" && !editingItem
        ? Math.floor(100000 + Math.random() * 900000).toString()
        : barcodeValue

      const secPart = nameSecondary ? `/${nameSecondary}` : ""
      const combinedName = `${nameEn}/${nameTe || nameEn}${secPart}/${finalBarcode}`

      const payload: Product = {
        name: combinedName,
        retailprice: parseFloat(retailPrice) || 0,
        wholesaleprice: parseFloat(wholesalePrice) || 0,
        retailpercentage: parseFloat(retailPercentage) || 0,
        wholesalepercentage: parseFloat(wholesalePercentage) || 0,
        stock: stock ? parseInt(stock) : null,
        unit: finalUnit || "P",
        purchaseprice: parseFloat(purchasePrice) || 0,
      }

      if (editingItem && editingItem.id) {
        // Edit existing product
        await productsApi.update(editingItem.id, payload)
        
        // Update barcode
        if (editingItem.barcodeId) {
          await barcodeMappingsApi.update(editingItem.barcodeId, {
            id: editingItem.barcodeId,
            product_id: editingItem.id,
            barcode: finalBarcode,
          })
        } else {
          await barcodeMappingsApi.create({
            product_id: editingItem.id,
            barcode: finalBarcode,
          })
        }
      } else {
        // Create new product
        const newProd = await productsApi.create(payload)
        // Create barcode mapping
        if (newProd.id) {
          await barcodeMappingsApi.create({
            product_id: newProd.id,
            barcode: finalBarcode,
          })
        }
      }

      setIsOpen(false)
      await loadData()
    } catch (e) {
      console.error(e)
      alert("Failed to save product details.")
      setLoading(false)
    }
  }

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode.includes(searchQuery)
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  const currentItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">List of Items</h2>
          <p className="text-muted-foreground">Manage your product inventory and pricing.</p>
        </div>
        <Button onClick={openAddDialog} className="gap-2 bg-[#6b4783] hover:bg-[#563969] text-white">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4 py-4">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items by name or barcode..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={loadData} className="gap-2">
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
                <TableHead className="w-[50px] text-center">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>P-Price</TableHead>
                <TableHead>Barcode Number</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>W-Price</TableHead>
                <TableHead>R-Price</TableHead>
                <TableHead className="w-[180px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.length > 0 ? (
                currentItems.map((item, index) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="text-center font-medium">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                    <TableCell className="max-w-md font-bold whitespace-normal break-words">{item.name}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>₹{parseFloat(String(item.purchaseprice)).toFixed(2)}</TableCell>
                    <TableCell className="text-blue-600 font-semibold">{item.barcode}</TableCell>
                    <TableCell>{item.stock !== null ? item.stock : "Unlimited"}</TableCell>
                    <TableCell>₹{parseFloat(String(item.wholesaleprice)).toFixed(2)}</TableCell>
                    <TableCell>₹{parseFloat(String(item.retailprice)).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button onClick={() => openEditDialog(item)} variant="outline" size="sm" className="h-8 px-2 bg-info/10 text-[#17a2b8] border-[#17a2b8]/30 hover:bg-info/20">
                          <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button onClick={() => item.id && handleDelete(item.id)} variant="destructive" size="sm" className="h-8 px-2">
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">No products found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && !error && filteredItems.length > 0 && (
        <div className="flex items-center justify-between py-4">
          <span className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} items
          </span>
          <div className="flex gap-2">
            <Button variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-[#6b4783]">
                {editingItem ? "Edit Product Details" : "Enter New Item Details"}
              </DialogTitle>
              <DialogDescription>
                Fill in the item inventory details below. Click Submit to save.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nameEn">Name in English <span className="text-destructive">*</span></Label>
                  <Input 
                    id="nameEn" 
                    placeholder="Enter Name in English" 
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    onBlur={() => handleTranslate(nameEn)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">For searching purposes</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nameTe">Name in Telugu</Label>
                  <Input 
                    id="nameTe" 
                    placeholder="Enter Name in Telugu" 
                    value={nameTe}
                    onChange={(e) => setNameTe(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Auto-translates from English</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nameSecondary">Secondary / Custom Name</Label>
                  <Input 
                    id="nameSecondary" 
                    placeholder="Enter Additional Name" 
                    value={nameSecondary}
                    onChange={(e) => setNameSecondary(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Manual name (doesn't convert to Telugu)</p>
                </div>
              </div>

              {!editingItem && (
                <div className="space-y-2">
                  <Label htmlFor="barcodeOption">Barcode Option <span className="text-destructive">*</span></Label>
                  <Select value={barcodeOption} onValueChange={(v) => setBarcodeOption(v ?? "AGBC")}>
                    <SelectTrigger id="barcodeOption" className="w-full">
                      <SelectValue placeholder="Select a value ..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AGBC">Auto Generate Barcode</SelectItem>
                      <SelectItem value="CBC">Company Barcode (Manual Input)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(barcodeOption === "CBC" || editingItem) && (
                <div className="space-y-2">
                  <Label htmlFor="barcodeVal">Barcode Number <span className="text-destructive">*</span></Label>
                  <Input 
                    id="barcodeVal" 
                    placeholder="Enter Barcode Number" 
                    value={barcodeValue}
                    onChange={(e) => setBarcodeValue(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="units">Units <span className="text-destructive">*</span></Label>
                  <Select value={selectedUnit} onValueChange={(v) => handleUnitChange(v ?? "")}>
                    <SelectTrigger id="units" className="w-full">
                      <SelectValue placeholder="Select a value ..." />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map(unit => (
                        <SelectItem key={unit.id} value={unit.print_label.toLowerCase()}>
                          {unit.print_label} ({unit.name})
                        </SelectItem>
                      ))}
                      <SelectItem value="other">Other (Input Custom Unit)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {showCustomUnitInput && (
                  <div className="space-y-2">
                    <Label htmlFor="customUnit">Custom Unit Name <span className="text-destructive">*</span></Label>
                    <Input 
                      id="customUnit" 
                      placeholder="e.g. PACK, BOX" 
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weightOrPieces">Above unit contain weights or pieces <span className="text-destructive">*</span></Label>
                  <Select value={isWeightOrPieces} onValueChange={(v) => setIsWeightOrPieces(v ?? "pieces")}>
                    <SelectTrigger id="weightOrPieces" className="w-full">
                      <SelectValue placeholder="Select a value ..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weights">Yes (Weights)</SelectItem>
                      <SelectItem value="pieces">No (Pieces)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock">Initial Stock Quantity</Label>
                  <Input 
                    id="stock" 
                    type="number"
                    placeholder="Enter Stock (leave blank for unlimited)" 
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Purchase Price (₹) <span className="text-destructive">*</span></Label>
                  <Input 
                    id="purchasePrice" 
                    type="number" 
                    step="0.01"
                    placeholder="0.00" 
                    value={purchasePrice}
                    onChange={(e) => handlePurchasePriceChange(e.target.value)}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retailPercentage">Retail Profit Margin (%)</Label>
                  <Input 
                    id="retailPercentage" 
                    type="number" 
                    placeholder="e.g. 15" 
                    value={retailPercentage}
                    onChange={(e) => handleRetailPercentageChange(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wholesalePercentage">Wholesale Profit Margin (%)</Label>
                  <Input 
                    id="wholesalePercentage" 
                    type="number" 
                    placeholder="e.g. 8" 
                    value={wholesalePercentage}
                    onChange={(e) => handleWholesalePercentageChange(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="retailPrice">Calculated Retail Price (₹) <span className="text-destructive">*</span></Label>
                  <Input 
                    id="retailPrice" 
                    type="number" 
                    step="0.01"
                    placeholder="0.00" 
                    value={retailPrice}
                    onChange={(e) => setRetailPrice(e.target.value)}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wholesalePrice">Calculated Wholesale Price (₹) <span className="text-destructive">*</span></Label>
                  <Input 
                    id="wholesalePrice" 
                    type="number" 
                    step="0.01"
                    placeholder="0.00" 
                    value={wholesalePrice}
                    onChange={(e) => setWholesalePrice(e.target.value)}
                    required 
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="sm:justify-center">
              <Button type="submit" className="px-8 bg-[#6b4783] hover:bg-[#563969] text-white">Submit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { Edit, Ban, Check, Plus, ArrowLeft, Search, Eye, Trash2, User, Smartphone, MapPin, RefreshCw, ChevronsUpDown } from "lucide-react"
import { billingsApi, productsApi, CreateBillInput, Product } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"

type ViewMode = 'list' | 'customer' | 'billing'

interface CartItem {
  product_id: number
  name: string
  quantity: number
  unit_price: number
  line_total: number
  unit: string
}

export default function RetailBilling() {
  const { user } = useAuth()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [bills, setBills] = useState<any[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Cart/Billing state
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [customerDetails, setCustomerDetails] = useState({ name: '', phone: '', area: '', paymentMode: 'cash' })
  const [editingBillNumber, setEditingBillNumber] = useState<string | null>(null)
  const [isReadOnly, setIsReadOnly] = useState(false)

  // Add Item form state
  const [selectedProductId, setSelectedProductId] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [addQty, setAddQty] = useState("1")
  const [productComboboxOpen, setProductComboboxOpen] = useState(false)
  const [productSearch, setProductSearch] = useState("")

  const filteredProductsForDropdown = allProducts.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    (p as any).barcode?.includes(productSearch)
  ).slice(0, 50)

  const loadData = async () => {
    try {
      setLoading(true)
      // Fetch only retail bills (type=1) from backend; load products from cache in background
      const [billsData] = await Promise.all([
        billingsApi.getAll(1),
        productsApi.getAll().then(data => { setAllProducts(data) }).catch(() => {}),
      ])
      setBills(billsData)
      setError(null)
    } catch (e) {
      console.error(e)
      setError("Failed to load billing information.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const handlePopState = () => {
      setViewMode('list')
      setEditingBillNumber(null)
      setIsReadOnly(false)
    }
    window.addEventListener('popstate', handlePopState)
    
    if (window.location.hash === '#new') {
      window.history.replaceState(null, '', window.location.pathname)
      setTimeout(() => startNewBill(), 100)
    }

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleBackToList = () => {
    window.history.back()
  }

  const startNewBill = () => {
    setCustomerDetails({ name: '', phone: '', area: '', paymentMode: 'cash' })
    setCartItems([])
    setSelectedProductId("")
    setSelectedProduct(null)
    setAddQty("1")
    setEditingBillNumber(null)
    setIsReadOnly(false)
    window.history.pushState({ view: 'billing' }, '')
    setViewMode('billing')
  }

  const loadBillForView = async (billNumber: string, readOnly: boolean) => {
    try {
      setLoading(true)
      const data = await billingsApi.getBill(billNumber)
      setCustomerDetails({
        name: data.customer?.name || '',
        phone: data.customer?.phone || '',
        area: data.customer?.gstin || '',
        paymentMode: data.paymentmode || 'cash',
      })
      const items = data.items.map((i: any) => ({
        product_id: i.product_id,
        name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        line_total: i.line_total,
        unit: i.unit
      }))
      setCartItems(items)
      setEditingBillNumber(readOnly ? null : billNumber)
      setIsReadOnly(readOnly)
      window.history.pushState({ view: 'billing' }, '')
      setViewMode('billing')
    } catch (e) {
      alert("Failed to load bill details")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (billNumber: string) => {
    if (!confirm("Are you sure you want to delete this bill?")) return
    try {
      setLoading(true)
      await billingsApi.deleteBill(billNumber)
      await loadData()
    } catch (e) {
      alert("Failed to delete bill")
      setLoading(false)
    }
  }

  const handleProductSelect = (idStr: string) => {
    setSelectedProductId(idStr)
    const prod = allProducts.find(p => String(p.id) === idStr)
    setSelectedProduct(prod || null)
  }

  const addToCart = () => {
    if (!selectedProduct || !selectedProduct.id) return
    const qty = parseInt(addQty) || 1
    const price = parseFloat(String(selectedProduct.retailprice)) || 0
    const total = qty * price

    const newItem: CartItem = {
      product_id: selectedProduct.id,
      name: selectedProduct.name.split("/")[0] || selectedProduct.name,
      quantity: qty,
      unit_price: price,
      line_total: total,
      unit: selectedProduct.unit
    }

    setCartItems([...cartItems, newItem])
    setSelectedProductId("")
    setSelectedProduct(null)
    setAddQty("1")
  }

  const removeFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index))
  }

  const handleCheckout = async (shouldPrint: boolean) => {
    if (cartItems.length === 0) return
    try {
      setLoading(true)
      const grandTotal = cartItems.reduce((sum, item) => sum + item.line_total, 0)

      const payload: CreateBillInput = {
        customer: {
          name: customerDetails.name,
          phone: customerDetails.phone,
          gstin: customerDetails.area, // Mapping place/area to gstin/address field
          type: 1
        },
        user_id: user?.id,
        type: 1, // Retail estimation bill
        paymentmode: customerDetails.paymentMode,
        grandtotal: grandTotal,
        items: cartItems.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          line_total: i.line_total
        }))
      }

      let response;
      if (editingBillNumber) {
        response = await billingsApi.updateBill({ ...payload, bill_number: editingBillNumber })
      } else {
        response = await billingsApi.createBill(payload)
      }
      if (shouldPrint && response.bill_number) {
        window.open(`/print/${response.bill_number}`, '_blank')
      }
      handleBackToList()
      await loadData()
    } catch (e) {
      console.error(e)
      alert("Failed to submit bill checkout.")
      setLoading(false)
    }
  }

  const cartTotal = cartItems.reduce((sum, item) => sum + item.line_total, 0)

  const filteredBills = bills.filter(
    (b) =>
      b.bill_number?.startsWith("R") &&
      ((b.customer_name && b.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      b.phonenumber.includes(searchQuery) ||
      String(b.id).includes(searchQuery))
  )

  if (viewMode === 'list') {
    return (
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">List of Retails Estimation Bills</h2>
            <p className="text-muted-foreground">View and manage retail bills.</p>
          </div>
          <Button onClick={startNewBill} className="gap-2 bg-[#6b4783] hover:bg-[#563969] text-white">
            <Plus className="h-4 w-4" /> Add New Bill
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4 py-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer name, phone, or bill number..."
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
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-medium w-[50px]">#</TableHead>
                  <TableHead className="font-medium">Bill No</TableHead>
                  <TableHead className="font-medium">Customer Name</TableHead>
                  <TableHead className="font-medium">Phone</TableHead>
                  <TableHead className="font-medium">Date Created</TableHead>
                  <TableHead className="font-medium">Payment Mode</TableHead>
                  <TableHead className="font-medium text-right">Total Amount</TableHead>
                  <TableHead className="font-medium text-center w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.length > 0 ? (
                  filteredBills.map((bill, index) => (
                    <TableRow key={bill.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="text-muted-foreground font-bold">{bill.bill_number}</TableCell>
                      <TableCell className="font-bold">{bill.customer_name || "Walk-in"}</TableCell>
                      <TableCell className="text-blue-600 font-semibold">{bill.phonenumber}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(bill.datetime).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{bill.paymentmode}</TableCell>
                      <TableCell className="text-right font-bold text-green-700">
                        ₹{parseFloat(String(bill.grandtotal)).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button onClick={() => loadBillForView(bill.bill_number, true)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button onClick={() => loadBillForView(bill.bill_number, false)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button onClick={() => handleDelete(bill.bill_number)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No bills found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    )
  }

  // viewMode === 'billing'
  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isReadOnly ? "View Retail Estimation Bill" : editingBillNumber ? "Edit Retail Estimation Bill" : "Retail Billing"}
          </h2>
        </div>
        <Button variant="outline" onClick={handleBackToList} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to List
        </Button>
      </div>
      
      <Card className="shadow-sm border-muted">
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="space-y-2">
              <Label className="font-bold text-sm">Name <span className="text-destructive">*</span></Label>
              <div className="flex rounded-md shadow-sm">
                <Input 
                  placeholder="Enter Name" 
                  className="rounded-r-none focus-visible:z-10" 
                  value={customerDetails.name}
                  onChange={e => setCustomerDetails({...customerDetails, name: e.target.value})}
                  disabled={isReadOnly}
                />
                <div className="flex items-center justify-center px-3 border border-l-0 border-input bg-muted rounded-r-md text-muted-foreground">
                  <User className="h-4 w-4" />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="font-bold text-sm">Phone <span className="text-destructive">*</span></Label>
              <div className="flex rounded-md shadow-sm">
                <Input 
                  placeholder="Enter Phone" 
                  className="rounded-r-none focus-visible:z-10" 
                  value={customerDetails.phone}
                  onChange={e => setCustomerDetails({...customerDetails, phone: e.target.value.replace(/\D/g, '')})}
                  disabled={isReadOnly}
                />
                <div className="flex items-center justify-center px-3 border border-l-0 border-input bg-muted rounded-r-md text-muted-foreground">
                  <Smartphone className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-sm">Place / Area <span className="text-destructive">*</span></Label>
              <div className="flex rounded-md shadow-sm">
                <Input 
                  placeholder="Enter Area" 
                  className="rounded-r-none focus-visible:z-10" 
                  value={customerDetails.area}
                  onChange={e => setCustomerDetails({...customerDetails, area: e.target.value})}
                  disabled={isReadOnly}
                />
                <div className="flex items-center justify-center px-3 border border-l-0 border-input bg-muted rounded-r-md text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-sm">Payment Mode <span className="text-destructive">*</span></Label>
              <Select disabled={isReadOnly} value={customerDetails.paymentMode} onValueChange={v => setCustomerDetails({...customerDetails, paymentMode: v ?? "cash"})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Payment Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="estimation">Estimation</SelectItem>
                  <SelectItem value="hold_bill">Hold Bill</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Left Panel: Add Item Form */}
        {!isReadOnly && (
        <Card className="xl:col-span-3 shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="font-medium text-sm">Item</Label>
              <Popover open={productComboboxOpen} onOpenChange={setProductComboboxOpen}>
                <PopoverTrigger 
                  className={cn(buttonVariants({ variant: "outline" }), "w-full justify-between font-normal")}
                  role="combobox"
                  aria-expanded={productComboboxOpen}
                >
                    <span className="truncate">
                      {selectedProduct ? selectedProduct.name.split("/")[0] : "Select an Item..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Search item..." 
                      value={productSearch}
                      onValueChange={setProductSearch}
                    />
                    <CommandList>
                      <CommandEmpty>No item found.</CommandEmpty>
                      <CommandGroup>
                        {filteredProductsForDropdown.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={p.name.split("/")[0]}
                            onSelect={() => {
                              handleProductSelect(String(p.id))
                              setProductComboboxOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedProductId === String(p.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {p.name.split("/")[0]}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label className="font-medium text-sm">Rate (₹)</Label>
              <Input 
                value={selectedProduct ? parseFloat(String(selectedProduct.retailprice)).toFixed(2) : "0.00"} 
                readOnly 
                className="bg-muted text-muted-foreground" 
              />
            </div>

            <div className="space-y-2">
              <Label className="font-medium text-sm">Qty</Label>
              <Input 
                type="number"
                value={addQty} 
                onChange={(e) => setAddQty(e.target.value)}
                className="pr-8" 
              />
            </div>

            <div className="space-y-2">
              <Label className="font-medium text-sm">Amount (₹)</Label>
              <Input 
                value={selectedProduct ? (parseFloat(String(selectedProduct.retailprice)) * (parseInt(addQty) || 0)).toFixed(2) : "0.00"} 
                readOnly 
                className="bg-muted text-muted-foreground" 
              />
            </div>

            <div className="pt-4 text-center">
              <Button 
                onClick={addToCart} 
                disabled={!selectedProduct} 
                className="w-full bg-[#6b4783] hover:bg-[#563969] text-white"
              >
                Add Item
              </Button>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Middle Panel: Items Table */}
        <div className={`bg-white border rounded-md shadow-sm overflow-hidden flex flex-col min-h-[350px] ${isReadOnly ? 'xl:col-span-9' : 'xl:col-span-6'}`}>
          <Table>
            <TableHeader className="bg-muted/50 border-b">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>ITEMS</TableHead>
                <TableHead>RATE</TableHead>
                <TableHead>QTY</TableHead>
                <TableHead>UNITS</TableHead>
                <TableHead className="text-right">AMOUNT</TableHead>
                <TableHead className="w-[80px] text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cartItems.length > 0 ? (
                cartItems.map((item, index) => (
                  <TableRow key={index} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-bold">{item.name}</TableCell>
                    <TableCell>₹{item.unit_price.toFixed(2)}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right font-bold text-green-700">₹{item.line_total.toFixed(2)}</TableCell>
                    {!isReadOnly && (
                    <TableCell className="text-right">
                      <Button onClick={() => removeFromCart(index)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow className="hover:bg-transparent border-0">
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex items-center justify-center gap-2 text-lg font-medium text-muted-foreground">
                      <Ban className="h-5 w-5" /> No Items Added Yet
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Right Panel: Summary & Actions */}
        <Card className="xl:col-span-3 bg-muted/30 shadow-sm h-full min-h-[350px] flex flex-col items-center justify-center p-6 border-muted">
          <div className="text-center space-y-3 mb-8">
            <p className="text-muted-foreground text-sm">
              Number of Items :<span className="font-bold text-foreground ml-1">{cartItems.length}</span>
            </p>
            <p className="text-4xl font-bold text-foreground">
              ₹{cartTotal.toFixed(2)}
            </p>
          </div>
          
          {!isReadOnly ? (
            <div className="flex flex-col w-full gap-3 max-w-[200px]">
              <Button 
                onClick={() => handleCheckout(false)} 
                disabled={cartItems.length === 0 || !customerDetails.name || !customerDetails.phone || !customerDetails.area} 
                className="w-full bg-[#6b4783] hover:bg-[#563969] text-white"
              >
                {editingBillNumber ? "Update Bill" : "Add to list"}
              </Button>
              <Button 
                onClick={() => handleCheckout(true)} 
                disabled={cartItems.length === 0 || !customerDetails.name || !customerDetails.phone || !customerDetails.area} 
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Print Receipt
              </Button>
            </div>
          ) : (
            <div className="flex flex-col w-full gap-3 max-w-[200px]">
              <Button 
                onClick={() => window.open(`/print/${editingBillNumber || bills.find(b => b.grandtotal === cartTotal)?.bill_number}`, '_blank')} 
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Print Receipt
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
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
import {
  Plus,
  Search,
  User,
  Smartphone,
  MapPin,
  Trash2,
  Printer,
  Check,
  ChevronsUpDown,
  RefreshCw,
  Eye,
  Edit,
  ArrowLeft,
  Layers,
  Tag,
} from "lucide-react"
import { productsApi, billingsApi, Product, BillingItem, CreateBillInput } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface CartItem {
  product_id: number
  name: string
  quantity: number
  price_type: "retail" | "wholesale"
  unit_price: number
  line_total: number
  unit: string
  retail_price: number
  wholesale_price: number
}

type ViewMode = "list" | "billing"

export default function HybridBillingPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [editingBillNumber, setEditingBillNumber] = useState<string | null>(null)
  const [isReadOnly, setIsReadOnly] = useState(false)

  // List View States
  const [bills, setBills] = useState<BillingItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  // Form & Cart States
  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    phone: "",
    area: "",
    paymentMode: "cash",
  })

  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [priceType, setPriceType] = useState<"retail" | "wholesale">("retail")
  const [addQty, setAddQty] = useState("1")
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  // Dropdown states
  const [productComboboxOpen, setProductComboboxOpen] = useState(false)
  const [productSearch, setProductSearch] = useState("")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const filteredProductsForDropdown = allProducts.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    (p as any).barcode?.includes(productSearch)
  ).slice(0, 50)

  const loadData = async () => {
    try {
      setLoading(true)
      // Fetch only hybrid bills (type=3) from backend; load products from cache in background
      const [billsData] = await Promise.all([
        billingsApi.getAll(3),
        productsApi.getAll().then(data => { setAllProducts(data) }).catch(() => {}),
      ])
      setBills(billsData)
      setError(null)
    } catch (e) {
      console.error(e)
      setError("Failed to load billing data.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const startNewBill = () => {
    setEditingBillNumber(null)
    setIsReadOnly(false)
    setCustomerDetails({ name: "", phone: "", area: "", paymentMode: "cash" })
    setCartItems([])
    setSelectedProductId("")
    setSelectedProduct(null)
    setPriceType("retail")
    setAddQty("1")
    setViewMode("billing")
  }

  const handleBackToList = () => {
    setViewMode("list")
    setEditingBillNumber(null)
    setIsReadOnly(false)
  }

  const handleViewOrEditBill = async (billNumber: string, readOnly: boolean) => {
    try {
      setLoading(true)
      const billData = await billingsApi.getBill(billNumber)
      
      setCustomerDetails({
        name: billData.customer_name || "",
        phone: billData.phonenumber || "",
        area: billData.customer_gstin || "",
        paymentMode: billData.paymentmode || "cash",
      })

      const mappedCartItems: CartItem[] = billData.items.map((item: any) => {
        const prod = allProducts.find(p => p.id === item.product_id)
        const retPrice = prod ? parseFloat(String(prod.retailprice)) || 0 : item.unit_price
        const wsPrice = prod ? parseFloat(String(prod.wholesaleprice)) || 0 : item.unit_price
        const isWs = Math.abs(item.unit_price - wsPrice) < 0.01

        return {
          product_id: item.product_id,
          name: item.product_name || "Product",
          quantity: item.quantity,
          price_type: isWs ? "wholesale" : "retail",
          unit_price: item.unit_price,
          line_total: item.line_total,
          unit: item.unit || "P",
          retail_price: retPrice,
          wholesale_price: wsPrice,
        }
      })

      setCartItems(mappedCartItems)
      setEditingBillNumber(readOnly ? null : billNumber)
      setIsReadOnly(readOnly)
      setViewMode("billing")
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
    const retPrice = parseFloat(String(selectedProduct.retailprice)) || 0
    const wsPrice = parseFloat(String(selectedProduct.wholesaleprice)) || 0
    const price = priceType === "wholesale" ? wsPrice : retPrice
    const total = qty * price

    const newItem: CartItem = {
      product_id: selectedProduct.id,
      name: selectedProduct.name.split("/")[0] || selectedProduct.name,
      quantity: qty,
      price_type: priceType,
      unit_price: price,
      line_total: total,
      unit: selectedProduct.unit,
      retail_price: retPrice,
      wholesale_price: wsPrice,
    }

    setCartItems([...cartItems, newItem])
    setSelectedProductId("")
    setSelectedProduct(null)
    setAddQty("1")
  }

  const updateCartItemPriceType = (index: number, newType: "retail" | "wholesale") => {
    const updated = [...cartItems]
    const item = updated[index]
    const newPrice = newType === "wholesale" ? item.wholesale_price : item.retail_price
    
    updated[index] = {
      ...item,
      price_type: newType,
      unit_price: newPrice,
      line_total: item.quantity * newPrice,
    }

    setCartItems(updated)
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
          gstin: customerDetails.area,
          type: 3
        },
        user_id: user?.id,
        type: 3, // Hybrid bill type
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
      b.bill_number?.startsWith("H") &&
      ((b.customer_name && b.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      b.phonenumber.includes(searchQuery) ||
      String(b.id).includes(searchQuery))
  )

  if (viewMode === 'list') {
    return (
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">List of Hybrid Billing</h2>
            <p className="text-muted-foreground">Manage hybrid bills with custom item rates.</p>
          </div>
          <Button onClick={startNewBill} className="gap-2 bg-[#6b4783] hover:bg-[#563969] text-white">
            <Plus className="h-4 w-4" /> Add New Hybrid Bill
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4 py-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer, phone, or bill #..."
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
                  <TableHead className="font-medium w-[50px]">#</TableHead>
                  <TableHead>Bill No.</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Grand Total</TableHead>
                  <TableHead>Payment Mode</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[180px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.length > 0 ? (
                  filteredBills.map((b, index) => (
                    <TableRow key={b.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-bold text-[#6b4783]">{b.bill_number}</TableCell>
                      <TableCell>{b.customer_name}</TableCell>
                      <TableCell>{b.phonenumber}</TableCell>
                      <TableCell className="font-bold text-green-700">₹{parseFloat(String(b.grandtotal)).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{b.paymentmode}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(b.datetime).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button onClick={() => handleViewOrEditBill(b.bill_number, true)} variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Eye className="h-4 w-4 text-slate-600" />
                          </Button>
                          <Button onClick={() => handleViewOrEditBill(b.bill_number, false)} variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button onClick={() => window.open(`/print/${b.bill_number}`, '_blank')} variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Printer className="h-4 w-4 text-purple-600" />
                          </Button>
                          <Button onClick={() => handleDelete(b.bill_number)} variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Trash2 className="h-4 w-4 text-red-600" />
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

  const activeRate = selectedProduct 
    ? (priceType === "wholesale" ? parseFloat(String(selectedProduct.wholesaleprice)) : parseFloat(String(selectedProduct.retailprice)))
    : 0

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleBackToList} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to List
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">
            {isReadOnly ? "View Bill Details" : editingBillNumber ? `Edit Bill #${editingBillNumber}` : "Hybrid Billing"}
          </h2>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        <Card className="xl:col-span-4 shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="font-medium text-sm">Select Item</Label>
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
                            <span className="truncate">{p.name.split("/")[0]}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {selectedProduct && (
              <div className="p-3 bg-muted/30 rounded-md border space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Select Pricing Mode</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={priceType === "retail" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPriceType("retail")}
                      className={cn(
                        "w-full text-xs gap-1 font-bold",
                        priceType === "retail" ? "bg-[#6b4783] hover:bg-[#563969] text-white" : ""
                      )}
                    >
                      <Tag className="h-3 w-3" /> Retail (₹{parseFloat(String(selectedProduct.retailprice)).toFixed(2)})
                    </Button>
                    <Button
                      type="button"
                      variant={priceType === "wholesale" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPriceType("wholesale")}
                      className={cn(
                        "w-full text-xs gap-1 font-bold",
                        priceType === "wholesale" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""
                      )}
                    >
                      <Tag className="h-3 w-3" /> Wholesale (₹{parseFloat(String(selectedProduct.wholesaleprice)).toFixed(2)})
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm pt-1 border-t">
                  <span className="text-muted-foreground font-medium">Selected Rate:</span>
                  <span className="font-bold text-base text-[#6b4783]">
                    ₹{activeRate.toFixed(2)} / {selectedProduct.unit}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="font-medium text-sm">Quantity</Label>
              <Input 
                type="number" 
                min="1" 
                value={addQty} 
                onChange={e => setAddQty(e.target.value)}
              />
            </div>

            <Button 
              onClick={addToCart} 
              disabled={!selectedProduct}
              className="w-full bg-[#6b4783] hover:bg-[#563969] text-white"
            >
              Add Item to Bill
            </Button>
          </CardContent>
        </Card>
        )}

        {/* Right Panel: Cart Items Table */}
        <Card className={cn("shadow-sm", isReadOnly ? "xl:col-span-12" : "xl:col-span-8")}>
          <CardContent className="p-4 space-y-4">
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[40px]">#</TableHead>
                    <TableHead>ITEMS</TableHead>
                    <TableHead className="w-[140px]">COST TYPE</TableHead>
                    <TableHead className="text-right">RATE</TableHead>
                    <TableHead className="text-center w-[70px]">QTY</TableHead>
                    <TableHead className="w-[60px]">UNITS</TableHead>
                    <TableHead className="text-right">AMOUNT</TableHead>
                    {!isReadOnly && <TableHead className="w-[40px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cartItems.length > 0 ? (
                    cartItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-bold">{item.name}</TableCell>
                        <TableCell>
                          {!isReadOnly ? (
                            <Select 
                              value={item.price_type} 
                              onValueChange={(val) => val && updateCartItemPriceType(index, val as "retail" | "wholesale")}
                            >
                              <SelectTrigger className="h-7 text-xs font-semibold">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="retail" className="text-xs font-medium">Retail (₹{item.retail_price})</SelectItem>
                                <SelectItem value="wholesale" className="text-xs font-medium">Wholesale (₹{item.wholesale_price})</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={item.price_type === "wholesale" ? "secondary" : "default"} className="capitalize text-xs">
                              {item.price_type}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">₹{item.unit_price.toFixed(2)}</TableCell>
                        <TableCell className="text-center font-bold">{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-right font-bold text-green-700">₹{item.line_total.toFixed(2)}</TableCell>
                        {!isReadOnly && (
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeFromCart(index)}
                              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={isReadOnly ? 7 : 8} className="text-center py-8 text-muted-foreground">
                        No items added to bill yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t">
              <div className="text-xl font-bold">
                Grand Total: <span className="text-[#6b4783]">₹{cartTotal.toFixed(2)}</span>
              </div>
              {!isReadOnly && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    onClick={() => handleCheckout(false)} 
                    disabled={cartItems.length === 0}
                    variant="outline"
                    className="flex-1 sm:flex-none"
                  >
                    Save Bill
                  </Button>
                  <Button 
                    onClick={() => handleCheckout(true)} 
                    disabled={cartItems.length === 0}
                    className="flex-1 sm:flex-none gap-2 bg-[#6b4783] hover:bg-[#563969] text-white"
                  >
                    <Printer className="h-4 w-4" /> Save & Print
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

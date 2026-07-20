"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
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
import { Edit, Ban, Plus, ArrowLeft, Search, Eye, Trash2, User, Smartphone, MapPin, RefreshCw } from "lucide-react"
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

export default function WholesaleBilling() {
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

  // Add Item form state
  const [selectedProductId, setSelectedProductId] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [addQty, setAddQty] = useState("1")

  const loadData = async () => {
    try {
      setLoading(true)
      const [billsData, productsData] = await Promise.all([
        billingsApi.getAll(),
        productsApi.getAll()
      ])
      // Filter for Wholesale bills (type 2)
      const wholesaleBills = billsData.filter(b => b.type === 2)
      setBills(wholesaleBills)
      setAllProducts(productsData)
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
  }, [])

  const startNewBill = () => {
    setCustomerDetails({ name: '', phone: '', area: '', paymentMode: 'cash' })
    setCartItems([])
    setSelectedProductId("")
    setSelectedProduct(null)
    setAddQty("1")
    setViewMode('customer')
  }

  const handleProductSelect = (idStr: string) => {
    setSelectedProductId(idStr)
    const prod = allProducts.find(p => String(p.id) === idStr)
    setSelectedProduct(prod || null)
  }

  const addToCart = () => {
    if (!selectedProduct || !selectedProduct.id) return
    const qty = parseInt(addQty) || 1
    const price = parseFloat(String(selectedProduct.wholesaleprice)) || 0
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

  const handleCheckout = async () => {
    if (cartItems.length === 0) return
    try {
      setLoading(true)
      const grandTotal = cartItems.reduce((sum, item) => sum + item.line_total, 0)

      const payload: CreateBillInput = {
        customer: {
          name: customerDetails.name,
          phone: customerDetails.phone,
          gstin: customerDetails.area, // Mapping place/area to gstin/address field
          type: 2
        },
        user_id: user?.id,
        type: 2, // Wholesale estimation bill
        paymentmode: customerDetails.paymentMode,
        grandtotal: grandTotal,
        items: cartItems.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          line_total: i.line_total
        }))
      }

      await billingsApi.createBill(payload)
      setViewMode('list')
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
      (b.customer_name && b.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      b.phonenumber.includes(searchQuery) ||
      String(b.id).includes(searchQuery)
  )

  if (viewMode === 'list') {
    return (
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">List of Wholesale Estimation Bills</h2>
            <p className="text-muted-foreground">View and manage wholesale bills.</p>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.length > 0 ? (
                  filteredBills.map((bill, index) => (
                    <TableRow key={bill.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="text-muted-foreground font-bold">INV-{bill.id}</TableCell>
                      <TableCell className="font-bold">{bill.customer_name || "Walk-in"}</TableCell>
                      <TableCell className="text-blue-600 font-semibold">{bill.phonenumber}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(bill.datetime).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{bill.paymentmode}</TableCell>
                      <TableCell className="text-right font-bold text-green-700">
                        ₹{parseFloat(String(bill.grandtotal)).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No bills found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    )
  }

  if (viewMode === 'customer') {
    return (
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold tracking-tight text-[#6b4783]">New Wholesale Estimation Bill</h2>
          <Button variant="outline" onClick={() => setViewMode('list')} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to List
          </Button>
        </div>

        <Card className="shadow-sm border-muted">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Enter Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="font-bold text-sm">Name <span className="text-destructive">*</span></Label>
                <div className="flex rounded-md shadow-sm">
                  <Input 
                    placeholder="Enter Name" 
                    className="rounded-r-none focus-visible:z-10" 
                    value={customerDetails.name}
                    onChange={e => setCustomerDetails({...customerDetails, name: e.target.value})}
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
                    onChange={e => setCustomerDetails({...customerDetails, phone: e.target.value})}
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
                  />
                  <div className="flex items-center justify-center px-3 border border-l-0 border-input bg-muted rounded-r-md text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-sm">Payment Mode <span className="text-destructive">*</span></Label>
              <Select value={customerDetails.paymentMode} onValueChange={v => setCustomerDetails({...customerDetails, paymentMode: v ?? "cash"})}>
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

            <div className="pt-4 text-center">
              <Button 
                className="bg-[#6b4783] hover:bg-[#563969] text-white px-8"
                onClick={() => {
                  if (customerDetails.name && customerDetails.phone && customerDetails.area) {
                    setViewMode('billing')
                  }
                }}
                disabled={!customerDetails.name || !customerDetails.phone || !customerDetails.area}
              >
                Proceed to Bill
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // viewMode === 'billing'
  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold tracking-tight text-[#6b4783]">Wholesale Estimation Bill</h2>
        <Button variant="outline" onClick={() => setViewMode('customer')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Edit Customer Details
        </Button>
      </div>
      
      <div>
        <div className="border rounded-md overflow-hidden bg-white shadow-sm">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-medium h-10">Bill No</TableHead>
                <TableHead className="font-medium h-10">Date Created</TableHead>
                <TableHead className="font-medium h-10">Mobile</TableHead>
                <TableHead className="font-medium h-10">Name</TableHead>
                <TableHead className="font-medium h-10">Place</TableHead>
                <TableHead className="font-medium h-10 text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-white hover:bg-transparent">
                <TableCell className="font-medium py-2">NEW-BILL</TableCell>
                <TableCell className="py-2 text-muted-foreground">{new Date().toLocaleString()}</TableCell>
                <TableCell className="py-2 text-muted-foreground">{customerDetails.phone}</TableCell>
                <TableCell className="py-2 font-medium">{customerDetails.name}</TableCell>
                <TableCell className="py-2 text-muted-foreground">{customerDetails.area}</TableCell>
                <TableCell className="text-right py-2">
                  <Button variant="outline" size="sm" className="h-8" onClick={() => setViewMode('customer')}>
                    <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Left Panel: Add Item Form */}
        <Card className="xl:col-span-3 shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="font-medium text-sm">Item</Label>
              <Select value={selectedProductId} onValueChange={(v) => handleProductSelect(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an Item..." />
                </SelectTrigger>
                <SelectContent>
                  {allProducts.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name.split("/")[0]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="font-medium text-sm">Rate (₹)</Label>
              <Input 
                value={selectedProduct ? parseFloat(String(selectedProduct.wholesaleprice)).toFixed(2) : "0.00"} 
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
                value={selectedProduct ? (parseFloat(String(selectedProduct.wholesaleprice)) * (parseInt(addQty) || 0)).toFixed(2) : "0.00"} 
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

        {/* Middle Panel: Items Table */}
        <div className="xl:col-span-6 bg-white border rounded-md shadow-sm overflow-hidden flex flex-col min-h-[350px]">
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
                    <TableCell className="text-right">
                      <Button onClick={() => removeFromCart(index)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
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
          
          <div className="flex flex-col w-full gap-3 max-w-[200px]">
            <Button 
              onClick={handleCheckout} 
              disabled={cartItems.length === 0} 
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Print Receipt
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

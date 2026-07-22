"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PlusCircle, ShoppingCart, Truck, IndianRupee, Users, PackageOpen, TrendingUp, TrendingDown, RefreshCw, Tag, AlertCircle, Check, Search } from "lucide-react"
import Link from "next/link"
import { billingsApi, productsApi, DashboardStats, Product } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"

export default function Dashboard() {
  const { user } = useAuth()
  const isAdmin = user?.role === 1

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [pendingProducts, setPendingProducts] = useState<Product[]>([])
  const [pendingSearchQuery, setPendingSearchQuery] = useState("")
  const [lowStockSearchQuery, setLowStockSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Quick Price Modal State for Admins
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [purchasePrice, setPurchasePrice] = useState("")
  const [retailPercentage, setRetailPercentage] = useState("")
  const [wholesalePercentage, setWholesalePercentage] = useState("")
  const [retailPrice, setRetailPrice] = useState("")
  const [wholesalePrice, setWholesalePrice] = useState("")
  const [savingPrice, setSavingPrice] = useState(false)

  // Quick Stock Modal State
  const [selectedStockProduct, setSelectedStockProduct] = useState<Product | null>(null)
  const [newStockQty, setNewStockQty] = useState("")
  const [savingStock, setSavingStock] = useState(false)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const [statsData, productsData] = await Promise.all([
        billingsApi.getDashboardStats(),
        productsApi.getAll(true)
      ])
      setStats(statsData)
      setAllProducts(productsData)
      
      // Filter unpriced products (purchaseprice === 0 or retailprice === 0)
      const unpriced = productsData.filter(p => 
        !parseFloat(String(p.retailprice)) || !parseFloat(String(p.purchaseprice))
      )
      setPendingProducts(unpriced)
      setError(null)
    } catch (e: any) {
      console.error(e)
      setError("Failed to load dashboard statistics.")
    } finally {
      setLoading(false)
    }
  }

  const openStockModal = (product: Product) => {
    setSelectedStockProduct(product)
    setNewStockQty(product.stock !== null ? String(product.stock) : "0")
  }

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStockProduct || !selectedStockProduct.id) return
    try {
      setSavingStock(true)
      const updatedProduct: Product = {
        ...selectedStockProduct,
        stock: parseInt(newStockQty) || 0,
      }
      await productsApi.update(selectedStockProduct.id, updatedProduct)
      productsApi.invalidateCache()
      setSelectedStockProduct(null)
      await fetchStats()
    } catch (err) {
      console.error(err)
      alert("Failed to update product stock.")
    } finally {
      setSavingStock(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const openPriceModal = (product: Product) => {
    setSelectedProduct(product)
    setPurchasePrice(product.purchaseprice ? String(product.purchaseprice) : "")
    setRetailPercentage(product.retailpercentage ? String(product.retailpercentage) : "")
    setWholesalePercentage(product.wholesalepercentage ? String(product.wholesalepercentage) : "")
    setRetailPrice(product.retailprice ? String(product.retailprice) : "")
    setWholesalePrice(product.wholesaleprice ? String(product.wholesaleprice) : "")
  }

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

  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct || !selectedProduct.id) return
    if (!purchasePrice || !retailPrice || !wholesalePrice) {
      alert("Please enter valid prices.")
      return
    }

    try {
      setSavingPrice(true)
      const updatedProduct: Product = {
        ...selectedProduct,
        purchaseprice: parseFloat(purchasePrice) || 0,
        retailprice: parseFloat(retailPrice) || 0,
        wholesaleprice: parseFloat(wholesalePrice) || 0,
        retailpercentage: parseFloat(retailPercentage) || 0,
        wholesalepercentage: parseFloat(wholesalePercentage) || 0,
      }
      await productsApi.update(selectedProduct.id, updatedProduct)
      productsApi.invalidateCache()
      setSelectedProduct(null)
      await fetchStats()
    } catch (err) {
      console.error(err)
      alert("Failed to update product prices.")
    } finally {
      setSavingPrice(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[450px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-[#6b4783]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-destructive font-medium">{error}</p>
        <Button onClick={fetchStats} className="bg-[#6b4783] hover:bg-[#563969]">Try Again</Button>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back! Here is an overview of your business today.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/retail#new">
            <Button className="gap-2 bg-[#6b4783] hover:bg-[#563969]">
              <ShoppingCart className="h-4 w-4" />
              New Retail Bill
            </Button>
          </Link>
          <Link href="/wholesale#new">
            <Button variant="secondary" className="gap-2">
              <Truck className="h-4 w-4" />
              New Wholesale Bill
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue (Today)</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats?.today_revenue.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-muted-foreground flex items-center text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              Live update
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales (Today)</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats?.today_sales_count || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Estimated bills
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses (Total)</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats?.monthly_expenses.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-muted-foreground mt-1 text-red-600 flex items-center">
              <TrendingDown className="h-3 w-3 mr-1" />
              All time logged
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.customer_count || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3-Column Section: Recent Bills | Items Pending Pricing | Low Stock Alerts */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
        {/* Column 1: Recent Bills */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base font-bold">Recent Bills</CardTitle>
            <CardDescription>
              Last 5 generated sales invoices.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-6">
              {stats?.recent_bills && stats.recent_bills.length > 0 ? (
                stats.recent_bills.map((bill) => (
                  <div key={bill.billNo} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-bold leading-none text-[#6b4783]">{bill.billNo}</p>
                      <p className="text-xs text-muted-foreground">
                        {bill.type} - {bill.name} ({bill.paymentMode})
                      </p>
                    </div>
                    <div className="font-semibold text-sm text-green-700">+₹{bill.total.toFixed(2)}</div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground">No recent bills found.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Column 2: Items Pending Pricing */}
        <Card className="flex flex-col border-amber-200 bg-amber-50/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Tag className="h-4 w-4 text-amber-600" />
                Pending Item Prices
              </CardTitle>
              <CardDescription>
                Items added without pricing.
              </CardDescription>
            </div>
            {pendingProducts.length > 0 && (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 font-bold">
                {pendingProducts.length} pending
              </Badge>
            )}
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            {pendingProducts.length > 0 && (
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search pending items by name..."
                  className="pl-8 h-8 text-xs bg-white border-amber-200"
                  value={pendingSearchQuery}
                  onChange={(e) => setPendingSearchQuery(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {(() => {
                const query = pendingSearchQuery.trim().toLowerCase()
                const filteredPendingProducts = pendingProducts
                  .filter((product) => {
                    if (!query) return true
                    return product.name.toLowerCase().includes(query)
                  })
                  .sort((a, b) => {
                    if (!query) return 0
                    const aName = a.name.toLowerCase()
                    const bName = b.name.toLowerCase()
                    const aStarts = aName.startsWith(query)
                    const bStarts = bName.startsWith(query)
                    if (aStarts && !bStarts) return -1
                    if (!aStarts && bStarts) return 1
                    return aName.indexOf(query) - bName.indexOf(query)
                  })

                if (filteredPendingProducts.length > 0) {
                  return filteredPendingProducts.slice(0, 15).map((product) => {
                    const displayName = product.name.split("/")[0]
                    return (
                      <div key={product.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-white shadow-2xs">
                        <div className="space-y-0.5 overflow-hidden pr-2">
                          <p className="text-sm font-bold truncate">{displayName}</p>
                          <p className="text-xs text-muted-foreground">Unit: {product.unit}</p>
                        </div>
                        {isAdmin ? (
                          <Button
                            size="sm"
                            onClick={() => openPriceModal(product)}
                            className="h-8 text-xs font-semibold bg-[#6b4783] hover:bg-[#563969] text-white shrink-0"
                          >
                            Set Price
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-xs text-amber-700 border-amber-300 bg-amber-50 shrink-0">
                            Pending Admin
                          </Badge>
                        )}
                      </div>
                    )
                  })
                }

                if (pendingProducts.length > 0) {
                  return (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No pending items match "{pendingSearchQuery}"
                    </div>
                  )
                }

                return (
                  <div className="text-center py-8 space-y-2">
                    <Check className="h-8 w-8 text-green-500 mx-auto" />
                    <p className="text-xs text-muted-foreground font-medium">All items have assigned prices!</p>
                  </div>
                )
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Column 3: Low Stock Alerts */}
        <Card className="flex flex-col border-orange-200 bg-orange-50/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <PackageOpen className="h-4 w-4 text-orange-600" />
                Low Stock Alerts
              </CardTitle>
              <CardDescription>Items running below reorder level (5 or less)</CardDescription>
            </div>
            {(() => {
              const lowStockProducts = allProducts.filter(p => p.stock !== null && p.stock <= 5)
              return lowStockProducts.length > 0 ? (
                <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 font-bold">
                  {lowStockProducts.length} low stock
                </Badge>
              ) : null
            })()}
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            {(() => {
              const lowStockProducts = allProducts.filter(p => p.stock !== null && p.stock <= 5)
              return (
                <>
                  {lowStockProducts.length > 0 && (
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search low stock items by name..."
                        className="pl-8 h-8 text-xs bg-white border-orange-200"
                        value={lowStockSearchQuery}
                        onChange={(e) => setLowStockSearchQuery(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                    {(() => {
                      const query = lowStockSearchQuery.trim().toLowerCase()
                      const filteredLowStock = lowStockProducts
                        .filter((p) => !query || p.name.toLowerCase().includes(query))
                        .sort((a, b) => {
                          if (!query) return (a.stock ?? 0) - (b.stock ?? 0)
                          const aName = a.name.toLowerCase()
                          const bName = b.name.toLowerCase()
                          const aStarts = aName.startsWith(query)
                          const bStarts = bName.startsWith(query)
                          if (aStarts && !bStarts) return -1
                          if (!aStarts && bStarts) return 1
                          return aName.indexOf(query) - bName.indexOf(query)
                        })

                      if (filteredLowStock.length > 0) {
                        return filteredLowStock.slice(0, 15).map((product) => {
                          const displayName = product.name.split("/")[0]
                          return (
                            <div key={product.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-white shadow-2xs">
                              <div className="space-y-0.5 overflow-hidden pr-2">
                                <p className="text-sm font-bold truncate">{displayName}</p>
                                <p className="text-xs text-red-500 font-medium">
                                  Only {product.stock} {product.unit} left
                                </p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => openStockModal(product)}
                                className="h-8 text-xs font-semibold bg-[#6b4783] hover:bg-[#563969] text-white shrink-0"
                              >
                                Set Stock
                              </Button>
                            </div>
                          )
                        })
                      }

                      if (lowStockProducts.length > 0) {
                        return (
                          <div className="text-center py-6 text-xs text-muted-foreground">
                            No low stock items match "{lowStockSearchQuery}"
                          </div>
                        )
                      }

                      return (
                        <div className="text-center py-8 space-y-2">
                          <Check className="h-8 w-8 text-green-500 mx-auto" />
                          <p className="text-xs text-muted-foreground font-medium">No low-stock items detected.</p>
                        </div>
                      )
                    })()}
                  </div>
                </>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Admin Price Editor Dialog */}
      {selectedProduct && (
        <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSavePrices}>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-[#6b4783]">
                  Set Product Prices
                </DialogTitle>
                <DialogDescription>
                  Enter purchase price and profit margins for <strong>{selectedProduct.name.split("/")[0]}</strong>.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="dashPurchasePrice" className="font-bold text-sm">Purchase Price (₹) <span className="text-destructive">*</span></Label>
                  <Input
                    id="dashPurchasePrice"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={purchasePrice}
                    onChange={(e) => handlePurchasePriceChange(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dashRetailPct" className="text-xs font-semibold">Retail Margin (%)</Label>
                    <Input
                      id="dashRetailPct"
                      type="number"
                      placeholder="e.g. 15"
                      value={retailPercentage}
                      onChange={(e) => handleRetailPercentageChange(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dashWholesalePct" className="text-xs font-semibold">Wholesale Margin (%)</Label>
                    <Input
                      id="dashWholesalePct"
                      type="number"
                      placeholder="e.g. 8"
                      value={wholesalePercentage}
                      onChange={(e) => handleWholesalePercentageChange(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Calculated Retail Price</Label>
                    <p className="text-lg font-bold text-green-700">₹{parseFloat(retailPrice || "0").toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Calculated Wholesale Price</Label>
                    <p className="text-lg font-bold text-blue-700">₹{parseFloat(wholesalePrice || "0").toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSelectedProduct(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingPrice} className="bg-[#6b4783] hover:bg-[#563969] text-white">
                  {savingPrice ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : null}
                  Save Prices
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Set Stock Dialog */}
      {selectedStockProduct && (
        <Dialog open={!!selectedStockProduct} onOpenChange={(open) => !open && setSelectedStockProduct(null)}>
          <DialogContent className="sm:max-w-[420px]">
            <form onSubmit={handleSaveStock}>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-[#6b4783]">
                  Update Inventory Stock
                </DialogTitle>
                <DialogDescription>
                  Enter new stock quantity for <strong>{selectedStockProduct.name.split("/")[0]}</strong>.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="dashStockQty" className="font-bold text-sm">
                    Stock Quantity ({selectedStockProduct.unit}) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="dashStockQty"
                    type="number"
                    min="0"
                    placeholder="Enter quantity"
                    value={newStockQty}
                    onChange={(e) => setNewStockQty(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Current Stock: {selectedStockProduct.stock !== null ? selectedStockProduct.stock : "Unlimited"} {selectedStockProduct.unit}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSelectedStockProduct(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingStock} className="bg-[#6b4783] hover:bg-[#563969] text-white">
                  {savingStock ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : null}
                  Save Stock
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

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
import { RefreshCw, Printer } from "lucide-react"
import { billingsApi } from "@/lib/api"

interface DailySaleItem {
  date: string
  saleType: string
  totalBills: number
  totalSale: number
  totalCost: number
}

export default function DailySalesPage() {
  const [filterDate, setFilterDate] = useState("")
  const [sales, setSales] = useState<DailySaleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSales = async () => {
    try {
      setLoading(true)
      const data = await billingsApi.getDailySales()
      setSales(data as any)
      setError(null)
    } catch (e) {
      console.error(e)
      setError("Failed to load daily sales reports.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSales()
  }, [])

  // Filter sales based on user input date
  const filteredSales = sales.filter((item) => {
    if (!filterDate) return true
    return item.date === filterDate
  })

  // Calculate totals
  const totalSales = filteredSales.reduce((sum, item) => sum + item.totalSale, 0)
  const totalCost = filteredSales.reduce((sum, item) => sum + item.totalCost, 0)
  const totalProfit = totalSales - totalCost

  return (
    <div className="flex-1 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Daily Sales</h2>
          <p className="text-muted-foreground">Aggregated daily sales reports.</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button variant="outline" onClick={loadSales} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-[350px] items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-[#6b4783]" />
        </div>
      ) : error ? (
        <div className="p-6 text-center text-destructive font-medium bg-red-50 rounded-md">{error}</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{totalSales.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{totalCost.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-primary">Estimated Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">₹{totalProfit.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Left Filter Sidebar */}
            <div className="w-full md:w-64 space-y-4 print:hidden">
              <div className="border rounded-md overflow-hidden bg-white shadow-sm">
                <div className="bg-muted p-3 border-b">
                  <Label className="font-semibold">Filter Sales Date</Label>
                </div>
                <div className="p-4 space-y-4">
                  <Input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full"
                  />
                  <div className="flex justify-center gap-2">
                    <Button onClick={() => setFilterDate("")} variant="outline" className="w-full text-xs">
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Data Table */}
            <div className="flex-1 rounded-md border bg-white overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-muted/50 border-b">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bold text-foreground">Date</TableHead>
                    <TableHead className="font-bold text-foreground">Sale Type</TableHead>
                    <TableHead className="font-bold text-foreground">Total Bills</TableHead>
                    <TableHead className="font-bold text-foreground text-right">Total Sale</TableHead>
                    <TableHead className="font-bold text-foreground text-right">Total Cost</TableHead>
                    <TableHead className="font-bold text-foreground text-right">Profit Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.length > 0 ? (
                    filteredSales.map((item, index) => {
                      const profit = item.totalSale - item.totalCost
                      return (
                        <TableRow key={index} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{item.date}</TableCell>
                          <TableCell>{item.saleType}</TableCell>
                          <TableCell>{item.totalBills}</TableCell>
                          <TableCell className="text-right font-medium text-green-700">₹{item.totalSale.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">₹{item.totalCost.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium text-primary">₹{profit.toFixed(2)}</TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No reports found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

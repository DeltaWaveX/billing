"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, ShoppingCart, Truck, IndianRupee, Users, PackageOpen, TrendingUp, TrendingDown, RefreshCw } from "lucide-react"
import Link from "next/link"
import { billingsApi, DashboardStats } from "@/lib/api"

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const data = await billingsApi.getDashboardStats()
      setStats(data)
      setError(null)
    } catch (e: any) {
      console.error(e)
      setError("Failed to load dashboard statistics.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Bills</CardTitle>
            <CardDescription>
              Last 5 generated sales invoices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {stats?.recent_bills && stats.recent_bills.length > 0 ? (
                stats.recent_bills.map((bill) => (
                  <div key={bill.billNo} className="flex items-center">
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{bill.billNo}</p>
                      <p className="text-sm text-muted-foreground">
                        {bill.type} - {bill.name} ({bill.paymentMode})
                      </p>
                    </div>
                    <div className="ml-auto font-medium">+₹{bill.total.toFixed(2)}</div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">No recent bills found.</div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Low Stock Alerts</CardTitle>
            <CardDescription>Items running below reorder level (5 or less)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {stats?.low_stock_alerts && stats.low_stock_alerts.length > 0 ? (
                stats.low_stock_alerts.map((item, i) => (
                  <div key={i} className="flex items-center">
                    <PackageOpen className="h-9 w-9 p-2 bg-muted rounded-full text-orange-500" />
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{item.name}</p>
                      <p className="text-sm text-muted-foreground text-red-500">
                        Only {item.stock} {item.unit} left
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">No low-stock items detected.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

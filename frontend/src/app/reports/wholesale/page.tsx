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
import { Search, RefreshCw, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { billingsApi } from "@/lib/api"

export default function WholesaleReportPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadBills = async () => {
    try {
      setLoading(true)
      const data = await billingsApi.getAll()
      // Filter for Wholesale bills (type 2)
      const wholesaleBills = data.filter(b => b.type === 2)
      setBills(wholesaleBills)
      setError(null)
    } catch (e) {
      console.error(e)
      setError("Failed to load wholesale bills.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBills()
  }, [])

  const filteredBills = bills.filter(
    (b) =>
      (b.customer_name && b.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      b.phonenumber.includes(searchQuery) ||
      String(b.id).includes(searchQuery)
  )

  return (
    <div className="flex-1 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Wholesale Report</h2>
        <div className="flex gap-2 items-center w-full sm:w-auto">
          <div className="relative w-full sm:w-72 print:hidden">
            <Input
              placeholder="Search by customer name, phone, or bill number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-8 bg-white"
            />
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button variant="outline" onClick={loadBills} className="w-10 p-0">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-[350px] items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-[#6b4783]" />
        </div>
      ) : error ? (
        <div className="p-6 text-center text-destructive font-medium bg-red-50 rounded-md">{error}</div>
      ) : (
        <div className="rounded-md border bg-white overflow-hidden shadow-sm mt-4">
          <Table>
            <TableHeader className="bg-muted/50 border-b">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-foreground">Bill ID</TableHead>
                <TableHead className="font-bold text-foreground">Customer</TableHead>
                <TableHead className="font-bold text-foreground">Contact</TableHead>
                <TableHead className="font-bold text-foreground">Date Created</TableHead>
                <TableHead className="font-bold text-foreground">Payment mode</TableHead>
                <TableHead className="font-bold text-foreground text-right">Total Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBills.length > 0 ? (
                filteredBills.map((bill, index) => (
                  <TableRow key={index} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{bill.bill_number}</TableCell>
                    <TableCell className="font-bold">{bill.customer_name || "Walk-in"}</TableCell>
                    <TableCell>{bill.phonenumber}</TableCell>
                    <TableCell>{new Date(bill.datetime).toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{bill.paymentmode}</TableCell>
                    <TableCell className="text-right font-bold text-green-700">
                      ₹{parseFloat(String(bill.grandtotal)).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No wholesale bills found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

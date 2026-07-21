"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { billingsApi } from "@/lib/api"
import { RefreshCw } from "lucide-react"

function numberToWords(num: number): string {
  if (num === 0) return "Zero Rupees Only";
  
  const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];

  const numStr = num.toString().split('.')[0];
  if (numStr.length > 9) return 'Overflow';
  
  const n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return ''; 
  let str = '';
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
  str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
  str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
  str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
  str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
  
  return str.trim() + ' Rupees Only';
}

export default function PrintPage() {
  const params = useParams()
  const billId = params.id as string

  const [bill, setBill] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (billId) {
      loadBill()
    }
  }, [billId])

  const loadBill = async () => {
    try {
      setLoading(true)
      const data = await billingsApi.getBill(billId)
      setBill(data)
      // Trigger print after a short delay to allow DOM to render
      setTimeout(() => {
        window.print()
      }, 500)
    } catch (e: any) {
      console.error(e)
      setError("Failed to load bill details.")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <RefreshCw className="h-8 w-8 animate-spin text-[#6b4783]" />
      </div>
    )
  }

  if (error || !bill) {
    return <div className="p-10 text-center text-red-600 font-bold">{error || "Bill not found."}</div>
  }

  return (
    <>
      <style>{`
        @media print {
          @page {
            margin: 0;
            size: 105mm auto;
          }
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
        }
      `}</style>
      <div className="bg-white min-h-screen p-4 text-black font-sans print:p-0 print:m-0" style={{ maxWidth: '105mm', margin: '0 auto' }}>
      <div className="border border-black p-4">
        {/* Header */}
        <div className="text-right text-sm mb-2">
          Date :{new Date(bill.datetime).toLocaleString("en-GB", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight mb-1">Vishnus Kumar Enterprises</h1>
          <p className="font-semibold text-sm">9618889338</p>
          <p className="font-semibold text-sm mt-2">ESTIMATION BILL</p>
        </div>

        {/* Name section */}
        <div className="mb-2 font-medium">
          E Name: 
        </div>

        {/* Customer Table */}
        <table className="w-full mb-1 text-center font-bold">
          <thead>
            <tr className="border-t border-b border-gray-300">
              <th className="p-2">Mobile</th>
              <th className="p-2">Name</th>
              <th className="p-2">Place</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-300">
              <td className="p-2 font-normal">{bill.customer?.phone}</td>
              <td className="p-2 font-normal">{bill.customer?.name}</td>
              <td className="p-2 font-normal">{bill.customer?.gstin}</td>
            </tr>
          </tbody>
        </table>

        {/* Items Table */}
        <table className="w-full mb-4 text-center font-bold border-b border-black">
          <thead>
            <tr className="border-b border-black">
              <th className="p-2">Amount</th>
              <th className="p-2 text-blue-600">Qty</th>
              <th className="p-2">Items Name</th>
              <th className="p-2 text-red-600">Rate</th>
            </tr>
          </thead>
          <tbody>
            {bill.items && bill.items.length > 0 ? (
              bill.items.map((item: any, idx: number) => (
                <tr key={idx}>
                  <td className="p-2 font-normal">{parseFloat(item.line_total).toFixed(2)}</td>
                  <td className="p-2 font-normal">{item.quantity}</td>
                  <td className="p-2 font-normal">{item.product_name}</td>
                  <td className="p-2 font-normal text-red-600">{parseFloat(item.unit_price).toFixed(2)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-4 text-center font-normal">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl">⊘</span> No record found
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Total before footer */}
        <div className="text-2xl font-normal mb-4">
          {parseFloat(bill.grandtotal).toFixed(2)}
        </div>

        {/* Footer Box */}
        <div className="border border-black p-4 text-center">
          <div className="underline font-semibold mb-2">Number of Items :{bill.items?.length || 0}</div>
          <div className="text-2xl mb-1">{parseFloat(bill.grandtotal).toFixed(2)}**</div>
          <div className="font-semibold text-sm mb-6">{numberToWords(parseFloat(bill.grandtotal))}</div>
          
          <div className="border-t border-black pt-4 mt-4">
            <div className="font-semibold text-sm">***No Returns No Exchange.***</div>
          </div>
        </div>
        </div>
      </div>
    </>
  )
}

const BASE_URL = "http://localhost:8000/billing/api"

export const authStorage = {
  getToken: () => typeof window !== "undefined" ? localStorage.getItem("auth_token") : null,
  getUser: () => {
    if (typeof window === "undefined") return null
    const u = localStorage.getItem("auth_user")
    return u ? JSON.parse(u) : null
  },
  saveSession: (token: string, user: any) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token)
      localStorage.setItem("auth_user", JSON.stringify(user))
    }
  },
  clearSession: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token")
      localStorage.removeItem("auth_user")
    }
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`
  const token = authStorage.getToken()
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      authStorage.clearSession()
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login"
      }
    }
    const errorText = await response.text()
    throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`)
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  return response.json() as Promise<T>
}

// Interfaces
export interface Product {
  id?: number
  name: string
  retailprice: number | string
  wholesaleprice: number | string
  retailpercentage: number | string
  wholesalepercentage: number | string
  stock: number | null
  unit: string
  purchaseprice: number | string
}

export interface Customer {
  id?: number
  name: string | null
  phone: string
  gstin: string | null
  type: number // 1: Retail, 2: Wholesale
}

export interface User {
  id?: number
  fist_name: string // Matches django typo
  last_name: string
  email: string
  photourl: string | null
  password?: string
  role: number // 1: Admin, 2: cashier
}

export interface Expense {
  id?: number
  amount: number | string
  category: string
  description: string
  photourl?: string | null
}

export interface BillItemInput {
  product_id: number
  quantity: number
  unit_price: number | string
  line_total: number | string
}

export interface CreateBillInput {
  customer: {
    name: string
    phone: string
    gstin?: string
    type: number
  }
  user_id?: number
  type: number // 1: Retail, 2: Wholesale
  paymentmode: string
  grandtotal: number
  items: BillItemInput[]
}

export interface DailySaleItem {
  date: string
  type: number
  total_bills: number
  total_sales: string
}

export interface RecentBill {
  id: number
  billNo: string
  name: string
  phone: string
  date: string
  paymentMode: string
  type: string
  total: number
}

export interface BillingItem {
  id: number
  bill_number: string
  customer_name: string
  phonenumber: string
  grandtotal: number | string
  paymentmode: string
  datetime: string
  type: number
}

export interface LowStockAlert {
  name: string
  stock: number
  unit: string
}

export interface DashboardStats {
  today_revenue: number
  today_sales_count: number
  monthly_expenses: number
  customer_count: number
  recent_bills: RecentBill[]
  low_stock_alerts: LowStockAlert[]
}

export interface BarcodeMapping {
  id?: number
  product_id: number
  barcode: string
}

export interface Unit {
  id?: number
  name: string
  print_label: string
}

// In-memory product cache for fast repeat access across page navigations
let _productCache: Product[] | null = null
let _productCachePromise: Promise<Product[]> | null = null

// API Services
export const productsApi = {
  getAll: (forceRefresh = false): Promise<Product[]> => {
    if (!forceRefresh && _productCache) {
      return Promise.resolve(_productCache)
    }
    // Deduplicate concurrent in-flight requests
    if (!forceRefresh && _productCachePromise) {
      return _productCachePromise
    }
    _productCachePromise = request<Product[]>("/products/").then(data => {
      _productCache = data
      _productCachePromise = null
      return data
    }).catch(err => {
      _productCachePromise = null
      throw err
    })
    return _productCachePromise
  },
  invalidateCache: () => { _productCache = null; _productCachePromise = null },
  create: (data: Product) => request<Product>("/products/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Product) => request<Product>(`/products/${id}/`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/products/${id}/`, { method: "DELETE" }),
}

export const barcodeMappingsApi = {
  getAll: () => request<BarcodeMapping[]>("/barcode-mappings/"),
  create: (data: BarcodeMapping) => request<BarcodeMapping>("/barcode-mappings/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: BarcodeMapping) => request<BarcodeMapping>(`/barcode-mappings/${id}/`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/barcode-mappings/${id}/`, { method: "DELETE" }),
}

export const customersApi = {
  getAll: () => request<Customer[]>("/customers/"),
  create: (data: Customer) => request<Customer>("/customers/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Customer) => request<Customer>(`/customers/${id}/`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/customers/${id}/`, { method: "DELETE" }),
}

export const usersApi = {
  getAll: () => request<User[]>("/users/"),
  create: (data: User) => request<User>("/users/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<User>) => request<User>(`/users/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/users/${id}/`, { method: "DELETE" }),
}

export const expensesApi = {
  getAll: () => request<Expense[]>("/expenses/"),
  create: (data: Expense) => request<Expense>("/expenses/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Expense) => request<Expense>(`/expenses/${id}/`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/expenses/${id}/`, { method: "DELETE" }),
}

export const billingsApi = {
  getAll: (type?: number) => request<BillingItem[]>(type !== undefined ? `/billings/?type=${type}` : "/billings/"),
  getBill: (billNumber: string) => request<any>(`/billings/get_bill/?bill_number=${billNumber}`),
  createBill: (data: CreateBillInput) => request<{ message: string; bill_id: number; bill_number: string }>("/billings/create_bill/", { method: "POST", body: JSON.stringify(data) }),
  updateBill: (data: CreateBillInput & { bill_number: string }) => request<{ message: string; bill_number: string }>("/billings/update_bill/", { method: "PUT", body: JSON.stringify(data) }),
  deleteBill: (billNumber: string) => request<void>(`/billings/delete_bill/?bill_number=${billNumber}`, { method: "DELETE" }),
  getDailySales: () => request<DailySaleItem[]>("/billings/daily_sales/"),
  getDashboardStats: () => request<DashboardStats>("/billings/dashboard_stats/"),
}

export const unitsApi = {
  getAll: () => request<Unit[]>("/units/"),
  create: (data: Unit) => request<Unit>("/units/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Unit) => request<Unit>(`/units/${id}/`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/units/${id}/`, { method: "DELETE" }),
}

export const authApi = {
  login: (credentials: { email: string; password?: string }) =>
    request<{ token: string; user: User }>("/login/", {
      method: "POST",
      body: JSON.stringify(credentials)
    })
}

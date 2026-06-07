export interface User {
  id: number
  name: string
  email: string
  role: string
  permissions: string[]
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

export interface MenuItem {
  id: number
  name: string
  price: number
  image: string
  category: Category
  is_available: boolean
  description?: string
}

export interface Category {
  id: number
  name: string
}

export interface Table {
  id: number
  table_number: string
  qr_code: string
}

export interface OrderItem {
  id: number
  menu: MenuItem
  qty: number
  price: number
}

export interface Order {
  id: number
  table: Table
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'done'
  total: number
  items: OrderItem[]
  customer_name?: string
  created_at: string
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export interface PaginatedResponse<T> {
  success: boolean
  message: string
  data: T[]
  meta: {
    page: number
    per_page: number
    total: number
    total_page: number
  }
}

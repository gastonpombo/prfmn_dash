// Types-only module. Runtime clients are in:
//   lib/supabase/client.ts  (browser / 'use client' components)
//   lib/supabase/server.ts  (Server Actions / Route Handlers)


export type Product = {
  id: number
  name: string
  description: string | null
  price: number
  stock: number
  image_url: string | null
  category: string | null
  is_active: boolean
  created_at: string
  // Perfil Olfativo
  top_notes: string | null
  heart_notes: string | null
  base_notes: string | null
  season: string | null
  time_of_day: string | null
  longevity: string | null
  sillage: string | null
  brand: string | null
  img_transparent_url: string | null
}

export type OrderItem = {
  id: number
  order_id: number
  product_id: number
  quantity: number
  unit_price: number
  subtotal?: number
  product?: Product
}

export type CustomerDetails = {
  name: string
  email?: string
  phone?: string
  cedula?: string
  address?: string
  city?: string
  department?: string
  dac_ues?: string
  shipping_type?: 'domicilio' | 'sucursal' | string
}

export type OrderStatus = 'pending' | 'approved' | 'shipped' | 'rejected'

export type Order = {
  id: number
  created_at: string
  customer_email: string
  total_amount: number
  status: OrderStatus
  customer_details: CustomerDetails
  internal_notes: string | null
  payment_id?: string | null
  order_items?: OrderItem[]
}

export type SiteConfig = {
  id: number
  announcement_message: string | null
  welcome_title: string | null
  welcome_subtitle: string | null
  about_title: string | null
  about_description: string | null
  about_quote: string | null
  about_quote_author: string | null
  contact_email: string | null
  contact_whatsapp: string | null
  contact_address: string | null
  hero_image_url: string | null
  about_image_url: string | null
  created_at?: string
  updated_at?: string
}

export type Brand = {
  id: number
  name: string
  logo_url: string | null
  is_featured: boolean
  created_at?: string
}

export type StoreSettings = {
  id: number
  hero_img_desktop: string | null
  hero_img_mobile: string | null
  hero_overlay_opacity: number
  created_at?: string
  updated_at?: string
}

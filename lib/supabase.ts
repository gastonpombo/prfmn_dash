import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
}

export type OrderItem = {
  id: number
  order_id: number
  product_id: number
  quantity: number
  unit_price: number
  product?: Product
}

export type CustomerDetails = {
  name: string
  address: string
  phone: string
}

export type Order = {
  id: number
  created_at: string
  customer_email: string
  total_amount: number
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  customer_details: CustomerDetails
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

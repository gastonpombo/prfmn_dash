'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { OrderStatus } from '@/lib/supabase'

export async function getOrders(filter: OrderStatus | 'all' = 'all') {
    const supabase = createAdminClient()

    try {
        let query = supabase
            .from('orders')
            .select(`
        id,
        created_at,
        status,
        total_amount,
        customer_email,
        customer_details,
        internal_notes,
        payment_id,
        order_items (
          id,
          quantity,
          unit_price,
          product:products (
            name,
            image_url
          )
        )
      `)
            .order('created_at', { ascending: false })

        if (filter !== 'all') {
            query = query.eq('status', filter)
        }

        const { data, error } = await query

        if (error) {
            console.error('[orders/actions] getOrders error:', error)
            throw new Error(error.message)
        }

        return { data, error: null }
    } catch (error: any) {
        console.error('[orders/actions] getOrders unexpected error:', error)
        return { data: null, error: error.message }
    }
}

export async function updateOrderStatus(
    orderId: number,
    status: OrderStatus
): Promise<{ success: boolean; error?: string }> {
    const supabase = createAdminClient()

    const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)

    if (error) {
        console.error('[orders/actions] updateOrderStatus:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/orders')
    return { success: true }
}

export async function updateOrderNotes(
    orderId: number,
    notes: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = createAdminClient()

    const { error } = await supabase
        .from('orders')
        .update({ internal_notes: notes || null })
        .eq('id', orderId)

    if (error) {
        console.error('[orders/actions] updateOrderNotes:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/orders')
    return { success: true }
}

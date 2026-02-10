'use client'

import { useEffect, useState } from 'react'
import { supabase, type Order } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')

  useEffect(() => {
    loadOrders()
  }, [statusFilter])

  const loadOrders = async () => {
    setLoading(true)
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('[v0] Error loading orders:', error)
    } else {
      setOrders(data || [])
    }

    setLoading(false)
  }

  const getStatusBadgeColor = (status: OrderStatus) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-700'
      case 'paid':
        return 'bg-green-100 text-green-700'
      case 'shipped':
        return 'bg-blue-100 text-blue-700'
      case 'pending':
        return 'bg-amber-100 text-amber-700'
      case 'cancelled':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-neutral-100 text-neutral-700'
    }
  }

  const getStatusLabel = (status: OrderStatus) => {
    const labels: Record<OrderStatus, string> = {
      pending: 'Pendiente',
      paid: 'Pagado',
      shipped: 'Enviado',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
    }
    return labels[status]
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount)
  }

  const handleRowClick = (orderId: number) => {
    router.push(`/dashboard/orders/${orderId}`)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
          Gestión de Pedidos
        </h1>
        <p className="text-neutral-600">
          Visualiza y gestiona todos los pedidos de la tienda
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-4">
        <div className="w-64">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OrderStatus | 'all')}>
            <SelectTrigger className="border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="paid">Pagado</SelectItem>
              <SelectItem value="shipped">Enviado</SelectItem>
              <SelectItem value="delivered">Entregado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-neutral-600">No hay pedidos para mostrar</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                <TableHead className="font-semibold text-neutral-700">ID de Pedido</TableHead>
                <TableHead className="font-semibold text-neutral-700">Fecha</TableHead>
                <TableHead className="font-semibold text-neutral-700">Cliente</TableHead>
                <TableHead className="font-semibold text-neutral-700">Total</TableHead>
                <TableHead className="font-semibold text-neutral-700">Estado</TableHead>
                <TableHead className="font-semibold text-neutral-700"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow
                  key={order.id}
                  className="hover:bg-neutral-50 cursor-pointer"
                  onClick={() => handleRowClick(order.id)}
                >
                  <TableCell className="font-semibold text-neutral-900">
                    #{String(order.id).padStart(4, '0')}
                  </TableCell>
                  <TableCell className="text-neutral-600">
                    {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-neutral-900">
                        {order.customer_details?.name || 'Sin nombre'}
                      </p>
                      <p className="text-sm text-neutral-500">{order.customer_email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-neutral-900">
                    {formatCurrency(order.total_amount)}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <ChevronRight className="h-5 w-5 text-neutral-400" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

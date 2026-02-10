'use client'

import { useEffect, useState } from 'react'
import { supabase, type Order, type OrderItem } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
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
import { Loader2, ChevronLeft, Phone, MapPin, Mail } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string
  
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    loadOrder()
  }, [orderId])

  const loadOrder = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(*))')
      .eq('id', orderId)
      .single()

    if (error) {
      console.error('[v0] Error loading order:', error)
      toast.error('Error al cargar el pedido')
    } else {
      setOrder(data as Order)
    }

    setLoading(false)
  }

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return
    
    setUpdating(true)
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    if (error) {
      console.error('[v0] Error updating status:', error)
      toast.error('Error al actualizar el estado')
      setUpdating(false)
      return
    }

    setOrder({ ...order, status: newStatus })
    toast.success('Estado actualizado correctamente')
    setUpdating(false)
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

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="h-8 w-8 p-0 text-neutral-600 hover:text-neutral-900"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-neutral-600">Pedido no encontrado</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header & Navigation */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="h-8 w-8 p-0 text-neutral-600 hover:text-neutral-900"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-serif font-bold text-neutral-900">
            Pedido #{String(order.id).padStart(4, '0')}
          </h1>
          <p className="text-neutral-600">
            {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
          </p>
        </div>
      </div>

      {/* Status Selector */}
      <div className="mb-8 flex items-center gap-4">
        <label className="text-sm font-medium text-neutral-700">Estado del pedido:</label>
        <Select value={order.status} onValueChange={(value) => handleStatusChange(value as OrderStatus)} disabled={updating || order.status === 'cancelled'}>
          <SelectTrigger className="w-48 border-neutral-300 focus:border-amber-500 focus:ring-amber-500/20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="paid">Pagado</SelectItem>
            <SelectItem value="shipped">Enviado</SelectItem>
            <SelectItem value="delivered">Entregado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(order.status)}`}>
          {getStatusLabel(order.status)}
        </span>
      </div>

      {/* Main Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Order Items */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-lg font-serif font-semibold text-neutral-900">
                Productos Pedidos
              </h2>
            </div>
            
            {order.order_items && order.order_items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                    <TableHead className="font-semibold text-neutral-700">Imagen</TableHead>
                    <TableHead className="font-semibold text-neutral-700">Producto</TableHead>
                    <TableHead className="font-semibold text-neutral-700 text-center">Cantidad</TableHead>
                    <TableHead className="font-semibold text-neutral-700 text-right">Precio Unitario</TableHead>
                    <TableHead className="font-semibold text-neutral-700 text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.order_items.map((item: OrderItem) => (
                    <TableRow key={item.id} className="hover:bg-neutral-50">
                      <TableCell>
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200">
                          {item.product?.image_url ? (
                            <img
                              src={item.product.image_url || "/placeholder.svg"}
                              alt={item.product.name}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-neutral-400">
                              -
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-neutral-900">
                        {item.product?.name || 'Producto desconocido'}
                      </TableCell>
                      <TableCell className="text-center text-neutral-600">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right text-neutral-900">
                        {formatCurrency(item.unit_price)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-neutral-900">
                        {formatCurrency(item.unit_price * item.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-8 text-center text-neutral-600">
                No hay productos en este pedido
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Customer Info */}
        <div className="space-y-6">
          {/* Customer Details Card */}
          <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6">
            <h3 className="text-lg font-serif font-semibold text-neutral-900 mb-4">
              Información del Cliente
            </h3>
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Nombre
                </label>
                <p className="text-neutral-900 font-medium mt-1">
                  {order.customer_details?.name || 'No especificado'}
                </p>
              </div>

              {/* Email */}
              <div className="pt-4 border-t border-neutral-200">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-neutral-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                      Email
                    </label>
                    <p className="text-neutral-900 font-medium mt-1 break-all">
                      {order.customer_email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Phone */}
              {order.customer_details?.phone && (
                <div className="pt-4 border-t border-neutral-200">
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-neutral-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        Teléfono
                      </label>
                      <p className="text-neutral-900 font-medium mt-1">
                        {order.customer_details.phone}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Address */}
              {order.customer_details?.address && (
                <div className="pt-4 border-t border-neutral-200">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-neutral-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        Dirección de Envío
                      </label>
                      <p className="text-neutral-900 font-medium mt-1">
                        {order.customer_details.address}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-gradient-to-br from-amber-50 to-rose-50 rounded-lg border border-amber-200 shadow-sm p-6">
            <h3 className="text-lg font-serif font-semibold text-neutral-900 mb-4">
              Resumen Financiero
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">Subtotal:</span>
                <span className="font-semibold text-neutral-900">
                  {formatCurrency(
                    order.order_items?.reduce((acc, item) => acc + item.unit_price * item.quantity, 0) || 0
                  )}
                </span>
              </div>
              <div className="pt-3 border-t border-amber-200 flex justify-between items-center">
                <span className="font-semibold text-neutral-900">Total Pagado:</span>
                <span className="text-xl font-bold text-amber-700">
                  {formatCurrency(order.total_amount)}
                </span>
              </div>
              <div className="pt-3 border-t border-amber-200">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  ID de Transacción
                </label>
                <p className="text-neutral-900 font-mono text-sm mt-1 break-all">
                  ORD-{String(order.id).padStart(6, '0')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

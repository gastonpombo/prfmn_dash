'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Order, OrderStatus } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
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
import {
  Loader2,
  ChevronLeft,
  Phone,
  MapPin,
  Mail,
  Hash,
  CreditCard,
  Truck,
  FileText,
  Save,
  Package,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/orders/OrderDetailSheet'
import { updateOrderStatus, updateOrderNotes } from '@/app/dashboard/orders/actions'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-neutral-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-neutral-900 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  )
}

export default function OrderDetailPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [isPendingStatus, startStatusTransition] = useTransition()
  const [isPendingNotes, startNotesTransition] = useTransition()

  useEffect(() => {
    loadOrder()
  }, [orderId])

  const loadOrder = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, product:products(*))')
      .eq('id', orderId)
      .single()

    if (error) {
      toast.error('Error al cargar el pedido')
    } else {
      const o = data as Order
      setOrder(o)
      setNotes(o.internal_notes ?? '')
    }
    setLoading(false)
  }

  const handleStatusChange = (newStatus: OrderStatus) => {
    if (!order) return
    const prev = order.status
    setOrder({ ...order, status: newStatus })
    startStatusTransition(async () => {
      const result = await updateOrderStatus(order.id, newStatus)
      if (!result.success) {
        setOrder({ ...order, status: prev })
        toast.error('Error al actualizar el estado')
      } else {
        toast.success('Estado actualizado')
      }
    })
  }

  const handleSaveNotes = () => {
    if (!order) return
    startNotesTransition(async () => {
      const result = await updateOrderNotes(order.id, notes)
      if (!result.success) {
        toast.error('Error al guardar la nota')
      } else {
        setOrder({ ...order, internal_notes: notes || null })
        toast.success('Nota guardada')
      }
    })
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
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-6 gap-1">
          <ChevronLeft className="h-4 w-4" /> Volver
        </Button>
        <p className="text-neutral-500">Pedido no encontrado.</p>
      </div>
    )
  }

  const cd = order.customer_details ?? {}
  const items = (order as any).order_items ?? []

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1 text-neutral-600">
          <ChevronLeft className="h-4 w-4" /> Pedidos
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-serif font-bold text-neutral-900">
              Pedido #{String(order.id).padStart(4, '0')}
            </h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            {format(new Date(order.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
          </p>
        </div>
      </div>

      {/* Admin actions */}
      <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Acciones de administrador</h2>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-600">Estado</label>
            <Select value={order.status} onValueChange={handleStatusChange} disabled={isPendingStatus}>
              <SelectTrigger className="w-44 h-9 bg-white border-neutral-200 text-sm">
                <SelectValue />
                {isPendingStatus && <Loader2 className="h-3.5 w-3.5 animate-spin ml-auto" />}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">⏳ Pendiente</SelectItem>
                <SelectItem value="approved">✅ Aprobado</SelectItem>
                <SelectItem value="shipped">🚚 Enviado</SelectItem>
                <SelectItem value="rejected">❌ Rechazado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Notas internas
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Apuntes privados sobre este pedido..."
            className="resize-none text-sm bg-white border-neutral-200 min-h-[80px]"
            disabled={isPendingNotes}
          />
          <Button
            size="sm"
            onClick={handleSaveNotes}
            disabled={isPendingNotes || notes === (order.internal_notes ?? '')}
            className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isPendingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Guardar Nota
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100">
            <h2 className="text-base font-semibold text-neutral-900 flex items-center gap-2">
              <Package className="h-4 w-4 text-neutral-400" /> Productos pedidos
            </h2>
          </div>
          {items.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                    <TableHead className="text-xs text-neutral-500">Producto</TableHead>
                    <TableHead className="text-xs text-neutral-500 text-center w-16">Cant.</TableHead>
                    <TableHead className="text-xs text-neutral-500 text-right w-28">P. Unit.</TableHead>
                    <TableHead className="text-xs text-neutral-500 text-right w-28">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: any) => (
                    <TableRow key={item.id} className="hover:bg-neutral-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {item.product?.image_url ? (
                            <img src={item.product.image_url} alt={item.product?.name} className="w-10 h-10 rounded-lg object-cover border border-neutral-200" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center">
                              <Package className="h-4 w-4 text-neutral-300" />
                            </div>
                          )}
                          <span className="text-sm font-medium text-neutral-900">{item.product?.name ?? 'Producto eliminado'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm text-neutral-600">{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm text-neutral-600">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-neutral-900">{formatCurrency(item.unit_price * item.quantity)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-amber-50 to-rose-50 border-t border-amber-100">
                <span className="text-sm font-semibold text-neutral-700">Total pagado</span>
                <span className="text-xl font-bold text-amber-700">{formatCurrency(order.total_amount)}</span>
              </div>
            </>
          ) : (
            <p className="p-6 text-sm text-neutral-400 italic">Sin productos registrados.</p>
          )}
        </div>

        {/* Shipping Info */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5 space-y-3">
          <h2 className="text-base font-semibold text-neutral-900 flex items-center gap-2 mb-1">
            <Truck className="h-4 w-4 text-neutral-400" /> Datos de envío
          </h2>
          <InfoRow icon={FileText} label="Nombre" value={cd.name} />
          <InfoRow icon={Mail} label="Email" value={order.customer_email ?? cd.email} />
          <InfoRow icon={Phone} label="Teléfono" value={cd.phone} />
          <InfoRow icon={Hash} label="Cédula" value={cd.cedula} />
          <Separator />
          <InfoRow icon={Truck} label="Tipo de envío" value={cd.shipping_type === 'domicilio' ? '🏠 Domicilio' : cd.shipping_type === 'sucursal' ? '🏢 Sucursal (DAC/UES)' : cd.shipping_type} />
          <InfoRow icon={MapPin} label="Dirección" value={cd.address} />
          <InfoRow icon={MapPin} label="Ciudad" value={cd.city} />
          <InfoRow icon={MapPin} label="Departamento" value={cd.department} />
          <InfoRow icon={CreditCard} label="Sucursal DAC/UES" value={cd.dac_ues} />
          {order.payment_id && (
            <>
              <Separator />
              <InfoRow icon={CreditCard} label="ID de Pago (MP)" value={order.payment_id} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

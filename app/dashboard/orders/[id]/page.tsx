'use client'

import { useEffect, useState, useTransition } from 'react'
import type { Order, OrderStatus } from '@/lib/supabase'
import { getOrders } from '@/app/dashboard/orders/actions'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
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
  MessageCircle,
  AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/orders/OrderDetailSheet'
import { updateOrderStatus, updateOrderNotes } from '@/app/dashboard/orders/actions'

// ─── Statuses that trigger the WhatsApp CTA ──────────────────────────────────
const FAILED_STATUSES: OrderStatus[] = ['rejected', 'cancelled']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)
}

/**
 * Safely coerces a value to a displayable string.
 * Prevents React Error #31 ("Objects are not valid as a React child") if
 * a customer_details field turns out to be a nested object.
 */
function safeStr(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value || null
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  // Object case — join its string values (e.g. address objects with street/city)
  if (typeof value === 'object') {
    const parts = Object.values(value as Record<string, unknown>)
      .filter((v) => v !== null && v !== undefined && v !== '')
      .map(String)
    return parts.length > 0 ? parts.join(', ') : null
  }
  return null
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value?: unknown
}) {
  const display = safeStr(value)
  if (!display) return null
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-neutral-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-neutral-900 mt-0.5 break-words">{display}</p>
      </div>
    </div>
  )
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function OrderDetailSkeleton() {
  return (
    <div className="p-6 lg:p-8 space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-24" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params?.id as string | undefined

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [notes, setNotes] = useState('')
  const [isPendingStatus, startStatusTransition] = useTransition()
  const [isPendingNotes, startNotesTransition] = useTransition()

  useEffect(() => {
    if (orderId) {
      loadOrder()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  // ── Uses the secure Server Action (admin client → bypasses RLS) ──
  const loadOrder = async () => {
    if (!orderId) return
    setLoading(true)
    try {
      const { data, error } = await getOrders('all')
      if (error || !data) {
        toast.error('Error al cargar los pedidos')
        setNotFound(true)
        return
      }
      const found = (data as unknown as Order[]).find(
        (o) => String(o?.id) === String(orderId)
      )
      if (!found) {
        setNotFound(true)
      } else {
        setOrder(found)
        setNotes(found?.internal_notes ?? '')
      }
    } catch (err) {
      console.error('[OrderDetail] Unexpected error:', err)
      toast.error('Error inesperado al cargar el pedido')
      setNotFound(true)
    } finally {
      setLoading(false)
    }
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

  // ── Loading State ──
  if (loading) return <OrderDetailSkeleton />

  // ── Not Found State ──
  if (notFound || !order) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="rounded-full bg-neutral-100 p-4">
          <AlertCircle className="h-8 w-8 text-neutral-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Pedido no encontrado</h2>
          <p className="text-sm text-neutral-500 mt-1">
            El pedido #{orderId} no existe o no tienes acceso.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()} className="gap-1 mt-2">
          <ChevronLeft className="h-4 w-4" /> Volver a pedidos
        </Button>
      </div>
    )
  }

  // ── Safe destructuring (optional chaining everywhere) ──
  const cd = order?.customer_details ?? {}
  const items = (order as any)?.order_items ?? []
  const isFailed = FAILED_STATUSES.includes(order?.status)
  const firstName = cd?.name?.split(' ')?.[0] ?? 'cliente'
  const phone = cd?.phone?.replace(/\D/g, '') ?? ''
  const waMessage = encodeURIComponent(
    `Hola ${firstName}! 👋 Vi que tuviste un inconveniente con el pago de tu perfume en PerfuMan. ¿Te puedo ayudar a resolverlo? 🌸`
  )
  const waHref = phone
    ? `https://wa.me/${phone}?text=${waMessage}`
    : `https://wa.me/?text=${waMessage}`

  const createdAtDate = order?.created_at ? new Date(order.created_at) : null

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1 text-neutral-600">
          <ChevronLeft className="h-4 w-4" /> Pedidos
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-serif font-bold text-neutral-900">
              Pedido #{String(order?.id ?? '??').padStart(4, '0')}
            </h1>
            {order?.status && <StatusBadge status={order.status} />}
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            {createdAtDate
              ? format(createdAtDate, "d 'de' MMMM yyyy, HH:mm", { locale: es })
              : 'Fecha desconocida'}
          </p>
        </div>
      </div>

      {/* ── WhatsApp CTA (only for failed orders) ── */}
      {isFailed && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 transition-colors hover:bg-red-500/10"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500 flex-shrink-0">
            <MessageCircle className="h-5 w-5 text-white" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-500">Pago fallido — contactar al cliente</p>
            <p className="text-xs text-neutral-500 truncate">
              Contactar por WhatsApp{phone ? ` · +${phone}` : ''}
            </p>
          </div>
          <span className="ml-auto text-xs font-semibold text-green-600 whitespace-nowrap">Abrir WA →</span>
        </a>
      )}

      {/* ── Admin Actions ── */}
      <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Acciones de administrador</h2>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-600">Estado</label>
            <Select
              value={order?.status ?? 'pending'}
              onValueChange={handleStatusChange}
              disabled={isPendingStatus}
            >
              <SelectTrigger className="w-44 h-9 bg-white border-neutral-200 text-sm">
                <SelectValue />
                {isPendingStatus && <Loader2 className="h-3.5 w-3.5 animate-spin ml-auto" />}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">⏳ Pendiente</SelectItem>
                <SelectItem value="approved">✅ Aprobado</SelectItem>
                <SelectItem value="paid">💰 Pagado</SelectItem>
                <SelectItem value="shipped">🚚 Enviado</SelectItem>
                <SelectItem value="delivered">📦 Entregado</SelectItem>
                <SelectItem value="cancelled">🚫 Cancelado</SelectItem>
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
            disabled={isPendingNotes || notes === (order?.internal_notes ?? '')}
            className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isPendingNotes
              ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Guardar Nota
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Products ── */}
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
                    <TableRow key={item?.id} className="hover:bg-neutral-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {item?.product?.image_url ? (
                            <img
                              src={item.product.image_url}
                              alt={item?.product?.name ?? 'producto'}
                              className="w-10 h-10 rounded-lg object-cover border border-neutral-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center">
                              <Package className="h-4 w-4 text-neutral-300" />
                            </div>
                          )}
                          <span className="text-sm font-medium text-neutral-900">
                            {item?.product?.name ?? 'Producto eliminado'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm text-neutral-600">
                        {item?.quantity ?? 0}
                      </TableCell>
                      <TableCell className="text-right text-sm text-neutral-600">
                        {formatCurrency(item?.unit_price ?? 0)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-neutral-900">
                        {formatCurrency((item?.unit_price ?? 0) * (item?.quantity ?? 0))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-amber-50 to-rose-50 border-t border-amber-100">
                <span className="text-sm font-semibold text-neutral-700">Total pagado</span>
                <span className="text-xl font-bold text-amber-700">
                  {formatCurrency(order?.total_amount ?? 0)}
                </span>
              </div>
            </>
          ) : (
            <p className="p-6 text-sm text-neutral-400 italic">Sin productos registrados.</p>
          )}
        </div>

        {/* ── Shipping Info ── */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5 space-y-3">
          <h2 className="text-base font-semibold text-neutral-900 flex items-center gap-2 mb-1">
            <Truck className="h-4 w-4 text-neutral-400" /> Datos de envío
          </h2>
          <InfoRow icon={FileText} label="Nombre" value={cd?.name} />
          <InfoRow icon={Mail} label="Email" value={order?.customer_email ?? cd?.email} />
          <InfoRow icon={Phone} label="Teléfono" value={cd?.phone} />
          <InfoRow icon={Hash} label="Cédula" value={cd?.cedula} />
          <Separator />
          <InfoRow
            icon={Truck}
            label="Tipo de envío"
            value={
              cd?.shipping_type === 'domicilio'
                ? '🏠 Domicilio'
                : cd?.shipping_type === 'sucursal'
                  ? '🏢 Sucursal (DAC/UES)'
                  : cd?.shipping_type
            }
          />
          <InfoRow icon={MapPin} label="Dirección" value={cd?.address} />
          <InfoRow icon={MapPin} label="Ciudad" value={cd?.city} />
          <InfoRow icon={MapPin} label="Departamento" value={cd?.department} />
          <InfoRow icon={CreditCard} label="Sucursal DAC/UES" value={cd?.dac_ues} />
          {order?.payment_id && (
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

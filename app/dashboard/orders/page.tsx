'use client'

import { getOrders } from './actions'

import { useEffect, useState, useCallback } from 'react'
import type { Order, OrderStatus } from '@/lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  ChevronRight,
  ShoppingBag,
  Clock,
  TrendingUp,
  RefreshCw,
} from 'lucide-react'
import { OrderDetailSheet, StatusBadge } from '@/components/orders/OrderDetailSheet'

// ─── Status filter config ──────────────────────────────────────────────────

type FilterStatus = OrderStatus | 'all'

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'approved', label: 'Aprobado' },
  { value: 'paid', label: 'Pagado' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'rejected', label: 'Rechazado' },
]

const FILTER_ACTIVE_CLASS: Record<FilterStatus, string> = {
  all: 'bg-neutral-900 text-white border-neutral-900',
  pending: 'bg-amber-600 text-white border-amber-600',
  approved: 'bg-emerald-600 text-white border-emerald-600',
  paid: 'bg-green-600 text-white border-green-600',
  shipped: 'bg-blue-600 text-white border-blue-600',
  delivered: 'bg-teal-600 text-white border-teal-600',
  cancelled: 'bg-zinc-500 text-white border-zinc-500',
  rejected: 'bg-red-600 text-white border-red-600',
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5 flex items-start gap-4 shadow-sm">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-neutral-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-neutral-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const loadOrders = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    else setRefreshing(true)

    try {
      const { data, error } = await getOrders(filter)

      if (error) {
        toast.error(`Error al cargar los pedidos: ${error}`)
      } else {
        setOrders((data as unknown as Order[]) ?? [])
      }
    } catch (err: any) {
      console.error('[orders/page] loadOrders Unexpected error:', err)
      toast.error(`Error inesperado: ${err.message || String(err)}`)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filter])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // Handle optimistic updates from the sheet
  const handleOrderUpdate = (patch: Partial<Order> & { id: number }) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === patch.id ? { ...o, ...patch } : o))
    )
    // Also update the selected order so the sheet reflects changes immediately
    setSelectedOrder((prev) => (prev && prev.id === patch.id ? { ...prev, ...patch } : prev))
  }

  const handleRowClick = (order: Order) => {
    setSelectedOrder(order)
    setSheetOpen(true)
  }

  // ── KPI derivations
  const pending = orders.filter((o) => o.status === 'pending').length
  const totalRevenue = orders.reduce((s, o) => s + (o.total_amount ?? 0), 0)

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-neutral-900">Gestión de Pedidos</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Hacé clic en cualquier fila para ver el detalle y gestionar el pedido.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadOrders(false)}
          disabled={refreshing}
          className="h-8 border-neutral-300 text-neutral-600 hover:bg-neutral-50 gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* ── KPI Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          icon={ShoppingBag}
          label="Total de pedidos"
          value={String(orders.length)}
          sub={filter !== 'all' ? `Filtrando por "${FILTER_OPTIONS.find((f) => f.value === filter)?.label}"` : 'Todos los estados'}
          color="bg-neutral-100 text-neutral-600"
        />
        <KpiCard
          icon={Clock}
          label="Pendientes"
          value={String(pending)}
          sub="Requieren acción"
          color="bg-amber-100 text-amber-700"
        />
        <KpiCard
          icon={TrendingUp}
          label="Facturación total"
          value={formatCurrency(totalRevenue)}
          sub="Suma de todos los pedidos visibles"
          color="bg-emerald-100 text-emerald-700"
        />
      </div>

      {/* ── Filter pills ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_OPTIONS.map((opt) => {
          const isActive = filter === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`
                px-4 py-1.5 rounded-full text-sm font-medium border transition-all
                ${isActive
                  ? FILTER_ACTIVE_CLASS[opt.value]
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400 hover:text-neutral-900'}
              `}
            >
              {opt.label}
              {opt.value === 'pending' && pending > 0 && (
                <span className={`ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs rounded-full ${isActive ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-700'}`}>
                  {pending}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400 gap-3">
            <ShoppingBag className="h-12 w-12 opacity-30" />
            <p className="text-sm font-medium">No hay pedidos para este filtro</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                <TableHead className="text-xs font-semibold text-neutral-500 uppercase tracking-wider w-24">Pedido</TableHead>
                <TableHead className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Cliente</TableHead>
                <TableHead className="text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">Fecha</TableHead>
                <TableHead className="text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell w-32 text-right">Total</TableHead>
                <TableHead className="text-xs font-semibold text-neutral-500 uppercase tracking-wider w-28">Estado</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow
                  key={order.id}
                  className="hover:bg-neutral-50 cursor-pointer group transition-colors"
                  onClick={() => handleRowClick(order)}
                >
                  {/* ID */}
                  <TableCell className="font-mono text-sm font-semibold text-neutral-700">
                    #{String(order.id).padStart(4, '0')}
                  </TableCell>

                  {/* Cliente */}
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {order.customer_details?.name ?? '—'}
                      </p>
                      <p className="text-xs text-neutral-400 truncate max-w-[200px]">
                        {order.customer_email}
                      </p>
                    </div>
                  </TableCell>

                  {/* Fecha */}
                  <TableCell className="hidden md:table-cell text-sm text-neutral-500">
                    {format(new Date(order.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                  </TableCell>

                  {/* Total */}
                  <TableCell className="hidden sm:table-cell text-sm font-semibold text-neutral-900 text-right">
                    {formatCurrency(order.total_amount)}
                  </TableCell>

                  {/* Badge */}
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>

                  {/* Chevron */}
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Detail Sheet ── */}
      <OrderDetailSheet
        order={selectedOrder}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onOrderUpdate={handleOrderUpdate}
      />
    </div>
  )
}

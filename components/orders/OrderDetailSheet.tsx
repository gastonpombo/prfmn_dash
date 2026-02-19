'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
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
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
    Mail,
    MapPin,
    Phone,
    FileText,
    CreditCard,
    Package,
    Truck,
    Hash,
    Save,
    Loader2,
    MessageCircle,
} from 'lucide-react'
import { updateOrderStatus, updateOrderNotes } from '@/app/dashboard/orders/actions'
import type { Order, OrderStatus } from '@/lib/supabase'

// Statuses considered "failed" — triggers the WhatsApp CTA
const FAILED_STATUSES: OrderStatus[] = ['rejected', 'cancelled']

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, { label: string; variant: string; className: string }> = {
    pending: {
        label: 'Pendiente',
        variant: 'outline',
        className: 'bg-amber-50 text-amber-700 border-amber-300',
    },
    approved: {
        label: 'Aprobado',
        variant: 'outline',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    },
    paid: {
        label: 'Pagado',
        variant: 'outline',
        className: 'bg-green-50 text-green-700 border-green-300',
    },
    shipped: {
        label: 'Enviado',
        variant: 'outline',
        className: 'bg-blue-50 text-blue-700 border-blue-300',
    },
    delivered: {
        label: 'Entregado',
        variant: 'outline',
        className: 'bg-teal-50 text-teal-700 border-teal-300',
    },
    cancelled: {
        label: 'Cancelado',
        variant: 'outline',
        className: 'bg-red-500/10 text-red-500 border-red-500/20',
    },
    rejected: {
        label: 'Pago Fallido',
        variant: 'outline',
        className: 'bg-red-500/10 text-red-500 border-red-500/20',
    },
}

export function StatusBadge({ status }: { status: OrderStatus }) {
    const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'bg-neutral-100 text-neutral-600' }
    return (
        <Badge variant="outline" className={`${cfg.className} font-medium text-xs px-2 py-0.5`}>
            {cfg.label}
        </Badge>
    )
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)
}

/** Prevents React Error #31: safely coerces any value to a displayable string. */
function safeStr(value: unknown): string | null {
    if (value === null || value === undefined) return null
    if (typeof value === 'string') return value || null
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    if (typeof value === 'object') {
        const parts = Object.values(value as Record<string, unknown>)
            .filter((v) => v !== null && v !== undefined && v !== '').map(String)
        return parts.length > 0 ? parts.join(', ') : null
    }
    return null
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

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
            <div className="min-w-0">
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">{label}</p>
                <p className="text-sm text-neutral-900 font-medium mt-0.5 break-words">{display}</p>
            </div>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface OrderDetailSheetProps {
    order: Order | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onOrderUpdate: (updated: Partial<Order> & { id: number }) => void
}

export function OrderDetailSheet({
    order,
    open,
    onOpenChange,
    onOrderUpdate,
}: OrderDetailSheetProps) {
    const [notes, setNotes] = useState(order?.internal_notes ?? '')
    const [isPendingStatus, startStatusTransition] = useTransition()
    const [isPendingNotes, startNotesTransition] = useTransition()

    // Sync notes when a different order is selected
    const currentNotes = order?.internal_notes ?? ''
    if (notes !== currentNotes && !isPendingNotes) {
        setNotes(currentNotes)
    }

    if (!order) return null

    const cd = order.customer_details ?? {}
    const items = (order as any).order_items ?? []

    const handleStatusChange = (newStatus: OrderStatus) => {
        startStatusTransition(async () => {
            // Optimistic update
            onOrderUpdate({ id: order.id, status: newStatus })

            const result = await updateOrderStatus(order.id, newStatus)
            if (!result.success) {
                // Rollback
                onOrderUpdate({ id: order.id, status: order.status })
                toast.error('Error al actualizar el estado')
            } else {
                toast.success(`Estado cambiado a "${STATUS_CONFIG[newStatus]?.label}"`)
            }
        })
    }

    const handleSaveNotes = () => {
        startNotesTransition(async () => {
            const result = await updateOrderNotes(order.id, notes)
            if (!result.success) {
                toast.error('Error al guardar la nota')
            } else {
                onOrderUpdate({ id: order.id, internal_notes: notes || null })
                toast.success('Nota guardada')
            }
        })
    }

    const itemsTotal = items.reduce(
        (acc: number, it: any) => acc + it.unit_price * it.quantity,
        0
    )

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-2xl overflow-y-auto p-0 flex flex-col"
            >
                {/* ── Header ── */}
                <SheetHeader className="px-6 py-5 border-b border-neutral-100 bg-gradient-to-r from-neutral-50 to-white sticky top-0 z-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <SheetTitle className="text-xl font-serif text-neutral-900">
                                Pedido #{String(order.id).padStart(4, '0')}
                            </SheetTitle>
                            <SheetDescription className="text-xs text-neutral-400 mt-0.5">
                                {format(new Date(order.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                            </SheetDescription>
                        </div>
                        <StatusBadge status={order.status} />
                    </div>
                </SheetHeader>

                {/* ── WhatsApp CTA (only for failed orders) ── */}
                {FAILED_STATUSES.includes(order.status) && (
                    (() => {
                        const name = order.customer_details?.name?.split(' ')[0] ?? 'cliente'
                        const phone = order.customer_details?.phone?.replace(/\D/g, '') ?? ''
                        const msg = encodeURIComponent(
                            `Hola ${name}! 👋 Vi que tuviste un inconveniente con el pago de tu perfume en PerfuMan. ` +
                            `¿Te puedo ayudar a resolverlo? 🌸`
                        )
                        const href = phone
                            ? `https://wa.me/${phone}?text=${msg}`
                            : `https://wa.me/?text=${msg}`
                        return (
                            <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 transition-colors hover:bg-red-500/10"
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
                        )
                    })()
                )}

                <div className="flex-1 overflow-y-auto">
                    {/* ── Admin Actions ── */}
                    <section className="px-6 py-5 bg-amber-50/50 border-b border-amber-100">
                        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                            Acciones del administrador
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Status selector */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-neutral-600">Estado del pedido</label>
                                <Select
                                    value={order.status}
                                    onValueChange={handleStatusChange}
                                    disabled={isPendingStatus}
                                >
                                    <SelectTrigger className="h-9 text-sm bg-white border-neutral-200 focus:border-amber-400 focus:ring-amber-400/20">
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

                            {/* Payment ID */}
                            {order.payment_id && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-neutral-600">ID de Pago (MP)</label>
                                    <p className="h-9 flex items-center px-3 text-xs font-mono text-neutral-500 bg-white border border-neutral-200 rounded-md truncate">
                                        {order.payment_id}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Internal notes */}
                        <div className="mt-4 space-y-2">
                            <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5" />
                                Notas internas (solo tú las ves)
                            </label>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Ej: Cliente llamó, pide envío urgente. Número de guía: 12345..."
                                className="resize-none text-sm bg-white border-neutral-200 focus:border-amber-400 focus:ring-amber-400/20 min-h-[80px]"
                                disabled={isPendingNotes}
                            />
                            <Button
                                size="sm"
                                onClick={handleSaveNotes}
                                disabled={isPendingNotes || notes === (order.internal_notes ?? '')}
                                className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                            >
                                <>
                                    {isPendingNotes ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                    ) : (
                                        <Save className="h-3.5 w-3.5 mr-1.5" />
                                    )}
                                    Guardar Nota
                                </>
                            </Button>
                        </div>
                    </section>

                    {/* ── Products ── */}
                    <section className="px-6 py-5 border-b border-neutral-100">
                        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Package className="h-3.5 w-3.5" />
                            Productos del pedido
                        </h3>
                        {items.length > 0 ? (
                            <div className="rounded-lg border border-neutral-200 overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                                            <TableHead className="text-xs font-semibold text-neutral-500 py-2">Producto</TableHead>
                                            <TableHead className="text-xs font-semibold text-neutral-500 py-2 text-center w-16">Cant.</TableHead>
                                            <TableHead className="text-xs font-semibold text-neutral-500 py-2 text-right w-28">P. Unit.</TableHead>
                                            <TableHead className="text-xs font-semibold text-neutral-500 py-2 text-right w-28">Subtotal</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item: any) => (
                                            <TableRow key={item.id} className="hover:bg-neutral-50">
                                                <TableCell className="py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        {item.product?.image_url ? (
                                                            <img
                                                                src={item.product.image_url}
                                                                alt={item.product?.name}
                                                                className="w-9 h-9 rounded-md object-cover border border-neutral-200 flex-shrink-0"
                                                            />
                                                        ) : (
                                                            <div className="w-9 h-9 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center flex-shrink-0">
                                                                <Package className="h-4 w-4 text-neutral-300" />
                                                            </div>
                                                        )}
                                                        <span className="text-sm font-medium text-neutral-900 line-clamp-2">
                                                            {item.product?.name ?? 'Producto eliminado'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3 text-center text-sm text-neutral-600">{item.quantity}</TableCell>
                                                <TableCell className="py-3 text-right text-sm text-neutral-600">{formatCurrency(item.unit_price)}</TableCell>
                                                <TableCell className="py-3 text-right text-sm font-semibold text-neutral-900">
                                                    {formatCurrency(item.unit_price * item.quantity)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {/* Total row */}
                                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-50 to-rose-50 border-t border-amber-100">
                                    <span className="text-sm font-semibold text-neutral-700">Total pagado</span>
                                    <span className="text-lg font-bold text-amber-700">{formatCurrency(order.total_amount)}</span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-neutral-400 italic">Sin productos registrados.</p>
                        )}
                    </section>

                    {/* ── Shipping Info ── */}
                    <section className="px-6 py-5">
                        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                            <Truck className="h-3.5 w-3.5" />
                            Datos de envío y cliente
                        </h3>
                        <div className="space-y-3">
                            <InfoRow icon={FileText} label="Nombre completo" value={cd.name} />
                            <InfoRow icon={Mail} label="Email" value={order.customer_email ?? cd.email} />
                            <InfoRow icon={Phone} label="Teléfono / celular" value={cd.phone} />
                            <InfoRow icon={Hash} label="Cédula de identidad" value={cd.cedula} />
                            <Separator className="my-1" />
                            <InfoRow
                                icon={Truck}
                                label="Tipo de envío"
                                value={
                                    cd.shipping_type === 'domicilio'
                                        ? '🏠 Domicilio'
                                        : cd.shipping_type === 'sucursal'
                                            ? '🏢 Sucursal (DAC / UES)'
                                            : cd.shipping_type
                                }
                            />
                            <InfoRow icon={MapPin} label="Dirección" value={cd.address} />
                            <InfoRow icon={MapPin} label="Ciudad / Localidad" value={cd.city} />
                            <InfoRow icon={MapPin} label="Departamento" value={cd.department} />
                            <InfoRow icon={CreditCard} label="Sucursal DAC / UES" value={cd.dac_ues} />
                        </div>
                    </section>
                </div>
            </SheetContent>
        </Sheet>
    )
}

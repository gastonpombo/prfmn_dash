'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type Order, type Product } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Package,
  DollarSign,
  AlertTriangle,
  ShoppingCart,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type DashboardStats = {
  totalRevenue: number
  totalOrders: number
  activeProducts: number
  lowStockCount: number
  lowStockProducts: Product[]
  recentOrders: Order[]
  salesByMonth: Array<{ month: string; sales: number; orders: number }>
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalOrders: 0,
    activeProducts: 0,
    lowStockCount: 0,
    lowStockProducts: [],
    recentOrders: [],
    salesByMonth: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    setLoading(true)
    try {
      // Get all products
      const { data: allProducts } = await supabase
        .from('products')
        .select('*')

      // Get all orders with items
      const { data: allOrders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (allProducts && allOrders) {
        // Calculate KPIs
        const totalRevenue = allOrders
          .filter((o) => o.status === 'paid')
          .reduce((sum, o) => sum + Number(o.total_amount), 0)

        const totalOrders = allOrders.length
        const activeProducts = allProducts.filter((p) => p.is_active).length
        const lowStockProducts = allProducts.filter((p) => p.stock < 10)
        const lowStockCount = lowStockProducts.length

        // Get recent orders (last 5)
        const recentOrders = allOrders.slice(0, 5)

        // Calculate sales by month (last 12 months)
        const salesByMonth = calculateSalesByMonth(allOrders)

        setStats({
          totalRevenue,
          totalOrders,
          activeProducts,
          lowStockCount,
          lowStockProducts,
          recentOrders,
          salesByMonth,
        })
      }
    } catch (error) {
      console.error('[v0] Error loading dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateSalesByMonth = (orders: Order[]) => {
    const monthsData: Record<string, { sales: number; orders: number }> = {}

    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const key = format(date, 'MMM', { locale: es })
      monthsData[key] = { sales: 0, orders: 0 }
    }

    // Aggregate data
    orders.forEach((order) => {
      const orderDate = new Date(order.created_at)
      const key = format(orderDate, 'MMM', { locale: es })
      if (key in monthsData) {
        if (order.status === 'paid') {
          monthsData[key].sales += Number(order.total_amount)
        }
        monthsData[key].orders += 1
      }
    })

    return Object.entries(monthsData).map(([month, data]) => ({
      month,
      sales: Math.round(data.sales),
      orders: data.orders,
    }))
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-green-100 text-green-700',
      shipped: 'bg-blue-100 text-blue-700',
      pending: 'bg-amber-100 text-amber-700',
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    }
    return colors[status] || 'bg-neutral-100 text-neutral-700'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      paid: 'Pagado',
      shipped: 'Enviado',
      pending: 'Pendiente',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
    }
    return labels[status] || status
  }

  const kpiCards = [
    {
      title: 'Ingresos Totales',
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Pedidos Totales',
      value: stats.totalOrders.toString(),
      icon: ShoppingCart,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Productos Activos',
      value: stats.activeProducts.toString(),
      icon: Package,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Stock Bajo',
      value: stats.lowStockCount.toString(),
      icon: AlertTriangle,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
    },
  ]

  return (
    <div className="p-8 bg-neutral-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-serif font-bold text-neutral-900 mb-2">
            Command Center
          </h1>
          <p className="text-neutral-600">
            Visión general de tu negocio de perfumes
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card) => {
            const Icon = card.icon
            return (
              <Card
                key={card.title}
                className={`${card.bgColor} border-neutral-200 shadow-sm hover:shadow-md transition-all`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-neutral-600 flex items-center justify-between">
                    {card.title}
                    <div
                      className={`w-9 h-9 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}
                    >
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-neutral-900">{card.value}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alerts Section */}
          <Card className="lg:col-span-1 border-neutral-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-neutral-900">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Alertas de Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.lowStockProducts.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-4">
                  Todo el stock está bajo control
                </p>
              ) : (
                <div className="space-y-3">
                  {stats.lowStockProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-neutral-900 truncate">
                          {product.name}
                        </p>
                        <p className="text-xs text-red-600 font-semibold">
                          {product.stock} unidades
                        </p>
                      </div>
                      <Button
                        onClick={() => router.push(`/dashboard/products`)}
                        variant="ghost"
                        size="sm"
                        className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      >
                        Reponer
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sales Chart */}
          <Card className="lg:col-span-2 border-neutral-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-neutral-900">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Ventas por Mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.salesByMonth.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.salesByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip
                        formatter={(value) => `$${value}`}
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="sales" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-neutral-500 text-center py-8">
                  No hay datos disponibles
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card className="border-neutral-200 shadow-sm">
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-neutral-900">
              <ShoppingCart className="h-5 w-5 text-amber-600" />
              Pedidos Recientes
            </CardTitle>
            <Button
              onClick={() => router.push('/dashboard/orders')}
              variant="ghost"
              className="text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-50 gap-2"
            >
              Ver Todos
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {stats.recentOrders.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-8">
                No hay pedidos
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-neutral-200">
                      <TableHead className="font-semibold text-neutral-700">ID</TableHead>
                      <TableHead className="font-semibold text-neutral-700">Cliente</TableHead>
                      <TableHead className="font-semibold text-neutral-700">Fecha</TableHead>
                      <TableHead className="font-semibold text-neutral-700 text-right">Total</TableHead>
                      <TableHead className="font-semibold text-neutral-700">Estado</TableHead>
                      <TableHead className="font-semibold text-neutral-700">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-neutral-50 border-neutral-200">
                        <TableCell className="font-mono text-sm text-neutral-600">
                          #{order.id}
                        </TableCell>
                        <TableCell className="text-neutral-900">
                          <div className="text-sm">
                            {order.customer_details?.name || 'N/A'}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {order.customer_email}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-neutral-600">
                          {format(new Date(order.created_at), 'dd MMM yyyy', {
                            locale: es,
                          })}
                        </TableCell>
                        <TableCell className="font-semibold text-right text-neutral-900">
                          ${Number(order.total_amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}
                          >
                            {getStatusLabel(order.status)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                            variant="ghost"
                            size="sm"
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          >
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

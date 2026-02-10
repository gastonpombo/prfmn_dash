'use client'

import React from "react"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Package, LogOut, Loader2, ShoppingCart, Settings, Menu, X } from 'lucide-react'
import Link from 'next/link'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    checkUser()
  }, [])

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    )
  }

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Categorías',
      href: '/dashboard/categories',
      icon: Package,
    },
    {
      label: 'Productos',
      href: '/dashboard/products',
      icon: Package,
    },
    {
      label: 'Pedidos',
      href: '/dashboard/orders',
      icon: ShoppingCart,
    },
    {
      label: 'Configuración',
      href: '/dashboard/settings',
      icon: Settings,
    },
  ]

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-neutral-200 z-50 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-100 to-rose-100 rounded-lg flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 text-amber-700"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
              />
            </svg>
          </div>
          <h2 className="font-serif font-semibold text-lg text-neutral-900">PerfuMan</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-neutral-700"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 top-16"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white border-r border-neutral-200 shadow-lg z-40 transform transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full">
          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={`w-full justify-start gap-3 h-11 ${isActive
                        ? 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                        : 'text-neutral-600 hover:bg-neutral-50'
                      }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Button>
                </Link>
              )
            })}
          </nav>

          {/* User & Logout */}
          <div className="p-4 border-t border-neutral-200">
            <div className="mb-3 px-3 py-2 bg-neutral-50 rounded-lg">
              <p className="text-xs text-neutral-500 mb-1">Sesión activa</p>
              <p className="text-sm font-medium text-neutral-900 truncate">
                {user?.email}
              </p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full justify-start gap-3 h-11 border-neutral-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300 bg-transparent"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Cerrar Sesión</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-white border-r border-neutral-200 shadow-sm z-10">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-rose-100 rounded-xl flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-amber-700"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="font-serif font-semibold text-lg text-neutral-900">PerfuMan</h2>
                <p className="text-xs text-neutral-500">Admin Panel</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={`w-full justify-start gap-3 h-11 ${isActive
                        ? 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                        : 'text-neutral-600 hover:bg-neutral-50'
                      }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Button>
                </Link>
              )
            })}
          </nav>

          {/* User & Logout */}
          <div className="p-4 border-t border-neutral-200">
            <div className="mb-3 px-3 py-2 bg-neutral-50 rounded-lg">
              <p className="text-xs text-neutral-500 mb-1">Sesión activa</p>
              <p className="text-sm font-medium text-neutral-900 truncate">
                {user?.email}
              </p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full justify-start gap-3 h-11 border-neutral-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300 bg-transparent"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Cerrar Sesión</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  )
}

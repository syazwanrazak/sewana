'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Building2, Users, CreditCard, Wrench, FolderOpen,
  Home, ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/dashboard',    label: 'Dashboard',   shortLabel: 'Home',        icon: LayoutDashboard },
  { href: '/properties',   label: 'Properties',  shortLabel: 'Properties',  icon: Building2 },
  { href: '/tenants',      label: 'Tenants',     shortLabel: 'Tenants',     icon: Users },
  { href: '/payments',     label: 'Payments',    shortLabel: 'Payments',    icon: CreditCard },
  { href: '/maintenance',  label: 'Maintenance', shortLabel: 'Tickets',     icon: Wrench },
  { href: '/documents',    label: 'Documents',   shortLabel: 'Docs',        icon: FolderOpen },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <aside className={cn(
        'relative hidden md:flex flex-col border-r border-border bg-sidebar transition-all duration-200 ease-in-out h-screen flex-shrink-0',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}>
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-700 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Home className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-extrabold text-[15px] tracking-tight">Sewana</div>
              <div className="text-[11px] text-muted-foreground font-medium">Property OS</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-colors',
                  active
                    ? 'bg-accent text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-3 border-t border-border">
          <button
            onClick={handleLogout}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
              collapsed && 'justify-center'
            )}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full border border-border bg-card text-muted-foreground flex items-center justify-center hover:text-foreground shadow-sm z-10"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* Mobile bottom nav — hidden on desktop */}
      <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-card border-t border-border safe-area-inset-bottom">
        <div className="flex">
          {NAV.map(({ href, shortLabel, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[10px] font-semibold transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className={cn('w-5 h-5', active && 'stroke-[2.5]')} />
                <span className="leading-none">{shortLabel}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}

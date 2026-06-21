'use client'

import { Bell, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <header className="flex-shrink-0 h-[62px] border-b border-border bg-card flex items-center gap-4 px-6">
      {/* Search */}
      <div className="relative max-w-[380px] flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search properties, tenants, payments…"
          className="pl-9 h-9 bg-muted/50 border-transparent focus:border-border focus:bg-card text-sm"
        />
      </div>

      <div className="flex-1" />

      {/* Notifications */}
      <Button variant="outline" size="icon" className="h-9 w-9 relative">
        <Bell className="w-4 h-4" />
        <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500" />
      </Button>
    </header>
  )
}

export function PageHeader({ title, subtitle, action }: HeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, MapPin, User } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/Header'
import { PriorityBadge } from '@/components/shared/Badge'
import { formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { NewTicketModal } from '@/components/maintenance/NewTicketModal'
import type { MaintenanceStatus, MaintenanceTicket, Property } from '@/types'

const COLUMNS: { status: MaintenanceStatus; label: string; color: string }[] = [
  { status: 'open',     label: 'Open',       color: 'bg-red-500' },
  { status: 'progress', label: 'In Progress', color: 'bg-amber-400' },
  { status: 'resolved', label: 'Resolved',    color: 'bg-green-500' },
]

export default function MaintenancePage() {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const [ticketsRes, propsRes] = await Promise.all([
      supabase
        .from('maintenance_tickets')
        .select('*, property:properties(id, name, color)')
        .order('created_at', { ascending: false }),
      supabase
        .from('properties')
        .select('id, name, units(id, name)')
        .order('name'),
    ])
    setTickets(ticketsRes.data ?? [])
    setProperties((propsRes.data ?? []) as Property[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const getTickets = (status: MaintenanceStatus) => tickets.filter(t => t.status === status)

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-[1320px] mx-auto px-4 py-5 md:px-7 md:py-7">
        <PageHeader
          title="Maintenance"
          subtitle="Ticket board — linked to property, room or parking."
          action={
            <Button size="sm" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> New Request
            </Button>
          }
        />

        {loading ? (
          <div className="py-20 text-center text-muted-foreground text-sm">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            {COLUMNS.map(col => {
              const colTickets = getTickets(col.status)
              return (
                <div key={col.status}>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                    <span className="font-bold text-sm">{col.label}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{colTickets.length}</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {colTickets.map(tk => {
                      // Supabase returns the joined property as tk.property
                      const prop = (tk as any).property
                      const isResolved = tk.status === 'resolved'
                      return (
                        <Card
                          key={tk.id}
                          className={`p-4 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${isResolved ? 'opacity-80 hover:opacity-100' : ''}`}
                        >
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <span className={`font-bold text-[13.5px] leading-snug flex-1 ${isResolved ? 'line-through text-muted-foreground' : ''}`}>
                              {tk.title}
                            </span>
                            {isResolved
                              ? <span className="text-green-600 flex-shrink-0">✓</span>
                              : <PriorityBadge priority={tk.priority} />
                            }
                          </div>
                          {tk.description && !isResolved && (
                            <div className="text-xs text-muted-foreground leading-relaxed mb-3">{tk.description}</div>
                          )}
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {prop?.name || '—'}
                            </span>
                            <span>{formatDate(tk.created_at)}</span>
                          </div>
                          {tk.assignee && !isResolved && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="w-3 h-3" />
                              {tk.assignee}
                            </div>
                          )}
                        </Card>
                      )
                    })}
                    {colTickets.length === 0 && (
                      <div className="py-10 text-center text-muted-foreground text-sm border-2 border-dashed border-muted rounded-xl">
                        {col.status === 'resolved' ? 'Nothing resolved yet' : 'No tickets'}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <NewTicketModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={load}
        properties={properties}
      />
    </main>
  )
}

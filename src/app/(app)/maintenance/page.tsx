'use client'

import { useState, useEffect, useCallback } from 'react'
import { MapPin, User, ArrowRight, CheckCircle2, RotateCcw, FileVideo } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/Header'
import { PriorityBadge } from '@/components/shared/Badge'
import { formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { MaintenanceStatus, MaintenanceTicket } from '@/types'

const COLUMNS: { status: MaintenanceStatus; label: string; color: string }[] = [
  { status: 'open',        label: 'Open',        color: 'bg-red-500' },
  { status: 'in_progress', label: 'In Progress', color: 'bg-amber-400' },
  { status: 'resolved',    label: 'Resolved',    color: 'bg-green-500' },
]

export default function MaintenancePage() {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('maintenance_tickets')
      .select('*, property:properties(id, name, color), tenant:tenants(id, name, color)')
      .order('created_at', { ascending: false })
    setTickets(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function advanceStatus(tk: MaintenanceTicket, status: MaintenanceStatus) {
    const supabase = createClient()
    await supabase
      .from('maintenance_tickets')
      .update({
        status,
        updated_at: new Date().toISOString(),
        resolved_at: status === 'resolved' ? new Date().toISOString() : null,
      })
      .eq('id', tk.id)
    load()
  }

  const getTickets = (status: MaintenanceStatus) => tickets.filter(t => t.status === status)

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-[1320px] mx-auto px-4 py-5 md:px-7 md:py-7">
        <PageHeader
          title="Maintenance"
          subtitle="Issues reported by tenants — linked to property, room or parking."
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
                      // Supabase returns the joined property/tenant as tk.property / tk.tenant
                      const prop = (tk as any).property
                      const tenant = (tk as any).tenant
                      const isResolved = tk.status === 'resolved'
                      return (
                        <Card
                          key={tk.id}
                          className={`p-4 transition-all hover:shadow-md ${isResolved ? 'opacity-80 hover:opacity-100' : ''}`}
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
                          {tk.attachment_url && (
                            <a
                              href={tk.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block mb-3 rounded-lg overflow-hidden border bg-muted/30"
                            >
                              {tk.attachment_type === 'video' ? (
                                <div className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                                  <FileVideo className="w-4 h-4" /> View video attachment
                                </div>
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={tk.attachment_url} alt="Attachment" className="w-full max-h-40 object-cover" />
                              )}
                            </a>
                          )}
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {prop?.name || '—'}
                            </span>
                            <span>{formatDate(tk.created_at)}</span>
                          </div>
                          {tenant?.name && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="w-3 h-3" />
                              Reported by {tenant.name}
                            </div>
                          )}
                          <div className="mt-3 pt-3 border-t flex justify-end">
                            {tk.status === 'open' && (
                              <button
                                onClick={() => advanceStatus(tk, 'in_progress')}
                                className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg transition-colors"
                              >
                                Start Work <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                            {tk.status === 'in_progress' && (
                              <button
                                onClick={() => advanceStatus(tk, 'resolved')}
                                className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-lg transition-colors"
                              >
                                Mark Resolved <CheckCircle2 className="w-3 h-3" />
                              </button>
                            )}
                            {tk.status === 'resolved' && (
                              <button
                                onClick={() => advanceStatus(tk, 'open')}
                                className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg transition-colors"
                              >
                                <RotateCcw className="w-3 h-3" /> Reopen
                              </button>
                            )}
                          </div>
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
    </main>
  )
}

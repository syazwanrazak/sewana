'use client'

import { useState, useEffect, useCallback } from 'react'
import { MapPin, User, ArrowRight, CheckCircle2, RotateCcw, FileVideo, MessageSquarePlus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/Header'
import { PriorityBadge } from '@/components/shared/Badge'
import { formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { MaintenanceStatus, MaintenanceTicket, MaintenanceTicketUpdate } from '@/types'

const COLUMNS: { status: MaintenanceStatus; label: string; color: string }[] = [
  { status: 'open',        label: 'Open',        color: 'bg-red-500' },
  { status: 'in_progress', label: 'In Progress', color: 'bg-amber-400' },
  { status: 'resolved',    label: 'Resolved',    color: 'bg-green-500' },
]

// null nextStatus = log a remark without changing status (only valid while in_progress)
interface RemarkTarget {
  ticketId: string
  nextStatus: MaintenanceStatus | null
}

export default function MaintenancePage() {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [remarking, setRemarking] = useState<RemarkTarget | null>(null)
  const [remarkText, setRemarkText] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('maintenance_tickets')
      .select('*, property:properties(id, name, color), tenant:tenants(id, name, color), updates:maintenance_ticket_updates(id, note, status, created_at)')
      .order('created_at', { ascending: false })
    setTickets(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function reopen(tk: MaintenanceTicket) {
    const supabase = createClient()
    await supabase
      .from('maintenance_tickets')
      .update({ status: 'open', updated_at: new Date().toISOString(), resolved_at: null })
      .eq('id', tk.id)
    load()
  }

  async function submitRemark() {
    if (!remarking) return
    const note = remarkText.trim()
    if (!remarking.nextStatus && !note) { toast.error('Enter a remark.'); return }

    const supabase = createClient()
    if (note) {
      await supabase.from('maintenance_ticket_updates').insert({
        ticket_id: remarking.ticketId,
        note,
        status: remarking.nextStatus,
      })
    }
    if (remarking.nextStatus) {
      await supabase
        .from('maintenance_tickets')
        .update({
          status: remarking.nextStatus,
          updated_at: new Date().toISOString(),
          resolved_at: remarking.nextStatus === 'resolved' ? new Date().toISOString() : null,
        })
        .eq('id', remarking.ticketId)
    }
    setRemarking(null)
    setRemarkText('')
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
                      // Supabase returns the joined property/tenant/updates as tk.property / tk.tenant / tk.updates
                      const prop = (tk as any).property
                      const tenant = (tk as any).tenant
                      const updates = ((tk as any).updates ?? []) as MaintenanceTicketUpdate[]
                      const sortedUpdates = [...updates].sort((a, b) => a.created_at.localeCompare(b.created_at))
                      const isResolved = tk.status === 'resolved'
                      const isRemarkingHere = remarking?.ticketId === tk.id
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

                          {sortedUpdates.length > 0 && (
                            <div className="mt-3 pt-3 border-t flex flex-col gap-2">
                              {sortedUpdates.map(u => (
                                <div key={u.id} className="flex gap-2 text-xs">
                                  <MessageSquarePlus className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                  <div className="min-w-0">
                                    <div className="text-foreground leading-relaxed">{u.note}</div>
                                    <div className="text-muted-foreground mt-0.5">{formatDate(u.created_at)}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="mt-3 pt-3 border-t">
                            {isRemarkingHere ? (
                              <div className="flex flex-col gap-2">
                                <textarea
                                  autoFocus
                                  rows={2}
                                  value={remarkText}
                                  onChange={e => setRemarkText(e.target.value)}
                                  placeholder={remarking?.nextStatus ? 'Remark (optional)…' : 'e.g. Contacted plumber, arriving Friday…'}
                                  className="w-full border rounded-lg px-2.5 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring bg-background"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => { setRemarking(null); setRemarkText('') }}
                                    className="text-xs text-muted-foreground hover:underline"
                                  >Cancel</button>
                                  <button
                                    onClick={submitRemark}
                                    className="text-xs font-semibold text-primary hover:underline"
                                  >Save</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-2">
                                {tk.status === 'open' && (
                                  <button
                                    onClick={() => { setRemarking({ ticketId: tk.id, nextStatus: 'in_progress' }); setRemarkText('') }}
                                    className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg transition-colors"
                                  >
                                    Start Work <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}
                                {tk.status === 'in_progress' && (
                                  <>
                                    <button
                                      onClick={() => { setRemarking({ ticketId: tk.id, nextStatus: null }); setRemarkText('') }}
                                      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/70 px-2.5 py-1.5 rounded-lg transition-colors"
                                    >
                                      <MessageSquarePlus className="w-3 h-3" /> Add Update
                                    </button>
                                    <button
                                      onClick={() => { setRemarking({ ticketId: tk.id, nextStatus: 'resolved' }); setRemarkText('') }}
                                      className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-lg transition-colors"
                                    >
                                      Mark Resolved <CheckCircle2 className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                                {tk.status === 'resolved' && (
                                  <button
                                    onClick={() => reopen(tk)}
                                    className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg transition-colors"
                                  >
                                    <RotateCcw className="w-3 h-3" /> Reopen
                                  </button>
                                )}
                              </div>
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

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/Header'
import { Avatar } from '@/components/shared/Avatar'
import { PaymentStatusBadge, RentalTypeBadge } from '@/components/shared/Badge'
import { createClient } from '@/lib/supabase/client'
import { rm } from '@/lib/utils'
import { toast } from 'sonner'
import { ExternalLink, CheckCircle, XCircle } from 'lucide-react'
import type { PaymentStatus, RentalType } from '@/types'

interface PendingReceipt {
  id: string
  amount: number
  pay_month: string
  receipt_url: string
  file_name: string | null
  tenant: { id: string; name: string; email: string | null } | null
}

interface PaymentRow {
  id: string
  amount: number
  due_date: string
  status: PaymentStatus
  rental_type: RentalType
  tenant?: { name: string; color: string } | null
  property?: { name: string } | null
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 cursor-pointer" onClick={onClick}>
      <span className="text-sm font-semibold">{label}</span>
      <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${on ? 'bg-primary' : 'bg-muted'}`}>
        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
    </div>
  )
}

const dotColors: Record<string, string> = { paid: 'bg-green-500', pending: 'bg-amber-400', late: 'bg-red-500' }

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [pendingReceipts, setPendingReceipts] = useState<PendingReceipt[]>([])
  const [loading, setLoading] = useState(true)
  const [emailOn, setEmailOn] = useState(true)
  const [waOn, setWaOn] = useState(true)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const [paymentsRes, receiptsRes] = await Promise.all([
      supabase
        .from('payments')
        .select('id, amount, due_date, status, rental_type, tenant:tenants(name, color), property:properties(name)')
        .order('due_date', { ascending: false }),
      supabase
        .from('payment_receipts')
        .select('id, amount, pay_month, receipt_url, file_name, tenant:tenants(id, name, email)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
    ])
    setPayments((paymentsRes.data ?? []) as unknown as PaymentRow[])
    setPendingReceipts((receiptsRes.data ?? []) as unknown as PendingReceipt[])
    setLoading(false)
  }, [])

  async function approveReceipt(r: PendingReceipt) {
    const supabase = createClient()
    await supabase.from('payment_receipts').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', r.id)
    if (r.tenant?.email) {
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'payment_approved', to: r.tenant.email, data: { name: r.tenant.name, amount: r.amount, month: r.pay_month } }),
      }).catch(() => {})
    }
    toast.success(`Receipt approved — ${r.tenant?.name}`)
    load()
  }

  async function rejectReceipt(r: PendingReceipt) {
    const supabase = createClient()
    await supabase.from('payment_receipts').update({ status: 'rejected', rejection_reason: rejectReason || null, reviewed_at: new Date().toISOString() }).eq('id', r.id)
    if (r.tenant?.email) {
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'payment_rejected', to: r.tenant.email, data: { name: r.tenant.name, amount: r.amount, reason: rejectReason } }),
      }).catch(() => {})
    }
    toast.success(`Receipt rejected — email sent to ${r.tenant?.name}`)
    setRejecting(null)
    setRejectReason('')
    load()
  }

  useEffect(() => { load() }, [load])

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
  // Adjust so Monday = 0
  const offset = (firstDayOfMonth + 6) % 7

  // Map day → worst status for current month
  const dueDays: Record<number, string> = {}
  payments
    .filter(p => {
      const d = new Date(p.due_date)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })
    .forEach(p => {
      const day = new Date(p.due_date).getDate()
      if (dueDays[day] === 'late' || p.status === 'late') dueDays[day] = 'late'
      else if (dueDays[day] === 'pending' || p.status === 'pending') dueDays[day] = 'pending'
      else dueDays[day] = p.status
    })

  const totalAmount = payments.reduce((s, p) => s + p.amount, 0)
  const lateCount = payments.filter(p => p.status === 'late').length
  const paid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const pending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0)
  const overdue = payments.filter(p => p.status === 'late').reduce((s, p) => s + p.amount, 0)

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-[1320px] mx-auto px-4 py-5 md:px-7 md:py-7">
        <PageHeader
          title="Payments & Reminders"
          subtitle="Multi-type billing — unit rent, room rent, and parking fees in one ledger."
        />

        {/* Pending receipts queue */}
        {pendingReceipts.length > 0 && (
          <Card className="overflow-hidden mb-4">
            <div className="px-5 py-4 border-b flex justify-between items-center bg-amber-50">
              <span className="font-bold text-[15px] text-amber-800">Payment Receipts to Review</span>
              <span className="text-xs font-semibold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">{pendingReceipts.length} pending</span>
            </div>
            {pendingReceipts.map(r => (
              <div key={r.id} className="border-b last:border-0 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-sm">{r.tenant?.name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(r.pay_month).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })} · {rm(r.amount)}
                      {r.file_name ? ` · ${r.file_name}` : ''}
                    </div>
                    {rejecting === r.id && (
                      <div className="mt-2 flex gap-2 items-center">
                        <input
                          className="border rounded-lg px-2 py-1 text-xs flex-1 focus:outline-none focus:ring-1 focus:ring-ring"
                          placeholder="Reason (optional)…"
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                        />
                        <button
                          onClick={() => rejectReceipt(r)}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >Confirm</button>
                        <button
                          onClick={() => { setRejecting(null); setRejectReason('') }}
                          className="text-xs text-muted-foreground hover:underline"
                        >Cancel</button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a href={r.receipt_url} target="_blank" rel="noopener noreferrer" title="View receipt" className="w-8 h-8 flex items-center justify-center rounded-lg border hover:bg-muted transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => approveReceipt(r)}
                      title="Approve"
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 text-green-700 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setRejecting(r.id); setRejectReason('') }}
                      title="Reject"
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1.85fr_1fr] gap-4 items-start">
          {/* Ledger */}
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b flex justify-between items-center">
              <span className="font-bold text-[15px]">Payment Ledger</span>
              <span className="text-xs text-muted-foreground">
                {loading ? '…' : `${payments.length} charge${payments.length !== 1 ? 's' : ''} · ${rm(totalAmount)}`}
              </span>
            </div>

            {loading ? (
              <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>
            ) : payments.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">No payments recorded yet.</div>
            ) : (
              <>
                <div className="hidden sm:grid grid-cols-[2fr_1.1fr_1fr_1fr] gap-2 px-5 py-3 border-b text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  <span>Tenant</span><span>Type</span><span>Due</span><span className="text-right">Amount</span>
                </div>
                {payments.map(p => (
                  <div key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    {/* Mobile */}
                    <div className="sm:hidden flex items-center gap-3 px-4 py-3.5">
                      {p.tenant && <Avatar name={p.tenant.name} color={p.tenant.color} size="sm" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm truncate">{p.tenant?.name.split(' ')[0] || '—'}</span>
                          <PaymentStatusBadge status={p.status} />
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{p.property?.name || '—'}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <RentalTypeBadge type={p.rental_type} />
                          <span className="text-xs font-bold">{rm(p.amount)}</span>
                        </div>
                      </div>
                    </div>
                    {/* Desktop */}
                    <div className="hidden sm:grid grid-cols-[2fr_1.1fr_1fr_1fr] gap-2 px-5 py-3 items-center">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {p.tenant && <Avatar name={p.tenant.name} color={p.tenant.color} size="sm" />}
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">{p.tenant?.name || '—'}</div>
                          <div className="text-xs text-muted-foreground truncate">{p.property?.name || '—'}</div>
                        </div>
                      </div>
                      <div><RentalTypeBadge type={p.rental_type} /></div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(p.due_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <PaymentStatusBadge status={p.status} />
                        <span className="font-bold text-sm text-right min-w-[60px]">{rm(p.amount)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </Card>

          {/* Right panel */}
          <div className="flex flex-col gap-4">
            {/* Calendar */}
            <Card className="p-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-sm">
                  {now.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })}
                </span>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Paid</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Due</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Late</span>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-[10px] text-muted-foreground font-bold text-center mb-1">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: offset }, (_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                  const st = dueDays[d]
                  const today = now.getDate()
                  return (
                    <div
                      key={d}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[11px] relative border ${d === today ? 'border-primary bg-accent' : 'border-transparent'}`}
                    >
                      {d}
                      {st && <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${dotColors[st]}`} />}
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Reminder automation */}
            <Card className="p-4">
              <div className="font-bold text-sm mb-1">Reminder Automation</div>
              <div className="text-xs text-muted-foreground mb-4">Sent 3 days before due date.</div>
              <Toggle on={emailOn} onClick={() => setEmailOn(e => !e)} label="📧 Email Reminders" />
              <Toggle on={waOn} onClick={() => setWaOn(w => !w)} label="💬 WhatsApp Reminders" />
              {lateCount > 0 && (
                <div className="mt-3 p-3 bg-accent rounded-xl flex gap-2 text-xs text-primary">
                  <span>✦</span>
                  <span><b>Suggested:</b> Send reminder to {lateCount} overdue tenant{lateCount !== 1 ? 's' : ''} now.</span>
                </div>
              )}
            </Card>

            {/* Summary */}
            <Card className="p-4">
              <div className="font-bold text-sm mb-3">Summary</div>
              {([
                { label: 'Paid',    val: paid,    color: 'text-green-600' },
                { label: 'Pending', val: pending,  color: 'text-amber-600' },
                { label: 'Overdue', val: overdue,  color: 'text-red-600' },
              ]).map(({ label, val, color }) => (
                <div key={label} className="flex justify-between py-2 border-b last:border-0 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={`font-bold ${color}`}>{rm(val)}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/Header'
import { Avatar } from '@/components/shared/Avatar'
import { PaymentStatusBadge, RentalTypeBadge } from '@/components/shared/Badge'
import { createClient } from '@/lib/supabase/client'
import { ensureLedgerCurrent } from '@/lib/ledger'
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
  tenant_id: string
  amount: number
  due_date: string
  status: PaymentStatus
  rental_type: RentalType
  tenant?: { name: string; color: string } | null
  property?: { name: string } | null
}

interface GroupedPaymentRow {
  key: string
  due_date: string
  amount: number
  status: PaymentStatus
  types: RentalType[]
  tenant?: { name: string; color: string } | null
  property?: { name: string } | null
}

const STATUS_RANK: Record<PaymentStatus, number> = { late: 2, pending: 1, paid: 0 }

function groupPayments(payments: PaymentRow[]): GroupedPaymentRow[] {
  const map = new Map<string, GroupedPaymentRow>()
  for (const p of payments) {
    const key = `${p.tenant_id}|${p.due_date}`
    const g = map.get(key)
    if (g) {
      g.amount += p.amount
      if (!g.types.includes(p.rental_type)) g.types.push(p.rental_type)
      if (STATUS_RANK[p.status] > STATUS_RANK[g.status]) g.status = p.status
    } else {
      map.set(key, { key, due_date: p.due_date, amount: p.amount, status: p.status, types: [p.rental_type], tenant: p.tenant, property: p.property })
    }
  }
  return Array.from(map.values())
}

const monthKey = (dateStr: string) => dateStr.slice(0, 7)
const currentMonthKey = new Date().toISOString().slice(0, 7)
const monthLabel = (key: string) => new Date(`${key}-01`).toLocaleDateString('en-MY', { month: 'short', year: 'numeric' })

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [pendingReceipts, setPendingReceipts] = useState<PendingReceipt[]>([])
  const [loading, setLoading] = useState(true)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    await ensureLedgerCurrent(supabase)
    const [paymentsRes, receiptsRes] = await Promise.all([
      supabase
        .from('payments')
        .select('id, tenant_id, amount, due_date, status, rental_type, tenant:tenants(name, color), property:properties(name)')
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

    // Reflect the approval in the payment ledger (payments table is separate from payment_receipts)
    if (r.tenant?.id) {
      const [y, m] = r.pay_month.slice(0, 7).split('-').map(Number)
      const rangeStart = `${y}-${String(m).padStart(2, '0')}-01`
      const nextY = m === 12 ? y + 1 : y
      const nextM = m === 12 ? 1 : m + 1
      const rangeEnd = `${nextY}-${String(nextM).padStart(2, '0')}-01`
      const paidDate = new Date().toISOString().slice(0, 10)

      const { data: existing } = await supabase
        .from('payments')
        .select('id')
        .eq('tenant_id', r.tenant.id)
        .gte('due_date', rangeStart)
        .lt('due_date', rangeEnd)
        .neq('status', 'paid')
        .limit(1)
        .maybeSingle()

      if (existing) {
        await supabase.from('payments').update({ status: 'paid', paid_date: paidDate }).eq('id', existing.id)
      } else {
        const { data: contracts } = await supabase
          .from('contracts')
          .select('id, property_id, rental_type, due_day')
          .eq('tenant_id', r.tenant.id)
          .eq('status', 'active')
        const contract = contracts?.find(c => c.rental_type !== 'parking') ?? contracts?.[0]
        if (contract) {
          const daysInMonth = new Date(y, m, 0).getDate()
          const day = Math.min(contract.due_day ?? 1, daysInMonth)
          const dueDate = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          await supabase.from('payments').insert({
            contract_id: contract.id,
            tenant_id: r.tenant.id,
            property_id: contract.property_id,
            amount: r.amount,
            due_date: dueDate,
            paid_date: paidDate,
            status: 'paid',
            rental_type: contract.rental_type,
          })
        }
      }
    }

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

  const months = Array.from(new Set([currentMonthKey, ...payments.map(p => monthKey(p.due_date))])).sort((a, b) => b.localeCompare(a))
  const monthPayments = payments.filter(p => monthKey(p.due_date) === selectedMonth)
  const groupedPayments = groupPayments(monthPayments).sort((a, b) => b.due_date.localeCompare(a.due_date))

  const totalAmount = monthPayments.reduce((s, p) => s + p.amount, 0)
  const paid = monthPayments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const pending = monthPayments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0)
  const overdue = monthPayments.filter(p => p.status === 'late').reduce((s, p) => s + p.amount, 0)

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
                {loading ? '…' : `${groupedPayments.length} charge${groupedPayments.length !== 1 ? 's' : ''} · ${rm(totalAmount)}`}
              </span>
            </div>

            <div className="flex gap-2 px-5 pt-3 pb-1 overflow-x-auto">
              {months.map(m => (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-all ${
                    selectedMonth === m
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {monthLabel(m)}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>
            ) : groupedPayments.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">No payments for {monthLabel(selectedMonth)}.</div>
            ) : (
              <>
                <div className="hidden sm:grid grid-cols-[2fr_1.3fr_1fr_1fr] gap-2 px-5 py-3 border-b text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  <span>Tenant</span><span>Type</span><span>Due</span><span className="text-right">Amount</span>
                </div>
                {groupedPayments.map(p => (
                  <div key={p.key} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    {/* Mobile */}
                    <div className="sm:hidden flex items-center gap-3 px-4 py-3.5">
                      {p.tenant && <Avatar name={p.tenant.name} color={p.tenant.color} size="sm" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm truncate">{p.tenant?.name.split(' ')[0] || '—'}</span>
                          <PaymentStatusBadge status={p.status} />
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {p.property?.name || '—'} · Due {new Date(p.due_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {p.types.map(t => <RentalTypeBadge key={t} type={t} />)}
                          <span className="text-xs font-bold">{rm(p.amount)}</span>
                        </div>
                      </div>
                    </div>
                    {/* Desktop */}
                    <div className="hidden sm:grid grid-cols-[2fr_1.3fr_1fr_1fr] gap-2 px-5 py-3 items-center">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {p.tenant && <Avatar name={p.tenant.name} color={p.tenant.color} size="sm" />}
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">{p.tenant?.name || '—'}</div>
                          <div className="text-xs text-muted-foreground truncate">{p.property?.name || '—'}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {p.types.map(t => <RentalTypeBadge key={t} type={t} />)}
                      </div>
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

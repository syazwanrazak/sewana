'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/Header'
import { Avatar } from '@/components/shared/Avatar'
import { PaymentStatusBadge, RentalTypeBadge } from '@/components/shared/Badge'
import { PAYMENTS, TENANTS, PROPERTIES } from '@/lib/seed'
import { rm } from '@/lib/utils'

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

export default function PaymentsPage() {
  const [emailOn, setEmailOn] = useState(true)
  const [waOn, setWaOn] = useState(true)

  const enriched = PAYMENTS.map(p => ({
    ...p,
    tenant: TENANTS.find(t => t.id === p.tenant_id),
    property: PROPERTIES.find(pr => pr.id === p.property_id),
  }))

  const totalAmount = PAYMENTS.reduce((s, p) => s + p.amount, 0)
  const lateCount = PAYMENTS.filter(p => p.status === 'late').length

  const dueDays: Record<number, string> = {}
  PAYMENTS.forEach(p => {
    const d = new Date(p.due_date).getDate()
    if (dueDays[d] === 'late' || p.status === 'late') dueDays[d] = 'late'
    else if (dueDays[d] === 'pending' || p.status === 'pending') dueDays[d] = 'pending'
    else dueDays[d] = p.status
  })
  const dotColors: Record<string, string> = { paid: 'bg-green-500', pending: 'bg-amber-400', late: 'bg-red-500' }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-[1320px] mx-auto px-4 py-5 md:px-7 md:py-7">
        <PageHeader
          title="Payments & Reminders"
          subtitle="Multi-type billing — unit rent, room rent, and parking fees in one ledger."
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1.85fr_1fr] gap-4 items-start">
          {/* Ledger */}
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b flex justify-between items-center">
              <span className="font-bold text-[15px]">
                {new Date().toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })} Ledger
              </span>
              <span className="text-xs text-muted-foreground">{PAYMENTS.length} charges · {rm(totalAmount)}</span>
            </div>
            {/* Desktop table header */}
            <div className="hidden sm:grid grid-cols-[2fr_1.1fr_1fr_1fr] gap-2 px-5 py-3 border-b text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              <span>Tenant</span><span>Type</span><span>Due</span><span className="text-right">Amount</span>
            </div>
            {enriched.map(p => (
              <div key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                {/* Mobile row */}
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
                {/* Desktop row */}
                <div className="hidden sm:grid grid-cols-[2fr_1.1fr_1fr_1fr] gap-2 px-5 py-3 items-center">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {p.tenant && <Avatar name={p.tenant.name} color={p.tenant.color} size="sm" />}
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{p.tenant?.name.split(' ')[0] || '—'}</div>
                      <div className="text-xs text-muted-foreground truncate">{p.property?.name || '—'}</div>
                    </div>
                  </div>
                  <div><RentalTypeBadge type={p.rental_type} /></div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(p.due_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <PaymentStatusBadge status={p.status} />
                    <span className="font-bold text-sm text-right min-w-[60px]">{rm(p.amount)}</span>
                  </div>
                </div>
              </div>
            ))}
          </Card>

          {/* Right panel */}
          <div className="flex flex-col gap-4">
            {/* Calendar */}
            <Card className="p-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-sm">
                  {new Date().toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })}
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
                {Array.from({ length: 30 }, (_, i) => i + 1).map(d => {
                  const st = dueDays[d]
                  const today = new Date().getDate()
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
              <div className="font-bold text-sm mb-3">
                {new Date().toLocaleDateString('en-MY', { month: 'long' })} Summary
              </div>
              {([
                { label: 'Paid', val: PAYMENTS.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0), color: 'text-green-600' },
                { label: 'Pending', val: PAYMENTS.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0), color: 'text-amber-600' },
                { label: 'Overdue', val: PAYMENTS.filter(p => p.status === 'late').reduce((s, p) => s + p.amount, 0), color: 'text-red-600' },
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

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { CreditCard, Wrench, Calendar, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PortalShell } from '@/components/portal/PortalShell'
import { createClient } from '@/lib/supabase/client'
import { rm, formatDate } from '@/lib/utils'

interface Contract {
  id: string
  monthly_rent: number
  start_date: string
  end_date: string
  rental_type: string
  property: { name: string; block?: string; level?: string; unit_no?: string } | null
  unit: { name: string } | null
}

interface TenantData {
  id: string
  name: string
  email: string
  phone: string
  contracts: Contract[]
}

interface Receipt {
  id: string
  amount: number
  pay_month: string
  status: string
  created_at: string
}

interface Ticket {
  id: string
  title: string
  status: string
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  open:       'bg-blue-100 text-blue-700',
  in_progress:'bg-violet-100 text-violet-700',
  resolved:   'bg-green-100 text-green-700',
}

function daysBetween(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

export default function PortalDashboard() {
  const [tenant, setTenant]   = useState<TenantData | null>(null)
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [tickets, setTickets]   = useState<Ticket[]>([])
  const [name, setName]         = useState('')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const tid = user.app_metadata?.tenant_id ?? user.user_metadata?.tenant_id
    const uname = user.user_metadata?.name ?? user.email ?? ''
    setName(uname)
    setTenantId(tid)

    if (!tid) { setLoading(false); return }

    const [tenantRes, receiptsRes, ticketsRes] = await Promise.all([
      supabase
        .from('tenants')
        .select('id, name, email, phone, contracts(id, monthly_rent, start_date, end_date, rental_type, property:properties(name, block, level, unit_no), unit:units(name))')
        .eq('id', tid)
        .single(),
      supabase
        .from('payment_receipts')
        .select('id, amount, pay_month, status, created_at')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('maintenance_tickets')
        .select('id, title, status, created_at')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false })
        .limit(3),
    ])

    setTenant(tenantRes.data as unknown as TenantData)
    setReceipts(receiptsRes.data ?? [])
    setTickets(ticketsRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const mainContract = tenant?.contracts?.find(c => c.rental_type !== 'parking')
  const parkingContract = tenant?.contracts?.find(c => c.rental_type === 'parking')
  const totalRent = (mainContract?.monthly_rent ?? 0) + (parkingContract?.monthly_rent ?? 0)

  const expiryDays = mainContract?.end_date ? daysBetween(mainContract.end_date) : null

  if (loading) {
    return (
      <PortalShell name="">
        <div className="py-20 text-center text-muted-foreground text-sm">Loading…</div>
      </PortalShell>
    )
  }

  if (!tenantId || !tenant) {
    return (
      <PortalShell name={name}>
        <div className="py-20 text-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold">No tenant account linked.</p>
          <p className="text-sm text-muted-foreground mt-1">Contact your landlord to set up your portal access.</p>
        </div>
      </PortalShell>
    )
  }

  return (
    <PortalShell name={tenant.name}>
      <div className="flex flex-col gap-5">
        {/* Welcome */}
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Hi, {tenant.name.split(' ')[0]}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Here's your rental overview.</p>
        </div>

        {/* Unit card */}
        {mainContract && (
          <Card className="p-5 bg-gradient-to-br from-teal-700 to-teal-500 text-white border-0 shadow-lg">
            <div className="text-xs font-semibold opacity-80 mb-1">
              {[
                mainContract.property?.name,
                mainContract.property?.block && `Block ${mainContract.property.block}`,
                mainContract.property?.level && `Level ${mainContract.property.level}`,
                mainContract.property?.unit_no && `Unit ${mainContract.property.unit_no}`,
              ].filter(Boolean).join(' · ')}
            </div>
            <div className="text-2xl font-extrabold mb-1">
              {mainContract.unit?.name ?? 'Your Unit'}
              {parkingContract?.unit && <span className="text-base font-semibold opacity-80 ml-2">+ {parkingContract.unit.name}</span>}
            </div>
            <div className="text-3xl font-black mb-3">{rm(totalRent)}<span className="text-base font-semibold opacity-80">/mo</span></div>
            <div className="flex items-center justify-between text-xs opacity-80">
              <span>Contract: {formatDate(mainContract.start_date)} – {formatDate(mainContract.end_date)}</span>
              {expiryDays !== null && expiryDays <= 60 && (
                <span className={`font-bold ${expiryDays <= 30 ? 'text-red-200' : 'text-amber-200'}`}>
                  {expiryDays < 0 ? 'Expired' : `${expiryDays}d left`}
                </span>
              )}
            </div>
          </Card>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/portal/payments">
            <Card className="p-4 flex flex-col gap-2 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95">
              <CreditCard className="w-5 h-5 text-primary" />
              <div className="font-bold text-sm">Pay Rent</div>
              <div className="text-xs text-muted-foreground">Submit payment proof</div>
            </Card>
          </Link>
          <Link href="/portal/maintenance">
            <Card className="p-4 flex flex-col gap-2 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95">
              <Wrench className="w-5 h-5 text-primary" />
              <div className="font-bold text-sm">Report Issue</div>
              <div className="text-xs text-muted-foreground">Lodge a maintenance request</div>
            </Card>
          </Link>
        </div>

        {/* Recent payments */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-sm">Recent Payments</h2>
            <Link href="/portal/payments" className="text-xs text-primary font-semibold">View all</Link>
          </div>
          {receipts.length === 0 ? (
            <Card className="p-4 text-center text-sm text-muted-foreground">No payments submitted yet.</Card>
          ) : (
            <div className="flex flex-col gap-2">
              {receipts.map(r => (
                <Card key={r.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <div className="text-sm font-semibold">
                        {new Date(r.pay_month).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })}
                      </div>
                      <div className="text-xs text-muted-foreground">{rm(r.amount)}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full capitalize ${STATUS_COLORS[r.status] ?? ''}`}>
                    {r.status}
                  </span>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Recent maintenance */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-sm">Maintenance Requests</h2>
            <Link href="/portal/maintenance" className="text-xs text-primary font-semibold">View all</Link>
          </div>
          {tickets.length === 0 ? (
            <Card className="p-4 text-center text-sm text-muted-foreground">No requests yet.</Card>
          ) : (
            <div className="flex flex-col gap-2">
              {tickets.map(tk => (
                <Card key={tk.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Wrench className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <div className="text-sm font-semibold truncate max-w-[180px]">{tk.title}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(tk.created_at)}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full capitalize whitespace-nowrap ${STATUS_COLORS[tk.status] ?? ''}`}>
                    {tk.status.replace('_', ' ')}
                  </span>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  )
}

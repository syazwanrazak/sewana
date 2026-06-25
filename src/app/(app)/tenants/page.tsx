'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/Header'
import { Avatar } from '@/components/shared/Avatar'
import { RentalTypeBadge, PaymentStatusBadge } from '@/components/shared/Badge'
import { rm, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { AddTenantModal } from '@/components/tenants/AddTenantModal'
import { EditTenantModal } from '@/components/tenants/EditTenantModal'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, UserX, RefreshCw, MessageCircle } from 'lucide-react'
import { RenewContractModal } from '@/components/tenants/RenewContractModal'
import type { RentalType, PaymentStatus, Property } from '@/types'

const FILTERS: { label: string; value: 'all' | RentalType }[] = [
  { label: 'All',       value: 'all' },
  { label: 'Full Unit', value: 'full' },
  { label: 'Room',      value: 'room' },
  { label: 'Parking',   value: 'parking' },
]

interface TenantRow {
  id: string
  name: string
  email?: string
  phone?: string
  color: string
  property: string
  propertyId?: string
  sub: string
  type: RentalType
  rent: number
  status: PaymentStatus
  since: string
  contractId?: string
  unitId?: string
  contractStart?: string
  contractEnd?: string
  parkingContractId?: string
  parkingUnitId?: string
  parkingUnitName?: string
  parkingRent?: number
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | RentalType>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingTenant, setEditingTenant] = useState<TenantRow | null>(null)
  const [renewingTenant, setRenewingTenant] = useState<TenantRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const [tenantsRes, propsRes] = await Promise.all([
      // Fetch tenants with their active contracts, linked property/unit, and latest payment
      supabase
        .from('tenants')
        .select(`
          id, name, email, phone, color, created_at,
          contracts(
            id, rental_type, monthly_rent, status, start_date, end_date,
            property:properties(id, name),
            unit:units(id, name),
            payments(id, status, due_date)
          )
        `)
        .order('created_at', { ascending: false }),
      supabase
        .from('properties')
        .select('id, name, units(id, name, unit_type, price, is_occupied)')
        .order('name'),
    ])

    // Derive a flat row per tenant for the table
    const rows: TenantRow[] = (tenantsRes.data ?? []).map((t: any) => {
      // Main contract = active non-parking; fall back to first non-parking
      const contract = t.contracts?.find((c: any) => c.status === 'active' && c.rental_type !== 'parking')
        ?? t.contracts?.find((c: any) => c.rental_type !== 'parking')
        ?? t.contracts?.[0]
      // Parking contract = active parking contract
      const parkingContract = t.contracts?.find((c: any) => c.status === 'active' && c.rental_type === 'parking')
      // Latest payment by due_date
      const latestPayment = [...(contract?.payments ?? [])]
        .sort((a: any, b: any) => b.due_date.localeCompare(a.due_date))[0]

      return {
        id: t.id,
        name: t.name,
        email: t.email,
        phone: t.phone,
        color: t.color ?? '#0F766E',
        property: contract?.property?.name ?? '—',
        propertyId: contract?.property?.id,
        sub: contract?.unit?.name ?? '—',
        type: (contract?.rental_type ?? 'room') as RentalType,
        rent: contract?.monthly_rent ?? 0,
        status: (latestPayment?.status ?? 'pending') as PaymentStatus,
        since: formatDate(t.created_at),
        contractId: contract?.id,
        unitId: contract?.unit?.id,
        contractStart: contract?.start_date,
        contractEnd: contract?.end_date,
        parkingContractId: parkingContract?.id,
        parkingUnitId: parkingContract?.unit?.id,
        parkingUnitName: parkingContract?.unit?.name,
        parkingRent: parkingContract?.monthly_rent ?? 0,
      }
    })

    setTenants(rows)
    setProperties((propsRes.data ?? []) as Property[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = filter === 'all' ? tenants : tenants.filter(t => t.type === filter)

  function contractExpiryLabel(endDate?: string) {
    if (!endDate) return null
    const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)
    if (days < 0)  return { label: 'Expired',       cls: 'text-red-600 bg-red-50' }
    if (days <= 30) return { label: `${days}d left`, cls: 'text-red-600 bg-red-50' }
    if (days <= 60) return { label: `${days}d left`, cls: 'text-amber-600 bg-amber-50' }
    return { label: formatDate(endDate), cls: 'text-muted-foreground' }
  }

  async function removeTenant(t: TenantRow) {
    if (!confirm(`Remove "${t.name}"?\n\nThis ends their contract and frees the assigned unit.`)) return
    const supabase = createClient()
    if (t.contractId) {
      await supabase.from('contracts').update({ status: 'terminated' }).eq('id', t.contractId)
    }
    if (t.unitId) {
      await supabase.from('units').update({ is_occupied: false }).eq('id', t.unitId)
    }
    await supabase.from('tenants').delete().eq('id', t.id)
    load()
  }

  function openWhatsApp(t: TenantRow) {
    const raw = (t.phone ?? '').replace(/\D/g, '')
    const phone = raw.startsWith('60') ? raw : raw.startsWith('0') ? '6' + raw : '60' + raw
    if (!phone) { toast.error(`No phone number for ${t.name}.`); return }
    const totalRent = (t.rent ?? 0) + (t.parkingRent ?? 0)
    const msg = `Hi ${t.name.split(' ')[0]}, this is a friendly reminder that your rent of RM ${totalRent} is due. Please make payment via DuitNow or bank transfer and submit your proof via the Sewana tenant portal. Thank you!`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  function TenantMenu({ t }: { t: TenantRow }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex-shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <MoreHorizontal className="w-4 h-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end">
          <DropdownMenuItem onClick={() => setEditingTenant(t)}>
            <Pencil className="w-3.5 h-3.5" /> Edit Details
          </DropdownMenuItem>
          {t.contractId && (
            <DropdownMenuItem onClick={() => setRenewingTenant(t)}>
              <RefreshCw className="w-3.5 h-3.5" /> Renew Contract
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => openWhatsApp(t)}>
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Reminder
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => removeTenant(t)}>
            <UserX className="w-3.5 h-3.5" /> Remove Tenant
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-[1320px] mx-auto px-4 py-5 md:px-7 md:py-7">
        <PageHeader
          title="Tenants"
          subtitle="Manage tenancies across all rental types."
          action={
            <Button size="sm" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Tenant
            </Button>
          }
        />

        {/* Filter chips */}
        <div className="flex gap-2 mb-4">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                filter === f.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              {tenants.length === 0 ? 'No tenants yet. Click "+ Add Tenant" to get started.' : 'No tenants for this type.'}
            </div>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="divide-y md:hidden">
                {filtered.map(t => {
                  const totalRent = (t.rent ?? 0) + (t.parkingRent ?? 0)
                  return (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setEditingTenant(t)}>
                    <Avatar name={t.name} color={t.color} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-sm truncate">{t.name}</div>
                        <PaymentStatusBadge status={t.status} />
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {t.property} · {t.sub}{t.parkingUnitName ? ` · 🅿 ${t.parkingUnitName}` : ''}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <RentalTypeBadge type={t.type} />
                        <span className="text-xs font-bold text-primary">{totalRent ? rm(totalRent) : '—'}/mo</span>
                        {t.parkingRent ? <span className="text-[10px] text-muted-foreground">incl. parking</span> : null}
                        {(() => { const e = contractExpiryLabel(t.contractEnd); return e ? <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${e.cls}`}>Until {e.label}</span> : null })()}
                      </div>
                    </div>
                    <TenantMenu t={t} />
                  </div>
                )})}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <div className="grid grid-cols-[2fr_1.8fr_1.1fr_1fr_0.9fr_1.1fr_36px] gap-3 px-5 py-3 border-b text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  <span>Tenant</span>
                  <span>Assignment</span>
                  <span>Type</span>
                  <span>Total Rent</span>
                  <span>Payment</span>
                  <span>Contract</span>
                  <span />
                </div>
                {filtered.map(t => {
                  const expiry = contractExpiryLabel(t.contractEnd)
                  const totalRent = (t.rent ?? 0) + (t.parkingRent ?? 0)
                  return (
                    <div
                      key={t.id}
                      className="grid grid-cols-[2fr_1.8fr_1.1fr_1fr_0.9fr_1.1fr_36px] gap-3 px-5 py-3.5 border-b last:border-0 items-center hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setEditingTenant(t)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={t.name} color={t.color} size="md" />
                        <div className="min-w-0">
                          <div className="font-semibold text-[13.5px] truncate">{t.name}</div>
                          <div className="text-xs text-muted-foreground">Since {t.since}</div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{t.property}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {t.sub}{t.parkingUnitName ? ` · 🅿 ${t.parkingUnitName}` : ''}
                        </div>
                      </div>
                      <div><RentalTypeBadge type={t.type} /></div>
                      <div>
                        <div className="font-bold text-[13.5px]">{totalRent ? rm(totalRent) : '—'}</div>
                        {t.parkingRent ? <div className="text-[10px] text-muted-foreground">incl. parking</div> : null}
                      </div>
                      <div><PaymentStatusBadge status={t.status} /></div>
                      <div>
                        {expiry
                          ? <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${expiry.cls}`}>{expiry.label}</span>
                          : <span className="text-xs text-muted-foreground">—</span>
                        }
                      </div>
                      <TenantMenu t={t} />
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </Card>
      </div>

      <AddTenantModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={load}
        properties={properties}
      />

      {editingTenant && (
        <EditTenantModal
          open={!!editingTenant}
          onClose={() => setEditingTenant(null)}
          onUpdated={() => { setEditingTenant(null); load() }}
          tenant={editingTenant}
          properties={properties}
        />
      )}

      {renewingTenant && (
        <RenewContractModal
          open={!!renewingTenant}
          onClose={() => setRenewingTenant(null)}
          onRenewed={() => { setRenewingTenant(null); load() }}
          tenant={renewingTenant}
        />
      )}
    </main>
  )
}

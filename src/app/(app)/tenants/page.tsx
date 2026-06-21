'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/Header'
import { Avatar } from '@/components/shared/Avatar'
import { RentalTypeBadge, PaymentStatusBadge } from '@/components/shared/Badge'
import { rm, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { AddTenantModal } from '@/components/tenants/AddTenantModal'
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
  color: string
  property: string
  sub: string
  type: RentalType
  rent: number
  status: PaymentStatus
  since: string
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | RentalType>('all')
  const [showModal, setShowModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const [tenantsRes, propsRes] = await Promise.all([
      // Fetch tenants with their active contracts, linked property/unit, and latest payment
      supabase
        .from('tenants')
        .select(`
          id, name, color, created_at,
          contracts(
            id, rental_type, monthly_rent, status,
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
      // Prefer the active contract; fall back to the first one
      const contract = t.contracts?.find((c: any) => c.status === 'active') ?? t.contracts?.[0]
      // Latest payment by due_date
      const latestPayment = [...(contract?.payments ?? [])]
        .sort((a: any, b: any) => b.due_date.localeCompare(a.due_date))[0]

      return {
        id: t.id,
        name: t.name,
        color: t.color ?? '#0F766E',
        property: contract?.property?.name ?? '—',
        sub: contract?.unit?.name ?? '—',
        type: (contract?.rental_type ?? 'room') as RentalType,
        rent: contract?.monthly_rent ?? 0,
        status: (latestPayment?.status ?? 'pending') as PaymentStatus,
        since: formatDate(t.created_at),
      }
    })

    setTenants(rows)
    setProperties((propsRes.data ?? []) as Property[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = filter === 'all' ? tenants : tenants.filter(t => t.type === filter)

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
                {filtered.map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-4">
                    <Avatar name={t.name} color={t.color} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-sm truncate">{t.name}</div>
                        <PaymentStatusBadge status={t.status} />
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {t.property} · {t.sub}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <RentalTypeBadge type={t.type} />
                        <span className="text-xs font-bold text-primary">{t.rent ? rm(t.rent) : '—'}/mo</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <div className="grid grid-cols-[2.2fr_1.8fr_1.3fr_1fr_1fr] gap-3 px-5 py-3 border-b text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  <span>Tenant</span>
                  <span>Assignment</span>
                  <span>Type</span>
                  <span>Rent</span>
                  <span>Status</span>
                </div>
                {filtered.map(t => (
                  <div
                    key={t.id}
                    className="grid grid-cols-[2.2fr_1.8fr_1.3fr_1fr_1fr] gap-3 px-5 py-3.5 border-b last:border-0 items-center hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={t.name} color={t.color} size="md" />
                      <div className="min-w-0">
                        <div className="font-semibold text-[13.5px] truncate">{t.name}</div>
                        <div className="text-xs text-muted-foreground">Since {t.since}</div>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">{t.property}</div>
                      <div className="text-xs text-muted-foreground">{t.sub}</div>
                    </div>
                    <div><RentalTypeBadge type={t.type} /></div>
                    <div className="font-bold text-[13.5px]">{t.rent ? rm(t.rent) : '—'}</div>
                    <div><PaymentStatusBadge status={t.status} /></div>
                  </div>
                ))}
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
    </main>
  )
}

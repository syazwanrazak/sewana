'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Building2, Plus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/Header'
import { propertyRevenue, propertyOccupancy } from '@/lib/seed'
import { rm } from '@/lib/utils'
import { AddPropertyModal } from '@/components/properties/AddPropertyModal'
import { createClient } from '@/lib/supabase/client'
import type { Property } from '@/types'

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('properties')
      .select('*, owner:owners(*), units(*)')
      .order('created_at', { ascending: false })
    setProperties(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const totalSubUnits = properties.reduce((s, p) => s + (p.units?.length || 0), 0)
  const allUnits = properties.flatMap(p => p.units || [])
  const overallOcc = allUnits.length
    ? Math.round(allUnits.filter(u => u.is_occupied).length / allUnits.length * 100)
    : 0

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-[1320px] mx-auto px-4 py-5 md:px-7 md:py-7">
        <PageHeader
          title="Properties"
          subtitle={loading ? 'Loading…' : `${properties.length} properties · ${totalSubUnits} sub-units · ${overallOcc}% occupied`}
          action={
            <Button size="sm" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Property
            </Button>
          }
        />

        {loading ? (
          <div className="py-20 text-center text-muted-foreground text-sm">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
            {properties.map((p) => {
              const rev = propertyRevenue(p)
              const occ = propertyOccupancy(p)
              const rooms   = (p.units || []).filter(u => u.unit_type === 'room')
              const parking = (p.units || []).filter(u => u.unit_type === 'parking')
              const isExpired = p.contract_expiry && new Date(p.contract_expiry) < new Date()

              return (
                <Link href={`/properties/${p.id}`} key={p.id}>
                  <Card
                    className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                    style={{ borderTop: `3px solid ${p.color || '#0F766E'}` }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-3 items-center">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-accent text-primary">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-[15px]">{p.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{p.address}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                        {p.kind}
                      </span>
                    </div>

                    <div className="flex gap-2 mb-4">
                      <div className="flex-1 bg-muted/60 rounded-xl px-3 py-2.5">
                        <div className="text-lg font-extrabold">{rooms.length}</div>
                        <div className="text-[11px] text-muted-foreground">rooms</div>
                      </div>
                      <div className="flex-1 bg-muted/60 rounded-xl px-3 py-2.5">
                        <div className="text-lg font-extrabold">{parking.length}</div>
                        <div className="text-[11px] text-muted-foreground">parking</div>
                      </div>
                      <div className="flex-1 bg-muted/60 rounded-xl px-3 py-2.5">
                        <div className="text-lg font-extrabold text-primary">{rm(rev)}</div>
                        <div className="text-[11px] text-muted-foreground">/ month</div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Occupancy</span>
                        <span className="font-bold">{occ}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${occ}%`, backgroundColor: p.color || '#0F766E' }}
                        />
                      </div>
                    </div>

                    {isExpired && (
                      <div className="mt-3 text-[11px] font-semibold text-red-600 bg-red-50 rounded-lg px-3 py-1.5">
                        ⚠ Contract expired — renewal required
                      </div>
                    )}
                  </Card>
                </Link>
              )
            })}
            {properties.length === 0 && (
              <div className="col-span-3 py-20 text-center text-muted-foreground text-sm border-2 border-dashed border-muted rounded-xl">
                No properties yet. Click &quot;+ Add Property&quot; to get started.
              </div>
            )}
          </div>
        )}
      </div>

      <AddPropertyModal open={showModal} onClose={() => setShowModal(false)} onCreated={load} />
    </main>
  )
}

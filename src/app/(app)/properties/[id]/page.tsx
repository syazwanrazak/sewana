import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Building2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/server'
import { propertyRevenue, propertyOccupancy } from '@/lib/seed'
import { rm, formatDate } from '@/lib/utils'
import { PriorityBadge } from '@/components/shared/Badge'
import { AddUnitButton } from '@/components/properties/AddUnitButton'
import { UnitRow } from '@/components/properties/UnitRow'
import { ParkingCard } from '@/components/properties/ParkingCard'
import { UploadDocumentButton } from '@/components/properties/UploadDocumentButton'
import { DocumentActions } from '@/components/properties/DocumentActions'
import { UtilityTracker } from '@/components/properties/UtilityTracker'
import { PropertyActions } from '@/components/properties/PropertyActions'

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: property } = await supabase
    .from('properties')
    .select('*, owner:owners(*), units(*)')
    .eq('id', id)
    .single()

  if (!property) notFound()

  const rooms     = (property.units || []).filter((u: any) => u.unit_type === 'room')
  const parking   = (property.units || []).filter((u: any) => u.unit_type === 'parking')
  const fullUnits = (property.units || []).filter((u: any) => u.unit_type === 'full')
  const rev = propertyRevenue(property)
  const occ = propertyOccupancy(property)
  const isExpired = property.contract_expiry && new Date(property.contract_expiry) < new Date()

  const { data: tickets } = await supabase
    .from('maintenance_tickets')
    .select('*')
    .eq('property_id', id)
    .order('created_at', { ascending: false })

  const { data: docs } = await supabase
    .from('documents')
    .select('*')
    .eq('property_id', id)
    .order('created_at', { ascending: false })

  // Utilities for current month
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthLabel = now.toLocaleDateString('en-MY', { month: 'short', year: 'numeric' })
  const { data: utilityRows } = await supabase
    .from('utilities')
    .select('name, amount')
    .eq('property_id', id)
    .eq('month', currentMonth)
    .order('created_at')
  const utilities = (utilityRows ?? []) as { name: string; amount: number }[]

  const DocTypeColors: Record<string, string> = { PDF: 'bg-red-600', DOC: 'bg-blue-600', IMG: 'bg-violet-600' }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-[1320px] mx-auto px-4 py-5 md:px-7 md:py-6">
        <Link href="/properties" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground font-semibold hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> All Properties
        </Link>

        <Card className="overflow-hidden">
          {/* Header */}
          <div className="px-4 md:px-6 py-4 md:py-5 flex flex-col sm:flex-row justify-between items-start gap-4 border-b">
            <div className="flex gap-3 md:gap-4 items-center">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-accent text-primary flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg md:text-xl font-extrabold tracking-tight">{property.name}</h1>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{property.kind}</span>
                  {isExpired && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600">Contract Expired</span>}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {[property.block && `Block ${property.block}`, property.level && `Level ${property.level}`, property.unit_no && `Unit ${property.unit_no}`].filter(Boolean).join(' · ')}
                  {[property.block, property.level, property.unit_no].some(Boolean) && ' · '}
                  {property.address}
                  {property.owner?.name ? ` · Owner: ${property.owner.name}` : ''}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto flex-wrap">
              <div><div className="text-[11px] text-muted-foreground mb-1">Occupancy</div><div className="text-lg md:text-xl font-extrabold text-primary">{occ}%</div></div>
              <div><div className="text-[11px] text-muted-foreground mb-1">Monthly</div><div className="text-lg md:text-xl font-extrabold">{rm(rev)}</div></div>
              <div><div className="text-[11px] text-muted-foreground mb-1">Contract</div><div className="text-lg md:text-xl font-extrabold">{property.contract_expiry ? formatDate(property.contract_expiry) : '—'}</div></div>
              <PropertyActions property={property as any} />
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b px-3 md:px-6 bg-transparent h-auto gap-1 pb-0 overflow-x-auto">
              {[
                { value: 'overview',    label: 'Overview' },
                { value: 'rooms',       label: 'Rooms' },
                { value: 'parking',     label: 'Parking' },
                { value: 'maintenance', label: 'Maintenance' },
                { value: 'documents',   label: 'Documents' },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent pb-3 pt-2 font-semibold"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="p-4 md:p-6">
              {/* Overview */}
              <TabsContent value="overview">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  {[
                    { v: rooms.filter((r: any) => r.is_occupied).length, t: rooms.length, label: 'Rooms Occupied' },
                    { v: parking.filter((r: any) => r.is_occupied).length, t: parking.length, label: 'Parking Assigned' },
                    { v: rm(rev), t: null, label: 'Monthly Income', color: 'text-primary' },
                    { v: `${occ}%`, t: null, label: 'Occupancy Rate' },
                  ].map(({ v, t, label, color }) => (
                    <div key={label} className="bg-muted/50 rounded-xl p-4">
                      <div className={`text-2xl font-extrabold ${color || ''}`}>
                        {v}{t !== null && <span className="text-sm text-muted-foreground font-semibold">/{t}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <UtilityTracker
                    propertyId={property.id}
                    month={currentMonth}
                    monthLabel={monthLabel}
                    initial={utilities}
                  />
                  <div className="border rounded-xl p-4">
                    <div className="font-bold text-sm mb-3">Maintenance History</div>
                    {(tickets ?? []).slice(0, 3).length ? (tickets ?? []).slice(0, 3).map((tk: any) => (
                      <div key={tk.id} className="flex gap-2 items-start py-2 border-b last:border-0 text-sm">
                        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${tk.status === 'resolved' ? 'bg-green-500' : tk.status === 'in_progress' ? 'bg-amber-400' : 'bg-red-400'}`} />
                        <span className="text-muted-foreground">{tk.title} <span className="text-xs">· {formatDate(tk.created_at)}</span></span>
                      </div>
                    )) : <p className="text-sm text-muted-foreground">No records.</p>}
                  </div>
                </div>
              </TabsContent>

              {/* Rooms */}
              <TabsContent value="rooms">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-muted-foreground">{rooms.length + fullUnits.length} room{rooms.length + fullUnits.length !== 1 ? 's' : ''} total</p>
                  <AddUnitButton propertyId={property.id} unitType="room" />
                </div>
                <div className="flex flex-col gap-2.5">
                  {[...rooms, ...fullUnits].map((r: any) => (
                    <UnitRow key={r.id} unit={r} />
                  ))}
                  {rooms.length === 0 && fullUnits.length === 0 && (
                    <p className="text-center py-12 text-muted-foreground text-sm">No rooms added yet.</p>
                  )}
                </div>
              </TabsContent>

              {/* Parking */}
              <TabsContent value="parking">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-muted-foreground">{parking.length} parking spot{parking.length !== 1 ? 's' : ''} total</p>
                  <AddUnitButton propertyId={property.id} unitType="parking" />
                </div>
                {parking.length > 0 ? (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                    {parking.map((pk: any) => (
                      <ParkingCard key={pk.id} unit={pk} />
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-12 text-muted-foreground text-sm">No parking spaces added yet.</p>
                )}
              </TabsContent>

              {/* Maintenance */}
              <TabsContent value="maintenance">
                {(tickets ?? []).length > 0 ? (
                  <div className="flex flex-col gap-2.5">
                    {(tickets ?? []).map((tk: any) => (
                      <div key={tk.id} className="flex items-center gap-3 px-4 py-3.5 border rounded-xl">
                        <PriorityBadge priority={tk.priority} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{tk.title}</div>
                          <div className="text-xs text-muted-foreground">{tk.unit_id || 'Common Area'} · {formatDate(tk.created_at)}</div>
                        </div>
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                          tk.status === 'resolved' ? 'bg-green-50 text-green-700' :
                          tk.status === 'in_progress' ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {tk.status === 'resolved' ? 'Resolved' : tk.status === 'in_progress' ? 'In Progress' : 'Open'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-12 text-muted-foreground text-sm">No open tickets. 🎉</p>
                )}
              </TabsContent>

              {/* Documents */}
              <TabsContent value="documents">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-muted-foreground">{(docs ?? []).length} document{(docs ?? []).length !== 1 ? 's' : ''}</p>
                  <UploadDocumentButton propertyId={property.id} />
                </div>
                {(docs ?? []).length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {(docs ?? []).map((d: any) => (
                      <div key={d.id} className="flex items-center gap-3 px-4 py-3 border rounded-xl hover:border-primary transition-colors">
                        {/* Clicking the icon/name opens the file */}
                        <a
                          href={d.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          <div className={`w-9 h-9 rounded-lg text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${DocTypeColors[d.file_type] || 'bg-slate-500'}`}>
                            {d.file_type}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm truncate">{d.name}</div>
                            <div className="text-xs text-muted-foreground">{d.category} · {d.file_size} · {formatDate(d.created_at)}</div>
                          </div>
                        </a>
                        <DocumentActions doc={d} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-12 text-muted-foreground text-sm">No documents yet. Upload one above.</p>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>
    </main>
  )
}

import { Building2, Users, TrendingUp, DollarSign, Clock, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/Header'
import { Avatar } from '@/components/shared/Avatar'
import { PaymentStatusBadge } from '@/components/shared/Badge'
import { createClient } from '@/lib/supabase/server'
import { propertyRevenue, propertyOccupancy } from '@/lib/seed'
import { rm } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

function StatCard({ icon: Icon, iconBg, label, value, sub, subColor }: {
  icon: React.ElementType, iconBg: string, label: string, value: string | number, sub?: string, subColor?: string
}) {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-extrabold tracking-tight">{value}</div>
      {sub && <div className={`text-xs mt-1 font-medium ${subColor || 'text-muted-foreground'}`}>{sub}</div>}
    </Card>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch all data in parallel for performance
  const [propertiesRes, tenantsRes, paymentsRes] = await Promise.all([
    supabase.from('properties').select('*, units(*)'),
    supabase.from('tenants').select('id'),
    supabase
      .from('payments')
      .select('*, tenant:tenants(id, name, color)')
      .order('created_at', { ascending: false }),
  ])

  const properties = propertiesRes.data ?? []
  const tenantCount = tenantsRes.data?.length ?? 0
  const payments = paymentsRes.data ?? []

  // Compute stats from real data
  const totalRevenue = properties.reduce((s: number, p: any) => s + propertyRevenue(p), 0)
  const totalUnits = properties.reduce((s: number, p: any) => s + (p.units?.length || 0), 0)
  const occupiedUnits = properties.reduce((s: number, p: any) => s + (p.units?.filter((u: any) => u.is_occupied).length || 0), 0)
  const occupancyRate = totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0
  const latePayments = payments.filter((p: any) => p.status === 'late').length
  const pendingPayments = payments.filter((p: any) => p.status === 'pending').length

  const revenueByType = { full: 0, room: 0, parking: 0 } as Record<string, number>
  properties.forEach((p: any) => {
    (p.units || []).filter((u: any) => u.is_occupied).forEach((u: any) => {
      revenueByType[u.unit_type] = (revenueByType[u.unit_type] || 0) + u.price
    })
  })

  const typeStats = {
    full:    { occ: 0, total: 0 },
    room:    { occ: 0, total: 0 },
    parking: { occ: 0, total: 0 },
  } as Record<string, { occ: number; total: number }>
  properties.forEach((p: any) => {
    (p.units || []).forEach((u: any) => {
      if (!typeStats[u.unit_type]) return
      typeStats[u.unit_type].total++
      if (u.is_occupied) typeStats[u.unit_type].occ++
    })
  })

  const recentPayments = payments.slice(0, 5)
  const upcomingPayments = payments.filter((p: any) => p.status !== 'paid').slice(0, 4)

  const isEmpty = properties.length === 0

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-[1320px] mx-auto px-4 py-5 md:px-7 md:py-7">
        <PageHeader
          title="Good morning 👋"
          subtitle={`Portfolio overview — ${new Date().toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })}`}
          action={
            <Link href="/properties">
              <Button size="sm">+ Add Property</Button>
            </Link>
          }
        />

        {isEmpty ? (
          <div className="py-24 text-center">
            <div className="text-4xl mb-4">🏠</div>
            <div className="font-bold text-lg mb-2">No properties yet</div>
            <div className="text-muted-foreground text-sm mb-6">Add your first property to see the dashboard come to life.</div>
            <Link href="/properties">
              <Button>+ Add Property</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
              <StatCard
                icon={Building2} iconBg="bg-accent text-primary"
                label="Total Properties" value={properties.length}
                sub={`${totalUnits} sub-units`}
              />
              <StatCard
                icon={Users} iconBg="bg-blue-50 text-blue-600"
                label="Active Tenants" value={tenantCount}
              />
              <StatCard
                icon={TrendingUp} iconBg="bg-green-50 text-green-600"
                label="Occupancy" value={`${occupancyRate}%`}
                sub="rooms + parking"
              />
              <StatCard
                icon={DollarSign} iconBg="bg-accent text-primary"
                label="Monthly Revenue" value={rm(totalRevenue)}
              />
              <StatCard
                icon={Clock} iconBg="bg-amber-50 text-amber-600"
                label="Pending" value={pendingPayments + latePayments}
                sub={latePayments ? `${latePayments} overdue` : 'None overdue'}
                subColor={latePayments ? 'text-red-600' : 'text-muted-foreground'}
              />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-4 mb-4">
              <Card className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="font-bold">Rental Income by Type</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date().toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-teal-600 inline-block" />Unit</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" />Room</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-400 inline-block" />Parking</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  {(['full', 'room', 'parking'] as const).map((type) => {
                    const labels = { full: 'Full Unit', room: 'Room', parking: 'Parking' }
                    const colors = { full: 'bg-teal-600', room: 'bg-blue-500', parking: 'bg-amber-400' }
                    const val = revenueByType[type] || 0
                    const maxVal = Math.max(...Object.values(revenueByType), 1)
                    const pct = Math.round((val / maxVal) * 180)
                    return (
                      <div key={type} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full flex flex-col justify-end" style={{ height: 180 }}>
                          <div className={`w-full rounded-t-md ${colors[type]} transition-all`} style={{ height: pct }} />
                        </div>
                        <div className="text-xs text-muted-foreground font-medium text-center">{labels[type]}</div>
                        <div className="text-sm font-bold">{rm(val)}</div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              <Card className="p-5">
                <div className="font-bold mb-1">Occupancy Breakdown</div>
                <div className="text-xs text-muted-foreground mb-5">By rental type</div>
                <div className="flex flex-col gap-4 flex-1">
                  {([
                    { key: 'full',    label: 'Full Units', color: 'bg-teal-600' },
                    { key: 'room',    label: 'Rooms',      color: 'bg-blue-500' },
                    { key: 'parking', label: 'Parking',    color: 'bg-amber-400' },
                  ]).map(({ key, label, color }) => {
                    const { occ, total } = typeStats[key]
                    const pct = total ? Math.round((occ / total) * 100) : 0
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-semibold">{label}</span>
                          <span className="text-muted-foreground">{occ} / {total}</span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-5 pt-4 border-t flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Overall</span>
                  <span className="text-xl font-extrabold text-primary">{occupancyRate}%</span>
                </div>
              </Card>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="p-5 bg-gradient-to-br from-accent/60 to-card">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center text-xs">✦</div>
                  <span className="font-bold text-sm">Smart Insights</span>
                </div>
                <div className="flex flex-col gap-3 text-sm">
                  {latePayments > 0 && (
                    <div className="flex gap-2 items-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                      <span><b>{latePayments} tenant{latePayments !== 1 ? 's' : ''}</b> overdue — send reminder now.</span>
                    </div>
                  )}
                  {totalUnits - occupiedUnits > 0 && (
                    <div className="flex gap-2 items-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                      <span><b>{totalUnits - occupiedUnits} vacant unit{totalUnits - occupiedUnits !== 1 ? 's' : ''}.</b> Consider a price drop to fill faster.</span>
                    </div>
                  )}
                  {typeStats.parking.total - typeStats.parking.occ > 0 && (
                    <div className="flex gap-2 items-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <span><b>Optimize parking:</b> {typeStats.parking.total - typeStats.parking.occ} empty slot{typeStats.parking.total - typeStats.parking.occ !== 1 ? 's' : ''} could add {rm((typeStats.parking.total - typeStats.parking.occ) * 100)}/mo.</span>
                    </div>
                  )}
                  {latePayments === 0 && totalUnits === occupiedUnits && (
                    <div className="flex gap-2 items-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                      <span>All units occupied and payments on time. 🎉</span>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-sm">Recent Payments</span>
                  <Link href="/payments" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="flex flex-col gap-3">
                  {recentPayments.length === 0 && (
                    <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                  )}
                  {recentPayments.map((pay: any) => (
                    <div key={pay.id} className="flex items-center gap-2">
                      <Avatar name={pay.tenant?.name ?? '?'} color={pay.tenant?.color ?? '#0F766E'} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{pay.tenant?.name?.split(' ')[0] ?? '—'}</div>
                        <div className="text-xs text-muted-foreground">{rm(pay.amount)}</div>
                      </div>
                      <PaymentStatusBadge status={pay.status} />
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <div className="font-bold text-sm mb-4">Upcoming</div>
                <div className="flex flex-col gap-3">
                  {upcomingPayments.length === 0 && (
                    <p className="text-sm text-muted-foreground">No upcoming payments.</p>
                  )}
                  {upcomingPayments.map((pay: any) => {
                    const isLate = pay.status === 'late'
                    const dueDate = new Date(pay.due_date)
                    return (
                      <div key={pay.id} className="flex gap-3 items-center">
                        <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 leading-none ${isLate ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                          <span className="text-[9px] font-bold">{dueDate.toLocaleDateString('en', { month: 'short' }).toUpperCase()}</span>
                          <span className="text-base font-extrabold">{dueDate.getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{pay.tenant?.name?.split(' ')[0] ?? '—'} — rent</div>
                          <div className={`text-xs font-medium ${isLate ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {isLate ? 'Overdue · ' : ''}{rm(pay.amount)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

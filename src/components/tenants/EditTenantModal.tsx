'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { rm } from '@/lib/utils'
import type { Property } from '@/types'
import { TenantDocuments } from './TenantDocuments'

interface TenantBasic {
  id: string
  name: string
  email?: string
  phone?: string
  propertyId?: string
  contractId?: string
  unitId?: string
  contractStart?: string
  contractEnd?: string
  dueDay?: number
  parkingContractId?: string
  parkingUnitId?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onUpdated: () => void
  tenant: TenantBasic
  properties: Property[]
}

export function EditTenantModal({ open, onClose, onUpdated, tenant, properties }: Props) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    propertyId: '', unitId: '', parkingUnitId: '',
    contractStart: '', contractEnd: '', dueDay: '1',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({
        name: tenant.name,
        email: tenant.email ?? '',
        phone: tenant.phone ?? '',
        propertyId: tenant.propertyId ?? '',
        unitId: tenant.unitId ?? '',
        parkingUnitId: tenant.parkingUnitId ?? '',
        contractStart: tenant.contractStart?.slice(0, 10) ?? '',
        contractEnd: tenant.contractEnd?.slice(0, 10) ?? '',
        dueDay: String(tenant.dueDay ?? 1),
      })
    }
  }, [open, tenant])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const selectedProperty = properties.find(p => p.id === form.propertyId)

  // Vacant rooms/units + keep current unit selectable
  const roomOptions = (selectedProperty?.units ?? []).filter(u =>
    (u.unit_type === 'room' || u.unit_type === 'full') &&
    (!u.is_occupied || u.id === tenant.unitId)
  )

  // Vacant parking + keep current parking selectable
  const parkingOptions = (selectedProperty?.units ?? []).filter(u =>
    u.unit_type === 'parking' &&
    (!u.is_occupied || u.id === tenant.parkingUnitId)
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Name is required.'); return }
    setLoading(true)
    const supabase = createClient()

    // 1. Update tenant info
    const { error: tenantErr } = await supabase.from('tenants').update({
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
    }).eq('id', tenant.id)

    if (tenantErr) { toast.error('Failed to update: ' + tenantErr.message); setLoading(false); return }

    // 2. Update contract dates + unit if changed
    const dueDay = Math.min(31, Math.max(1, Number(form.dueDay) || 1))
    if (tenant.contractId) {
      const unitChanged = form.unitId !== (tenant.unitId ?? '')

      await supabase.from('contracts').update({
        start_date: form.contractStart || undefined,
        end_date: form.contractEnd || undefined,
        unit_id: form.unitId || null,
        due_day: dueDay,
      }).eq('id', tenant.contractId)

      if (unitChanged) {
        if (tenant.unitId) await supabase.from('units').update({ is_occupied: false }).eq('id', tenant.unitId)
        if (form.unitId)   await supabase.from('units').update({ is_occupied: true  }).eq('id', form.unitId)
      }
    }

    // 3. Handle parking changes
    const prevParking = tenant.parkingUnitId ?? ''
    const nextParking = form.parkingUnitId

    if (prevParking !== nextParking) {
      // Remove old parking
      if (tenant.parkingContractId) {
        await supabase.from('contracts').delete().eq('id', tenant.parkingContractId)
      }
      if (prevParking) {
        await supabase.from('units').update({ is_occupied: false }).eq('id', prevParking)
      }

      // Add new parking
      if (nextParking) {
        const parkingUnit = parkingOptions.find(u => u.id === nextParking)
        await supabase.from('contracts').insert({
          tenant_id: tenant.id,
          property_id: form.propertyId,
          unit_id: nextParking,
          rental_type: 'parking',
          monthly_rent: parkingUnit?.price ?? 0,
          deposit: 0,
          start_date: form.contractStart || new Date().toISOString().slice(0, 10),
          end_date: form.contractEnd || '',
          due_day: dueDay,
          status: 'active',
        })
        await supabase.from('units').update({ is_occupied: true }).eq('id', nextParking)
      }
    }

    toast.success('Tenant updated!')
    setLoading(false)
    onClose()
    onUpdated()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Tenant</DialogTitle>
          <p className="text-sm text-muted-foreground">Update contact, unit assignment, and contract details.</p>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 -mx-1 px-1">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-1">
          {/* Contact */}
          <div>
            <Label className="mb-1.5 block">Full Name <span className="text-red-500">*</span></Label>
            <Input placeholder="e.g. Ahmad Bin Ali" value={form.name} onChange={set('name')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Email</Label>
              <Input type="email" placeholder="tenant@email.com" value={form.email} onChange={set('email')} />
            </div>
            <div>
              <Label className="mb-1.5 block">Phone</Label>
              <Input placeholder="012-345 6789" value={form.phone} onChange={set('phone')} />
            </div>
          </div>

          {/* Unit assignment */}
          {tenant.contractId && (
            <div className="border-t pt-4 flex flex-col gap-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Unit Assignment</p>

              <div>
                <Label className="mb-1.5 block">Property</Label>
                <Select
                  value={form.propertyId}
                  onValueChange={(v: string | null) => setForm(f => ({ ...f, propertyId: v ?? '', unitId: '', parkingUnitId: '' }))}
                >
                  <SelectTrigger>
                    {form.propertyId
                      ? <span>{properties.find(p => p.id === form.propertyId)?.name}</span>
                      : <span className="text-muted-foreground">Select property…</span>
                    }
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block">Room / Unit</Label>
                  <Select
                    value={form.unitId}
                    onValueChange={(v: string | null) => setForm(f => ({ ...f, unitId: v ?? '' }))}
                    disabled={!form.propertyId || roomOptions.length === 0}
                  >
                    <SelectTrigger>
                      {form.unitId
                        ? <span>{roomOptions.find(u => u.id === form.unitId)?.name ?? 'Current unit'}</span>
                        : <span className="text-muted-foreground">
                            {!form.propertyId ? 'Select property first' : roomOptions.length === 0 ? 'No units available' : 'Select…'}
                          </span>
                      }
                    </SelectTrigger>
                    <SelectContent>
                      {roomOptions.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} — {rm(u.price)}/mo
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-1.5 block">
                    Parking <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                  </Label>
                  <Select
                    value={form.parkingUnitId}
                    onValueChange={(v: string | null) => setForm(f => ({ ...f, parkingUnitId: v ?? '' }))}
                    disabled={!form.propertyId}
                  >
                    <SelectTrigger>
                      {form.parkingUnitId
                        ? <span>{parkingOptions.find(u => u.id === form.parkingUnitId)?.name ?? 'Current spot'}</span>
                        : <span className="text-muted-foreground">No parking</span>
                      }
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No parking</SelectItem>
                      {parkingOptions.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}{u.price ? ` — ${rm(u.price)}/mo` : ' — Included'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Contract dates */}
          {tenant.contractId && (
            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Contract Duration</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block">Start Date</Label>
                  <Input type="date" value={form.contractStart} onChange={set('contractStart')} />
                </div>
                <div>
                  <Label className="mb-1.5 block">End Date</Label>
                  <Input type="date" value={form.contractEnd} onChange={set('contractEnd')} />
                </div>
              </div>
              <div className="mt-3">
                <Label className="mb-1.5 block">
                  Rent Due Day <span className="text-muted-foreground text-xs font-normal">(day of month, 1–31)</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={form.dueDay}
                  onChange={set('dueDay')}
                  className="max-w-[120px]"
                />
              </div>
            </div>
          )}

          <TenantDocuments tenantId={tenant.id} />

          <div className="flex gap-3 mt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-[1.4]" disabled={loading}>
              {loading ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

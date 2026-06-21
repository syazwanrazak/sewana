'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn, rm, pickColor } from '@/lib/utils'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { RentalType, Property } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
  properties: Property[]
}

const RENTAL_TYPES: { value: RentalType; label: string }[] = [
  { value: 'full',    label: 'Full Unit' },
  { value: 'room',    label: 'Room' },
  { value: 'parking', label: 'Parking' },
]

export function AddTenantModal({ open, onClose, onCreated, properties }: Props) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    propertyId: '', rentalType: 'room' as RentalType, unitId: '',
  })
  const [loading, setLoading] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const selectedProperty = properties.find(p => p.id === form.propertyId)

  // Show only vacant units matching the selected rental type
  const subOptions = selectedProperty?.units?.filter(u => {
    if (form.rentalType === 'full')    return u.unit_type === 'full'    && !u.is_occupied
    if (form.rentalType === 'room')    return u.unit_type === 'room'    && !u.is_occupied
    if (form.rentalType === 'parking') return u.unit_type === 'parking' && !u.is_occupied
    return false
  }) || []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.propertyId) {
      toast.error('Please fill in name and select a property.')
      return
    }
    setLoading(true)
    const supabase = createClient()

    // 1. Create the tenant
    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .insert({
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        color: pickColor(form.name),
      })
      .select('id')
      .single()

    if (tenantErr || !tenant) {
      toast.error('Failed to add tenant: ' + tenantErr?.message)
      setLoading(false)
      return
    }

    // 2. Create a contract linking the tenant to the property/unit
    const selectedUnit = subOptions.find(u => u.id === form.unitId)
    const today = new Date().toISOString().slice(0, 10)
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const { error: contractErr } = await supabase.from('contracts').insert({
      tenant_id: tenant.id,
      property_id: form.propertyId,
      unit_id: form.unitId || null,
      rental_type: form.rentalType,
      monthly_rent: selectedUnit?.price ?? 0,
      deposit: 0,
      start_date: today,
      end_date: nextYear,
      status: 'active',
    })

    if (contractErr) {
      toast.error('Tenant created but contract failed: ' + contractErr.message)
      setLoading(false)
      return
    }

    // 3. Mark unit as occupied
    if (form.unitId) {
      await supabase.from('units').update({ is_occupied: true }).eq('id', form.unitId)
    }

    toast.success(`Tenant "${form.name}" added!`)
    setForm({ name: '', email: '', phone: '', propertyId: '', rentalType: 'room', unitId: '' })
    setLoading(false)
    onClose()
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Tenant</DialogTitle>
          <p className="text-sm text-muted-foreground">Assign to a full unit, a room, or a parking spot.</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-1">
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

          <div>
            <Label className="mb-1.5 block">Property <span className="text-red-500">*</span></Label>
            <Select onValueChange={(v: string | null) => setForm(f => ({ ...f, propertyId: v ?? '', unitId: '' }))}>
              <SelectTrigger>
                {form.propertyId
                  ? <span>{properties.find(p => p.id === form.propertyId)?.name}</span>
                  : <span className="text-muted-foreground">Select a property…</span>
                }
              </SelectTrigger>
              <SelectContent>
                {properties.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">Rental Type</Label>
            <div className="flex gap-2">
              {RENTAL_TYPES.map(rt => (
                <button
                  key={rt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, rentalType: rt.value, unitId: '' }))}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-sm font-semibold border transition-all',
                    form.rentalType === rt.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  )}
                >
                  {rt.label}
                </button>
              ))}
            </div>
          </div>

          {form.rentalType !== 'full' && (
            <div>
              <Label className="mb-1.5 block">
                Assign Unit <span className="text-muted-foreground text-xs font-normal">(vacant only)</span>
              </Label>
              <Select
                disabled={!form.propertyId || subOptions.length === 0}
                onValueChange={(v: string | null) => setForm(f => ({ ...f, unitId: v ?? '' }))}
              >
                <SelectTrigger>
                  {form.unitId
                    ? <span>{subOptions.find(u => u.id === form.unitId)?.name} — {rm(subOptions.find(u => u.id === form.unitId)?.price ?? 0)}/mo</span>
                    : <span className="text-muted-foreground">
                        {!form.propertyId ? 'Select a property first…' : subOptions.length === 0 ? 'No vacant units available' : 'Select…'}
                      </span>
                  }
                </SelectTrigger>
                <SelectContent>
                  {subOptions.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} — {rm(u.price)}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-3 mt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-[1.4]" disabled={loading}>
              {loading ? 'Saving…' : 'Add Tenant'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

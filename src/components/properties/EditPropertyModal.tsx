'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Property } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onUpdated: () => void
  property: Property
}

const PROPERTY_KINDS = ['Apartment Block', 'Full Unit', 'Room Rental', 'Mixed Use']

export function EditPropertyModal({ open, onClose, onUpdated, property }: Props) {
  const [form, setForm] = useState({
    name: '',
    address: '',
    block: '',
    level: '',
    unitNo: '',
    kind: '',
    contractExpiry: '',
    ownerName: '',
    ownerPhone: '',
    monthlyRent: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      const fullUnit = property.units?.find(u => u.unit_type === 'full')
      setForm({
        name: property.name,
        address: property.address,
        block: property.block ?? '',
        level: property.level ?? '',
        unitNo: property.unit_no ?? '',
        kind: property.kind,
        contractExpiry: property.contract_expiry?.slice(0, 10) ?? '',
        ownerName: property.owner?.name ?? '',
        ownerPhone: property.owner?.phone ?? '',
        monthlyRent: fullUnit ? String(fullUnit.price) : '',
      })
    }
  }, [open, property])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.address || !form.kind) {
      toast.error('Please fill in all required fields.')
      return
    }
    setLoading(true)
    const supabase = createClient()

    // Update or create owner
    let owner_id = property.owner_id ?? null
    if (form.ownerName.trim()) {
      if (owner_id) {
        await supabase.from('owners').update({
          name: form.ownerName.trim(),
          phone: form.ownerPhone.trim() || null,
        }).eq('id', owner_id)
      } else {
        const { data: newOwner } = await supabase
          .from('owners')
          .insert({ name: form.ownerName.trim(), phone: form.ownerPhone.trim() || null })
          .select('id')
          .single()
        owner_id = newOwner?.id ?? null
      }
    }

    const { error } = await supabase.from('properties').update({
      name: form.name.trim(),
      address: form.address.trim(),
      block: form.block.trim() || null,
      level: form.level.trim() || null,
      unit_no: form.unitNo.trim() || null,
      kind: form.kind,
      contract_expiry: form.contractExpiry || null,
      owner_id,
    }).eq('id', property.id)

    if (error) {
      toast.error('Failed to update: ' + error.message)
      setLoading(false)
      return
    }

    // Update full unit price if applicable
    if (form.kind === 'Full Unit' && form.monthlyRent) {
      const existingFull = property.units?.find(u => u.unit_type === 'full')
      if (existingFull) {
        const { error: unitErr } = await supabase.from('units')
          .update({ price: parseFloat(form.monthlyRent) })
          .eq('id', existingFull.id)
        if (unitErr) {
          toast.error('Property saved but rent update failed: ' + unitErr.message)
          setLoading(false)
          onClose()
          onUpdated()
          return
        }
      } else {
        const { error: unitErr } = await supabase.from('units').insert({
          property_id: property.id,
          name: 'Full Unit',
          unit_type: 'full',
          price: parseFloat(form.monthlyRent),
          is_occupied: false,
        })
        if (unitErr) {
          toast.error('Property saved but unit creation failed: ' + unitErr.message)
          setLoading(false)
          onClose()
          onUpdated()
          return
        }
      }
    }

    toast.success('Property updated!')
    setLoading(false)
    onClose()
    onUpdated()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Edit Property</DialogTitle>
          <p className="text-sm text-muted-foreground">Update the details for this property.</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-1">
          <div>
            <Label className="mb-1.5 block">Property Name <span className="text-red-500">*</span></Label>
            <Input placeholder="e.g. Residensi Harmoni" value={form.name} onChange={set('name')} />
          </div>
          <div>
            <Label className="mb-1.5 block">Address <span className="text-red-500">*</span></Label>
            <Input placeholder="Street, city" value={form.address} onChange={set('address')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="mb-1.5 block">Block</Label>
              <Input placeholder="e.g. A" value={form.block} onChange={set('block')} />
            </div>
            <div>
              <Label className="mb-1.5 block">Level</Label>
              <Input placeholder="e.g. 5" value={form.level} onChange={set('level')} />
            </div>
            <div>
              <Label className="mb-1.5 block">Unit No.</Label>
              <Input placeholder="e.g. 12-3" value={form.unitNo} onChange={set('unitNo')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Property Type <span className="text-red-500">*</span></Label>
              <Select value={form.kind} onValueChange={(v: string | null) => setForm(f => ({ ...f, kind: v ?? '' }))}>
                <SelectTrigger>
                  {form.kind
                    ? <span>{form.kind}</span>
                    : <span className="text-muted-foreground">Select type…</span>
                  }
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_KINDS.map(k => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">Contract Expiry</Label>
              <Input type="date" value={form.contractExpiry} onChange={set('contractExpiry')} />
            </div>
          </div>

          {form.kind === 'Full Unit' && (
            <div>
              <Label className="mb-1.5 block">Monthly Rent (RM)</Label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 1500"
                value={form.monthlyRent}
                onChange={set('monthlyRent')}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Owner Name</Label>
              <Input placeholder="e.g. Ahmad Bin Ali" value={form.ownerName} onChange={set('ownerName')} />
            </div>
            <div>
              <Label className="mb-1.5 block">Owner Phone</Label>
              <Input placeholder="012-345 6789" value={form.ownerPhone} onChange={set('ownerPhone')} />
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-[1.4]" disabled={loading}>
              {loading ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

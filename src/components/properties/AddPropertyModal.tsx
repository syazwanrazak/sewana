'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { pickColor } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

const PROPERTY_KINDS = ['Apartment Block', 'Full Unit', 'Room Rental', 'Mixed Use']

export function AddPropertyModal({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState({ name: '', address: '', block: '', level: '', unitNo: '', kind: '', ownerName: '', ownerPhone: '', monthlyRent: '' })
  const [loading, setLoading] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const isFullUnit = form.kind === 'Full Unit'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.address || !form.kind) {
      toast.error('Please fill in all required fields.')
      return
    }
    if (isFullUnit && !form.monthlyRent) {
      toast.error('Please enter the monthly rent for this unit.')
      return
    }
    setLoading(true)
    const supabase = createClient()

    // Try to create owner record
    let owner_id: string | null = null
    if (form.ownerName.trim()) {
      const { data: owner } = await supabase
        .from('owners')
        .insert({ name: form.ownerName.trim(), phone: form.ownerPhone.trim() || null })
        .select('id')
        .single()
      owner_id = owner?.id ?? null
    }

    // Create the property
    const { data: property, error } = await supabase.from('properties').insert({
      name: form.name.trim(),
      address: form.address.trim(),
      block: form.block.trim() || null,
      level: form.level.trim() || null,
      unit_no: form.unitNo.trim() || null,
      kind: form.kind,
      color: pickColor(form.name),
      owner_id,
    }).select('id').single()

    if (error || !property) {
      toast.error('Failed to add property: ' + error?.message)
      setLoading(false)
      return
    }

    // For Full Unit properties, auto-create the single rentable unit
    if (isFullUnit && form.monthlyRent) {
      await supabase.from('units').insert({
        property_id: property.id,
        name: 'Full Unit',
        unit_type: 'full',
        price: parseFloat(form.monthlyRent),
        is_occupied: false,
      })
    }

    toast.success(`"${form.name}" added!`)
    setForm({ name: '', address: '', block: '', level: '', unitNo: '', kind: '', ownerName: '', ownerPhone: '', monthlyRent: '' })
    setLoading(false)
    onClose()
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Add Property</DialogTitle>
          <p className="text-sm text-muted-foreground">Full Unit creates one rentable unit automatically. Room Rental lets you add rooms individually.</p>
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
              <Select onValueChange={(v: string | null) => setForm(f => ({ ...f, kind: v ?? '', monthlyRent: '' }))}>
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
            {isFullUnit && (
              <div>
                <Label className="mb-1.5 block">Monthly Rent (RM) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 1500"
                  value={form.monthlyRent}
                  onChange={set('monthlyRent')}
                />
              </div>
            )}
          </div>
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
              {loading ? 'Saving…' : 'Add Property'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

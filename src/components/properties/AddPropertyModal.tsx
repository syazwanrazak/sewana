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
  const [form, setForm] = useState({ name: '', address: '', kind: '', ownerName: '', ownerPhone: '' })
  const [loading, setLoading] = useState(false)

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

    // Try to create owner record — non-blocking if the table doesn't exist yet
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
    const { error } = await supabase.from('properties').insert({
      name: form.name.trim(),
      address: form.address.trim(),
      kind: form.kind,
      color: pickColor(form.name),
      owner_id,
    })

    if (error) {
      toast.error('Failed to add property: ' + error.message)
      setLoading(false)
      return
    }

    toast.success(`"${form.name}" added!`)
    setForm({ name: '', address: '', kind: '', ownerName: '', ownerPhone: '' })
    setLoading(false)
    onClose()
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Add Property</DialogTitle>
          <p className="text-sm text-muted-foreground">Create a property, then add rooms &amp; parking.</p>
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
          <div>
            <Label className="mb-1.5 block">Property Type <span className="text-red-500">*</span></Label>
            <Select onValueChange={(v: string | null) => setForm(f => ({ ...f, kind: v ?? '' }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_KINDS.map(k => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

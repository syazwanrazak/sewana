'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Props {
  propertyId: string
  unitType: 'room' | 'parking' | 'full'
}

const META = {
  room:    { label: 'Room',         placeholder: 'e.g. Bilik A' },
  parking: { label: 'Parking Spot', placeholder: 'e.g. P1' },
  full:    { label: 'Full Unit',    placeholder: 'e.g. Unit Penuh' },
}

export function AddUnitButton({ propertyId, unitType }: Props) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', price: '' })
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const { label, placeholder } = META[unitType]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.price) {
      toast.error('Please fill in all fields.')
      return
    }
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.from('units').insert({
      property_id: propertyId,
      name: form.name.trim(),
      unit_type: unitType,
      price: parseFloat(form.price),
      is_occupied: false,
    })

    if (error) {
      toast.error(`Failed to add ${label.toLowerCase()}: ` + error.message)
      setLoading(false)
      return
    }

    toast.success(`${label} "${form.name}" added!`)
    setForm({ name: '', price: '' })
    setLoading(false)
    setOpen(false)
    router.refresh() // re-runs the server component to fetch fresh units
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-1.5" /> Add {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Add {label}</DialogTitle>
            <p className="text-sm text-muted-foreground">This unit will appear under this property.</p>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-1">
            <div>
              <Label className="mb-1.5 block">Name <span className="text-red-500">*</span></Label>
              <Input
                placeholder={placeholder}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Monthly Price (RM) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 650"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 mt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-[1.4]" disabled={loading}>
                {loading ? 'Saving…' : `Add ${label}`}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

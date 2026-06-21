'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Property, MaintenancePriority } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
  properties: Property[]
}

export function NewTicketModal({ open, onClose, onCreated, properties }: Props) {
  const [form, setForm] = useState({ title: '', propertyId: '', unitId: '', priority: 'med', description: '' })
  const [loading, setLoading] = useState(false)

  const selectedProperty = properties.find(p => p.id === form.propertyId)
  const units = selectedProperty?.units || []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.propertyId) {
      toast.error('Please fill in the title and select a property.')
      return
    }
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.from('maintenance_tickets').insert({
      title: form.title.trim(),
      property_id: form.propertyId,
      unit_id: form.unitId || null,
      priority: form.priority as MaintenancePriority,
      description: form.description.trim() || null,
      status: 'open',
    })

    if (error) {
      toast.error('Failed to create ticket: ' + error.message)
      setLoading(false)
      return
    }

    toast.success('Maintenance ticket created!')
    setForm({ title: '', propertyId: '', unitId: '', priority: 'med', description: '' })
    setLoading(false)
    onClose()
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[480px]">
        <DialogHeader>
          <DialogTitle>New Maintenance Request</DialogTitle>
          <p className="text-sm text-muted-foreground">Link the issue to a property, room or parking spot.</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-1">
          <div>
            <Label className="mb-1.5 block">Title <span className="text-red-500">*</span></Label>
            <Input
              placeholder="e.g. Leaking kitchen faucet"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Property <span className="text-red-500">*</span></Label>
              <Select onValueChange={(v: string | null) => setForm(f => ({ ...f, propertyId: v ?? '', unitId: '' }))}>
                <SelectTrigger>
                  {form.propertyId
                    ? <span>{properties.find(p => p.id === form.propertyId)?.name}</span>
                    : <span className="text-muted-foreground">Select…</span>
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
              <Label className="mb-1.5 block">Priority</Label>
              <Select defaultValue="med" onValueChange={(v: string | null) => setForm(f => ({ ...f, priority: v ?? 'med' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">🔴 High</SelectItem>
                  <SelectItem value="med">🟡 Medium</SelectItem>
                  <SelectItem value="low">⚪ Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {units.length > 0 && (
            <div>
              <Label className="mb-1.5 block">
                Unit / Room <span className="text-muted-foreground text-xs font-normal">(optional)</span>
              </Label>
              <Select onValueChange={(v: string | null) => setForm(f => ({ ...f, unitId: v ?? '' }))}>
                <SelectTrigger>
                  {form.unitId
                    ? <span>{units.find((u: any) => u.id === form.unitId)?.name}</span>
                    : <span className="text-muted-foreground">Common area / whole property</span>
                  }
                </SelectTrigger>
                <SelectContent>
                  {units.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="mb-1.5 block">Description</Label>
            <Textarea
              placeholder="Describe the issue in detail…"
              className="h-24 resize-none"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 mt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-[1.4]" disabled={loading}>
              {loading ? 'Saving…' : 'Create Ticket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

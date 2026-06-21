'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface TenantBasic {
  id: string
  name: string
  email?: string
  phone?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onUpdated: () => void
  tenant: TenantBasic
}

export function EditTenantModal({ open, onClose, onUpdated, tenant }: Props) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({
        name: tenant.name,
        email: tenant.email ?? '',
        phone: tenant.phone ?? '',
      })
    }
  }, [open, tenant])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Name is required.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('tenants').update({
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
    }).eq('id', tenant.id)

    if (error) {
      toast.error('Failed to update: ' + error.message)
      setLoading(false)
      return
    }

    toast.success('Tenant updated!')
    setLoading(false)
    onClose()
    onUpdated()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit Tenant</DialogTitle>
          <p className="text-sm text-muted-foreground">Update contact details for this tenant.</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-1">
          <div>
            <Label className="mb-1.5 block">Full Name <span className="text-red-500">*</span></Label>
            <Input placeholder="e.g. Ahmad Bin Ali" value={form.name} onChange={set('name')} />
          </div>
          <div>
            <Label className="mb-1.5 block">Email</Label>
            <Input type="email" placeholder="tenant@email.com" value={form.email} onChange={set('email')} />
          </div>
          <div>
            <Label className="mb-1.5 block">Phone</Label>
            <Input placeholder="012-345 6789" value={form.phone} onChange={set('phone')} />
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

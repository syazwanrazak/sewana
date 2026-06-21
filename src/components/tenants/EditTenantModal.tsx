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
  contractId?: string
  contractStart?: string
  contractEnd?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onUpdated: () => void
  tenant: TenantBasic
}

export function EditTenantModal({ open, onClose, onUpdated, tenant }: Props) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    contractStart: '', contractEnd: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({
        name: tenant.name,
        email: tenant.email ?? '',
        phone: tenant.phone ?? '',
        contractStart: tenant.contractStart?.slice(0, 10) ?? '',
        contractEnd: tenant.contractEnd?.slice(0, 10) ?? '',
      })
    }
  }, [open, tenant])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Name is required.'); return }
    setLoading(true)
    const supabase = createClient()

    const [tenantRes, contractRes] = await Promise.all([
      supabase.from('tenants').update({
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
      }).eq('id', tenant.id),

      tenant.contractId && form.contractStart && form.contractEnd
        ? supabase.from('contracts').update({
            start_date: form.contractStart,
            end_date: form.contractEnd,
          }).eq('id', tenant.contractId)
        : Promise.resolve({ error: null }),
    ])

    const err = tenantRes.error ?? (contractRes as any).error
    if (err) { toast.error('Failed to update: ' + err.message); setLoading(false); return }

    toast.success('Tenant updated!')
    setLoading(false)
    onClose()
    onUpdated()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Edit Tenant</DialogTitle>
          <p className="text-sm text-muted-foreground">Update contact and contract details.</p>
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

          {tenant.contractId && (
            <>
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Contract Dates</p>
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
              </div>
            </>
          )}

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

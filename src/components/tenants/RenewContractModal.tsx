'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Props {
  open: boolean
  onClose: () => void
  onRenewed: () => void
  tenant: { name: string; contractId?: string; contractEnd?: string }
}

export function RenewContractModal({ open, onClose, onRenewed, tenant }: Props) {
  const defaultEnd = () => {
    const base = tenant.contractEnd && new Date(tenant.contractEnd) > new Date()
      ? new Date(tenant.contractEnd)
      : new Date()
    base.setFullYear(base.getFullYear() + 1)
    return base.toISOString().slice(0, 10)
  }

  const [endDate, setEndDate] = useState(defaultEnd)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!endDate) { toast.error('Please select a new end date.'); return }
    if (!tenant.contractId) { toast.error('No active contract found.'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('contracts').update({
      end_date: endDate,
      status: 'active',
    }).eq('id', tenant.contractId)

    if (error) { toast.error('Failed to renew: ' + error.message); setLoading(false); return }
    toast.success(`Contract renewed until ${new Date(endDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}`)
    setLoading(false)
    onClose()
    onRenewed()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Renew Contract</DialogTitle>
          <p className="text-sm text-muted-foreground">Set a new end date for <b>{tenant.name}</b>'s tenancy.</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-1">
          <div>
            <Label className="mb-1.5 block">New Contract End Date <span className="text-red-500">*</span></Label>
            <Input
              type="date"
              value={endDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex gap-3 mt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-[1.4]" disabled={loading}>
              {loading ? 'Renewing…' : 'Renew Contract'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

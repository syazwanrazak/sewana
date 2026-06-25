'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, FileText, X, Copy, Check } from 'lucide-react'
import { cn, rm, pickColor } from '@/lib/utils'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { RentalType, Property } from '@/types'

const DOC_CATEGORIES = ['IC / Identification', 'Tenancy Agreement', 'Receipts', 'Others'] as const

interface QueuedDoc {
  file: File
  category: string
}

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

const today = () => new Date().toISOString().slice(0, 10)
const nextYear = () => {
  const d = new Date(); d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

export function AddTenantModal({ open, onClose, onCreated, properties }: Props) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    propertyId: '', rentalType: 'room' as RentalType, unitId: '', parkingUnitId: '',
    startDate: today(), endDate: nextYear(),
  })
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [docQueue, setDocQueue] = useState<QueuedDoc[]>([])
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingCategory, setPendingCategory] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function queueDoc() {
    if (!pendingFile) return
    if (!pendingCategory) { toast.error('Select a category for the document.'); return }
    setDocQueue(q => [...q, { file: pendingFile, category: pendingCategory }])
    setPendingFile(null)
    setPendingCategory('')
    if (fileRef.current) fileRef.current.value = ''
  }

  function removeQueued(i: number) {
    setDocQueue(q => q.filter((_, idx) => idx !== i))
  }

  const selectedProperty = properties.find(p => p.id === form.propertyId)

  // Show only vacant units matching the selected rental type
  const subOptions = selectedProperty?.units?.filter(u => {
    if (form.rentalType === 'full')    return u.unit_type === 'full'    && !u.is_occupied
    if (form.rentalType === 'room')    return u.unit_type === 'room'    && !u.is_occupied
    if (form.rentalType === 'parking') return u.unit_type === 'parking' && !u.is_occupied
    return false
  }) || []

  // Vacant parking spots for optional bundling
  const parkingOptions = (selectedProperty?.units ?? []).filter(u =>
    u.unit_type === 'parking' && !u.is_occupied
  )

  // Auto-select the unit when there's exactly one option (e.g. Full Unit properties)
  useEffect(() => {
    if (subOptions.length === 1 && !form.unitId) {
      setForm(f => ({ ...f, unitId: subOptions[0].id }))
    }
    if (subOptions.length === 0 || (subOptions.length > 1 && !subOptions.find(u => u.id === form.unitId))) {
      // Reset unit if it's no longer valid
    }
  }, [form.propertyId, form.rentalType, subOptions.length])

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

    const { error: contractErr } = await supabase.from('contracts').insert({
      tenant_id: tenant.id,
      property_id: form.propertyId,
      unit_id: form.unitId || null,
      rental_type: form.rentalType,
      monthly_rent: selectedUnit?.price ?? 0,
      deposit: 0,
      start_date: form.startDate,
      end_date: form.endDate,
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

    // 4. Assign parking if selected
    if (form.parkingUnitId && form.rentalType !== 'parking') {
      const parkingUnit = parkingOptions.find(u => u.id === form.parkingUnitId)
      await supabase.from('contracts').insert({
        tenant_id: tenant.id,
        property_id: form.propertyId,
        unit_id: form.parkingUnitId,
        rental_type: 'parking',
        monthly_rent: parkingUnit?.price ?? 0,
        deposit: 0,
        start_date: form.startDate,
        end_date: form.endDate,
        status: 'active',
      })
      await supabase.from('units').update({ is_occupied: true }).eq('id', form.parkingUnitId)
    }

    // 5. Upload any queued documents
    for (const { file, category } of docQueue) {
      const path = `tenants/${tenant.id}/${Date.now()}_${file.name}`
      const { error: storageErr } = await supabase.storage.from('documents').upload(path, file)
      if (!storageErr) {
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
        const fileType = file.type.includes('pdf') ? 'PDF' : file.type.includes('image') ? 'IMG' : 'DOC'
        const kb = file.size / 1024
        await supabase.from('documents').insert({
          tenant_id: tenant.id,
          name: file.name,
          category,
          file_url: publicUrl,
          file_size: kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`,
          file_type: fileType,
        })
      }
    }

    toast.success(`Tenant "${form.name}" added!`)

    // Generate portal invite link if email provided
    if (form.email.trim()) {
      try {
        const res = await fetch('/api/invite-tenant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email.trim(), tenantId: tenant.id, name: form.name.trim() }),
        })
        const json = await res.json()
        if (json.inviteLink) {
          setInviteLink(json.inviteLink)
        } else if (json.error) {
          toast.error('Could not generate invite link: ' + json.error)
        }
      } catch {
        toast.error('Invite request failed — check server logs.')
      }
    }
    setForm({ name: '', email: '', phone: '', propertyId: '', rentalType: 'room', unitId: '', parkingUnitId: '', startDate: today(), endDate: nextYear() })
    setDocQueue([])
    setPendingFile(null)
    setPendingCategory('')
    setLoading(false)
    onClose()
    onCreated()
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Show invite link dialog after tenant is created
  if (inviteLink) {
    return (
      <Dialog open onOpenChange={() => { setInviteLink(''); onClose() }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Tenant Added!</DialogTitle>
            <p className="text-sm text-muted-foreground">Share this portal invite link with your tenant via WhatsApp or any messaging app.</p>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-2">
            <div className="flex items-center gap-2 border rounded-lg px-3 py-2.5 bg-muted/40">
              <span className="flex-1 text-xs text-muted-foreground truncate">{inviteLink}</span>
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 flex-shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Link expires in 24 hours. You can regenerate it anytime from the tenant menu.</p>
            <Button onClick={() => { setInviteLink(''); onClose() }} className="w-full">Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Tenant</DialogTitle>
          <p className="text-sm text-muted-foreground">Assign to a full unit, a room, or a parking spot.</p>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 -mx-1 px-1">
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

          {form.rentalType === 'full' && form.unitId && subOptions.length === 1 && (
            <div className="rounded-xl bg-accent/60 border border-primary/20 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Rent: </span>
              <span className="font-bold text-primary">{rm(subOptions[0].price)}/mo</span>
              <span className="text-muted-foreground ml-2">· Full Unit auto-selected</span>
            </div>
          )}

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

          {/* Optional parking — only when renting a room or full unit */}
          {(form.rentalType === 'room' || form.rentalType === 'full') && form.propertyId && parkingOptions.length > 0 && (
            <div>
              <Label className="mb-1.5 block">
                Parking <span className="text-muted-foreground text-xs font-normal">(optional)</span>
              </Label>
              <Select onValueChange={(v: string | null) => setForm(f => ({ ...f, parkingUnitId: v ?? '' }))}>
                <SelectTrigger>
                  {form.parkingUnitId
                    ? <span>{parkingOptions.find(u => u.id === form.parkingUnitId)?.name}</span>
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
          )}

          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Contract Duration</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">End Date</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  min={form.startDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Document queue */}
          <div className="border-t pt-4 flex flex-col gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Documents <span className="font-normal normal-case">(optional)</span></p>

            {docQueue.length > 0 && (
              <div className="flex flex-col gap-1.5 mb-1">
                {docQueue.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 text-xs truncate">{d.file.name}</span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{d.category}</span>
                    <button type="button" onClick={() => removeQueued(i)} className="text-muted-foreground hover:text-red-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
              onChange={e => setPendingFile(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
            {pendingFile ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-muted/40">
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 text-sm truncate">{pendingFile.name}</span>
                  <button type="button" onClick={() => { setPendingFile(null); if (fileRef.current) fileRef.current.value = '' }} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <Select onValueChange={(v: string | null) => setPendingCategory(v ?? '')}>
                    <SelectTrigger className="flex-1">
                      {pendingCategory ? <span>{pendingCategory}</span> : <span className="text-muted-foreground">Category…</span>}
                    </SelectTrigger>
                    <SelectContent>
                      {DOC_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="sm" onClick={queueDoc} className="flex-shrink-0">Add</Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center gap-2 border border-dashed rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
              >
                <Upload className="w-4 h-4 flex-shrink-0" />
                Attach a document…
              </button>
            )}
          </div>

          <div className="flex gap-3 mt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-[1.4]" disabled={loading}>
              {loading ? 'Saving…' : 'Add Tenant'}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Wrench } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { PortalShell } from '@/components/portal/PortalShell'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface Ticket {
  id: string
  title: string
  description: string | null
  category: string
  status: string
  priority: string
  created_at: string
  updated_at: string
}

const CATEGORIES = ['Plumbing', 'Electrical', 'Air Conditioning', 'Appliances', 'Structural', 'Pest Control', 'General']
const PRIORITIES = [
  { value: 'low',    label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high',   label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const STATUS_COLORS: Record<string, string> = {
  open:       'bg-blue-100 text-blue-700',
  in_progress:'bg-violet-100 text-violet-700',
  resolved:   'bg-green-100 text-green-700',
}
const STATUS_LABELS: Record<string, string> = {
  open: 'Open', in_progress: 'In Progress', resolved: 'Resolved',
}

export default function PortalMaintenancePage() {
  const [tickets, setTickets]   = useState<Ticket[]>([])
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [propId, setPropId]     = useState<string | null>(null)
  const [name, setName]         = useState('')
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState({
    title: '', description: '', category: 'General', priority: 'normal',
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const tid = user.app_metadata?.tenant_id ?? user.user_metadata?.tenant_id
    setName(user.user_metadata?.name ?? user.email ?? '')
    setTenantId(tid)

    if (!tid) { setLoading(false); return }

    const [ticketsRes, contractRes] = await Promise.all([
      supabase
        .from('maintenance_tickets')
        .select('id, title, description, category, status, priority, created_at, updated_at')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false }),
      supabase
        .from('contracts')
        .select('property_id')
        .eq('tenant_id', tid)
        .eq('status', 'active')
        .neq('rental_type', 'parking')
        .single(),
    ])

    setTickets(ticketsRes.data ?? [])
    setPropId(contractRes.data?.property_id ?? null)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Title is required.'); return }
    if (!tenantId) return

    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase.from('maintenance_tickets').insert({
      tenant_id: tenantId,
      property_id: propId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      priority: form.priority,
    })

    if (error) { toast.error('Failed to submit: ' + error.message); setSaving(false); return }

    toast.success('Request submitted! Your landlord has been notified.')
    setShowForm(false)
    setForm({ title: '', description: '', category: 'General', priority: 'normal' })
    setSaving(false)
    load()
  }

  if (loading) {
    return <PortalShell name=""><div className="py-20 text-center text-muted-foreground text-sm">Loading…</div></PortalShell>
  }

  return (
    <PortalShell name={name}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Maintenance</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Submit and track your repair requests.</p>
          </div>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> New Request
            </Button>
          )}
        </div>

        {/* Submit form */}
        {showForm && (
          <Card className="p-4">
            <h2 className="font-bold text-sm mb-4">New Maintenance Request</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <Label className="mb-1.5 block text-xs">Issue Title <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. Leaking pipe in bathroom" value={form.title} onChange={set('title')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block text-xs">Category</Label>
                  <Select value={form.category} onValueChange={(v: string | null) => setForm(f => ({ ...f, category: v ?? 'General' }))}>
                    <SelectTrigger>{form.category}</SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Priority</Label>
                  <Select value={form.priority} onValueChange={(v: string | null) => setForm(f => ({ ...f, priority: v ?? 'normal' }))}>
                    <SelectTrigger>{PRIORITIES.find(p => p.value === form.priority)?.label ?? 'Normal'}</SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block text-xs">Description</Label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={set('description')}
                  placeholder="Describe the issue in detail…"
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                />
              </div>

              <div className="flex gap-2 mt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-[1.5]" disabled={saving}>
                  {saving ? 'Submitting…' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Ticket list */}
        {tickets.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No maintenance requests yet.
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {tickets.map(tk => (
              <Card key={tk.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Wrench className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{tk.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {tk.category} · {PRIORITIES.find(p => p.value === tk.priority)?.label ?? tk.priority}
                      </div>
                      {tk.description && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{tk.description}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">Submitted {formatDate(tk.created_at)}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${STATUS_COLORS[tk.status] ?? 'bg-muted text-muted-foreground'}`}>
                    {STATUS_LABELS[tk.status] ?? tk.status}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  )
}

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Upload, FileText, X, ExternalLink, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PortalShell } from '@/components/portal/PortalShell'
import { createClient } from '@/lib/supabase/client'
import { rm } from '@/lib/utils'
import { toast } from 'sonner'

interface Receipt {
  id: string
  amount: number
  pay_month: string
  receipt_url: string
  file_name: string | null
  status: string
  rejection_reason: string | null
  created_at: string
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending:  <Clock className="w-4 h-4 text-amber-500" />,
  approved: <CheckCircle className="w-4 h-4 text-green-600" />,
  rejected: <XCircle className="w-4 h-4 text-red-500" />,
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending Review',
  approved: 'Confirmed',
  rejected: 'Rejected',
}

function monthFirst(date: Date) {
  return date.toISOString().slice(0, 7) + '-01'
}

export default function PortalPaymentsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [monthlyRent, setMonthlyRent] = useState(0)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [month, setMonth] = useState(monthFirst(new Date()))
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const tid = user.app_metadata?.tenant_id ?? user.user_metadata?.tenant_id
    const uname = user.user_metadata?.name ?? user.email ?? ''
    setName(uname)
    setTenantId(tid)

    if (!tid) { setLoading(false); return }

    const [receiptsRes, contractRes] = await Promise.all([
      supabase
        .from('payment_receipts')
        .select('id, amount, pay_month, receipt_url, file_name, status, rejection_reason, created_at')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false }),
      supabase
        .from('contracts')
        .select('monthly_rent, rental_type')
        .eq('tenant_id', tid)
        .eq('status', 'active'),
    ])

    setReceipts(receiptsRes.data ?? [])
    const totalRent = (contractRes.data ?? []).reduce((s: number, c: any) => s + (c.monthly_rent ?? 0), 0)
    setMonthlyRent(totalRent)
    setAmount(String(totalRent || ''))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { toast.error('Please attach your payment screenshot.'); return }
    if (!amount || Number(amount) <= 0) { toast.error('Enter the amount you paid.'); return }
    if (!tenantId) return

    setUploading(true)
    const supabase = createClient()

    const path = `receipts/${tenantId}/${Date.now()}_${file.name}`
    const { error: storageErr } = await supabase.storage.from('documents').upload(path, file)
    if (storageErr) { toast.error('Upload failed: ' + storageErr.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)

    const { error: dbErr } = await supabase.from('payment_receipts').insert({
      tenant_id: tenantId,
      amount: Number(amount),
      pay_month: month,
      receipt_url: publicUrl,
      file_name: file.name,
    })

    if (dbErr) { toast.error('Failed to save: ' + dbErr.message); setUploading(false); return }

    toast.success('Payment proof submitted! Your landlord will verify it shortly.')
    setShowForm(false)
    setFile(null)
    setAmount(String(monthlyRent || ''))
    if (fileRef.current) fileRef.current.value = ''
    setUploading(false)
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
            <h1 className="text-xl font-extrabold tracking-tight">Payments</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Submit your payment proof here.</p>
          </div>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Submit Payment
            </Button>
          )}
        </div>

        {/* Submit form */}
        {showForm && (
          <Card className="p-4">
            <h2 className="font-bold text-sm mb-4">New Payment Proof</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block text-xs">Amount Paid (RM)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder={String(monthlyRent || '650')}
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">For Month</Label>
                  <Input
                    type="month"
                    value={month.slice(0, 7)}
                    onChange={e => setMonth(e.target.value + '-01')}
                  />
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block text-xs">Payment Screenshot</Label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
                {file ? (
                  <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-muted/40">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 text-sm truncate">{file.name}</span>
                    <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full flex items-center gap-2 border border-dashed rounded-lg px-3 py-3 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
                  >
                    <Upload className="w-4 h-4 flex-shrink-0" />
                    Tap to attach screenshot or PDF…
                  </button>
                )}
              </div>

              <div className="flex gap-2 mt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowForm(false); setFile(null) }}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-[1.5]" disabled={uploading}>
                  {uploading ? 'Submitting…' : 'Submit Proof'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* History */}
        {receipts.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No payment proofs submitted yet.
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {receipts.map(r => (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {STATUS_ICON[r.status] ?? STATUS_ICON.pending}
                    <div>
                      <div className="font-bold text-sm">
                        {new Date(r.pay_month).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })}
                      </div>
                      <div className="text-sm text-primary font-semibold">{rm(r.amount)}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {STATUS_LABEL[r.status] ?? r.status}
                        {r.file_name ? ` · ${r.file_name}` : ''}
                      </div>
                    </div>
                  </div>
                  <a href={r.receipt_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground mt-0.5">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                {r.status === 'rejected' && r.rejection_reason && (
                  <div className="mt-2 px-3 py-2 bg-red-50 rounded-lg text-xs text-red-700">
                    <strong>Reason:</strong> {r.rejection_reason}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  )
}

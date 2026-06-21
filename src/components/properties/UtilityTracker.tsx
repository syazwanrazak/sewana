'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { rm } from '@/lib/utils'

interface UtilityItem {
  name: string
  amount: string
}

interface Props {
  propertyId: string
  month: string
  monthLabel: string
  initial: { name: string; amount: number }[]
}

const DEFAULT_ITEMS: UtilityItem[] = [
  { name: 'Water', amount: '' },
  { name: 'Electricity', amount: '' },
  { name: 'Internet', amount: '' },
]

export function UtilityTracker({ propertyId, month, monthLabel, initial }: Props) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<UtilityItem[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const total = initial.reduce((s, i) => s + i.amount, 0)

  function openModal() {
    setItems(
      initial.length > 0
        ? initial.map(i => ({ name: i.name, amount: String(i.amount) }))
        : [...DEFAULT_ITEMS]
    )
    setOpen(true)
  }

  function addRow() {
    setItems(prev => [...prev, { name: '', amount: '' }])
  }

  function removeRow(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function updateRow(idx: number, field: keyof UtilityItem, value: string) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const validItems = items.filter(i => i.name.trim() && parseFloat(i.amount) > 0)
    if (validItems.length === 0) {
      toast.error('Add at least one item with a name and amount.')
      return
    }
    setLoading(true)
    const supabase = createClient()

    // Delete existing rows for this property+month, then insert fresh
    const { error: delErr } = await supabase
      .from('utilities')
      .delete()
      .eq('property_id', propertyId)
      .eq('month', month)

    if (delErr) {
      toast.error('Failed to save: ' + delErr.message)
      setLoading(false)
      return
    }

    const { error: insErr } = await supabase.from('utilities').insert(
      validItems.map(i => ({
        property_id: propertyId,
        month,
        name: i.name.trim(),
        amount: parseFloat(i.amount),
      }))
    )

    if (insErr) {
      toast.error('Failed to save: ' + insErr.message)
      setLoading(false)
      return
    }

    toast.success('Utilities saved!')
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="border rounded-xl p-4">
      <div className="flex justify-between items-center mb-3">
        <div className="font-bold text-sm">Utility Tracking · {monthLabel}</div>
        <button
          onClick={openModal}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Edit utilities"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      {initial.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No entries yet.{' '}
          <button onClick={openModal} className="text-primary hover:underline font-medium">Add bills</button>
        </p>
      ) : (
        <>
          {initial.map((item, i) => (
            <div key={i} className="flex justify-between py-2 border-b last:border-0 text-sm">
              <span className="text-muted-foreground">{item.name}</span>
              <span className="font-semibold">{rm(item.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-2 mt-1 text-sm font-bold border-t">
            <span>Total</span>
            <span className="text-primary">{rm(total)}</span>
          </div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[420px]">
          <DialogHeader>
            <DialogTitle>Utility Tracking · {monthLabel}</DialogTitle>
            <p className="text-sm text-muted-foreground">Add any bills — water, electricity, guard fee, maintenance, etc.</p>
          </DialogHeader>

          <form onSubmit={handleSave} className="flex flex-col gap-3 mt-1">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_130px_32px] gap-2 text-xs font-semibold text-muted-foreground px-1">
              <span>Description</span>
              <span>Amount (RM)</span>
              <span />
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_130px_32px] gap-2 items-center">
                <Input
                  placeholder="e.g. Guard Fee"
                  value={item.name}
                  onChange={e => updateRow(idx, 'name', e.target.value)}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={item.amount}
                  onChange={e => updateRow(idx, 'amount', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="text-muted-foreground hover:text-red-500 transition-colors flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline w-fit"
            >
              <Plus className="w-4 h-4" /> Add item
            </button>

            {/* Live total */}
            {items.some(i => parseFloat(i.amount) > 0) && (
              <div className="flex justify-between text-sm font-bold border-t pt-3 mt-1">
                <span>Total</span>
                <span className="text-primary">
                  {rm(items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0))}
                </span>
              </div>
            )}

            <div className="flex gap-3 mt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-[1.4]" disabled={loading}>
                {loading ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

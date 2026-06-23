'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Props {
  unit: { id: string; name: string; price: number; unit_type: string }
}

const TYPE_LABEL: Record<string, string> = {
  room: 'Room',
  parking: 'Parking Spot',
  full: 'Unit',
}

export function UnitActions({ unit }: Props) {
  const [showEdit, setShowEdit] = useState(false)
  const [form, setForm] = useState({ name: '', price: '' })
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function openEdit() {
    setForm({ name: unit.name, price: String(unit.price) })
    setShowEdit(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Name is required.'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('units').update({
      name: form.name.trim(),
      price: parseFloat(form.price) || 0,
    }).eq('id', unit.id)
    if (error) { toast.error('Update failed: ' + error.message); setLoading(false); return }
    toast.success(`${TYPE_LABEL[unit.unit_type] ?? 'Unit'} updated!`)
    setLoading(false)
    setShowEdit(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm(`Delete "${unit.name}"? This cannot be undone.`)) return
    const supabase = createClient()
    const { error } = await supabase.from('units').delete().eq('id', unit.id)
    if (error) { toast.error('Delete failed: ' + error.message); return }
    toast.success(`"${unit.name}" deleted.`)
    router.refresh()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex-shrink-0">
          <MoreHorizontal className="w-4 h-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end">
          <DropdownMenuItem onClick={openEdit}>
            <Pencil className="w-3.5 h-3.5" /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Edit {TYPE_LABEL[unit.unit_type] ?? 'Unit'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex flex-col gap-4 mt-1">
            <div>
              <Label className="mb-1.5 block">Name <span className="text-red-500">*</span></Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Monthly Price (RM)</Label>
              <Input
                type="number"
                min="0"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 mt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowEdit(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-[1.4]" disabled={loading}>
                {loading ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

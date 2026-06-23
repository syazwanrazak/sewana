'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, ExternalLink, Pencil, Trash2 } from 'lucide-react'
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
  doc: { id: string; name: string; file_url: string }
}

export function DocumentActions({ doc }: Props) {
  const [showRename, setShowRename] = useState(false)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) { toast.error('Name cannot be empty.'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('documents').update({ name: newName.trim() }).eq('id', doc.id)
    if (error) { toast.error('Rename failed: ' + error.message); setLoading(false); return }
    toast.success('Document renamed!')
    setLoading(false)
    setShowRename(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm(`Delete "${doc.name}"?\n\nThis only removes the record — the file in storage is not deleted.`)) return
    const supabase = createClient()
    const { error } = await supabase.from('documents').delete().eq('id', doc.id)
    if (error) { toast.error('Delete failed: ' + error.message); return }
    toast.success('Document removed.')
    router.refresh()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex-shrink-0">
          <MoreHorizontal className="w-4 h-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end">
          <DropdownMenuItem onClick={() => window.open(doc.file_url, '_blank')}>
            <ExternalLink className="w-3.5 h-3.5" /> Open
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setNewName(doc.name); setShowRename(true) }}>
            <Pencil className="w-3.5 h-3.5" /> Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showRename} onOpenChange={setShowRename}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRename} className="flex flex-col gap-4 mt-1">
            <div>
              <Label className="mb-1.5 block">Name</Label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowRename(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-[1.4]" disabled={loading}>
                {loading ? 'Saving…' : 'Rename'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

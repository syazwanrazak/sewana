'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { EditPropertyModal } from './EditPropertyModal'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Property } from '@/types'

interface Props {
  property: Property
}

export function PropertyActions({ property }: Props) {
  const [showEdit, setShowEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm(`Delete "${property.name}"?\n\nThis will permanently remove the property and all its units and maintenance tickets.`)) return
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('properties').delete().eq('id', property.id)
    if (error) {
      toast.error('Failed to delete: ' + error.message)
      setDeleting(false)
      return
    }
    toast.success(`"${property.name}" deleted.`)
    router.push('/properties')
  }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowEdit(true)} className="min-h-[44px] sm:min-h-0">
          <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
        </Button>
        <Button
          variant="outline" size="sm"
          onClick={handleDelete}
          disabled={deleting}
          className="text-red-600 hover:bg-red-50 hover:border-red-200 min-h-[44px] sm:min-h-0"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>

      <EditPropertyModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        property={property}
        onUpdated={() => { setShowEdit(false); router.refresh() }}
      />
    </>
  )
}

// Compact "..." menu version for use in list cards
export function PropertyCardMenu({ property, onUpdated }: { property: Property; onUpdated: () => void }) {
  const [showEdit, setShowEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete "${property.name}"?\n\nThis will permanently remove the property and all its units.`)) return
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('properties').delete().eq('id', property.id)
    if (error) {
      toast.error('Failed to delete: ' + error.message)
      setDeleting(false)
      return
    }
    toast.success(`"${property.name}" deleted.`)
    onUpdated()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          onClick={e => e.preventDefault()}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end">
          <DropdownMenuItem onClick={e => { e.preventDefault(); setShowEdit(true) }}>
            <Pencil className="w-3.5 h-3.5" /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={deleting}
            onClick={e => { e.preventDefault(); handleDelete() }}
          >
            <Trash2 className="w-3.5 h-3.5" /> {deleting ? 'Deleting…' : 'Delete'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditPropertyModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        property={property}
        onUpdated={() => { setShowEdit(false); onUpdated() }}
      />
    </>
  )
}

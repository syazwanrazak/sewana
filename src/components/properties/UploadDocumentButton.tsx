'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = ['Owner Contracts', 'Tenant Agreements', 'Receipts', 'Reports'] as const

interface Props {
  propertyId: string
}

export function UploadDocumentButton({ propertyId }: Props) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setFile(null)
    setCategory('')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { toast.error('Please select a file.'); return }
    if (!category) { toast.error('Please select a category.'); return }

    setLoading(true)
    const supabase = createClient()

    const path = `${propertyId}/${Date.now()}_${file.name}`
    const { error: storageErr } = await supabase.storage
      .from('documents')
      .upload(path, file)

    if (storageErr) {
      toast.error('Upload failed: ' + storageErr.message)
      setLoading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)

    const fileType = file.type.includes('pdf') ? 'PDF'
      : file.type.includes('image') ? 'IMG'
      : 'DOC'

    const kb = file.size / 1024
    const fileSizeStr = kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`

    const { error: dbErr } = await supabase.from('documents').insert({
      property_id: propertyId,
      name: file.name,
      category,
      file_url: publicUrl,
      file_size: fileSizeStr,
      file_type: fileType,
    })

    if (dbErr) {
      toast.error('Failed to save document record: ' + dbErr.message)
      setLoading(false)
      return
    }

    toast.success(`"${file.name}" uploaded!`)
    reset()
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Upload className="w-4 h-4 mr-1.5" /> Upload Document
      </Button>

      <Dialog open={open} onOpenChange={v => { if (!v) reset(); setOpen(v) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <p className="text-sm text-muted-foreground">Attach a file to this property.</p>
          </DialogHeader>
          <form onSubmit={handleUpload} className="flex flex-col gap-4 mt-1">
            <div>
              <Label className="mb-1.5 block">File <span className="text-red-500">*</span></Label>
              <Input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="cursor-pointer"
              />
              {file && (
                <p className="text-xs text-muted-foreground mt-1">{file.name} — {(file.size / 1024).toFixed(0)} KB</p>
              )}
            </div>
            <div>
              <Label className="mb-1.5 block">Category <span className="text-red-500">*</span></Label>
              <Select onValueChange={(v: string | null) => setCategory(v ?? '')}>
                <SelectTrigger>
                  {category
                    ? <span>{category}</span>
                    : <span className="text-muted-foreground">Select category…</span>
                  }
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 mt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { reset(); setOpen(false) }}>
                Cancel
              </Button>
              <Button type="submit" className="flex-[1.4]" disabled={loading}>
                {loading ? 'Uploading…' : 'Upload'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

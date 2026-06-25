'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, FileText, X, Trash2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = ['IC / Identification', 'Tenancy Agreement', 'Receipts', 'Others'] as const

interface Doc {
  id: string
  name: string
  category: string
  file_url: string
  file_size: string
  file_type: string
  created_at: string
}

interface Props {
  tenantId: string
}

const TYPE_COLORS: Record<string, string> = {
  PDF: 'bg-red-600', DOC: 'bg-blue-600', IMG: 'bg-violet-600',
}

export function TenantDocuments({ tenantId }: Props) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function loadDocs() {
    const supabase = createClient()
    const { data } = await supabase
      .from('documents')
      .select('id, name, category, file_url, file_size, file_type, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    setDocs(data ?? [])
  }

  useEffect(() => { loadDocs() }, [tenantId])

  async function handleUpload() {
    if (!file) { toast.error('Select a file first.'); return }
    if (!category) { toast.error('Select a category.'); return }
    setUploading(true)
    const supabase = createClient()

    const path = `tenants/${tenantId}/${Date.now()}_${file.name}`
    const { error: storageErr } = await supabase.storage.from('documents').upload(path, file)
    if (storageErr) { toast.error('Upload failed: ' + storageErr.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)

    const fileType = file.type.includes('pdf') ? 'PDF' : file.type.includes('image') ? 'IMG' : 'DOC'
    const kb = file.size / 1024
    const fileSizeStr = kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`

    const { error: dbErr } = await supabase.from('documents').insert({
      tenant_id: tenantId,
      name: file.name,
      category,
      file_url: publicUrl,
      file_size: fileSizeStr,
      file_type: fileType,
    })

    if (dbErr) { toast.error('Failed to save record: ' + dbErr.message); setUploading(false); return }

    toast.success(`"${file.name}" uploaded!`)
    setFile(null)
    setCategory('')
    if (fileRef.current) fileRef.current.value = ''
    setUploading(false)
    loadDocs()
  }

  async function handleDelete(doc: Doc) {
    if (!confirm(`Delete "${doc.name}"?`)) return
    const supabase = createClient()
    const { error } = await supabase.from('documents').delete().eq('id', doc.id)
    if (error) { toast.error('Delete failed: ' + error.message); return }
    toast.success('Document removed.')
    loadDocs()
  }

  return (
    <div className="border-t pt-4 flex flex-col gap-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Documents</p>

      {/* Existing docs */}
      {docs.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {docs.map(d => (
            <div key={d.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-muted/30">
              <div className={`w-7 h-7 rounded-md text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${TYPE_COLORS[d.file_type] || 'bg-slate-500'}`}>
                {d.file_type}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate">{d.name}</div>
                <div className="text-[10px] text-muted-foreground">{d.category} · {d.file_size}</div>
              </div>
              <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground p-1">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button onClick={() => handleDelete(d)} className="text-muted-foreground hover:text-red-600 p-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload */}
      <div className="flex flex-col gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="sr-only"
        />
        {file ? (
          <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-muted/40">
            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="flex-1 text-sm truncate">{file.name}</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {file.size >= 1048576 ? `${(file.size / 1048576).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`}
            </span>
            <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center gap-2 border border-dashed rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
          >
            <Upload className="w-4 h-4 flex-shrink-0" />
            Click to attach a document…
          </button>
        )}

        {file && (
          <div className="flex gap-2">
            <Select onValueChange={(v: string | null) => setCategory(v ?? '')}>
              <SelectTrigger className="flex-1">
                {category ? <span>{category}</span> : <span className="text-muted-foreground">Category…</span>}
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="button" size="sm" onClick={handleUpload} disabled={uploading} className="flex-shrink-0">
              {uploading ? 'Uploading…' : <><Upload className="w-3.5 h-3.5 mr-1" />Upload</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { ExternalLink, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface Doc {
  id: string
  name: string
  category: string
  file_url: string
  file_size?: string
  file_type: string
  created_at: string
  property?: { name: string } | null
  tenant?: { name: string } | null
}

const DOC_TYPE_COLORS: Record<string, string> = {
  PDF: 'bg-red-600',
  DOC: 'bg-blue-600',
  IMG: 'bg-violet-600',
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState('All')

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('documents')
      .select('id, name, category, file_url, file_size, file_type, created_at, property:properties(name), tenant:tenants(name)')
      .order('created_at', { ascending: false })
    setDocs((data ?? []) as unknown as Doc[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const categories = ['All', ...Array.from(new Set(docs.map(d => d.category))).sort()]
  const filtered = cat === 'All' ? docs : docs.filter(d => d.category === cat)

  async function handleDelete(doc: Doc) {
    if (!confirm(`Delete "${doc.name}"?\n\nThis removes the record only — the file in storage is not deleted.`)) return
    const supabase = createClient()
    const { error } = await supabase.from('documents').delete().eq('id', doc.id)
    if (error) { toast.error('Delete failed: ' + error.message); return }
    toast.success('Document removed.')
    load()
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-[1320px] mx-auto px-4 py-5 md:px-7 md:py-7">
        <PageHeader
          title="Documents"
          subtitle={loading ? 'Loading…' : `${docs.length} document${docs.length !== 1 ? 's' : ''} · Upload via property detail or tenant edit`}
        />

        {/* Category filter */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                cat === c
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 text-center text-muted-foreground text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground text-sm border-2 border-dashed border-muted rounded-2xl">
            {docs.length === 0
              ? 'No documents yet. Upload via a property\'s Documents tab or a tenant\'s Edit panel.'
              : 'No documents in this category.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
            {filtered.map(d => {
              const linkedTo = d.tenant?.name ?? d.property?.name ?? 'General'
              return (
                <Card key={d.id} className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-11 h-11 rounded-xl text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${DOC_TYPE_COLORS[d.file_type] || 'bg-slate-500'}`}>
                      {d.file_type}
                    </div>
                    <span className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                      {d.category}
                    </span>
                  </div>

                  <div className="font-semibold text-sm leading-snug mb-1 truncate">{d.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {linkedTo}{d.file_size ? ` · ${d.file_size}` : ''}
                  </div>

                  <div className="mt-3 pt-3 border-t flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{formatDate(d.created_at)}</span>
                    <div className="flex items-center gap-1">
                      <a
                        href={d.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        onClick={e => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                        onClick={() => handleDelete(d)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

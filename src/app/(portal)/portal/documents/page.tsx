'use client'

import { useState, useEffect, useCallback } from 'react'
import { ExternalLink, FileText } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PortalShell } from '@/components/portal/PortalShell'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

interface Doc {
  id: string
  name: string
  category: string
  file_url: string
  file_size: string | null
  file_type: string
  created_at: string
}

const TYPE_COLORS: Record<string, string> = {
  PDF: 'bg-red-600',
  DOC: 'bg-blue-600',
  IMG: 'bg-violet-600',
}

export default function PortalDocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const tid = user.app_metadata?.tenant_id ?? user.user_metadata?.tenant_id
    setName(user.user_metadata?.name ?? user.email ?? '')

    if (!tid) { setLoading(false); return }

    const { data } = await supabase
      .from('documents')
      .select('id, name, category, file_url, file_size, file_type, created_at')
      .eq('tenant_id', tid)
      .order('created_at', { ascending: false })

    setDocs(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return <PortalShell name=""><div className="py-20 text-center text-muted-foreground text-sm">Loading…</div></PortalShell>
  }

  return (
    <PortalShell name={name}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">My Documents</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your uploaded files — IC, agreement, receipts.</p>
        </div>

        {docs.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No documents yet. Your landlord will upload your agreement and IC here.
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {docs.map(d => (
              <Card key={d.id} className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${TYPE_COLORS[d.file_type] ?? 'bg-slate-500'}`}>
                    {d.file_type}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{d.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.category}{d.file_size ? ` · ${d.file_size}` : ''} · {formatDate(d.created_at)}
                    </div>
                  </div>
                  <a
                    href={d.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex-shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  )
}

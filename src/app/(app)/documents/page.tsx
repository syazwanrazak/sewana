'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/Header'
import { DOCUMENTS, TENANTS, PROPERTIES } from '@/lib/seed'
import { formatDate } from '@/lib/utils'
import { DocCategory } from '@/types'

const CATEGORIES: (DocCategory | 'All')[] = ['All', 'Owner Contracts', 'Tenant Agreements', 'Receipts', 'Reports']

const DOC_TYPE_COLORS: Record<string, string> = {
  PDF: 'bg-red-600',
  DOC: 'bg-blue-600',
  IMG: 'bg-violet-600',
}

export default function DocumentsPage() {
  const [cat, setCat] = useState<DocCategory | 'All'>('All')

  const filtered = cat === 'All' ? DOCUMENTS : DOCUMENTS.filter(d => d.category === cat)
  const enriched = filtered.map(d => ({
    ...d,
    tenantName: d.tenant_id ? TENANTS.find(t => t.id === d.tenant_id)?.name : undefined,
    propertyName: d.property_id ? PROPERTIES.find(p => p.id === d.property_id)?.name : undefined,
  }))

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-[1320px] mx-auto px-7 py-7">
        <PageHeader
          title="Documents"
          subtitle="Contracts, agreements, receipts and reports."
        />

        {/* Upload zone */}
        <div className="border-2 border-dashed border-border rounded-2xl p-7 flex flex-col items-center gap-2 mb-6 bg-muted/30 cursor-pointer hover:border-primary hover:bg-accent/50 transition-all">
          <div className="w-11 h-11 rounded-xl border border-border bg-card flex items-center justify-center text-primary">
            <Upload className="w-5 h-5" />
          </div>
          <div className="font-semibold text-sm">Drag & drop files, or <span className="text-primary">browse</span></div>
          <div className="text-xs text-muted-foreground">PDF, JPG, DOC — up to 25 MB. Tag by property, tenant or rental type.</div>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {CATEGORIES.map(c => (
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

        {/* Document grid */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {enriched.map(d => (
            <Card
              key={d.id}
              className="p-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`w-11 h-11 rounded-xl text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${DOC_TYPE_COLORS[d.file_type] || 'bg-slate-500'}`}>
                  {d.file_type}
                </div>
                <span className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                  {d.rental_type_tag || d.category}
                </span>
              </div>
              <div className="font-semibold text-sm leading-snug mb-1.5">{d.name}</div>
              <div className="text-xs text-muted-foreground">{d.tenantName || d.propertyName || 'General'} · {d.file_size}</div>
              <div className="mt-3 pt-3 border-t flex justify-between items-center text-xs text-muted-foreground">
                <span>{d.category}</span>
                <span>{formatDate(d.created_at)}</span>
              </div>
            </Card>
          ))}
          {enriched.length === 0 && (
            <div className="col-span-full py-16 text-center text-muted-foreground text-sm">
              No documents in this category.
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

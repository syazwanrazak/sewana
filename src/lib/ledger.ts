import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Idempotent: safe to call on every Payments/Dashboard page load.
 * 1. Flips overdue 'pending' rows to 'late'.
 * 2. Creates a 'pending' (or 'late', if already overdue) charge row for the
 *    current month for every active contract that doesn't have one yet,
 *    due on that contract's due_day.
 */
export async function ensureLedgerCurrent(supabase: SupabaseClient) {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const pad = (n: number) => String(n).padStart(2, '0')
  const monthStart = `${y}-${pad(m)}-01`
  const nextY = m === 12 ? y + 1 : y
  const nextM = m === 12 ? 1 : m + 1
  const monthEnd = `${nextY}-${pad(nextM)}-01`

  await supabase.from('payments').update({ status: 'late' }).eq('status', 'pending').lt('due_date', todayStr)

  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, tenant_id, property_id, rental_type, monthly_rent, due_day')
    .eq('status', 'active')
    .lt('start_date', monthEnd)

  if (!contracts?.length) return

  const { data: existing } = await supabase
    .from('payments')
    .select('contract_id')
    .gte('due_date', monthStart)
    .lt('due_date', monthEnd)

  const covered = new Set((existing ?? []).map((e: any) => e.contract_id))
  const daysInMonth = new Date(y, m, 0).getDate()

  const rows = (contracts as any[])
    .filter(c => !covered.has(c.id))
    .map(c => {
      const day = Math.min(c.due_day ?? 1, daysInMonth)
      const dueDate = `${y}-${pad(m)}-${pad(day)}`
      return {
        contract_id: c.id,
        tenant_id: c.tenant_id,
        property_id: c.property_id,
        amount: c.monthly_rent,
        due_date: dueDate,
        status: dueDate < todayStr ? 'late' : 'pending',
        rental_type: c.rental_type,
      }
    })

  if (rows.length) await supabase.from('payments').insert(rows)
}

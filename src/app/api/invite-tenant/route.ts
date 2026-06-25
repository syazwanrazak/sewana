import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { email, tenantId, name } = await request.json()

  if (!email || !tenantId) {
    return NextResponse.json({ error: 'Missing email or tenantId' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.warn('[invite-tenant] SUPABASE_SERVICE_ROLE_KEY not set — skipping invite')
    return NextResponse.json({ skipped: true, reason: 'service key not configured' })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name, tenant_id: tenantId },
    redirectTo: `${appUrl}/auth/callback?next=/portal`,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Set app_metadata (server-only, tenant cannot modify this)
  await admin.auth.admin.updateUserById(data.user.id, {
    app_metadata: { role: 'tenant', tenant_id: tenantId },
  })

  return NextResponse.json({ success: true })
}

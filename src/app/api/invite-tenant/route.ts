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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceKey}`,
    'apikey': serviceKey,
  }

  try {
    // Step 1: Send invite via Supabase Auth REST API
    const inviteRes = await fetch(`${supabaseUrl}/auth/v1/invite`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email,
        data: { name, tenant_id: tenantId },
        redirect_to: `${appUrl}/set-password`,
      }),
    })

    const inviteBody = await inviteRes.json()
    console.log('[invite-tenant] invite response:', inviteRes.status, JSON.stringify(inviteBody))

    if (!inviteRes.ok) {
      return NextResponse.json({ error: inviteBody.msg ?? inviteBody.message ?? inviteBody.error_description ?? JSON.stringify(inviteBody) }, { status: 400 })
    }

    const userId = inviteBody.id
    if (!userId) {
      return NextResponse.json({ error: 'Invite sent but could not read user ID' })
    }

    // Step 2: Set app_metadata with role (cannot be tampered by the client)
    const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        app_metadata: { role: 'tenant', tenant_id: tenantId },
      }),
    })

    if (!updateRes.ok) {
      const updateBody = await updateRes.json()
      console.warn('[invite-tenant] app_metadata update failed:', JSON.stringify(updateBody))
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[invite-tenant] threw:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

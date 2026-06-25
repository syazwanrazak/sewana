import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { email, tenantId, name } = await request.json()

  if (!email || !tenantId) {
    return NextResponse.json({ error: 'Missing email or tenantId' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
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

  // NOTE: Supabase REST API returns user fields + link fields FLAT at the root.
  // There is no nested { user: {...}, action_link: "..." } — it's all top-level.
  // So userId = body.id, inviteUrl = body.action_link.

  try {
    // Try invite first (creates new user)
    const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'invite',
        email,
        data: { name, tenant_id: tenantId },
        redirect_to: `${appUrl}/set-password`,
      }),
    })

    let body = await linkRes.json()

    if (!linkRes.ok) {
      const errMsg: string = body.msg ?? body.message ?? body.error_description ?? ''
      const alreadyExists = errMsg.toLowerCase().includes('already been registered')
        || errMsg.toLowerCase().includes('already registered')

      if (!alreadyExists) {
        return NextResponse.json({ error: errMsg || JSON.stringify(body) }, { status: 400 })
      }

      // User already exists — generate a password-reset (recovery) link instead
      const recoveryRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'recovery',
          email,
          redirect_to: `${appUrl}/set-password`,
        }),
      })
      body = await recoveryRes.json()

      if (!recoveryRes.ok) {
        return NextResponse.json({
          error: body.msg ?? body.message ?? body.error_description ?? JSON.stringify(body),
        }, { status: 400 })
      }

      // Block admin accounts — flat response includes app_metadata at root
      const existingRole = body.app_metadata?.role as string | undefined
      if (existingRole !== 'tenant') {
        return NextResponse.json({
          error: 'This email is already registered as an admin account. Use a different email for this tenant.',
        }, { status: 409 })
      }

      // Existing tenant — just return the recovery link (role already set)
      return NextResponse.json({ success: true, inviteLink: body.action_link })
    }

    // New user created — body is flat: body.id = userId, body.action_link = link
    const userId    = body.id as string | undefined
    const inviteUrl = body.action_link as string | undefined

    if (!inviteUrl) {
      return NextResponse.json({ error: 'No invite link in Supabase response.' }, { status: 500 })
    }
    if (!userId) {
      console.error('[invite-tenant] Unexpected response shape — keys:', Object.keys(body))
      return NextResponse.json({ error: 'Could not read user ID from Supabase response.' }, { status: 500 })
    }

    // Set tenant role in app_metadata (server-side only — client cannot modify this)
    const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ app_metadata: { role: 'tenant', tenant_id: tenantId } }),
    })

    if (!updateRes.ok) {
      const updateBody = await updateRes.json().catch(() => ({}))
      console.error('[invite-tenant] app_metadata update failed:', updateRes.status, updateBody)
      return NextResponse.json({
        error: 'Failed to assign tenant role: ' + (updateBody.msg ?? updateBody.message ?? `HTTP ${updateRes.status}`),
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, inviteLink: inviteUrl })

  } catch (err) {
    console.error('[invite-tenant] threw:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

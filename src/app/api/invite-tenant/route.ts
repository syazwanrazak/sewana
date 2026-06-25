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

  try {
    // Generate invite link without sending any email
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

    let linkBody = await linkRes.json()

    // If user already exists, fall back to a password-reset (recovery) link
    if (!linkRes.ok) {
      const errMsg: string = linkBody.msg ?? linkBody.message ?? linkBody.error_description ?? ''
      if (errMsg.toLowerCase().includes('already been registered') || errMsg.toLowerCase().includes('already registered')) {
        // Look up the existing user to check their role before proceeding
        const listRes = await fetch(
          `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
          { headers }
        )
        const listBody = await listRes.json()
        const existingUser = listBody?.users?.[0]
        const existingRole = existingUser?.app_metadata?.role as string | undefined

        // Block admin accounts — same email cannot be both admin and tenant
        if (existingRole !== 'tenant') {
          return NextResponse.json({
            error: 'This email is already registered as an admin account. Use a different email for this tenant.',
          }, { status: 409 })
        }

        const recoveryRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            type: 'recovery',
            email,
            redirect_to: `${appUrl}/set-password`,
          }),
        })
        linkBody = await recoveryRes.json()
        if (!recoveryRes.ok) {
          return NextResponse.json({
            error: linkBody.msg ?? linkBody.message ?? linkBody.error_description ?? JSON.stringify(linkBody),
          }, { status: 400 })
        }
      } else {
        return NextResponse.json({ error: errMsg || JSON.stringify(linkBody) }, { status: 400 })
      }
    }

    // Handle both response shapes (newer Supabase wraps under .user, older may differ)
    const userId    = linkBody.user?.id ?? linkBody.data?.user?.id
    const inviteUrl = linkBody.action_link as string

    if (!inviteUrl) {
      return NextResponse.json({ error: 'Failed to generate invite link' }, { status: 500 })
    }

    if (!userId) {
      console.error('[invite-tenant] No userId in generate_link response:', JSON.stringify(linkBody))
      return NextResponse.json({ error: 'Could not retrieve user ID — role not set. Please try again.' }, { status: 500 })
    }

    // Set app_metadata with tenant role (server-only, cannot be modified by client)
    const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ app_metadata: { role: 'tenant', tenant_id: tenantId } }),
    })

    if (!updateRes.ok) {
      const updateBody = await updateRes.json().catch(() => ({}))
      console.error('[invite-tenant] app_metadata update failed:', updateRes.status, JSON.stringify(updateBody))
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

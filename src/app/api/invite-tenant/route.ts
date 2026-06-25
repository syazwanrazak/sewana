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

    // If user already exists, fall back to magic link (one-time login link)
    if (!linkRes.ok) {
      const errMsg: string = linkBody.msg ?? linkBody.message ?? linkBody.error_description ?? ''
      if (errMsg.toLowerCase().includes('already been registered') || errMsg.toLowerCase().includes('already registered')) {
        const magicRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            type: 'recovery',
            email,
            redirect_to: `${appUrl}/set-password`,
          }),
        })
        linkBody = await magicRes.json()
        if (!magicRes.ok) {
          return NextResponse.json({
            error: linkBody.msg ?? linkBody.message ?? linkBody.error_description ?? JSON.stringify(linkBody),
          }, { status: 400 })
        }
      } else {
        return NextResponse.json({ error: errMsg || JSON.stringify(linkBody) }, { status: 400 })
      }
    }

    const userId    = linkBody.user?.id
    const inviteUrl = linkBody.action_link as string

    if (!inviteUrl) {
      return NextResponse.json({ error: 'Failed to generate invite link' }, { status: 500 })
    }

    // Set app_metadata with role (cannot be modified by client)
    if (userId) {
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          app_metadata: { role: 'tenant', tenant_id: tenantId },
        }),
      })
    }

    return NextResponse.json({ success: true, inviteLink: inviteUrl })
  } catch (err) {
    console.error('[invite-tenant] threw:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

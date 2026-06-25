import { NextResponse, type NextRequest } from 'next/server'

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('') + '!'
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, email, password, tenantId } = body

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Service key not configured' }, { status: 500 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceKey}`,
    'apikey': serviceKey,
  }

  // Create a new tenant portal account
  if (action === 'create') {
    if (!email || !password || !tenantId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        app_metadata: { role: 'tenant', tenant_id: tenantId },
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      const msg = data.msg ?? data.message ?? data.error_description ?? 'Failed to create portal account'
      return NextResponse.json({ error: msg }, { status: res.status })
    }
    return NextResponse.json({ success: true })
  }

  // Reset password for an existing tenant (or create if not yet registered)
  if (action === 'reset') {
    if (!email || !tenantId) {
      return NextResponse.json({ error: 'Missing email or tenantId' }, { status: 400 })
    }
    const newPassword = generatePassword()

    // Find user by email
    const listRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(email)}&per_page=10`,
      { headers }
    )
    const listData = await listRes.json()
    const existing = (listData.users ?? []).find((u: { email: string; id: string }) => u.email === email)

    if (!existing) {
      // No account yet — create one
      const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email,
          password: newPassword,
          email_confirm: true,
          app_metadata: { role: 'tenant', tenant_id: tenantId },
        }),
      })
      const createData = await createRes.json()
      if (!createRes.ok) {
        return NextResponse.json({ error: createData.msg ?? createData.message ?? 'Failed to create account' }, { status: 400 })
      }
      return NextResponse.json({ success: true, password: newPassword })
    }

    // Account exists — update password
    const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ password: newPassword }),
    })
    const updateData = await updateRes.json()
    if (!updateRes.ok) {
      return NextResponse.json({ error: updateData.msg ?? updateData.message ?? 'Failed to reset password' }, { status: 400 })
    }
    return NextResponse.json({ success: true, password: newPassword })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

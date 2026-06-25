import { Resend } from 'resend'
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
    // Step 1: Generate invite link without sending email
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

    const linkBody = await linkRes.json()
    console.log('[invite-tenant] generate_link response:', linkRes.status, JSON.stringify(linkBody))

    if (!linkRes.ok) {
      return NextResponse.json({
        error: linkBody.msg ?? linkBody.message ?? linkBody.error_description ?? JSON.stringify(linkBody),
      }, { status: 400 })
    }

    const userId    = linkBody.user?.id
    const inviteUrl = linkBody.action_link as string

    if (!inviteUrl) {
      return NextResponse.json({ error: 'Failed to generate invite link' }, { status: 500 })
    }

    // Step 2: Set app_metadata (role cannot be tampered by client)
    if (userId) {
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          app_metadata: { role: 'tenant', tenant_id: tenantId },
        }),
      })
    }

    // Step 3: Send invite email via Resend
    if (!process.env.RESEND_API_KEY) {
      console.warn('[invite-tenant] RESEND_API_KEY not set — invite link generated but email not sent:', inviteUrl)
      return NextResponse.json({ success: true, warning: 'Email not sent — RESEND_API_KEY not configured' })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const from   = process.env.RESEND_FROM_EMAIL ?? 'Sewana <onboarding@resend.dev>'
    const firstName = name.split(' ')[0]

    const { error: emailErr } = await resend.emails.send({
      from,
      to: email,
      subject: `You've been invited to Sewana Tenant Portal`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
          <div style="margin-bottom:24px">
            <span style="background:#0F766E;color:white;font-weight:800;font-size:16px;padding:6px 14px;border-radius:8px;">Sewana</span>
          </div>
          <h2 style="margin:0 0 8px;font-size:22px;color:#111">Hi ${firstName}, welcome!</h2>
          <p style="color:#555;margin:0 0 24px;line-height:1.6">
            Your landlord has added you to <strong>Sewana</strong> — a property management portal where you can
            pay rent, track your contract, and submit maintenance requests.
          </p>
          <p style="color:#555;margin:0 0 24px;line-height:1.6">
            Click the button below to set your password and activate your account.
          </p>
          <a href="${inviteUrl}"
            style="display:inline-block;background:#0F766E;color:white;font-weight:700;font-size:15px;
                   padding:12px 28px;border-radius:10px;text-decoration:none;">
            Set Password &amp; Enter Portal
          </a>
          <p style="color:#999;font-size:12px;margin-top:32px;">
            This link expires in 24 hours. If you did not expect this email, you can safely ignore it.
          </p>
        </div>
      `,
    })

    if (emailErr) {
      console.warn('[invite-tenant] Resend error (returning link for manual share):', emailErr.message)
      return NextResponse.json({ success: true, inviteLink: inviteUrl, emailError: emailErr.message })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[invite-tenant] threw:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

import { Resend } from 'resend'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { type, to, data } = await request.json()

  if (!process.env.RESEND_API_KEY) {
    console.log('[send-email] RESEND_API_KEY not set — skipping email to:', to)
    return NextResponse.json({ skipped: true })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.RESEND_FROM_EMAIL ?? 'Sewana <onboarding@resend.dev>'

  let subject = ''
  let html = ''

  if (type === 'payment_approved') {
    subject = `Payment Confirmed — RM ${data.amount}`
    html = `
      <p>Hi ${data.name},</p>
      <p>Your payment of <strong>RM ${data.amount}</strong> for
      <strong>${new Date(data.month).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })}</strong>
      has been received and confirmed. Thank you!</p>
      <p>— Sewana Property Management</p>
    `
  } else if (type === 'payment_rejected') {
    subject = 'Payment Receipt — Action Required'
    html = `
      <p>Hi ${data.name},</p>
      <p>Your payment receipt for <strong>RM ${data.amount}</strong> could not be verified.</p>
      ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
      <p>Please resubmit a clearer screenshot or contact your landlord directly.</p>
      <p>— Sewana Property Management</p>
    `
  } else if (type === 'ticket_update') {
    const statusLabel: Record<string, string> = {
      open: 'Open',
      in_progress: 'In Progress',
      resolved: 'Resolved',
    }
    subject = `Maintenance Update — ${data.title}`
    html = `
      <p>Hi ${data.name},</p>
      <p>Your maintenance request "<strong>${data.title}</strong>" has been updated to
      <strong>${statusLabel[data.status] ?? data.status}</strong>.</p>
      ${data.note ? `<p><strong>Note from management:</strong> ${data.note}</p>` : ''}
      <p>— Sewana Property Management</p>
    `
  }

  if (!subject) {
    return NextResponse.json({ error: 'Unknown email type' }, { status: 400 })
  }

  const { error } = await resend.emails.send({ from, to, subject, html })
  if (error) {
    console.error('[send-email] Resend error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

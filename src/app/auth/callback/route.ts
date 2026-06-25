import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    // If caller specified a next, honour it (e.g. invite links set next=/portal)
    if (next) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    // Otherwise route based on role
    const { data: { user } } = await supabase.auth.getUser()
    const role = user?.app_metadata?.role
    const dest = role === 'tenant' ? '/portal' : '/dashboard'
    return NextResponse.redirect(`${origin}${dest}`)
  }

  return NextResponse.redirect(`${origin}/login`)
}

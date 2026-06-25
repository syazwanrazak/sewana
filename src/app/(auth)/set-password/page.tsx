'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home, Eye, EyeOff } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const accessToken  = params.get('access_token')
    const refreshToken = params.get('refresh_token') ?? ''
    const type         = params.get('type')

    if (!accessToken) {
      setError('Invalid or expired invite link. Please ask your landlord to resend the invite.')
      return
    }

    const supabase = createClient()
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(() => {
        // Magic links don't need a password — go straight to portal
        if (type === 'magiclink') {
          router.replace('/portal')
        } else {
          setReady(true)
        }
      })
      .catch(() => setError('Session could not be loaded. The link may have expired.'))
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { toast.error('Password must be at least 6 characters.'); return }
    if (password !== confirm)  { toast.error('Passwords do not match.'); return }

    setLoading(true)
    const supabase = createClient()
    const { error: updateErr } = await supabase.auth.updateUser({ password })
    if (updateErr) { toast.error(updateErr.message); setLoading(false); return }

    toast.success('Password set! Taking you to your portal…')
    router.push('/portal')
    router.refresh()
  }

  return (
    <Card className="w-full max-w-[380px] p-8">
      <div className="flex flex-col items-center mb-8">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-700 to-teal-500 flex items-center justify-center shadow-sm mb-4">
          <Home className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-extrabold tracking-tight">Sewana</h1>
        <p className="text-sm text-muted-foreground mt-1 text-center">
          {error ? 'Something went wrong' : 'Set your password to activate your account'}
        </p>
      </div>

      {error ? (
        <div className="text-sm text-red-600 text-center bg-red-50 rounded-xl p-4">{error}</div>
      ) : !ready ? (
        <div className="text-sm text-muted-foreground text-center py-4">Verifying your invite…</div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label className="mb-1.5 block">New Password</Label>
            <div className="relative">
              <Input
                type={showPw ? 'text' : 'password'}
                placeholder="At least 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoFocus
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">Confirm Password</Label>
            <Input
              type={showPw ? 'text' : 'password'}
              placeholder="Repeat your password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="mt-2 w-full" disabled={loading}>
            {loading ? 'Activating…' : 'Set Password & Enter Portal'}
          </Button>
        </form>
      )}
    </Card>
  )
}

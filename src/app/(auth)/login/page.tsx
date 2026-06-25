'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <Card className="w-full max-w-[380px] p-8">
      <div className="flex flex-col items-center mb-8">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-700 to-teal-500 flex items-center justify-center shadow-sm mb-4">
          <Home className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-extrabold tracking-tight">Sewana</h1>
        <p className="text-sm text-muted-foreground mt-1">Sign in to continue</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label className="mb-1.5 block">Email</Label>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div>
          <Label className="mb-1.5 block">Password</Label>
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="mt-2 w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>
    </Card>
  )
}

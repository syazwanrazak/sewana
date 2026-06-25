'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Building2, Key, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function TenantLoginPage() {
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    if (data.user?.app_metadata?.role !== 'tenant') {
      await supabase.auth.signOut()
      toast.error('This portal is for tenants only.')
      setLoading(false)
      return
    }
    router.push('/portal')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left decorative panel (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[52%] bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-orange-400/5 rounded-full blur-2xl" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg">
            <Home className="w-[18px] h-[18px] text-white" />
          </div>
          <span className="font-extrabold text-white text-[17px] tracking-tight">Sewana</span>
        </div>

        {/* Center hero */}
        <div className="relative z-10 flex flex-col items-center text-center -mt-4">
          <div className="relative mb-8">
            {/* Rings */}
            <div className="absolute inset-0 scale-[1.35] rounded-[2.5rem] border border-amber-400/20" />
            <div className="absolute inset-0 scale-[1.65] rounded-[3rem] border border-amber-400/10" />
            {/* Icon card */}
            <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-2xl shadow-amber-900/40 relative">
              <Building2 className="w-14 h-14 text-white/90" />
              {/* Key badge */}
              <div className="absolute -bottom-3 -right-3 w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-xl shadow-teal-900/30">
                <Key className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-[2.75rem] font-extrabold text-white tracking-tight leading-none mb-4">
            Welcome home.
          </h1>
          <p className="text-stone-400 text-base leading-relaxed max-w-sm">
            Your personal portal to manage everything about your home — all in one place.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-3">
          {[
            { emoji: '🏠', label: 'View your unit & contract details' },
            { emoji: '💳', label: 'Submit rent payment receipts' },
            { emoji: '🔧', label: 'Report maintenance issues instantly' },
            { emoji: '📄', label: 'Access your tenancy documents' },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-3">
              <span className="text-base w-6 text-center">{f.emoji}</span>
              <span className="text-sm text-stone-400">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — login form ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-amber-50 via-orange-50/40 to-white">
        <div className="w-full max-w-[360px]">

          {/* Mobile header */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="relative mb-5">
              <div className="w-20 h-20 rounded-[1.75rem] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-200">
                <Building2 className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg">
                <Key className="w-4 h-4 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">Welcome home.</h1>
            <p className="text-sm text-muted-foreground mt-1 text-center">Sign in to your tenant portal</p>
          </div>

          {/* Desktop header */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-[1.6rem] font-extrabold tracking-tight text-stone-900">Tenant Sign In</h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              Enter your credentials to access your portal
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <Label className="mb-1.5 block text-sm font-semibold text-stone-700">Email Address</Label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="h-11 border-stone-200 focus-visible:ring-amber-400/50"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm font-semibold text-stone-700">Password</Label>
              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10 border-stone-200 focus-visible:ring-amber-400/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-1 h-11 w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-amber-200 border-0 transition-all"
            >
              {loading ? 'Signing in…' : 'Sign In to Portal'}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-8 leading-relaxed">
            Don&apos;t have access yet?<br />
            <span className="text-stone-500 font-medium">Contact your property manager for your login credentials.</span>
          </p>
        </div>
      </div>
    </div>
  )
}

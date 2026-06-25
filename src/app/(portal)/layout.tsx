import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sewana — Tenant Portal',
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

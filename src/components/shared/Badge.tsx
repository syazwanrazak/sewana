import { cn } from '@/lib/utils'
import { RENTAL_TYPE_META, PAYMENT_STATUS_META, PRIORITY_META } from '@/lib/utils'
import { RentalType, PaymentStatus, MaintenancePriority } from '@/types'

interface BadgeProps {
  className?: string
  children: React.ReactNode
  bg?: string
  text?: string
}

export function StatusBadge({ className, children, bg, text }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full', bg, text, className)}>
      {children}
    </span>
  )
}

export function RentalTypeBadge({ type }: { type: RentalType }) {
  const m = RENTAL_TYPE_META[type]
  return <StatusBadge bg={m.bg} text={m.text}>{m.label}</StatusBadge>
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const m = PAYMENT_STATUS_META[status]
  return <StatusBadge bg={m.bg} text={m.text}>{m.label}</StatusBadge>
}

export function PriorityBadge({ priority }: { priority: MaintenancePriority }) {
  const m = PRIORITY_META[priority]
  return <StatusBadge bg={m.bg} text={m.text}>{m.label}</StatusBadge>
}

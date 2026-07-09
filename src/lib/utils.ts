import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { RentalType, PaymentStatus, MaintenancePriority } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function rm(n: number): string {
  return 'RM ' + Number(n).toLocaleString('en-MY', { minimumFractionDigits: 0 })
}

export function initials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export const RENTAL_TYPE_META: Record<RentalType, { label: string; bg: string; text: string }> = {
  full:    { label: 'Full Unit', bg: 'bg-teal-50',   text: 'text-teal-700' },
  room:    { label: 'Room',      bg: 'bg-blue-50',   text: 'text-blue-700' },
  parking: { label: 'Parking',   bg: 'bg-amber-50',  text: 'text-amber-700' },
}

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; bg: string; text: string }> = {
  paid:    { label: 'Paid',    bg: 'bg-green-100',  text: 'text-green-700' },
  pending: { label: 'Pending', bg: 'bg-amber-100',  text: 'text-amber-700' },
  late:    { label: 'Late',    bg: 'bg-red-100',    text: 'text-red-700' },
}

export const PRIORITY_META: Record<MaintenancePriority, { label: string; bg: string; text: string }> = {
  urgent: { label: 'Urgent', bg: 'bg-red-100',    text: 'text-red-700' },
  high:   { label: 'High',   bg: 'bg-orange-100', text: 'text-orange-700' },
  normal: { label: 'Normal', bg: 'bg-amber-100',  text: 'text-amber-700' },
  low:    { label: 'Low',    bg: 'bg-slate-100',  text: 'text-slate-600' },
}

const AVATAR_COLORS = [
  '#0F766E', '#1D4ED8', '#B45309', '#7C3AED', '#DB2777',
  '#0891B2', '#16A34A', '#DC2626', '#EA580C', '#6D28D9',
]

export function pickColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

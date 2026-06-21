import { cn, initials } from '@/lib/utils'

interface AvatarProps {
  name: string
  color?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: 'w-8 h-8 text-[11px]',
  md: 'w-9 h-9 text-[12px]',
  lg: 'w-12 h-12 text-[15px]',
}

export function Avatar({ name, color = '#0F766E', size = 'md', className }: AvatarProps) {
  return (
    <div
      className={cn('rounded-full flex items-center justify-center font-bold text-white flex-shrink-0', SIZES[size], className)}
      style={{ backgroundColor: color }}
    >
      {initials(name)}
    </div>
  )
}

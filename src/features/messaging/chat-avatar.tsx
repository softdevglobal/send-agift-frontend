import { useState } from 'react'
import { LifeBuoy, Store, User, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { ConversationAvatarKind } from './conversation-label'

const ICONS: Record<ConversationAvatarKind, LucideIcon> = {
  shop: Store,
  seller: Store,
  customer: User,
  support: LifeBuoy,
}

type ChatAvatarProps = {
  kind: ConversationAvatarKind
  imageUrl?: string | null
  /** A person's name — shown as initials when there's no photo. */
  name?: string | null
  size?: 'xs' | 'sm' | 'md'
  className?: string
}

const DIMENSIONS = { xs: 'size-7', sm: 'size-8', md: 'size-10' } as const

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function ChatAvatar({ kind, imageUrl, name, size = 'md', className }: ChatAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const Icon = ICONS[kind]
  const dimensions = DIMENSIONS[size]

  if (imageUrl && failedUrl !== imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        onError={() => setFailedUrl(imageUrl)}
        className={cn(
          'shrink-0 rounded-full object-cover ring-1 ring-border/60',
          dimensions,
          className,
        )}
      />
    )
  }

  const initials = name ? initialsOf(name) : ''

  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full',
        kind === 'support'
          ? 'bg-gradient-to-br from-brand-violet to-brand-navy text-white'
          : 'bg-accent text-accent-foreground',
        dimensions,
        className,
      )}
    >
      {initials ? (
        <span className={cn('font-semibold', size === 'md' ? 'text-xs' : 'text-[10px]')}>
          {initials}
        </span>
      ) : (
        <Icon className={size === 'md' ? 'size-4' : 'size-3.5'} />
      )}
    </span>
  )
}

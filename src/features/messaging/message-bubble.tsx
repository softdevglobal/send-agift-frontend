import type { ReactNode } from 'react'
import { Check, CheckCheck, FileText, ImageOff } from 'lucide-react'

import type { ChatMessage, MessageAttachment } from '@/api/messaging'
import { cn } from '@/lib/utils'

import {
  attachmentFileName,
  attachmentsOf,
  formatBubbleTime,
  formatFileSize,
  isImageAttachment,
} from './messaging-utils'

export type MessageDelivery = 'sent' | 'seen'

type MessageBubbleProps = {
  message: ChatMessage
  own: boolean
  /** Who sent it — only for the first bubble of a group in threads with 3+ people. */
  senderLabel?: string | null
  /** The other side's avatar beside their last bubble in a group; null keeps the gutter. */
  avatar?: ReactNode
  /** Last bubble of a run from the same sender: gets the tail corner and the time. */
  endsGroup?: boolean
  /** Shown under your most recent message. */
  delivery?: MessageDelivery | null
}

export function MessageBubble({
  message,
  own,
  senderLabel,
  avatar,
  endsGroup = true,
  delivery,
}: MessageBubbleProps) {
  const attachments = attachmentsOf(message)
  const images = attachments.filter(isImageAttachment)
  const documents = attachments.filter((attachment) => !isImageAttachment(attachment))
  const body = message.body.trim()

  return (
    <div
      className={cn(
        'flex flex-col motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300',
        own ? 'items-end' : 'items-start',
      )}
    >
      {senderLabel ? (
        <span className={cn('mb-1 px-1 text-[11px] font-medium text-muted-foreground', !own && 'ml-9')}>
          {senderLabel}
        </span>
      ) : null}

      <div className="flex max-w-[85%] items-end gap-2">
        {own ? null : <span className="flex w-7 shrink-0 justify-center">{avatar}</span>}

        <div className={cn('flex min-w-0 flex-col gap-1', own ? 'items-end' : 'items-start')}>
          {images.length ? (
            <div
              className={cn(
                'grid w-[min(17rem,100%)] gap-1',
                images.length > 1 && 'grid-cols-2',
              )}
            >
              {images.map((attachment) => (
                <ImageAttachment
                  key={attachment.id}
                  attachment={attachment}
                  single={images.length === 1}
                />
              ))}
            </div>
          ) : null}

          {documents.map((attachment) => (
            <DocumentAttachment key={attachment.id} attachment={attachment} own={own} />
          ))}

          {body ? (
            <div
              className={cn(
                'rounded-[1.25rem] px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap',
                own
                  ? 'bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(109,40,217,0.28)]'
                  : 'bg-card text-foreground shadow-[0_4px_14px_rgba(20,20,55,0.06)] ring-1 ring-border/60',
                endsGroup && (own ? 'rounded-br-md' : 'rounded-bl-md'),
              )}
            >
              {body}
            </div>
          ) : null}
        </div>
      </div>

      {endsGroup ? (
        <div
          className={cn(
            'mt-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground',
            !own && 'ml-9',
          )}
        >
          <time dateTime={message.created_at}>{formatBubbleTime(message.created_at)}</time>
          {delivery === 'seen' ? (
            <span className="inline-flex items-center gap-0.5 font-medium text-brand-teal">
              <CheckCheck className="size-3" />
              Seen
            </span>
          ) : delivery === 'sent' ? (
            <span className="inline-flex items-center gap-0.5">
              <Check className="size-3" />
              Sent
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function ImageAttachment({
  attachment,
  single,
}: {
  attachment: MessageAttachment
  single: boolean
}) {
  if (!attachment.cdn_url) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <ImageOff className="size-5" />
        <span className="sr-only">Photo unavailable</span>
      </div>
    )
  }

  return (
    <a
      href={attachment.cdn_url}
      target="_blank"
      rel="noreferrer"
      className="group block overflow-hidden rounded-2xl bg-muted shadow-[0_6px_18px_rgba(20,20,55,0.10)] ring-1 ring-border/60"
    >
      <img
        src={attachment.cdn_url}
        alt={attachmentFileName(attachment)}
        loading="lazy"
        className={cn(
          'w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]',
          single ? 'max-h-72' : 'aspect-square',
        )}
      />
    </a>
  )
}

function DocumentAttachment({
  attachment,
  own,
}: {
  attachment: MessageAttachment
  own: boolean
}) {
  const name = attachmentFileName(attachment)
  const content = (
    <>
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl',
          own ? 'bg-white/15' : 'bg-accent text-accent-foreground',
        )}
      >
        <FileText className="size-4.5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span className={cn('block text-xs', own ? 'text-white/70' : 'text-muted-foreground')}>
          {attachment.mime_type === 'application/pdf' ? 'PDF' : 'Document'} ·{' '}
          {formatFileSize(attachment.size_bytes)}
        </span>
      </span>
    </>
  )
  const className = cn(
    'flex w-[min(17rem,100%)] items-center gap-3 rounded-2xl px-3 py-2.5 transition-opacity',
    own
      ? 'bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(109,40,217,0.28)]'
      : 'bg-card text-foreground shadow-[0_4px_14px_rgba(20,20,55,0.06)] ring-1 ring-border/60',
  )

  return attachment.cdn_url ? (
    <a href={attachment.cdn_url} target="_blank" rel="noreferrer" className={cn(className, 'hover:opacity-90')}>
      {content}
    </a>
  ) : (
    <div className={className}>{content}</div>
  )
}

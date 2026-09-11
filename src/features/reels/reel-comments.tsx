import { EllipsisVertical, Loader2, MessageCircle, Pencil, Trash2, UserRound, X } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { Link, useLocation } from 'react-router-dom'

import { getCustomerMe } from '@/api/customers'
import {
  createReelComment,
  deleteReelComment,
  listReelComments,
  updateReelComment,
  type ReelComment,
} from '@/api/reelSocial'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useAuth } from '@/features/auth/auth-context'
import type { ReelPatch } from '@/features/reels/use-reel-feed'
import { compactCount, type ReelView } from '@/features/reels/reel-view'
import { ApiError, getErrorMessage } from '@/lib/api'
import { getTokenSubject, returnToState } from '@/lib/auth'
import {
  forgetOwnComment,
  readOwnCommentIds,
  rememberOwnComment,
} from '@/lib/own-reel-comments'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20
/** Mirrors the API: bodies over 1000 characters are rejected. */
const MAX_BODY = 1000
/** Mirrors the API, which trims longer nicknames to 40. */
const MAX_NICKNAME = 40

type ReelCommentsPanelProps = {
  reel: ReelView
  onClose: () => void
  onPatch: (reelId: string, patch: ReelPatch) => void
  className?: string
}

/**
 * A reel's comments, laid out the way Shorts does it: count and close in the
 * header, a scrolling list, and "Add a comment…" pinned to the bottom.
 *
 * Readable by anyone; writable by a signed-in customer. Opens on the comments
 * the feed already carried, then swaps in the API's own newest page so the
 * list is current, and pages further as the list is scrolled.
 */
export function ReelCommentsPanel({ reel, onClose, onPatch, className }: ReelCommentsPanelProps) {
  const { role, isAuthenticated } = useAuth()
  const isCustomer = isAuthenticated && role === 'customer'
  const customerId = isCustomer ? getTokenSubject() : null

  const reelId = reel.id
  const [items, setItems] = useState<ReelComment[]>(reel.comments)
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  // Off after a failed page, so scrolling does not hammer a failing API.
  const [autoLoad, setAutoLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ownIds, setOwnIds] = useState(() => readOwnCommentIds(customerId))

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    listReelComments(reelId, { limit: PAGE_SIZE })
      .then((page) => {
        if (cancelled) return
        setItems(page.items ?? [])
        setCursor(page.next_cursor ?? null)
        setError(null)
      })
      .catch(() => {
        // The feed's copy is still on screen; say it may be behind. The raw
        // error ("Not Found" from an API without these routes) means nothing
        // to a shopper.
        if (!cancelled) setError('Could not load comments right now. Please try again later.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reelId])

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    setAutoLoad(true)
    try {
      const page = await listReelComments(reelId, { cursor, limit: PAGE_SIZE })
      setItems((current) => {
        const seen = new Set(current.map((comment) => comment.id))
        return [...current, ...(page.items ?? []).filter((comment) => !seen.has(comment.id))]
      })
      setCursor(page.next_cursor ?? null)
      setError(null)
    } catch {
      setAutoLoad(false)
      setError('Could not load more comments right now.')
    } finally {
      setLoadingMore(false)
    }
  }, [cursor, loadingMore, reelId])

  // Infinite scroll: the next page loads as the end of the list comes near.
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !cursor || !autoLoad) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore()
      },
      { root: scrollRef.current, rootMargin: '240px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [autoLoad, cursor, loadMore])

  function handlePosted(comment: ReelComment) {
    setItems((current) => [comment, ...current])
    rememberOwnComment(customerId, comment.id)
    setOwnIds((ids) => new Set(ids).add(comment.id))
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    onPatch(reelId, (current) => ({
      commentCount: current.commentCount + 1,
      comments: [comment, ...current.comments.filter((item) => item.id !== comment.id)],
    }))
  }

  function handleEdited(comment: ReelComment) {
    setItems((current) => current.map((item) => (item.id === comment.id ? comment : item)))
    onPatch(reelId, (current) => ({
      comments: current.comments.map((item) => (item.id === comment.id ? comment : item)),
    }))
  }

  /** `deleted` is false when the API refused — the comment stays, the controls go. */
  function handleRemoved(commentId: string, deleted: boolean) {
    forgetOwnComment(customerId, commentId)
    setOwnIds((ids) => {
      const next = new Set(ids)
      next.delete(commentId)
      return next
    })
    if (!deleted) return
    setItems((current) => current.filter((item) => item.id !== commentId))
    onPatch(reelId, (current) => ({
      commentCount: Math.max(0, current.commentCount - 1),
      comments: current.comments.filter((item) => item.id !== commentId),
    }))
  }

  const count = Math.max(reel.commentCount, items.length)

  return (
    <section
      aria-label="Comments"
      className={cn('flex h-full min-h-0 flex-col bg-card', className)}
    >
      <header className="flex items-center justify-between gap-3 border-b border-border py-3 pr-3 pl-5">
        <h2 className="text-lg font-bold tracking-tight">
          Comments
          <span className="ml-2 text-base font-normal text-muted-foreground">
            {compactCount(count)}
          </span>
        </h2>
        <button
          type="button"
          aria-label="Close comments"
          onClick={onClose}
          className="grid size-10 cursor-pointer place-items-center rounded-full text-foreground transition-colors hover:bg-muted"
        >
          <X className="size-5" />
        </button>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {error ? (
          <p className="mb-4 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            {error}
          </p>
        ) : null}

        {items.length === 0 ? (
          loading ? (
            <div className="grid place-items-center py-16 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
              <MessageCircle className="size-8" />
              <p className="text-sm font-semibold text-foreground">No comments yet</p>
              <p className="text-xs">Start the conversation.</p>
            </div>
          )
        ) : (
          <ul className="flex flex-col gap-6">
            {items.map((comment) => (
              <CommentRow
                key={comment.id}
                reelId={reelId}
                comment={comment}
                own={isCustomer && ownIds.has(comment.id)}
                onEdited={handleEdited}
                onRemoved={handleRemoved}
              />
            ))}
          </ul>
        )}

        {cursor ? (
          <div ref={sentinelRef} className="flex justify-center pt-6 pb-2">
            {loadingMore ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : autoLoad ? null : (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => void loadMore()}
              >
                Load more comments
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <div className="border-t border-border px-4 py-3">
        {isCustomer ? (
          <CommentComposer reelId={reelId} customerId={customerId} onPosted={handlePosted} />
        ) : (
          <SignInToComment signedInAsOtherRole={isAuthenticated} />
        )}
      </div>
    </section>
  )
}

/**
 * Below the desktop breakpoint there is no room beside the player, so the same
 * panel slides over the feed instead.
 */
export function ReelCommentsSheet({
  reel,
  open,
  onOpenChange,
  onPatch,
}: {
  /** Kept while the sheet animates closed. */
  reel: ReelView | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPatch: (reelId: string, patch: ReelPatch) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent showCloseButton={false} className="gap-0">
        <SheetTitle className="sr-only">Comments</SheetTitle>
        <SheetDescription className="sr-only">
          Read and add comments on this reel.
        </SheetDescription>
        {reel ? (
          <ReelCommentsPanel
            key={reel.id}
            reel={reel}
            onClose={() => onOpenChange(false)}
            onPatch={onPatch}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function CommentRow({
  reelId,
  comment,
  own,
  onEdited,
  onRemoved,
}: {
  reelId: string
  comment: ReelComment
  own: boolean
  onEdited: (comment: ReelComment) => void
  onRemoved: (commentId: string, deleted: boolean) => void
}) {
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm-delete'>('view')
  const [draft, setDraft] = useState(comment.body)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const edited =
    new Date(comment.updated_at).getTime() - new Date(comment.created_at).getTime() > 1000

  /** A 404 on an edit or delete means the API does not see this customer as the author. */
  function lostOwnership(action: 'edit' | 'delete') {
    onRemoved(comment.id, false)
    setMode('view')
    setError(`This comment can no longer be ${action === 'edit' ? 'edited' : 'deleted'}.`)
  }

  async function save() {
    const body = draft.trim()
    if (!body || busy) return
    if (body === comment.body) {
      setMode('view')
      return
    }
    setBusy(true)
    setError(null)
    try {
      onEdited(await updateReelComment(reelId, comment.id, body))
      setMode('view')
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) lostOwnership('edit')
      else setError(getErrorMessage(err, 'Could not save your changes'))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await deleteReelComment(reelId, comment.id)
      // The row unmounts with the removal, so nothing is reset after this.
      onRemoved(comment.id, true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) lostOwnership('delete')
      else setError(getErrorMessage(err, 'Could not delete the comment'))
      setBusy(false)
    }
  }

  function cancelEdit() {
    setDraft(comment.body)
    setMode('view')
  }

  return (
    <li className="flex gap-3">
      <Avatar name={comment.author.display_name} anonymous={comment.author.type !== 'customer'} />

      <div className="min-w-0 flex-1">
        {mode === 'edit' ? (
          <div className="flex flex-col gap-2 pt-1.5">
            <AutoGrowTextarea
              value={draft}
              maxLength={MAX_BODY}
              autoFocus
              aria-label="Edit comment"
              disabled={busy}
              onChange={setDraft}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation()
                  cancelEdit()
                } else if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void save()
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                className="h-9 rounded-full px-4"
                disabled={busy}
                onClick={cancelEdit}
              >
                Cancel
              </Button>
              <Button
                className="h-9 rounded-full px-4"
                disabled={busy || !draft.trim()}
                onClick={() => void save()}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="flex flex-wrap items-baseline gap-x-1.5 text-[13px] leading-5">
              <span className="font-semibold break-all">{comment.author.display_name}</span>
              <span className="text-xs text-muted-foreground">
                {timeAgo(comment.created_at)}
                {edited ? ' (edited)' : ''}
              </span>
            </p>
            <p className="mt-1 text-sm leading-relaxed break-words whitespace-pre-wrap">
              {comment.body}
            </p>
          </>
        )}

        {mode === 'confirm-delete' ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Delete this comment?</span>
            <div className="ml-auto flex gap-2">
              <Button
                variant="ghost"
                className="h-8 rounded-full px-3"
                disabled={busy}
                autoFocus
                onClick={() => setMode('view')}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="h-8 rounded-full px-3"
                disabled={busy}
                onClick={() => void remove()}
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Delete
              </Button>
            </div>
          </div>
        ) : null}

        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </div>

      {own && mode === 'view' ? (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label="Comment actions"
              className="-mt-1 grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-foreground transition-colors hover:bg-muted data-[state=open]:bg-muted"
            >
              <EllipsisVertical className="size-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              // The editor and the confirm row take focus themselves.
              onCloseAutoFocus={(event) => event.preventDefault()}
              className="z-[60] min-w-36 rounded-xl border border-border bg-card p-1 text-sm shadow-lg"
            >
              <DropdownMenu.Item
                onSelect={() => {
                  setDraft(comment.body)
                  setError(null)
                  setMode('edit')
                }}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 outline-none data-[highlighted]:bg-muted"
              >
                <Pencil className="size-4" />
                Edit
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => {
                  setError(null)
                  setMode('confirm-delete')
                }}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 outline-none data-[highlighted]:bg-muted"
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      ) : (
        // Keeps every row's text on the same right edge.
        <span className="size-9 shrink-0" aria-hidden />
      )}
    </li>
  )
}

/** YouTube's composer: collapsed to one underlined line until it has focus. */
function CommentComposer({
  reelId,
  customerId,
  onPosted,
}: {
  reelId: string
  customerId: string | null
  onPosted: (comment: ReelComment) => void
}) {
  const [body, setBody] = useState('')
  const [focused, setFocused] = useState(false)
  const [anonymous, setAnonymous] = useState(false)
  const [nickname, setNickname] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const me = useMyProfile(customerId)

  const trimmed = body.trim()
  const expanded = focused || body.length > 0

  function reset() {
    setBody('')
    setFocused(false)
    setAnonymous(false)
    setNickname('')
    setError(null)
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    if (!trimmed || sending) return
    setSending(true)
    setError(null)
    try {
      const comment = await createReelComment(reelId, {
        body: trimmed,
        is_anonymous: anonymous,
        ...(anonymous && nickname.trim() ? { display_name: nickname.trim() } : {}),
      })
      onPosted(comment)
      reset()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not post your comment'))
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submit()
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="flex gap-3">
      <Avatar
        size="sm"
        name={anonymous ? nickname || 'Anonymous' : (me?.name ?? '')}
        imageUrl={anonymous ? null : me?.imageUrl}
        anonymous={anonymous || !me}
      />

      <div className="min-w-0 flex-1">
        <AutoGrowTextarea
          value={body}
          maxLength={MAX_BODY}
          aria-label="Add a comment"
          placeholder="Add a comment…"
          disabled={sending}
          onFocus={() => setFocused(true)}
          onChange={setBody}
          onKeyDown={handleKeyDown}
        />

        {expanded ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={anonymous}
                disabled={sending}
                onChange={(event) => setAnonymous(event.target.checked)}
                className="size-4 accent-brand-violet"
              />
              Post anonymously
            </label>
            {anonymous ? (
              <input
                value={nickname}
                maxLength={MAX_NICKNAME}
                placeholder="Nickname (optional)"
                aria-label="Nickname"
                disabled={sending}
                onChange={(event) => setNickname(event.target.value)}
                className="h-8 w-36 min-w-0 rounded-lg border border-input bg-surface px-2.5 text-xs text-foreground outline-none focus-visible:border-ring"
              />
            ) : null}
            <div className="ml-auto flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="h-9 rounded-full px-4"
                disabled={sending}
                onClick={reset}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-9 rounded-full px-4"
                disabled={!trimmed || sending}
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : null}
                Comment
              </Button>
            </div>
          </div>
        ) : null}

        {body.length > MAX_BODY - 100 ? (
          <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums">
            {body.length}/{MAX_BODY}
          </p>
        ) : null}
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </div>
    </form>
  )
}

/**
 * Stands in for the composer when nobody is signed in. It says so in place —
 * only the button itself leaves the feed, and only if the viewer chooses it.
 */
function SignInToComment({ signedInAsOtherRole }: { signedInAsOtherRole: boolean }) {
  const location = useLocation()

  if (signedInAsOtherRole) {
    return (
      <p className="py-1.5 text-sm text-muted-foreground">
        Commenting is for customer accounts.
      </p>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar size="sm" name="" anonymous />
      <p className="flex-1 text-sm text-muted-foreground">Sign in to add a comment.</p>
      <Button asChild size="sm" className="h-8 shrink-0 rounded-full px-4">
        <Link to="/login" state={returnToState(location.pathname, location.search)}>
          Sign in
        </Link>
      </Button>
    </div>
  )
}

function AutoGrowTextarea({
  value,
  onChange,
  className,
  ...props
}: Omit<React.ComponentProps<'textarea'>, 'onChange' | 'value'> & {
  value: string
  onChange: (value: string) => void
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }, [value])

  return (
    <textarea
      {...props}
      ref={ref}
      rows={1}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        'block max-h-32 w-full resize-none border-b border-border bg-transparent pb-1.5 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground disabled:opacity-60',
        className,
      )}
    />
  )
}

const AVATAR_COLORS = [
  'bg-violet-600',
  'bg-sky-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-indigo-600',
  'bg-teal-600',
  'bg-fuchsia-600',
]

/** Same name, same colour — so a commenter is recognisable down the list. */
function avatarColor(name: string): string {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function Avatar({
  name,
  imageUrl,
  anonymous = false,
  size = 'md',
}: {
  name: string
  imageUrl?: string | null
  anonymous?: boolean
  size?: 'sm' | 'md'
}) {
  const sizeClass = size === 'sm' ? 'size-8 text-xs' : 'size-10 text-sm'

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={cn(sizeClass, 'shrink-0 rounded-full object-cover')}
        loading="lazy"
      />
    )
  }
  if (anonymous) {
    return (
      <span
        aria-hidden
        className={cn(
          sizeClass,
          'grid shrink-0 place-items-center rounded-full bg-muted text-muted-foreground',
        )}
      >
        <UserRound className="size-1/2" />
      </span>
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        sizeClass,
        'grid shrink-0 place-items-center rounded-full font-semibold text-white',
        avatarColor(name),
      )}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}

type MyProfile = { name: string; imageUrl: string | null }

/**
 * The composer shows the customer's own avatar. The panel remounts for every
 * reel, so the lookup is shared for the session rather than repeated.
 */
let myProfileRequest: { customerId: string; promise: Promise<MyProfile> } | null = null

function useMyProfile(customerId: string | null): MyProfile | null {
  const [profile, setProfile] = useState<MyProfile | null>(null)

  useEffect(() => {
    if (!customerId) return
    if (myProfileRequest?.customerId !== customerId) {
      const promise = getCustomerMe().then((me) => ({
        name: me.display_name?.trim() || me.email,
        imageUrl: me.image_url?.trim() || null,
      }))
      myProfileRequest = { customerId, promise }
      // A failed lookup is retried on the next mount rather than cached.
      promise.catch(() => {
        if (myProfileRequest?.promise === promise) myProfileRequest = null
      })
    }

    let cancelled = false
    myProfileRequest.promise
      .then((me) => {
        if (!cancelled) setProfile(me)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [customerId])

  return customerId ? profile : null
}

/** "just now", "5 minutes ago", "3 weeks ago", "1 month ago" — YouTube's wording. */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (seconds < 60) return 'just now'

  const units: [label: string, seconds: number][] = [
    ['year', 365 * 24 * 3600],
    ['month', 30 * 24 * 3600],
    ['week', 7 * 24 * 3600],
    ['day', 24 * 3600],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [label, size] of units) {
    const amount = Math.floor(seconds / size)
    if (amount >= 1) return `${amount} ${label}${amount === 1 ? '' : 's'} ago`
  }
  return 'just now'
}

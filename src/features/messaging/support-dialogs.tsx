import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Check, LoaderCircle, Search } from 'lucide-react'

import {
  startConversation,
  startConversationWithMessage,
  type ConversationDetails,
  type SupportPriority,
} from '@/api/messaging'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, getErrorMessage } from '@/lib/api'
import { selectClassName, textareaClassName } from '@/lib/form-styles'
import { loadMarketplaceIntoCatalog } from '@/lib/marketplace'
import {
  listPublicSellers,
  publicSellerInitials,
  publicSellerName,
  subscribePublicSellers,
  type PublicSeller,
} from '@/lib/public-sellers'
import { cn } from '@/lib/utils'

import { SUPPORT_PRIORITIES, SUPPORT_PRIORITY_LABEL } from './messaging-utils'

type SupportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (conversation: ConversationDetails) => void
}

/**
 * Seller → SendAGift support (`type: "support"` with a subject and the first
 * message; no counterpart — the API assigns an admin). If the seller already
 * has an open ticket, the message lands in that one.
 */
export function SellerSupportDialog({ open, onOpenChange, onCreated }: SupportDialogProps) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSubject('')
    setBody('')
    setError(null)
  }, [open])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = body.trim()
    if (!message) {
      setError('Tell us what you need help with.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const conversation = await startConversationWithMessage(
        { type: 'support', ...(subject.trim() ? { subject: subject.trim() } : {}) },
        { body: message },
      )
      onCreated(conversation)
      onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? 'Support is not available right now. Please try again later.'
          : getErrorMessage(err, 'Could not reach support.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Contact SendAGift support</DialogTitle>
            <DialogDescription>
              Questions about payouts, orders, or your shop. Our team replies in your inbox.
            </DialogDescription>
          </DialogHeader>

          <FormAlert error={error} />

          <div className="space-y-2">
            <Label htmlFor="support-subject">Subject (optional)</Label>
            <Input
              id="support-subject"
              value={subject}
              maxLength={120}
              placeholder="e.g. Payout question"
              onChange={(event) => setSubject(event.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="support-body">Message</Label>
            <textarea
              id="support-body"
              value={body}
              rows={5}
              placeholder="How can we help?"
              onChange={(event) => setBody(event.target.value)}
              className={textareaClassName}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-10">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" className="h-10" disabled={submitting}>
              {submitting ? <LoaderCircle className="animate-spin" /> : null}
              Send to support
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function sellerMatches(seller: PublicSeller, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [publicSellerName(seller), seller.legal_name, ...seller.shops.map((shop) => shop.name)]
    .join(' ')
    .toLowerCase()
    .includes(needle)
}

/**
 * Admin → seller, as the API docs describe: `type: "support"` with
 * `counterpart_role: "seller"`, the seller's id as `counterpart_user_id`, and
 * the subject, priority and first message. The seller is picked from the
 * public shop directory, or entered by id when their shop isn't listed.
 */
export function AdminMessageSellerDialog({ open, onOpenChange, onCreated }: SupportDialogProps) {
  const [sellers, setSellers] = useState<PublicSeller[]>([])
  const [loadingSellers, setLoadingSellers] = useState(false)
  const [query, setQuery] = useState('')
  const [manualEntry, setManualEntry] = useState(false)
  const [sellerId, setSellerId] = useState('')
  const [subject, setSubject] = useState('')
  const [priority, setPriority] = useState<SupportPriority>('normal')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setManualEntry(false)
    setSellerId('')
    setSubject('')
    setPriority('normal')
    setBody('')
    setError(null)

    let cancelled = false
    const refresh = () => {
      if (!cancelled) setSellers(listPublicSellers())
    }
    refresh()
    setLoadingSellers(true)
    void loadMarketplaceIntoCatalog()
      .then(refresh)
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadingSellers(false)
      })
    const unsubscribe = subscribePublicSellers(refresh)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [open])

  const visibleSellers = useMemo(
    () => sellers.filter((seller) => sellerMatches(seller, query)),
    [sellers, query],
  )
  const selectedSeller = sellers.find((seller) => seller.id === sellerId) ?? null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const id = sellerId.trim()
    const message = body.trim()
    if (!UUID_PATTERN.test(id)) {
      setError(manualEntry ? 'Enter the seller’s account ID (a UUID).' : 'Choose a seller.')
      return
    }
    if (!message) {
      setError('Write a message for the seller.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      // For admin-opened support the API stores the first message whether the
      // case is new or already open, so it rides in the start request.
      const conversation = await startConversation({
        type: 'support',
        counterpart_role: 'seller',
        counterpart_user_id: id,
        priority,
        body: message,
        ...(subject.trim() ? { subject: subject.trim() } : {}),
      })
      onCreated(conversation)
      onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? 'No active seller has that ID.'
          : getErrorMessage(err, 'Could not message this seller.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Message a seller</DialogTitle>
            <DialogDescription>
              Opens a support conversation with the seller. If they already have one open, your
              message joins it.
            </DialogDescription>
          </DialogHeader>

          <FormAlert error={error} />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor={manualEntry ? 'admin-seller-id' : 'admin-seller-search'}>
                Seller
              </Label>
              <button
                type="button"
                onClick={() => {
                  setManualEntry((value) => !value)
                  setSellerId('')
                  setError(null)
                }}
                className="text-xs font-medium text-primary hover:underline"
              >
                {manualEntry ? 'Choose from the list' : 'Seller not listed? Enter their ID'}
              </button>
            </div>

            {manualEntry ? (
              <Input
                id="admin-seller-id"
                value={sellerId}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => setSellerId(event.target.value)}
                className="h-11 font-mono text-xs"
              />
            ) : (
              <div className="overflow-hidden rounded-xl ring-1 ring-border/70">
                <div className="relative border-b border-border/60">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="admin-seller-search"
                    value={query}
                    placeholder="Search sellers or shops…"
                    autoComplete="off"
                    onChange={(event) => setQuery(event.target.value)}
                    className="h-10 w-full bg-transparent pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <ul role="radiogroup" aria-label="Sellers" className="max-h-52 overflow-y-auto p-1">
                  {visibleSellers.length === 0 ? (
                    <li className="flex justify-center px-3 py-6 text-center text-sm text-muted-foreground">
                      {loadingSellers ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : sellers.length === 0 ? (
                        'No sellers have a public shop yet.'
                      ) : (
                        'No sellers match your search.'
                      )}
                    </li>
                  ) : (
                    visibleSellers.map((seller) => {
                      const selected = seller.id === sellerId
                      const image = seller.image_url || seller.shops[0]?.image_url
                      return (
                        <li key={seller.id}>
                          <button
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => setSellerId(seller.id)}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                              selected ? 'bg-accent' : 'hover:bg-muted/70',
                            )}
                          >
                            {image ? (
                              <img
                                src={image}
                                alt=""
                                className="size-9 shrink-0 rounded-full object-cover ring-1 ring-border/60"
                              />
                            ) : (
                              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                                {publicSellerInitials(seller)}
                              </span>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">
                                {publicSellerName(seller)}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {seller.shops.map((shop) => shop.name).join(' · ') || 'No shops'}
                              </span>
                            </span>
                            {selected ? <Check className="size-4 shrink-0 text-primary" /> : null}
                          </button>
                        </li>
                      )
                    })
                  )}
                </ul>
              </div>
            )}
            {!manualEntry && selectedSeller ? (
              <p className="text-xs text-muted-foreground">
                Messaging <span className="font-medium text-foreground">{publicSellerName(selectedSeller)}</span>
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
            <div className="space-y-2">
              <Label htmlFor="admin-subject">Subject (optional)</Label>
              <Input
                id="admin-subject"
                value={subject}
                maxLength={120}
                placeholder="e.g. Shop check"
                onChange={(event) => setSubject(event.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-priority">Priority</Label>
              <select
                id="admin-priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as SupportPriority)}
                className={selectClassName}
              >
                {SUPPORT_PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {SUPPORT_PRIORITY_LABEL[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-body">Message</Label>
            <textarea
              id="admin-body"
              value={body}
              rows={4}
              placeholder="Write to the seller…"
              onChange={(event) => setBody(event.target.value)}
              className={textareaClassName}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-10">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" className="h-10" disabled={submitting}>
              {submitting ? <LoaderCircle className="animate-spin" /> : null}
              Send message
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

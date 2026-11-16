import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { CircleHelp, OctagonX, TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { textareaClassName } from '@/lib/form-styles'
import { cn } from '@/lib/utils'

/**
 * The site's own replacements for window.prompt and window.confirm: the same
 * dialog as everywhere else, in the site's colours, instead of the browser's
 * grey box. Call them from any click handler and await the answer.
 *
 *   const reason = await askText({ title: 'Emergency off', ... })
 *   if (!reason) return
 */

type Tone = 'default' | 'danger' | 'emergency'

type Common = {
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: Tone
}

export type AskTextOptions = Common & {
  label?: string
  placeholder?: string
  /** Shown under the box, e.g. "Recorded in the audit log." */
  hint?: string
  /** Default true: the confirm button stays off until something is typed. */
  required?: boolean
  initialValue?: string
  /** A single line rather than a few. */
  singleLine?: boolean
}

export type AskConfirmOptions = Common

type Request =
  | { kind: 'text'; options: AskTextOptions; resolve: (value: string | null) => void }
  | { kind: 'confirm'; options: AskConfirmOptions; resolve: (value: boolean) => void }

let current: Request | null = null
const queue: Request[] = []
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function enqueue(request: Request) {
  if (current) queue.push(request)
  else current = request
  emit()
}

function settle(value: string | boolean | null) {
  const done = current
  current = queue.shift() ?? null
  emit()
  if (!done) return
  if (done.kind === 'text') done.resolve(typeof value === 'string' ? value : null)
  else done.resolve(value === true)
}

/** Asks for a line of text. Resolves to the trimmed text, or null on cancel. */
export function askText(options: AskTextOptions): Promise<string | null> {
  return new Promise((resolve) => enqueue({ kind: 'text', options, resolve }))
}

/** Asks yes or no. Resolves to true only when the confirm button is pressed. */
export function askConfirm(options: AskConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => enqueue({ kind: 'confirm', options, resolve }))
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const TONE_ICON = {
  default: { icon: CircleHelp, badge: 'bg-brand-violet text-white' },
  danger: { icon: TriangleAlert, badge: 'bg-destructive text-white' },
  emergency: { icon: OctagonX, badge: 'bg-destructive text-white' },
} as const

/** Mounted once, at the root of the app. */
export function AskDialogHost() {
  const request = useSyncExternalStore(subscribe, () => current, () => null)
  return request ? <AskDialog key={requestKey(request)} request={request} /> : null
}

const keys = new WeakMap<Request, number>()
let nextKey = 0
function requestKey(request: Request) {
  if (!keys.has(request)) keys.set(request, ++nextKey)
  return keys.get(request)
}

function AskDialog({ request }: { request: Request }) {
  const { options } = request
  const tone = options.tone ?? 'default'
  const { icon: Icon, badge } = TONE_ICON[tone]
  const isText = request.kind === 'text'
  const textOptions = isText ? (request.options as AskTextOptions) : null
  const [value, setValue] = useState(textOptions?.initialValue ?? '')
  const inputRef = useRef<HTMLTextAreaElement & HTMLInputElement>(null)
  const required = textOptions?.required ?? true
  const canConfirm = !isText || !required || value.trim() !== ''

  useEffect(() => {
    if (isText) inputRef.current?.focus()
  }, [isText])

  function confirm() {
    if (!canConfirm) return
    settle(isText ? value.trim() || null : true)
  }

  const danger = tone !== 'default'
  const inputId = 'ask-dialog-input'

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : settle(isText ? null : false))}>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            confirm()
          }}
          className="space-y-5"
        >
          <DialogHeader>
            <div className={cn('mb-2 flex size-11 rotate-[-6deg] items-center justify-center rounded-lg', badge)}>
              <Icon className="size-5" />
            </div>
            <DialogTitle className="font-poster text-2xl">{options.title}</DialogTitle>
            {options.description ? (
              <DialogDescription className="text-sm leading-relaxed">{options.description}</DialogDescription>
            ) : null}
          </DialogHeader>

          {textOptions ? (
            <div className="space-y-2">
              {textOptions.label ? <Label htmlFor={inputId}>{textOptions.label}</Label> : null}
              {textOptions.singleLine ? (
                <input
                  id={inputId}
                  ref={inputRef}
                  value={value}
                  maxLength={500}
                  placeholder={textOptions.placeholder}
                  onChange={(event) => setValue(event.target.value)}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              ) : (
                <textarea
                  id={inputId}
                  ref={inputRef}
                  value={value}
                  rows={3}
                  maxLength={1000}
                  placeholder={textOptions.placeholder}
                  onChange={(event) => setValue(event.target.value)}
                  onKeyDown={(event) => {
                    // Enter sends, Shift+Enter starts a new line.
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      confirm()
                    }
                  }}
                  className={cn(textareaClassName, 'min-h-24 resize-none')}
                />
              )}
              {textOptions.hint ? <p className="text-xs text-muted-foreground">{textOptions.hint}</p> : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" className="h-10 px-4" onClick={() => settle(isText ? null : false)}>
              {options.cancelLabel ?? 'Cancel'}
            </Button>
            <Button
              type="submit"
              className={cn('h-10 px-4', danger && 'bg-destructive text-white hover:bg-destructive/85 hover:text-white')}
              disabled={!canConfirm}
            >
              {options.confirmLabel ?? (isText ? 'Continue' : 'Confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { FileText, LoaderCircle, Paperclip, SendHorizontal, X } from 'lucide-react'

import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

import {
  CHAT_FILE_ACCEPT,
  MAX_CHAT_ATTACHMENTS,
  chatFileProblem,
  formatFileSize,
} from './messaging-utils'

type PendingFile = {
  id: string
  file: File
  previewUrl: string | null
}

/** Text dropped into the input from outside — a suggested question, say. */
export type ComposerPrefill = { text: string; key: number }

type ChatComposerProps = {
  /** Rejecting keeps the draft and shows the error, so nothing typed is lost. */
  onSend: (body: string, files: File[]) => Promise<void>
  placeholder?: string
  autoFocus?: boolean
  prefill?: ComposerPrefill | null
}

let pendingSeq = 0

export function ChatComposer({
  onSend,
  placeholder = 'Write a message…',
  autoFocus = false,
  prefill,
}: ChatComposerProps) {
  const [text, setText] = useState('')
  const [pending, setPending] = useState<PendingFile[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const pendingRef = useRef(pending)

  useEffect(() => {
    pendingRef.current = pending
  }, [pending])

  // Previews are object URLs; release whatever is still attached on unmount.
  useEffect(
    () => () => {
      for (const item of pendingRef.current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      }
    },
    [],
  )

  // A picked suggestion lands in the input, ready to edit — not sent for them.
  useEffect(() => {
    if (!prefill) return
    setText(prefill.text)
    const input = inputRef.current
    if (!input) return
    input.focus()
    requestAnimationFrame(() => input.setSelectionRange(prefill.text.length, prefill.text.length))
  }, [prefill])

  // Grow with the text up to about five lines, then scroll.
  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    input.style.height = 'auto'
    input.style.height = `${Math.min(input.scrollHeight, 140)}px`
  }, [text])

  function addFiles(files: File[]) {
    if (!files.length) return
    const room = MAX_CHAT_ATTACHMENTS - pending.length
    const accepted: PendingFile[] = []
    let problem: string | null = null

    for (const file of files) {
      const reason = chatFileProblem(file)
      if (reason) {
        problem ??= reason
        continue
      }
      if (accepted.length >= room) {
        problem ??= `You can attach up to ${MAX_CHAT_ATTACHMENTS} files per message.`
        break
      }
      pendingSeq += 1
      accepted.push({
        id: `pending-${pendingSeq}`,
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      })
    }

    if (accepted.length) setPending((current) => [...current, ...accepted])
    setError(problem)
  }

  function removeFile(id: string) {
    const item = pending.find((entry) => entry.id === id)
    if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
    setPending((current) => current.filter((entry) => entry.id !== id))
  }

  const canSend = !sending && (text.trim().length > 0 || pending.length > 0)

  async function submit() {
    if (!canSend) return
    setSending(true)
    setError(null)
    try {
      await onSend(
        text.trim(),
        pending.map((item) => item.file),
      )
      for (const item of pending) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      }
      setPending([])
      setText('')
      inputRef.current?.focus()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not send your message.'))
    } finally {
      setSending(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void submit()
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.clipboardData.files)
    if (!files.length) return
    event.preventDefault()
    addFiles(files)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border/50 bg-card/95 px-3 pt-2.5 pb-3 backdrop-blur"
    >
      {error ? (
        <p role="alert" className="mb-2 rounded-xl bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {pending.length ? (
        <ul className="mb-2 flex gap-2 overflow-x-auto px-0.5 pt-1.5 pb-1" aria-label="Attachments">
          {pending.map((item) => (
            <li key={item.id} className="relative shrink-0 motion-safe:animate-in motion-safe:zoom-in-95">
              {item.previewUrl ? (
                <img
                  src={item.previewUrl}
                  alt={item.file.name}
                  className="size-16 rounded-xl object-cover shadow-sm ring-1 ring-border/60"
                />
              ) : (
                <div className="flex h-16 w-44 items-center gap-2.5 rounded-xl bg-surface px-2.5 shadow-sm ring-1 ring-border/60">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <FileText className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium">{item.file.name}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {formatFileSize(item.file.size)}
                    </span>
                  </span>
                </div>
              )}
              <button
                type="button"
                aria-label={`Remove ${item.file.name}`}
                disabled={sending}
                onClick={() => removeFile(item.id)}
                className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background shadow-sm disabled:opacity-50"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex items-end gap-1 rounded-[1.4rem] bg-surface p-1.5 shadow-[inset_0_1px_2px_rgba(20,20,55,0.04)] ring-1 ring-border/70 transition-shadow focus-within:ring-2 focus-within:ring-primary/35">
        <input
          ref={fileRef}
          type="file"
          accept={CHAT_FILE_ACCEPT}
          multiple
          hidden
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []))
            // Clear so picking the same file again still fires a change.
            event.target.value = ''
          }}
        />
        <button
          type="button"
          aria-label="Attach a photo or PDF"
          title="Attach a photo or PDF"
          disabled={sending || pending.length >= MAX_CHAT_ATTACHMENTS}
          onClick={() => fileRef.current?.click()}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40"
        >
          <Paperclip className="size-4.5" />
        </button>
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          autoFocus={autoFocus}
          aria-label="Message"
          placeholder={placeholder}
          disabled={sending}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className="max-h-36 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-1.5 py-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full text-white transition-all duration-200',
            canSend
              ? 'bg-primary shadow-[0_6px_16px_rgba(109,40,217,0.35)] hover:scale-105 active:scale-95'
              : 'bg-muted-foreground/25',
          )}
        >
          {sending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <SendHorizontal className="size-4" />
          )}
        </button>
      </div>
      <p className="mt-1.5 hidden px-3 text-[10px] text-muted-foreground sm:block">
        Enter to send · Shift + Enter for a new line · Photos and PDFs up to 15 MB
      </p>
    </form>
  )
}

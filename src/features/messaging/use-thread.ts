import { useCallback, useEffect, useRef, useState } from 'react'

import { uploadPublicFile } from '@/api/media'
import {
  listMessages,
  sendMessage,
  type ChatAttachmentInput,
  type ChatMessage,
} from '@/api/messaging'
import { getErrorMessage } from '@/lib/api'

import { CHAT_PAGE_SIZE, chatFolderFor, mergeMessages } from './messaging-utils'
import { usePolling } from './use-polling'

/**
 * Presigns each file into `chat-image` / `chat-document`, PUTs it straight to
 * storage, and returns the references a message carries.
 */
export function uploadChatFiles(files: File[]): Promise<ChatAttachmentInput[]> {
  return Promise.all(
    files.map(async (file) => {
      const uploaded = await uploadPublicFile(file, chatFolderFor(file))
      return {
        object_path: uploaded.objectPath,
        mime_type: uploaded.mimeType,
        size_bytes: uploaded.sizeBytes,
      }
    }),
  )
}

/**
 * Messages for one conversation, polled while it's open.
 *
 * Every fetch of the messages endpoint also marks the thread read for the
 * viewer, so simply having a thread open keeps its unread count at zero.
 */
export function useThread(conversationId: string | null, intervalMs = 5_000) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasOlder, setHasOlder] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const currentId = useRef(conversationId)
  const firstPage = useRef(true)

  // Switching threads starts from nothing, so one conversation never shows in another.
  useEffect(() => {
    currentId.current = conversationId
    firstPage.current = true
    setMessages([])
    setLoaded(false)
    setError(null)
    setHasOlder(false)
  }, [conversationId])

  const poll = useCallback(async () => {
    const id = conversationId
    if (!id) return
    try {
      const page = (await listMessages(id, { limit: CHAT_PAGE_SIZE })) ?? []
      if (currentId.current !== id) return
      setMessages((current) => mergeMessages(current, page))
      if (firstPage.current) {
        firstPage.current = false
        setHasOlder(page.length >= CHAT_PAGE_SIZE)
      }
      setError(null)
    } catch (err) {
      if (currentId.current === id) setError(getErrorMessage(err, 'Could not load messages.'))
    } finally {
      if (currentId.current === id) setLoaded(true)
    }
  }, [conversationId])

  usePolling(poll, conversationId ? intervalMs : null, conversationId)

  const oldest = messages[0]?.created_at

  const loadOlder = useCallback(async () => {
    const id = conversationId
    if (!id || !oldest) return
    setLoadingOlder(true)
    try {
      const page = (await listMessages(id, { limit: CHAT_PAGE_SIZE, before: oldest })) ?? []
      if (currentId.current !== id) return
      setMessages((current) => mergeMessages(current, page))
      setHasOlder(page.length >= CHAT_PAGE_SIZE)
    } catch (err) {
      if (currentId.current === id) {
        setError(getErrorMessage(err, 'Could not load earlier messages.'))
      }
    } finally {
      setLoadingOlder(false)
    }
  }, [conversationId, oldest])

  /** Uploads any files straight to storage, then posts the message with their keys. */
  const send = useCallback(
    async (body: string, files: File[]) => {
      const id = conversationId
      if (!id) throw new Error('This conversation is not available.')
      const attachments = await uploadChatFiles(files)
      const message = await sendMessage(id, {
        body,
        ...(attachments.length ? { attachments } : {}),
      })
      if (currentId.current === id) {
        setMessages((current) => mergeMessages(current, [message]))
      }
      return message
    },
    [conversationId],
  )

  return {
    messages,
    loaded: conversationId ? loaded : true,
    error,
    hasOlder,
    loadingOlder,
    loadOlder,
    send,
  }
}

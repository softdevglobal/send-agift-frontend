import { api } from '@/lib/api'
import {
  MEDIA_FOLDERS,
  type MediaFolder,
  type PresignUploadRequest,
  type PresignUploadResponse,
} from '@/api/types'

export type { MediaFolder, PresignUploadRequest, PresignUploadResponse }

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  m4v: 'video/x-m4v',
  pdf: 'application/pdf',
}

function isMediaFolder(value: string): value is MediaFolder {
  return (MEDIA_FOLDERS as readonly string[]).includes(value)
}

function contentTypeOf(file: File): string {
  if (file.type.trim()) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return CONTENT_TYPE_BY_EXT[ext] ?? ''
}

/** Uploads a file directly to S3 via a presigned URL and returns its public URL. */
export async function uploadPublicImage(file: File, folder: MediaFolder): Promise<string> {
  if (!isMediaFolder(folder)) {
    throw new Error('unsupported folder')
  }

  const filename = file.name.trim()
  const contentType = contentTypeOf(file)
  if (!filename || !contentType) {
    throw new Error('filename and content_type are required')
  }

  const body: PresignUploadRequest = {
    filename,
    content_type: contentType,
    folder,
  }

  const presign = await api<PresignUploadResponse>('/media/presign-upload', {
    method: 'POST',
    body,
  })

  const uploadResponse = await fetch(presign.upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  })
  if (!uploadResponse.ok) {
    throw new Error('Could not upload image.')
  }

  if (!presign.public_url?.trim()) {
    throw new Error('Upload succeeded but no public URL was returned.')
  }
  return presign.public_url
}

/** What an upload leaves behind: the S3 key a reel is posted with, and the URL to preview it. */
export type UploadedFile = {
  /** The `key` from presign — this is what a reel's `object_path` must be. */
  objectPath: string
  publicUrl: string
  mimeType: string
  sizeBytes: number
}

/**
 * Uploads any supported file (image or video) and returns its storage key.
 *
 * Reels are posted with the S3 `key`, not the public URL — the API resolves
 * the URL itself — so this returns both rather than the URL alone.
 */
export async function uploadPublicFile(
  file: File,
  folder: MediaFolder,
): Promise<UploadedFile> {
  if (!isMediaFolder(folder)) {
    throw new Error('unsupported folder')
  }

  const filename = file.name.trim()
  const contentType = contentTypeOf(file)
  if (!filename || !contentType) {
    throw new Error('filename and content_type are required')
  }

  const body: PresignUploadRequest = { filename, content_type: contentType, folder }
  const presign = await api<PresignUploadResponse>('/media/presign-upload', {
    method: 'POST',
    body,
  })

  const uploadResponse = await fetch(presign.upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  })
  if (!uploadResponse.ok) {
    throw new Error('Could not upload file.')
  }
  if (!presign.key?.trim()) {
    throw new Error('Upload succeeded but no storage key was returned.')
  }

  return {
    objectPath: presign.key,
    publicUrl: presign.public_url ?? '',
    mimeType: contentType,
    sizeBytes: file.size,
  }
}

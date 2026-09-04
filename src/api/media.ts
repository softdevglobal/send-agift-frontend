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

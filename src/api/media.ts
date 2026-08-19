import { api } from '@/lib/api'

export type MediaFolder = 'seller-profile' | 'shop-image' | 'product-image'

type PresignUploadResponse = {
  upload_url: string
  key: string
  public_url?: string
}

/** Uploads a file directly to S3 via a presigned URL and returns its public URL. */
export async function uploadPublicImage(file: File, folder: MediaFolder): Promise<string> {
  console.log('[media] requesting presigned upload url', { folder, filename: file.name, type: file.type })
  const presign = await api<PresignUploadResponse>('/media/presign-upload', {
    method: 'POST',
    body: { filename: file.name, content_type: file.type, folder },
  })
  console.log('[media] presign response', presign)

  const uploadResponse = await fetch(presign.upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  console.log('[media] s3 put response', uploadResponse.status, uploadResponse.statusText)
  if (!uploadResponse.ok) {
    throw new Error('Could not upload image.')
  }

  if (!presign.public_url) {
    throw new Error('Upload succeeded but no public URL was returned.')
  }
  return presign.public_url
}

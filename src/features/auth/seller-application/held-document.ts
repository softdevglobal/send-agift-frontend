import { uploadPublicFile } from '@/api/media'
import { attachSellerDocument } from '@/api/sellers'

/**
 * The business document picked during sign-up. Uploads need a signed-in
 * seller, so it waits here until the seller confirms their email.
 */
let held: { email: string; file: File } | null = null

export function holdSellerDocument(email: string, file: File | null) {
  held = file ? { email: email.trim().toLowerCase(), file } : null
}

/** Uploads the held document for this seller, if there is one. */
export async function uploadHeldSellerDocument(email: string) {
  if (!held || held.email !== email.trim().toLowerCase()) return
  const { file } = held
  held = null
  try {
    const uploaded = await uploadPublicFile(file, 'seller-document')
    await attachSellerDocument({
      key: uploaded.objectPath,
      name: file.name,
      content_type: uploaded.mimeType,
    })
  } catch (err) {
    // The application still goes to review; the admin sees no document.
    console.warn('Could not upload the business document', err)
  }
}

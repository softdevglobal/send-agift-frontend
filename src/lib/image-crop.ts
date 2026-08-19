export type PixelCrop = { x: number; y: number; width: number; height: number }

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', reject)
    image.crossOrigin = 'anonymous'
    image.src = src
  })
}

/** Crops an image to the given pixel area and returns it as a File. */
export async function getCroppedImageFile(
  imageSrc: string,
  crop: PixelCrop,
  fileName: string,
  mimeType = 'image/jpeg',
): Promise<File> {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = crop.width
  canvas.height = crop.height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create canvas context.')

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  )

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mimeType, 0.92),
  )
  if (!blob) throw new Error('Could not create cropped image.')

  return new File([blob], fileName, { type: mimeType })
}

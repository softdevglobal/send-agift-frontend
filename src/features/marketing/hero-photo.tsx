const HERO_PHOTO_SRC =
  '/images/hero/Gemini_Generated_Image_u6ws12u6ws12u6ws.jpg'
const CREAM = 'oklch(0.97 0.015 95)'

/** Fills the whole hero, so it must sit inside a relative section before the content. */
export function HeroPhotoBackdrop() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <img
        src={HERO_PHOTO_SRC}
        alt=""
        className="size-full object-cover object-[68%_28%]"
        loading="eager"
        draggable={false}
      />
      <div
        className="absolute inset-0 hidden lg:block"
        style={{
          backgroundImage: `linear-gradient(to right, ${CREAM} 0%, oklch(0.97 0.015 95 / 0.9) 26%, oklch(0.97 0.015 95 / 0.45) 45%, oklch(0.97 0.015 95 / 0) 62%)`,
        }}
      />
      <div
        className="absolute inset-0 lg:hidden"
        style={{
          backgroundImage: `linear-gradient(to bottom, oklch(0.97 0.015 95 / 0.95) 0%, oklch(0.97 0.015 95 / 0.88) 55%, oklch(0.97 0.015 95 / 0.6) 100%)`,
        }}
      />
    </div>
  )
}

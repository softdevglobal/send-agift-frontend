const floatingGifts = [
  {
    src: '/images/hero/gift-stack.png',
    alt: 'Stack of wrapped gift boxes',
    className:
      'absolute top-[4%] left-[6%] z-20 w-[72%] max-w-none drop-shadow-[0_28px_40px_rgba(40,50,30,0.22)]',
  },
  {
    src: '/images/hero/gift-red.png',
    alt: 'Red ribbon gift box',
    className:
      'absolute top-[8%] right-[-2%] z-30 w-[38%] drop-shadow-[0_18px_28px_rgba(40,50,30,0.2)]',
  },
  {
    src: '/images/hero/gift-gold.png',
    alt: 'Gold wrapped gift',
    className:
      'absolute right-[4%] bottom-[18%] z-30 w-[34%] drop-shadow-[0_16px_26px_rgba(40,50,30,0.18)]',
  },
  {
    src: '/images/hero/gift-blue.png',
    alt: 'Blue gift box with bow',
    className:
      'absolute bottom-[6%] left-[-2%] z-10 w-[32%] drop-shadow-[0_14px_22px_rgba(40,50,30,0.16)]',
  },
]

export function GiftHeroCollage() {
  return (
    <div className="animate-soft-rise relative mx-auto aspect-square w-full max-w-md lg:max-w-none lg:aspect-[1/1.05]">
      <div
        aria-hidden
        className="absolute top-[-6%] right-[-8%] size-[78%] rounded-full bg-[oklch(0.9_0.04_125/0.55)]"
      />
      <div
        aria-hidden
        className="absolute top-[18%] right-[8%] size-[58%] rounded-full bg-[oklch(0.93_0.03_95/0.7)]"
      />
      <div
        aria-hidden
        className="absolute bottom-[6%] left-[10%] size-[42%] rounded-full bg-[oklch(0.91_0.035_80/0.45)]"
      />

      {floatingGifts.map((gift) => (
        <img
          key={gift.src}
          src={gift.src}
          alt={gift.alt}
          className={`pointer-events-none select-none object-contain ${gift.className}`}
          loading="eager"
          draggable={false}
        />
      ))}
    </div>
  )
}

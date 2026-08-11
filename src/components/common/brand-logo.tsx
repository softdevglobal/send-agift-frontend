import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

const LOGO_SRC = '/images/logo/send-a-gift.png'

type BrandLogoProps = {
  className?: string
  /** Image height classes, e.g. "h-9" or "h-11" */
  imgClassName?: string
  to?: string | false
}

export function BrandLogo({
  className,
  imgClassName = 'h-11',
  to = '/',
}: BrandLogoProps) {
  const image = (
    <img
      src={LOGO_SRC}
      alt="SendAgift"
      className={cn('w-auto object-contain object-left', imgClassName)}
    />
  )

  if (to === false) {
    return <span className={cn('inline-flex shrink-0', className)}>{image}</span>
  }

  return (
    <Link
      to={to}
      className={cn(
        'inline-flex shrink-0 items-center transition-opacity hover:opacity-80',
        className
      )}
    >
      {image}
    </Link>
  )
}

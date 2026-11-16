import { useEffect, useState } from 'react'
import { ArrowRight, Megaphone } from 'lucide-react'
import { Link } from 'react-router-dom'

import { getSellerAdvertising, type AdReminder } from '@/api/game-entries'

/**
 * The newest unread advertising budget notice, on the seller dashboard. It
 * only invites the seller to buy another package; nothing is bought for them.
 */
export function AdvertisingAlert() {
  const [reminder, setReminder] = useState<AdReminder | null>(null)

  useEffect(() => {
    let cancelled = false
    getSellerAdvertising()
      .then((d) => {
        if (!cancelled) setReminder(d.reminders.find((r) => !r.read_at) ?? null)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  if (!reminder) return null
  const full = reminder.threshold >= 100
  return (
    <div
      role="status"
      className={
        'mb-5 flex flex-wrap items-center gap-3 rounded-2xl border-2 px-5 py-4 text-sm ' +
        (full ? 'border-red-300 bg-red-50 text-red-950' : 'border-amber-300 bg-amber-50 text-amber-950')
      }
    >
      <Megaphone className="size-5 shrink-0" />
      <p className="min-w-[12rem] flex-1">
        <strong>{reminder.threshold}% of your advertising budget is used.</strong> {reminder.message}
      </p>
      <Link to="/seller/advertising" className="inline-flex items-center gap-1 font-semibold underline">
        {full ? 'Buy a new package' : 'Buy another package'}
        <ArrowRight className="size-4" />
      </Link>
    </div>
  )
}

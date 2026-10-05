import { cn } from '@/lib/utils'

/** 0–4: length, mixed case, digits and symbols. Under 8 characters is 0. */
function passwordScore(password: string): number {
  if (password.length < 8) return 0
  let score = 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1
  else if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 0.5
  return Math.min(4, Math.floor(score))
}

const levels = [
  { label: 'Too short', bar: 'bg-destructive' },
  { label: 'Okay', bar: 'bg-amber-500' },
  { label: 'Good', bar: 'bg-lime-500' },
  { label: 'Strong', bar: 'bg-emerald-500' },
  { label: 'Excellent', bar: 'bg-emerald-600' },
]

/** Four bars that fill as the password gets stronger. Renders nothing until typing starts. */
export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null
  const score = passwordScore(password)
  const filled = score === 0 ? 1 : score
  return (
    <div className="flex items-center gap-3 pt-1" aria-live="polite">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors duration-300',
              step <= filled ? levels[score].bar : 'bg-muted',
            )}
          />
        ))}
      </div>
      <span className="w-16 text-right text-xs font-medium text-muted-foreground">
        {levels[score].label}
      </span>
    </div>
  )
}

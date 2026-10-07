import { ArrowLeft, ArrowRight, Check, LoaderCircle, MapPin, Store, Truck } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { listCountries, type Country } from '@/api/countries'
import { checkShopSlug, registerSeller } from '@/api/sellers'
import { FormAlert } from '@/components/common/form-alert'
import { Dot, Sparkle } from '@/components/common/storefront-decor'
import { Button } from '@/components/ui/button'
import { shopCategories, signupSteps } from '@/features/auth/seller-signup/options'
import {
  buildRegisterRequest,
  clearDraft,
  initialSignupState,
  loadDraft,
  publicLocationText,
  saveDraft,
  validateStep,
  type SignupState,
  type SlugStatus,
} from '@/features/auth/seller-signup/signup-state'
import { AddressesStep } from '@/features/auth/seller-signup/steps/addresses-step'
import { BusinessStep } from '@/features/auth/seller-signup/steps/business-step'
import { ContactStep } from '@/features/auth/seller-signup/steps/contact-step'
import { DeliveryStep } from '@/features/auth/seller-signup/steps/delivery-step'
import { ReviewStep } from '@/features/auth/seller-signup/steps/review-step'
import { ShopStep } from '@/features/auth/seller-signup/steps/shop-step'
import { VerificationStep } from '@/features/auth/seller-signup/steps/verification-step'
import { ApiError, getErrorMessage } from '@/lib/api'
import { formatPriceAmount, majorToMinor } from '@/lib/money'
import { cn } from '@/lib/utils'

const SHOP_STEP = 3
const LAST_STEP = signupSteps.length - 1
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Which step to send the seller back to for a server error, by what the message mentions. */
function stepForServerError(err: unknown): number | null {
  if (!(err instanceof ApiError)) return null
  const message = err.message.toLowerCase()
  if (err.status === 403) return 0
  if (message.includes('slug') || message.includes('shop name')) return SHOP_STEP
  if (err.status === 409 || message.includes('email') || message.includes('password') || message.includes('phone')) return 1
  if (message.includes('delivery') || message.includes('band') || message.includes('zone')) return 4
  if (message.includes('address') || message.includes('latitude')) return 2
  if (message.includes('website') || message.includes('support email') || message.includes('categor') || message.includes('timezone')) return SHOP_STEP
  if (message.includes('identifier') || message.includes('registration') || message.includes('tax') || message.includes('legal name')) return 0
  return null
}

export function SellerSignupWizard() {
  const navigate = useNavigate()
  const [draft] = useState(loadDraft)
  const [state, setState] = useState<SignupState>(() => draft?.state ?? initialSignupState())
  const [step, setStep] = useState(() => draft?.step ?? 0)
  const [furthest, setFurthest] = useState(() => draft?.step ?? 0)
  const [countries, setCountries] = useState<Country[]>([])
  const [countriesError, setCountriesError] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [blockedByCountry, setBlockedByCountry] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [slugResult, setSlugResult] = useState<{ slug: string; status: SlugStatus }>({
    slug: '',
    status: 'idle',
  })
  const formTop = useRef<HTMLDivElement>(null)

  const country = useMemo(
    () => countries.find((item) => item.id === state.countryId) ?? null,
    [countries, state.countryId],
  )
  const blockedMessage = state.countryId ? blockedByCountry[state.countryId] : undefined

  const slugStatus: SlugStatus = !slugPattern.test(state.shopSlug)
    ? 'idle'
    : slugResult.slug === state.shopSlug
      ? slugResult.status
      : 'checking'

  useEffect(() => {
    let cancelled = false
    listCountries()
      .then((list) => {
        if (!cancelled) setCountries(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        if (!cancelled) setCountriesError(getErrorMessage(err, 'Could not load countries.'))
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    saveDraft(step, state)
  }, [step, state])

  useEffect(() => {
    const slug = state.shopSlug
    if (!slugPattern.test(slug)) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      checkShopSlug(slug, controller.signal)
        .then((result) =>
          setSlugResult({ slug, status: result.available ? 'available' : 'taken' }),
        )
        .catch(() => {
          if (!controller.signal.aborted) setSlugResult({ slug, status: 'error' })
        })
    }, 400)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [state.shopSlug])

  function update(patch: Partial<SignupState>) {
    setState((current) => {
      const next = { ...current, ...patch }
      if (patch.countryId !== undefined && patch.countryId !== current.countryId) {
        const previous = countries.find((item) => item.id === current.countryId)
        const chosen = countries.find((item) => item.id === patch.countryId)
        // Follow the new country unless the seller picked a time zone themselves.
        if (chosen && (!current.timezone || current.timezone === previous?.default_timezone)) {
          next.timezone = chosen.default_timezone
        }
      }
      return next
    })
    if (errors.length) setErrors([])
    if (submitError) setSubmitError(null)
  }

  function goTo(target: number) {
    setStep(target)
    setFurthest((value) => Math.max(value, target))
    setErrors([])
    formTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function stepErrors(index: number): string[] {
    return validateStep(index, state, { country, slugStatus })
  }

  async function submit() {
    for (let index = 0; index <= LAST_STEP; index++) {
      const found = stepErrors(index)
      if (found.length) {
        goTo(index)
        setErrors(found)
        return
      }
    }
    if (!country) return

    setIsSubmitting(true)
    setSubmitError(null)
    let registered = false
    try {
      await registerSeller(buildRegisterRequest(state, country))
      registered = true
      clearDraft()
      navigate(`/seller/verify-email?email=${encodeURIComponent(state.email.trim())}`, { replace: true })
    } catch (err) {
      if (registered) {
        navigate(`/seller/verify-email?email=${encodeURIComponent(state.email.trim())}`, { replace: true })
        return
      }
      const message = getErrorMessage(err, 'Registration failed.')
      if (err instanceof ApiError && err.status === 403 && state.countryId) {
        setBlockedByCountry((current) => ({ ...current, [state.countryId]: message }))
      }
      const target = stepForServerError(err)
      if (target !== null && target !== step) {
        goTo(target)
        setErrors([message])
      } else {
        setSubmitError(message)
      }
      setIsSubmitting(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    if (blockedMessage) {
      setErrors([blockedMessage])
      return
    }
    if (step === LAST_STEP) {
      void submit()
      return
    }
    const found = stepErrors(step)
    if (found.length) {
      setErrors(found)
      formTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    goTo(step + 1)
  }

  const current = signupSteps[step]
  const stepProps = { state, update, country, countries, disabled: isSubmitting }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_18rem]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="mb-4 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold tracking-[0.14em] text-brand-ink uppercase dark:text-foreground">
            <span>
              Step {step + 1} of {signupSteps.length}
            </span>
            <span>{Math.round(((step + 1) / signupSteps.length) * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-sm bg-brand-ink/10">
            <div
              className="h-full bg-brand-violet transition-all"
              style={{ width: `${((step + 1) / signupSteps.length) * 100}%` }}
            />
          </div>
        </div>
        <ol className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {signupSteps.map((item, index) => {
            const Icon = item.icon
            const done = index < step
            const reachable = index <= furthest && !isSubmitting
            return (
              <li key={item.title} className="shrink-0">
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => goTo(index)}
                  aria-current={index === step ? 'step' : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                    index === step ? 'bg-brand-ink text-white' : 'hover:bg-accent',
                    !reachable && 'cursor-default opacity-50 hover:bg-transparent',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-md',
                      index === step
                        ? 'bg-brand-teal text-brand-ink'
                        : done
                          ? 'bg-brand-violet text-white'
                          : 'bg-accent text-brand-ink/60',
                    )}
                  >
                    {done ? <Check className="size-4" /> : <Icon className="size-4" />}
                  </span>
                  <span className="hidden min-w-0 sm:block">
                    <span className="block text-sm font-bold">{item.title}</span>
                    <span
                      className={cn(
                        'block truncate text-xs',
                        index === step ? 'text-white/65' : 'text-muted-foreground',
                      )}
                    >
                      {item.caption}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
        <p className="mt-4 hidden text-xs leading-relaxed text-muted-foreground lg:block">
          Progress is kept in this browser tab. Passwords are never saved.
        </p>
      </aside>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="min-w-0 rounded-[1.75rem] border border-brand-ink/20 bg-card p-5 sm:p-8"
      >
        <div ref={formTop} className="scroll-mt-6 space-y-3 pb-6">
          <p className="w-fit rounded-md bg-brand-ink px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-white uppercase">
            Step {step + 1} &middot; {current.title}
          </p>
          <h2 className="font-poster text-3xl text-brand-ink sm:text-4xl dark:text-foreground">
            <span className="marker-underline">{current.heading}</span>
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{current.intro}</p>
        </div>

        {countriesError && step === 0 ? (
          <div className="mb-6">
            <FormAlert error={countriesError} />
          </div>
        ) : null}
        {errors.length ? (
          <div
            role="alert"
            className="mb-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive ring-1 ring-destructive/25"
          >
            <p className="font-medium">Please check the following:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {blockedMessage && step === 0 && !errors.length ? (
          <div className="mb-6">
            <FormAlert error={blockedMessage} />
          </div>
        ) : null}

        {step === 0 ? <BusinessStep {...stepProps} /> : null}
        {step === 1 ? <ContactStep {...stepProps} /> : null}
        {step === 2 ? <AddressesStep {...stepProps} /> : null}
        {step === 3 ? <ShopStep {...stepProps} slugStatus={slugStatus} /> : null}
        {step === 4 ? <DeliveryStep {...stepProps} /> : null}
        {step === 5 ? <VerificationStep /> : null}
        {step === 6 ? <ReviewStep {...stepProps} onEdit={goTo} /> : null}

        {submitError ? (
          <div className="mt-6">
            <FormAlert error={submitError} />
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-border/60 pt-6">
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="h-12 border-2 border-brand-ink px-5"
              onClick={() => goTo(step - 1)}
              disabled={isSubmitting}
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
          ) : (
            <Link to="/seller/login" className="text-sm text-muted-foreground hover:text-foreground">
              Already registered? <span className="font-medium text-primary">Sign in</span>
            </Link>
          )}
          <Button type="submit" className="h-12 px-6" disabled={isSubmitting || Boolean(blockedMessage)}>
            {isSubmitting ? (
              <>
                <LoaderCircle className="animate-spin" />
                Creating account…
              </>
            ) : step === LAST_STEP ? (
              'Create seller account'
            ) : (
              <>
                Continue
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      </form>

      <ShopPreview state={state} country={country} />
    </div>
  )
}

function ShopPreview({ state, country }: { state: SignupState; country: Country | null }) {
  const firstBand = state.bands[0]
  const currency = country?.default_currency ?? ''
  const price = firstBand ? Number(firstBand.price_major) : NaN
  const delivery =
    firstBand && firstBand.max_km && currency && Number.isFinite(price) && firstBand.price_major.trim()
      ? `${price === 0 ? 'Free' : formatPriceAmount(majorToMinor(price, currency), currency)} within ${firstBand.max_km} km`
      : 'Set up on the delivery step'
  const location = country ? publicLocationText(state, country.name) : ''
  const categories = state.categories
    .map((value) => shopCategories.find((item) => item.value === value)?.label ?? value)
    .slice(0, 3)

  return (
    <aside className="hidden xl:sticky xl:top-6 xl:block xl:self-start">
      <p className="mb-3 text-[11px] font-bold tracking-[0.16em] text-brand-ink uppercase dark:text-foreground">
        Live shop preview
      </p>
      <div className="overflow-hidden rounded-[1.5rem] border border-brand-ink/20 bg-card">
        <div className="relative h-24 bg-brand-violet">
          <Sparkle className="absolute top-4 right-6 size-6 text-brand-teal" />
          <Dot className="absolute right-16 bottom-5 size-2.5 bg-white/60" />
        </div>
        <div className="space-y-3 p-4">
          <div className="relative -mt-11 flex size-14 items-center justify-center rounded-xl bg-brand-ink text-white ring-4 ring-card">
            <Store className="size-6" />
          </div>
          <div>
            <p className="font-display text-xl leading-tight">{state.shopName.trim() || 'Your shop name'}</p>
            <p className="truncate text-xs text-muted-foreground">
              sendagift/shop/{state.shopSlug || 'your-shop'}
            </p>
          </div>
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {state.description.trim() || 'Your shop story will appear here.'}
          </p>
          {categories.length ? (
            <div className="flex flex-wrap gap-1.5">
              {categories.map((label) => (
                <span key={label} className="rounded-md bg-brand-teal px-2 py-0.5 text-[11px] font-bold text-brand-ink">
                  {label}
                </span>
              ))}
            </div>
          ) : null}
          <div className="space-y-1.5 border-t border-border/60 pt-3 text-xs text-muted-foreground">
            <p className="flex items-center gap-2">
              <MapPin className="size-3.5 shrink-0" />
              {location || 'Location shown after your addresses'}
            </p>
            <p className="flex items-center gap-2">
              <Truck className="size-3.5 shrink-0" />
              {delivery}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}

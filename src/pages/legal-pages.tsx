import { ArrowRight, FileText, Info, Square } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'

import { BackLink } from '@/components/common/back-link'
import { SiteLayout } from '@/components/common/site-layout'
import { Dot, Marker, Sparkle } from '@/components/common/storefront-decor'
import { storefrontFrameClass } from '@/components/common/site-styles'
import {
  audienceLabels,
  policies,
  policyBySlug,
  type Policy,
  type PolicyAudience,
  type PolicyBlock,
} from '@/features/legal/policies'
import { cn } from '@/lib/utils'

/** Short forms that stay in capitals when a value is written as plain text. */
const ACRONYMS: Record<string, string> = {
  id: 'ID',
  url: 'URL',
  sku: 'SKU',
  skus: 'SKUs',
  sms: 'SMS',
  otp: 'OTP',
  iso: 'ISO',
  crm: 'CRM',
}

/** "OPERATOR LEGAL NAME" → "operator legal name", keeping acronyms. */
function plainValue(value: string) {
  const letters = value.replace(/[^A-Za-z]/g, '')
  // Already written in mixed case: leave it as drafted.
  if (letters !== letters.toUpperCase()) return value
  return value
    .toLowerCase()
    .replace(/[a-z]+/g, (word) => ACRONYMS[word] ?? word)
}

/**
 * Values still to be filled in were drafted as "[OPERATOR LEGAL NAME]". They
 * show as ordinary words in the sentence, with no brackets, so the page
 * reads as text. The draft notice at the top says they are still being
 * finalised.
 */
function Filled({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\])/g)
  let before = ''
  return (
    <>
      {parts.map((part, index) => {
        let out = part
        if (/^\[[^\]]+\]$/.test(part)) {
          out = plainValue(part.slice(1, -1))
          // A value that opens a sentence starts with a capital.
          if (before.trim() === '' || /[.!?:]\s*$/.test(before)) {
            out = out.charAt(0).toUpperCase() + out.slice(1)
          }
        }
        before += out
        return <span key={index}>{out}</span>
      })}
    </>
  )
}

function hasPlaceholders(policy: Policy) {
  return JSON.stringify(policy).includes('[')
}

function Block({ block }: { block: PolicyBlock }) {
  if (typeof block === 'string') {
    return (
      <p className="leading-relaxed text-foreground/85">
        <Filled text={block} />
      </p>
    )
  }
  if ('list' in block) {
    return (
      <ul className="space-y-3">
        {block.list.map((item) => {
          // "Lead-in: rest" items read with the lead-in in bold, as in the PDFs.
          const match = item.match(/^([^:[]{3,90}):\s(.*)$/s)
          return (
            <li key={item} className="flex gap-3 leading-relaxed text-foreground/85">
              <span className="mt-2 size-2 shrink-0 rotate-45 rounded-[2px] bg-brand-teal" />
              <span>
                {match ? (
                  <>
                    <strong className="font-bold text-foreground">{match[1]}:</strong>{' '}
                    <Filled text={match[2]} />
                  </>
                ) : (
                  <Filled text={item} />
                )}
              </span>
            </li>
          )
        })}
      </ul>
    )
  }
  if ('fields' in block) {
    return (
      <dl className="divide-y divide-brand-ink/10 overflow-hidden rounded-xl border-2 border-brand-ink/10 bg-muted/40">
        {block.fields.map(([label, value]) => (
          <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,16rem)_1fr] sm:gap-4">
            <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
            <dd className="text-sm">
              <Filled text={value} />
            </dd>
          </div>
        ))}
      </dl>
    )
  }
  return (
    <p className="flex gap-3 rounded-xl border-2 border-dashed border-brand-violet/40 bg-brand-violet/5 px-4 py-3.5 leading-relaxed">
      <Square className="mt-0.5 size-5 shrink-0 text-brand-violet" aria-hidden />
      <span>
        <Filled text={block.checkbox} />
      </span>
    </p>
  )
}

function DraftNotice({ policy }: { policy: Policy }) {
  if (!hasPlaceholders(policy) && !policy.version.includes('draft')) return null
  return (
    <div
      role="note"
      className="flex gap-3 rounded-2xl bg-brand-ink px-5 py-4 text-sm text-white"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-teal text-brand-ink">
        <Info className="size-4" />
      </span>
      <p className="leading-relaxed text-white/85">
        <strong className="font-bold text-white">Draft, not yet in effect.</strong>{' '}
        {policy.status.replace('every bracketed field', 'every detail')}. Some details
        are still being finalised.
      </p>
    </div>
  )
}

/** The violet band the policy pages open with, in the footer's own style. */
function Hero({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: ReactNode
  children?: ReactNode
}) {
  return (
    <section className="relative overflow-hidden bg-brand-violet text-white">
      <Sparkle className="absolute top-8 left-[6%] size-6 text-brand-teal" />
      <Sparkle className="absolute right-[8%] bottom-8 size-9 text-white/90" />
      <Dot className="absolute top-10 right-[24%] size-3 bg-brand-teal" />
      <Dot className="absolute bottom-10 left-[30%] size-2.5 bg-white/60" />
      <div className={cn(storefrontFrameClass, 'relative py-12 lg:py-16')}>
        <p className="inline-flex rounded-md bg-white/15 px-2.5 py-1 text-[11px] font-bold tracking-[0.18em] text-white uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-4 max-w-3xl font-poster text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {children}
      </div>
    </section>
  )
}

const tileTones = [
  'bg-brand-teal text-brand-ink',
  'bg-brand-violet text-white',
  'bg-brand-ink text-white',
]

/** Every policy, grouped by who it is for. */
export function LegalIndexPage() {
  const groups: PolicyAudience[] = ['customer', 'seller', 'notice']
  return (
    <SiteLayout>
      <Hero
        eyebrow="Legal"
        title={
          <>
            Policies and <Marker tone="ink">terms</Marker>
          </>
        }
      >
        <p className="mt-5 max-w-2xl text-lg text-white/85">
          How SendAGift handles your information, your orders, deliveries, refunds, free gifts and
          complaints, in plain words.
        </p>
      </Hero>
      <main className={cn(storefrontFrameClass, 'space-y-14 py-12 lg:py-16')}>
        {groups.map((group) => (
          <section key={group}>
            <h2 className="mb-6 flex items-center gap-3 font-poster text-2xl">
              <span className="h-6 w-1.5 rounded-full bg-brand-teal" />
              {audienceLabels[group]}
            </h2>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {policies
                .filter((policy) => policy.audience === group)
                .map((policy, index) => (
                  <li key={policy.slug}>
                    <Link
                      to={`/legal/${policy.slug}`}
                      className="group flex h-full flex-col gap-4 rounded-2xl border-2 border-brand-ink/10 bg-card p-6 transition-all hover:-translate-y-1 hover:border-brand-ink hover:shadow-[0_10px_0_-4px_rgba(15,27,69,0.12)]"
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span
                          className={cn(
                            'flex size-12 items-center justify-center rounded-xl',
                            tileTones[index % tileTones.length],
                          )}
                        >
                          <FileText className="size-6" />
                        </span>
                        <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                          {policy.docId}
                        </span>
                      </span>
                      <span className="font-poster text-xl leading-tight">{policy.title}</span>
                      <span className="flex-1 text-sm leading-relaxed text-muted-foreground">
                        {policy.summary}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-violet">
                        Read the policy
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </main>
    </SiteLayout>
  )
}

/** The section the reader is in, for the side list. */
function useActiveSection(count: number) {
  const [active, setActive] = useState(1)
  useEffect(() => {
    if (count < 2) return
    const elements = Array.from({ length: count }, (_, i) =>
      document.getElementById(`section-${i + 1}`),
    ).filter((el): el is HTMLElement => el !== null)
    if (elements.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        // The topmost section that is on screen.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(Number(visible[0].target.id.replace('section-', '')))
      },
      { rootMargin: '-120px 0px -60% 0px' },
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [count])
  return active
}

/** One policy, with its sections listed alongside on wide screens. */
export function PolicyPage() {
  const { slug } = useParams()
  const policy = policyBySlug(slug)
  const active = useActiveSection(policy?.sections.length ?? 0)
  if (!policy) return <Navigate to="/legal" replace />

  return (
    <SiteLayout>
      <Hero eyebrow={`${audienceLabels[policy.audience]} · ${policy.docId}`} title={policy.title}>
        <p className="mt-5 max-w-2xl text-lg text-white/85">{policy.summary}</p>
        <dl className="mt-7 flex flex-wrap gap-2.5 text-sm">
          <div className="flex gap-2 rounded-lg bg-white/15 px-3 py-1.5">
            <dt className="text-white/70">Version</dt>
            <dd className="font-semibold">{policy.version}</dd>
          </div>
          <div className="flex gap-2 rounded-lg bg-white/15 px-3 py-1.5">
            <dt className="text-white/70">Updated</dt>
            <dd className="font-semibold">{policy.updated}</dd>
          </div>
          {policy.effective ? (
            <div className="flex gap-2 rounded-lg bg-white/15 px-3 py-1.5">
              <dt className="text-white/70">Effective</dt>
              <dd className="font-semibold">
                <Filled text={policy.effective} />
              </dd>
            </div>
          ) : null}
        </dl>
      </Hero>

      <main className={cn(storefrontFrameClass, 'py-10 lg:py-14')}>
        <BackLink to="/legal" label="All policies" className="mb-8" />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
          {policy.sections.length > 1 ? (
            <nav aria-label="Sections" className="hidden lg:block">
              <div className="sticky top-28 space-y-1">
                <p className="mb-3 text-[11px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                  On this page
                </p>
                {policy.sections.map((section, index) => (
                  <a
                    key={section.heading}
                    href={`#section-${index + 1}`}
                    aria-current={active === index + 1 ? 'true' : undefined}
                    className={cn(
                      'flex gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                      active === index + 1
                        ? 'bg-brand-ink font-semibold text-white'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'w-5 shrink-0 font-poster',
                        active === index + 1 ? 'text-brand-teal' : 'text-brand-violet',
                      )}
                    >
                      {index + 1}
                    </span>
                    {section.heading}
                  </a>
                ))}
              </div>
            </nav>
          ) : (
            <div className="hidden lg:block" />
          )}

          <article className="max-w-3xl space-y-6">
            <DraftNotice policy={policy} />
            {policy.intro.length ? (
              <div className="space-y-4 rounded-2xl bg-brand-violet/5 p-6 text-lg sm:p-7">
                {policy.intro.map((block, index) => (
                  <Block key={index} block={block} />
                ))}
              </div>
            ) : null}
            {policy.sections.map((section, index) => (
              <section
                key={section.heading}
                id={`section-${index + 1}`}
                className="scroll-mt-28 space-y-4 rounded-2xl border-2 border-brand-ink/10 bg-card p-6 sm:p-8"
              >
                <h2 className="flex items-center gap-3 font-poster text-2xl leading-tight">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal text-lg text-brand-ink">
                    {index + 1}
                  </span>
                  {section.heading}
                </h2>
                {section.blocks.map((block, blockIndex) => (
                  <Block key={blockIndex} block={block} />
                ))}
              </section>
            ))}
          </article>
        </div>
      </main>
    </SiteLayout>
  )
}

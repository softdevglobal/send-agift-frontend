import { useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  Building2,
  ExternalLink,
  FileText,
  Landmark,
  LoaderCircle,
  MapPin,
  ScrollText,
  Store,
  Truck,
  UserRound,
  type LucideIcon,
} from 'lucide-react'

import { getAdminSellerDocumentUrl } from '@/api/admin'
import type { ApplicationAddress, SellerApplicationRecord } from '@/api/types'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/features/admin/admin-utils'
import {
  countryName,
  entityTypes,
  giftOptionChoices,
  labelOf,
  languages,
  publicLocations,
  registrationStatuses,
  representativeRoles,
  shopCategories,
  weekDays,
} from '@/features/auth/seller-application/options'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

const pairs = <T extends { value: string; label: string }>(list: readonly T[]) =>
  list.map((x) => [x.value, x.label] as const)

const taxLabels = [
  ['registered', 'Registered'],
  ['not_registered', 'Not registered'],
  ['unsure', 'Not sure'],
] as const

const yesNo = (v: boolean) => (v ? 'Yes' : 'No')

function addressText(a: ApplicationAddress) {
  return [
    a.line1,
    a.line2,
    a.city,
    a.region,
    a.postal_code,
    a.country === 'ZZ' ? a.country_other : countryName(a.country),
  ]
    .filter(Boolean)
    .join(', ')
}

/** Everything a seller gave in their application, laid out for review. */
export function SellerApplicationReview({
  sellerId,
  application: a,
}: {
  sellerId: string
  application: SellerApplicationRecord
}) {
  const b = a.business
  const r = a.representative
  const s = a.shop
  const f = a.fulfilment
  const currency = s.currency

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Application</p>
        <p className="text-xs text-muted-foreground">Sent {formatDate(a.submitted_at)}</p>
      </div>

      {a.review_reasons.length > 0 ? (
        <div className="rounded-2xl bg-amber-50 p-3.5 ring-1 ring-amber-200">
          <p className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="size-4" />
            Check closely
          </p>
          <ul className="space-y-1 pl-6 text-sm text-amber-900/90">
            {a.review_reasons.map((reason) => (
              <li key={reason} className="list-disc">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Card icon={Building2} title="Business">
        <Row label="Country">{countryName(b.country)}</Row>
        <Row label="Type">
          {b.entity_type === 'other'
            ? `Other: ${b.entity_type_other ?? ''}`
            : labelOf(pairs(entityTypes), b.entity_type)}
        </Row>
        <Row label="Legal name">{b.legal_name}</Row>
        <Row label="Local name">{b.local_name}</Row>
        <Row label="Trading name">{b.trading_name}</Row>
        <Row label="Registration">
          {labelOf(pairs(registrationStatuses), b.registration_status)}
        </Row>
        {b.identifiers.map((id, i) => (
          <Row key={i} label={i === 0 ? 'Identifier' : 'Also'}>
            <span className="font-mono text-[13px]">{id.value}</span>{' '}
            <span className="text-muted-foreground">
              {id.type === 'OTHER' ? id.type_label : id.type}
            </span>
            {id.authority || id.jurisdiction ? (
              <span className="block text-xs text-muted-foreground">
                {[id.authority, id.jurisdiction].filter(Boolean).join(' · ')}
              </span>
            ) : null}
          </Row>
        ))}
        {b.registration_note ? <Row label="Their note">{b.registration_note}</Row> : null}
        <Row label="Tax">{labelOf(taxLabels, b.tax_status)}</Row>
        {b.tax_registrations.map((t, i) => (
          <Row key={i} label={countryName(t.country)}>
            {t.scheme}: <span className="font-mono text-[13px]">{t.number}</span>
            {t.jurisdiction ? (
              <span className="text-muted-foreground"> · {t.jurisdiction}</span>
            ) : null}
          </Row>
        ))}
      </Card>

      <Card icon={UserRound} title="Representative">
        <Row label="Name">{r.full_name}</Row>
        <Row label="Role">{labelOf(pairs(representativeRoles), r.role)}</Row>
        <Row label="Job title">{r.job_title}</Row>
        <Row label="Language">
          {r.language === 'other' ? r.language_other : labelOf(languages, r.language)}
        </Row>
        <Row label="Authorised">{yesNo(r.authority_confirmed)}</Row>
      </Card>

      <Card icon={MapPin} title="Addresses">
        <Row label="Registered">{addressText(a.addresses.registered)}</Row>
        <Row label="Pickup">
          {a.addresses.pickup_same_as_registered
            ? 'Same as registered'
            : addressText(a.addresses.pickup)}
        </Row>
        <Row label="Returns">
          {a.addresses.return_same_as_pickup ? 'Same as pickup' : addressText(a.addresses.return)}
        </Row>
      </Card>

      <Card icon={Store} title="Shop">
        <Row label="Name">{s.display_name}</Row>
        <Row label="Web address">/shop/{s.slug}</Row>
        <Row label="About">
          <span className="whitespace-pre-line">{s.description}</span>
        </Row>
        <Row label="Sells">
          <Tags values={s.categories.map((c) => labelOf(shopCategories, c))} />
        </Row>
        <Row label="Extras">
          {s.gift_options.length ? (
            <Tags values={s.gift_options.map((g) => labelOf(giftOptionChoices, g))} />
          ) : null}
        </Row>
        <Row label="Website">
          {s.website ? (
            <a
              href={s.website}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="break-all text-primary hover:underline"
            >
              {s.website}
            </a>
          ) : null}
        </Row>
        <Row label="Currency">{s.currency}</Row>
        <Row label="Time zone">{s.time_zone.replace(/_/g, ' ')}</Row>
        <Row label="Support email">{s.support_email}</Row>
        <Row label="Shows">{labelOf(pairs(publicLocations), s.public_location)}</Row>
      </Card>

      <Card icon={Truck} title="Delivery & returns">
        <Row label="Delivers">{yesNo(f.delivery_enabled)}</Row>
        {f.delivery_enabled ? (
          <Row label="Bands">
            <table className="w-full text-[13px]">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="font-medium">Up to</th>
                  <th className="font-medium">Price</th>
                  <th className="font-medium">Days</th>
                </tr>
              </thead>
              <tbody>
                {f.bands.map((band, i) => (
                  <tr key={i}>
                    <td>{band.up_to_km} km</td>
                    <td>{band.fee === 0 ? 'Free' : `${currency} ${band.fee}`}</td>
                    <td>{band.days === 0 ? 'Same day' : band.days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Row>
        ) : null}
        {f.delivery_enabled ? <Row label="Order cutoff">{f.order_cutoff}</Row> : null}
        <Row label="Delivery notes">{f.delivery_notes}</Row>
        <Row label="Pickup">{yesNo(f.pickup_enabled)}</Row>
        <Row label="Pickup steps">{f.pickup_instructions}</Row>
        <Row label="Working days">{f.working_days.map((d) => labelOf(weekDays, d)).join(', ')}</Row>
        <Row label="Returns">
          <span className="whitespace-pre-line">{f.returns_policy}</span>
        </Row>
        <Row label="International">{f.cross_border_interest ? 'Interested' : 'No'}</Row>
      </Card>

      <Card icon={Landmark} title="Verification & payouts">
        <Row label="Document">
          <DocumentLink sellerId={sellerId} document={a.document} />
        </Row>
        <Row label="Bank country">
          {a.payout.bank_country === 'ZZ'
            ? a.payout.bank_country_other
            : countryName(a.payout.bank_country)}
        </Row>
        <Row label="Payout currency">{a.payout.currency}</Row>
      </Card>

      <Card icon={ScrollText} title="Consents">
        <Row label="Details accurate">{yesNo(a.consents.details_confirmed)}</Row>
        <Row label="Seller terms">{yesNo(a.consents.terms_accepted)}</Row>
        <Row label="Marketing">{yesNo(a.consents.marketing_opt_in)}</Row>
      </Card>
    </div>
  )
}

function DocumentLink({
  sellerId,
  document,
}: {
  sellerId: string
  document: SellerApplicationRecord['document']
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!document) return <span className="text-muted-foreground">Not uploaded</span>

  async function open() {
    // Open the tab now so the browser doesn't block it as a popup.
    const tab = window.open('', '_blank')
    setBusy(true)
    setError(null)
    try {
      const { url } = await getAdminSellerDocumentUrl(sellerId)
      if (tab) {
        tab.opener = null
        tab.location.href = url
      } else {
        window.location.assign(url)
      }
    } catch (err) {
      tab?.close()
      setError(getErrorMessage(err, 'Could not open the document.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={open}
        disabled={busy}
        className="h-auto max-w-full justify-start gap-2 rounded-xl py-2 text-left"
      >
        {busy ? <LoaderCircle className="animate-spin" /> : <FileText />}
        <span className="min-w-0 truncate">{document.name}</span>
        <ExternalLink className="text-muted-foreground" />
      </Button>
      <p className="text-xs text-muted-foreground">Uploaded {formatDate(document.uploaded_at)}</p>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl bg-muted/30 p-4 ring-1 ring-border/50">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className="flex size-7 items-center justify-center rounded-lg bg-background text-primary ring-1 ring-border/60">
          <Icon className="size-3.5" />
        </span>
        {title}
      </h4>
      <dl className="grid grid-cols-[minmax(0,7.5rem)_1fr] gap-x-3 gap-y-2 text-sm">{children}</dl>
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  const empty = children === null || children === undefined || children === ''
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('min-w-0 break-words', empty && 'text-muted-foreground')}>
        {empty ? 'Not given' : children}
      </dd>
    </>
  )
}

function Tags({ values }: { values: string[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <span
          key={v}
          className="rounded-full bg-background px-2 py-0.5 text-xs ring-1 ring-border/60"
        >
          {v}
        </span>
      ))}
    </span>
  )
}

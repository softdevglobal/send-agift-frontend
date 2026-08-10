import type { LucideIcon } from 'lucide-react'

type FeatureItem = {
  icon: LucideIcon
  title: string
  description: string
}

type FeatureBarProps = {
  items: FeatureItem[]
}

export function FeatureBar({ items }: FeatureBarProps) {
  return (
    <section className="border-y border-border/70 bg-background">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8 lg:py-10">
        {items.map((item) => (
          <div key={item.title} className="flex items-start gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
              <item.icon className="size-5" strokeWidth={1.6} />
            </span>
            <div>
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

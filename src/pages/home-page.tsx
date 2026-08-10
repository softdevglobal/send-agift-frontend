import { Gift } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function HomePage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Gift className="size-6" />
          </div>
          <CardTitle className="text-2xl">Send A Gift</CardTitle>
          <CardDescription>
            React + Vite + Tailwind CSS + shadcn/ui is ready. Start building
            your features under <code className="text-foreground">src/features</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center gap-3">
          <Button>Get started</Button>
          <Button variant="outline" asChild>
            <a
              href="https://ui.shadcn.com/docs"
              target="_blank"
              rel="noreferrer"
            >
              shadcn docs
            </a>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

import { useState, type FormEvent } from 'react'
import { ArrowLeft, LoaderCircle } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { registerAdmin } from '@/api/auth'
import { BrandLogo } from '@/components/common/brand-logo'
import { FormAlert } from '@/components/common/form-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoginBrandPanel } from '@/features/auth/login-brand-panel'
import { getErrorMessage } from '@/lib/api'
import { optionalString } from '@/lib/form'

export function AuthAdminRegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [bootstrapSecret, setBootstrapSecret] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await registerAdmin(
        {
          email: email.trim(),
          password,
          display_name: displayName.trim(),
          image_url: optionalString(imageUrl),
        },
        bootstrapSecret.trim() || undefined,
      )
      setNotice(`${result.message} (${result.id})`)
      window.setTimeout(() => {
        navigate('/admin/login?registered=1', { replace: true })
      }, 900)
    } catch (err) {
      setError(getErrorMessage(err, 'Admin registration failed.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-svh bg-background">
      <LoginBrandPanel role="admin" />

      <section className="relative flex flex-1 flex-col bg-grain bg-cream/60">
        <header className="flex items-center justify-between gap-4 px-6 py-5 sm:px-10">
          <div className="flex items-center gap-4">
            <Link
              to="/admin/login"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back
            </Link>
            <BrandLogo className="lg:hidden" imgClassName="h-11" />
          </div>
          <Link
            to="/admin/login"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Admin login
          </Link>
        </header>

        <div className="flex flex-1 items-start px-6 py-8 sm:items-center sm:px-10">
          <form
            onSubmit={handleSubmit}
            className="animate-fade-up mx-auto w-full max-w-[24rem] space-y-6"
            noValidate
          >
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                Admin bootstrap
              </p>
              <h2 className="font-display text-3xl tracking-tight">
                Create an admin account
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                After the first admin exists, the backend requires
                X-Bootstrap-Secret.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-display-name">Display name</Label>
                <Input
                  id="admin-display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="h-11 bg-surface px-3"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 bg-surface px-3"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 bg-surface px-3"
                  required
                  minLength={8}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-image">Image URL</Label>
                <Input
                  id="admin-image"
                  type="url"
                  placeholder="https://"
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  className="h-11 bg-surface px-3"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-bootstrap-secret">Bootstrap secret</Label>
                <Input
                  id="admin-bootstrap-secret"
                  type="password"
                  autoComplete="off"
                  placeholder="Required after the first admin"
                  value={bootstrapSecret}
                  onChange={(event) => setBootstrapSecret(event.target.value)}
                  className="h-11 bg-surface px-3"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="h-11 w-full text-sm"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Creating admin…
                </>
              ) : (
                'Create admin'
              )}
            </Button>

            <FormAlert error={error} notice={notice} />
          </form>
        </div>
      </section>
    </main>
  )
}

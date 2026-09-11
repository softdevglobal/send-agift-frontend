import { LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type SignOutDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  /** Defaults to the customer-facing copy; the seller/admin shells pass their own. */
  description?: string
}

/** Confirmation before actually clearing the session — matches the seller/admin portals. */
export function SignOutDialog({
  open,
  onOpenChange,
  onConfirm,
  description = "You'll need to sign in again to check out, track orders, or message shops.",
}: SignOutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign out?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" className="h-10">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" className="h-10" onClick={onConfirm}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

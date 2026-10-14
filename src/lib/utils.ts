import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * A number for a form field: "" for nothing or 0, so fields open empty
 * rather than showing 0. Forms read an empty field back as 0.
 */
export function blankIfZero(value: number | null | undefined): string {
  return value ? String(value) : ''
}

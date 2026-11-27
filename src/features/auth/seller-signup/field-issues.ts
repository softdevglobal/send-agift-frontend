import { createContext, useContext } from 'react'

/**
 * The problems found on the current step, by field id. Fields read it to
 * turn red and show their own message underneath, so a seller can see
 * exactly which box needs fixing rather than reading a list at the top.
 */
export const FieldIssuesContext = createContext<ReadonlyMap<string, string>>(new Map())

/** The message for one field, or undefined when it is fine. */
export function useFieldIssue(id: string | undefined): string | undefined {
  const issues = useContext(FieldIssuesContext)
  return id ? issues.get(id) : undefined
}

/** The messages for several fields, once each, for a row holding several boxes. */
export function useFieldIssues(ids: string[]): string[] {
  const issues = useContext(FieldIssuesContext)
  return [...new Set(ids.map((id) => issues.get(id)).filter((message): message is string => !!message))]
}

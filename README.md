# Send A Gift Frontend

React + Vite + TypeScript app with Tailwind CSS v4 and shadcn/ui.

## Stack

- React 19 + Vite
- TypeScript
- Tailwind CSS v4
- shadcn/ui (Radix)
- React Router

## Getting started

```bash
npm install
npm run dev
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Lint the project |

## Folder structure

```text
src/
  app/                 # App shell: providers, router
  assets/              # Static images and media
  components/
    ui/                # shadcn/ui primitives
    common/            # Shared app components (layout, header, etc.)
  features/            # Feature modules (domain-specific UI + logic)
  hooks/               # Shared React hooks
  lib/                 # Shared utilities (cn, helpers)
  pages/               # Route-level page components
  services/            # API clients and external integrations
  types/               # Shared TypeScript types
  App.tsx              # Root app component
  main.tsx             # Entry point
  index.css            # Global styles + Tailwind + theme tokens
```

### Where to put new code

- **UI primitives** → `npx shadcn@latest add <component>` (lands in `components/ui`)
- **Reusable layout pieces** → `components/common`
- **Domain features** (e.g. gifts, checkout) → `features/<feature-name>`
- **Routes / screens** → `pages`
- **API calls** → `services`

## Add shadcn components

```bash
npx shadcn@latest add button input dialog
```

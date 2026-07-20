---
openbase_report:
  thread_id: 019f7cf0-e29d-7300-9da7-2d3bcb1a7f20
  thread_name: question-based-subscription-onboarding-prototype
  agent_name: Joseph
---

# Official Skills Catalog - Console and Electron

## Summary

Implemented the shared Openbase Coder product surface in `coder-react`, which is
used by both the browser console and the Electron app. The existing Skills page
now opens on an "Official Skills" tab for global browsing and keeps the existing
Installed and Printing Press views available.

The catalog is deliberately small and curated. It does not present itself as a
broad third-party marketplace.

## Implemented

- Added a typed curated catalog data model in `src/lib/official-skills-catalog.ts`.
- Added six catalog entries: Gmail, iMessage, WhatsApp, Reports, Routines, and
  Super Agents.
- Added a shared "Official Skills" tab to `src/pages/Skills.tsx`.
- Modeled per-skill setup pathways:
  - Gmail: OAuth and approved senders.
  - iMessage: local permissions, approved contacts, and import.
  - WhatsApp: pairing and approved contacts.
  - Reports/Routines: built-in console setup flows.
  - Super Agents: agent-guided onboarding/setup.
- Added one-click prototype actions that mark the selected setup pathway as
  ready for backend integration instead of using the generic Printing Press
  install endpoint.

## Screenshots

- `./.reports/screenshots/console-official-skills.png`
- `./.reports/screenshots/desktop-official-skills.png`

## Validation

- `pnpm --dir console lint`
- `pnpm --dir console build`
- `pnpm --dir desktop lint`
- `pnpm --dir desktop build`
- Playwright screenshot pass for browser console `/dashboard/skills` with mocked
  local auth and skills endpoints.
- Playwright screenshot pass for the desktop renderer `/#/dashboard/skills` with
  mocked local auth, health, onboarding status, skills endpoints, and Electron
  bridge APIs. The screenshot follows the onboarding click-through into the
  shared `coder-react` app.

`pnpm --dir desktop lint` reports existing fast-refresh warnings in onboarding
files outside this change; no errors were reported.

## Open Questions

- Full one-click install still needs backend/CLI handlers for each
  `integrationTarget`, especially Gmail OAuth, WhatsApp pairing, and iMessage
  local permission/import setup.
- The marketing site keeps a parallel static catalog copy for SEO today. A
  follow-up should generate both marketing and product catalog data from one
  reviewed source.

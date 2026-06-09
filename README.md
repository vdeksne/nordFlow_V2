# NordFlow CRM · StartSchool hackathon

NordFlow is a **demo-first CRM** (`npm`: **`crm-hackatons@0.1.0`**, MIT, private)-dark, mobile-aware UI for portfolio, leads, pipeline, tasks, `/today`, goals, dashboard KPIs, and a **copilot preview** (mock assistant, ⌘K / Ctrl+K). **CRM data** (customers, leads, deals, tasks) persists in **`localStorage`** unless you extend it; **`/dashboard`** is the primary entry (root redirects).

### Technical orientation

| Axis | Choices (see `package.json` for semver ranges) |
|------|-----------------------------------------------|
| **Framework** | [Next.js](https://nextjs.org) **16.2.6** - App Router, `next dev` / `next build` use **Turbopack**. |
| **UI runtime** | [React](https://react.dev) **19.2.4** + React DOM **19.2.4** |
| **Language** | [TypeScript](https://www.typescriptlang.org) **^5**, `strict` mode (`target` ES2017, `moduleResolution: bundler`) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com) **^4**, [`@tailwindcss/postcss`](https://tailwindcss.com/docs/installation/using-postcss) **^4**, [`tw-animate-css`](https://github.com/Wombosvideo/tw-animate-css) **^1.4** |
| **UI kit** | [`@base-ui/react`](https://base-ui.com) **^1.4**, [`class-variance-authority`](https://cva.style) **^0.7**, [`tailwind-merge`](https://github.com/dcastil/tailwind-merge) **^3**, [`clsx`](https://github.com/lukeed/clsx) **^2**, [`shadcn`](https://ui.shadcn.com/) CLI **^4.7**, [Lucide](https://lucide.dev) (`lucide-react` **^1.14**) |
| **Charts / CSV** | [Recharts](https://recharts.org) **^3.6** · [Papa Parse](https://www.papaparse.com) **^5.5** |
| **Auth path (optional)** | [Neon serverless driver](https://neon.tech/docs/serverless/serverless-driver) **`@neondatabase/serverless` ^1.1** · [jose](https://github.com/panva/jose) **^6.2** (JWT) · [bcryptjs](https://github.com/dcodeIO/bcrypt.js) **^3** |
| **Scaffold leftover** | [`@supabase/supabase-js`](https://supabase.com/docs/reference/javascript) **^2** - client stub only unless you plug Supabase in |
| **Quality & docs** | [ESLint](https://eslint.org) **^9** + [`eslint-config-next` 16.2.6](https://nextjs.org/docs/app/api-reference/config/eslint) · [Storybook](https://storybook.js.org) **^10.3** (`@storybook/nextjs-vite`) · [Vitest](https://vitest.dev) **^4.1** + [`@vitest/browser-playwright`](https://vitest.dev/guide/browser/playwright) · [Playwright](https://playwright.dev) **^1.60** · [Vite](https://vite.dev) **^8** (Storybook / Vitest host) |

**Note:** Versions above match the workspace `package.json` at authoring time (`^` and exact pins as declared there). Bump the table when you bump dependencies.

---

## Features

| Area | Notes |
|------|--------|
| **Dashboard** | Priority strips, charts (Recharts), live KPI strip |
| **Customers** | Table / responsive cards, detail sheets, **CSV import** (Papa Parse) |
| **Leads & pipeline** | Add/edit flows with contextual providers |
| **Tasks** | Focus board with priorities and momentum UI |
| **Auth** | `/login` & `/register` store users in **Neon** (`app_users`) when `DATABASE_URL` + `AUTH_SECRET` are set; JWT cookie sessions |
| **AI assistant (preview)** | Floating dock + sheet (⌘K / Ctrl+K), canned “next revenue move” style replies |
| **Storybook** | Component docs and isolated previews |

---

## Tech stack (links)

Pinned versions sit in **[Technical orientation](#technical-orientation)**. Layer map:

| Layer | Primary libraries |
|-------|-------------------|
| **Routing / rendering** | Next.js App Router, Server Components & route handlers |
| **Styling** | Tailwind v4, `tw-animate-css`, `next/font/google` (**Figtree**) |
| **Components** | Base UI · CVA · shadcn-style composition · Lucide icons |
| **Data viz / import** | Recharts · Papa Parse |
| **Testing / docs** | Storybook Next+Vite · Vitest browser mode · ESLint |

**Optional / scaffold:** Supabase JS client exists under `src/lib/supabase/`; **credential auth in this repo** is **Neon + bcryptjs + JWT (jose) + cookie session**.

---

## Credential auth (Neon)

When **`DATABASE_URL`** and **`AUTH_SECRET`** (32+ characters) are present in `.env.local`:

1. Open the Neon SQL editor and run **`db/auth-schema.sql`** (creates `public.app_users`).
2. Generate a secret, for example: `openssl rand -base64 32`.
3. Use **`/register`** to create an account and **`/login`** to sign in. Successful responses set an HTTP-only session cookie (`nordflow_session`).

Middleware then requires a valid session for all CRM routes except the home redirect and auth pages. If those env vars are missing, the CRM stays **demo-open** so local hacking works without a database.

API routes: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `GET /api/auth/status`.

---

## Scripts

```bash
npm run dev              # Next.js dev server → http://localhost:3000
npm run build            # Production build
npm run start            # Run production server
npm run lint             # ESLint

npm run storybook        # Storybook → http://localhost:6006
npm run build-storybook  # Static Storybook build
```

---

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (redirects to `/dashboard`).

---

## Project layout (high level)

```
src/app/
  (crm)/          # Dashboard, customers, leads, pipeline, tasks
  (auth)/         # Login & register previews
src/components/
  Crm/            # CRM shell: sidebar, top bar, boards, contexts, AI dock
  Ui/             # Shared UI primitives (shadcn-style)
  Auth/           # Auth marketing + forms
```

React component modules use **PascalCase file names** (for example `Button.tsx`, `TopBar.tsx`) so they read as components; shared domain folders are **`Crm`**, **`Ui`**, **`Auth`**. Non-component code under `src/lib/` stays **kebab-case** (for example `customer-portfolio-columns.ts`).

---

## Deploy

Works on [Vercel](https://vercel.com) or any host that supports Next.js. See the [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying).

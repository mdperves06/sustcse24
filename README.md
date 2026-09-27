# CSE 24 — Batch Digital Community

A private digital community and information portal for the CSE 24 batch: batch directory, profiles with
per-field privacy controls, community feed, interest groups, polls, events & calendar, academic resources,
career board, project gallery, Hall of Fame, teammate finder, notifications, a digital batch ID, an AI
assistant, and a full admin panel.

> Everything except the landing and about pages requires sign-in. Student data is never public and never
> indexed by search engines.

---

## Features

| Area | What's included |
| --- | --- |
| **Accounts** | Roll-based login, initial password = roll, **mandatory password change** before anything else is reachable, forgot/reset password (single-use, 30-min email tokens), change password, "keep me signed in", active-session list with remote sign-out, account lockout (5 failures → 15 min), DB-backed rate limiting |
| **Roles** | Student, Moderator, Admin with a central permission map enforced in every service |
| **Profiles** | Basic, academic, skills (languages/frameworks/tools/other), social links, career, hobbies, certifications, photo, CV (PDF), completion meter |
| **Privacy** | Per-field "Batch" / "Only me" for email, phone, location, birthday (day/month only), blood group, Facebook, LinkedIn, GitHub, career details and CV — applied in the directory, filters, search, APIs, calendar, birthdays and AI assistant |
| **Directory** | Search by name/roll, filter by skill, interest, location, company, career status; sort; grid & list views |
| **Dashboard** | Personalised welcome, stats, announcements, events, birthdays, opportunities, projects, activity |
| **Community** | Feed with 7 post types, images, links, reactions, comments, edit/delete, reporting, moderation; interest groups with group discussions; polls (single/multiple, anonymous, schedule, results, duplicate-vote protection) |
| **Events & calendar** | Events with RSVP (Going/Maybe/Not going), registration deadlines, cover images; month/week/list calendar merging exams, assignments, deadlines, events, opportunity deadlines and (shared) birthdays |
| **Academic** | Resource hub (files or links) by course and category with download counts |
| **Career** | Opportunity board with days-remaining, automatic expiry and bookmarks; Career Network; Skill Map (aggregates only) |
| **Showcase** | Project gallery (screenshots, team, likes, bookmarks), Hall of Fame with staff verification, Find a Teammate |
| **Other** | Birthday wishes, notification center with unread badge and reminders, global search, digital ID card with QR, AI Batch Assistant (privacy-aware tool use) |
| **Admin** | Statistics & analytics, student management (add/edit/disable/delete/restore/reset password/unlock/roles/verify/restrict), CSV bulk import with validation preview, moderation queue, audit log, system settings |

## Architecture

```
Browser ──► proxy.ts (optimistic session-cookie gate, noindex headers)
        ──► app/ (Server Components)  ──► services/* (business logic + authorization + privacy) ──► Prisma ──► PostgreSQL
        ──► Server Actions (actions/*) ─┘                     │
        ──► REST API (app/api/*)  ──────┘                     └──► lib/storage (local disk | S3-compatible)
```

- **Next.js 16 App Router** full-stack app (React 19, Server Components, Server Actions, Route Handlers).
- **Service layer is the security boundary.** Pages, server actions and REST endpoints are thin; every service
  receives the acting user from the session and re-checks permissions/ownership/privacy. The UI is never trusted.
- **Sessions**: opaque 256-bit tokens in an `httpOnly`, `SameSite=Lax`, `Secure` (prod) cookie; only a SHA-256 hash
  is stored in the `sessions` table. Idle timeout 12 h (sliding), "remember me" 30 days.
- **Passwords**: bcrypt (cost 12). Plaintext is never stored or logged.
- **CSRF**: Server Actions enforce same-origin; REST mutations require a same-origin `Origin` header.
- **XSS**: React escaping everywhere; user text goes through a linkifying `RichText` renderer; no
  `dangerouslySetInnerHTML`; CSP and security headers in `next.config.ts`.
- **Uploads**: size limits per type, magic-byte MIME detection (SVG/HTML rejected), random storage keys, served only
  through the authenticated `/api/files/*` route with `nosniff` and a sandbox CSP; CVs respect privacy.
- **Audit log** for every privileged action.

See [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) for the coding conventions and security rules.

## Tech stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix) · lucide-react · sonner ·
PostgreSQL · Prisma 7 (`@prisma/adapter-pg`) · Zod 4 · bcryptjs · nodemailer · AWS SDK S3 client · qrcode ·
Anthropic SDK · Vitest

## Folder structure

```
cse24-batch/
├── app/
│   ├── (public)/            Landing + about (only public pages)
│   ├── (auth)/              Login, forced password change, forgot/reset password
│   ├── (app)/               Authenticated app (dashboard, directory, feed, events, …, admin/)
│   ├── api/                 REST endpoints + authenticated file route
│   └── robots.ts
├── actions/                 Server Actions (thin: session → service → revalidate)
├── services/                Business logic, authorization and privacy rules
├── components/
│   ├── ui/                  shadcn/ui primitives
│   ├── shared/              Reusable app components (forms, avatar, empty states…)
│   ├── layout/              App shell, navigation
│   └── <feature>/           Feature components
├── hooks/                   Client hooks (useActionForm, useServerAction)
├── lib/                     Auth, db, env, privacy, storage, uploads, validation, time, labels…
├── types/
├── prisma/                  schema.prisma, migrations, seed.ts (demo data)
├── scripts/                 dev-db, create-admin, import-students, dev-session
├── tests/                   Vitest suites (run against a separate test database)
├── docs/
├── proxy.ts                 Request gate (Next.js 16 "proxy", formerly middleware)
└── .env.example
```

## Environment variables

Copy `.env.example` to `.env` and fill in values. Summary:

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `TEST_DATABASE_URL` | for tests | A **separate** database; wiped by the test suite |
| `APP_URL` | ✅ (prod) | Public URL, used in reset emails and ID-card QR codes |
| `BCRYPT_ROUNDS` | – | bcrypt cost (default 12) |
| `STORAGE_DRIVER` | – | `local` (default) or `s3` |
| `STORAGE_LOCAL_DIR` | – | Directory for local uploads (default `./storage`) |
| `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE` | if `s3` | Private S3-compatible bucket |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | for email | Password-reset email delivery |
| `ANTHROPIC_API_KEY` | – | Enables the AI assistant |
| `AI_MODEL` | – | Claude model id (default `claude-opus-5`) |

## Local setup

Requirements: **Node.js 20.9+** (tested with Node 24) and PostgreSQL 14+ (or use the embedded dev database).

```bash
npm install
cp .env.example .env            # then edit DATABASE_URL etc.
```

### Database

Use any PostgreSQL server, **or** start the bundled embedded PostgreSQL (no Docker needed):

```bash
npm run db:local                # keeps running; data in ./.data/postgres, port 5433
```

With the embedded server, use:

```
DATABASE_URL="postgresql://cse24:cse24_dev_password@localhost:5433/cse24"
TEST_DATABASE_URL="postgresql://cse24:cse24_dev_password@localhost:5433/cse24_test"
```

### Migrations

```bash
npm run db:migrate              # development: create/apply migrations
npm run db:deploy               # production/CI: apply existing migrations
```

### Seed demo data

```bash
npm run db:seed
```

Creates **clearly marked demo data** (22 accounts with rolls `D24000`–`D24021`, `isDemo = true`,
`@example.com` emails, `[Demo]` titles) plus announcements, events, posts, polls, resources, opportunities,
achievements, projects, groups, teammate requests and calendar entries. `D24000` is an admin and `D24001` a
moderator. Each demo account's initial password is its roll and must be changed on first sign-in.
The seed refuses to run in production or when real (non-demo) accounts exist.

### Development

```bash
npm run dev                     # http://localhost:3000
npm run typecheck               # route typegen + tsc
npm run lint
npm test                        # Vitest against TEST_DATABASE_URL
```

## Admin setup (production)

1. Deploy and run migrations (`npm run db:deploy`). Do **not** run the seed in production.
2. Create the first administrator:
   ```bash
   npm run admin:create -- --roll 240001 --name "Full Name" --email admin@example.com
   ```
   The admin's initial password is their roll; they must set a new one at first sign-in.
3. Sign in, open **Admin Panel → Students → Import** and upload the batch CSV:
   ```csv
   roll,name,student_id,email
   240001,Student One,ID001,student1@example.com
   240002,Student Two,ID002,student2@example.com
   ```
   Rows are validated (duplicate rolls/emails/IDs, formats) and previewed before import. Every imported account
   gets the roll as its initial password and is forced to change it. Passwords are never shown.
   A CLI alternative exists: `npm run students:import -- students.csv --dry-run`.
4. Promote moderators (class representatives) from **Admin Panel → Students**.
5. Configure SMTP (password reset), storage (S3 for multi-server deployments) and optionally `ANTHROPIC_API_KEY`.

## Production build

```bash
npm run build
npm start
```

## Deployment

- **Vercel / any Node host**: set the environment variables, use a managed PostgreSQL (Neon, Supabase, RDS…),
  set `STORAGE_DRIVER=s3` (serverless hosts have no persistent disk), run `npm run db:deploy` as a release step.
- **VPS / Docker**: `npm ci && npm run build && npm run db:deploy && npm start` behind a TLS-terminating reverse proxy
  that forwards `x-forwarded-for` and `x-forwarded-host`. Local storage works on a single server — back up `STORAGE_LOCAL_DIR`.
- Always serve over HTTPS in production (session cookies are `Secure`).

## Security checklist

- Passwords hashed with bcrypt; initial passwords must be changed before any access.
- Server-side authorization in every service; students cannot reach admin pages or APIs.
- Private profile fields filtered at the service layer (also for search filters, analytics and the AI assistant).
- Rate limiting on login, password reset, posting, reports and the AI assistant; account lockout.
- Audit log for admin/moderator actions.
- Secrets only via environment variables; `.env*` files are git-ignored (except `.env.example`).

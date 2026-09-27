# Engineering conventions

This document describes how code is organised in the CSE 24 Community platform. Follow it for every new feature so
security rules are applied the same way everywhere.

## Stack

- **Next.js 16** (App Router, Turbopack, React 19.2) — read `node_modules/next/dist/docs/` for version-specific APIs.
  - `params` and `searchParams` are **Promises**. Use the global helpers `PageProps<"/route/[id]">` and `LayoutProps<"/">`.
  - Route types are generated: run `npx next typegen` before `npx tsc --noEmit`.
  - `middleware.ts` is now `proxy.ts` (already implemented — do not add middleware).
  - `revalidateTag` needs two args; prefer `revalidatePath(path)` after mutations.
- **Prisma 7** + PostgreSQL. Client import: `import { db } from "@/lib/db"`. Types/enums: `@/lib/generated/prisma/client`
  and `@/lib/generated/prisma/enums`.
- **Tailwind CSS v4** + **shadcn/ui (radix-nova)** in `components/ui/*`. Icons: `lucide-react`. Toasts: `sonner`.
- **Zod 4** for all validation.

## Layers (never skip one)

```
app/(app)/<feature>/page.tsx      Server component. First line: `const viewer = await requireUser()`
        │                          (or `requirePermission("perm")`). Reads data via services only.
        ▼
components/<feature>/*.tsx        Client components only where interactivity is needed.
        │                          Forms → useActionForm; buttons → useServerAction; destructive → ConfirmAction.
        ▼
actions/<feature>.ts              "use server". `const actor = await getActor()` → call service → revalidatePath.
        │                          Always wrapped in `runAction(fn, "Success message")`.
app/api/<feature>/route.ts        REST endpoints for the same services, wrapped in `apiRoute(...)`.
        ▼
services/<feature>.ts             `import "server-only"`. ALL business logic and ALL authorization.
                                   First param is the actor (`Viewer` = { id, role }).
lib/validation/<feature>.ts       Zod schemas (shared by services and forms).
```

### Security rules

1. **Authorization lives in services.** Check with `assertCan(actor, "permission")` (`lib/auth/permissions.ts`) or
   ownership (`row.authorId === actor.id`). Hiding a button in the UI is only cosmetic.
2. **Never trust ids for ownership from the client** — the acting user always comes from the session (`getActor()`).
3. **Privacy**: never expose `StudentProfile` fields governed by `PrivacySettings` without `canSee()` from `lib/privacy.ts`.
   Identity (name, roll, avatar) is always batch-visible; use `authorSelect` / `toAuthor` from `lib/selects.ts`.
   Filters on private fields must add `sharedWithBatch(field)` so a filter can't leak data.
4. **Validation**: parse every input with Zod on the server (`schema.parse(input)`); ZodErrors become field errors
   automatically. URLs must use `safeUrl`/`optionalUrl` (http/https only).
5. **User content** is rendered with `<RichText text=… />` (escapes HTML, linkifies URLs). Never use `dangerouslySetInnerHTML`.
6. **Uploads**: `saveUpload(file, kind)` from `lib/uploads.ts` (size + magic-byte MIME checks, random keys). Show files
   with `fileUrl(key)` from `lib/files.ts`; they're served by the authenticated `/api/files/...` route.
7. **Errors**: throw `ValidationError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `AppError` from `lib/errors.ts`.
   Their messages are shown to users; anything else becomes a generic message.
8. **Soft delete** content with `deletedAt: new Date()` and always filter `deletedAt: null`.
9. **Audit** staff actions with `audit({ actorId, action, entityType, entityId, metadata })` from `lib/audit.ts`.
   Never put passwords/tokens in metadata.
10. **Rate limit** abuse-prone writes with `enforceRateLimit(key, limit, windowSeconds)` from `lib/rate-limit.ts`.

## Shared helpers

| Need | Use |
| --- | --- |
| Current user in a page | `requireUser()` / `requirePermission(p)` — `lib/auth/current-user.ts` |
| Current user in an action | `getActor()` |
| Permission check (UI) | `can(role, "perm")` |
| Permission check (server) | `assertCan(actor, "perm")` |
| FormData → object | `formToObject(fd)`, `getFile(fd, name)`, `getFiles(fd, name)` — `lib/forms.ts` |
| Common zod fields | `requiredText`, `optionalText`, `optionalUrl`, `safeUrl`, `tagList`, `optionalDate`, `requiredDate`, `optionalDateOnly`, `checkbox` — `lib/validation/common.ts` |
| Dates (Asia/Dhaka) | `formatDate`, `formatDateTime`, `formatTime`, `formatRelative`, `daysUntil`, `toLocalInputValue`, `appToday` — `lib/time.ts` |
| Enum labels / select options | `lib/labels.ts` (`options(LABELS)`) |
| Notifications | `notifyUsers(ids, payload)`, `notifyBatch(payload)` — `services/notifications.ts` |
| System settings | `getSetting("studentResourceUploads")` — `lib/settings.ts` |

## UI building blocks

- `PageHeader` (title, description, actions), `EmptyState`, `StatCard`, `Pagination` (link-based, keeps filters),
  `UserAvatar`, `RichText`, `TagInput`, `ConfirmAction`, `FormField` + `SubmitButton` + `FormAlert`, `PasswordInput`,
  `ThemeToggle` — all in `components/shared/`.
- Filters are plain `<form method="get">` forms that update `searchParams` (work without JS, shareable URLs).
- Style: rounded-2xl cards (`rounded-2xl border bg-card p-5 shadow-xs`), generous spacing, `text-muted-foreground`
  for secondary text, `Badge` for categories, hover lift (`hover:-translate-y-0.5 hover:shadow-md`) on clickable cards.
  Use semantic tokens only (`bg-primary`, `text-success`, `bg-chart-2/15`…) so light/dark mode both work.
- Every list needs an empty state; every route segment can add a `loading.tsx` (a generic one exists at `app/(app)/loading.tsx`).
- Accessibility: every input has a label (FormField does it), icon-only buttons need `aria-label`, decorative icons get
  `aria-hidden`, use `aria-current` for active nav items.
- Every visible button must work. If something needs configuration that's missing, show it as disabled with an explanation.

## Form pattern

```tsx
// actions/things.ts
"use server";
export async function createThingAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    const thing = await things.createThing(actor, formToObject(formData));
    revalidatePath("/things");
    return { id: thing.id };
  }, "Thing created.");
}

// components/things/thing-form.tsx
"use client";
const { state, pending, fieldError, formProps } = useActionForm(createThingAction, { resetOnSuccess: true });
<form {...formProps}>
  <FormAlert message={!state.ok ? state.error : null} />
  <FormField label="Title" name="title" error={fieldError("title")} required>
    {(f) => <Input {...f} required />}
  </FormField>
  <SubmitButton pending={pending}>Create</SubmitButton>
</form>
```

## Verification

```bash
npx next typegen && npx tsc --noEmit
npx eslint app components services actions lib
npm test
```

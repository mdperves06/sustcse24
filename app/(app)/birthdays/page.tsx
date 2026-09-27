import type { Metadata } from "next";
import Link from "next/link";
import { Cake, CalendarHeart, Gift, PartyPopper } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import {
  getReceivedWishes,
  getWishedUserIds,
  isViewerBirthdayToday,
  listVisibleBirthdays,
} from "@/services/birthdays";
import { formatRelative } from "@/lib/time";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import { RichText } from "@/components/shared/rich-text";
import { Badge } from "@/components/ui/badge";
import { WishForm } from "@/components/birthdays/wish-form";
import { daysAwayLabel, formatBirthday } from "@/components/birthdays/birthday-date";

export const metadata: Metadata = { title: "Birthdays" };

const UPCOMING_DAYS = 30;

export default async function BirthdaysPage() {
  const viewer = await requireUser();
  const [all, ownBirthday] = await Promise.all([listVisibleBirthdays(viewer), isViewerBirthdayToday(viewer)]);
  const today = all.filter((p) => p.daysAway === 0 && p.userId !== viewer.id);
  const upcoming = all.filter((p) => p.daysAway > 0 && p.daysAway <= UPCOMING_DAYS);
  const [wished, received] = await Promise.all([
    getWishedUserIds(viewer, today.map((p) => p.userId)),
    ownBirthday ? getReceivedWishes(viewer) : Promise.resolve([]),
  ]);
  const firstName = (name: string) => name.split(/\s+/)[0] ?? name;

  return (
    <>
      <PageHeader
        title="Birthdays"
        description="Celebrate your batchmates. Only people who share their birthday with the batch appear here — birth years are never shown."
      />

      {ownBirthday ? (
        <section className="bg-brand-gradient mb-6 overflow-hidden rounded-2xl p-6 text-white shadow-md sm:p-8" aria-labelledby="own-bday">
          <div className="flex items-start gap-4">
            <PartyPopper className="size-10 shrink-0" aria-hidden />
            <div className="min-w-0">
              <h2 id="own-bday" className="text-2xl font-semibold tracking-tight">
                Happy birthday, {firstName(viewer.fullName)}! 🎂
              </h2>
              <p className="mt-1 text-sm text-white/85">
                {received.length
                  ? `${received.length} batchmate${received.length === 1 ? "" : "s"} sent you wishes today.`
                  : "Your batchmates' wishes will appear here as they arrive."}
              </p>
            </div>
          </div>
          {received.length ? (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {received.map((w) => (
                <li key={w.id} className="rounded-xl bg-white/15 p-3 backdrop-blur">
                  <div className="flex items-center gap-2">
                    <UserAvatar name={w.from.name} avatarKey={w.from.avatarKey} size="sm" />
                    <Link href={`/students/${encodeURIComponent(w.from.roll)}`} className="text-sm font-semibold hover:underline">
                      {w.from.name}
                    </Link>
                    <span className="ml-auto text-xs text-white/75">{formatRelative(w.createdAt)}</span>
                  </div>
                  <RichText text={w.message} className="mt-2 text-white [&_a]:text-white [&_a]:underline" />
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="today-heading" className="mb-8">
        <h2 id="today-heading" className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Cake className="size-5 text-chart-4" aria-hidden /> Today&apos;s Birthdays 🎂
        </h2>
        {today.length === 0 ? (
          <EmptyState icon={Gift} title="No birthdays today" description="Check the upcoming list below so you don't miss anyone." />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {today.map((p) => (
              <li key={p.userId} className="rounded-2xl border border-chart-4/30 bg-chart-4/5 p-5 shadow-xs">
                <div className="mb-4 flex items-center gap-3">
                  <UserAvatar name={p.name} avatarKey={p.avatarKey} size="lg" />
                  <div className="min-w-0">
                    <Link href={`/students/${encodeURIComponent(p.roll)}`} className="block truncate font-semibold hover:underline">
                      {p.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-mono">{p.roll}</span> · {formatBirthday(p.month, p.day)}
                    </p>
                  </div>
                </div>
                <WishForm toUserId={p.userId} firstName={firstName(p.name)} alreadySent={wished.has(p.userId)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="upcoming-heading">
        <h2 id="upcoming-heading" className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <CalendarHeart className="size-5 text-primary" aria-hidden /> Upcoming Birthdays
          <span className="text-sm font-normal text-muted-foreground">next {UPCOMING_DAYS} days</span>
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState icon={CalendarHeart} title="No birthdays in the next 30 days" />
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-xs">
            {upcoming.map((p) => (
              <li key={p.userId}>
                <Link
                  href={`/students/${encodeURIComponent(p.roll)}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                >
                  <UserAvatar name={p.name} avatarKey={p.avatarKey} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {p.name}
                      {p.userId === viewer.id ? <span className="text-muted-foreground"> (you)</span> : null}
                    </span>
                    <span className="block text-xs text-muted-foreground">{formatBirthday(p.month, p.day)}</span>
                  </span>
                  <Badge variant={p.daysAway <= 3 ? "default" : "secondary"}>{daysAwayLabel(p.daysAway)}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

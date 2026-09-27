import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  CalendarDays,
  FolderGit2,
  Lock,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublicStats } from "@/services/public-stats";

export const metadata: Metadata = {
  title: { absolute: "CSE 24 — Connect. Collaborate. Grow Together." },
  description: "A private digital community built for the CSE 24 batch.",
  robots: { index: true, follow: false },
};

const FEATURES = [
  { icon: Users, title: "Batch directory", text: "Find batchmates by skill, interest, location or company — with privacy controls on every field." },
  { icon: MessagesSquare, title: "Private community", text: "A feed, interest groups and polls for discussions that stay inside the batch." },
  { icon: CalendarDays, title: "Events & calendar", text: "Meetups, tours, hackathons, exams and deadlines in one shared calendar with RSVPs." },
  { icon: BookOpen, title: "Academic hub", text: "Notes, slides, previous questions and lab resources, organised by course." },
  { icon: Briefcase, title: "Career network", text: "Internships, jobs, scholarships and competitions shared by the batch — never miss a deadline." },
  { icon: FolderGit2, title: "Projects & Hall of Fame", text: "Showcase projects, find teammates and celebrate verified achievements." },
];

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card/70 p-5 text-center shadow-xs backdrop-blur">
      <p className="text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">{value.toLocaleString("en")}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export default async function LandingPage() {
  const stats = await getPublicStats();

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div className="absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute top-40 -right-20 size-80 rounded-full bg-chart-2/15 blur-3xl" />
        </div>
        <div className="mx-auto max-w-6xl px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28">
          <p className="mx-auto inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="size-3.5 text-primary" aria-hidden /> The official digital home of the batch
          </p>
          <h1 className="mt-6 text-6xl font-bold tracking-tighter sm:text-8xl">
            <span className="text-brand-gradient">CSE 24</span>
          </h1>
          <p className="mt-4 text-2xl font-semibold tracking-tight sm:text-4xl">Connect. Collaborate. Grow Together.</p>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            A private digital community built for the CSE 24 batch.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild className="h-11 px-6 text-base">
              <Link href="/login">
                Login <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-11 px-6 text-base">
              <Link href="/about">About Batch</Link>
            </Button>
          </div>

          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Students" value={stats.students} />
            <Stat label="Projects" value={stats.projects} />
            <Stat label="Skills" value={stats.skills} />
            <Stat label="Opportunities" value={stats.opportunities} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-labelledby="features">
        <h2 id="features" className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Everything the batch needs, in one place
        </h2>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="rounded-2xl border bg-card p-6 shadow-xs">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="size-5" aria-hidden />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="bg-brand-gradient flex flex-col items-start gap-6 rounded-3xl p-8 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div className="max-w-xl">
            <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <ShieldCheck className="size-6" aria-hidden /> Private by design
            </h2>
            <p className="mt-2 text-white/85">
              Only verified batch members can sign in. Every student decides which details — phone, email, location,
              birthday, career — other members can see. Nothing about individual students is public.
            </p>
          </div>
          <Button size="lg" variant="secondary" asChild className="h-11 px-6">
            <Link href="/login">
              <Lock aria-hidden /> Sign in to the community
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}

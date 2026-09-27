import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, HeartHandshake, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About the batch",
  description: "About CSE 24 and its private digital community.",
  robots: { index: true, follow: false },
};

const POINTS = [
  {
    icon: GraduationCap,
    title: "Who we are",
    text: "CSE 24 is a batch of Computer Science & Engineering students. This platform is our shared home — for studying together, finding teammates, celebrating wins and staying connected long after graduation.",
  },
  {
    icon: HeartHandshake,
    title: "What it's for",
    text: "Discover batchmates by skills and interests, share notes and opportunities, organise events, showcase projects and keep the batch network alive as we move into careers and higher studies.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy first",
    text: "The whole community requires sign-in. Personal details are batch-only at most, and each student controls the visibility of their phone, email, location, birthday, social links, career details and CV.",
  },
  {
    icon: KeyRound,
    title: "Getting access",
    text: "Every verified batch member has an account. Sign in with your roll number; your first password is your roll and you'll be asked to set a new one immediately. Contact a batch admin if you can't sign in.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        About <span className="text-brand-gradient">CSE 24</span>
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        A private digital community and information portal for the entire CSE 24 batch.
      </p>
      <ul className="mt-12 grid gap-5 sm:grid-cols-2">
        {POINTS.map((p) => (
          <li key={p.title} className="rounded-2xl border bg-card p-6 shadow-xs">
            <p.icon className="size-6 text-primary" aria-hidden />
            <h2 className="mt-3 font-semibold">{p.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
          </li>
        ))}
      </ul>
      <div className="mt-12 flex gap-3">
        <Button asChild size="lg">
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/">Back home</Link>
        </Button>
      </div>
    </div>
  );
}

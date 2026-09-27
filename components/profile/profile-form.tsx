"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { FormAlert, FormField, SubmitButton } from "@/components/shared/form";
import { TagInput } from "@/components/shared/tag-input";
import { useActionForm } from "@/hooks/use-action-form";
import { updateProfileAction } from "@/actions/profile";
import { BLOOD_GROUP_LABELS, EMPLOYMENT_LABELS, options } from "@/lib/labels";
import type { SkillCategory } from "@/lib/generated/prisma/enums";

type EditableProfile = {
  fullName: string;
  nickname: string | null;
  studentId: string | null;
  phone: string | null;
  bloodGroup: string | null;
  location: string | null;
  bio: string | null;
  dateOfBirth: string;
  department: string;
  batch: string;
  interests: string[];
  academicInterests: string[];
  facebookUrl: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  otherLinks: { label: string; url: string }[];
  currentOrganization: string | null;
  position: string | null;
  industry: string | null;
  employmentStatus: string;
  careerInterests: string[];
  hobbies: string[];
  certifications: string[];
};

const COMMON_LANGUAGES = ["Python", "Java", "C++", "C", "JavaScript", "TypeScript", "Go", "Kotlin", "Rust", "SQL"];
const COMMON_FRAMEWORKS = ["React", "Next.js", "Node.js", "Django", "FastAPI", "Spring Boot", "Flutter", "PyTorch", "TensorFlow"];
const COMMON_TOOLS = ["Git", "Docker", "Linux", "Figma", "PostgreSQL", "AWS", "Firebase"];
const COMMON_OTHER = ["AI/ML", "Cyber Security", "Data Science", "Competitive Programming", "UI/UX", "Robotics", "IoT"];

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

function LinksEditor({ initial }: { initial: { label: string; url: string }[] }) {
  const [links, setLinks] = useState(initial);
  return (
    <div className="space-y-2 sm:col-span-2">
      <p className="text-sm font-medium">Other links</p>
      <input type="hidden" name="otherLinks" value={JSON.stringify(links.filter((l) => l.label && l.url))} />
      {links.map((link, i) => (
        <div key={i} className="flex gap-2">
          <Input
            aria-label={`Link ${i + 1} label`}
            placeholder="Label (e.g. Blog)"
            value={link.label}
            onChange={(e) => setLinks((ls) => ls.map((l, j) => (j === i ? { ...l, label: e.target.value } : l)))}
            className="w-40"
          />
          <Input
            aria-label={`Link ${i + 1} URL`}
            placeholder="https://…"
            type="url"
            value={link.url}
            onChange={(e) => setLinks((ls) => ls.map((l, j) => (j === i ? { ...l, url: e.target.value } : l)))}
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => setLinks((ls) => ls.filter((_, j) => j !== i))} aria-label={`Remove link ${i + 1}`}>
            <Trash2 aria-hidden />
          </Button>
        </div>
      ))}
      {links.length < 10 ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setLinks((ls) => [...ls, { label: "", url: "" }])}>
          <Plus aria-hidden /> Add link
        </Button>
      ) : null}
    </div>
  );
}

export function ProfileForm({
  roll,
  email,
  profile,
  skills,
}: {
  roll: string;
  email: string | null;
  profile: EditableProfile | null;
  skills: Record<SkillCategory, string[]>;
}) {
  const { state, pending, fieldError, formProps } = useActionForm(updateProfileAction);
  const p = profile;

  return (
    <form {...formProps} className="space-y-6">
      <FormAlert message={!state.ok ? state.error : null} />

      <Section title="Basic information" description="Name and bio are always visible to the batch.">
        <FormField label="Full name" name="fullName" error={fieldError("fullName")} required>
          {(f) => <Input {...f} defaultValue={p?.fullName ?? ""} required maxLength={100} autoComplete="name" />}
        </FormField>
        <FormField label="Nickname" name="nickname" error={fieldError("nickname")}>
          {(f) => <Input {...f} defaultValue={p?.nickname ?? ""} maxLength={40} />}
        </FormField>
        <FormField label="Roll" name="roll-readonly" hint="Set by the batch admin.">
          {(f) => <Input {...f} value={roll} disabled readOnly />}
        </FormField>
        <FormField label="Student ID" name="studentId-readonly" hint="Set by the batch admin.">
          {(f) => <Input {...f} value={p?.studentId ?? "—"} disabled readOnly />}
        </FormField>
        <FormField label="Email" name="email" error={fieldError("email")} hint="Used for password resets.">
          {(f) => <Input {...f} type="email" defaultValue={email ?? ""} autoComplete="email" />}
        </FormField>
        <FormField label="Phone" name="phone" error={fieldError("phone")}>
          {(f) => <Input {...f} type="tel" defaultValue={p?.phone ?? ""} placeholder="+8801…" autoComplete="tel" />}
        </FormField>
        <FormField label="Date of birth" name="dateOfBirth" error={fieldError("dateOfBirth")} hint="Only day and month are ever shown to others.">
          {(f) => <Input {...f} type="date" defaultValue={p?.dateOfBirth ?? ""} />}
        </FormField>
        <FormField label="Blood group" name="bloodGroup" error={fieldError("bloodGroup")}>
          {(f) => (
            <NativeSelect {...f} defaultValue={p?.bloodGroup ?? ""} className="w-full">
              <NativeSelectOption value="">Not specified</NativeSelectOption>
              {options(BLOOD_GROUP_LABELS).map((o) => (
                <NativeSelectOption key={o.value} value={o.value}>
                  {o.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField label="Location" name="location" error={fieldError("location")} className="sm:col-span-2">
          {(f) => <Input {...f} defaultValue={p?.location ?? ""} placeholder="City / area" maxLength={100} />}
        </FormField>
        <FormField label="Short bio" name="bio" error={fieldError("bio")} hint="Up to 500 characters." className="sm:col-span-2">
          {(f) => <Textarea {...f} defaultValue={p?.bio ?? ""} rows={3} maxLength={500} />}
        </FormField>
      </Section>

      <Section title="Academic">
        <FormField label="Department" name="department-readonly">
          {(f) => <Input {...f} value={p?.department ?? "Computer Science & Engineering"} disabled readOnly />}
        </FormField>
        <FormField label="Batch" name="batch-readonly">
          {(f) => <Input {...f} value={p?.batch ?? "CSE 24"} disabled readOnly />}
        </FormField>
        <FormField label="Interests" name="interests" error={fieldError("interests")} hint="Press Enter after each one.">
          {(f) => <TagInput {...f} defaultValue={p?.interests ?? []} suggestions={COMMON_OTHER} />}
        </FormField>
        <FormField label="Academic interests" name="academicInterests" error={fieldError("academicInterests")}>
          {(f) => <TagInput {...f} defaultValue={p?.academicInterests ?? []} placeholder="e.g. Algorithms, NLP" />}
        </FormField>
      </Section>

      <Section title="Skills" description="Skills power the directory filters, teammate matching and the batch Skill Map.">
        <FormField label="Programming languages" name="programmingLanguages" error={fieldError("programmingLanguages")}>
          {(f) => <TagInput {...f} defaultValue={skills.LANGUAGE} suggestions={COMMON_LANGUAGES} />}
        </FormField>
        <FormField label="Frameworks" name="frameworks" error={fieldError("frameworks")}>
          {(f) => <TagInput {...f} defaultValue={skills.FRAMEWORK} suggestions={COMMON_FRAMEWORKS} />}
        </FormField>
        <FormField label="Tools" name="tools" error={fieldError("tools")}>
          {(f) => <TagInput {...f} defaultValue={skills.TOOL} suggestions={COMMON_TOOLS} />}
        </FormField>
        <FormField label="Other skills" name="otherSkills" error={fieldError("otherSkills")}>
          {(f) => <TagInput {...f} defaultValue={skills.OTHER} suggestions={COMMON_OTHER} />}
        </FormField>
      </Section>

      <Section title="Social links" description="Each link's visibility is controlled in the Privacy tab.">
        <FormField label="GitHub" name="githubUrl" error={fieldError("githubUrl")}>
          {(f) => <Input {...f} type="url" defaultValue={p?.githubUrl ?? ""} placeholder="https://github.com/…" />}
        </FormField>
        <FormField label="LinkedIn" name="linkedinUrl" error={fieldError("linkedinUrl")}>
          {(f) => <Input {...f} type="url" defaultValue={p?.linkedinUrl ?? ""} placeholder="https://linkedin.com/in/…" />}
        </FormField>
        <FormField label="Facebook" name="facebookUrl" error={fieldError("facebookUrl")}>
          {(f) => <Input {...f} type="url" defaultValue={p?.facebookUrl ?? ""} placeholder="https://facebook.com/…" />}
        </FormField>
        <FormField label="Portfolio" name="portfolioUrl" error={fieldError("portfolioUrl")}>
          {(f) => <Input {...f} type="url" defaultValue={p?.portfolioUrl ?? ""} placeholder="https://…" />}
        </FormField>
        <LinksEditor initial={p?.otherLinks ?? []} />
        {fieldError("otherLinks") ? <p className="text-xs text-destructive sm:col-span-2">{fieldError("otherLinks")}</p> : null}
      </Section>

      <Section title="Career">
        <FormField label="Employment status" name="employmentStatus" error={fieldError("employmentStatus")}>
          {(f) => (
            <NativeSelect {...f} defaultValue={p?.employmentStatus ?? "STUDENT"} className="w-full">
              {options(EMPLOYMENT_LABELS).map((o) => (
                <NativeSelectOption key={o.value} value={o.value}>
                  {o.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField label="Current organization" name="currentOrganization" error={fieldError("currentOrganization")}>
          {(f) => <Input {...f} defaultValue={p?.currentOrganization ?? ""} maxLength={120} />}
        </FormField>
        <FormField label="Position" name="position" error={fieldError("position")}>
          {(f) => <Input {...f} defaultValue={p?.position ?? ""} maxLength={120} />}
        </FormField>
        <FormField label="Industry" name="industry" error={fieldError("industry")}>
          {(f) => <Input {...f} defaultValue={p?.industry ?? ""} placeholder="e.g. Software Engineering" maxLength={80} />}
        </FormField>
        <FormField label="Career interests" name="careerInterests" error={fieldError("careerInterests")} className="sm:col-span-2">
          {(f) => <TagInput {...f} defaultValue={p?.careerInterests ?? []} placeholder="e.g. Backend, Research" />}
        </FormField>
      </Section>

      <Section title="Additional">
        <FormField label="Hobbies" name="hobbies" error={fieldError("hobbies")}>
          {(f) => <TagInput {...f} defaultValue={p?.hobbies ?? []} />}
        </FormField>
        <FormField label="Certifications" name="certifications" error={fieldError("certifications")}>
          {(f) => <TagInput {...f} defaultValue={p?.certifications ?? []} placeholder="e.g. AWS Cloud Practitioner" />}
        </FormField>
        <p className="text-xs text-muted-foreground sm:col-span-2">
          Achievements and projects have their own pages — submit them from the Hall of Fame and Project Gallery.
        </p>
      </Section>

      <div className="sticky bottom-20 z-10 flex justify-end lg:bottom-4">
        <SubmitButton pending={pending} className="shadow-lg">
          Save profile
        </SubmitButton>
      </div>
    </form>
  );
}

"use client";

import { useId, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormAlert, FormField, SubmitButton } from "@/components/shared/form";
import { useActionForm } from "@/hooks/use-action-form";
import { updateSettingsAction } from "@/actions/admin-settings";

type Values = {
  aiAssistantEnabled: boolean;
  studentResourceUploads: boolean;
  studentOpportunityPosts: boolean;
  siteNotice: string;
};

const TOGGLES: { key: Exclude<keyof Values, "siteNotice">; label: string; description: string }[] = [
  {
    key: "aiAssistantEnabled",
    label: "AI assistant",
    description: "Let batch members use the AI assistant (requires an Anthropic API key on the server).",
  },
  {
    key: "studentResourceUploads",
    label: "Student resource uploads",
    description: "Allow students (not just admins) to share academic resources.",
  },
  {
    key: "studentOpportunityPosts",
    label: "Student opportunity posts",
    description: "Allow students to post jobs, internships and other opportunities.",
  },
];

function Toggle({ name, label, description, defaultChecked }: { name: string; label: string; description: string; defaultChecked: boolean }) {
  const id = useId();
  return (
    <li className="flex items-start justify-between gap-4 py-3.5">
      <div>
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <p id={`${id}-d`} className="text-xs text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch id={id} name={name} defaultChecked={defaultChecked} aria-describedby={`${id}-d`} className="mt-0.5" />
    </li>
  );
}

export function SettingsForm({ values, aiConfigured }: { values: Values; aiConfigured: boolean }) {
  const { state, pending, fieldError, formProps } = useActionForm(updateSettingsAction);
  const [notice, setNotice] = useState(values.siteNotice);

  return (
    <form {...formProps} className="space-y-5">
      <FormAlert message={!state.ok && !state.fieldErrors ? state.error : null} />
      <ul className="divide-y">
        {TOGGLES.map((t) => (
          <Toggle
            key={t.key}
            name={t.key}
            label={t.label}
            description={t.key === "aiAssistantEnabled" && !aiConfigured ? `${t.description} No API key is configured, so it stays unavailable.` : t.description}
            defaultChecked={values[t.key]}
          />
        ))}
      </ul>
      <FormField
        label="Site notice"
        name="siteNotice"
        error={fieldError("siteNotice")}
        hint={`A short message for all members, e.g. planned maintenance. Leave empty for none. ${notice.length}/300`}
      >
        {(f) => <Textarea {...f} rows={3} maxLength={300} value={notice} onChange={(e) => setNotice(e.target.value)} />}
      </FormField>
      <div className="flex justify-end">
        <SubmitButton pending={pending}>Save settings</SubmitButton>
      </div>
    </form>
  );
}

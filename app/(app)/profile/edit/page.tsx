import type { Metadata } from "next";
import Link from "next/link";
import { Eye } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { computeCompletion, getOwnProfile } from "@/services/profiles";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileForm } from "@/components/profile/profile-form";
import { PrivacyForm } from "@/components/profile/privacy-form";
import { MediaForms } from "@/components/profile/media-forms";
import { toDateOnlyInputValue } from "@/lib/time";

export const metadata: Metadata = { title: "Edit profile" };

export default async function EditProfilePage({ searchParams }: PageProps<"/profile/edit">) {
  const viewer = await requireUser();
  const { tab } = await searchParams;
  const { user, profile, privacy, skills } = await getOwnProfile(viewer.id);
  const skillCount = skills.LANGUAGE.length + skills.FRAMEWORK.length + skills.TOOL.length + skills.OTHER.length;
  const completion = computeCompletion(profile, user.email, skillCount);
  const initialTab = tab === "privacy" || tab === "media" ? tab : "profile";

  return (
    <>
      <PageHeader
        title="Edit profile"
        description="Keep your profile up to date so batchmates can find you. You decide what's visible in the Privacy tab."
        actions={
          <Button variant="outline" asChild>
            <Link href={`/students/${encodeURIComponent(user.roll)}`}>
              <Eye aria-hidden /> View profile
            </Link>
          </Button>
        }
      />

      <div className="mb-6 rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Profile completion</span>
          <span className="font-semibold tabular-nums">{completion}%</span>
        </div>
        <Progress value={completion} className="mt-2" aria-label="Profile completion" />
        {completion < 100 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Add a photo, bio, at least 3 skills, interests and a GitHub or LinkedIn link to reach 100%.
          </p>
        ) : null}
      </div>

      <Tabs defaultValue={initialTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="media">Photo & CV</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ProfileForm
            roll={user.roll}
            email={user.email}
            profile={
              profile
                ? {
                    ...profile,
                    dateOfBirth: toDateOnlyInputValue(profile.dateOfBirth),
                    otherLinks: Array.isArray(profile.otherLinks) ? (profile.otherLinks as { label: string; url: string }[]) : [],
                  }
                : null
            }
            skills={skills}
          />
        </TabsContent>
        <TabsContent value="privacy">
          <PrivacyForm privacy={privacy} />
        </TabsContent>
        <TabsContent value="media">
          <MediaForms
            name={profile?.fullName ?? user.roll}
            avatarKey={profile?.avatarKey ?? null}
            cvKey={profile?.cvKey ?? null}
            cvFileName={profile?.cvFileName ?? null}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

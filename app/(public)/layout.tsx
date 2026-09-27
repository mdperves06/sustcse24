import { PublicFooter, PublicHeader } from "@/components/layout/public-header";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader signedIn={Boolean(user)} />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}

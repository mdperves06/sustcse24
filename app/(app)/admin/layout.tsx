import { ShieldCheck } from "lucide-react";
import { requirePermission } from "@/lib/auth/current-user";
import { AdminNav } from "@/components/admin/admin-nav";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/labels";

/** The whole /admin area requires "admin.access"; each page re-checks its own permission. */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await requirePermission("admin.access");
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <ShieldCheck className="size-4 text-primary" aria-hidden />
        Admin panel
        <Badge variant="outline">{ROLE_LABELS[viewer.role]}</Badge>
      </div>
      <AdminNav role={viewer.role} />
      {children}
    </div>
  );
}

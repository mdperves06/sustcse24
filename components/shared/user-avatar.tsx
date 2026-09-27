import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fileUrl } from "@/lib/files";
import { cn } from "@/lib/utils";

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return ((parts[0]![0] ?? "") + (parts.length > 1 ? (parts.at(-1)![0] ?? "") : "")).toUpperCase();
}

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
  xl: "size-24 text-2xl",
  "2xl": "size-32 text-3xl",
} as const;

export function UserAvatar({
  name,
  avatarKey,
  size = "md",
  className,
}: {
  name: string;
  avatarKey?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const src = fileUrl(avatarKey);
  return (
    <Avatar className={cn(SIZES[size], className)}>
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 font-semibold text-primary">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

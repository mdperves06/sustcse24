"use client";

import { useState } from "react";
import { BadgeCheck, Ban, BadgeX, KeyRound, LockOpen, RotateCcw, ShieldCheck, Trash2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { useServerAction } from "@/hooks/use-action-form";
import {
  deleteStudentAction,
  resetPasswordAction,
  restoreStudentAction,
  setRoleAction,
  setStatusAction,
  setVerifiedAction,
  unlockStudentAction,
} from "@/actions/admin-students";
import { ROLE_LABELS, options } from "@/lib/labels";
import type { AccountStatus, Role } from "@/lib/generated/prisma/enums";

type Props = {
  id: string;
  name: string;
  role: Role;
  status: AccountStatus;
  deleted: boolean;
  locked: boolean;
  isVerified: boolean;
  hasProfile: boolean;
  isSelf: boolean;
  isLastActiveAdmin: boolean;
  canAssignRoles: boolean;
};

function Row({ title, description, children }: { title: string; description: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
    </li>
  );
}

export function StudentAccountActions(props: Props) {
  const { id, name, role, status, deleted, locked, isVerified, hasProfile, isSelf, isLastActiveAdmin, canAssignRoles } = props;
  const [nextRole, setNextRole] = useState<Role>(role);
  const { pending, run } = useServerAction();

  if (deleted) {
    return (
      <ul className="divide-y">
        <Row title="Restore account" description="Re-activates the account. The student signs in with their existing password.">
          <ConfirmAction
            destructive={false}
            title={`Restore ${name}?`}
            description="The account becomes active again and appears in the directory."
            confirmLabel="Restore"
            action={() => restoreStudentAction(id)}
            trigger={
              <Button variant="outline" size="sm">
                <RotateCcw aria-hidden /> Restore
              </Button>
            }
          />
        </Row>
      </ul>
    );
  }

  const protectedAdmin = isLastActiveAdmin ? "This is the last active admin — promote another admin first." : null;

  return (
    <ul className="divide-y">
      {canAssignRoles ? (
        <Row
          title="Role"
          description={isSelf ? "You can't change your own role." : (protectedAdmin ?? "Moderators review reports; admins manage everything.")}
        >
          <label htmlFor="role-select" className="sr-only">
            Role
          </label>
          <NativeSelect
            id="role-select"
            size="sm"
            value={nextRole}
            onChange={(e) => setNextRole(e.target.value as Role)}
            disabled={isSelf || pending}
          >
            {options(ROLE_LABELS).map((o) => (
              <NativeSelectOption key={o.value} value={o.value}>
                {o.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <ConfirmAction
            destructive={nextRole !== "ADMIN" && role === "ADMIN"}
            title={`Make ${name} ${ROLE_LABELS[nextRole].toLowerCase()}?`}
            description={
              nextRole === "ADMIN"
                ? "Admins can manage every student, setting and piece of content."
                : nextRole === "MODERATOR"
                  ? "Moderators can review reports, restrict posting, verify achievements and manage groups."
                  : "The account loses all staff permissions."
            }
            confirmLabel="Change role"
            action={() => setRoleAction(id, nextRole)}
            trigger={
              <Button size="sm" variant="outline" disabled={isSelf || nextRole === role}>
                <ShieldCheck aria-hidden /> Apply
              </Button>
            }
          />
        </Row>
      ) : null}

      <Row
        title="Profile verification"
        description={hasProfile ? (isVerified ? "Shown with a verified badge across the platform." : "Mark the profile as verified by the batch admins.") : "This account has no profile yet."}
      >
        <Button
          size="sm"
          variant="outline"
          disabled={!hasProfile || pending}
          onClick={() => run(() => setVerifiedAction(id, !isVerified))}
        >
          {isVerified ? <BadgeX aria-hidden /> : <BadgeCheck aria-hidden />}
          {isVerified ? "Remove verification" : "Verify profile"}
        </Button>
      </Row>

      <Row title="Reset password" description="Sets the password back to the roll number, clears any lockout and signs out all devices.">
        <ConfirmAction
          title={`Reset ${name}'s password?`}
          description="The password becomes their roll number and they must change it at next sign-in. All their sessions are signed out."
          confirmLabel="Reset password"
          action={() => resetPasswordAction(id)}
          trigger={
            <Button size="sm" variant="outline" disabled={isSelf}>
              <KeyRound aria-hidden /> Reset password
            </Button>
          }
        />
      </Row>

      {locked ? (
        <Row title="Unlock account" description="The account is locked after repeated failed sign-ins.">
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => unlockStudentAction(id))}>
            <LockOpen aria-hidden /> Unlock
          </Button>
        </Row>
      ) : null}

      <Row
        title={status === "ACTIVE" ? "Disable account" : "Enable account"}
        description={
          isSelf
            ? "You can't disable your own account."
            : status === "ACTIVE"
              ? (protectedAdmin ?? "Blocks sign-in and signs the student out everywhere. Content stays visible.")
              : "Allows the student to sign in again."
        }
      >
        {status === "ACTIVE" ? (
          <ConfirmAction
            title={`Disable ${name}'s account?`}
            description="They are signed out on every device and can't sign in until the account is enabled again."
            confirmLabel="Disable"
            action={() => setStatusAction(id, "DISABLED")}
            trigger={
              <Button size="sm" variant="destructive" disabled={isSelf || isLastActiveAdmin}>
                <Ban aria-hidden /> Disable
              </Button>
            }
          />
        ) : (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setStatusAction(id, "ACTIVE"))}>
            <UserCheck aria-hidden /> Enable
          </Button>
        )}
      </Row>

      <Row
        title="Delete account"
        description={isSelf ? "You can't delete your own account." : (protectedAdmin ?? "Soft delete: the account is hidden and signed out, content is kept. Can be restored.")}
      >
        <ConfirmAction
          title={`Delete ${name}'s account?`}
          description="The account is disabled, hidden from the batch and signed out everywhere. Their posts and comments are kept. You can restore it later from the deleted accounts filter."
          confirmLabel="Delete account"
          action={() => deleteStudentAction(id)}
          trigger={
            <Button size="sm" variant="destructive" disabled={isSelf || isLastActiveAdmin}>
              <Trash2 aria-hidden /> Delete
            </Button>
          }
        />
      </Row>
    </ul>
  );
}

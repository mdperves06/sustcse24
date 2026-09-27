"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormAlert, FormField, SubmitButton } from "@/components/shared/form";
import { useActionForm } from "@/hooks/use-action-form";
import { createStudentAction } from "@/actions/admin-students";

export function CreateStudentDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { state, pending, fieldError, formProps } = useActionForm(createStudentAction, {
    resetOnSuccess: true,
    onSuccess: (data) => {
      setOpen(false);
      if (data?.id) router.push(`/admin/students/${data.id}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus aria-hidden /> Add student
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a student</DialogTitle>
          <DialogDescription>
            The initial password is the student&apos;s roll number. They must choose a new password at first sign-in.
          </DialogDescription>
        </DialogHeader>
        <form {...formProps} className="space-y-4">
          <FormAlert message={!state.ok && !state.fieldErrors ? state.error : null} />
          <FormField label="Roll" name="roll" error={fieldError("roll")} hint="Can't be changed later." required>
            {(f) => <Input {...f} required maxLength={20} autoComplete="off" placeholder="e.g. 2024331001" />}
          </FormField>
          <FormField label="Full name" name="fullName" error={fieldError("fullName")} required>
            {(f) => <Input {...f} required maxLength={100} autoComplete="off" />}
          </FormField>
          <FormField label="Student ID" name="studentId" error={fieldError("studentId")}>
            {(f) => <Input {...f} maxLength={30} autoComplete="off" />}
          </FormField>
          <FormField label="Email" name="email" error={fieldError("email")}>
            {(f) => <Input {...f} type="email" maxLength={200} autoComplete="off" />}
          </FormField>
          <DialogFooter>
            <SubmitButton pending={pending} pendingText="Creating…">
              Create account
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, ListChecks, Loader2, RotateCcw, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useServerAction } from "@/hooks/use-action-form";
import { importStudentsAction, previewImportAction } from "@/actions/admin-import";
import { IMPORT_ISSUE_LABELS, IMPORT_MAX_ROWS, type ImportRowResult, type ImportSummary } from "@/lib/csv";
import type { ImportPreview } from "@/services/student-import";
import { cn } from "@/lib/utils";

const EXAMPLE = "roll,name,student_id,email\n240001,Student One,ID001,student1@example.com";
const MAX_FILE_BYTES = 512 * 1024;

type Row = ImportRowResult & { created?: boolean };

function RowStatus({ row, mode }: { row: Row; mode: "preview" | "result" }) {
  if (mode === "result" && row.created) {
    return (
      <Badge variant="outline" className="border-chart-5/30 bg-chart-5/10 text-chart-5">
        <CheckCircle2 aria-hidden /> Created
      </Badge>
    );
  }
  if (row.valid) {
    return (
      <Badge variant="outline" className="border-chart-5/30 bg-chart-5/10 text-chart-5">
        <CheckCircle2 aria-hidden /> Valid
      </Badge>
    );
  }
  return (
    <span className="flex flex-wrap gap-1">
      {row.issues.map((issue) => (
        <Badge key={issue} variant="destructive">
          {IMPORT_ISSUE_LABELS[issue]}
        </Badge>
      ))}
    </span>
  );
}

function RowsView({ rows, mode }: { rows: Row[]; mode: "preview" | "result" }) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">No rows to show.</p>;
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-16 pl-3">Line</TableHead>
              <TableHead>Roll</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Student ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="pr-3">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.line} className={cn(!r.valid && !r.created && "bg-destructive/5")}>
                <TableCell className="pl-3 text-muted-foreground tabular-nums">{r.line}</TableCell>
                <TableCell className="font-mono text-xs">{r.roll || "—"}</TableCell>
                <TableCell className="max-w-48 truncate">{r.name || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{r.studentId ?? "—"}</TableCell>
                <TableCell className="max-w-56 truncate text-muted-foreground">{r.email ?? "—"}</TableCell>
                <TableCell className="pr-3 whitespace-normal">
                  <RowStatus row={r} mode={mode} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="space-y-2 md:hidden">
        {rows.map((r) => (
          <li key={r.line} className={cn("rounded-xl border p-3 text-sm", !r.valid && !r.created && "border-destructive/30 bg-destructive/5")}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs">{r.roll || "(no roll)"}</span>
              <span className="text-xs text-muted-foreground">Line {r.line}</span>
            </div>
            <p className="mt-0.5 font-medium">{r.name || "(no name)"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[r.studentId, r.email].filter(Boolean).join(" · ") || "No student ID or email"}
            </p>
            <div className="mt-2">
              <RowStatus row={r} mode={mode} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export function ImportWizard() {
  const fileId = useId();
  const textId = useId();
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const validate = useServerAction();
  const commit = useServerAction();

  function changeCsv(next: string) {
    setCsv(next);
    setPreview(null);
    setSummary(null);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error("That file is too large (max 512 KB).");
      e.target.value = "";
      return;
    }
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      toast.error("Choose a .csv file.");
      e.target.value = "";
      return;
    }
    setFileName(file.name);
    changeCsv(await file.text());
  }

  function reset() {
    setCsv("");
    setFileName(null);
    setPreview(null);
    setSummary(null);
  }

  const shownRows: Row[] = summary
    ? summary.results.filter((r) => !onlyProblems || !r.created)
    : (preview?.rows ?? []).filter((r) => !onlyProblems || !r.valid);

  if (summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-chart-5" aria-hidden /> Import finished
          </CardTitle>
          <CardDescription>
            Created {summary.created} account{summary.created === 1 ? "" : "s"}, skipped {summary.skipped}. New students sign in with their
            roll number as the password and must change it at first sign-in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border p-3">
              <p className="text-2xl font-semibold tabular-nums">{summary.total}</p>
              <p className="text-xs text-muted-foreground">Rows</p>
            </div>
            <div className="rounded-xl border border-chart-5/30 bg-chart-5/5 p-3">
              <p className="text-2xl font-semibold text-chart-5 tabular-nums">{summary.created}</p>
              <p className="text-xs text-muted-foreground">Created</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-2xl font-semibold tabular-nums">{summary.skipped}</p>
              <p className="text-xs text-muted-foreground">Skipped</p>
            </div>
          </div>
          {summary.skipped ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} className="size-4 accent-primary" />
              Show only skipped rows
            </label>
          ) : null}
          <RowsView rows={shownRows} mode="result" />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={reset}>
              <RotateCcw aria-hidden /> Import another file
            </Button>
            <Button asChild>
              <Link href="/admin/students?flag=default_password">View new accounts</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-4 text-primary" aria-hidden /> 1. Choose the CSV
          </CardTitle>
          <CardDescription>
            Required columns: <code className="font-mono">roll</code>, <code className="font-mono">name</code>. Optional:{" "}
            <code className="font-mono">student_id</code>, <code className="font-mono">email</code>. Headers are case-insensitive and can be in
            any order. Up to {IMPORT_MAX_ROWS} rows per import.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor={fileId} className="mb-1.5 block text-sm font-medium">
              Upload a file
            </Label>
            <label
              htmlFor={fileId}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-4 text-sm transition-colors hover:border-primary/40 hover:bg-accent/30 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
            >
              <Upload className="size-5 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{fileName ?? "Choose a .csv file…"}</span>
              <input id={fileId} type="file" accept=".csv,text/csv" className="sr-only" onChange={onFile} />
            </label>
          </div>
          <div>
            <Label htmlFor={textId} className="mb-1.5 block text-sm font-medium">
              …or paste CSV text
            </Label>
            <Textarea
              id={textId}
              value={csv}
              onChange={(e) => {
                setFileName(null);
                changeCsv(e.target.value);
              }}
              rows={8}
              spellCheck={false}
              placeholder={EXAMPLE}
              className="font-mono text-xs"
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {csv ? (
              <Button variant="ghost" onClick={reset}>
                Clear
              </Button>
            ) : null}
            <Button
              disabled={!csv.trim() || validate.pending}
              onClick={() => validate.run(() => previewImportAction(csv), { onSuccess: (data) => data && setPreview(data) })}
            >
              {validate.pending ? <Loader2 className="animate-spin" aria-hidden /> : <ListChecks aria-hidden />}
              Validate
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {preview.invalid ? (
                <AlertTriangle className="size-4 text-chart-3" aria-hidden />
              ) : (
                <CheckCircle2 className="size-4 text-chart-5" aria-hidden />
              )}
              2. Review and import
            </CardTitle>
            <CardDescription>
              {preview.valid} of {preview.total} rows are valid.
              {preview.invalid ? ` ${preview.invalid} will be skipped.` : ""} Rows are checked again on the server when you import.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={onlyProblems}
                  onChange={(e) => setOnlyProblems(e.target.checked)}
                  className="size-4 accent-primary"
                  disabled={!preview.invalid}
                />
                Show only rows with problems
              </label>
              <span className="flex gap-2 text-xs">
                <Badge variant="outline" className="border-chart-5/30 bg-chart-5/10 text-chart-5">
                  {preview.valid} valid
                </Badge>
                {preview.invalid ? (
                  <Badge variant="destructive">
                    <XCircle aria-hidden /> {preview.invalid} invalid
                  </Badge>
                ) : null}
              </span>
            </div>
            <RowsView rows={shownRows} mode="preview" />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              {commit.pending ? (
                <p className="text-xs text-muted-foreground" role="status">
                  Creating accounts… this can take a minute for large files. Keep this page open.
                </p>
              ) : null}
              <Button
                disabled={preview.valid === 0 || commit.pending}
                onClick={() =>
                  commit.run(() => importStudentsAction(csv), {
                    onSuccess: (data) => {
                      if (!data) return;
                      setOnlyProblems(false);
                      setSummary(data);
                      toast.success(`Created ${data.created} account${data.created === 1 ? "" : "s"}.`);
                    },
                  })
                }
              >
                {commit.pending ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
                Import {preview.valid} student{preview.valid === 1 ? "" : "s"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, Plus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/shared/user-avatar";

export type PickedMember = { roll: string; name: string; avatarKey: string | null; role: string | null };

type SearchResult = { userId: string; roll: string; fullName: string; avatarKey: string | null };

/**
 * Searches batch members by name/roll (GET /api/students) and keeps a team list.
 * Submits as one hidden JSON input: [{ roll, role }]. The author is always the Lead.
 */
export function MemberPicker({
  name,
  author,
  initial = [],
  "aria-describedby": describedBy,
}: {
  name: string;
  author: { roll: string; name: string; avatarKey: string | null };
  initial?: PickedMember[];
  "aria-describedby"?: string;
}) {
  const [members, setMembers] = useState<PickedMember[]>(initial);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState("");
  const inputId = useId();
  const listId = useId();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      abortRef.current?.abort();
      return;
    }
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/students?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const json = (await res.json()) as { data?: { students: SearchResult[] }; error?: string };
        if (!res.ok || !json.data) throw new Error(json.error ?? "Search failed.");
        setResults(json.data.students.slice(0, 8));
        setSearched(q);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("Couldn't search members. Try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const taken = new Set([author.roll.toUpperCase(), ...members.map((m) => m.roll.toUpperCase())]);
  const current = query.trim();
  const fresh = current.length >= 2 && searched === current;
  const visibleResults = fresh ? results.filter((r) => !taken.has(r.roll.toUpperCase())) : [];

  function add(r: SearchResult) {
    setMembers((prev) =>
      prev.length >= 11 ? prev : [...prev, { roll: r.roll, name: r.fullName, avatarKey: r.avatarKey, role: null }],
    );
    setQuery("");
    setResults([]);
  }

  return (
    <div className="space-y-3">
      <input
        type="hidden"
        name={name}
        value={JSON.stringify(members.map((m) => ({ roll: m.roll, role: m.role || null })))}
      />
      <ul className="space-y-2" aria-label="Team members">
        <li className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2">
          <UserAvatar name={author.name} avatarKey={author.avatarKey} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{author.name} (you)</p>
            <p className="font-mono text-xs text-muted-foreground">{author.roll}</p>
          </div>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Lead</span>
        </li>
        {members.map((m, i) => (
          <li key={m.roll} className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2">
            <UserAvatar name={m.name} avatarKey={m.avatarKey} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.name}</p>
              <p className="font-mono text-xs text-muted-foreground">{m.roll}</p>
            </div>
            <Input
              aria-label={`Role of ${m.name}`}
              placeholder="Role (optional)"
              maxLength={40}
              value={m.role ?? ""}
              onChange={(e) => {
                const role = e.target.value;
                setMembers((prev) => prev.map((x, j) => (j === i ? { ...x, role } : x)));
              }}
              className="h-8 w-full sm:w-40"
            />
            <button
              type="button"
              onClick={() => setMembers((prev) => prev.filter((_, j) => j !== i))}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              aria-label={`Remove ${m.name}`}
            >
              <X className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      <div className="relative">
        <label htmlFor={inputId} className="sr-only">
          Add a team member by name or roll
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          id={inputId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (visibleResults[0]) add(visibleResults[0]);
            }
          }}
          placeholder="Add teammate — search name or roll…"
          className="pl-9"
          role="combobox"
          aria-expanded={visibleResults.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-describedby={describedBy}
          autoComplete="off"
        />
        {loading ? (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
        ) : null}
        {visibleResults.length ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg"
          >
            {visibleResults.map((r) => (
              <li key={r.userId} role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => add(r)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                >
                  <UserAvatar name={r.fullName} avatarKey={r.avatarKey} size="xs" />
                  <span className="min-w-0 flex-1 truncate">{r.fullName}</span>
                  <span className="font-mono text-xs text-muted-foreground">{r.roll}</span>
                  <Plus className="size-4 text-muted-foreground" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {fresh && !loading && !error && results.length > 0 && visibleResults.length === 0 ? (
        <p className="text-xs text-muted-foreground">Everyone matching is already on the team.</p>
      ) : null}
      {fresh && !loading && !error && results.length === 0 ? (
        <p className="text-xs text-muted-foreground">No batch members match “{current}”.</p>
      ) : null}
    </div>
  );
}

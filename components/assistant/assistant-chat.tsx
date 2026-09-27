"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bot, Loader2, SendHorizontal, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askAssistantAction } from "@/actions/assistant";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Who knows Python and React?",
  "Show students interested in AI.",
  "What events are coming this month?",
  "Find project teammates with cybersecurity skills.",
];

/** Renders plain assistant text, turning /students/<roll> paths into links. Never renders HTML. */
function AssistantText({ text }: { text: string }) {
  const parts = text.split(/(\/(?:students|events|projects)\/[A-Za-z0-9_-]+)/g);
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Link key={i} href={part} className="font-medium text-primary underline-offset-4 hover:underline">
            {part}
          </Link>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

export function AssistantChat({ firstName }: { firstName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  function send(text: string) {
    const content = text.trim();
    if (!content || pending) return;
    const next = [...messages, { role: "user" as const, content }].slice(-20);
    setMessages(next);
    setDraft("");
    startTransition(async () => {
      try {
        const result = await askAssistantAction(next);
        if (result.ok && result.data) {
          setMessages((m) => [...m, { role: "assistant", content: result.data!.reply }]);
        } else if (!result.ok) {
          toast.error(result.error);
          setMessages((m) => m.slice(0, -1));
          setDraft(content);
        }
      } catch {
        toast.error("Network error — check your connection and try again.");
        setMessages((m) => m.slice(0, -1));
        setDraft(content);
      }
    });
  }

  return (
    <div className="flex h-[calc(100dvh-20rem)] min-h-[26rem] flex-col rounded-2xl border bg-card shadow-xs">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" aria-live="polite">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="size-6" aria-hidden />
            </div>
            <p className="font-semibold">Hi {firstName}! What would you like to know?</p>
            <div className="mt-5 flex max-w-xl flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => send(s)} className="h-auto py-1.5 whitespace-normal">
                  {s}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                )}
                aria-hidden
              >
                {m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
              </div>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                <span className="sr-only">{m.role === "user" ? "You said:" : "Assistant said:"}</span>
                {m.role === "assistant" ? <AssistantText text={m.content} /> : <p className="text-sm whitespace-pre-wrap">{m.content}</p>}
              </div>
            </div>
          ))
        )}
        {pending ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Thinking…
          </div>
        ) : null}
        <div ref={endRef} />
      </div>
      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <label htmlFor="assistant-input" className="sr-only">
          Ask the assistant
        </label>
        <Textarea
          id="assistant-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            }
          }}
          placeholder="Ask about skills, events, opportunities…"
          rows={1}
          maxLength={4000}
          className="max-h-32 min-h-10 resize-none"
        />
        <Button type="submit" size="icon-lg" disabled={pending || !draft.trim()} aria-label="Send">
          <SendHorizontal aria-hidden />
        </Button>
      </form>
    </div>
  );
}

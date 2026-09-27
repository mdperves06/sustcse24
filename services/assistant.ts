import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getSetting } from "@/lib/settings";
import { enforceRateLimit } from "@/lib/rate-limit";
import { AppError } from "@/lib/errors";
import type { Viewer } from "@/lib/privacy";
import { skillSlug } from "@/lib/skills";
import { activeUserWhere, authorSelect, toAuthor } from "@/lib/selects";
import { searchDirectory } from "@/services/directory";
import { formatDateTime } from "@/lib/time";

/**
 * AI Batch Assistant.
 *
 * Privacy model: the model never queries the database directly. It can only call the
 * tools below, and every tool goes through the same privacy-aware services the UI uses
 * (e.g. searchDirectory hides location/career of students who keep them private, and
 * contact details are never returned at all). So the assistant cannot reveal anything
 * the signed-in viewer couldn't see themselves.
 */

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});
export const chatInputSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(20),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export function isAssistantConfigured() {
  return Boolean(env.ANTHROPIC_API_KEY);
}

const MAX_TOOL_ROUNDS = 6;

const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "search_students",
    description:
      "Search the CSE 24 batch directory. Returns only information the students chose to share with the batch: name, roll, bio, skills, and (if shared) position/organization. Use it for questions like 'who knows Python and React' or 'students interested in AI'. All filters are optional; `skills` requires students to have every listed skill.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Name, nickname or roll to match." },
        skills: { type: "array", items: { type: "string" }, description: "Skills the student must have, e.g. ['Python','React']." },
        interest: { type: "string", description: "An interest tag, e.g. 'AI/ML'." },
        company: { type: "string", description: "Current organization (only matches students sharing career info)." },
        location: { type: "string", description: "City/area (only matches students sharing location)." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_events",
    description: "List batch events (meetups, hackathons, workshops, tours…) and calendar entries (exams, assignments, deadlines) in a date window.",
    input_schema: {
      type: "object",
      properties: {
        days_ahead: { type: "integer", minimum: 1, maximum: 120, description: "How many days ahead to look (default 30)." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_opportunities",
    description: "List open (not expired) opportunities shared on the career board: internships, jobs, hackathons, scholarships, competitions, research, freelancing.",
    input_schema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["INTERNSHIP", "JOB", "HACKATHON", "SCHOLARSHIP", "COMPETITION", "RESEARCH", "FREELANCING"],
        },
        query: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "find_teammate_requests",
    description: "List open 'Find a Teammate' requests, optionally only those requiring all of the given skills.",
    input_schema: {
      type: "object",
      properties: { skills: { type: "array", items: { type: "string" } } },
      additionalProperties: false,
    },
  },
  {
    name: "skill_statistics",
    description: "Aggregate counts of how many batch members list each skill (no names).",
    input_schema: {
      type: "object",
      properties: { top: { type: "integer", minimum: 1, maximum: 50 } },
      additionalProperties: false,
    },
  },
];

const searchStudentsInput = z.object({
  query: z.string().max(100).optional(),
  skills: z.array(z.string().max(60)).max(6).optional(),
  interest: z.string().max(60).optional(),
  company: z.string().max(120).optional(),
  location: z.string().max(100).optional(),
});

async function runTool(viewer: Viewer, name: string, rawInput: unknown): Promise<string> {
  switch (name) {
    case "search_students": {
      const input = searchStudentsInput.parse(rawInput);
      const skills = input.skills ?? [];
      // The directory filters by one skill; apply the first there and the rest here.
      const result = await searchDirectory(viewer, {
        q: input.query,
        skill: skills[0],
        interest: input.interest,
        company: input.company,
        location: input.location,
        sort: "name",
        page: 1,
      });
      let students = result.students;
      if (skills.length > 1) {
        const required = skills.slice(1).map(skillSlug);
        const withSkills = await db.profileSkill.findMany({
          where: { userId: { in: students.map((s) => s.userId) }, skill: { slug: { in: required } } },
          select: { userId: true, skill: { select: { slug: true } } },
        });
        const has = new Map<string, Set<string>>();
        for (const row of withSkills) (has.get(row.userId) ?? has.set(row.userId, new Set()).get(row.userId)!).add(row.skill.slug);
        students = students.filter((s) => required.every((r) => has.get(s.userId)?.has(r)));
      }
      return JSON.stringify({
        count: students.length,
        students: students.map((s) => ({
          name: s.fullName,
          roll: s.roll,
          profile: `/students/${s.roll}`,
          bio: s.bio,
          skills: s.skills,
          position: s.position,
          organization: s.organization,
        })),
      });
    }
    case "list_events": {
      const { days_ahead = 30 } = z.object({ days_ahead: z.number().int().min(1).max(120).optional() }).parse(rawInput);
      const now = new Date();
      const until = new Date(now.getTime() + days_ahead * 86_400_000);
      const [events, entries] = await Promise.all([
        db.event.findMany({
          where: { deletedAt: null, startsAt: { gte: now, lte: until } },
          orderBy: { startsAt: "asc" },
          take: 20,
          select: { id: true, title: true, type: true, startsAt: true, location: true, organizer: true },
        }),
        db.calendarEvent.findMany({
          where: { deletedAt: null, startsAt: { gte: now, lte: until } },
          orderBy: { startsAt: "asc" },
          take: 20,
          select: { title: true, type: true, startsAt: true, course: true, location: true },
        }),
      ]);
      return JSON.stringify({
        events: events.map((e) => ({ ...e, startsAt: formatDateTime(e.startsAt), link: `/events/${e.id}` })),
        calendar: entries.map((e) => ({ ...e, startsAt: formatDateTime(e.startsAt) })),
      });
    }
    case "list_opportunities": {
      const input = z.object({ type: z.string().optional(), query: z.string().max(100).optional() }).parse(rawInput);
      const rows = await db.opportunity.findMany({
        where: {
          deletedAt: null,
          OR: [{ deadline: null }, { deadline: { gte: new Date() } }],
          ...(input.type ? { type: input.type as never } : {}),
          ...(input.query
            ? { OR: [{ title: { contains: input.query, mode: "insensitive" } }, { organization: { contains: input.query, mode: "insensitive" } }] }
            : {}),
        },
        orderBy: { deadline: "asc" },
        take: 15,
        select: { title: true, organization: true, type: true, location: true, deadline: true, applyUrl: true },
      });
      return JSON.stringify(rows.map((r) => ({ ...r, deadline: r.deadline ? formatDateTime(r.deadline) : null })));
    }
    case "find_teammate_requests": {
      const { skills = [] } = z.object({ skills: z.array(z.string().max(60)).max(6).optional() }).parse(rawInput);
      const rows = await db.teammateRequest.findMany({
        where: {
          deletedAt: null,
          status: "OPEN",
          author: activeUserWhere,
          ...(skills.length ? { requiredSkills: { hasEvery: skills.map((s) => s.trim().toLowerCase()) } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: { title: true, description: true, requiredSkills: true, teammatesNeeded: true, deadline: true, author: { select: authorSelect } },
      });
      return JSON.stringify(
        rows.map((r) => ({
          title: r.title,
          description: r.description,
          requiredSkills: r.requiredSkills,
          teammatesNeeded: r.teammatesNeeded,
          deadline: r.deadline ? formatDateTime(r.deadline) : null,
          postedBy: toAuthor(r.author).name,
        })),
      );
    }
    case "skill_statistics": {
      const { top = 20 } = z.object({ top: z.number().int().min(1).max(50).optional() }).parse(rawInput);
      const skills = await db.skill.findMany({
        select: { name: true, category: true, _count: { select: { profiles: { where: { user: activeUserWhere } } } } },
        orderBy: { profiles: { _count: "desc" } },
        take: top,
      });
      return JSON.stringify(skills.map((s) => ({ skill: s.name, category: s.category, members: s._count.profiles })));
    }
    default:
      throw new Error(`Unknown tool ${name}`);
  }
}

function systemPrompt(viewer: Viewer & { fullName: string }) {
  return [
    "You are the CSE 24 Batch Assistant inside a private university batch community platform.",
    `You're helping ${viewer.fullName}. Today is ${formatDateTime(new Date())} (Asia/Dhaka).`,
    "Answer only from the data your tools return — they already apply every student's privacy settings. If a tool doesn't return a detail (phone, email, location, etc.), it is private or unknown: say so and never guess, infer or invent personal information.",
    "When you mention a student, include their name and roll, and link to their profile as a relative markdown-free path like /students/<roll>.",
    "Be concise and friendly. Use short lists. If a request is unrelated to the batch community, briefly help if it's harmless, otherwise steer back.",
  ].join("\n");
}

let client: Anthropic | null = null;

/** Runs one assistant turn with tool use. Returns the final text. */
export async function askAssistant(viewer: Viewer & { fullName: string }, input: unknown): Promise<string> {
  if (!isAssistantConfigured()) throw new AppError("The AI assistant isn't configured on this server yet.", 503);
  if (!(await getSetting("aiAssistantEnabled"))) throw new AppError("The AI assistant has been turned off by an admin.", 503);
  const { messages: history } = chatInputSchema.parse(input);
  if (history.at(-1)?.role !== "user") throw new AppError("The last message must be from you.", 400);
  await enforceRateLimit(`assistant:${viewer.id}`, 20, 10 * 60, "You've sent a lot of questions — please wait a few minutes.");

  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
  // Server-side refusal fallbacks are supported on the Opus 5 / Fable 5.1 family.
  const useFallbacks = /^claude-(opus-5|fable-5)/.test(env.AI_MODEL);

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.beta.messages.create({
      model: env.AI_MODEL,
      max_tokens: 16000,
      system: systemPrompt(viewer),
      tools: TOOLS,
      messages,
      ...(useFallbacks ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    });

    if (response.stop_reason === "refusal") {
      return "Sorry — I can't help with that request.";
    }
    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }

    const toolUses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
      const text = response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return text || "I couldn't find an answer to that.";
    }

    messages.push({ role: "assistant", content: response.content });
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = await Promise.all(
      toolUses.map(async (tool) => {
        try {
          return { type: "tool_result" as const, tool_use_id: tool.id, content: await runTool(viewer, tool.name, tool.input) };
        } catch (error) {
          console.error("[assistant] tool failed", tool.name, error);
          return { type: "tool_result" as const, tool_use_id: tool.id, content: "The tool failed or the input was invalid.", is_error: true };
        }
      }),
    );
    messages.push({ role: "user", content: results });
  }
  return "That took too many steps — try asking a more specific question.";
}

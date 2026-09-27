import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, can } from "@/lib/auth/permissions";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { Prisma } from "@/lib/generated/prisma/client";
import type { Viewer } from "@/lib/privacy";
import { enforceRateLimit } from "@/lib/rate-limit";
import { authorSelect, toAuthor, type Author } from "@/lib/selects";
import { pollSchema, voteSchema } from "@/lib/validation/polls";
import { notifyBatch } from "@/services/notifications";

export type PollStatus = "active" | "upcoming" | "closed";

export type PollOptionView = {
  id: string;
  label: string;
  /** null when the viewer may not see results yet. */
  votes: number | null;
  /** Staff only, non-anonymous polls only. Never populated for anonymous polls. */
  voters: Author[] | null;
};

export type PollView = {
  id: string;
  question: string;
  description: string | null;
  multipleChoice: boolean;
  anonymous: boolean;
  startsAt: Date;
  endsAt: Date | null;
  createdAt: Date;
  createdBy: Author;
  status: PollStatus;
  options: PollOptionView[];
  /** null when results are hidden from the viewer. */
  totalVoters: number | null;
  myChoices: string[];
  hasVoted: boolean;
  canVote: boolean;
  showResults: boolean;
  canManage: boolean;
};

export function pollStatus(p: { startsAt: Date; endsAt: Date | null }, now = new Date()): PollStatus {
  if (p.startsAt.getTime() > now.getTime()) return "upcoming";
  if (p.endsAt && p.endsAt.getTime() <= now.getTime()) return "closed";
  return "active";
}

const pollSelect = (viewerId: string) =>
  ({
    id: true,
    question: true,
    description: true,
    multipleChoice: true,
    anonymous: true,
    startsAt: true,
    endsAt: true,
    createdAt: true,
    createdBy: { select: authorSelect },
    options: {
      orderBy: { position: "asc" },
      select: { id: true, label: true, _count: { select: { votes: true } } },
    },
    _count: { select: { ballots: true } },
    ballots: { where: { userId: viewerId }, select: { votes: { select: { optionId: true } } } },
  }) satisfies Prisma.PollSelect;

type PollRow = Prisma.PollGetPayload<{ select: ReturnType<typeof pollSelect> }>;

/**
 * Voter identities for NON-anonymous polls, staff only. The anonymous check is done by the
 * caller *and* in the query, so identities of anonymous polls are never even read.
 */
async function votersByOption(pollIds: string[]): Promise<Map<string, Author[]>> {
  const out = new Map<string, Author[]>();
  if (pollIds.length === 0) return out;
  const votes = await db.pollVote.findMany({
    where: { option: { pollId: { in: pollIds }, poll: { anonymous: false } } },
    orderBy: { ballot: { createdAt: "asc" } },
    select: { optionId: true, ballot: { select: { user: { select: authorSelect } } } },
  });
  for (const v of votes) {
    const list = out.get(v.optionId) ?? [];
    list.push(toAuthor(v.ballot.user));
    out.set(v.optionId, list);
  }
  return out;
}

function toPollView(row: PollRow, viewer: Viewer, voters: Map<string, Author[]>, now: Date): PollView {
  const staff = can(viewer.role, "polls.create");
  const status = pollStatus(row, now);
  const ballot = row.ballots[0] ?? null;
  const hasVoted = Boolean(ballot);
  const showResults = hasVoted || status === "closed" || staff;
  const showVoters = staff && !row.anonymous;
  return {
    id: row.id,
    question: row.question,
    description: row.description,
    multipleChoice: row.multipleChoice,
    anonymous: row.anonymous,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    createdAt: row.createdAt,
    createdBy: toAuthor(row.createdBy),
    status,
    options: row.options.map((o) => ({
      id: o.id,
      label: o.label,
      votes: showResults ? o._count.votes : null,
      voters: showVoters ? (voters.get(o.id) ?? []) : null,
    })),
    totalVoters: showResults ? row._count.ballots : null,
    myChoices: ballot ? ballot.votes.map((v) => v.optionId) : [],
    hasVoted,
    canVote: status === "active" && !hasVoted,
    showResults,
    canManage: staff,
  };
}

const STATUS_ORDER: Record<PollStatus, number> = { active: 0, upcoming: 1, closed: 2 };

/** Active polls first (closing soonest first), then upcoming (starting soonest), then closed (most recent). */
export async function listPolls(viewer: Viewer): Promise<PollView[]> {
  const now = new Date();
  const rows = await db.poll.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: pollSelect(viewer.id),
  });
  const staff = can(viewer.role, "polls.create");
  const voters = staff ? await votersByOption(rows.filter((r) => !r.anonymous).map((r) => r.id)) : new Map<string, Author[]>();
  const views = rows.map((r) => toPollView(r, viewer, voters, now));
  const far = Number.MAX_SAFE_INTEGER;
  return views.sort((a, b) => {
    if (a.status !== b.status) return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (a.status === "active") return (a.endsAt?.getTime() ?? far) - (b.endsAt?.getTime() ?? far) || b.createdAt.getTime() - a.createdAt.getTime();
    if (a.status === "upcoming") return a.startsAt.getTime() - b.startsAt.getTime();
    return (b.endsAt?.getTime() ?? 0) - (a.endsAt?.getTime() ?? 0);
  });
}

export async function getPoll(viewer: Viewer, pollId: string): Promise<PollView> {
  const row = await db.poll.findFirst({ where: { id: pollId, deletedAt: null }, select: pollSelect(viewer.id) });
  if (!row) throw new NotFoundError("This poll doesn't exist.");
  const voters = can(viewer.role, "polls.create") && !row.anonymous ? await votersByOption([row.id]) : new Map<string, Author[]>();
  return toPollView(row, viewer, voters, new Date());
}

// ───────────────────────────── Staff ─────────────────────────────

export async function createPoll(actor: Viewer, input: unknown) {
  assertCan(actor, "polls.create");
  const data = pollSchema.parse(input);
  const poll = await db.poll.create({
    data: {
      question: data.question,
      description: data.description,
      multipleChoice: data.multipleChoice,
      anonymous: data.anonymous,
      startsAt: data.startsAt ?? new Date(),
      endsAt: data.endsAt,
      createdById: actor.id,
      options: { create: data.options.map((label, position) => ({ label, position })) },
    },
    select: { id: true, question: true },
  });
  await audit({ actorId: actor.id, action: "poll.create", entityType: "Poll", entityId: poll.id, metadata: { question: poll.question } });
  await notifyBatch({
    type: "POLL",
    title: `New poll: ${poll.question}`,
    body: data.anonymous ? "Anonymous poll — your vote stays private." : null,
    link: "/polls",
    actorId: actor.id,
    dedupeKey: `poll:${poll.id}`,
  });
  return poll;
}

/** Closes an open or upcoming poll immediately. */
export async function closePoll(actor: Viewer, pollId: string) {
  assertCan(actor, "polls.create");
  const poll = await db.poll.findFirst({ where: { id: pollId, deletedAt: null }, select: { id: true, startsAt: true, endsAt: true } });
  if (!poll) throw new NotFoundError("This poll doesn't exist.");
  if (pollStatus(poll) === "closed") throw new ValidationError("This poll is already closed.");
  const now = new Date();
  // An upcoming poll closed early never opens: move its start back so startsAt <= endsAt still holds.
  await db.poll.update({
    where: { id: poll.id },
    data: { endsAt: now, ...(poll.startsAt > now ? { startsAt: now } : {}) },
  });
  await audit({ actorId: actor.id, action: "poll.close", entityType: "Poll", entityId: poll.id });
}

export async function deletePoll(actor: Viewer, pollId: string) {
  assertCan(actor, "polls.create");
  const poll = await db.poll.findFirst({ where: { id: pollId, deletedAt: null }, select: { id: true, question: true } });
  if (!poll) throw new NotFoundError("This poll doesn't exist.");
  await db.poll.update({ where: { id: poll.id }, data: { deletedAt: new Date() } });
  await audit({ actorId: actor.id, action: "poll.delete", entityType: "Poll", entityId: poll.id, metadata: { question: poll.question } });
}

// ───────────────────────────── Voting ─────────────────────────────

const ALREADY_VOTED = "You've already voted in this poll.";

export async function vote(actor: Viewer, pollId: string, input: unknown) {
  const { optionIds } = voteSchema.parse(input);
  const poll = await db.poll.findFirst({
    where: { id: pollId, deletedAt: null },
    select: { id: true, startsAt: true, endsAt: true, multipleChoice: true, options: { select: { id: true } } },
  });
  if (!poll) throw new NotFoundError("This poll doesn't exist.");

  const status = pollStatus(poll);
  if (status === "upcoming") throw new ValidationError("This poll hasn't opened yet.");
  if (status === "closed") throw new ValidationError("This poll is closed.");

  const valid = new Set(poll.options.map((o) => o.id));
  if (optionIds.some((id) => !valid.has(id))) {
    throw new ValidationError("One of the chosen options doesn't belong to this poll.", { optionIds: ["Choose from the listed options."] });
  }
  if (!poll.multipleChoice && optionIds.length !== 1) {
    throw new ValidationError("Choose exactly one option.", { optionIds: ["Choose exactly one option."] });
  }

  await enforceRateLimit(`poll:vote:${actor.id}`, 30, 60);

  const existing = await db.pollBallot.findUnique({ where: { pollId_userId: { pollId: poll.id, userId: actor.id } }, select: { id: true } });
  if (existing) throw new ConflictError(ALREADY_VOTED);

  try {
    // Ballot + choices in one statement; the (pollId, userId) unique constraint settles races.
    await db.pollBallot.create({
      data: { pollId: poll.id, userId: actor.id, votes: { create: optionIds.map((optionId) => ({ optionId })) } },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictError(ALREADY_VOTED);
    throw error;
  }
}

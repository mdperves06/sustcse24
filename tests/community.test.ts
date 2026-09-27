import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { addComment, createPost, deletePost, getPost, reportPost, setPostRemoved, updatePost } from "@/services/posts";
import { setRsvp } from "@/services/events";
import { vote } from "@/services/polls";
import { createUser, resetDatabase, viewerOf } from "./helpers/db";

beforeEach(resetDatabase);

describe("posts", () => {
  it("creates, edits and deletes own posts", async () => {
    const author = await createUser();
    const post = await createPost(viewerOf(author), { type: "QUESTION", content: "How do I study DP?" });

    await updatePost(viewerOf(author), post.id, { type: "DISCUSSION", content: "Edited text" });
    const edited = await db.post.findUniqueOrThrow({ where: { id: post.id } });
    expect(edited.content).toBe("Edited text");
    expect(edited.editedAt).not.toBeNull();

    await deletePost(viewerOf(author), post.id);
    expect((await db.post.findUniqueOrThrow({ where: { id: post.id } })).deletedAt).not.toBeNull();
  });

  it("does not let students edit or delete someone else's post", async () => {
    const author = await createUser();
    const other = await createUser();
    const post = await createPost(viewerOf(author), { content: "Mine" });
    await expect(updatePost(viewerOf(other), post.id, { content: "Hijacked" })).rejects.toThrow();
    await expect(deletePost(viewerOf(other), post.id)).rejects.toThrow();
    expect((await db.post.findUniqueOrThrow({ where: { id: post.id } })).content).toBe("Mine");
  });

  it("only staff can post announcements", async () => {
    const student = await createUser();
    await expect(createPost(viewerOf(student), { type: "ANNOUNCEMENT", content: "Fake" })).rejects.toThrow();
  });

  it("reports a post once per user", async () => {
    const author = await createUser();
    const reporter = await createUser();
    const post = await createPost(viewerOf(author), { content: "Spammy" });
    await reportPost(viewerOf(reporter), post.id, { reason: "Spam" });
    await expect(reportPost(viewerOf(reporter), post.id, { reason: "Spam" })).rejects.toThrow(/already reported/);
    expect(await db.report.count({ where: { postId: post.id } })).toBe(1);
  });

  it("moderators can remove posts; students cannot", async () => {
    const author = await createUser();
    const mod = await createUser({ role: "MODERATOR" });
    const post = await createPost(viewerOf(author), { content: "Bad" });
    await expect(setPostRemoved(viewerOf(author), post.id, true, "x")).rejects.toThrow();
    await setPostRemoved(viewerOf(mod), post.id, true, "Off-topic");
    await expect(getPost(viewerOf(author), post.id)).rejects.toThrow();
    expect(await db.auditLog.count({ where: { action: "post.remove" } })).toBe(1);
  });

  it("blocks restricted users from posting and commenting", async () => {
    const author = await createUser();
    const post = await createPost(viewerOf(author), { content: "Hi" });
    const restricted = await createUser();
    await db.user.update({ where: { id: restricted.id }, data: { postingRestrictedUntil: new Date(Date.now() + 86_400_000) } });
    await expect(createPost(viewerOf(restricted), { content: "x" })).rejects.toThrow();
    await expect(addComment(viewerOf(restricted), post.id, { content: "x" })).rejects.toThrow();
  });
});

describe("events", () => {
  it("records one RSVP per user and lets them change it", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const student = await createUser();
    const event = await db.event.create({
      data: { title: "Meetup", description: "d", startsAt: new Date(Date.now() + 5 * 86_400_000), location: "Campus", organizer: "Batch", createdById: admin.id },
    });

    await setRsvp(viewerOf(student), event.id, { status: "GOING" });
    await setRsvp(viewerOf(student), event.id, { status: "GOING" });
    await setRsvp(viewerOf(student), event.id, { status: "MAYBE" });

    const rows = await db.eventAttendee.findMany({ where: { eventId: event.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("MAYBE");
  });

  it("closes RSVPs after the registration deadline", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const student = await createUser();
    const event = await db.event.create({
      data: {
        title: "Tour",
        description: "d",
        startsAt: new Date(Date.now() + 5 * 86_400_000),
        registrationDeadline: new Date(Date.now() - 1000),
        location: "Ratargul",
        organizer: "Batch",
        createdById: admin.id,
      },
    });
    await expect(setRsvp(viewerOf(student), event.id, { status: "GOING" })).rejects.toThrow(/closed/);
  });
});

describe("polls", () => {
  async function makePoll(multipleChoice = false) {
    const admin = await createUser({ role: "ADMIN" });
    return db.poll.create({
      data: {
        question: "Where to meet?",
        multipleChoice,
        createdById: admin.id,
        options: { create: ["Campus", "Dhaka", "Sylhet"].map((label, position) => ({ label, position })) },
      },
      include: { options: true },
    });
  }

  it("accepts a vote and rejects a second one", async () => {
    const poll = await makePoll();
    const voter = await createUser();
    await vote(viewerOf(voter), poll.id, { optionIds: [poll.options[0]!.id] });
    await expect(vote(viewerOf(voter), poll.id, { optionIds: [poll.options[1]!.id] })).rejects.toThrow(/already voted/);
    expect(await db.pollBallot.count({ where: { pollId: poll.id } })).toBe(1);
  });

  it("prevents duplicate votes under concurrent requests", async () => {
    const poll = await makePoll();
    const voter = await createUser();
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => vote(viewerOf(voter), poll.id, { optionIds: [poll.options[0]!.id] })),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.pollVote.count()).toBe(1);
  });

  it("enforces single choice and rejects options from other polls", async () => {
    const poll = await makePoll(false);
    const other = await makePoll(false);
    const voter = await createUser();
    await expect(vote(viewerOf(voter), poll.id, { optionIds: [poll.options[0]!.id, poll.options[1]!.id] })).rejects.toThrow();
    await expect(vote(viewerOf(voter), poll.id, { optionIds: [other.options[0]!.id] })).rejects.toThrow();
  });
});

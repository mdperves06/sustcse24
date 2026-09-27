import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getProfileByRoll, updateOwnPrivacy, updateOwnProfile } from "@/services/profiles";
import { searchDirectory } from "@/services/directory";
import { PATCH as patchStudent, GET as getStudent } from "@/app/api/students/[id]/route";
import { apiRequest, ctx, signInAs } from "./helpers/request";
import { createUser, resetDatabase, sessionFor, viewerOf } from "./helpers/db";

beforeEach(resetDatabase);

const baseProfile = { fullName: "Owner Name", employmentStatus: "STUDENT" };

describe("profile editing", () => {
  it("lets a student edit their own profile and syncs skills", async () => {
    const u = await createUser({ roll: "241001" });
    await updateOwnProfile(viewerOf(u), {
      ...baseProfile,
      bio: "Hello batch",
      programmingLanguages: "Python, TypeScript",
      frameworks: ["React"],
      phone: "+8801700000000",
    });
    const view = await getProfileByRoll(viewerOf(u), "241001");
    expect(view.bio).toBe("Hello batch");
    expect(view.skills.LANGUAGE).toEqual(["Python", "TypeScript"]);
    expect(view.skills.FRAMEWORK).toEqual(["React"]);
  });

  it("does not let a student edit someone else's profile through the API", async () => {
    const owner = await createUser({ roll: "241002" });
    const attacker = await createUser({ roll: "241003" });
    signInAs(await sessionFor(attacker.id));

    const res = await patchStudent(apiRequest(`/api/students/${owner.id}`, { method: "PATCH", body: { ...baseProfile, fullName: "Hacked" } }), ctx({ id: owner.id }));
    expect(res.status).toBe(403);
    const row = await db.studentProfile.findUniqueOrThrow({ where: { userId: owner.id } });
    expect(row.fullName).not.toBe("Hacked");
  });

  it("rejects javascript: URLs", async () => {
    const u = await createUser();
    await expect(updateOwnProfile(viewerOf(u), { ...baseProfile, githubUrl: "javascript:alert(1)" })).rejects.toThrow();
  });
});

describe("privacy controls", () => {
  it("hides private fields from other students but not from the owner", async () => {
    const owner = await createUser({ roll: "241010" });
    const other = await createUser({ roll: "241011" });
    await updateOwnProfile(viewerOf(owner), { ...baseProfile, phone: "+8801711111111", location: "Sylhet", currentOrganization: "Acme" });
    await updateOwnPrivacy(viewerOf(owner), {
      emailVisibility: "PRIVATE",
      phoneVisibility: "PRIVATE",
      facebookVisibility: "BATCH",
      linkedinVisibility: "BATCH",
      githubVisibility: "BATCH",
      locationVisibility: "PRIVATE",
      birthdayVisibility: "PRIVATE",
      bloodGroupVisibility: "PRIVATE",
      careerVisibility: "PRIVATE",
      cvVisibility: "PRIVATE",
    });

    const seenByOther = await getProfileByRoll(viewerOf(other), "241010");
    expect(seenByOther.phone).toBeNull();
    expect(seenByOther.email).toBeNull();
    expect(seenByOther.location).toBeNull();
    expect(seenByOther.currentOrganization).toBeNull();

    const seenByOwner = await getProfileByRoll(viewerOf(owner), "241010");
    expect(seenByOwner.phone).toBe("+8801711111111");
    expect(seenByOwner.location).toBe("Sylhet");

    // The REST API returns the same filtered view.
    signInAs(await sessionFor(other.id));
    const res = await getStudent(apiRequest("/api/students/241010"), ctx({ id: "241010" }));
    const json = await res.json();
    expect(json.data.phone).toBeNull();
    expect(JSON.stringify(json)).not.toContain("+8801711111111");
  });

  it("does not let directory filters match private fields", async () => {
    const hidden = await createUser({ roll: "241020" });
    const shared = await createUser({ roll: "241021" });
    const viewer = await createUser({ roll: "241022" });
    await updateOwnProfile(viewerOf(hidden), { ...baseProfile, location: "Sylhet" });
    await updateOwnProfile(viewerOf(shared), { ...baseProfile, location: "Sylhet" });
    await db.privacySettings.update({ where: { userId: hidden.id }, data: { locationVisibility: "PRIVATE" } });

    const result = await searchDirectory(viewerOf(viewer), { location: "Sylhet", sort: "roll", page: 1 });
    expect(result.students.map((s) => s.roll)).toEqual(["241021"]);
  });
});

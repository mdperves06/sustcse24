import { beforeEach, describe, expect, it } from "vitest";
import { GET as listStudents } from "@/app/api/students/route";
import { PATCH as patchStudent } from "@/app/api/students/[id]/route";
import { GET as adminStats } from "@/app/api/admin/stats/route";
import { GET as adminUsers } from "@/app/api/admin/users/route";
import { can } from "@/lib/auth/permissions";
import { apiRequest, ctx, signInAs } from "./helpers/request";
import { createUser, resetDatabase, sessionFor } from "./helpers/db";

beforeEach(async () => {
  await resetDatabase();
  signInAs(null);
});

describe("authentication on APIs", () => {
  it("rejects anonymous requests", async () => {
    const res = await listStudents(apiRequest("/api/students"), ctx({}));
    expect(res.status).toBe(401);
  });

  it("blocks users who still have the default password", async () => {
    const u = await createUser({ mustChangePassword: true });
    signInAs(await sessionFor(u.id));
    const res = await listStudents(apiRequest("/api/students"), ctx({}));
    expect(res.status).toBe(403);
  });

  it("blocks cross-site mutations (CSRF)", async () => {
    const u = await createUser();
    signInAs(await sessionFor(u.id));
    const res = await patchStudent(
      apiRequest(`/api/students/${u.id}`, { method: "PATCH", body: { fullName: "x" }, origin: "https://evil.example" }),
      ctx({ id: u.id }),
    );
    expect(res.status).toBe(403);
  });

  it("rejects forged session tokens", async () => {
    signInAs("forged-token-value");
    const res = await listStudents(apiRequest("/api/students"), ctx({}));
    expect(res.status).toBe(401);
  });
});

describe("admin routes", () => {
  it("students cannot access admin APIs", async () => {
    const student = await createUser({ role: "STUDENT" });
    signInAs(await sessionFor(student.id));
    expect((await adminStats(apiRequest("/api/admin/stats"), ctx({}))).status).toBe(403);
    expect((await adminUsers(apiRequest("/api/admin/users"), ctx({}))).status).toBe(403);
  });

  it("admins can access admin APIs", async () => {
    const admin = await createUser({ role: "ADMIN" });
    signInAs(await sessionFor(admin.id));
    const stats = await adminStats(apiRequest("/api/admin/stats"), ctx({}));
    expect(stats.status).toBe(200);
    const users = await adminUsers(apiRequest("/api/admin/users"), ctx({}));
    expect(users.status).toBe(200);
  });

  it("permission map keeps admin-only powers away from moderators and students", () => {
    expect(can("STUDENT", "admin.access")).toBe(false);
    expect(can("MODERATOR", "students.manage")).toBe(false);
    expect(can("MODERATOR", "reports.review")).toBe(true);
    expect(can("ADMIN", "students.manage")).toBe(true);
  });
});

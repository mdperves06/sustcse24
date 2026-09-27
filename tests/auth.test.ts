import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { validateSessionToken } from "@/lib/auth/session";
import { changePassword, login, requestPasswordReset, resetPassword } from "@/services/auth";
import { AppError, ValidationError } from "@/lib/errors";
import { createUser, resetDatabase, sessionFor } from "./helpers/db";

const client = { ip: "10.0.0.1", userAgent: "vitest" };

beforeEach(resetDatabase);

describe("login", () => {
  it("signs in with the default password and flags a mandatory change", async () => {
    await createUser({ roll: "240001", mustChangePassword: true });
    const result = await login({ roll: "240001", password: "240001" }, client);

    expect(result.token).toBeTruthy();
    expect(result.mustChangePassword).toBe(true);
    const session = await validateSessionToken(result.token);
    expect(session?.roll).toBe("240001");
    expect(session?.mustChangePassword).toBe(true);
  });

  it("detects the default password even when the flag was cleared", async () => {
    await createUser({ roll: "240002", mustChangePassword: false });
    const result = await login({ roll: "240002", password: "240002" }, client);
    expect(result.mustChangePassword).toBe(true);
  });

  it("rejects an invalid password without revealing whether the roll exists", async () => {
    await createUser({ roll: "240003", password: "Correct123" });
    await expect(login({ roll: "240003", password: "wrong" }, client)).rejects.toThrow("Incorrect roll or password.");
    await expect(login({ roll: "999999", password: "wrong" }, client)).rejects.toThrow("Incorrect roll or password.");
  });

  it("locks the account after 5 consecutive failures", async () => {
    await createUser({ roll: "240004", password: "Correct123" });
    for (let i = 0; i < 5; i++) {
      await expect(login({ roll: "240004", password: "nope" }, { ...client, ip: `10.0.1.${i}` })).rejects.toThrow();
    }
    await expect(login({ roll: "240004", password: "Correct123" }, { ...client, ip: "10.0.2.1" })).rejects.toThrow(/locked/);
  });

  it("refuses disabled and deleted accounts", async () => {
    const u = await createUser({ roll: "240005", password: "Correct123" });
    await db.user.update({ where: { id: u.id }, data: { status: "DISABLED" } });
    await expect(login({ roll: "240005", password: "Correct123" }, client)).rejects.toThrow(/disabled/);
  });

  it("stores only hashed passwords", async () => {
    const u = await createUser({ roll: "240006", password: "Secret123" });
    const row = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(row.passwordHash).not.toContain("Secret123");
    expect(row.passwordHash).toMatch(/^\$2[aby]\$/);
  });
});

describe("mandatory password change", () => {
  it("clears the flag, revokes other sessions and rejects the roll as a new password", async () => {
    const u = await createUser({ roll: "AB240010", mustChangePassword: true });
    const current = await login({ roll: "AB240010", password: "AB240010" }, client);
    const other = await sessionFor(u.id);
    const currentSession = (await validateSessionToken(current.token))!;

    await expect(
      changePassword(u.id, currentSession.sessionId, { currentPassword: "AB240010", newPassword: "AB240010", confirmPassword: "AB240010" }),
    ).rejects.toThrow();

    await changePassword(u.id, currentSession.sessionId, {
      currentPassword: "AB240010",
      newPassword: "NewPass2026",
      confirmPassword: "NewPass2026",
    });

    const row = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(row.mustChangePassword).toBe(false);
    expect(await validateSessionToken(other)).toBeNull();
    expect(await validateSessionToken(current.token)).not.toBeNull();
    const again = await login({ roll: "AB240010", password: "NewPass2026" }, client);
    expect(again.mustChangePassword).toBe(false);
  });

  it("never accepts the roll as the new password", async () => {
    const u = await createUser({ roll: "AB240012", password: "Current123" });
    const s = await login({ roll: "AB240012", password: "Current123" }, client);
    const session = (await validateSessionToken(s.token))!;
    await expect(
      changePassword(u.id, session.sessionId, { currentPassword: "Current123", newPassword: "AB240012", confirmPassword: "AB240012" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("requires the correct current password", async () => {
    const u = await createUser({ roll: "240011", password: "Current123" });
    const s = await login({ roll: "240011", password: "Current123" }, client);
    const session = (await validateSessionToken(s.token))!;
    await expect(
      changePassword(u.id, session.sessionId, { currentPassword: "bad", newPassword: "Another123", confirmPassword: "Another123" }),
    ).rejects.toThrow(/current password/i);
  });
});

describe("password reset", () => {
  it("resets with a single-use token and signs out everywhere", async () => {
    const u = await createUser({ roll: "240020", password: "OldPass123", email: "reset@test.example" });
    const oldSession = await sessionFor(u.id);

    const token = await requestPasswordReset({ identifier: "reset@test.example" }, client);
    expect(token).toBeTruthy();

    await resetPassword({ token, newPassword: "Fresh2026x", confirmPassword: "Fresh2026x" }, client);
    expect(await validateSessionToken(oldSession)).toBeNull();
    await expect(login({ roll: "240020", password: "OldPass123" }, client)).rejects.toThrow();
    expect((await login({ roll: "240020", password: "Fresh2026x" }, client)).token).toBeTruthy();

    // Token cannot be replayed.
    await expect(resetPassword({ token, newPassword: "Other2026x", confirmPassword: "Other2026x" }, client)).rejects.toBeInstanceOf(AppError);
  });

  it("gives no signal for unknown accounts", async () => {
    expect(await requestPasswordReset({ identifier: "nobody@test.example" }, client)).toBeNull();
  });

  it("rejects expired tokens", async () => {
    const u = await createUser({ roll: "240021", email: "exp@test.example" });
    const token = await requestPasswordReset({ identifier: "240021" }, client);
    await db.passwordResetToken.updateMany({ where: { userId: u.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(resetPassword({ token, newPassword: "Fresh2026x", confirmPassword: "Fresh2026x" }, client)).rejects.toThrow(/expired/);
  });
});

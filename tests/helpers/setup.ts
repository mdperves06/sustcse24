import { config } from "dotenv";
import { vi } from "vitest";
import { cookieJar, headerJar } from "./request";

config();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.BCRYPT_ROUNDS = "4";
process.env.APP_URL = "http://localhost:3000";
// Tests never hit the real Anthropic API.
delete process.env.ANTHROPIC_API_KEY;

// Route handlers and actions read the request through next/headers; back it with an in-memory jar.
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
    set: (name: string, value: string) => void cookieJar.set(name, value),
    delete: (name: string) => void cookieJar.delete(name),
  }),
  headers: async () => new Headers(Object.fromEntries(headerJar)),
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => undefined,
  revalidateTag: () => undefined,
  updateTag: () => undefined,
  refresh: () => undefined,
}));

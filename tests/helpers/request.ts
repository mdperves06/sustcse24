import { NextRequest } from "next/server";

export const cookieJar = new Map<string, string>();
export const headerJar = new Map<string, string>([["x-forwarded-for", "127.0.0.1"]]);

export function signInAs(token: string | null) {
  cookieJar.clear();
  if (token) cookieJar.set("cse24_session", token);
}

export function apiRequest(path: string, init: { method?: string; body?: unknown; origin?: string | null } = {}) {
  const headers = new Headers({ host: "localhost:3000", "content-type": "application/json" });
  const origin = init.origin === undefined ? "http://localhost:3000" : init.origin;
  if (origin) headers.set("origin", origin);
  const token = cookieJar.get("cse24_session");
  if (token) headers.set("cookie", `cse24_session=${token}`);
  return new NextRequest(`http://localhost:3000${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

export const ctx = <P extends Record<string, string | string[]>>(params: P) => ({ params: Promise.resolve(params) });

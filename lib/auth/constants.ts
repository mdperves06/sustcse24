export const SESSION_COOKIE = "cse24_session";

/** Idle timeout for regular sessions (cookie is a browser-session cookie). */
export const SESSION_IDLE_MS = 12 * 60 * 60 * 1000; // 12 hours
/** Lifetime for "remember me" sessions. */
export const SESSION_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
/** How often the session's last-seen timestamp is refreshed. */
export const SESSION_TOUCH_MS = 5 * 60 * 1000;

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

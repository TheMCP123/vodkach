const SESSION_COOKIE = "vodkach_session";
const STATE_COOKIE = "vodkach_oauth_state";
const VERIFIER_COOKIE = "vodkach_oauth_verifier";

export function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const cookies = header.split(";").map((part) => part.trim());

  for (const cookie of cookies) {
    const index = cookie.indexOf("=");
    if (index === -1) continue;

    const key = cookie.slice(0, index);
    const value = cookie.slice(index + 1);

    if (key === name) {
      return decodeURIComponent(value);
    }
  }

  return null;
}

export function createCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);

  parts.push(`Path=${options.path || "/"}`);
  parts.push("HttpOnly");
  parts.push("Secure");
  parts.push("SameSite=Lax");

  return parts.join("; ");
}

export function clearCookie(name) {
  return createCookie(name, "", {
    maxAge: 0,
    expires: new Date(0)
  });
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function getStateCookieName() {
  return STATE_COOKIE;
}

export function getVerifierCookieName() {
  return VERIFIER_COOKIE;
}

export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(JSON.stringify(data), {
    ...init,
    headers
  });
}

export function redirect(location, headers = {}) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      ...headers
    }
  });
}

export function base64UrlEncode(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function randomToken(bytes = 32) {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

export async function sha256Base64Url(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

export async function sha256Hex(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function requireEnv(env, key) {
  const value = env[key];

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
}

export async function getCurrentUser(request, env) {
  const rawSession = getCookie(request, SESSION_COOKIE);

  if (!rawSession || !env.DB) {
    return null;
  }

  const refreshTokenHash = await sha256Hex(rawSession);

  const row = await env.DB.prepare(
    `SELECT
      users.id,
      users.google_sub,
      users.email,
      users.email_verified,
      users.username,
      users.display_name,
      users.avatar_url,
      users.created_at
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.refresh_token_hash = ?
      AND sessions.revoked_at IS NULL
      AND datetime(sessions.expires_at) > datetime('now')
    LIMIT 1`
  )
    .bind(refreshTokenHash)
    .first();

  return row || null;
}

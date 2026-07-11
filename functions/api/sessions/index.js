import {
  getCurrentUser,
  getCookie,
  getSessionCookieName,
  json,
  sha256Hex
} from "../../_shared/auth.js";

function deviceName(userAgent) {
  const value = String(userAgent || "");

  if (/Edg\//i.test(value)) return "Microsoft Edge";
  if (/OPR\//i.test(value)) return "Opera";
  if (/Firefox\//i.test(value)) return "Firefox";
  if (/Chrome\//i.test(value)) return "Google Chrome";
  if (/Safari\//i.test(value)) return "Safari";
  return "Unknown Browser";
}

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);

  if (!user) {
    return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const rawToken = getCookie(context.request, getSessionCookieName());
  const currentHash = rawToken ? await sha256Hex(rawToken) : "";

  const rows = await context.env.DB.prepare(
    `SELECT id, refresh_token_hash, user_agent, country,
            created_at, last_seen_at, expires_at
     FROM sessions
     WHERE user_id = ?
       AND revoked_at IS NULL
       AND datetime(expires_at) > datetime('now')
     ORDER BY datetime(COALESCE(last_seen_at, created_at)) DESC`
  )
    .bind(user.id)
    .all();

  return json({
    ok: true,
    sessions: (rows.results || []).map((row) => ({
      id: row.id,
      device_name: deviceName(row.user_agent),
      user_agent: row.user_agent,
      country: row.country,
      created_at: row.created_at,
      last_seen_at: row.last_seen_at,
      expires_at: row.expires_at,
      current: row.refresh_token_hash === currentHash
    }))
  });
}

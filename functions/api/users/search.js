import { getCurrentUser, json } from "../../_shared/auth.js";
import { requireApprovedUser } from "../../_shared/account.js";

function normalizeQuery(value) {
  return String(value || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
}

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);
  const approvalResponse = requireApprovedUser(user);
  if (approvalResponse) return approvalResponse;

  const url = new URL(context.request.url);
  const query = normalizeQuery(url.searchParams.get("q"));

  if (!query) {
    return json({
      ok: true,
      users: []
    });
  }

  if (!/^[a-z0-9_.]{1,16}$/.test(query)) {
    return json({
      ok: true,
      users: []
    });
  }

  const rows = await context.env.DB.prepare(
    `SELECT
      id,
      username,
      display_name,
      avatar_url,
      verified,
      pronouns,
      bio,
      status_preference,
      last_seen_at,
      CASE
        WHEN status_preference = 'offline' THEN 'offline'
        WHEN last_seen_at IS NOT NULL
          AND datetime(last_seen_at) >= datetime('now', '-35 seconds')
          THEN status_preference
        ELSE 'offline'
      END AS effective_status
    FROM users
    WHERE username IS NOT NULL
      AND access_status = 'approved'
      AND lower(username) LIKE ?
      AND id != ?
    ORDER BY
      CASE WHEN lower(username) = ? THEN 0 ELSE 1 END,
      username ASC
    LIMIT 10`
  )
    .bind(`${query}%`, user.id, query)
    .all();

  return json({
    ok: true,
    users: rows.results || []
  });
}

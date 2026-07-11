import { getCurrentUser, json } from "../../../_shared/auth.js";
import { requireAdminUser } from "../../../_shared/account.js";

export async function onRequestGet(context) {
  const admin = await getCurrentUser(context.request, context.env);
  const denied = requireAdminUser(admin, context.env);
  if (denied) return denied;

  const url = new URL(context.request.url);
  const q = String(url.searchParams.get("q") || "").trim().toLowerCase();
  const like = `%${q}%`;

  const rows = await context.env.DB.prepare(
    `SELECT id, email, username, display_name, avatar_url, verified, access_status,
            requested_at, approved_at, rejected_at, disabled_at,
            banned_until, ban_reason, created_at
     FROM users
     WHERE ? = ''
        OR lower(email) LIKE ?
        OR lower(COALESCE(username, '')) LIKE ?
        OR lower(COALESCE(display_name, '')) LIKE ?
     ORDER BY datetime(created_at) DESC
     LIMIT 250`
  ).bind(q, like, like, like).all();

  return json({ ok: true, users: rows.results || [] });
}

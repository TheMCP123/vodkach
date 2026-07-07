import { getCurrentUser, json } from "../../_shared/auth.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const user = await getCurrentUser(request, env);

  if (!user) {
    return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const rows = await env.DB.prepare(
    `SELECT id, device_name, public_key, key_algorithm, created_at, last_seen_at, revoked_at
     FROM devices
     WHERE user_id = ?
     ORDER BY datetime(created_at) DESC`
  )
    .bind(user.id)
    .all();

  return json({
    ok: true,
    devices: rows.results || []
  });
}

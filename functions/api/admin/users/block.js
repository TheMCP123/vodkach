import { getCurrentUser, json } from "../../../_shared/auth.js";
import { readJson, requireAdminUser } from "../../../_shared/account.js";

export async function onRequestPost(context) {
  const admin = await getCurrentUser(context.request, context.env);
  const denied = requireAdminUser(admin, context.env);
  if (denied) return denied;

  const body = await readJson(context.request);
  const userId = String(body?.user_id || "").trim();
  if (!userId) return json({ ok: false, error: "user_id is required" }, { status: 400 });

  const user = await context.env.DB.prepare(
    "SELECT email FROM users WHERE id = ? LIMIT 1"
  ).bind(userId).first();

  if (!user) return json({ ok: false, error: "User not found" }, { status: 404 });

  await context.env.DB.batch([
    context.env.DB.prepare(
      `INSERT INTO banned_emails (email, reason, banned_by)
       VALUES (?, 'Permanent block', ?)
       ON CONFLICT(email) DO UPDATE SET
         reason = excluded.reason,
         banned_by = excluded.banned_by,
         banned_at = datetime('now'),
         expires_at = NULL`
    ).bind(user.email.toLowerCase(), admin.id),

    context.env.DB.prepare(
      `UPDATE users
       SET access_status = 'blocked',
           banned_until = NULL,
           ban_reason = 'Permanent block',
           updated_at = datetime('now')
       WHERE id = ?`
    ).bind(userId),

    context.env.DB.prepare(
      `UPDATE sessions
       SET revoked_at = datetime('now')
       WHERE user_id = ? AND revoked_at IS NULL`
    ).bind(userId)
  ]);

  return json({ ok: true });
}

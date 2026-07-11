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
      `DELETE FROM banned_emails WHERE lower(email) = lower(?)`
    ).bind(user.email),

    context.env.DB.prepare(
      `UPDATE users
       SET access_status = CASE WHEN access_status = 'blocked' THEN 'pending' ELSE access_status END,
           banned_until = NULL,
           ban_reason = NULL,
           updated_at = datetime('now')
       WHERE id = ?`
    ).bind(userId)
  ]);

  return json({ ok: true });
}

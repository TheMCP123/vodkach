import { getCurrentUser, json } from "../../../_shared/auth.js";
import { readJson, requireAdminUser } from "../../../_shared/account.js";

export async function onRequestPost(context) {
  const admin = await getCurrentUser(context.request, context.env);
  const denied = requireAdminUser(admin, context.env);
  if (denied) return denied;

  const body = await readJson(context.request);
  const userId = String(body?.user_id || "").trim();
  const hours = Number(body?.hours);

  if (!userId || !Number.isFinite(hours) || hours <= 0 || hours > 8760) {
    return json({ ok: false, error: "Valid user_id and hours are required" }, { status: 400 });
  }

  const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

  await context.env.DB.batch([
    context.env.DB.prepare(
      `UPDATE users
       SET banned_until = ?,
           ban_reason = ?,
           updated_at = datetime('now')
       WHERE id = ?`
    ).bind(until, `Temporary ban: ${hours}h`, userId),

    context.env.DB.prepare(
      `UPDATE sessions
       SET revoked_at = datetime('now')
       WHERE user_id = ? AND revoked_at IS NULL`
    ).bind(userId)
  ]);

  return json({ ok: true, banned_until: until });
}

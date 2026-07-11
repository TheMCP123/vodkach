import { getCurrentUser, json } from "../../../_shared/auth.js";
import { readJson, requireAdminUser } from "../../../_shared/account.js";

export async function onRequestPost(context) {
  const admin = await getCurrentUser(context.request, context.env);
  const denied = requireAdminUser(admin, context.env);
  if (denied) return denied;

  const body = await readJson(context.request);
  const email = String(body?.email || "").trim().toLowerCase();

  if (!email) return json({ ok: false, error: "email is required" }, { status: 400 });

  await context.env.DB.batch([
    context.env.DB.prepare("DELETE FROM banned_emails WHERE lower(email) = lower(?)").bind(email),
    context.env.DB.prepare(
      `UPDATE users
       SET access_status = CASE WHEN access_status = 'blocked' THEN 'pending' ELSE access_status END,
           banned_until = NULL,
           ban_reason = NULL,
           updated_at = datetime('now')
       WHERE lower(email) = lower(?)`
    ).bind(email)
  ]);

  return json({ ok: true });
}

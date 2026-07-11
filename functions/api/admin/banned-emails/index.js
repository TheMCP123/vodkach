import { getCurrentUser, json } from "../../../_shared/auth.js";
import { readJson, requireAdminUser } from "../../../_shared/account.js";

export async function onRequestGet(context) {
  const admin = await getCurrentUser(context.request, context.env);
  const denied = requireAdminUser(admin, context.env);
  if (denied) return denied;

  const rows = await context.env.DB.prepare(
    `SELECT email, reason, banned_at, expires_at
     FROM banned_emails
     ORDER BY datetime(banned_at) DESC`
  ).all();

  return json({ ok: true, banned_emails: rows.results || [] });
}

export async function onRequestPost(context) {
  const admin = await getCurrentUser(context.request, context.env);
  const denied = requireAdminUser(admin, context.env);
  if (denied) return denied;

  const body = await readJson(context.request);
  const email = String(body?.email || "").trim().toLowerCase();
  const reason = String(body?.reason || "Permanent block").trim();

  if (!email || !email.includes("@")) {
    return json({ ok: false, error: "Valid email is required" }, { status: 400 });
  }

  await context.env.DB.batch([
    context.env.DB.prepare(
      `INSERT INTO banned_emails (email, reason, banned_by)
       VALUES (?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         reason = excluded.reason,
         banned_by = excluded.banned_by,
         banned_at = datetime('now'),
         expires_at = NULL`
    ).bind(email, reason, admin.id),

    context.env.DB.prepare(
      `UPDATE users
       SET access_status = 'blocked',
           banned_until = NULL,
           ban_reason = ?,
           updated_at = datetime('now')
       WHERE lower(email) = lower(?)`
    ).bind(reason, email)
  ]);

  return json({ ok: true });
}

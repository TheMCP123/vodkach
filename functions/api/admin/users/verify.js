import { getCurrentUser, json } from "../../../_shared/auth.js";
import { readJson, requireAdminUser } from "../../../_shared/account.js";

export async function onRequestPost(context) {
  const admin = await getCurrentUser(context.request, context.env);
  const denied = requireAdminUser(admin, context.env);
  if (denied) return denied;

  const body = await readJson(context.request);
  const userId = String(body?.user_id || "").trim();
  const verified = body?.verified === true || body?.verified === 1;

  if (!userId) {
    return json({ ok: false, error: "user_id is required" }, { status: 400 });
  }

  const result = await context.env.DB.prepare(
    `UPDATE users
     SET verified = ?,
         updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(verified ? 1 : 0, userId)
    .run();

  if (!result.meta?.changes) {
    return json({ ok: false, error: "User not found" }, { status: 404 });
  }

  return json({
    ok: true,
    user_id: userId,
    verified
  });
}

import { getCurrentUser, json } from "../../../_shared/auth.js";
import { readJson, requireAdminUser } from "../../../_shared/account.js";

export async function onRequestPost(context) {
  const admin = await getCurrentUser(context.request, context.env);
  const adminResponse = requireAdminUser(admin, context.env);
  if (adminResponse) return adminResponse;

  const body = await readJson(context.request);
  const userId = String(body?.user_id || "").trim();

  if (!userId) {
    return json(
      {
        ok: false,
        error: "user_id is required"
      },
      { status: 400 }
    );
  }

  await context.env.DB.prepare(
    `UPDATE users
     SET access_status = 'approved',
         approved_at = datetime('now'),
         approved_by = ?,
         rejected_at = NULL,
         disabled_at = NULL,
         updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(admin.id, userId)
    .run();

  return json({
    ok: true
  });
}

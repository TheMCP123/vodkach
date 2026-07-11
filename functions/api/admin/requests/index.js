import { getCurrentUser, json } from "../../../_shared/auth.js";
import { requireAdminUser } from "../../../_shared/account.js";

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);
  const adminResponse = requireAdminUser(user, context.env);
  if (adminResponse) return adminResponse;

  const url = new URL(context.request.url);
  const status = String(url.searchParams.get("status") || "pending").toLowerCase();

  const allowed = new Set(["pending", "approved", "rejected", "disabled", "all"]);
  const safeStatus = allowed.has(status) ? status : "pending";

  const query =
    safeStatus === "all"
      ? `SELECT id, email, username, display_name, avatar_url, access_status, requested_at, approved_at, rejected_at, disabled_at, created_at
         FROM users
         ORDER BY datetime(COALESCE(requested_at, created_at)) DESC
         LIMIT 200`
      : `SELECT id, email, username, display_name, avatar_url, access_status, requested_at, approved_at, rejected_at, disabled_at, created_at
         FROM users
         WHERE access_status = ?
         ORDER BY datetime(COALESCE(requested_at, created_at)) DESC
         LIMIT 200`;

  const rows =
    safeStatus === "all"
      ? await context.env.DB.prepare(query).all()
      : await context.env.DB.prepare(query).bind(safeStatus).all();

  return json({
    ok: true,
    requests: rows.results || []
  });
}

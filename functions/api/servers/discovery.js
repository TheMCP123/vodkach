import { getCurrentUser, json } from "../../_shared/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await getCurrentUser(request, env);
  if (!user) return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const query = (new URL(request.url).searchParams.get("q") || "").trim().slice(0, 50);
  const like = `%${query}%`;
  const rows = await env.DB.prepare(`
    SELECT s.id, s.name, s.description, s.icon_text, s.icon_color, s.created_at,
      (SELECT COUNT(*) FROM server_members sm WHERE sm.server_id=s.id) AS member_count,
      EXISTS(SELECT 1 FROM server_members mine WHERE mine.server_id=s.id AND mine.user_id=?) AS joined
    FROM servers s
    WHERE s.is_public=1 AND (?='' OR s.name LIKE ? OR s.description LIKE ?)
    ORDER BY member_count DESC, datetime(s.created_at) DESC LIMIT 50
  `).bind(user.id, query, like, like).all();
  return json({ ok: true, servers: rows.results || [] });
}

import { getCurrentUser, json } from "../../_shared/auth.js";
export async function onRequestPost({ request, env }) {
  const user = await getCurrentUser(request, env);
  if (!user) return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  let data; try { data = await request.json(); } catch { data = {}; }
  const code = String(data.invite_code || "").trim().toUpperCase();
  const server = await env.DB.prepare(`SELECT id, name, icon_text, invite_code, owner_user_id FROM servers WHERE invite_code = ? LIMIT 1`).bind(code).first();
  if (!server) return json({ ok: false, error: "Invalid invite code" }, { status: 404 });
  await env.DB.prepare(`INSERT OR IGNORE INTO server_members (server_id, user_id, role) VALUES (?, ?, 'member')`).bind(server.id, user.id).run();
  return json({ ok: true, server: { ...server, role: "member" } });
}

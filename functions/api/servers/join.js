import { getCurrentUser, json } from "../../_shared/auth.js";
export async function onRequestPost({ request, env }) {
  const user = await getCurrentUser(request, env);
  if (!user) return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  let data; try { data = await request.json(); } catch { data = {}; }
  const code = String(data.invite_code || "").trim().toUpperCase();
  const publicServerId = String(data.server_id || "");
  const invite = code ? await env.DB.prepare(`SELECT i.id AS invite_id,i.server_id,i.max_uses,i.uses,i.expires_at,i.revoked_at,s.id,s.name,s.description,s.icon_text,s.icon_color,s.icon_data,s.is_public,s.owner_user_id FROM server_invites i JOIN servers s ON s.id=i.server_id WHERE i.code=? LIMIT 1`).bind(code).first() : null;
  const server = invite || (publicServerId ? await env.DB.prepare(`SELECT id,name,description,icon_text,icon_color,is_public,owner_user_id FROM servers WHERE id=? AND is_public=1`).bind(publicServerId).first() : null);
  if (!server || (invite && (server.revoked_at || (server.expires_at && Date.parse(server.expires_at) <= Date.now()) || (server.max_uses && server.uses >= server.max_uses)))) return json({ ok: false, error: "Invite is invalid or expired" }, { status: 404 });
  const inserted = await env.DB.prepare(`INSERT OR IGNORE INTO server_members (server_id, user_id, role) VALUES (?, ?, 'member')`).bind(server.id, user.id).run();
  if (inserted.meta?.changes && server.invite_id) await env.DB.prepare(`UPDATE server_invites SET uses=uses+1 WHERE id=?`).bind(server.invite_id).run();
  return json({ ok: true, server: { id:server.id,name:server.name,description:server.description,icon_text:server.icon_text,icon_color:server.icon_color,icon_data:server.icon_data||null,is_public:Boolean(server.is_public),owner_user_id:server.owner_user_id,role:"member" } });
}

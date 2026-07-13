import { getCurrentUser, json } from "../../_shared/auth.js";

function id(prefix) {
  const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
  return `${prefix}_${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
function inviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8); crypto.getRandomValues(bytes);
  return [...bytes].map((b) => chars[b % chars.length]).join("");
}
async function body(request) { try { return await request.json(); } catch { return null; } }

export async function onRequestGet({ request, env }) {
  const user = await getCurrentUser(request, env);
  if (!user) return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const rows = await env.DB.prepare(`
    SELECT s.id, s.name, s.description, s.icon_text, s.icon_color, s.is_public, s.invite_code, s.owner_user_id, s.created_at,
           sm.role,
           (SELECT COUNT(*) FROM server_members x WHERE x.server_id = s.id) AS member_count
    FROM servers s JOIN server_members sm ON sm.server_id = s.id
    WHERE sm.user_id = ? ORDER BY datetime(s.created_at)
  `).bind(user.id).all();
  return json({ ok: true, servers: rows.results || [] });
}

export async function onRequestPost({ request, env }) {
  const user = await getCurrentUser(request, env);
  if (!user) return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const data = await body(request);
  const name = String(data?.name || "").trim().slice(0, 32);
  const description = String(data?.description || "").trim().slice(0, 240);
  const iconColor = /^#[0-9a-fA-F]{6}$/.test(String(data?.icon_color || "")) ? String(data.icon_color) : '#fc0303';
  if (!name) return json({ ok: false, error: "Server name is required" }, { status: 400 });
  const serverId = id("srv");
  const channelId = id("sch");
  const code = inviteCode();
  const iconText = (name.match(/[A-Za-z0-9]/)?.[0] || "V").toUpperCase();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO servers (id, owner_user_id, name, description, icon_text, icon_color, invite_code) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(serverId, user.id, name, description, iconText, iconColor, code),
    env.DB.prepare(`INSERT INTO server_members (server_id, user_id, role) VALUES (?, ?, 'owner')`).bind(serverId, user.id),
    env.DB.prepare(`INSERT INTO server_channels (id, server_id, name, position) VALUES (?, ?, 'general', 0)`).bind(channelId, serverId)
  ]);
  await env.DB.prepare(`INSERT INTO server_invites (id, server_id, code, creator_user_id) VALUES (?, ?, ?, ?)` ).bind(id('sinv'), serverId, code, user.id).run();
  return json({ ok: true, server: { id: serverId, name, description, icon_text: iconText, icon_color: iconColor, is_public: false, invite_code: code, owner_user_id: user.id, role: "owner", member_count: 1 } });
}

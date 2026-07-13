import { getCurrentUser, json } from "../../_shared/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await getCurrentUser(request, env);
  if (!user) return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const serverId = new URL(request.url).searchParams.get("server_id") || "";
  const mine = await env.DB.prepare(`SELECT role FROM server_members WHERE server_id=? AND user_id=?`).bind(serverId,user.id).first();
  if (!mine) return json({ ok:false,error:"Server not found"},{status:404});
  const rows = await env.DB.prepare(`
    SELECT u.id,u.username,u.display_name,u.avatar_url,u.verified,u.status_preference,u.last_seen_at,sm.role,sm.joined_at
    FROM server_members sm JOIN users u ON u.id=sm.user_id
    WHERE sm.server_id=?
    ORDER BY CASE sm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
             CASE WHEN u.status_preference!='offline' AND datetime(u.last_seen_at)>=datetime('now','-90 seconds') THEN 0 ELSE 1 END,
             lower(COALESCE(u.display_name,u.username))
  `).bind(serverId).all();
  return json({ok:true,members:(rows.results||[]).map(m=>({...m,verified:Boolean(m.verified)})),my_role:mine.role});
}

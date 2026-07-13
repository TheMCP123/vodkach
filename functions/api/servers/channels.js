import { getCurrentUser, json } from "../../_shared/auth.js";
function id(prefix) { const b = new Uint8Array(16); crypto.getRandomValues(b); return `${prefix}_${[...b].map(x=>x.toString(16).padStart(2,'0')).join('')}`; }
async function member(env, serverId, userId) { return env.DB.prepare(`SELECT role FROM server_members WHERE server_id=? AND user_id=? LIMIT 1`).bind(serverId,userId).first(); }
export async function onRequestGet({ request, env }) {
  const user = await getCurrentUser(request, env); if (!user) return json({ok:false,error:"Not authenticated"},{status:401});
  const serverId = new URL(request.url).searchParams.get("server_id") || "";
  if (!await member(env,serverId,user.id)) return json({ok:false,error:"Server not found"},{status:404});
  const rows = await env.DB.prepare(`SELECT id, server_id, name, position FROM server_channels WHERE server_id=? ORDER BY position, created_at`).bind(serverId).all();
  return json({ok:true,channels:rows.results||[]});
}
export async function onRequestPost({ request, env }) {
  const user = await getCurrentUser(request, env); if (!user) return json({ok:false,error:"Not authenticated"},{status:401});
  let data; try { data=await request.json(); } catch { data={}; }
  const serverId=String(data.server_id||""); const name=String(data.name||"").trim().toLowerCase().replace(/[^a-z0-9-_ ]/g,"").replace(/\s+/g,"-").slice(0,30);
  const membership=await member(env,serverId,user.id); if (!membership || membership.role!=="owner") return json({ok:false,error:"Only the owner can create channels"},{status:403});
  if (!name) return json({ok:false,error:"Channel name is required"},{status:400});
  const row=await env.DB.prepare(`SELECT COALESCE(MAX(position),-1)+1 AS p FROM server_channels WHERE server_id=?`).bind(serverId).first();
  const channel={id:id("sch"),server_id:serverId,name,position:Number(row?.p||0)};
  await env.DB.prepare(`INSERT INTO server_channels (id,server_id,name,position) VALUES (?,?,?,?)`).bind(channel.id,serverId,name,channel.position).run();
  return json({ok:true,channel});
}

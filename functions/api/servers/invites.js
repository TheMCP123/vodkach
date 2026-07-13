import { getCurrentUser, json } from "../../_shared/auth.js";
function id(){const b=new Uint8Array(16);crypto.getRandomValues(b);return `sinv_${[...b].map(x=>x.toString(16).padStart(2,'0')).join('')}`;}
function code(){const c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";const b=new Uint8Array(8);crypto.getRandomValues(b);return [...b].map(x=>c[x%c.length]).join('');}
async function mine(env,s,u){return env.DB.prepare(`SELECT role FROM server_members WHERE server_id=? AND user_id=?`).bind(s,u).first();}
export async function onRequestGet({request,env}){
 const user=await getCurrentUser(request,env);if(!user)return json({ok:false,error:"Not authenticated"},{status:401});
 const serverId=new URL(request.url).searchParams.get("server_id")||"";const m=await mine(env,serverId,user.id);if(!m)return json({ok:false,error:"Server not found"},{status:404});
 const rows=await env.DB.prepare(`SELECT id,code,max_uses,uses,expires_at,revoked_at,created_at FROM server_invites WHERE server_id=? ORDER BY datetime(created_at) DESC`).bind(serverId).all();return json({ok:true,invites:rows.results||[],can_manage:m.role==='owner'||m.role==='admin'});
}
export async function onRequestPost({request,env}){
 const user=await getCurrentUser(request,env);if(!user)return json({ok:false,error:"Not authenticated"},{status:401});let d={};try{d=await request.json();}catch{}
 const serverId=String(d.server_id||"");const m=await mine(env,serverId,user.id);if(!m||!['owner','admin'].includes(m.role))return json({ok:false,error:"Missing permission"},{status:403});
 const maxUses=d.max_uses?Math.max(1,Math.min(1000,Number(d.max_uses))):null;const hours=d.expires_hours?Math.max(1,Math.min(8760,Number(d.expires_hours))):null;const invite={id:id(),code:code(),max_uses:maxUses,uses:0,expires_at:hours?new Date(Date.now()+hours*3600000).toISOString():null};
 await env.DB.prepare(`INSERT INTO server_invites(id,server_id,code,creator_user_id,max_uses,expires_at) VALUES(?,?,?,?,?,?)`).bind(invite.id,serverId,invite.code,user.id,maxUses,invite.expires_at).run();return json({ok:true,invite});
}
export async function onRequestDelete({request,env}){
 const user=await getCurrentUser(request,env);if(!user)return json({ok:false,error:"Not authenticated"},{status:401});let d={};try{d=await request.json();}catch{}
 const row=await env.DB.prepare(`SELECT i.server_id,m.role FROM server_invites i JOIN server_members m ON m.server_id=i.server_id AND m.user_id=? WHERE i.id=?`).bind(user.id,String(d.invite_id||"")).first();if(!row||!['owner','admin'].includes(row.role))return json({ok:false,error:"Missing permission"},{status:403});
 await env.DB.prepare(`UPDATE server_invites SET revoked_at=datetime('now') WHERE id=?`).bind(String(d.invite_id)).run();return json({ok:true,server_id:row.server_id});
}

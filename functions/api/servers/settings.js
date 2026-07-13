import { getCurrentUser, json } from "../../_shared/auth.js";
async function mine(env,s,u){return env.DB.prepare(`SELECT role FROM server_members WHERE server_id=? AND user_id=?`).bind(s,u).first();}
export async function onRequestPatch({request,env}){
 const user=await getCurrentUser(request,env);if(!user)return json({ok:false,error:"Not authenticated"},{status:401});let d={};try{d=await request.json();}catch{}
 const serverId=String(d.server_id||"");const m=await mine(env,serverId,user.id);if(!m||m.role!=='owner')return json({ok:false,error:"Only the owner can edit server settings"},{status:403});
 const name=String(d.name||"").trim().slice(0,32);const description=String(d.description||"").trim().slice(0,240);const iconColor=/^#[0-9a-fA-F]{6}$/.test(String(d.icon_color||""))?String(d.icon_color):'#fc0303';const isPublic=d.is_public?1:0;if(!name)return json({ok:false,error:"Server name is required"},{status:400});
 await env.DB.prepare(`UPDATE servers SET name=?,description=?,icon_color=?,is_public=? WHERE id=?`).bind(name,description,iconColor,isPublic,serverId).run();return json({ok:true,server:{id:serverId,name,description,icon_color:iconColor,is_public:Boolean(isPublic)}});
}
export async function onRequestDelete({request,env}){
 const user=await getCurrentUser(request,env);if(!user)return json({ok:false,error:"Not authenticated"},{status:401});let d={};try{d=await request.json();}catch{}
 const serverId=String(d.server_id||"");const m=await mine(env,serverId,user.id);if(!m)return json({ok:false,error:"Server not found"},{status:404});
 if(m.role==='owner'){if(d.confirm_name){const s=await env.DB.prepare(`SELECT name FROM servers WHERE id=?`).bind(serverId).first();if(s?.name!==d.confirm_name)return json({ok:false,error:"Server name does not match"},{status:400});await env.DB.prepare(`DELETE FROM servers WHERE id=?`).bind(serverId).run();return json({ok:true,deleted:true,server_id:serverId});}return json({ok:false,error:"Owner must delete the server or transfer ownership"},{status:400});}
 await env.DB.prepare(`DELETE FROM server_members WHERE server_id=? AND user_id=?`).bind(serverId,user.id).run();return json({ok:true,left:true,server_id:serverId});
}

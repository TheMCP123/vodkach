import { getCurrentUser, json } from "../../_shared/auth.js";
function id(prefix){const b=new Uint8Array(16);crypto.getRandomValues(b);return `${prefix}_${[...b].map(x=>x.toString(16).padStart(2,"0")).join("")}`;}
function inviteCode(){const c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",b=new Uint8Array(8);crypto.getRandomValues(b);return [...b].map(x=>c[x%c.length]).join("");}
async function body(request){try{return await request.json();}catch{return null;}}
export async function onRequestGet({request,env}){
 const user=await getCurrentUser(request,env);if(!user)return json({ok:false,error:"Not authenticated"},{status:401});
 const rows=await env.DB.prepare(`SELECT s.id,s.name,s.description,s.icon_text,s.icon_color,s.icon_data,s.is_public,s.invite_code,s.owner_user_id,s.created_at,s.rules_text,s.verification_level,s.default_notifications,sm.role,(SELECT COUNT(*) FROM server_members x WHERE x.server_id=s.id) member_count FROM servers s JOIN server_members sm ON sm.server_id=s.id WHERE sm.user_id=? ORDER BY datetime(s.created_at)`).bind(user.id).all();
 return json({ok:true,servers:rows.results||[]});
}
export async function onRequestPost({request,env}){
 const user=await getCurrentUser(request,env);if(!user)return json({ok:false,error:"Not authenticated"},{status:401});const d=await body(request);const name=String(d?.name||"").trim().slice(0,32);if(!name)return json({ok:false,error:"Server name is required"},{status:400});
 const serverId=id("srv"),channelId=id("sch"),code=inviteCode(),iconText=(name.match(/[A-Za-z0-9]/)?.[0]||"V").toUpperCase();
 await env.DB.batch([
  env.DB.prepare(`INSERT INTO servers(id,owner_user_id,name,description,icon_text,icon_color,invite_code) VALUES(?,?,?,?,?,?,?)`).bind(serverId,user.id,name,"",iconText,"#2b2d31",code),
  env.DB.prepare(`INSERT INTO server_members(server_id,user_id,role) VALUES(?,?,'owner')`).bind(serverId,user.id),
  env.DB.prepare(`INSERT INTO server_channels(id,server_id,name,position,topic) VALUES(?,?,'general',0,'')`).bind(channelId,serverId),
  env.DB.prepare(`INSERT INTO server_invites(id,server_id,code,creator_user_id) VALUES(?,?,?,?)`).bind(id("sinv"),serverId,code,user.id)
 ]);
 return json({ok:true,server:{id:serverId,name,description:"",icon_text:iconText,icon_color:"#2b2d31",icon_data:null,is_public:false,invite_code:code,owner_user_id:user.id,role:"owner",member_count:1}});
}

import { getCurrentUser, json } from "../../_shared/auth.js";
function id(prefix) { const b=new Uint8Array(16); crypto.getRandomValues(b); return `${prefix}_${[...b].map(x=>x.toString(16).padStart(2,'0')).join('')}`; }
async function access(env,channelId,userId){return env.DB.prepare(`SELECT sc.server_id FROM server_channels sc JOIN server_members sm ON sm.server_id=sc.server_id WHERE sc.id=? AND sm.user_id=? LIMIT 1`).bind(channelId,userId).first();}
export async function onRequestGet({request,env}){
 const user=await getCurrentUser(request,env); if(!user)return json({ok:false,error:"Not authenticated"},{status:401});
 const channelId=new URL(request.url).searchParams.get("channel_id")||""; if(!await access(env,channelId,user.id))return json({ok:false,error:"Channel not found"},{status:404});
 const rows=await env.DB.prepare(`SELECT m.id,m.channel_id,m.sender_user_id,m.body,m.created_at,m.edited_at,m.deleted_at,u.username,u.display_name,u.avatar_url,u.verified FROM server_messages m JOIN users u ON u.id=m.sender_user_id WHERE m.channel_id=? ORDER BY datetime(m.created_at) DESC LIMIT 100`).bind(channelId).all();
 return json({ok:true,messages:(rows.results||[]).reverse().map(r=>({...r,sender:{id:r.sender_user_id,username:r.username,display_name:r.display_name,avatar_url:r.avatar_url,verified:Boolean(r.verified)}}))});
}
export async function onRequestPost({request,env}){
 const user=await getCurrentUser(request,env); if(!user)return json({ok:false,error:"Not authenticated"},{status:401}); let data;try{data=await request.json();}catch{data={};}
 const channelId=String(data.channel_id||"");const text=String(data.body||"").trim().slice(0,2000);const a=await access(env,channelId,user.id);if(!a)return json({ok:false,error:"Channel not found"},{status:404});if(!text)return json({ok:false,error:"Message is empty"},{status:400});
 const message={id:id("smsg"),channel_id:channelId,sender_user_id:user.id,body:text,created_at:new Date().toISOString(),server_id:a.server_id,sender:{id:user.id,username:user.username,display_name:user.display_name,avatar_url:user.avatar_url,verified:Boolean(user.verified)}};
 await env.DB.prepare(`INSERT INTO server_messages (id,channel_id,sender_user_id,body,created_at) VALUES (?,?,?,?,?)`).bind(message.id,channelId,user.id,text,message.created_at).run();return json({ok:true,message});
}

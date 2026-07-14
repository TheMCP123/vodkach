import { getCurrentUser, json } from "../../_shared/auth.js";
async function mine(env,s,u){return env.DB.prepare(`SELECT role FROM server_members WHERE server_id=? AND user_id=?`).bind(s,u).first();}
export async function onRequestPatch({request,env}){
 const user=await getCurrentUser(request,env);if(!user)return json({ok:false,error:"Not authenticated"},{status:401});let d={};try{d=await request.json();}catch{}
 const serverId=String(d.server_id||""),m=await mine(env,serverId,user.id);if(!m||m.role!=="owner")return json({ok:false,error:"Only the owner can edit server settings"},{status:403});
 const current=await env.DB.prepare(`SELECT * FROM servers WHERE id=?`).bind(serverId).first();if(!current)return json({ok:false,error:"Server not found"},{status:404});
 const name=d.name===undefined?current.name:String(d.name).trim().slice(0,32);if(!name)return json({ok:false,error:"Server name is required"},{status:400});
 const description=d.description===undefined?current.description:String(d.description||"").trim().slice(0,240);
 const iconColor=d.icon_color===undefined?current.icon_color:(/^#[0-9a-fA-F]{6}$/.test(String(d.icon_color))?String(d.icon_color):"#2b2d31");
 let iconData=d.icon_data===undefined?current.icon_data:String(d.icon_data||"");if(iconData&&(!iconData.startsWith("data:image/")||iconData.length>1000000))return json({ok:false,error:"Invalid server icon"},{status:400});
 let bannerData=d.banner_data===undefined?current.banner_data:String(d.banner_data||"");if(bannerData&&(!bannerData.startsWith("data:image/")||bannerData.length>1800000))return json({ok:false,error:"Invalid server banner"},{status:400});
 const isPublic=d.is_public===undefined?Number(current.is_public):d.is_public?1:0;
 const rulesText=d.rules_text===undefined?String(current.rules_text||""):String(d.rules_text||"").slice(0,4000);
 const verificationLevel=d.verification_level===undefined?Number(current.verification_level||0):Math.max(0,Math.min(2,Number(d.verification_level)||0));
 const defaultNotifications=d.default_notifications===undefined?String(current.default_notifications||"all"):(d.default_notifications==="mentions"?"mentions":"all");
 await env.DB.prepare(`UPDATE servers SET name=?,description=?,icon_color=?,icon_data=?,banner_data=?,is_public=?,rules_text=?,verification_level=?,default_notifications=? WHERE id=?`).bind(name,description,iconColor,iconData||null,bannerData||null,isPublic,rulesText,verificationLevel,defaultNotifications,serverId).run();
 return json({ok:true,server:{id:serverId,name,description,icon_color:iconColor,icon_data:iconData||null,banner_data:bannerData||null,is_public:Boolean(isPublic),rules_text:rulesText,verification_level:verificationLevel,default_notifications:defaultNotifications}});
}
export async function onRequestDelete({request,env}){const user=await getCurrentUser(request,env);if(!user)return json({ok:false,error:"Not authenticated"},{status:401});let d={};try{d=await request.json();}catch{}const serverId=String(d.server_id||""),m=await mine(env,serverId,user.id);if(!m)return json({ok:false,error:"Server not found"},{status:404});if(m.role==="owner"){const s=await env.DB.prepare(`SELECT name FROM servers WHERE id=?`).bind(serverId).first();if(String(d.confirm_name||"")!==s?.name)return json({ok:false,error:"Server name does not match"},{status:400});await env.DB.prepare(`DELETE FROM servers WHERE id=?`).bind(serverId).run();return json({ok:true,deleted:true,server_id:serverId});}await env.DB.prepare(`DELETE FROM server_members WHERE server_id=? AND user_id=?`).bind(serverId,user.id).run();return json({ok:true,left:true,server_id:serverId});}

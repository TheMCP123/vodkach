import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Ban, Check, ChevronDown, Clipboard, Compass, Copy, Crown, Hash, ImagePlus,
  LogOut, MessageSquare, Pencil, Plus, Save, Search, Settings, Shield, Trash2, BarChart3,
  UserMinus, UserPlus, Users, X
} from "lucide-react";

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    ...options,
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export function ServerMark({ server, size = 42 }) {
  const fallback = server.icon_text || server.name?.[0]?.toUpperCase() || "V";
  return (
    <span className={`serverMark ${server.icon_data ? "hasImage" : ""}`} style={{ "--server-color": server.icon_color || "#2b2d31", width: size, height: size }}>
      {server.icon_data ? <img src={server.icon_data} alt="" /> : fallback}
    </span>
  );
}

function online(member) {
  return member.status_preference !== "offline" && member.last_seen_at && Date.now() - Date.parse(member.last_seen_at) < 90000;
}

async function imageToServerIcon(file) {
  if (!file) return null;
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file");
  if (file.size > 10 * 1024 * 1024) throw new Error("Server icon must be 10 MB or smaller");
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = Math.max(0, (bitmap.width - side) / 2);
  const sy = Math.max(0, (bitmap.height - side) / 2);
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.fillStyle = "#111216"; ctx.fillRect(0, 0, 256, 256);
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, 256, 256);
  bitmap.close?.();
  return canvas.toDataURL("image/webp", 0.82);
}

export function ServerCreateModal({ open, onClose, onChanged }) {
  const [mode, setMode] = useState("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!open) return null;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const data = mode === "create"
        ? await api("/api/servers", { method: "POST", body: JSON.stringify({ name }) })
        : await api("/api/servers/join", { method: "POST", body: JSON.stringify({ invite_code: code }) });
      onChanged?.(data.server); setName(""); setCode(""); onClose();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <div className="serverModalBackdrop" onMouseDown={onClose}>
    <form className="serverModal serverJoinCreateModal" onMouseDown={(e)=>e.stopPropagation()} onSubmit={submit}>
      <button className="serverModalClose" type="button" onClick={onClose}><X size={18}/></button>
      <div className="serverModalHero"><ServerMark server={{name:name||"Vodkach",icon_color:"#2b2d31"}} size={54}/><div><h2>{mode === "create" ? "Create your server" : "Join a server"}</h2><p>{mode === "create" ? "Start with a clean server and a #general channel." : "Enter an invite code to join."}</p></div></div>
      <div className="serverModalTabs"><button type="button" className={mode==="create"?"active":""} onClick={()=>{setMode("create");setError("");}}>Create</button><button type="button" className={mode==="join"?"active":""} onClick={()=>{setMode("join");setError("");}}>Join</button></div>
      {mode === "create" ? <label>SERVER NAME<input autoFocus value={name} onChange={(e)=>setName(e.target.value)} maxLength={32} placeholder="My Server"/></label> : <label>INVITE CODE<input autoFocus value={code} onChange={(e)=>setCode(e.target.value.toUpperCase())} maxLength={32} placeholder="ABCD1234"/></label>}
      {error ? <div className="serverModalError">{error}</div> : null}
      <button className="serverModalPrimary" disabled={busy || !(mode === "create" ? name.trim() : code.trim())}>{busy ? "Please wait..." : mode === "create" ? "Create Server" : "Join Server"}</button>
    </form>
  </div>;
}

export function ServerDiscovery({ onJoined, onOpenServer }) {
  const [servers,setServers]=useState([]),[query,setQuery]=useState(""),[loading,setLoading]=useState(true),[error,setError]=useState("");
  async function load(){setLoading(true);try{const d=await api(`/api/servers/discovery?q=${encodeURIComponent(query)}`);setServers(d.servers||[]);setError("");}catch(e){setError(e.message);}finally{setLoading(false);}}
  useEffect(()=>{const t=setTimeout(load,180);return()=>clearTimeout(t);},[query]);
  async function join(server){try{const d=await api("/api/servers/join",{method:"POST",body:JSON.stringify({server_id:server.id})});onJoined?.(d.server);onOpenServer?.(d.server);}catch(e){setError(e.message);}}
  return <section className="serverDiscoveryPage">
    <header><div className="discoveryTitle"><Compass size={22}/><div><strong>Server Discovery</strong><span>Find public Vodkach communities</span></div></div><label><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search servers"/></label></header>
    <div className="discoveryGrid">
      {loading?<div className="serverEmptyState">Loading communities…</div>:null}
      {!loading&&!servers.length?<div className="serverEmptyState"><Compass size={34}/><strong>No public servers found</strong><span>Public servers will appear here.</span></div>:null}
      {servers.map(server=><article className="discoveryCard" key={server.id}><ServerMark server={server} size={56}/><div className="discoveryCardBody"><strong>{server.name}</strong><p>{server.description||"A Vodkach community."}</p><span><Users size={14}/>{server.member_count||0} members</span></div>{server.joined?<button onClick={()=>onOpenServer?.(server)}>Open</button>:<button onClick={()=>join(server)}>Join</button>}</article>)}
    </div>{error?<div className="serverInlineError">{error}</div>:null}
  </section>;
}

function ServerSettingsModal({ server, members, channels, onClose, onUpdated, onLeft, onChannelsChanged, onMembersChanged }) {
  const [tab,setTab]=useState("overview");
  const [form,setForm]=useState({
    name:server.name, description:server.description||"", icon_color:server.icon_color||"#2b2d31", icon_data:server.icon_data||null,
    is_public:Boolean(server.is_public), rules_text:server.rules_text||"", verification_level:Number(server.verification_level||0),
    default_notifications:server.default_notifications||"all"
  });
  const [invites,setInvites]=useState([]),[bans,setBans]=useState([]),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const [inviteHours,setInviteHours]=useState(168),[inviteUses,setInviteUses]=useState(0);
  const [editChannel,setEditChannel]=useState(null);
  const canManage=["owner","admin"].includes(server.role);
  async function loadInvites(){try{const d=await api(`/api/servers/invites?server_id=${encodeURIComponent(server.id)}`);setInvites(d.invites||[]);}catch(e){setError(e.message);}}
  async function loadBans(){try{const d=await api(`/api/servers/members?server_id=${encodeURIComponent(server.id)}&mode=bans`);setBans(d.bans||[]);}catch(e){setError(e.message);}}
  useEffect(()=>{if(tab==="invites")loadInvites();if(tab==="bans")loadBans();},[tab]);
  async function save(){setBusy(true);setError("");try{const d=await api("/api/servers/settings",{method:"PATCH",body:JSON.stringify({server_id:server.id,...form})});onUpdated?.({...server,...d.server});}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function chooseIcon(event){try{const icon=await imageToServerIcon(event.target.files?.[0]);if(icon)setForm(f=>({...f,icon_data:icon}));}catch(e){setError(e.message);}event.target.value="";}
  async function createInvite(){try{await api("/api/servers/invites",{method:"POST",body:JSON.stringify({server_id:server.id,expires_hours:Number(inviteHours)||null,max_uses:Number(inviteUses)||null})});loadInvites();}catch(e){setError(e.message);}}
  async function revoke(i){try{await api("/api/servers/invites",{method:"DELETE",body:JSON.stringify({invite_id:i.id})});loadInvites();}catch(e){setError(e.message);}}
  async function changeRole(m,role){try{await api("/api/servers/members",{method:"PATCH",body:JSON.stringify({server_id:server.id,user_id:m.id,role})});onMembersChanged?.();}catch(e){setError(e.message);}}
  async function removeMember(m,ban=false){if(!confirm(`${ban?"Ban":"Remove"} ${m.display_name||m.username}?`))return;try{await api("/api/servers/members",{method:"DELETE",body:JSON.stringify({server_id:server.id,user_id:m.id,ban,reason:"Removed by moderator"})});onMembersChanged?.();}catch(e){setError(e.message);}}
  async function unban(b){try{await api("/api/servers/members",{method:"POST",body:JSON.stringify({server_id:server.id,user_id:b.user_id})});loadBans();}catch(e){setError(e.message);}}
  async function saveChannel(){try{await api("/api/servers/channels",{method:"PATCH",body:JSON.stringify({channel_id:editChannel.id,name:editChannel.name,topic:editChannel.topic||""})});setEditChannel(null);onChannelsChanged?.();}catch(e){setError(e.message);}}
  async function deleteChannel(c){if(!confirm(`Delete #${c.name}?`))return;try{await api("/api/servers/channels",{method:"DELETE",body:JSON.stringify({channel_id:c.id})});onChannelsChanged?.();}catch(e){setError(e.message);}}
  async function leaveOrDelete(){const owner=server.role==="owner";const confirmName=owner?prompt(`Type ${server.name} to delete this server`):"";if(owner&&confirmName!==server.name)return;try{await api("/api/servers/settings",{method:"DELETE",body:JSON.stringify({server_id:server.id,confirm_name:confirmName})});onLeft?.(server.id);onClose();}catch(e){setError(e.message);}}
  const tabs=[
    ["overview","Overview",Settings],["channels","Channels",Hash],["invites","Invites",UserPlus],["members","Members",Users],
    ["moderation","Moderation",Shield],["bans","Bans",Ban]
  ];
  return <div className="serverSettingsFullscreen" onMouseDown={onClose}><div className="serverSettingsFrame" onMouseDown={e=>e.stopPropagation()}>
    <aside><div className="serverSettingsIdentity"><ServerMark server={{...server,...form}} size={46}/><div><strong>{form.name}</strong><span>{server.role}</span></div></div>{tabs.map(([id,label,Icon])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><Icon size={16}/>{label}</button>)}<div className="serverSettingsSpacer"/><button className="danger" onClick={leaveOrDelete}>{server.role==="owner"?<><Trash2 size={16}/>Delete Server</>:<><LogOut size={16}/>Leave Server</>}</button></aside>
    <main><button className="serverSettingsClose" onClick={onClose}><X size={18}/></button>
      {tab==="overview"&&<section><h2>Server Overview</h2><p>Identity, discovery and default server behavior.</p><div className="serverIconEditor"><ServerMark server={{...server,...form}} size={96}/><div><label className="serverUploadButton"><ImagePlus size={17}/>Upload Icon<input type="file" accept="image/*" onChange={chooseIcon}/></label><button onClick={()=>setForm(f=>({...f,icon_data:null}))}>Remove</button><span>PNG, JPG, GIF or WebP up to 10 MB. Images are resized locally.</span></div></div><label>SERVER NAME<input disabled={server.role!=="owner"} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>DESCRIPTION<textarea disabled={server.role!=="owner"} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} maxLength={240}/></label><label>FALLBACK ICON COLOR<div className="serverColorField"><input type="color" disabled={server.role!=="owner"} value={form.icon_color} onChange={e=>setForm({...form,icon_color:e.target.value})}/><input disabled={server.role!=="owner"} value={form.icon_color} onChange={e=>setForm({...form,icon_color:e.target.value})}/></div></label><label className="serverSwitchRow"><div><strong>Show in Discovery</strong><span>Anyone can find and join this server.</span></div><input type="checkbox" disabled={server.role!=="owner"} checked={form.is_public} onChange={e=>setForm({...form,is_public:e.target.checked})}/></label>{server.role==="owner"?<button className="serverPrimaryAction" disabled={busy} onClick={save}><Save size={16}/>{busy?"Saving…":"Save Changes"}</button>:null}</section>}
      {tab==="channels"&&<section><h2>Channels</h2><p>Rename channels, edit topics or remove unused channels.</p><div className="serverSettingsChannelList">{channels.map(c=><div key={c.id}><Hash size={17}/><div><strong>{c.name}</strong><span>{c.topic||"No topic"}</span></div>{canManage?<><button onClick={()=>setEditChannel({...c})}><Pencil size={15}/></button><button className="danger" onClick={()=>deleteChannel(c)}><Trash2 size={15}/></button></>:null}</div>)}</div>{editChannel?<div className="serverInlineEditor"><label>CHANNEL NAME<input value={editChannel.name} onChange={e=>setEditChannel({...editChannel,name:e.target.value})}/></label><label>TOPIC<input value={editChannel.topic||""} onChange={e=>setEditChannel({...editChannel,topic:e.target.value})}/></label><div><button onClick={()=>setEditChannel(null)}>Cancel</button><button className="primary" onClick={saveChannel}>Save</button></div></div>:null}</section>}
      {tab==="invites"&&<section><div className="serverSettingsSectionTitle"><div><h2>Invites</h2><p>Create limited or permanent invite codes.</p></div></div>{canManage?<div className="serverInviteBuilder"><label>EXPIRES<select value={inviteHours} onChange={e=>setInviteHours(e.target.value)}><option value="0">Never</option><option value="1">1 hour</option><option value="24">1 day</option><option value="168">7 days</option></select></label><label>MAX USES<input type="number" min="0" max="1000" value={inviteUses} onChange={e=>setInviteUses(e.target.value)}/></label><button onClick={createInvite}><Plus size={16}/>Create Invite</button></div>:null}<div className="serverInviteList">{invites.map(i=>{const dead=i.revoked_at||(i.expires_at&&Date.parse(i.expires_at)<Date.now())||(i.max_uses&&i.uses>=i.max_uses);return <div className={`serverInviteRow ${dead?"expired":""}`} key={i.id}><div><code>{i.code}</code><span>{dead?"Expired":`${i.uses}${i.max_uses?` / ${i.max_uses}`:""} uses`}</span></div><button onClick={()=>navigator.clipboard?.writeText(`${location.origin}/?invite=${i.code}`)} disabled={dead}><Copy size={15}/></button>{canManage&&!dead?<button onClick={()=>revoke(i)}><Trash2 size={15}/></button>:null}</div>})}{!invites.length?<div className="serverEmptyState">No invites yet.</div>:null}</div></section>}
      {tab==="members"&&<section><h2>Members</h2><p>{members.length} people in this server.</p><div className="serverSettingsMembers expanded">{members.map(m=><div key={m.id}><img src={m.avatar_url||"/default-avatar.png"}/><div><strong>{m.display_name||m.username}</strong><span>@{m.username}</span></div><em>{m.role}</em>{server.role==="owner"&&m.role!=="owner"?<select value={m.role} onChange={e=>changeRole(m,e.target.value)}><option value="member">Member</option><option value="admin">Admin</option></select>:null}{canManage&&m.role!=="owner"?<><button title="Remove" onClick={()=>removeMember(m,false)}><UserMinus size={15}/></button><button title="Ban" className="danger" onClick={()=>removeMember(m,true)}><Ban size={15}/></button></>:null}</div>)}</div></section>}
      {tab==="moderation"&&<section><h2>Moderation</h2><p>Set basic safety rules for new and existing members.</p><label>VERIFICATION LEVEL<select value={form.verification_level} onChange={e=>setForm({...form,verification_level:Number(e.target.value)})}><option value="0">None</option><option value="1">Verified account required</option><option value="2">Established account required</option></select></label><label>DEFAULT NOTIFICATIONS<select value={form.default_notifications} onChange={e=>setForm({...form,default_notifications:e.target.value})}><option value="all">All messages</option><option value="mentions">Only mentions</option></select></label><label>SERVER RULES<textarea value={form.rules_text} onChange={e=>setForm({...form,rules_text:e.target.value})} maxLength={4000} placeholder="Write clear rules for members…"/></label>{server.role==="owner"?<button className="serverPrimaryAction" disabled={busy} onClick={save}><Save size={16}/>Save Moderation</button>:null}</section>}
      {tab==="bans"&&<section><h2>Bans</h2><p>People blocked from joining this server.</p><div className="serverBanList">{bans.map(b=><div key={b.user_id}><img src={b.avatar_url||"/default-avatar.png"}/><div><strong>{b.display_name||b.username}</strong><span>{b.reason||"No reason provided"}</span></div><button onClick={()=>unban(b)}>Unban</button></div>)}{!bans.length?<div className="serverEmptyState">No banned members.</div>:null}</div></section>}
      {error?<div className="serverInlineError">{error}</div>:null}
    </main>
  </div></div>;
}

export function ServerWorkspace({ server, currentUser, onServerUpdated, onServerRemoved }) {
  const [channels,setChannels]=useState([]),[activeChannel,setActiveChannel]=useState(null),[messages,setMessages]=useState([]),[members,setMembers]=useState([]),[text,setText]=useState(""),[newChannel,setNewChannel]=useState(false),[channelName,setChannelName]=useState(""),[error,setError]=useState(""),[settingsOpen,setSettingsOpen]=useState(false);
  const endRef=useRef(null);
  async function loadChannels(){const d=await api(`/api/servers/channels?server_id=${encodeURIComponent(server.id)}`);setChannels(d.channels||[]);setActiveChannel(c=>c&&(d.channels||[]).some(x=>x.id===c.id)?c:(d.channels||[])[0]||null);}
  async function loadMembers(){const d=await api(`/api/servers/members?server_id=${encodeURIComponent(server.id)}`);setMembers(d.members||[]);}
  async function loadMessages(channel=activeChannel){if(!channel?.id){setMessages([]);return;}const d=await api(`/api/servers/messages?channel_id=${encodeURIComponent(channel.id)}`);setMessages(d.messages||[]);requestAnimationFrame(()=>endRef.current?.scrollIntoView({block:"end"}));}
  useEffect(()=>{Promise.all([loadChannels(),loadMembers()]).catch(e=>setError(e.message));},[server.id]);
  useEffect(()=>{loadMessages().catch(e=>setError(e.message));},[activeChannel?.id]);
  useEffect(()=>{const h=e=>{const p=e.detail||{};if(p.type==="server.changed"&&(!p.serverId||p.serverId===server.id)){loadChannels().catch(()=>{});loadMembers().catch(()=>{});if(!p.channelId||p.channelId===activeChannel?.id)loadMessages().catch(()=>{});}};window.addEventListener("vodkach:realtime",h);return()=>window.removeEventListener("vodkach:realtime",h);},[server.id,activeChannel?.id]);
  useEffect(()=>{const h=e=>{const d=e.detail||{};if(d.serverId!==server.id)return;if(d.action==="settings")setSettingsOpen(true);if(d.action==="create-channel")setNewChannel(true);if(d.action==="copy-invite")navigator.clipboard?.writeText(server.invite_code||"");};window.addEventListener("vodkach:server-action",h);return()=>window.removeEventListener("vodkach:server-action",h);},[server.id,server.invite_code]);
  async function send(e){e.preventDefault();const body=text.trim();if(!body||!activeChannel)return;setText("");try{const d=await api("/api/servers/messages",{method:"POST",body:JSON.stringify({channel_id:activeChannel.id,body})});setMessages(m=>m.some(x=>x.id===d.message.id)?m:[...m,d.message]);requestAnimationFrame(()=>endRef.current?.scrollIntoView({block:"end"}));}catch(x){setText(body);setError(x.message);}}
  async function createChannel(e){e.preventDefault();try{const d=await api("/api/servers/channels",{method:"POST",body:JSON.stringify({server_id:server.id,name:channelName})});setChannelName("");setNewChannel(false);await loadChannels();setActiveChannel(d.channel);}catch(x){setError(x.message);}}
  const onlineMembers=useMemo(()=>members.filter(online),[members]),offlineMembers=members.filter(m=>!online(m));
  return <div className="serverWorkspace serverWorkspaceV3">
    <aside className="serverChannelRail"><header><div><strong>{server.name}</strong><span>{server.description||`${members.length||server.member_count||1} members`}</span></div><button className="serverHeaderSettingsButton" title="Server Settings" onClick={()=>setSettingsOpen(true)}><Settings size={17}/></button></header>
      <div className="serverChannelHeading"><span>TEXT CHANNELS</span>{["owner","admin"].includes(server.role)?<button onClick={()=>setNewChannel(true)}><Plus size={14}/></button>:null}</div>{newChannel?<form className="serverNewChannel" onSubmit={createChannel}><input autoFocus value={channelName} onChange={e=>setChannelName(e.target.value)} placeholder="channel-name"/><button>+</button></form>:null}<nav>{channels.map(c=><button key={c.id} className={activeChannel?.id===c.id?"active":""} onClick={()=>setActiveChannel(c)}><Hash size={17}/><span>{c.name}</span></button>)}</nav>
      <div className="serverUserBar"><img src={currentUser?.avatar_url||"/default-avatar.png"}/><div><strong>{currentUser?.display_name||currentUser?.username}</strong><span>@{currentUser?.username}</span></div><span className="serverUserStatus"/></div>
    </aside>
    <section className="serverChatPane"><header className="serverChatHeader"><Hash size={19}/><div><strong>{activeChannel?.name||"channel"}</strong><span>{activeChannel?.topic||server.description||"Server channel"}</span></div><Users size={18}/><span>{members.length}</span></header><div className="serverMessageList">{!messages.length?<div className="serverWelcome"><ServerMark server={server} size={58}/><strong>Welcome to #{activeChannel?.name||"general"}</strong><span>This is the beginning of this channel.</span></div>:null}{messages.map(m=><article className="serverMessage" key={m.id}><img src={m.sender?.avatar_url||"/default-avatar.png"}/><div><div><strong>{m.sender?.display_name||m.sender?.username||"User"}</strong>{m.sender?.verified?<Check size={13} className="serverVerified"/>:null}<time>{new Date(m.created_at).toLocaleString()}</time></div><p>{m.deleted_at?"Message deleted":m.body}</p></div></article>)}<div ref={endRef}/></div>{error?<div className="serverInlineError">{error}</div>:null}<form className="serverComposer messageComposer serverMessageComposer" onSubmit={send}><textarea rows={1} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit();}}} placeholder={`Message #${activeChannel?.name||"channel"}`} disabled={!activeChannel}/><button type="button" className="serverPollButton" title="Polls for server channels are coming in the next server feature update" aria-label="Create poll"><BarChart3 size={18}/></button><button className="serverSendButton" disabled={!text.trim()||!activeChannel}>Send</button></form></section>
    <aside className="serverMemberRail"><div className="serverMemberGroup"><strong>ONLINE — {onlineMembers.length}</strong>{onlineMembers.map(m=><div className="serverMember" key={m.id}><span className="serverMemberAvatar"><img src={m.avatar_url||"/default-avatar.png"}/><i/></span><div><b>{m.display_name||m.username}</b><span>@{m.username}</span></div>{m.role==="owner"?<Crown size={13}/>:m.role==="admin"?<Shield size={13}/>:null}</div>)}</div>{offlineMembers.length?<div className="serverMemberGroup offline"><strong>OFFLINE — {offlineMembers.length}</strong>{offlineMembers.map(m=><div className="serverMember" key={m.id}><span className="serverMemberAvatar"><img src={m.avatar_url||"/default-avatar.png"}/></span><div><b>{m.display_name||m.username}</b><span>@{m.username}</span></div>{m.role==="owner"?<Crown size={13}/>:m.role==="admin"?<Shield size={13}/>:null}</div>)}</div>:null}</aside>
    {settingsOpen?<ServerSettingsModal server={server} members={members} channels={channels} onClose={()=>setSettingsOpen(false)} onUpdated={onServerUpdated} onLeft={onServerRemoved} onChannelsChanged={loadChannels} onMembersChanged={loadMembers}/>:null}
  </div>;
}

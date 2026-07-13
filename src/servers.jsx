import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Clipboard, Compass, Copy, Crown, Hash, LogOut, Plus, Search, Settings, Shield, Trash2, UserPlus, Users, X } from "lucide-react";

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

function ServerMark({ server, size = 42 }) {
  return <span className="serverMark" style={{ "--server-color": server.icon_color || "#fc0303", width:size, height:size }}>
    {server.icon_text || server.name?.[0]?.toUpperCase() || "V"}
  </span>;
}

function online(member) {
  return member.status_preference !== "offline" && member.last_seen_at && Date.now() - Date.parse(member.last_seen_at) < 90000;
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
      <div className="serverModalHero"><ServerMark server={{name:name||"Vodkach",icon_color:"#fc0303"}} size={54}/><div><h2>{mode === "create" ? "Create your server" : "Join a server"}</h2><p>{mode === "create" ? "Build a private community with channels and invites." : "Enter an invite code to join instantly."}</p></div></div>
      <div className="serverModalTabs">
        <button type="button" className={mode==="create"?"active":""} onClick={()=>{setMode("create");setError("");}}>Create</button>
        <button type="button" className={mode==="join"?"active":""} onClick={()=>{setMode("join");setError("");}}>Join</button>
      </div>
      {mode === "create" ? <label>SERVER NAME<input autoFocus value={name} onChange={(e)=>setName(e.target.value)} maxLength={32} placeholder="My Server"/></label> : <label>INVITE CODE<input autoFocus value={code} onChange={(e)=>setCode(e.target.value.toUpperCase())} maxLength={32} placeholder="ABCD1234"/></label>}
      {error ? <div className="serverModalError">{error}</div> : null}
      <button className="serverModalPrimary" disabled={busy || !(mode === "create" ? name.trim() : code.trim())}>{busy ? "Please wait..." : mode === "create" ? "Create Server" : "Join Server"}</button>
    </form>
  </div>;
}

export function ServerDiscovery({ onJoined, onOpenServer }) {
  const [servers,setServers]=useState([]); const [query,setQuery]=useState(""); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  async function load(){setLoading(true);try{const d=await api(`/api/servers/discovery?q=${encodeURIComponent(query)}`);setServers(d.servers||[]);setError("");}catch(e){setError(e.message);}finally{setLoading(false);}}
  useEffect(()=>{const t=setTimeout(load,180);return()=>clearTimeout(t);},[query]);
  async function join(server){try{const d=await api("/api/servers/join",{method:"POST",body:JSON.stringify({server_id:server.id})});onJoined?.(d.server);onOpenServer?.(d.server);}catch(e){setError(e.message);}}
  return <section className="serverDiscoveryPage">
    <header><div className="discoveryTitle"><Compass size={22}/><div><strong>Server Discovery</strong><span>Find public communities on Vodkach</span></div></div><label><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search servers"/></label></header>
    <div className="discoveryGrid">
      {loading?<div className="serverEmptyState">Loading communities…</div>:null}
      {!loading && !servers.length?<div className="serverEmptyState"><Compass size={34}/><strong>No public servers found</strong><span>Public servers will appear here.</span></div>:null}
      {servers.map(server=><article className="discoveryCard" key={server.id}><ServerMark server={server} size={56}/><div className="discoveryCardBody"><strong>{server.name}</strong><p>{server.description||"A Vodkach community."}</p><span><Users size={14}/>{server.member_count||0} members</span></div>{server.joined?<button onClick={()=>onOpenServer?.(server)}>Open</button>:<button onClick={()=>join(server)}>Join</button>}</article>)}
    </div>{error?<div className="serverInlineError">{error}</div>:null}
  </section>;
}

function ServerSettingsModal({ server, members, onClose, onUpdated, onLeft }) {
  const [tab,setTab]=useState("overview"); const [form,setForm]=useState({name:server.name,description:server.description||"",icon_color:server.icon_color||"#fc0303",is_public:Boolean(server.is_public)}); const [invites,setInvites]=useState([]); const [error,setError]=useState(""); const [busy,setBusy]=useState(false); const canManage=server.role==="owner"||server.role==="admin";
  async function loadInvites(){try{const d=await api(`/api/servers/invites?server_id=${encodeURIComponent(server.id)}`);setInvites(d.invites||[]);}catch(e){setError(e.message);}}
  useEffect(()=>{if(tab==="invites")loadInvites();},[tab]);
  async function save(){setBusy(true);try{const d=await api("/api/servers/settings",{method:"PATCH",body:JSON.stringify({server_id:server.id,...form})});onUpdated?.({...server,...d.server});onClose();}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function createInvite(){try{await api("/api/servers/invites",{method:"POST",body:JSON.stringify({server_id:server.id,expires_hours:168})});loadInvites();}catch(e){setError(e.message);}}
  async function revoke(invite){try{await api("/api/servers/invites",{method:"DELETE",body:JSON.stringify({invite_id:invite.id})});loadInvites();}catch(e){setError(e.message);}}
  async function leaveOrDelete(){const owner=server.role==="owner";const confirmName=owner?prompt(`Type ${server.name} to delete this server`):null;if(owner&&confirmName!==server.name)return;try{await api("/api/servers/settings",{method:"DELETE",body:JSON.stringify({server_id:server.id,confirm_name:confirmName})});onLeft?.(server.id);onClose();}catch(e){setError(e.message);}}
  return <div className="serverModalBackdrop" onMouseDown={onClose}><div className="serverSettingsModal" onMouseDown={e=>e.stopPropagation()}><aside><div className="serverSettingsIdentity"><ServerMark server={{...server,...form}} size={46}/><div><strong>{form.name}</strong><span>{server.role}</span></div></div><button className={tab==="overview"?"active":""} onClick={()=>setTab("overview")}>Overview</button><button className={tab==="invites"?"active":""} onClick={()=>setTab("invites")}>Invites</button><button className={tab==="members"?"active":""} onClick={()=>setTab("members")}>Members</button><div className="serverSettingsSpacer"/><button className="danger" onClick={leaveOrDelete}>{server.role==="owner"?<><Trash2 size={16}/>Delete Server</>:<><LogOut size={16}/>Leave Server</>}</button></aside><main><button className="serverSettingsClose" onClick={onClose}><X size={18}/></button>
    {tab==="overview"&&<section><h2>Server Overview</h2><p>Control how your server looks and whether it appears in Discovery.</p><div className="serverOverviewPreview"><ServerMark server={{...server,...form}} size={64}/><div><strong>{form.name||"Server"}</strong><span>{form.description||"No description yet"}</span></div></div><label>SERVER NAME<input disabled={server.role!=="owner"} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>DESCRIPTION<textarea disabled={server.role!=="owner"} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} maxLength={240}/></label><label>ICON COLOR<div className="serverColorField"><input type="color" disabled={server.role!=="owner"} value={form.icon_color} onChange={e=>setForm({...form,icon_color:e.target.value})}/><input disabled={server.role!=="owner"} value={form.icon_color} onChange={e=>setForm({...form,icon_color:e.target.value})}/></div></label><label className="serverSwitchRow"><div><strong>Show in Discovery</strong><span>Anyone can find and join this server.</span></div><input type="checkbox" disabled={server.role!=="owner"} checked={form.is_public} onChange={e=>setForm({...form,is_public:e.target.checked})}/></label>{server.role==="owner"?<button className="serverPrimaryAction" disabled={busy} onClick={save}>{busy?"Saving…":"Save Changes"}</button>:null}</section>}
    {tab==="invites"&&<section><div className="serverSettingsSectionTitle"><div><h2>Invites</h2><p>Create, copy and revoke invite links.</p></div>{canManage?<button onClick={createInvite}><Plus size={16}/>New Invite</button>:null}</div><div className="serverInviteList">{invites.map(i=>{const dead=i.revoked_at||(i.expires_at&&Date.parse(i.expires_at)<Date.now())||(i.max_uses&&i.uses>=i.max_uses);return <div className={`serverInviteRow ${dead?"expired":""}`} key={i.id}><div><code>{i.code}</code><span>{dead?"Expired":`${i.uses}${i.max_uses?` / ${i.max_uses}`:""} uses`}</span></div><button onClick={()=>navigator.clipboard?.writeText(i.code)} disabled={dead}><Copy size={15}/></button>{canManage&&!dead?<button onClick={()=>revoke(i)}><Trash2 size={15}/></button>:null}</div>})}{!invites.length?<div className="serverEmptyState">No invites yet.</div>:null}</div></section>}
    {tab==="members"&&<section><h2>Members</h2><p>{members.length} people in this server.</p><div className="serverSettingsMembers">{members.map(m=><div key={m.id}><img src={m.avatar_url||"/default-avatar.png"}/><div><strong>{m.display_name||m.username}</strong><span>@{m.username}</span></div><em>{m.role}</em></div>)}</div></section>}
    {error?<div className="serverInlineError">{error}</div>:null}
  </main></div></div>;
}

export function ServerWorkspace({ server, currentUser, onServerUpdated, onServerRemoved }) {
  const [channels,setChannels]=useState([]),[activeChannel,setActiveChannel]=useState(null),[messages,setMessages]=useState([]),[members,setMembers]=useState([]),[text,setText]=useState(""),[newChannel,setNewChannel]=useState(false),[channelName,setChannelName]=useState(""),[error,setError]=useState(""),[menuOpen,setMenuOpen]=useState(false),[settingsOpen,setSettingsOpen]=useState(false); const endRef=useRef(null);
  async function loadChannels(){const d=await api(`/api/servers/channels?server_id=${encodeURIComponent(server.id)}`);setChannels(d.channels||[]);setActiveChannel(c=>c&&(d.channels||[]).some(x=>x.id===c.id)?c:(d.channels||[])[0]||null);}
  async function loadMembers(){const d=await api(`/api/servers/members?server_id=${encodeURIComponent(server.id)}`);setMembers(d.members||[]);}
  async function loadMessages(channel=activeChannel){if(!channel?.id){setMessages([]);return;}const d=await api(`/api/servers/messages?channel_id=${encodeURIComponent(channel.id)}`);setMessages(d.messages||[]);requestAnimationFrame(()=>endRef.current?.scrollIntoView({block:"end"}));}
  useEffect(()=>{Promise.all([loadChannels(),loadMembers()]).catch(e=>setError(e.message));},[server.id]);
  useEffect(()=>{loadMessages().catch(e=>setError(e.message));},[activeChannel?.id]);
  useEffect(()=>{const h=e=>{const p=e.detail||{};if(p.type==="server.changed"&&(!p.serverId||p.serverId===server.id)){loadChannels().catch(()=>{});loadMembers().catch(()=>{});if(!p.channelId||p.channelId===activeChannel?.id)loadMessages().catch(()=>{});}};window.addEventListener("vodkach:realtime",h);return()=>window.removeEventListener("vodkach:realtime",h);},[server.id,activeChannel?.id]);
  async function send(e){e.preventDefault();const body=text.trim();if(!body||!activeChannel)return;setText("");try{const d=await api("/api/servers/messages",{method:"POST",body:JSON.stringify({channel_id:activeChannel.id,body})});setMessages(m=>m.some(x=>x.id===d.message.id)?m:[...m,d.message]);requestAnimationFrame(()=>endRef.current?.scrollIntoView({block:"end"}));}catch(x){setText(body);setError(x.message);}}
  async function createChannel(e){e.preventDefault();try{await api("/api/servers/channels",{method:"POST",body:JSON.stringify({server_id:server.id,name:channelName})});setChannelName("");setNewChannel(false);loadChannels();}catch(x){setError(x.message);}}
  const onlineMembers=useMemo(()=>members.filter(online),[members]); const offlineMembers=members.filter(m=>!online(m));
  return <div className="serverWorkspace serverWorkspaceV2">
    <aside className="serverChannelRail"><header><button className="serverHeaderButton" onClick={()=>setMenuOpen(v=>!v)}><div><strong>{server.name}</strong><span>{server.description||`${members.length||server.member_count||1} members`}</span></div><ChevronDown size={16}/></button>{menuOpen?<div className="serverHeaderMenu"><button onClick={()=>{setMenuOpen(false);setSettingsOpen(true)}}><Settings size={15}/>Server Settings</button><button onClick={()=>{navigator.clipboard?.writeText(server.invite_code||"");setMenuOpen(false)}}><UserPlus size={15}/>Copy Invite Code</button></div>:null}</header>
      <div className="serverChannelHeading"><span>TEXT CHANNELS</span>{server.role==="owner"||server.role==="admin"?<button onClick={()=>setNewChannel(true)}><Plus size={14}/></button>:null}</div>{newChannel?<form className="serverNewChannel" onSubmit={createChannel}><input autoFocus value={channelName} onChange={e=>setChannelName(e.target.value)} placeholder="channel-name"/><button>+</button></form>:null}<nav>{channels.map(c=><button key={c.id} className={activeChannel?.id===c.id?"active":""} onClick={()=>setActiveChannel(c)}><Hash size={17}/><span>{c.name}</span></button>)}</nav>
      <div className="serverUserBar"><img src={currentUser?.avatar_url||"/default-avatar.png"}/><div><strong>{currentUser?.display_name||currentUser?.username}</strong><span>@{currentUser?.username}</span></div><span className="serverUserStatus"/></div>
    </aside>
    <section className="serverChatPane"><header className="serverChatHeader"><Hash size={19}/><div><strong>{activeChannel?.name||"channel"}</strong><span>{server.description||"Server channel"}</span></div><Users size={18}/><span>{members.length}</span></header><div className="serverMessageList">{!messages.length?<div className="serverWelcome"><ServerMark server={server} size={58}/><strong>Welcome to #{activeChannel?.name||"general"}</strong><span>This is the beginning of this channel.</span></div>:null}{messages.map(m=><article className="serverMessage" key={m.id}><img src={m.sender?.avatar_url||"/default-avatar.png"}/><div><div><strong>{m.sender?.display_name||m.sender?.username||"User"}</strong>{m.sender?.verified?<Check size={13} className="serverVerified"/>:null}<time>{new Date(m.created_at).toLocaleString()}</time></div><p>{m.deleted_at?"Message deleted":m.body}</p></div></article>)}<div ref={endRef}/></div>{error?<div className="serverInlineError">{error}</div>:null}<form className="serverComposer" onSubmit={send}><input value={text} onChange={e=>setText(e.target.value)} placeholder={`Message #${activeChannel?.name||"channel"}`} disabled={!activeChannel}/><button disabled={!text.trim()||!activeChannel}>Send</button></form></section>
    <aside className="serverMemberRail"><div className="serverMemberGroup"><strong>ONLINE — {onlineMembers.length}</strong>{onlineMembers.map(m=><div className="serverMember" key={m.id}><span className="serverMemberAvatar"><img src={m.avatar_url||"/default-avatar.png"}/><i/></span><div><b>{m.display_name||m.username}</b><span>@{m.username}</span></div>{m.role==="owner"?<Crown size={13}/>:m.role==="admin"?<Shield size={13}/>:null}</div>)}</div>{offlineMembers.length?<div className="serverMemberGroup offline"><strong>OFFLINE — {offlineMembers.length}</strong>{offlineMembers.map(m=><div className="serverMember" key={m.id}><span className="serverMemberAvatar"><img src={m.avatar_url||"/default-avatar.png"}/></span><div><b>{m.display_name||m.username}</b><span>@{m.username}</span></div>{m.role==="owner"?<Crown size={13}/>:m.role==="admin"?<Shield size={13}/>:null}</div>)}</div>:null}</aside>
    {settingsOpen?<ServerSettingsModal server={server} members={members} onClose={()=>setSettingsOpen(false)} onUpdated={onServerUpdated} onLeft={onServerRemoved}/>:null}
  </div>;
}

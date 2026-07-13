import React, { useEffect, useRef, useState } from "react";
import { Hash, Plus, Users, Copy, X } from "lucide-react";

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

export function ServerCreateModal({ open, onClose, onChanged }) {
  const [mode, setMode] = useState("create");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!open) return null;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const data = mode === "create"
        ? await api("/api/servers", { method: "POST", body: JSON.stringify({ name: value }) })
        : await api("/api/servers/join", { method: "POST", body: JSON.stringify({ invite_code: value }) });
      onChanged?.(data.server); setValue(""); onClose();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <div className="serverModalBackdrop" onMouseDown={onClose}>
    <form className="serverModal" onMouseDown={(e)=>e.stopPropagation()} onSubmit={submit}>
      <button className="serverModalClose" type="button" onClick={onClose}><X size={18}/></button>
      <h2>{mode === "create" ? "Create a server" : "Join a server"}</h2>
      <p>{mode === "create" ? "Start a private space for your community." : "Enter an invite code from a server member."}</p>
      <div className="serverModalTabs">
        <button type="button" className={mode==="create"?"active":""} onClick={()=>{setMode("create");setError("");}}>Create</button>
        <button type="button" className={mode==="join"?"active":""} onClick={()=>{setMode("join");setError("");}}>Join</button>
      </div>
      <label>{mode === "create" ? "SERVER NAME" : "INVITE CODE"}<input autoFocus value={value} onChange={(e)=>setValue(e.target.value)} maxLength={mode==="create"?32:8} placeholder={mode==="create"?"My Server":"ABCD1234"}/></label>
      {error ? <div className="serverModalError">{error}</div> : null}
      <button className="serverModalPrimary" disabled={busy || !value.trim()}>{busy ? "Please wait..." : mode === "create" ? "Create Server" : "Join Server"}</button>
    </form>
  </div>;
}

export function ServerWorkspace({ server }) {
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [newChannel, setNewChannel] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [error, setError] = useState("");
  const endRef = useRef(null);

  async function loadChannels() {
    const data = await api(`/api/servers/channels?server_id=${encodeURIComponent(server.id)}`);
    setChannels(data.channels || []);
    setActiveChannel((current) => current && data.channels.some((c)=>c.id===current.id) ? current : data.channels[0] || null);
  }
  async function loadMessages(channel = activeChannel) {
    if (!channel?.id) { setMessages([]); return; }
    const data = await api(`/api/servers/messages?channel_id=${encodeURIComponent(channel.id)}`);
    setMessages(data.messages || []);
    requestAnimationFrame(()=>endRef.current?.scrollIntoView({block:"end"}));
  }
  useEffect(()=>{ loadChannels().catch((e)=>setError(e.message)); },[server.id]);
  useEffect(()=>{ loadMessages().catch((e)=>setError(e.message)); },[activeChannel?.id]);
  useEffect(()=>{
    const handler=(event)=>{ const p=event.detail||{}; if(p.type==="server.changed" && (!p.serverId || p.serverId===server.id)){ loadChannels().catch(()=>{}); loadMessages().catch(()=>{}); } };
    window.addEventListener("vodkach:realtime",handler); return()=>window.removeEventListener("vodkach:realtime",handler);
  },[server.id,activeChannel?.id]);
  async function send(event){event.preventDefault();const body=text.trim();if(!body||!activeChannel)return;setText("");try{const data=await api("/api/servers/messages",{method:"POST",body:JSON.stringify({channel_id:activeChannel.id,body})});setMessages((m)=>[...m,data.message]);requestAnimationFrame(()=>endRef.current?.scrollIntoView({block:"end"}));}catch(e){setText(body);setError(e.message);}}
  async function createChannel(event){event.preventDefault();try{await api("/api/servers/channels",{method:"POST",body:JSON.stringify({server_id:server.id,name:channelName})});setChannelName("");setNewChannel(false);await loadChannels();}catch(e){setError(e.message);}}
  return <div className="serverWorkspace">
    <aside className="serverChannelRail">
      <header><div><strong>{server.name}</strong><span><Users size={13}/>{server.member_count || 1}</span></div><button title="Copy invite code" onClick={()=>navigator.clipboard?.writeText(server.invite_code||"")}><Copy size={15}/></button></header>
      <div className="serverChannelHeading"><span>TEXT CHANNELS</span>{server.role==="owner"?<button onClick={()=>setNewChannel(true)}><Plus size={14}/></button>:null}</div>
      {newChannel ? <form className="serverNewChannel" onSubmit={createChannel}><input autoFocus value={channelName} onChange={(e)=>setChannelName(e.target.value)} placeholder="channel-name"/><button>+</button></form>:null}
      <nav>{channels.map((channel)=><button key={channel.id} className={activeChannel?.id===channel.id?"active":""} onClick={()=>setActiveChannel(channel)}><Hash size={17}/><span>{channel.name}</span></button>)}</nav>
      <div className="serverInviteCode">Invite: <strong>{server.invite_code}</strong></div>
    </aside>
    <section className="serverChatPane">
      <header className="serverChatHeader"><Hash size={19}/><strong>{activeChannel?.name || "channel"}</strong></header>
      <div className="serverMessageList">{messages.map((message)=><article className="serverMessage" key={message.id}><img src={message.sender?.avatar_url || "/default-avatar.png"} alt=""/><div><div><strong>{message.sender?.display_name || message.sender?.username || "User"}</strong><time>{new Date(message.created_at).toLocaleString()}</time></div><p>{message.deleted_at ? "Message deleted" : message.body}</p></div></article>)}<div ref={endRef}/></div>
      {error?<div className="serverInlineError">{error}</div>:null}
      <form className="serverComposer" onSubmit={send}><input value={text} onChange={(e)=>setText(e.target.value)} placeholder={`Message #${activeChannel?.name || "channel"}`} disabled={!activeChannel}/><button disabled={!text.trim()||!activeChannel}>Send</button></form>
    </section>
  </div>;
}

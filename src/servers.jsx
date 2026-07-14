import React,{useEffect,useMemo,useRef,useState}from'react';
import{createPortal}from'react-dom';
import{EmojiPicker,NotoEmojiText,expandEmojiShortcodes}from'./emoji.jsx';
import{Ban,Check,ChevronDown,Clipboard,Compass,Copy,Crown,Gavel,Hash,ImagePlus,ChevronUp,LogOut,MessageSquare,Pencil,Plus,Save,Search,Settings,Shield,Trash2,UserMinus,Users,X,Volume2,Mic,MicOff,Clock3,GripVertical,AtSign,Images,BarChart3,Upload,Link2}from'lucide-react';
async function api(path,options={}){const r=await fetch(path,{credentials:'include',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.error||`Request failed (${r.status})`);return d}
const online=m=>m.status_preference!=='offline'&&m.last_seen_at&&Date.now()-Date.parse(m.last_seen_at)<90000;
function UiIcon({name,className=''}){return <img className={`inlineUiIcon ${className}`} src={`/ui/${name}.svg`} alt="" aria-hidden="true"/>}
async function imageData(file,{w,h,quality=.82,label='Image'}={}){if(!file)return null;if(!file.type.startsWith('image/'))throw new Error('Choose an image file');if(file.size>10*1024*1024)throw new Error(`${label} must be 10 MB or smaller`);const b=await createImageBitmap(file),c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d'),scale=Math.max(w/b.width,h/b.height),dw=b.width*scale,dh=b.height*scale;x.fillStyle='#111216';x.fillRect(0,0,w,h);x.drawImage(b,(w-dw)/2,(h-dh)/2,dw,dh);b.close?.();return c.toDataURL('image/webp',quality)}
export function ServerMark({server,size=42}){return <span className={`serverMark ${server.icon_data?'hasImage':''}`} style={{'--server-color':server.icon_color||'#2b2d31',width:size,height:size}}>{server.icon_data?<img src={server.icon_data} alt=""/>:(server.icon_text||server.name?.[0]?.toUpperCase()||'V')}</span>}
export function ServerCreateModal({open,onClose,onChanged}){const[mode,setMode]=useState('create'),[name,setName]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');if(!open)return null;async function submit(e){e?.preventDefault?.();setBusy(true);setError('');try{const d=mode==='create'?await api('/api/servers',{method:'POST',body:JSON.stringify({name})}):await api('/api/servers/join',{method:'POST',body:JSON.stringify({invite_code:code})});onChanged?.(d.server);onClose()}catch(x){setError(x.message)}finally{setBusy(false)}}return <div className="serverModalBackdrop" onMouseDown={onClose}><form className="serverModal serverJoinCreateModal" onMouseDown={e=>e.stopPropagation()} onSubmit={submit}><button type="button" className="serverModalClose" onClick={onClose}><X size={18}/></button><h2>{mode==='create'?'Create a server':'Join a server'}</h2><div className="serverModalTabs"><button type="button" className={mode==='create'?'active':''} onClick={()=>setMode('create')}>Create</button><button type="button" className={mode==='join'?'active':''} onClick={()=>setMode('join')}>Join</button></div>{mode==='create'?<label>SERVER NAME<input autoFocus value={name} onChange={e=>setName(e.target.value)} maxLength={32}/></label>:<label>INVITE CODE<input autoFocus value={code} onChange={e=>setCode(e.target.value.toUpperCase())}/></label>}{error&&<div className="serverInlineError">{error}</div>}<button className="serverModalPrimary" disabled={busy}>{busy?'Please wait…':mode==='create'?'Create Server':'Join Server'}</button></form></div>}
export function ServerDiscovery({onJoined,onOpenServer}){const[servers,setServers]=useState([]),[q,setQ]=useState(''),[error,setError]=useState('');useEffect(()=>{const t=setTimeout(()=>api(`/api/servers/discovery?q=${encodeURIComponent(q)}`).then(d=>setServers(d.servers||[])).catch(e=>setError(e.message)),180);return()=>clearTimeout(t)},[q]);return <section className="serverDiscoveryPage"><header><div className="discoveryTitle"><Compass/><div><strong>Server Discovery</strong><span>Find public communities</span></div></div><label><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search servers"/></label></header><div className="discoveryGrid">{servers.map(s=><article className="discoveryCard" key={s.id}><ServerMark server={s} size={56}/><div className="discoveryCardBody"><strong>{s.name}</strong><p>{s.description||'A Vodkach community.'}</p><span><Users size={14}/>{s.member_count||0} members</span></div><button onClick={async()=>{if(s.joined)return onOpenServer?.(s);try{const d=await api('/api/servers/join',{method:'POST',body:JSON.stringify({server_id:s.id})});onJoined?.(d.server);onOpenServer?.(d.server)}catch(e){setError(e.message)}}}>{s.joined?'Open':'Join'}</button></article>)}</div>{error&&<div className="serverInlineError">{error}</div>}</section>}
const PERMS=['view_channels','send_messages','manage_messages','manage_channels','manage_roles','kick_members','ban_members','timeout_members','mention_everyone','connect_voice','speak','mute_members'];
function SettingsModal({server,members,channels,onClose,onUpdated,onRemoved,reloadChannels,reloadMembers}){const[tab,setTab]=useState('overview'),[form,setForm]=useState({...server,banner_data:server.banner_data||null}),[roles,setRoles]=useState([]),[assignments,setAssignments]=useState([]),[invites,setInvites]=useState([]),[bans,setBans]=useState([]),[timeouts,setTimeouts]=useState([]),[error,setError]=useState(''),[editChannel,setEditChannel]=useState(null);const owner=server.role==='owner',manage=['owner','admin'].includes(server.role);async function loadRoles(){const d=await api(`/api/servers/roles?server_id=${server.id}`);setRoles(d.roles||[]);setAssignments(d.assignments||[])}async function loadInvites(){setInvites((await api(`/api/servers/invites?server_id=${server.id}`)).invites||[])}async function loadBans(){setBans((await api(`/api/servers/members?server_id=${server.id}&mode=bans`)).bans||[])}async function loadTimeouts(){setTimeouts((await api(`/api/servers/moderation?server_id=${server.id}`)).timeouts||[])}useEffect(()=>{if(tab==='roles'||tab==='members')loadRoles();if(tab==='invites')loadInvites();if(tab==='bans')loadBans();if(tab==='moderation')loadTimeouts()},[tab]);async function save(){try{const d=await api('/api/servers/settings',{method:'PATCH',body:JSON.stringify({server_id:server.id,...form})});onUpdated?.({...server,...d.server})}catch(e){setError(e.message)}}async function choose(e,kind){try{const f=e.target.files?.[0],data=await imageData(f,kind==='banner'?{w:1200,h:400,quality:.78,label:'Server banner'}:{w:256,h:256,label:'Server icon'});setForm(x=>({...x,[kind==='banner'?'banner_data':'icon_data']:data}))}catch(x){setError(x.message)}e.target.value=''}async function moderate(m,action){const reason=prompt(`${action} reason:`,'')??'';let minutes;if(action==='timeout')minutes=Number(prompt('Timeout minutes:','10'));try{await api('/api/servers/moderation',{method:'POST',body:JSON.stringify({server_id:server.id,user_id:m.id,action,reason,minutes})});reloadMembers?.();loadTimeouts()}catch(e){setError(e.message)}}const tabs=[['overview','Overview'],['roles','Roles'],['channels','Channels'],['invites','Invites'],['members','Members'],['moderation','Moderation'],['bans','Bans']];return createPortal(<div className="serverSettingsBackdrop" role="dialog" aria-modal="true"><div className="serverSettingsModal pro"><aside><div className="serverSettingsIdentity"><ServerMark server={form} size={46}/><div><strong>{server.name}</strong><span>Server Settings</span></div></div>{tabs.map(([k,n])=><button className={tab===k?'active':''} onClick={()=>setTab(k)} key={k}>{n}</button>)}<button className="danger" onClick={async()=>{const confirmName=owner?prompt(`Type ${server.name} to delete`):'';if(owner&&confirmName!==server.name)return;await api('/api/servers/settings',{method:'DELETE',body:JSON.stringify({server_id:server.id,confirm_name:confirmName})});onRemoved?.(server.id);onClose()}}>{owner?'Delete Server':'Leave Server'}</button></aside><main><button className="serverSettingsClose" onClick={onClose}><X/></button>{tab==='overview'&&<section><h2>Server Overview</h2><div className="serverBannerEditor" style={form.banner_data?{backgroundImage:`url(${form.banner_data})`}:{}}><div><label className="serverUploadButton"><UiIcon name="edit"/>Edit Banner<input type="file" accept="image/*" onChange={e=>choose(e,'banner')}/></label>{form.banner_data&&<button onClick={()=>setForm(x=>({...x,banner_data:null}))}>Clear</button>}</div></div><div className="serverIdentityEditor"><ServerMark server={form} size={86}/><div><label className="serverUploadButton"><UiIcon name="edit"/>Edit Icon<input type="file" accept="image/*" onChange={e=>choose(e,'icon')}/></label>{form.icon_data&&<button onClick={()=>setForm(x=>({...x,icon_data:null}))}>Clear</button>}</div></div><label>SERVER NAME<input value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>DESCRIPTION<textarea value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/></label><label className="serverCheck"><input type="checkbox" checked={!!form.is_public} onChange={e=>setForm({...form,is_public:e.target.checked})}/>Show in Discovery</label><button className="serverPrimaryAction" onClick={save}><Save size={16}/>Save Changes</button></section>}{tab==='roles'&&<section><div className="serverSettingsSectionTitle"><div><h2>Roles</h2><p>Drag-style ordering, colors and granular permissions.</p></div><button onClick={async()=>{await api('/api/servers/roles',{method:'POST',body:JSON.stringify({server_id:server.id,name:'New Role'})});loadRoles()}}><Plus/>Create Role</button></div><div className="roleManager">{roles.map((r,i)=><div className="roleCard" key={r.id}><GripVertical/><input className="roleColor" type="color" value={r.color} disabled={r.managed} onChange={async e=>{await api('/api/servers/roles',{method:'PATCH',body:JSON.stringify({role_id:r.id,color:e.target.value})});loadRoles()}}/><input value={r.name} disabled={r.managed} onChange={e=>setRoles(a=>a.map(x=>x.id===r.id?{...x,name:e.target.value}:x))}/><div className="roleActions">{!r.managed&&<><button title="Move up" onClick={async()=>{await api('/api/servers/roles',{method:'PATCH',body:JSON.stringify({role_id:r.id,position:(r.position||0)+1})});loadRoles()}}><ChevronUp size={15}/></button><button onClick={async()=>{await api('/api/servers/roles',{method:'PATCH',body:JSON.stringify({role_id:r.id,name:r.name,position:r.position})});loadRoles()}}><Save size={15}/></button><button className="danger" onClick={async()=>{await api('/api/servers/roles',{method:'DELETE',body:JSON.stringify({role_id:r.id})});loadRoles()}}><UiIcon name="trash"/></button></>}</div><div className="permissionGrid">{PERMS.map(p=><label key={p}><input type="checkbox" checked={!!r.permissions?.[p]} disabled={r.managed} onChange={async e=>{const permissions={...r.permissions,[p]:e.target.checked};await api('/api/servers/roles',{method:'PATCH',body:JSON.stringify({role_id:r.id,permissions})});loadRoles()}}/>{p.replaceAll('_',' ')}</label>)}</div></div>)}</div></section>}{tab==='channels'&&<section><h2>Channels</h2><div className="channelSettingsList">{channels.map(c=><div key={c.id}><span>{c.type==='voice'?<Volume2/>:<Hash/>}</span><div><strong>{c.name}</strong><small>{c.topic||`${c.type} channel`}</small></div><button onClick={()=>setEditChannel({...c})}><Settings size={16}/></button></div>)}</div>{editChannel&&<div className="channelEditor"><h3>Edit #{editChannel.name}</h3><label>NAME<input value={editChannel.name} onChange={e=>setEditChannel({...editChannel,name:e.target.value})}/></label><label>TYPE<select value={editChannel.type||'text'} onChange={e=>setEditChannel({...editChannel,type:e.target.value})}><option value="text">Text</option><option value="voice">Voice</option></select></label><label>TOPIC<input value={editChannel.topic||''} onChange={e=>setEditChannel({...editChannel,topic:e.target.value})}/></label>{editChannel.type==='voice'&&<><label>BITRATE<input type="range" min="8000" max="128000" step="8000" value={editChannel.bitrate||64000} onChange={e=>setEditChannel({...editChannel,bitrate:Number(e.target.value)})}/><span>{Math.round((editChannel.bitrate||64000)/1000)} kbps</span></label><label>USER LIMIT<input type="number" min="0" max="99" value={editChannel.user_limit||0} onChange={e=>setEditChannel({...editChannel,user_limit:Number(e.target.value)})}/></label></>}<div className="permissionGrid">{['view_channel','send_messages','connect','speak'].map(p=><label key={p}><input type="checkbox" checked={editChannel.permissions?.[p]!==false} onChange={e=>setEditChannel({...editChannel,permissions:{...(editChannel.permissions||{}),[p]:e.target.checked}})}/>{p.replaceAll('_',' ')}</label>)}</div><button className="serverPrimaryAction" onClick={async()=>{await api('/api/servers/channels',{method:'PATCH',body:JSON.stringify({channel_id:editChannel.id,...editChannel})});setEditChannel(null);reloadChannels?.()}}>Save Channel</button></div>}</section>}{tab==='invites'&&<section><div className="serverSettingsSectionTitle"><h2>Invites</h2><button onClick={async()=>{await api('/api/servers/invites',{method:'POST',body:JSON.stringify({server_id:server.id,expires_hours:168})});loadInvites()}}><Plus/>Create Invite</button></div><div className="inviteList">{invites.map(i=><div key={i.id}><code>{i.code}</code><span>{i.uses}{i.max_uses?` / ${i.max_uses}`:''} uses</span><button onClick={()=>navigator.clipboard.writeText(`${location.origin}/?invite=${i.code}`)}><Copy/></button></div>)}</div></section>}{tab==='members'&&<section><h2>Members</h2><div className="serverSettingsMembers expanded">{members.map(m=><div key={m.id}><img src={m.avatar_url||'/default-avatar.png'}/><div><strong>{m.display_name||m.username}</strong><span>@{m.username}</span></div><em>{m.role}</em>{manage&&m.role!=='owner'&&<div className="memberRoleChips">{roles.filter(r=>!r.managed).map(r=>{const assigned=assignments.some(a=>a.user_id===m.id&&a.role_id===r.id);return <button key={r.id} className={assigned?'active':''} style={{'--role-color':r.color}} onClick={async()=>{await api('/api/servers/roles',{method:assigned?'DELETE':'POST',body:JSON.stringify({server_id:server.id,assign_user_id:m.id,role_id:r.id})});loadRoles()}}>{r.name}</button>})}</div>}{manage&&m.role!=='owner'&&<><button onClick={()=>moderate(m,'timeout')}><Clock3/></button><button onClick={()=>moderate(m,'kick')}><UserMinus/></button><button className="danger" onClick={()=>moderate(m,'ban')}><Ban/></button></>}</div>)}</div></section>}{tab==='moderation'&&<section><h2>Moderation</h2><label>VERIFICATION<select value={form.verification_level||0} onChange={e=>setForm({...form,verification_level:Number(e.target.value)})}><option value="0">None</option><option value="1">Verified accounts</option><option value="2">Established accounts</option></select></label><label>SERVER RULES<textarea value={form.rules_text||''} onChange={e=>setForm({...form,rules_text:e.target.value})}/></label><button className="serverPrimaryAction" onClick={save}>Save Moderation</button><h3>Active Timeouts</h3>{timeouts.map(t=><div className="moderationRow" key={t.user_id}><span>{t.display_name||t.username}</span><small>until {new Date(t.expires_at).toLocaleString()}</small><button onClick={()=>moderate({id:t.user_id,display_name:t.display_name},'remove-timeout')}>Remove</button></div>)}</section>}{tab==='bans'&&<section><h2>Bans</h2>{bans.map(b=><div className="moderationRow" key={b.user_id}><span>{b.display_name||b.username}</span><small>{b.reason||'No reason'}</small><button onClick={async()=>{await api('/api/servers/members',{method:'POST',body:JSON.stringify({server_id:server.id,user_id:b.user_id})});loadBans()}}>Unban</button></div>)}</section>}{error&&<div className="serverInlineError">{error}</div>}</main></div></div>,document.body)}
function renderMentions(text,members){const map=new Map(members.map(m=>[m.username.toLowerCase(),m.display_name||m.username]));return String(text||'').split(/(@[A-Za-z0-9_.]{1,16}|@everyone)/g).map((p,i)=>p.startsWith('@')?<mark className="serverMention" key={i}>{p==='@everyone'?'@everyone':`@${map.get(p.slice(1).toLowerCase())||p.slice(1)}`}</mark>:<NotoEmojiText key={i} text={p}/>)}
function normalizeGifItems(payload) {
  const candidates = [
    payload?.items,
    payload?.data?.data,
    payload?.data?.results,
    payload?.data?.gifs,
    payload?.data,
    payload?.results,
    payload?.gifs,
    payload
  ];
  const raw = candidates.find(Array.isArray) || [];
  return raw.map((item, index) => {
    const file = item?.file || {};
    const media = item?.media_formats || {};
    const images = item?.images || {};
    const url = file?.hd?.gif?.url || file?.md?.gif?.url || media?.gif?.url || images?.original?.url || item?.url || "";
    const preview = file?.sm?.gif?.url || file?.xs?.gif?.url || media?.tinygif?.url || images?.fixed_width?.url || url;
    return { id: item?.id || item?.slug || `${index}-${url}`, url, preview };
  }).filter((item) => item.url);
}

export function GifPicker({ onPick, onClose }) {
  const categories = [
    ["Trending", ""],
    ["Reactions", "reaction"],
    ["Memes", "meme"],
    ["Gaming", "gaming"],
    ["Anime", "anime"],
    ["Animals", "animals"],
    ["Sports", "sports"],
    ["Movies", "movies"],
    ["TV", "television"],
    ["Music", "music"],
    ["Love", "love"],
    ["Happy", "happy"],
    ["Sad", "sad"],
    ["Celebration", "celebration"],
    ["WTF", "what"]
  ];
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Trending");
  const [items, setItems] = useState([]);
  const [next, setNext] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const panelRef = useRef(null);
  const bodyRef = useRef(null);
  const categoryRef = useRef(null);
  const requestIdRef = useRef(0);

  const effectiveQuery = query.trim() || categories.find(([name]) => name === category)?.[1] || "";

  useEffect(() => {
    const close = (event) => {
      if (event.target?.closest?.(".gifButton, .dmGifButton")) return;
      if (!panelRef.current?.contains(event.target)) onClose?.();
    };
    const escape = (event) => { if (event.key === "Escape") onClose?.(); };
    const timer = window.setTimeout(() => document.addEventListener("pointerdown", close), 0);
    document.addEventListener("keydown", escape);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [onClose]);

  async function loadPage({ append = false, cursor = null } = {}) {
    const requestId = ++requestIdRef.current;
    append ? setLoadingMore(true) : setLoading(true);
    if (!append) setError("");
    try {
      const params = new URLSearchParams();
      if (effectiveQuery) params.set("q", effectiveQuery);
      if (cursor) params.set("pos", cursor);
      const data = await api(`/api/gifs?${params.toString()}`);
      if (requestId !== requestIdRef.current) return;
      const page = normalizeGifItems(data);
      setItems((current) => append ? [...current, ...page.filter((gif) => !current.some((old) => old.id === gif.id))] : page);
      setNext(data.next || null);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setError(requestError.message || "Could not load GIFs");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => loadPage({ append: false }), query.trim() ? 280 : 80);
    return () => window.clearTimeout(timer);
  }, [effectiveQuery]);

  function onScroll(event) {
    const node = event.currentTarget;
    if (!next || loading || loadingMore) return;
    if (node.scrollHeight - node.scrollTop - node.clientHeight < 180) loadPage({ append: true, cursor: next });
  }

  function onCategoryWheel(event) {
    const node = categoryRef.current;
    if (!node || node.scrollWidth <= node.clientWidth) return;
    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (!delta) return;
    event.preventDefault();
    event.stopPropagation();
    node.scrollBy({ left: delta, behavior: "auto" });
  }

  return (
    <section className="gifPicker gifPickerPortal composerPopover" ref={panelRef} role="dialog" aria-label="GIF picker">
      <header className="composerPopoverHeader gifPickerHeader">
        <div>
          <span className="composerPopoverEyebrow"><UiIcon name="gif" />GIFs</span>
          <strong>Find the perfect GIF</strong>
        </div>
        <button type="button" className="composerPopoverClose" onClick={onClose} aria-label="Close GIF picker"><X size={18} /></button>
      </header>
      <div className="gifSearchField">
        <Search size={17} />
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search KLIPY" />
      </div>
      <nav className="gifCategoryTabs" ref={categoryRef} onWheel={onCategoryWheel} aria-label="GIF categories">
        {categories.map(([name]) => <button type="button" key={name} className={category === name && !query.trim() ? "active" : ""} onClick={() => { setCategory(name); setQuery(""); }}>{name}</button>)}
      </nav>
      <div className="gifPickerBody" ref={bodyRef} onScroll={onScroll}>
        {loading ? <div className="gifPickerState">Loading GIFs…</div> : null}
        {!loading && error ? <div className="gifPickerState error">{error}</div> : null}
        {!loading && !error && !items.length ? <div className="gifPickerState">No GIFs found</div> : null}
        <div className="gifGrid">
          {items.map((gif) => (
            <button type="button" key={gif.id} onClick={() => onPick?.(gif.url)} title={gif.description || "GIF"}>
              <img src={gif.preview} alt={gif.description || "GIF"} loading="lazy" />
            </button>
          ))}
        </div>
        {loadingMore ? <div className="gifLoadMore">Loading more…</div> : null}
      </div>
    </section>
  );
}

function ServerPollCard({ poll, onChanged, currentUser }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const totalVotes = poll.options.reduce((sum, option) => sum + Number(option.vote_count || 0), 0);
  const voted = poll.options.some((option) => option.selected);
  const closed = Boolean(poll.closed_at) || (poll.closes_at && Date.parse(poll.closes_at) <= Date.now());
  const showResults = !poll.hide_results_until_vote || voted || closed;

  async function vote(optionId) {
    if (closed || busy) return;
    setBusy(true); setError("");
    try {
      const data = await api("/api/servers/polls", { method: "PATCH", body: JSON.stringify({ poll_id: poll.id, option_id: optionId }) });
      onChanged?.(data.poll);
    } catch (e) { setError(e.message || "Could not vote"); } finally { setBusy(false); }
  }

  return (
    <article className="serverPollCard timelinePoll">
      <header>
        <img src={poll.creator?.avatar_url || "/default-avatar.png"} alt="" />
        <div><strong>{poll.creator?.display_name || poll.creator?.username}</strong><span>Poll</span></div>
      </header>
      <h3>{poll.question}</h3>
      <div className="serverPollOptions">
        {poll.options.map((option) => {
          const percentage = totalVotes ? Math.round((Number(option.vote_count || 0) / totalVotes) * 100) : 0;
          return (
            <button type="button" className={option.selected ? "selected" : ""} key={option.id} onClick={() => vote(option.id)} disabled={closed || busy}>
              <span className="serverPollFill" style={{ width: showResults ? `${percentage}%` : "0%" }} />
              <span className="serverPollOptionText"><i>{option.selected ? "✓" : ""}</i>{option.option_text}</span>
              {showResults ? <b>{percentage}%</b> : null}
            </button>
          );
        })}
      </div>
      <footer>
        <span>{totalVotes} vote{totalVotes === 1 ? "" : "s"}{closed ? " · Closed" : ""}</span>
        {poll.creator_user_id === currentUser?.id && !closed ? (
          <button type="button" onClick={async () => {
            if (busy) return; setBusy(true); setError("");
            try { const data = await api("/api/servers/polls", { method: "PATCH", body: JSON.stringify({ poll_id: poll.id, action: "close" }) }); onChanged?.(data.poll); } catch (e) { setError(e.message || "Could not close poll"); } finally { setBusy(false); }
          }}>Close poll</button>
        ) : null}
      </footer>
      {error ? <div className="pollActionError">{error}</div> : null}
    </article>
  );
}

function ServerPollSystem({ channelId, onCreated, open, onOpenChange }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [hideResults, setHideResults] = useState(false);
  const [duration, setDuration] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pollPanelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const closeOutside = (event) => {
      if (event.target?.closest?.(".composerPollButton")) return;
      if (!pollPanelRef.current?.contains(event.target)) onOpenChange?.(false);
    };
    const closeEscape = (event) => {
      if (event.key === "Escape") onOpenChange?.(false);
    };
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", closeOutside);
    }, 0);
    document.addEventListener("keydown", closeEscape);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open, onOpenChange]);

  async function submit(event) {
    event?.preventDefault?.();
    const cleanOptions = options.map((value) => value.trim()).filter(Boolean);
    if (!question.trim() || cleanOptions.length < 2) { setError("Add a question and at least two options."); return; }
    setBusy(true); setError("");
    try {
      await api("/api/servers/polls", {
        method: "POST",
        body: JSON.stringify({ channel_id: channelId, question: question.trim(), options: cleanOptions, allow_multiple: allowMultiple, anonymous, hide_results_until_vote: hideResults, duration_minutes: Number(duration || 0) })
      });
      onOpenChange?.(false); setQuestion(""); setOptions(["", ""]); setDuration("0");
      onCreated?.();
    } catch (submitError) { setError(submitError.message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <button type="button" className="composerPollButton" onClick={() => onOpenChange?.(!open)} aria-label="Create poll" title="Create poll"><img className="composerActionIcon" src="/ui/poll.svg" alt="" /></button>
      {open ? (
        <div ref={pollPanelRef} className="pollCreatePopover pollCreateModal serverPollCreateModal" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><span className="chatPollEyebrow"><BarChart3 size={17} />Create Poll</span><h2>Ask the channel</h2></div><button type="button" className="composerPopoverClose" onClick={() => onOpenChange?.(false)} aria-label="Close poll creator"><X size={18} /></button></header>
            <div className="pollCreateBody">
            <label><span>Question</span><input autoFocus value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={300} /></label>
            <div className="serverPollOptionInputs">
              {options.map((option, index) => <label key={index}><span>Option {index + 1}</span><input value={option} onChange={(event) => setOptions((values) => values.map((value, optionIndex) => optionIndex === index ? event.target.value : value))} maxLength={120} /></label>)}
            </div>
            {options.length < 10 ? <button type="button" className="serverAddPollOption" onClick={() => setOptions((values) => [...values, ""])}><Plus size={15} />Add option</button> : null}
            <div className="serverPollToggles">
              <label><input type="checkbox" checked={allowMultiple} onChange={(event) => setAllowMultiple(event.target.checked)} />Multiple choice</label>
              <label><input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} />Anonymous</label>
              <label><input type="checkbox" checked={hideResults} onChange={(event) => setHideResults(event.target.checked)} />Hide results until vote</label>
            </div>
            <label><span>Duration</span><select value={duration} onChange={(event) => setDuration(event.target.value)}><option value="0">No time limit</option><option value="5">5 minutes</option><option value="60">1 hour</option><option value="1440">1 day</option><option value="10080">7 days</option></select></label>
            {error ? <div className="serverInlineError">{error}</div> : null}
            </div>
            <footer><button type="button" onClick={() => onOpenChange?.(false)}>Cancel</button><button type="button" disabled={busy} onClick={submit}>{busy ? "Creating…" : "Create Poll"}</button></footer>
        </div>
      ) : null}
    </>
  );
}

export function ServerWorkspace({ server, currentUser, onServerUpdated, onServerRemoved, profileBar = null }) {
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [polls, setPolls] = useState([]);
  const [members, setMembers] = useState([]);
  const [text, setText] = useState("");
  const [newChannel, setNewChannel] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelType, setChannelType] = useState("text");
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [composerPanel, setComposerPanel] = useState(null);
  const [voiceJoined, setVoiceJoined] = useState(null);
  const endRef = useRef(null);

  async function loadChannels() {
    const data = await api(`/api/servers/channels?server_id=${server.id}`);
    const nextChannels = data.channels || [];
    setChannels(nextChannels);
    setActiveChannel((current) => current && nextChannels.some((channel) => channel.id === current.id) ? current : nextChannels.find((channel) => channel.type === "text") || nextChannels[0] || null);
  }
  async function loadMembers() { setMembers((await api(`/api/servers/members?server_id=${server.id}`)).members || []); }
  async function loadMessages(channel = activeChannel) {
    if (!channel?.id || channel.type === "voice") { setMessages([]); return; }
    setMessages((await api(`/api/servers/messages?channel_id=${channel.id}`)).messages || []);
  }
  async function loadPolls(channel = activeChannel) {
    if (!channel?.id || channel.type === "voice") { setPolls([]); return; }
    setPolls((await api(`/api/servers/polls?channel_id=${channel.id}`)).polls || []);
  }
  async function refreshTimeline(channel = activeChannel) {
    await Promise.all([loadMessages(channel), loadPolls(channel)]);
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: "end" }));
  }

  useEffect(() => { Promise.all([loadChannels(), loadMembers()]).catch((requestError) => setError(requestError.message)); }, [server.id]);
  useEffect(() => { refreshTimeline().catch((requestError) => setError(requestError.message)); }, [activeChannel?.id]);
  useEffect(() => {
    const handler = (event) => {
      const payload = event.detail || {};
      if (payload.type === "server.changed" && (!payload.serverId || payload.serverId === server.id)) {
        loadChannels(); loadMembers();
        if (!payload.channelId || payload.channelId === activeChannel?.id) refreshTimeline();
      }
    };
    window.addEventListener("vodkach:realtime", handler);
    return () => window.removeEventListener("vodkach:realtime", handler);
  }, [server.id, activeChannel?.id]);

  async function send(event, gifUrl = null) {
    event?.preventDefault();
    const body = text.trim();
    if ((!body && !gifUrl) || !activeChannel) return;
    setText("");
    try {
      const data = await api("/api/servers/messages", { method: "POST", body: JSON.stringify({ channel_id: activeChannel.id, body, gif_url: gifUrl }) });
      setMessages((items) => items.some((item) => item.id === data.message.id) ? items : [...items, data.message]);
      setGifOpen(false);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: "end" }));
    } catch (sendError) { setText(body); setError(sendError.message); }
  }

  const onlineMembers = useMemo(() => members.filter(online), [members]);
  const offlineMembers = useMemo(() => members.filter((member) => !online(member)), [members]);
  const timeline = useMemo(() => [
    ...messages.map((message) => ({ type: "message", created_at: message.created_at, value: message })),
    ...polls.map((poll) => ({ type: "poll", created_at: poll.created_at, value: poll }))
  ].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)), [messages, polls]);

  return (
    <div className="serverWorkspace serverWorkspacePro">
      {server.banner_data ? <div className="serverWorkspaceBanner" style={{ backgroundImage: `url(${server.banner_data})` }} /> : null}
      <aside className="serverChannelRail">
        <header><div><strong>{server.name}</strong><span>{server.description || `${members.length} members`}</span></div><button type="button" onClick={() => setSettingsOpen(true)}><Settings /></button></header>
        <div className="serverChannelHeading"><span>TEXT CHANNELS</span>{["owner", "admin"].includes(server.role) ? <button type="button" onClick={() => { setNewChannel(true); setChannelType("text"); }}><Plus /></button> : null}</div>
        <nav>{channels.filter((channel) => channel.type !== "voice").map((channel) => <button type="button" className={activeChannel?.id === channel.id ? "active" : ""} onClick={() => setActiveChannel(channel)} key={channel.id}><Hash /><span>{channel.name}</span></button>)}</nav>
        <div className="serverChannelHeading"><span>VOICE CHANNELS</span>{["owner", "admin"].includes(server.role) ? <button type="button" onClick={() => { setNewChannel(true); setChannelType("voice"); }}><Plus /></button> : null}</div>
        <nav>{channels.filter((channel) => channel.type === "voice").map((channel) => <button type="button" className={activeChannel?.id === channel.id ? "active" : ""} onClick={() => setActiveChannel(channel)} key={channel.id}><Volume2 /><span>{channel.name}</span></button>)}</nav>
        {newChannel ? <form className="serverNewChannel" onSubmit={async (event) => { event.preventDefault(); const data = await api("/api/servers/channels", { method: "POST", body: JSON.stringify({ server_id: server.id, name: channelName, type: channelType }) }); setNewChannel(false); setChannelName(""); await loadChannels(); setActiveChannel(data.channel); }}><input autoFocus value={channelName} onChange={(event) => setChannelName(event.target.value)} placeholder={`${channelType} channel`} /><button>+</button></form> : null}
        {profileBar || <div className="serverUserBar"><img src={currentUser?.avatar_url || "/default-avatar.png"} alt="" /><div><strong>{currentUser?.display_name || currentUser?.username}</strong><span>@{currentUser?.username}</span></div></div>}
      </aside>

      <section className="serverChatPane">
        <header className="serverChatHeader">{activeChannel?.type === "voice" ? <Volume2 /> : <Hash />}<div><strong>{activeChannel?.name || "channel"}</strong><span>{activeChannel?.topic || `${activeChannel?.type || "text"} channel`}</span></div></header>
        {activeChannel?.type === "voice" ? (
          <div className="voiceChannelStage"><Volume2 size={44} /><h2>{activeChannel.name}</h2><p>{activeChannel.bitrate / 1000 || 64} kbps · {activeChannel.user_limit || "Unlimited"} users</p><button className={voiceJoined === activeChannel.id ? "danger" : ""} onClick={() => setVoiceJoined(voiceJoined === activeChannel.id ? null : activeChannel.id)}>{voiceJoined === activeChannel.id ? "Disconnect" : "Join Voice"}</button></div>
        ) : (
          <>
            <div className="serverMessageList">
              {timeline.map((item) => item.type === "poll" ? (
                <ServerPollCard key={item.value.id} poll={item.value} currentUser={currentUser} onChanged={(updated) => updated ? setPolls((list) => list.map((entry) => entry.id === updated.id ? updated : entry)) : loadPolls()} />
              ) : (
                <article className="serverMessage" key={item.value.id}><img src={item.value.sender?.avatar_url || "/default-avatar.png"} alt="" /><div><div><strong>{item.value.sender?.display_name || item.value.sender?.username}</strong><time>{new Date(item.value.created_at).toLocaleString()}</time></div>{item.value.body ? <p>{renderMentions(item.value.body, members)}</p> : null}{item.value.gif_url ? <div className="serverGifMessage"><img src={item.value.gif_url} alt="GIF" /></div> : null}</div></article>
              ))}
              <div ref={endRef} />
            </div>
            <form className="messageComposer composerForm serverMessageComposer" onSubmit={send}>
              <div className="composerInputRow">
                <div className="composerTextField">
                  <div className={`composerTextOverlay ${text ? "" : "placeholder"}`} aria-hidden="true">
                    {text ? <NotoEmojiText text={text} /> : `Message #${activeChannel?.name || "channel"}`}
                  </div>
                  <textarea rows={1} value={text} onChange={(event) => setText(expandEmojiShortcodes(event.target.value))} placeholder="" aria-label={`Message #${activeChannel?.name || "channel"}`} />
                </div>
                <div className="composerActions">
                  <button type="button" className="composerIconButton emojiButton" onClick={() => setComposerPanel((value) => value === "emoji" ? null : "emoji")} aria-label="Open emoji picker" title="Emoji"><img className="composerActionIcon" src="/ui/emojis.svg" alt="" /></button>
                  <button type="button" className="gifButton dmGifButton" onClick={() => setComposerPanel((value) => value === "gif" ? null : "gif")} aria-label="Open GIF picker" title="GIF"><img className="composerActionIcon" src="/ui/gif.svg" alt="" /></button>
                  <ServerPollSystem channelId={activeChannel?.id} onCreated={() => loadPolls()} open={composerPanel === "poll"} onOpenChange={(open) => setComposerPanel(open ? "poll" : null)} />
                  <button type="submit" disabled={!text.trim()}>Send</button>
                </div>
              </div>
              {composerPanel === "emoji" ? <EmojiPicker onClose={() => setComposerPanel(null)} onPick={(emoji) => setText((value) => `${value}${emoji}`)} /> : null}
              {composerPanel === "gif" ? <GifPicker onClose={() => setComposerPanel(null)} onPick={(url) => { setComposerPanel(null); send(null, url); }} /> : null}
            </form>
          </>
        )}
        {error ? <div className="serverInlineError">{error}</div> : null}
      </section>

      <aside className="serverMemberRail">
        <div className="serverMemberGroup"><strong>ONLINE — {onlineMembers.length}</strong>{onlineMembers.map((member) => <div className="serverMember" key={member.id}><span className="serverMemberAvatar"><img src={member.avatar_url || "/default-avatar.png"} alt="" /><i /></span><div><b>{member.display_name || member.username}</b><span>@{member.username}</span></div></div>)}</div>
        <div className="serverMemberGroup offline"><strong>OFFLINE — {offlineMembers.length}</strong>{offlineMembers.map((member) => <div className="serverMember" key={member.id}><span className="serverMemberAvatar"><img src={member.avatar_url || "/default-avatar.png"} alt="" /></span><div><b>{member.display_name || member.username}</b><span>@{member.username}</span></div></div>)}</div>
      </aside>
      {settingsOpen ? <SettingsModal server={server} members={members} channels={channels} onClose={() => setSettingsOpen(false)} onUpdated={onServerUpdated} onRemoved={onServerRemoved} reloadChannels={loadChannels} reloadMembers={loadMembers} /> : null}
    </div>
  );
}

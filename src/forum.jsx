import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  LogOut,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  X
} from "lucide-react";
import "./forum.css";

async function forumApi(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function displayName(user) {
  return user?.display_name || user?.username || user?.email?.split("@")[0] || "User";
}

function initials(value) {
  return String(value || "V").trim().slice(0, 1).toUpperCase() || "V";
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value.endsWith?.("Z") || value.includes?.("+") ? value : `${value.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return value;

  const diff = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function Avatar({ user, size = 34 }) {
  const name = displayName(user);
  if (user?.avatar_url) {
    return <img className="forumAvatar" src={user.avatar_url} alt="" style={{ width: size, height: size }} />;
  }
  return <span className="forumAvatar forumAvatarFallback" style={{ width: size, height: size }}>{initials(name)}</span>;
}

function ForumLogin() {
  return (
    <main className="forumGate">
      <section className="forumGateCard">
        <div className="forumWordmark">VODKACH</div>
        <h1>Forum</h1>
        <p>A simple place for discussions, questions and long-form threads.</p>
        <a className="forumPrimaryButton" href="/api/auth/google/start?return_to=/">Sign in with Google</a>
      </section>
    </main>
  );
}

function ForumPending({ user }) {
  return (
    <main className="forumGate">
      <section className="forumGateCard">
        <div className="forumWordmark">VODKACH</div>
        <h1>Access pending</h1>
        <p>{displayName(user)}, your account still needs approval before you can use the forum.</p>
        <button className="forumSecondaryButton" onClick={() => location.reload()}>Refresh</button>
      </section>
    </main>
  );
}

function NewThreadForm({ onCancel, onCreated }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (!title.trim() || !body.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await forumApi("/api/forum/threads", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), body: body.trim() })
      });
      onCreated(data.thread);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="forumComposerCard" onSubmit={submit}>
      <div className="forumSectionHeader">
        <div>
          <span className="forumKicker">NEW THREAD</span>
          <h2>Create a discussion</h2>
        </div>
        <button type="button" className="forumIconButton" onClick={onCancel} aria-label="Close"><X size={18} /></button>
      </div>
      <label className="forumField">
        <span>Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="Thread title" autoFocus />
      </label>
      <label className="forumField">
        <span>Post</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={12000} rows={8} placeholder="Write your post..." />
      </label>
      {error ? <div className="forumError">{error}</div> : null}
      <div className="forumComposerActions">
        <button type="button" className="forumSecondaryButton" onClick={onCancel}>Cancel</button>
        <button type="submit" className="forumPrimaryButton" disabled={busy || !title.trim() || !body.trim()}>{busy ? "Posting..." : "Post thread"}</button>
      </div>
    </form>
  );
}

function ThreadRow({ thread, onOpen }) {
  return (
    <button className="forumThreadRow" type="button" onClick={() => onOpen(thread.id)}>
      <div className="forumThreadMain">
        <div className="forumThreadTitleLine">
          {thread.is_pinned ? <span className="forumTag">PINNED</span> : null}
          <h3>{thread.title}</h3>
        </div>
        <p>{thread.body_preview}</p>
        <div className="forumThreadMeta">
          <Avatar user={thread.author} size={22} />
          <span>{displayName(thread.author)}</span>
          <span className="forumMetaDot">•</span>
          <span>{formatTime(thread.created_at)}</span>
        </div>
      </div>
      <div className="forumThreadStats">
        <strong>{thread.reply_count}</strong>
        <span>{thread.reply_count === 1 ? "reply" : "replies"}</span>
        <small>active {formatTime(thread.last_activity_at)}</small>
      </div>
      <ChevronRight className="forumThreadArrow" size={18} />
    </button>
  );
}

function ForumHome({ user, onOpenThread }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("active");
  const [newThread, setNewThread] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      params.set("sort", sort);
      const data = await forumApi(`/api/forum/threads?${params}`);
      setThreads(data.threads || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(load, query ? 220 : 0);
    return () => clearTimeout(timer);
  }, [query, sort]);

  return (
    <div className="forumPageGrid">
      <section className="forumMainColumn">
        <div className="forumBoardHeader">
          <div>
            <span className="forumKicker">BOARD INDEX</span>
            <h1>Forum</h1>
            <p>General discussion. Keep threads useful and readable.</p>
          </div>
          <button className="forumPrimaryButton forumNewThreadButton" onClick={() => setNewThread(true)}><Plus size={16} /> New thread</button>
        </div>

        {newThread ? (
          <NewThreadForm
            onCancel={() => setNewThread(false)}
            onCreated={(thread) => {
              setNewThread(false);
              onOpenThread(thread.id);
            }}
          />
        ) : null}

        <div className="forumToolbar">
          <label className="forumSearch">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search threads" />
          </label>
          <div className="forumSort">
            <button className={sort === "active" ? "active" : ""} onClick={() => setSort("active")}>Active</button>
            <button className={sort === "new" ? "active" : ""} onClick={() => setSort("new")}>Newest</button>
          </div>
          <button className="forumIconButton" onClick={load} aria-label="Refresh"><RefreshCw size={16} /></button>
        </div>

        {error ? <div className="forumError">{error}</div> : null}
        <div className="forumThreadList">
          {loading ? <div className="forumEmpty">Loading threads...</div> : null}
          {!loading && threads.length === 0 ? (
            <div className="forumEmpty">
              <strong>No threads yet.</strong>
              <span>Start the first discussion.</span>
            </div>
          ) : null}
          {!loading ? threads.map((thread) => <ThreadRow key={thread.id} thread={thread} onOpen={onOpenThread} />) : null}
        </div>
      </section>

      <aside className="forumSidebar">
        <section className="forumSideCard">
          <h3>About</h3>
          <p>This is the first forum version of Vodkach. One board, normal threads and replies — nothing unnecessary.</p>
        </section>
        <section className="forumSideCard">
          <h3>Posting</h3>
          <ol>
            <li>Use a clear title.</li>
            <li>Stay on topic.</li>
            <li>Do not spam duplicate threads.</li>
          </ol>
        </section>
        <section className="forumSideCard forumUserCard">
          <Avatar user={user} size={38} />
          <div><strong>{displayName(user)}</strong><span>{user.username ? `@${user.username}` : user.email}</span></div>
        </section>
      </aside>
    </div>
  );
}

function ForumPost({ post, number, isOriginal }) {
  return (
    <article className={`forumPost ${isOriginal ? "original" : ""}`}>
      <header className="forumPostHeader">
        <div className="forumPostIdentity">
          <Avatar user={post.author} size={30} />
          <div>
            <strong>{displayName(post.author)}</strong>
            <span>{post.author?.username ? `@${post.author.username}` : "member"}</span>
          </div>
        </div>
        <div className="forumPostNumber">#{number}</div>
      </header>
      <div className="forumPostBody">{post.body}</div>
      <footer className="forumPostFooter">
        <span>{formatTime(post.created_at)}</span>
        {isOriginal ? <span className="forumTag neutral">OP</span> : null}
      </footer>
    </article>
  );
}

function ThreadView({ threadId, onBack }) {
  const [thread, setThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await forumApi(`/api/forum/thread?id=${encodeURIComponent(threadId)}`);
      setThread(data.thread);
      setReplies(data.replies || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [threadId]);

  async function submitReply(event) {
    event.preventDefault();
    if (!reply.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await forumApi("/api/forum/replies", {
        method: "POST",
        body: JSON.stringify({ thread_id: threadId, body: reply.trim() })
      });
      setReply("");
      setReplies((current) => [...current, data.reply]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="forumEmpty forumThreadLoading">Loading thread...</div>;
  if (!thread) return <div className="forumEmpty"><strong>Thread not found.</strong><button className="forumSecondaryButton" onClick={onBack}>Back</button></div>;

  return (
    <div className="forumThreadPage">
      <button className="forumBackButton" onClick={onBack}><ArrowLeft size={16} /> Board index</button>
      <header className="forumThreadPageHeader">
        <div>
          <span className="forumKicker">THREAD</span>
          <h1>{thread.title}</h1>
          <p>Started by {displayName(thread.author)} · {formatTime(thread.created_at)}</p>
        </div>
        <div className="forumThreadCount"><MessageSquare size={16} /> {replies.length} replies</div>
      </header>

      <ForumPost post={thread} number={1} isOriginal />
      {replies.map((item, index) => <ForumPost key={item.id} post={item} number={index + 2} />)}

      {error ? <div className="forumError">{error}</div> : null}
      {thread.is_locked ? (
        <div className="forumEmpty">This thread is locked.</div>
      ) : (
        <form className="forumReplyBox" onSubmit={submitReply}>
          <label>
            <span>Reply to thread</span>
            <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={6} maxLength={8000} placeholder="Write a reply..." />
          </label>
          <div className="forumComposerActions">
            <span>{reply.length}/8000</span>
            <button type="submit" className="forumPrimaryButton" disabled={busy || !reply.trim()}>{busy ? "Posting..." : "Post reply"}</button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ForumApp() {
  const [auth, setAuth] = useState({ loading: true, authenticated: false, user: null });
  const [threadId, setThreadId] = useState(() => new URLSearchParams(location.search).get("thread"));

  useEffect(() => {
    forumApi("/api/auth/me")
      .then((data) => setAuth({ loading: false, authenticated: data.authenticated, user: data.user }))
      .catch(() => setAuth({ loading: false, authenticated: false, user: null }));
  }, []);

  useEffect(() => {
    const onPop = () => setThreadId(new URLSearchParams(location.search).get("thread"));
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);

  function openThread(id) {
    const url = new URL(location.href);
    url.searchParams.set("thread", id);
    history.pushState({}, "", url);
    setThreadId(id);
    scrollTo({ top: 0, behavior: "instant" });
  }

  function backToIndex() {
    const url = new URL(location.href);
    url.searchParams.delete("thread");
    history.pushState({}, "", url);
    setThreadId(null);
    scrollTo({ top: 0, behavior: "instant" });
  }

  if (auth.loading) return <main className="forumGate"><div className="forumGateCard"><div className="forumWordmark">VODKACH</div><p>Loading forum...</p></div></main>;
  if (!auth.authenticated) return <ForumLogin />;
  if (auth.user?.access_status !== "approved") return <ForumPending user={auth.user} />;

  return (
    <main className="forumShell">
      <header className="forumTopbar">
        <button className="forumBrand" onClick={backToIndex}>
          <span className="forumBrandMark">V</span>
          <span><strong>Vodkach</strong><small>Forum</small></span>
        </button>
        <nav className="forumTopNav">
          <button className="active" onClick={backToIndex}>Forum</button>
        </nav>
        <div className="forumTopUser">
          <span>{displayName(auth.user)}</span>
          <Avatar user={auth.user} size={30} />
          <button className="forumIconButton" aria-label="Log out" onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
            location.reload();
          }}><LogOut size={16} /></button>
        </div>
      </header>

      <div className="forumViewport">
        {threadId ? <ThreadView threadId={threadId} onBack={backToIndex} /> : <ForumHome user={auth.user} onOpenThread={openThread} />}
      </div>
    </main>
  );
}

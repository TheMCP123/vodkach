import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  FileText,
  Home,
  LockKeyhole,
  MessageCircle,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  UserRound
} from "lucide-react";
import "./styles.css";

const isWebApp =
  typeof window !== "undefined" && window.location.hostname.startsWith("web.");

const DEVICE_ID_KEY = "vodkach_device_id";
const PRIVATE_KEY_DB = "vodkach_crypto";
const PRIVATE_KEY_STORE = "keys";
const PRIVATE_KEY_NAME = "device_private_key";

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function createLocalDeviceId() {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const id = `web_${bytesToBase64Url(bytes)}`;
  localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

function openKeyDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PRIVATE_KEY_DB, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(PRIVATE_KEY_STORE);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getStoredPrivateKeyJwk() {
  const db = await openKeyDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(PRIVATE_KEY_STORE, "readonly");
    const store = tx.objectStore(PRIVATE_KEY_STORE);
    const request = store.get(PRIVATE_KEY_NAME);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function storePrivateKeyJwk(jwk) {
  const db = await openKeyDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(PRIVATE_KEY_STORE, "readwrite");
    const store = tx.objectStore(PRIVATE_KEY_STORE);
    const request = store.put(jwk, PRIVATE_KEY_NAME);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function getPublicJwkFromPrivateJwk(privateJwk) {
  if (!privateJwk?.x || !privateJwk?.y) {
    return null;
  }

  return {
    kty: privateJwk.kty,
    crv: privateJwk.crv,
    x: privateJwk.x,
    y: privateJwk.y,
    ext: true,
    key_ops: []
  };
}

async function ensureDeviceKeyPair() {
  const existingPrivateKey = await getStoredPrivateKeyJwk();

  if (existingPrivateKey) {
    return {
      deviceId: createLocalDeviceId(),
      privateKeyExists: true,
      publicKeyJwk: getPublicJwkFromPrivateJwk(existingPrivateKey)
    };
  }

  const pair = await crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    ["deriveKey", "deriveBits"]
  );

  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);

  await storePrivateKeyJwk(privateJwk);

  return {
    deviceId: createLocalDeviceId(),
    privateKeyExists: true,
    publicKeyJwk: publicJwk
  };
}

async function registerCurrentDevice() {
  const device = await ensureDeviceKeyPair();

  if (!device.publicKeyJwk) {
    throw new Error("Local private key exists, but public key could not be restored");
  }

  const response = await fetch("/api/device/register", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      device_id: device.deviceId,
      device_name: getBrowserDeviceName(),
      public_key: JSON.stringify(device.publicKeyJwk),
      key_algorithm: "p256-ecdh"
    })
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Device registration failed");
  }

  return data;
}

function getBrowserDeviceName() {
  const ua = navigator.userAgent || "";

  if (ua.includes("Firefox")) return "Firefox Browser";
  if (ua.includes("Edg")) return "Edge Browser";
  if (ua.includes("Chrome")) return "Chrome Browser";
  if (ua.includes("Safari")) return "Safari Browser";

  return "Web Browser";
}


function Landing() {
  return (
    <main className="landingPage">
      <header className="landingHeader">
        <a className="brand" href="/" aria-label="Vodkach home">
          <span className="brandIcon">V</span>
          <span>Vodkach</span>
        </a>

        <nav className="landingNav">
          <a href="#security">Security</a>
          <a href="#status">Status</a>
        </nav>
      </header>

      <section className="landingHero">
        <div className="landingCopy">
          <div className="pill">
            <LockKeyhole size={14} />
            Private encrypted messenger
          </div>

          <h1>Private messages. Clean interface.</h1>

          <p className="lead">
            Vodkach is a web messenger focused on encrypted direct messages,
            minimal data, and a calm interface.
          </p>

          <div className="buttons">
            <a className="primaryButton" href="https://web.vodkach.com">
              Open in Web
              <ArrowRight size={17} />
            </a>
            <button className="secondaryButton" type="button">
              Coming soon
            </button>
          </div>
        </div>

        <div className="landingPreview" aria-label="Vodkach app preview">
          <aside className="previewRail">
            <div className="previewLogo">V</div>
            <div className="previewDot" />
            <div className="previewDot muted" />
          </aside>

          <aside className="previewSidebar">
            <div className="previewTitle">Vodkach</div>
            <div className="previewChannel active">private</div>
            <div className="previewChannel">friends</div>
            <div className="previewChannel">files</div>
          </aside>

          <section className="previewChat">
            <div className="previewChatHeader">
              <span># private</span>
              <span className="previewSecure">
                <ShieldCheck size={14} />
                encrypted
              </span>
            </div>

            <div className="previewMessage">
              <div className="avatar">M</div>
              <div>
                <strong>Max</strong>
                <p>No plain text in storage.</p>
              </div>
            </div>

            <div className="previewMessage">
              <div className="avatar accent">V</div>
              <div>
                <strong>Vodkach</strong>
                <p>Encrypted payload only.</p>
              </div>
            </div>

            <div className="previewComposer">Message #private</div>
          </section>
        </div>
      </section>

      <section className="landingInfo" id="security">
        <div>
          <span className="infoLabel">Security</span>
          <h2>Designed to reduce damage from leaks.</h2>
        </div>

        <div className="infoGrid">
          <InfoItem title="Encrypted storage" text="Messages are planned to be stored as ciphertext, not readable database text." />
          <InfoItem title="Google login" text="Account identity through Google OAuth. No password database." />
          <InfoItem title="No fake recovery" text="If encryption keys are lost, old message history cannot be restored." />
        </div>
      </section>

      <footer className="landingFooter" id="status">
        <span>Vodkach</span>
        <span>Early private build</span>
      </footer>
    </main>
  );
}



function WebApp() {
  const [auth, setAuth] = useState({ loading: true, authenticated: false, user: null });
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [formError, setFormError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [deviceState, setDeviceState] = useState({ loading: false, ready: false, error: "" });

  const [view, setView] = useState("friends");
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [chatText, setChatText] = useState("");
  const [busy, setBusy] = useState(false);
  const [uiError, setUiError] = useState("");

  async function api(path, options = {}) {
    const response = await fetch(path, {
      credentials: "include",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
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

  async function loadMe() {
    const response = await fetch("/api/auth/me", { credentials: "include" });
    const data = await response.json();

    setAuth({
      loading: false,
      authenticated: Boolean(data.authenticated),
      user: data.user || null
    });

    if (data.user?.username) setUsername(data.user.username);
    if (data.user?.display_name) setDisplayName(data.user.display_name);
  }

  async function loadSocial() {
    const [friendsData, requestsData, chatsData] = await Promise.all([
      api("/api/friends"),
      api("/api/friends/requests"),
      api("/api/chats")
    ]);

    setFriends(friendsData.friends || []);
    setIncoming(requestsData.incoming || []);
    setOutgoing(requestsData.outgoing || []);
    setChats(chatsData.chats || []);

    setActiveChat((current) => {
      if (!current) return null;
      return (chatsData.chats || []).find((chat) => chat.id === current.id) || current;
    });
  }

  async function loadMessages(chat) {
    if (!chat?.id) return;
    const data = await api(`/api/messages?chat_id=${encodeURIComponent(chat.id)}&limit=100`);
    setMessages(data.messages || []);
  }

  useEffect(() => {
    loadMe().catch(() => {
      setAuth({ loading: false, authenticated: false, user: null });
    });
  }, []);

  useEffect(() => {
    const user = auth.user;
    if (
      !auth.authenticated ||
      user?.access_status !== "approved" ||
      !user?.username ||
      deviceState.ready ||
      deviceState.loading
    ) {
      return;
    }

    setDeviceState({ loading: true, ready: false, error: "" });

    registerCurrentDevice()
      .then(() => setDeviceState({ loading: false, ready: true, error: "" }))
      .catch((error) => {
        setDeviceState({
          loading: false,
          ready: false,
          error: error.message || "Device key setup failed"
        });
      });
  }, [
    auth.authenticated,
    auth.user?.access_status,
    auth.user?.username,
    deviceState.ready,
    deviceState.loading
  ]);

  useEffect(() => {
    if (
      auth.authenticated &&
      auth.user?.access_status === "approved" &&
      auth.user?.username
    ) {
      loadSocial().catch((error) => setUiError(error.message));
    }
  }, [auth.authenticated, auth.user?.access_status, auth.user?.username]);

  useEffect(() => {
    if (!activeChat?.id) {
      setMessages([]);
      return;
    }

    loadMessages(activeChat).catch((error) => setUiError(error.message));
  }, [activeChat?.id]);

  useEffect(() => {
    const query = searchQuery.trim().replace(/^@+/, "");

    if (!query) {
      setSearchResults([]);
      setLoadingSearch(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setLoadingSearch(true);
      api(`/api/users/search?q=${encodeURIComponent(query)}`)
        .then((data) => setSearchResults(data.users || []))
        .catch((error) => setUiError(error.message))
        .finally(() => setLoadingSearch(false));
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  async function saveProfile(event) {
    event.preventDefault();
    setFormError("");
    setSavingProfile(true);

    try {
      const data = await api("/api/user/username", {
        method: "POST",
        body: JSON.stringify({
          username,
          display_name: displayName
        })
      });

      if (!data.ok) throw new Error(data.error || "Failed to save profile");
      await loadMe();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    });
    window.location.reload();
  }

  async function sendFriendRequest(user) {
    setUiError("");
    setBusy(true);

    try {
      await api("/api/friends/requests", {
        method: "POST",
        body: JSON.stringify({ user_id: user.id })
      });
      await loadSocial();
    } catch (error) {
      setUiError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function respondToRequest(requestId, action) {
    setUiError("");
    setBusy(true);

    try {
      const data = await api("/api/friends/requests/respond", {
        method: "POST",
        body: JSON.stringify({
          request_id: requestId,
          action
        })
      });

      await loadSocial();

      if (data.chat_id) {
        const chatsData = await api("/api/chats");
        setChats(chatsData.chats || []);
        const chat = (chatsData.chats || []).find((item) => item.id === data.chat_id);
        if (chat) {
          setActiveChat(chat);
          setView("chat");
        }
      }
    } catch (error) {
      setUiError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function openFriendChat(friend) {
    setUiError("");
    setBusy(true);

    try {
      const data = await api("/api/chats/direct", {
        method: "POST",
        body: JSON.stringify({ user_id: friend.id })
      });

      const chatsData = await api("/api/chats");
      setChats(chatsData.chats || []);

      const chat =
        (chatsData.chats || []).find((item) => item.id === data.chat.id) || data.chat;

      setActiveChat(chat);
      setView("chat");
    } catch (error) {
      setUiError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    const text = chatText.trim();

    if (!text || !activeChat?.id || busy) return;

    setBusy(true);
    setUiError("");

    try {
      await api("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          chat_id: activeChat.id,
          body_ciphertext: text,
          body_algorithm: "plain-v0",
          client_message_id: crypto.randomUUID(),
          sender_device_id: localStorage.getItem(DEVICE_ID_KEY) || null
        })
      });

      setChatText("");
      await Promise.all([loadMessages(activeChat), loadSocial()]);
    } catch (error) {
      setUiError(error.message);
    } finally {
      setBusy(false);
    }
  }

  if (auth.loading) {
    return (
      <main className="authScreen">
        <div className="authCard">
          <img className="authBrandIcon" src="/vodkach.png" alt="Vodkach" draggable="false" />
          <h1>Loading Vodkach</h1>
          <p>Checking your session.</p>
        </div>
      </main>
    );
  }

  if (!auth.authenticated) {
    return (
      <main className="authScreen">
        <div className="authCard">
          <img className="authBrandIcon" src="/vodkach.png" alt="Vodkach" draggable="false" />
          <h1>Open Vodkach</h1>
          <p>Sign in with Google to request access to the private messenger.</p>
          <a className="primaryButton authButton" href="/api/auth/google/start">
            Continue with Google
            <ArrowRight size={17} />
          </a>
        </div>
      </main>
    );
  }

  const accessStatus = auth.user?.access_status || "pending";

  if (accessStatus === "pending") {
    return (
      <main className="authScreen">
        <div className="authCard accessCard">
          <img className="authBrandIcon" src="/vodkach.png" alt="Vodkach" draggable="false" />
          <div className="accessStatusIcon pendingStatus">…</div>
          <h1>Pending approval</h1>
          <p>
            Your Google account was received. Access must be approved before you can
            create a Vodkach account.
          </p>
          <div className="accountEmail">{auth.user?.email}</div>
          <button className="secondaryButton authButton" type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </main>
    );
  }

  if (accessStatus === "rejected") {
    return (
      <main className="authScreen">
        <div className="authCard accessCard">
          <img className="authBrandIcon" src="/vodkach.png" alt="Vodkach" draggable="false" />
          <div className="accessStatusIcon deniedStatus">×</div>
          <h1>Access denied</h1>
          <p>
            This access request was declined. You can choose a Google account and send
            another request.
          </p>
          <a className="primaryButton authButton" href="/api/access/retry">
            Try again
            <ArrowRight size={17} />
          </a>
        </div>
      </main>
    );
  }

  if (accessStatus === "disabled") {
    return (
      <main className="authScreen">
        <div className="authCard accessCard">
          <img className="authBrandIcon" src="/vodkach.png" alt="Vodkach" draggable="false" />
          <div className="accessStatusIcon deniedStatus">×</div>
          <h1>Account disabled</h1>
          <p>This Vodkach account is currently unavailable.</p>
          <button className="secondaryButton authButton" type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </main>
    );
  }

  if (!auth.user?.username) {
    return (
      <main className="authScreen">
        <form className="authCard usernameCard" onSubmit={saveProfile}>
          <DefaultAvatar className="setupAvatar" alt="Default profile avatar" />
          <h1>Create account</h1>
          <p>Your access was approved. Choose your Vodkach username and display name.</p>

          <label className="fieldLabel">Username</label>
          <label className="usernameInput">
            <span>@</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="USERNAME"
              minLength={1}
              maxLength={16}
              autoFocus
            />
          </label>
          <div className="fieldHint">A-Z, 0-9, underscore, dot. 1–16 characters.</div>

          <label className="fieldLabel">Display Name</label>
          <label className="usernameInput">
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Max"
              minLength={1}
              maxLength={16}
            />
          </label>
          <div className="fieldHint">Up to 16 visible characters.</div>

          {formError && <div className="formError">{formError}</div>}

          <button className="primaryButton authButton" type="submit" disabled={savingProfile}>
            {savingProfile ? "Creating..." : "Create account"}
            <ArrowRight size={17} />
          </button>
        </form>
      </main>
    );
  }

  const currentDisplayName = auth.user.display_name || auth.user.username;
  const activeTitle =
    activeChat?.other_user?.display_name ||
    activeChat?.other_user?.username ||
    "Select a chat";

  return (
    <main className="appShell">
      <aside className="appServers">
        <button className="serverButton homeButton" title="Home">
          <Home size={18} />
        </button>

        <div className="serverDivider" />

        <button className="serverButton" title="Add server">
          <Plus size={19} />
        </button>

        <button className="serverButton" title="Search servers">
          <Search size={18} />
        </button>
      </aside>

      <aside className="appSidebar">
        <div className="sidebarNav">
          <button
            className={view === "search" ? "sidebarNavButton active" : "sidebarNavButton"}
            type="button"
            onClick={() => setView("search")}
          >
            <Search size={16} />
            Search
          </button>

          <button
            className={view === "friends" ? "sidebarNavButton active" : "sidebarNavButton"}
            type="button"
            onClick={() => setView("friends")}
          >
            <UserRound size={16} />
            Friends
            {incoming.length > 0 && <span className="navBadge">{incoming.length}</span>}
          </button>

          <button className="sidebarNavButton" type="button">
            <FileText size={16} />
            Shop
          </button>
        </div>

        <nav className="channelList">
          <p>Chats</p>
          {chats.length === 0 && <div className="emptySidebarText">No chats yet</div>}
          {chats.map((chat) => (
            <button
              key={chat.id}
              className={activeChat?.id === chat.id ? "channelButton chatUser active" : "channelButton chatUser"}
              type="button"
              onClick={() => {
                setActiveChat(chat);
                setView("chat");
              }}
            >
              <DefaultAvatar className="chatListAvatar" alt="Chat avatar" />
              <span>
                {chat.other_user?.display_name ||
                  chat.other_user?.username ||
                  chat.title ||
                  "Direct chat"}
              </span>
            </button>
          ))}
        </nav>

        <div className="bottomProfileBar">
          <button className="profileIdentityButton" type="button" title="Profile">
            <span className="profileAvatarWrap">
              <DefaultAvatar className="sidebarProfileAvatar" alt="Profile avatar" />
              <span className="profileStatusBadge online" title="Online">
                <span className="statusSymbol statusCircle" />
              </span>
            </span>

            <span className="sidebarProfileText">
              <strong>{currentDisplayName}</strong>
              <span>@{auth.user.username}</span>
            </span>
          </button>

          <button className="profileSettingsButton" type="button" aria-label="Settings">
            <Settings size={16} />
          </button>
        </div>
      </aside>

      <section className="appChat">
        {view === "search" && (
          <>
            <header className="appChatHeader">
              <strong>Add friends</strong>
            </header>

            <div className="socialPage">
              <label className="socialSearch">
                <Search size={17} />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by @username"
                  autoFocus
                />
              </label>

              <div className="socialList">
                {loadingSearch && <div className="socialEmpty">Searching...</div>}
                {!loadingSearch && searchQuery && searchResults.length === 0 && (
                  <div className="socialEmpty">No users found</div>
                )}

                {searchResults.map((user) => {
                  const friend = friends.some((item) => item.id === user.id);
                  const pending = outgoing.some((item) => item.user_id === user.id);

                  return (
                    <div className="socialRow" key={user.id}>
                      <DefaultAvatar className="socialAvatar" alt="User avatar" />
                      <div className="socialIdentity">
                        <strong>{user.display_name || user.username}</strong>
                        <span>@{user.username}</span>
                      </div>

                      {friend ? (
                        <button type="button" onClick={() => openFriendChat(user)}>
                          Message
                        </button>
                      ) : pending ? (
                        <span className="requestState">Pending</span>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => sendFriendRequest(user)}
                        >
                          Add friend
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {view === "friends" && (
          <>
            <header className="appChatHeader">
              <strong>Friends</strong>
            </header>

            <div className="socialPage">
              {incoming.length > 0 && (
                <section className="socialSection">
                  <h2>Incoming requests</h2>
                  <div className="socialList">
                    {incoming.map((request) => (
                      <div className="socialRow" key={request.id}>
                        <DefaultAvatar className="socialAvatar" alt="User avatar" />
                        <div className="socialIdentity">
                          <strong>{request.display_name || request.username}</strong>
                          <span>@{request.username}</span>
                        </div>
                        <div className="rowActions">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => respondToRequest(request.id, "accept")}
                          >
                            Accept
                          </button>
                          <button
                            className="quietAction"
                            type="button"
                            disabled={busy}
                            onClick={() => respondToRequest(request.id, "reject")}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="socialSection">
                <h2>All friends — {friends.length}</h2>
                <div className="socialList">
                  {friends.length === 0 && (
                    <div className="socialEmpty">You have no friends yet.</div>
                  )}
                  {friends.map((friend) => (
                    <div className="socialRow" key={friend.id}>
                      <DefaultAvatar className="socialAvatar" alt="Friend avatar" />
                      <div className="socialIdentity">
                        <strong>{friend.display_name || friend.username}</strong>
                        <span>@{friend.username}</span>
                      </div>
                      <button type="button" onClick={() => openFriendChat(friend)}>
                        Message
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}

        {view === "chat" && activeChat && (
          <>
            <header className="appChatHeader">
              <div>
                <strong>{activeTitle}</strong>
              </div>

              <div className="chatHeaderActions">
                <Phone size={18} />
                <MoreVertical size={19} />
              </div>
            </header>

            <div className="appMessages">
              {messages.length === 0 && (
                <div className="chatStart">
                  <DefaultAvatar className="chatStartAvatar" alt="Chat avatar" />
                  <h2>{activeTitle}</h2>
                  <p>This is the beginning of your direct chat.</p>
                </div>
              )}

              {messages.map((message) => (
                <AppMessage
                  key={message.id}
                  avatar="__default_avatar__"
                  name={message.sender?.display_name || message.sender?.username || "User"}
                  time={new Date(message.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                  text={message.deleted_at ? "Message deleted" : message.body_ciphertext}
                />
              ))}

              {deviceState.error && (
                <div className="deviceError">
                  Device key setup failed: {deviceState.error}
                </div>
              )}
            </div>

            <form className="messageComposer composerForm" onSubmit={sendMessage}>
              <input
                value={chatText}
                onChange={(event) => setChatText(event.target.value)}
                placeholder={`Message ${activeTitle}`}
                maxLength={4000}
              />
              <button type="submit" disabled={!chatText.trim() || busy}>
                Send
              </button>
            </form>
          </>
        )}

        {view === "chat" && !activeChat && (
          <div className="emptyChatState">
            <MessageCircle size={34} />
            <strong>Select a chat</strong>
            <span>Choose a friend or open Search to add one.</span>
          </div>
        )}

        {uiError && (
          <button className="uiErrorToast" type="button" onClick={() => setUiError("")}>
            {uiError}
          </button>
        )}
      </section>
    </main>
  );
}

function DefaultAvatar({ className = "avatarImage", alt = "Default avatar" }) {
  return <img className={className} src="/default-avatar.png" alt={alt} draggable="false" />;
}

function getInitial(value) {
  return String(value || "V").trim().charAt(0).toUpperCase() || "V";
}

function InfoItem({ title, text }) {
  return (
    <article className="infoItem">
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function AppMessage({ avatar, name, time, text, accent }) {
  return (
    <div className="appMessage">
      {avatar === "__default_avatar__" ? (
        <DefaultAvatar className="messageAvatarImage" alt="User avatar" />
      ) : (
        <div className={accent ? "avatar accent" : "avatar"}>{avatar}</div>
      )}
      <div>
        <div className="messageMeta">
          <strong>{name}</strong>
          <span>{time}</span>
        </div>
        <p>{text}</p>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  isWebApp ? <WebApp /> : <Landing />
);

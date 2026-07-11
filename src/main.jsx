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

const isAdminPage =
  typeof window !== "undefined" &&
  !window.location.hostname.startsWith("web.") &&
  window.location.pathname.startsWith("/admin");

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
  const [friendsTab, setFriendsTab] = useState("all");
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
  const [avatarPreview, setAvatarPreview] = useState("");
  const [turnstileSiteKey, setTurnstileSiteKey] = useState("");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileDraftInitialized, setProfileDraftInitialized] = useState(false);
  const [turnstileWidgetId, setTurnstileWidgetId] = useState(null);

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

  function getAvatar(user) {
    const value = user?.avatar_url;
    return value && value !== "null" ? value : "/default-avatar.png";
  }

  async function handleAvatarFile(file) {
    if (!file) return;

    const maxInputBytes = 10 * 1024 * 1024;

    if (file.size > maxInputBytes) {
      setFormError("Avatar file must be 10 MB or smaller");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setFormError("Choose an image file");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const maxSide = 1024;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d", { alpha: true });
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      let quality = 0.9;
      let dataUrl = canvas.toDataURL("image/webp", quality);

      while (dataUrl.length > 900000 && quality > 0.45) {
        quality -= 0.08;
        dataUrl = canvas.toDataURL("image/webp", quality);
      }

      if (dataUrl.length > 1000000) {
        setFormError("This image could not be compressed enough. Choose another image.");
        return;
      }

      setAvatarPreview(dataUrl);
      setFormError("");
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setFormError("This image format is not supported by your browser");
    };

    image.src = objectUrl;
  }

  async function loadTurnstile() {
    try {
      const response = await fetch("/api/config/public", { credentials: "include" });
      const data = await response.json();
      setTurnstileSiteKey(data.turnstile_site_key || "");
    } catch {
      setTurnstileSiteKey("");
    }
  }

  async function loadMe() {
    const response = await fetch("/api/auth/me", { credentials: "include" });
    const data = await response.json();

    setAuth({
      loading: false,
      authenticated: Boolean(data.authenticated),
      user: data.user || null
    });

    if (data.user?.username) {
      setUsername(data.user.username);
    }

    if (!profileDraftInitialized && data.user) {
      setDisplayName(data.user.username ? (data.user.display_name || "") : "");
      setAvatarPreview(data.user.avatar_url || "/default-avatar.png");
      setProfileDraftInitialized(true);
    }
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
    if (!auth.authenticated) return;

    const timer = window.setInterval(() => {
      loadMe().catch(() => {});
    }, 2000);

    return () => window.clearInterval(timer);
  }, [auth.authenticated]);

  useEffect(() => {
    if (
      auth.authenticated &&
      auth.user?.access_status === "approved" &&
      !auth.user?.username
    ) {
      loadTurnstile();
    }
  }, [auth.authenticated, auth.user?.access_status, auth.user?.username]);

  useEffect(() => {
    if (!turnstileSiteKey || auth.user?.username) return;

    let cancelled = false;
    let attempts = 0;

    function renderWidget() {
      if (cancelled) return;

      const container = document.getElementById("vodkach-turnstile");

      if (!container || !window.turnstile) {
        attempts += 1;
        if (attempts < 80) window.setTimeout(renderWidget, 100);
        return;
      }

      container.innerHTML = "";

      const widgetId = window.turnstile.render(container, {
        sitekey: turnstileSiteKey,
        theme: "dark",
        size: "flexible",
        callback: () => setFormError(""),
        "expired-callback": () => {
          setFormError("Cloudflare verification expired. Complete it again.");
        },
        "error-callback": () => {
          setFormError("Cloudflare verification could not load.");
        }
      });

      setTurnstileWidgetId(widgetId);
    }

    const existing = document.querySelector('script[data-vodkach-turnstile="1"]');

    if (existing) {
      renderWidget();
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.vodkachTurnstile = "1";
      script.onload = renderWidget;
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, [turnstileSiteKey, auth.user?.username]);

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
    if (
      !auth.authenticated ||
      auth.user?.access_status !== "approved" ||
      !auth.user?.username
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      loadSocial().catch(() => {});
    }, 2000);

    return () => window.clearInterval(timer);
  }, [auth.authenticated, auth.user?.access_status, auth.user?.username]);

  useEffect(() => {
    if (!activeChat?.id) {
      setMessages([]);
      return;
    }
    loadMessages(activeChat).catch((error) => setUiError(error.message));
  }, [activeChat?.id]);

  useEffect(() => {
    if (!activeChat?.id) return;

    const timer = window.setInterval(() => {
      loadMessages(activeChat).catch(() => {});
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeChat?.id]);

  useEffect(() => {
    const query = searchQuery.trim().replace(/^@+/, "");

    if (!query || friendsTab !== "add") {
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
  }, [searchQuery, friendsTab]);

  async function saveProfile(event) {
    event.preventDefault();
    setFormError("");

    const turnstileToken =
      turnstileWidgetId !== null && window.turnstile
        ? window.turnstile.getResponse(turnstileWidgetId)
        : "";

    if (turnstileSiteKey && !turnstileToken) {
      setFormError("Complete the Cloudflare verification");
      return;
    }

    setSavingProfile(true);

    try {
      await api("/api/user/username", {
        method: "POST",
        body: JSON.stringify({
          username,
          display_name: displayName,
          avatar_url:
            avatarPreview && avatarPreview !== "/default-avatar.png"
              ? avatarPreview
              : null,
          turnstile_token: turnstileToken
        })
      });
      await loadMe();
    } catch (error) {
      setFormError(error.message);

      if (turnstileWidgetId !== null && window.turnstile) {
        window.turnstile.reset(turnstileWidgetId);
      }
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
        body: JSON.stringify({ request_id: requestId, action })
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

    const clientMessageId = crypto.randomUUID();
    const optimisticMessage = {
      id: `optimistic_${clientMessageId}`,
      chat_id: activeChat.id,
      sender_user_id: auth.user.id,
      client_message_id: clientMessageId,
      body_ciphertext: text,
      body_algorithm: "plain-v0",
      created_at: new Date().toISOString(),
      sender: auth.user,
      optimistic: true
    };

    setMessages((current) => [...current, optimisticMessage]);
    setChatText("");

    try {
      await api("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          chat_id: activeChat.id,
          body_ciphertext: text,
          body_algorithm: "plain-v0",
          client_message_id: clientMessageId,
          sender_device_id: localStorage.getItem(DEVICE_ID_KEY) || null
        })
      });

      await Promise.all([loadMessages(activeChat), loadSocial()]);
    } catch (error) {
      setMessages((current) =>
        current.filter((message) => message.id !== `optimistic_${clientMessageId}`)
      );
      setUiError(error.message);
    } finally {
      setBusy(false);
    }
  }

  if (auth.loading) {
    return (
      <main className="authScreen discordAuthScreen">
        <div className="discordAuthCard compact">
          <div className="discordAuthLogo">
            <img src="/vodkach.png" alt="Vodkach" draggable="false" />
          </div>
          <h1>Loading Vodkach</h1>
          <p>Checking your secure session.</p>
        </div>
      </main>
    );
  }

  if (!auth.authenticated) {
    return (
      <main className="authScreen discordAuthScreen">
        <div className="discordAuthCard">
          <div className="discordAuthBrand">
            <img src="/vodkach.png" alt="Vodkach" draggable="false" />
            <span>Vodkach</span>
          </div>
          <h1>Welcome back</h1>
          <p>Sign in with Google to access the private messenger.</p>
          <a className="discordPrimaryButton" href="/api/auth/google/start">
            Continue with Google
          </a>
        </div>
      </main>
    );
  }

  const accessStatus = auth.user?.access_status || "pending";

  if (accessStatus === "pending") {
    return (
      <main className="authScreen discordAuthScreen">
        <div className="discordAuthCard">
          <div className="discordAuthBrand">
            <img src="/vodkach.png" alt="Vodkach" draggable="false" />
            <span>Vodkach</span>
          </div>
<h1>Pending approval</h1>
          <p>Your request was sent. Access must be approved before account creation.</p>
          <div className="discordAccountBox">
            <span>Signed in as</span>
            <strong>{auth.user?.email}</strong>
          </div>
          <button className="discordSecondaryButton" type="button" onClick={logout}>
            
            Sign out
          </button>
        </div>
      </main>
    );
  }

  if (accessStatus === "rejected") {
    return (
      <main className="authScreen discordAuthScreen">
        <div className="discordAuthCard">
          <div className="discordAuthBrand">
            <img src="/vodkach.png" alt="Vodkach" draggable="false" />
            <span>Vodkach</span>
          </div>
          <div className="discordStatusIcon denied">
            <span aria-hidden="true">×</span>
          </div>
          <h1>Access denied</h1>
          <p>This request was declined. You can choose a Google account and apply again.</p>
          <a className="discordPrimaryButton" href="/api/access/retry">
            Try again
          </a>
        </div>
      </main>
    );
  }

  if (accessStatus === "blocked") {
    return (
      <main className="authScreen discordAuthScreen">
        <div className="discordAuthCard">
          <div className="discordAuthBrand">
            <img src="/vodkach.png" alt="Vodkach" draggable="false" />
            <span>Vodkach</span>
          </div>
          <div className="discordStatusIcon denied">
            <span aria-hidden="true">!</span>
          </div>
          <h1>Access blocked</h1>
          <p>This email is permanently blocked from Vodkach.</p>
          <button className="discordSecondaryButton" type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </main>
    );
  }

  if (accessStatus === "disabled") {
    return (
      <main className="authScreen discordAuthScreen">
        <div className="discordAuthCard">
          <div className="discordAuthBrand">
            <img src="/vodkach.png" alt="Vodkach" draggable="false" />
            <span>Vodkach</span>
          </div>
          <div className="discordStatusIcon denied">
            <span aria-hidden="true">!</span>
          </div>
          <h1>Account disabled</h1>
          <p>This account is currently unavailable.</p>
          <button className="discordSecondaryButton" type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </main>
    );
  }

  if (!auth.user?.username) {
    return (
      <main className="authScreen discordAuthScreen">
        <form className="discordAuthCard accountCreateCard refinedCreateCard" onSubmit={saveProfile}>
          <div className="discordAuthBrand">
            <img src="/vodkach.png" alt="Vodkach" draggable="false" />
            <span>Vodkach</span>
          </div>

          <div className="createProfileHeader">
            <div className="avatarEditor">
              <img
                className="createAvatarPreview"
                src={avatarPreview || "/default-avatar.png"}
                alt="Profile avatar"
              />

              <label className="avatarEditButton" title="Upload avatar">
                <span className="customPencilIcon" aria-hidden="true" />
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(event) => handleAvatarFile(event.target.files?.[0])}
                />
              </label>

              {avatarPreview && (
                <button
                  className="avatarClearButton"
                  type="button"
                  title="Clear avatar"
                  onClick={() => setAvatarPreview("/default-avatar.png")}
                >
                  ×
                </button>
              )}
            </div>

            <div>
              <h1>Create your account</h1>
              <p>Choose how people will see you in Vodkach.</p>
            </div>
          </div>

          <div className="createFields">
            <label className="discordFieldLabel">Username</label>
            <label className="discordInput">
              <span>@</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="username"
                minLength={1}
                maxLength={16}
                autoFocus
              />
            </label>

            <label className="discordFieldLabel">Display Name</label>
            <label className="discordInput">
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Display name"
                minLength={1}
                maxLength={16}
              />
            </label>
          </div>

          {turnstileSiteKey ? (
            <div id="vodkach-turnstile" className="turnstileBox" />
          ) : (
            <div className="turnstileSetupNotice">
              Turnstile is not configured yet.
            </div>
          )}

          {formError && <div className="formError">{formError}</div>}

          <button className="discordPrimaryButton createAccountButton" type="submit" disabled={savingProfile}>
            {savingProfile ? "Creating..." : "Create account"}
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
              <img className="chatListAvatar" src={getAvatar(chat.other_user)} alt="Chat avatar" />
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
              <img className="sidebarProfileAvatar" src={getAvatar(auth.user)} alt="Profile avatar" />
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
        {view === "friends" && (
          <>
            <header className="friendsHeader">
              <div className="friendsHeaderTitle">
                <UserRound size={18} />
                <strong>Friends</strong>
              </div>

              <nav className="friendsTabs">
                <button
                  type="button"
                  className={friendsTab === "all" ? "active" : ""}
                  onClick={() => setFriendsTab("all")}
                >
                  All
                </button>
                <button
                  type="button"
                  className={friendsTab === "pending" ? "active" : ""}
                  onClick={() => setFriendsTab("pending")}
                >
                  Pending
                  {incoming.length > 0 && <span>{incoming.length}</span>}
                </button>
                <button
                  type="button"
                  className={friendsTab === "add" ? "addFriendTab active" : "addFriendTab"}
                  onClick={() => setFriendsTab("add")}
                >
                  Add Friend
                </button>
              </nav>
            </header>

            <div className="socialPage">
              {friendsTab === "add" && (
                <section className="addFriendPanel">
                  <h2>Add Friend</h2>
                  <p>You can add friends using their Vodkach username.</p>
                  <label className="socialSearch">
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search by @username"
                      autoFocus
                    />
                    <button type="button" disabled={!searchQuery.trim()}>
                      Send Friend Request
                    </button>
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
                          <img className="socialAvatar" src={getAvatar(user)} alt="User avatar" />
                          <div className="socialIdentity">
                            <strong>{user.display_name || user.username}</strong>
                            <span>@{user.username}</span>
                          </div>

                          {friend ? (
                            <button type="button" onClick={() => openFriendChat(user)}>
                              Message
                            </button>
                          ) : pending ? (
                            <span className="requestState">Request sent</span>
                          ) : (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => sendFriendRequest(user)}
                            >
                              Add Friend
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {friendsTab === "pending" && (
                <section className="socialSection">
                  <h2>Pending — {incoming.length + outgoing.length}</h2>
                  <div className="socialList">
                    {incoming.map((request) => (
                      <div className="socialRow" key={request.id}>
                        <img className="socialAvatar" src={getAvatar(request)} alt="User avatar" />
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
                            Ignore
                          </button>
                        </div>
                      </div>
                    ))}

                    {outgoing.map((request) => (
                      <div className="socialRow" key={request.id}>
                        <img className="socialAvatar" src={getAvatar(request)} alt="User avatar" />
                        <div className="socialIdentity">
                          <strong>{request.display_name || request.username}</strong>
                          <span>@{request.username}</span>
                        </div>
                        <span className="requestState">Outgoing</span>
                      </div>
                    ))}

                    {incoming.length + outgoing.length === 0 && (
                      <div className="socialEmpty">No pending requests.</div>
                    )}
                  </div>
                </section>
              )}

              {friendsTab === "all" && (
                <section className="socialSection">
                  <h2>All Friends — {friends.length}</h2>
                  <div className="socialList">
                    {friends.length === 0 && (
                      <div className="socialEmpty">No friends yet.</div>
                    )}
                    {friends.map((friend) => (
                      <div className="socialRow" key={friend.id}>
                        <img className="socialAvatar" src={getAvatar(friend)} alt="Friend avatar" />
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
              )}
            </div>
          </>
        )}

        {view === "chat" && activeChat && (
          <>
            <header className="appChatHeader">
              <div><strong>{activeTitle}</strong></div>
              <div className="chatHeaderActions">
                <Phone size={18} />
                <MoreVertical size={19} />
              </div>
            </header>

            <div className="appMessages">
              {messages.length === 0 && (
                <div className="chatStart">
                  <img className="chatStartAvatar" src={getAvatar(activeChat?.other_user)} alt="Chat avatar" />
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

        {uiError && (
          <button className="uiErrorToast" type="button" onClick={() => setUiError("")}>
            {uiError}
          </button>
        )}
      </section>

      <aside className="memberProfilePanel">
        {activeChat?.other_user ? (
          <>
            <div className="profileBanner" />
            <div className="memberProfileBody">
              <img
                className="memberProfileAvatar"
                src={getAvatar(activeChat.other_user)}
                alt="Profile avatar"
              />
              <h2>
                {activeChat.other_user.display_name ||
                  activeChat.other_user.username}
              </h2>
              <span>@{activeChat.other_user.username}</span>

              <div className="memberProfileSection">
                <strong>Account Created</strong>
                <span>
                  {activeChat.other_user.created_at
                    ? new Date(activeChat.other_user.created_at).toLocaleDateString()
                    : "Unknown"}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="profilePanelEmpty">Open a chat to view profile</div>
        )}
      </aside>
    </main>
  );
}

function AdminApp() {
  const [auth, setAuth] = useState({ loading: true, authenticated: false, user: null, admin: false });
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [bannedEmails, setBannedEmails] = useState([]);
  const [tab, setTab] = useState("requests");
  const [query, setQuery] = useState("");
  const [banEmail, setBanEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
      throw new Error(data.error || `Request failed (${response.status})`);
    }
    return data;
  }

  function getAvatar(user) {
    const value = user?.avatar_url;
    return value && value !== "null" ? value : "/default-avatar.png";
  }

  async function handleAvatarFile(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("Choose an image file");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      if (image.width > 1024 || image.height > 1024) {
        setFormError("Avatar must be 1024×1024 px or smaller");
        return;
      }

      const size = Math.min(512, Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");

      context.fillStyle = "#101114";
      context.fillRect(0, 0, size, size);

      const scale = Math.max(size / image.width, size / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      context.drawImage(
        image,
        (size - width) / 2,
        (size - height) / 2,
        width,
        height
      );

      setAvatarPreview(canvas.toDataURL("image/webp", 0.82));
      setFormError("");
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setFormError("Could not read this image");
    };

    image.src = objectUrl;
  }

  async function loadTurnstile() {
    try {
      const response = await fetch("/api/config/public", { credentials: "include" });
      const data = await response.json();
      setTurnstileSiteKey(data.turnstile_site_key || "");
    } catch {
      setTurnstileSiteKey("");
    }
  }

  async function loadMe() {
    const response = await fetch("/api/admin/me", { credentials: "include" });
    const data = await response.json().catch(() => ({}));
    setAuth({
      loading: false,
      authenticated: Boolean(data.authenticated),
      user: data.user || null,
      admin: Boolean(data.admin)
    });
  }

  async function loadAdminData() {
    const [requestsData, usersData, bannedData] = await Promise.all([
      api("/api/admin/requests?status=pending"),
      api(`/api/admin/users?q=${encodeURIComponent(query)}`),
      api("/api/admin/banned-emails")
    ]);
    setRequests(requestsData.requests || []);
    setUsers(usersData.users || []);
    setBannedEmails(bannedData.banned_emails || []);
  }

  useEffect(() => {
    loadMe().catch(() => setAuth({ loading: false, authenticated: false, user: null, admin: false }));
  }, []);

  useEffect(() => {
    if (auth.admin) {
      loadAdminData().catch((e) => setError(e.message));
    }
  }, [auth.admin]);

  useEffect(() => {
    if (!auth.admin || tab !== "users") return;
    const timer = setTimeout(() => {
      api(`/api/admin/users?q=${encodeURIComponent(query)}`)
        .then((data) => setUsers(data.users || []))
        .catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, tab, auth.admin]);

  async function action(path, payload) {
    setBusy(true);
    setError("");
    try {
      await api(path, { method: "POST", body: JSON.stringify(payload) });
      await loadAdminData();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (auth.loading) {
    return <main className="adminLoginScreen"><div className="adminLoginCard">Loading admin...</div></main>;
  }

  const adminLoginAttempted =
    new URLSearchParams(window.location.search).get("attempted") === "1";

  if (!auth.admin && !adminLoginAttempted) {
    return (
      <main className="adminLoginScreen">
        <div className="adminLoginCard">
          <img src="/vodkach.png" alt="Vodkach" />
          <h1>Vodkach Admin</h1>
          <p>Sign in with an administrator Google account.</p>
          <a href="/api/admin/login">Continue with Google</a>
        </div>
      </main>
    );
  }

  if (!auth.admin) {
    window.setTimeout(() => window.location.replace("/"), 1800);
    return (
      <main className="adminLoginScreen">
        <div className="adminLoginCard">
          <h1>Access denied</h1>
          <p>
            {auth.user?.email || "This Google account"} is not listed in ADMIN_EMAILS.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="adminShell">
      <aside className="adminSidebar">
        <div className="adminBrand">
          <img src="/vodkach.png" alt="Vodkach" />
          <div><strong>Vodkach</strong><span>Admin Panel</span></div>
        </div>

        <button className={tab === "requests" ? "active" : ""} onClick={() => setTab("requests")}>
          Requests
        </button>
        <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>
          <UserRound size={16} /> Users
        </button>
        <button className={tab === "bans" ? "active" : ""} onClick={() => setTab("bans")}>
          Bans
        </button>
      </aside>

      <section className="adminContent">
        <header className="adminTopbar">
          <div>
            <h1>{tab === "requests" ? "Access Requests" : tab === "users" ? "Users" : "Banned Emails"}</h1>
            <p>{auth.user?.email}</p>
          </div>
        </header>

        {error && <div className="adminError">{error}</div>}

        {tab === "requests" && (
          <div className="adminList">
            {requests.length === 0 && <div className="adminEmpty">No pending requests.</div>}
            {requests.map((request) => (
              <div className="adminRow" key={request.id}>
                <DefaultAvatar className="adminAvatar" alt="User avatar" />
                <div className="adminIdentity">
                  <strong>{request.display_name || request.email}</strong>
                  <span>{request.email}</span>
                </div>
                <div className="adminActions">
                  <button disabled={busy} onClick={() => action("/api/admin/requests/approve", { user_id: request.id })}>
                    Accept
                  </button>
                  <button disabled={busy} className="secondary" onClick={() => action("/api/admin/requests/reject", { user_id: request.id })}>
                    Deny
                  </button>
                  <button disabled={busy} className="danger" onClick={() => action("/api/admin/users/block", { user_id: request.id })}>
                    Block
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "users" && (
          <>
            <label className="adminSearch">
              <Search size={16} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users or emails" />
            </label>
            <div className="adminList">
              {users.map((user) => (
                <div className="adminRow" key={user.id}>
                  <DefaultAvatar className="adminAvatar" alt="User avatar" />
                  <div className="adminIdentity">
                    <strong>{user.display_name || user.username || user.email}</strong>
                    <span>{user.email} {user.username ? `• @${user.username}` : ""}</span>
                  </div>
                  <div className="adminMeta">{user.access_status}</div>
                  <div className="adminActions">
                    <button disabled={busy} className="secondary" onClick={() => {
                      const hours = prompt("Ban duration in hours:", "24");
                      if (!hours) return;
                      action("/api/admin/users/temp-ban", { user_id: user.id, hours: Number(hours) });
                    }}>
                      Temp ban
                    </button>
                    <button disabled={busy} className="danger" onClick={() => action("/api/admin/users/block", { user_id: user.id })}>
                      Block
                    </button>
                    <button disabled={busy} onClick={() => action("/api/admin/users/unban", { user_id: user.id })}>
                      Unban
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "bans" && (
          <>
            <form className="adminBanForm" onSubmit={(e) => {
              e.preventDefault();
              if (!banEmail.trim()) return;
              action("/api/admin/banned-emails", { email: banEmail.trim() });
              setBanEmail("");
            }}>
              <input value={banEmail} onChange={(e) => setBanEmail(e.target.value)} placeholder="email@example.com" />
              <button type="submit">Ban email permanently</button>
            </form>

            <div className="adminList">
              {bannedEmails.map((item) => (
                <div className="adminRow" key={item.email}>
                  <div className="adminIdentity">
                    <strong>{item.email}</strong>
                    <span>{item.reason || "Permanent block"}</span>
                  </div>
                  <button className="secondary" onClick={() => action("/api/admin/banned-emails/unban", { email: item.email })}>
                    Unban
                  </button>
                </div>
              ))}
            </div>
          </>
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
  isAdminPage ? <AdminApp /> : isWebApp ? <WebApp /> : <Landing />
);

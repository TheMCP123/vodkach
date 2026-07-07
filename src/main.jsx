import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  AtSign,
  Bell,
  FileText,
  LockKeyhole,
  MessageCircle,
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

  async function loadMe() {
    const response = await fetch("/api/auth/me", { credentials: "include" });
    const data = await response.json();
    setAuth({
      loading: false,
      authenticated: data.authenticated,
      user: data.user
    });

    if (data.user?.username) {
      setUsername(data.user.username);
    }

    if (data.user?.display_name) {
      setDisplayName(data.user.display_name);
    }
  }

  useEffect(() => {
    loadMe().catch(() => {
      setAuth({ loading: false, authenticated: false, user: null });
    });
  }, []);

  useEffect(() => {
    if (!auth.authenticated || !auth.user?.username || deviceState.ready || deviceState.loading) {
      return;
    }

    setDeviceState({ loading: true, ready: false, error: "" });

    registerCurrentDevice()
      .then(() => {
        setDeviceState({ loading: false, ready: true, error: "" });
      })
      .catch((error) => {
        setDeviceState({
          loading: false,
          ready: false,
          error: error.message || "Device key setup failed"
        });
      });
  }, [auth.authenticated, auth.user?.username, deviceState.ready, deviceState.loading]);

  async function saveProfile(event) {
    event.preventDefault();
    setFormError("");
    setSavingProfile(true);

    try {
      const response = await fetch("/api/user/username", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          display_name: displayName
        })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setFormError(data.error || "Failed to save profile");
        return;
      }

      await loadMe();
    } finally {
      setSavingProfile(false);
    }
  }

  if (auth.loading) {
    return (
      <main className="authScreen">
        <div className="authCard">
          <div className="authLogo">V</div>
          <h1>Loading Vodkach</h1>
          <p>Checking secure session.</p>
        </div>
      </main>
    );
  }

  if (!auth.authenticated) {
    return (
      <main className="authScreen">
        <div className="authCard">
          <div className="authLogo">V</div>
          <h1>Open Vodkach</h1>
          <p>Sign in with Google to continue to the private web app.</p>
          <a className="primaryButton authButton" href="/api/auth/google/start">
            Continue with Google
            <ArrowRight size={17} />
          </a>
        </div>
      </main>
    );
  }

  if (!auth.user?.username) {
    return (
      <main className="authScreen">
        <form className="authCard usernameCard" onSubmit={saveProfile}>
          <DefaultAvatar className="setupAvatar" alt="Default profile avatar" />
          <h1>Create profile</h1>
          <p>Choose your public handle and display name. Avatar editing comes later.</p>

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
          <div className="fieldHint">A-Z, 0-9, underscore, dot. 1-16 characters.</div>

          <label className="fieldLabel">Display Name</label>
          <label className="usernameInput">
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Max"
              minLength={1}
              maxLength={32}
            />
          </label>
          <div className="fieldHint">Up to 16 visible characters. Control characters blocked.</div>

          {formError && <div className="formError">{formError}</div>}

          <button className="primaryButton authButton" type="submit" disabled={savingProfile}>
            {savingProfile ? "Saving..." : "Continue"}
            <ArrowRight size={17} />
          </button>
        </form>
      </main>
    );
  }

  const currentDisplayName = auth.user.display_name || auth.user.username;

  return (
    <main className="appShell">
      <aside className="appServers">
        <div className="appServerLogo">V</div>
        <button className="serverButton active" title="Vodkach">
          <MessageCircle size={20} />
        </button>
        <button className="serverButton" title="Add">
          <Plus size={20} />
        </button>
      </aside>

      <aside className="appSidebar">
        <div className="sidebarTop">
          <div className="searchBox">
            <Search size={15} />
            <span>Search</span>
          </div>
        </div>

        <nav className="channelList">
          <p>Direct Messages</p>
          <button className="channelButton active">
            <AtSign size={16} />
            {auth.user.username}
          </button>
          <button className="channelButton">
            <AtSign size={16} />
            private-room
          </button>
          <button className="channelButton">
            <FileText size={16} />
            encrypted-files
          </button>
        </nav>

        <div className="sidebarProfile">
          <DefaultAvatar className="sidebarProfileAvatar" alt="Profile avatar" />
          <div className="sidebarProfileText">
            <strong>{currentDisplayName}</strong>
            <span>@{auth.user.username}</span>
          </div>
          <button className="profileSettingsButton" type="button" aria-label="Settings">
            <Settings size={16} />
          </button>
        </div>
      </aside>

      <section className="appChat">
        <header className="appChatHeader">
          <div>
            <span className="chatHash">#</span>
            <strong>{auth.user.username}</strong>
          </div>

          <div className="chatHeaderActions">
            <Bell size={18} />
            <UserRound size={18} />
          </div>
        </header>

        <div className="appMessages">
          <AppMessage
            avatar={getInitial(currentDisplayName)}
            name={currentDisplayName}
            time="now"
            text="Welcome to Vodkach."
          />
          <AppMessage
            avatar="V"
            name="Vodkach"
            time="System"
            text={deviceState.ready ? "This browser is ready for encrypted chats." : "Preparing this browser for encrypted chats..."}
            accent
          />
          {deviceState.error && (
            <div className="deviceError">
              Device key setup failed: {deviceState.error}
            </div>
          )}
        </div>

        <div className="messageComposer">
          <span>Message #{auth.user.username}</span>
        </div>
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

import React, { useEffect, useRef, useState } from "react";
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

if (typeof document !== "undefined") {
  document.documentElement.classList.toggle(
    "vodkachWebHost",
    isWebApp
  );
  document.documentElement.classList.toggle(
    "vodkachMainHost",
    !isWebApp && !isAdminPage
  );
}

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






function ReplyActionIcon() {
  return (
    <svg className="contextActionIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.2 7.2 4.5 12l4.7 4.8" />
      <path d="M5 12h7.4c4.2 0 6.6 2.1 7.1 5.8-.9-2-2.8-3-5.8-3H9.8" />
    </svg>
  );
}

function EditActionIcon() {
  return (
    <svg className="contextActionIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 17.8.8-4.1L15.9 3.6a2 2 0 0 1 2.8 0l1.7 1.7a2 2 0 0 1 0 2.8L10.3 18.2 6.2 19Z" />
      <path d="m14.4 5.1 4.5 4.5" />
    </svg>
  );
}

function DeleteActionIcon() {
  return (
    <svg className="contextActionIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 7h15" />
      <path d="M9 7V4.8h6V7" />
      <path d="m7 7 .8 12h8.4L17 7" />
      <path d="M10 10.5v5.5M14 10.5v5.5" />
    </svg>
  );
}

function StatusGlyph({ status }) {
  if (status === "sleeping") {
    return <span className="statusMoon" aria-hidden="true" />;
  }

  if (status === "dnd") {
    return <span className="statusDnd" aria-hidden="true"><span /></span>;
  }

  return <span className={`statusDot ${status || "offline"}`} aria-hidden="true" />;
}

function statusLabel(status) {
  if (status === "online") return "Online";
  if (status === "sleeping") return "Sleeping";
  if (status === "dnd") return "Do Not Disturb";
  return "Offline";
}

function parseServerDate(value) {
  if (!value) return new Date(NaN);
  const normalized =
    typeof value === "string" &&
    !/[zZ]|[+-]\d\d:\d\d$/.test(value)
      ? `${value.replace(" ", "T")}Z`
      : value;
  return new Date(normalized);
}

function formatLocalTime(value) {
  const date = parseServerDate(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatLocalDate(value) {
  const date = parseServerDate(value);
  if (!Number.isFinite(date.getTime())) return "Unknown";
  return date.toLocaleDateString();
}


function SettingsNavIcon({ type }) {
  const paths = {
    account: (
      <>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 19c.7-3.3 3-5 6.5-5s5.8 1.7 6.5 5" />
      </>
    ),
    profile: (
      <>
        <path d="M5 5h14v14H5z" />
        <circle cx="9" cy="10" r="2" />
        <path d="M12.5 14.5h4M12.5 10.5h4M8 16h8" />
      </>
    ),
    sessions: (
      <>
        <rect x="4" y="5" width="16" height="11" rx="2" />
        <path d="M9 20h6M12 16v4" />
      </>
    ),
    notifications: (
      <>
        <path d="M7 10a5 5 0 0 1 10 0c0 5 2 5 2 6H5c0-1 2-1 2-6" />
        <path d="M10 19h4" />
      </>
    )
  };

  return (
    <svg className="settingsNavIcon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[type]}
    </svg>
  );
}

function AvatarWithStatus({
  user,
  className = "",
  alt = "Avatar",
  clickableStatus = false,
  onStatusClick
}) {
  const avatar = user?.avatar_url || "/default-avatar.png";
  const status = user?.effective_status || "offline";

  return (
    <span className={`avatarWithStatus ${className}`}>
      <img src={avatar} alt={alt} draggable="false" />
      <span className="statusTooltipWrap">
        {clickableStatus ? (
          <button
            className="avatarStatusBadge clickable"
            type="button"
            aria-label="Change status"
            onClick={onStatusClick}
          >
            <StatusGlyph status={status} />
          </button>
        ) : (
          <span className="avatarStatusBadge" aria-label={status}>
            <StatusGlyph status={status} />
          </span>
        )}
        <span className="statusTooltip">{statusLabel(status)}</span>
      </span>
    </span>
  );
}

function VerifiedBadge({ className = "" }) {
  return (
    <span
      className={`verifiedBadgeWrap ${className}`}
      aria-label="Verified User"
      tabIndex={0}
    >
      <span className="verifiedBadge">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M7.4 12.2 10.4 15.2 16.8 8.8" />
        </svg>
      </span>
      <span className="verifiedTooltip" role="tooltip">
        Verified User
      </span>
    </span>
  );
}


function splitTextWithLinks(text) {
  const value = String(text || "");
  const regex = /((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/gi;
  const parts = [];
  let last = 0;

  value.replace(regex, (match, _group, index) => {
    if (index > last) parts.push({ type: "text", value: value.slice(last, index) });
    parts.push({
      type: "link",
      value: match,
      href: /^https?:\/\//i.test(match) ? match : `https://${match}`
    });
    last = index + match.length;
    return match;
  });

  if (last < value.length) parts.push({ type: "text", value: value.slice(last) });
  return parts;
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
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageMenu, setMessageMenu] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [settingsTab, setSettingsTab] = useState("account");
  const [soundEnabled, setSoundEnabled] = useState(
    localStorage.getItem("vodkach_message_sound") !== "off"
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    username: "",
    display_name: "",
    pronouns: "",
    bio: "",
    avatar_url: null,
    banner_color: "#5b1115"
  });
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [linkWarning, setLinkWarning] = useState(null);
  const [socialToast, setSocialToast] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userMenu, setUserMenu] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [chatActionsOpen, setChatActionsOpen] = useState(false);
  const [saveCooldownUntil, setSaveCooldownUntil] = useState(0);
  const [clientLocation, setClientLocation] = useState({
    country: "",
    city: "",
    region: ""
  });
  const [profileFormInitialized, setProfileFormInitialized] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uiError, setUiError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [turnstileSiteKey, setTurnstileSiteKey] = useState("");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileDraftInitialized, setProfileDraftInitialized] = useState(false);
  const [turnstileWidgetId, setTurnstileWidgetId] = useState(null);
  const [captchaStarted, setCaptchaStarted] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [avatarCropper, setAvatarCropper] = useState(null);
  const [cropDrag, setCropDrag] = useState(null);
  const previousChatLatestRef = useRef(new Map());
  const notificationsReadyRef = useRef(false);
  const messageAudioRef = useRef(null);
  const sendingMessageRef = useRef(false);
  const draftHydratingRef = useRef(false);
  const previousIncomingIdsRef = useRef(new Set());
  const previousFriendIdsRef = useRef(new Set());
  const socialReadyRef = useRef(false);
  const messagesViewportRef = useRef(null);
  const messagesEndRef = useRef(null);
  const lastOwnMessageIdRef = useRef(null);

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
      const stageSize = 520;
      const minCropSize = 120;
      const initialCropSize = 360;
      const fitScale = Math.min(
        stageSize / image.width,
        stageSize / image.height
      );

      setAvatarCropper({
        objectUrl,
        image,
        imageWidth: image.width,
        imageHeight: image.height,
        stageSize,
        minCropSize,
        crop: {
          x: (stageSize - initialCropSize) / 2,
          y: (stageSize - initialCropSize) / 2,
          size: initialCropSize
        },
        zoom: 1,
        fitScale,
        imageX: (stageSize - image.width * fitScale) / 2,
        imageY: (stageSize - image.height * fitScale) / 2
      });

      setFormError("");
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setFormError("This image format is not supported by your browser");
    };

    image.src = objectUrl;
  }

  function closeAvatarCropper() {
    if (avatarCropper?.objectUrl) {
      URL.revokeObjectURL(avatarCropper.objectUrl);
    }

    setAvatarCropper(null);
    setCropDrag(null);

    const input = document.querySelector(".avatarEditButton input");
    if (input) input.value = "";
  }

  function beginCropDrag(event, mode, handle = null) {
    if (!avatarCropper) return;

    event.preventDefault();
    event.stopPropagation();

    setCropDrag({
      mode,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      startCrop: { ...avatarCropper.crop },
      startImageX: avatarCropper.imageX,
      startImageY: avatarCropper.imageY
    });

    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveCropDrag(event) {
    if (!avatarCropper || !cropDrag) return;

    const dx = event.clientX - cropDrag.startX;
    const dy = event.clientY - cropDrag.startY;
    const stageSize = avatarCropper.stageSize;

    if (cropDrag.mode === "image") {
      setAvatarCropper((current) => ({
        ...current,
        imageX: cropDrag.startImageX + dx,
        imageY: cropDrag.startImageY + dy
      }));
      return;
    }

    if (cropDrag.mode === "crop") {
      const size = cropDrag.startCrop.size;
      const x = Math.max(
        0,
        Math.min(stageSize - size, cropDrag.startCrop.x + dx)
      );
      const y = Math.max(
        0,
        Math.min(stageSize - size, cropDrag.startCrop.y + dy)
      );

      setAvatarCropper((current) => ({
        ...current,
        crop: { x, y, size }
      }));
      return;
    }

    if (cropDrag.mode === "resize") {
      const start = cropDrag.startCrop;
      const minSize = avatarCropper.minCropSize;
      let size = start.size;
      let x = start.x;
      let y = start.y;

      if (cropDrag.handle === "se") {
        size = Math.max(minSize, start.size + Math.max(dx, dy));
      }

      if (cropDrag.handle === "sw") {
        size = Math.max(minSize, start.size + Math.max(-dx, dy));
        x = start.x + start.size - size;
      }

      if (cropDrag.handle === "ne") {
        size = Math.max(minSize, start.size + Math.max(dx, -dy));
        y = start.y + start.size - size;
      }

      if (cropDrag.handle === "nw") {
        size = Math.max(minSize, start.size + Math.max(-dx, -dy));
        x = start.x + start.size - size;
        y = start.y + start.size - size;
      }

      size = Math.min(size, stageSize);
      x = Math.max(0, Math.min(stageSize - size, x));
      y = Math.max(0, Math.min(stageSize - size, y));

      setAvatarCropper((current) => ({
        ...current,
        crop: { x, y, size }
      }));
    }
  }

  function endCropDrag() {
    setCropDrag(null);
  }

  function applyAvatarCrop() {
    if (!avatarCropper) return;

    const {
      image,
      crop,
      fitScale,
      imageX,
      imageY
    } = avatarCropper;

    const scale = fitScale;
    const sourceX = (crop.x - imageX) / scale;
    const sourceY = (crop.y - imageY) / scale;
    const sourceSize = crop.size / scale;
    const outputSize = 512;

    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;

    const context = canvas.getContext("2d", { alpha: true });
    context.clearRect(0, 0, outputSize, outputSize);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      outputSize,
      outputSize
    );

    let quality = 0.92;
    let dataUrl = canvas.toDataURL("image/webp", quality);

    while (dataUrl.length > 900000 && quality > 0.45) {
      quality -= 0.08;
      dataUrl = canvas.toDataURL("image/webp", quality);
    }

    if (dataUrl.length > 1000000) {
      setFormError("This image could not be compressed enough.");
      return;
    }

    setAvatarPreview(dataUrl);
    if (settingsOpen) {
      setProfileForm((current) => ({
        ...current,
        avatar_url: dataUrl
      }));
    }
    setFormError("");
    closeAvatarCropper();
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

  function openProfile(user) {
    if (!user) return;
    setUserProfile(user);
    setUserMenu(null);
  }

  function isFriend(userId) {
    return friends.some((friend) => friend.id === userId);
  }

  function scrollMessagesToBottom(behavior = "smooth") {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior,
        block: "end"
      });
    });
  }

  function jumpToMessage(messageId) {
    const element = document.getElementById(`message_${messageId}`);

    if (!element) {
      setUiError("The original message is not loaded.");
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

    element.classList.remove("messageJumpHighlight");
    void element.offsetWidth;
    element.classList.add("messageJumpHighlight");

    window.setTimeout(() => {
      element.classList.remove("messageJumpHighlight");
    }, 1400);
  }

  async function removeFriend(user) {
    setConfirmDialog(null);
    setUserMenu(null);
    setChatActionsOpen(false);

    try {
      await api("/api/friends/remove", {
        method: "POST",
        body: JSON.stringify({ user_id: user.id })
      });

      setFriends((current) =>
        current.filter((friend) => friend.id !== user.id)
      );

      setSocialToast({
        title: "Friend Removed",
        text: `${user.display_name || user.username} was removed from your friends.`
      });
    } catch (error) {
      setUiError(error.message);
    }
  }

  async function blockUser(user) {
    setConfirmDialog(null);
    setUserMenu(null);
    setChatActionsOpen(false);
    setUiError(
      `Blocking ${user.display_name || user.username} is not available yet.`
    );
  }

  async function deleteChat(chat) {
    setConfirmDialog(null);
    setUserMenu(null);
    setChatActionsOpen(false);

    try {
      await api("/api/chats/delete", {
        method: "POST",
        body: JSON.stringify({ chat_id: chat.id })
      });

      setChats((current) => current.filter((item) => item.id !== chat.id));

      if (activeChat?.id === chat.id) {
        setActiveChat(null);
        setMessages([]);
        setView("friends");
      }
    } catch (error) {
      setUiError(error.message);
    }
  }

  function ensureSaveCooldown() {
    const now = Date.now();

    if (saveCooldownUntil > now) {
      const seconds = Math.ceil((saveCooldownUntil - now) / 1000);
      setUiError(`Please wait ${seconds} second${seconds === 1 ? "" : "s"} before saving again.`);
      return false;
    }

    setSaveCooldownUntil(now + 5000);
    return true;
  }

  async function resolveClientLocation() {
    try {
      const response = await fetch("https://www.cloudflare.com/cdn-cgi/trace", {
        cache: "no-store"
      });
      const text = await response.text();
      const values = Object.fromEntries(
        text
          .trim()
          .split("\\n")
          .map((line) => line.split("=", 2))
      );

      setClientLocation((current) => ({
        ...current,
        country: values.loc || current.country
      }));
    } catch {
      // Country fallback is optional.
    }

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      const parts = timezone.split("/");
      const city = parts.length > 1
        ? parts[parts.length - 1].replaceAll("_", " ")
        : "";

      setClientLocation((current) => ({
        ...current,
        city: current.city || city
      }));
    } catch {
      // Browser timezone fallback is optional.
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

    if (!profileDraftInitialized && data.user) {
      setUsername(data.user.username || "");
      setDisplayName(data.user.username ? (data.user.display_name || "") : "");
      setAvatarPreview(
        data.user.username
          ? (data.user.avatar_url || "/default-avatar.png")
          : "/default-avatar.png"
      );
      setProfileDraftInitialized(true);
    }
  }

  async function loadSocial() {
    const [friendsData, requestsData, chatsData] = await Promise.all([
      api("/api/friends"),
      api("/api/friends/requests"),
      api("/api/chats")
    ]);

    const nextChats = chatsData.chats || [];

    if (notificationsReadyRef.current) {
      for (const chat of nextChats) {
        const latest = chat.latest_message;
        if (!latest?.id) continue;

        const previousId = previousChatLatestRef.current.get(chat.id);

        if (
          previousId &&
          previousId !== latest.id &&
          latest.sender_user_id !== auth.user?.id
        ) {
          const directlyViewingThisChat =
            document.visibilityState === "visible" &&
            view === "chat" &&
            activeChat?.id === chat.id;

          if (!directlyViewingThisChat && soundEnabled && messageAudioRef.current) {
            try {
              messageAudioRef.current.currentTime = 0;
              messageAudioRef.current.volume = 0.65;
              await messageAudioRef.current.play();
            } catch {
              // Browser may block audio until the first user interaction.
            }
          }
        }
      }
    }

    previousChatLatestRef.current = new Map(
      nextChats
        .filter((chat) => chat.latest_message?.id)
        .map((chat) => [chat.id, chat.latest_message.id])
    );
    notificationsReadyRef.current = true;

    const nextFriends = friendsData.friends || [];
    const nextIncoming = requestsData.incoming || [];

    if (socialReadyRef.current) {
      const newRequest = nextIncoming.find(
        (item) => !previousIncomingIdsRef.current.has(item.id)
      );

      const newFriend = nextFriends.find(
        (item) => !previousFriendIdsRef.current.has(item.id)
      );

      if (newRequest) {
        setSocialToast({
          title: "New Friend Request",
          text: `${newRequest.display_name || newRequest.username} sent you a friend request`
        });
      } else if (newFriend) {
        setSocialToast({
          title: "Friend Request Accepted",
          text: `${newFriend.display_name || newFriend.username} is now your friend`
        });
      }
    }

    previousIncomingIdsRef.current = new Set(nextIncoming.map((item) => item.id));
    previousFriendIdsRef.current = new Set(nextFriends.map((item) => item.id));
    socialReadyRef.current = true;

    setFriends(nextFriends);
    setIncoming(nextIncoming);
    setOutgoing(requestsData.outgoing || []);
    setChats(nextChats);
    setActiveChat((current) => {
      if (!current) return null;
      return nextChats.find((chat) => chat.id === current.id) || current;
    });
    setUserProfile((current) => {
      if (!current) return null;
      const fromChat = nextChats.find(
        (chat) => chat.other_user?.id === current.id
      )?.other_user;
      const fromFriend = nextFriends.find((friend) => friend.id === current.id);
      return fromChat || fromFriend || current;
    });
  }

  async function loadMessages(chat) {
    if (!chat?.id) return;

    const data = await api(
      `/api/messages?chat_id=${encodeURIComponent(chat.id)}&limit=100`
    );
    const serverMessages = data.messages || [];

    setMessages((current) => {
      const serverClientIds = new Set(
        serverMessages
          .map((message) => message.client_message_id)
          .filter(Boolean)
      );

      const pendingOptimistic = current.filter(
        (message) =>
          message.optimistic &&
          message.chat_id === chat.id &&
          !serverClientIds.has(message.client_message_id)
      );

      const combined = [...serverMessages, ...pendingOptimistic];
      const seen = new Set();

      return combined
        .filter((message) => {
          const key = message.client_message_id
            ? `client:${message.client_message_id}`
            : `id:${message.id}`;

          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
        );
    });
  }

  useEffect(() => {
    loadMe().catch(() => {
      setAuth({ loading: false, authenticated: false, user: null });
    });
  }, []);

  useEffect(() => {
    resolveClientLocation();
  }, []);

  useEffect(() => {
    function closeMenu() {
      setMessageMenu(null);
      setUserMenu(null);
      setChatActionsOpen(false);
      setStatusMenuOpen(false);
    }

    window.addEventListener("click", closeMenu);
    window.addEventListener("blur", closeMenu);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("blur", closeMenu);
    };
  }, []);

  useEffect(() => {
    const audio = new Audio("/message.mp3");
    audio.preload = "auto";
    audio.volume = 0.65;
    messageAudioRef.current = audio;

    return () => {
      audio.pause();
      messageAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!auth.authenticated) return;

    const timer = window.setInterval(() => {
      loadMe().catch(() => {});
    }, 650);

    return () => window.clearInterval(timer);
  }, [auth.authenticated]);

  useEffect(() => {
    if (
      !auth.authenticated ||
      auth.user?.access_status !== "approved" ||
      !auth.user?.username
    ) {
      return;
    }

    let stopped = false;

    async function heartbeat() {
      if (stopped) return;

      try {
        const data = await api("/api/presence/heartbeat", {
          method: "POST",
          body: JSON.stringify({})
        });

        setAuth((current) => ({
          ...current,
          user: current.user
            ? {
                ...current.user,
                effective_status: data.effective_status,
                last_seen_at: data.last_seen_at
              }
            : current.user
        }));
      } catch {
        // Presence failures must not break the app.
      }
    }

    heartbeat();
    const timer = window.setInterval(heartbeat, 5000);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [
    auth.authenticated,
    auth.user?.access_status,
    auth.user?.username,
    auth.user?.status_preference
  ]);

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
    if (!turnstileSiteKey || auth.user?.username || !captchaStarted) return;

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
        callback: () => {
          setCaptchaVerified(true);
          setFormError("");
        },
        "expired-callback": () => {
          setCaptchaVerified(false);
          setFormError("Cloudflare verification expired. Complete it again.");
        },
        "error-callback": () => {
          setCaptchaVerified(false);
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
  }, [turnstileSiteKey, auth.user?.username, captchaStarted]);

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
    }, 1000);

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
    if (!activeChat?.id) {
      setChatText("");
      setEditingMessage(null);
      setReplyingTo(null);
      return;
    }

    draftHydratingRef.current = true;

    try {
      const raw = localStorage.getItem(getDraftKey(activeChat.id));
      const draft = raw ? JSON.parse(raw) : null;

      setChatText(draft?.text || "");

      const editTarget = draft?.editingMessageId
        ? messages.find((message) => message.id === draft.editingMessageId)
        : null;
      const replyTarget = draft?.replyingToId
        ? messages.find((message) => message.id === draft.replyingToId)
        : null;

      setEditingMessage(editTarget || null);
      setReplyingTo(replyTarget || null);
    } catch {
      setChatText("");
      setEditingMessage(null);
      setReplyingTo(null);
    }

    queueMicrotask(() => {
      draftHydratingRef.current = false;
    });
  }, [activeChat?.id]);

  useEffect(() => {
    if (draftHydratingRef.current || !activeChat?.id) return;
    persistCurrentDraft();
  }, [
    chatText,
    editingMessage?.id,
    replyingTo?.id,
    activeChat?.id
  ]);

  useEffect(() => {
    function persistBeforeLeave() {
      persistCurrentDraft();
    }

    window.addEventListener("beforeunload", persistBeforeLeave);
    document.addEventListener("visibilitychange", persistBeforeLeave);

    return () => {
      window.removeEventListener("beforeunload", persistBeforeLeave);
      document.removeEventListener("visibilitychange", persistBeforeLeave);
    };
  }, [chatText, editingMessage?.id, replyingTo?.id, activeChat?.id]);

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

    if (turnstileSiteKey && (!captchaStarted || !captchaVerified || !turnstileToken)) {
      setFormError("Click Verify and complete the Cloudflare check");
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
      setCaptchaVerified(false);
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

  async function loadSessions() {
    setLoadingSessions(true);

    try {
      const params = new URLSearchParams({
        country: clientLocation.country || "",
        city: clientLocation.city || "",
        region: clientLocation.region || ""
      });
      const data = await api(`/api/sessions?${params.toString()}`);
      setSessions(data.sessions || []);
    } catch (error) {
      setUiError(error.message);
    } finally {
      setLoadingSessions(false);
    }
  }

  async function revokeSession(sessionId) {
    try {
      await api("/api/sessions/revoke", {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId })
      });
      await loadSessions();
    } catch (error) {
      setUiError(error.message);
    }
  }

  async function revokeOtherSessions() {
    try {
      await api("/api/sessions/revoke-all", {
        method: "POST",
        body: JSON.stringify({ keep_current: true })
      });
      await loadSessions();
    } catch (error) {
      setUiError(error.message);
    }
  }

  async function updateStatus(status) {
    setStatusMenuOpen(false);

    try {
      const data = await api("/api/presence/status", {
        method: "POST",
        body: JSON.stringify({ status })
      });

      setAuth((current) => ({
        ...current,
        user: current.user
          ? {
              ...current.user,
              status_preference: data.status_preference,
              effective_status: data.effective_status
            }
          : current.user
      }));

      setFriends((current) =>
        current.map((item) =>
          item.id === auth.user.id
            ? { ...item, effective_status: data.effective_status }
            : item
        )
      );
      setChats((current) => [...current]);
      loadSocial().catch(() => {});
    } catch (error) {
      setUiError(error.message);
    }
  }

  async function saveProfileSettings(event) {
    event.preventDefault();

    if (!ensureSaveCooldown()) return;

    setSavingSettings(true);
    setUiError("");

    try {
      const data = await api("/api/user/profile", {
        method: "POST",
        body: JSON.stringify(profileForm)
      });

      setAuth((current) => ({
        ...current,
        user: current.user
          ? {
              ...current.user,
              username: data.username,
              display_name: data.display_name,
              avatar_url: data.avatar_url,
              pronouns: data.pronouns,
              bio: data.bio,
              banner_color: data.banner_color
            }
          : current.user
      }));
      setUsername(data.username);
      setDisplayName(data.display_name);
      setAvatarPreview(data.avatar_url || "/default-avatar.png");
      setProfileForm((current) => ({
        ...current,
        username: data.username,
        display_name: data.display_name,
        avatar_url: data.avatar_url,
        pronouns: data.pronouns,
        bio: data.bio,
        banner_color: data.banner_color
      }));
      loadSocial().catch(() => {});
    } catch (error) {
      setUiError(error.message);
    } finally {
      setSavingSettings(false);
    }
  }

  function getDraftKey(chatId) {
    return chatId ? `vodkach_draft_${auth.user?.id || "user"}_${chatId}` : null;
  }

  function persistCurrentDraft(nextText = chatText, nextEditing = editingMessage, nextReply = replyingTo) {
    const key = getDraftKey(activeChat?.id);
    if (!key) return;

    const payload = {
      text: nextText,
      editingMessageId: nextEditing?.id || null,
      editingOriginalText: nextEditing?.body_ciphertext || null,
      replyingToId: nextReply?.id || null,
      updatedAt: Date.now()
    };

    if (!payload.text && !payload.editingMessageId && !payload.replyingToId) {
      localStorage.removeItem(key);
      return;
    }

    localStorage.setItem(key, JSON.stringify(payload));
  }

  async function deleteMessage(message) {
    setMessageMenu(null);

    try {
      await api("/api/messages/delete", {
        method: "POST",
        body: JSON.stringify({
          message_id: message.id
        })
      });

      setMessages((current) =>
        current.filter((item) => item.id !== message.id)
      );
    } catch (error) {
      setUiError(error.message);
    }
  }

  async function saveEditedMessage() {
    if (!editingMessage) return;

    const text = chatText.trim();
    if (!text) return;

    const target = editingMessage;
    setEditingMessage(null);
    setChatText("");

    try {
      const data = await api("/api/messages/edit", {
        method: "POST",
        body: JSON.stringify({
          message_id: target.id,
          body_ciphertext: text
        })
      });

      const draftKey = getDraftKey(target.chat_id || activeChat?.id);
      if (draftKey) localStorage.removeItem(draftKey);

      setMessages((current) =>
        current.map((message) =>
          message.id === target.id
            ? {
                ...message,
                body_ciphertext: text,
                edited_at: data.message?.edited_at || new Date().toISOString()
              }
            : message
        )
      );
    } catch (error) {
      setChatText(text);
      setEditingMessage(target);
      setUiError(error.message);
    }
  }

  function beginReply(message) {
    setMessageMenu(null);
    setEditingMessage(null);
    setReplyingTo(message);
    requestAnimationFrame(() => {
      document.querySelector(".composerForm input")?.focus();
    });
  }

  function beginEdit(message) {
    setMessageMenu(null);
    setReplyingTo(null);
    setEditingMessage(message);
    setChatText(message.body_ciphertext || "");
    requestAnimationFrame(() => {
      document.querySelector(".composerForm input")?.focus();
    });
  }

  async function sendMessage(event) {
    event.preventDefault();

    const text = chatText.trim();
    const chatId = activeChat?.id;

    if (editingMessage) {
      await saveEditedMessage();
      return;
    }

    if (!text || !chatId || sendingMessageRef.current) return;

    sendingMessageRef.current = true;
    setSendingMessage(true);
    setUiError("");

    const clientMessageId = crypto.randomUUID();
    const optimisticId = `optimistic_${clientMessageId}`;

    const optimisticMessage = {
      id: optimisticId,
      chat_id: chatId,
      sender_user_id: auth.user.id,
      sender_device_id: localStorage.getItem(DEVICE_ID_KEY) || null,
      client_message_id: clientMessageId,
      body_ciphertext: text,
      body_algorithm: "plain-v0",
      created_at: new Date().toISOString(),
      sender: auth.user,
      reply_to_message_id: replyingTo?.id || null,
      reply_to: replyingTo
        ? {
            id: replyingTo.id,
            sender_name:
              replyingTo.sender?.display_name ||
              replyingTo.sender?.username ||
              "User",
            text: replyingTo.body_ciphertext
          }
        : null,
      optimistic: true
    };

    lastOwnMessageIdRef.current = optimisticId;
    setMessages((current) => [...current, optimisticMessage]);
    setChatText("");
    setReplyingTo(null);
    scrollMessagesToBottom("smooth");

    try {
      const data = await api("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          chat_id: chatId,
          body_ciphertext: text,
          body_algorithm: "plain-v0",
          client_message_id: clientMessageId,
          sender_device_id: localStorage.getItem(DEVICE_ID_KEY) || null,
          reply_to_message_id: replyingTo?.id || null
        })
      });

      const draftKey = getDraftKey(chatId);
      if (draftKey) localStorage.removeItem(draftKey);

      if (data.message) {
        setMessages((current) =>
          current.map((message) =>
            message.id === optimisticId
              ? {
                  ...data.message,
                  sender: auth.user,
                  optimistic: false
                }
              : message
          )
        );
      }

      scrollMessagesToBottom("smooth");
      loadMessages({ id: chatId }).catch(() => {});
      loadSocial().catch(() => {});
    } catch (error) {
      setMessages((current) =>
        current.filter((message) => message.id !== optimisticId)
      );
      setChatText((current) => current || text);
      setUiError(error.message);
    } finally {
      sendingMessageRef.current = false;
      setSendingMessage(false);
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
                  onClick={() => {
                    setAvatarPreview("/default-avatar.png");
                    const input = document.querySelector(".avatarEditButton input");
                    if (input) input.value = "";
                  }}
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
            <div className="captchaSection">
              {!captchaStarted ? (
                <button
                  className="captchaStartButton"
                  type="button"
                  onClick={() => {
                    setCaptchaStarted(true);
                    setCaptchaVerified(false);
                    setFormError("");
                  }}
                >
                  <span className="captchaCheckbox" aria-hidden="true" />
                  <span>
                    <strong>Verify you are human</strong>
                    <small>Cloudflare Turnstile</small>
                  </span>
                </button>
              ) : (
                <>
                  <div id="vodkach-turnstile" className="turnstileBox" />
                  {captchaVerified && (
                    <div className="captchaVerifiedState">
                      <span>✓</span>
                      Verification complete
                    </div>
                  )}
                </>
              )}
            </div>
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

        {avatarCropper && (
          <div className="avatarCropperOverlay" role="dialog" aria-modal="true">
            <div className="avatarCropperModal">
              <header className="avatarCropperHeader">
                <div>
                  <h2>Edit avatar</h2>
                  <p>Move and resize the square selection.</p>
                </div>

                <button
                  className="avatarCropperClose"
                  type="button"
                  onClick={closeAvatarCropper}
                  aria-label="Close"
                >
                  ×
                </button>
              </header>

              <div
                className="avatarCropperStage"
                style={{
                  width: avatarCropper.stageSize,
                  height: avatarCropper.stageSize
                }}
                onPointerMove={moveCropDrag}
                onPointerUp={endCropDrag}
                onPointerCancel={endCropDrag}
                onPointerLeave={(event) => {
                  if (event.buttons === 0) endCropDrag();
                }}
              >
                <img
                  className="avatarCropperImage"
                  src={avatarCropper.objectUrl}
                  alt=""
                  draggable="false"
                  style={{
                    width:
                      avatarCropper.imageWidth *
                      avatarCropper.fitScale,
                    height:
                      avatarCropper.imageHeight *
                      avatarCropper.fitScale,
                    transform: `translate(${avatarCropper.imageX}px, ${avatarCropper.imageY}px)`
                  }}
                />

                <div
                  className="avatarCropMask avatarCropMaskTop"
                  style={{ height: avatarCropper.crop.y }}
                />
                <div
                  className="avatarCropMask avatarCropMaskLeft"
                  style={{
                    top: avatarCropper.crop.y,
                    width: avatarCropper.crop.x,
                    height: avatarCropper.crop.size
                  }}
                />
                <div
                  className="avatarCropMask avatarCropMaskRight"
                  style={{
                    top: avatarCropper.crop.y,
                    left: avatarCropper.crop.x + avatarCropper.crop.size,
                    right: 0,
                    height: avatarCropper.crop.size
                  }}
                />
                <div
                  className="avatarCropMask avatarCropMaskBottom"
                  style={{
                    top: avatarCropper.crop.y + avatarCropper.crop.size
                  }}
                />

                <div
                  className="avatarCropSquare"
                  style={{
                    left: avatarCropper.crop.x,
                    top: avatarCropper.crop.y,
                    width: avatarCropper.crop.size,
                    height: avatarCropper.crop.size
                  }}
                  onPointerDown={(event) => beginCropDrag(event, "crop")}
                >
                  <span className="cropGridLine cropGridVertical one" />
                  <span className="cropGridLine cropGridVertical two" />
                  <span className="cropGridLine cropGridHorizontal one" />
                  <span className="cropGridLine cropGridHorizontal two" />

                  {["nw", "ne", "sw", "se"].map((handle) => (
                    <button
                      key={handle}
                      className={`cropHandle cropHandle-${handle}`}
                      type="button"
                      aria-label={`Resize ${handle}`}
                      onPointerDown={(event) =>
                        beginCropDrag(event, "resize", handle)
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="avatarCropperControls">
                <div className="avatarCropperActions">
                  <button type="button" onClick={closeAvatarCropper}>
                    Cancel
                  </button>
                  <button
                    className="primary"
                    type="button"
                    onClick={applyAvatarCrop}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setUserMenu({
                  user: chat.other_user,
                  chat,
                  x: Math.min(event.clientX, window.innerWidth - 220),
                  y: Math.min(event.clientY, window.innerHeight - 160)
                });
              }}
            >
              <AvatarWithStatus
                  user={chat.other_user}
                  className="chatListAvatarWrap"
                  alt="Chat avatar"
                />
              <span className="chatListIdentity">
                <span className="chatListPrimary">
                  <span>
                    {chat.other_user?.display_name ||
                      chat.other_user?.username ||
                      chat.title ||
                      "Direct chat"}
                  </span>
                  {chat.other_user?.verified ? (
                    <VerifiedBadge className="small" />
                  ) : null}
                </span>

                {chat.other_user?.username ? (
                  <span className="chatListSecondary">
                    @{chat.other_user.username}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </nav>

        <div className="bottomProfileBar">
          <button
            className="profileIdentityButton"
            type="button"
            title="Profile"
            onClick={() => openProfile(auth.user)}
          >
            <AvatarWithStatus
              user={auth.user}
              className="sidebarProfileAvatarWrap"
              alt="Profile avatar"
              clickableStatus
              onStatusClick={(event) => {
                event.stopPropagation();
                setStatusMenuOpen((open) => !open);
              }}
            />

            <span className="sidebarProfileText">
              <strong className="nameWithBadge">
                <span className="displayNameText">{currentDisplayName}</span>
                {auth.user.verified ? <VerifiedBadge /> : null}
              </strong>
              <span>@{auth.user.username}</span>
            </span>
          </button>

          {statusMenuOpen && (
            <div
              className="statusPicker"
              onClick={(event) => event.stopPropagation()}
            >
              {[
                ["online", "Online"],
                ["sleeping", "Sleeping"],
                ["dnd", "Do Not Disturb"],
                ["offline", "Invisible"]
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={
                    auth.user.status_preference === value ? "active" : ""
                  }
                  onClick={() => updateStatus(value)}
                >
                  <StatusGlyph status={value} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}

          <button
            className="profileSettingsButton"
            type="button"
            aria-label="Settings"
            onClick={() => {
              setProfileForm({
                username: auth.user.username || "",
                display_name: auth.user.display_name || "",
                pronouns: auth.user.pronouns || "",
                bio: auth.user.bio || "",
                avatar_url: auth.user.avatar_url || null,
                banner_color: auth.user.banner_color || "#5b1115"
              });
              setProfileFormInitialized(true);
              setSettingsOpen(true);
            }}
          >
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
                          <AvatarWithStatus
                          user={user}
                          className="socialAvatarWrap"
                          alt="User avatar"
                        />
                          <div
                            className="socialIdentity profileClickTarget"
                            onClick={() => openProfile(user)}
                          >
                            <strong className="nameWithBadge">
                              {user.display_name || user.username}
                              {user.verified ? <VerifiedBadge /> : null}
                            </strong>
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
                  <h2>Pending - {incoming.length + outgoing.length}</h2>
                  <div className="socialList">
                    {incoming.map((request) => (
                      <div className="socialRow" key={request.id}>
                        <AvatarWithStatus
                          user={request}
                          className="socialAvatarWrap"
                          alt="User avatar"
                        />
                        <div
                          className="socialIdentity profileClickTarget"
                          onClick={() => openProfile(request)}
                        >
                          <strong className="nameWithBadge">
                            <span className="displayNameText">
                              {request.display_name || request.username}
                            </span>
                            {request.verified ? <VerifiedBadge /> : null}
                          </strong>
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
                        <AvatarWithStatus
                          user={request}
                          className="socialAvatarWrap"
                          alt="User avatar"
                        />
                        <div
                          className="socialIdentity profileClickTarget"
                          onClick={() => openProfile(request)}
                        >
                          <strong className="nameWithBadge">
                            <span className="displayNameText">
                              {request.display_name || request.username}
                            </span>
                            {request.verified ? <VerifiedBadge /> : null}
                          </strong>
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
                  <h2>All Friends - {friends.length}</h2>
                  <div className="socialList">
                    {friends.length === 0 && (
                      <div className="socialEmpty">No friends yet.</div>
                    )}
                    {friends.map((friend) => (
                      <div className="socialRow" key={friend.id}>
                        <AvatarWithStatus
                          user={friend}
                          className="socialAvatarWrap"
                          alt="User avatar"
                        />
                        <div
                          className="socialIdentity profileClickTarget"
                          onClick={() => openProfile(friend)}
                        >
                          <strong className="nameWithBadge">
                            <span className="displayNameText">
                              {friend.display_name || friend.username}
                            </span>
                            {friend.verified ? <VerifiedBadge /> : null}
                          </strong>
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
              <div className="chatHeaderDisplayName">
                {activeChat.other_user?.display_name ||
                  activeChat.other_user?.username ||
                  "Direct Chat"}
              </div>
              <div className="chatHeaderActions">
                <button type="button" aria-label="Start call">
                  <Phone size={18} />
                </button>
                <button
                  type="button"
                  aria-label="Chat actions"
                  onClick={(event) => {
                    event.stopPropagation();
                    setChatActionsOpen((open) => !open);
                  }}
                >
                  <MoreVertical size={19} />
                </button>

                {chatActionsOpen && (
                  <div
                    className="chatActionsMenu"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => openProfile(activeChat.other_user)}
                    >
                      View Profile
                    </button>
                    {isFriend(activeChat.other_user.id) && (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDialog({
                            title: "Remove Friend?",
                            text: `Remove ${
                              activeChat.other_user.display_name ||
                              activeChat.other_user.username
                            } from your friends?`,
                            confirmText: "Remove Friend",
                            action: () => removeFriend(activeChat.other_user)
                          })
                        }
                      >
                        Remove Friend
                      </button>
                    )}

                    <button
                      className="muted"
                      type="button"
                      onClick={() =>
                        setConfirmDialog({
                          title: "Block User?",
                          text: `Block ${
                            activeChat.other_user.display_name ||
                            activeChat.other_user.username
                          }? They will be removed from your friends and chats.`,
                          confirmText: "Continue",
                          action: () => blockUser(activeChat.other_user)
                        })
                      }
                    >
                      Block
                    </button>
                    <button
                      className="danger"
                      type="button"
                      onClick={() =>
                        setConfirmDialog({
                          title: "Delete Chat?",
                          text: "This permanently deletes the chat and all messages for both participants.",
                          confirmText: "Delete Chat",
                          action: () => deleteChat(activeChat)
                        })
                      }
                    >
                      Delete Chat
                    </button>
                  </div>
                )}
              </div>
            </header>

            <div className="appMessages" ref={messagesViewportRef}>
              {messages.length === 0 && (
                <div className="chatStart redesigned">
                  <div className="chatStartVisual">
                    <AvatarWithStatus
                      user={activeChat?.other_user}
                      className="chatStartAvatarWrap"
                      alt="Chat avatar"
                    />
                  </div>
                  <h2 className="nameWithBadge chatStartName">
                    <span className="displayNameText">{activeTitle}</span>
                    {activeChat.other_user?.verified ? (
                      <VerifiedBadge />
                    ) : null}
                  </h2>
                  <span>@{activeChat.other_user?.username}</span>
                  <p>
                    This is the beginning of your conversation. Say hello and
                    start something good.
                  </p>
                  <button
                    type="button"
                    onClick={() => openProfile(activeChat.other_user)}
                  >
                    View Profile
                  </button>
                </div>
              )}

              {messages
                .filter((message) => !message.deleted_at)
                .map((message, index, visibleMessages) => (
                <AppMessage
                  key={message.id}
                  message={message}
                  grouped={shouldGroupMessage(visibleMessages[index - 1], message)}
                  avatarUrl={getAvatar(message.sender)}
                  name={message.sender?.display_name || message.sender?.username || "User"}
                  verified={Boolean(message.sender?.verified)}
                  time={formatLocalTime(message.created_at)}
                  text={message.body_ciphertext}
                  onOpenLink={(link) => setLinkWarning(link)}
                  onOpenProfile={() => openProfile(message.sender)}
                  onJumpToReply={() =>
                    message.reply_to_message_id
                      ? jumpToMessage(message.reply_to_message_id)
                      : null
                  }
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    setMessageMenu({
                      message,
                      x: Math.min(event.clientX, window.innerWidth - 210),
                      y: Math.min(event.clientY, window.innerHeight - 170)
                    });
                  }}
                />
              ))}

              <div ref={messagesEndRef} className="messagesEndAnchor" />

              {deviceState.error && (
                <div className="deviceError">
                  Device key setup failed: {deviceState.error}
                </div>
              )}
            </div>

            <form className="messageComposer composerForm" onSubmit={sendMessage}>
              {(replyingTo || editingMessage) && (
                <div className="composerContext">
                  <div>
                    <strong>
                      {editingMessage
                        ? "Editing message"
                        : `Replying to ${
                            replyingTo.sender?.display_name ||
                            replyingTo.sender?.username ||
                            "User"
                          }`}
                    </strong>
                    <span>
                      {(editingMessage?.body_ciphertext ||
                        replyingTo?.body_ciphertext ||
                        "").slice(0, 90)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(null);
                      setEditingMessage(null);
                      setChatText("");
                    }}
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="composerInputRow">
                <input
                  value={chatText}
                  onChange={(event) => setChatText(event.target.value)}
                  placeholder={
                    editingMessage ? "Edit message" : `Message ${activeTitle}`
                  }
                  maxLength={4000}
                />
                <button type="submit" disabled={!chatText.trim() || sendingMessage}>
                  {editingMessage ? "Save" : "Send"}
                </button>
              </div>
            </form>
          </>
        )}

        {messageMenu && (
          <div
            className="messageContextMenu"
            style={{
              left: messageMenu.x,
              top: messageMenu.y
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" onClick={() => beginReply(messageMenu.message)}>
              <ReplyActionIcon />
              <span>Reply</span>
            </button>

            {messageMenu.message.sender_user_id === auth.user.id &&
              !messageMenu.message.deleted_at && (
                <button
                  type="button"
                  onClick={() => beginEdit(messageMenu.message)}
                >
                  <EditActionIcon />
                  <span>Edit</span>
                </button>
              )}

            <button
              className="danger"
              type="button"
              onClick={() => deleteMessage(messageMenu.message)}
            >
              <DeleteActionIcon />
              <span>Delete For Everyone</span>
            </button>
          </div>
        )}

        {userMenu && (
          <div
            className="userContextMenu"
            style={{
              left: userMenu.x,
              top: userMenu.y
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" onClick={() => openProfile(userMenu.user)}>
              View Profile
            </button>
            {isFriend(userMenu.user.id) && (
              <button
                type="button"
                onClick={() =>
                  setConfirmDialog({
                    title: "Remove Friend?",
                    text: `Remove ${
                      userMenu.user.display_name || userMenu.user.username
                    } from your friends?`,
                    confirmText: "Remove Friend",
                    action: () => removeFriend(userMenu.user)
                  })
                }
              >
                Remove Friend
              </button>
            )}

            <button
              className="muted"
              type="button"
              onClick={() =>
                setConfirmDialog({
                  title: "Block User?",
                  text: `Block ${
                    userMenu.user.display_name || userMenu.user.username
                  }? They will be removed from your friends and chats.`,
                  confirmText: "Block",
                  action: () => blockUser(userMenu.user)
                })
              }
            >
              Block
            </button>
            {userMenu.chat && (
              <button
                className="danger"
                type="button"
                onClick={() =>
                  setConfirmDialog({
                    title: "Delete Chat?",
                    text: "This permanently deletes the chat and all messages for both participants.",
                    confirmText: "Delete Chat",
                    action: () => deleteChat(userMenu.chat)
                  })
                }
              >
                Delete Chat
              </button>
            )}
          </div>
        )}

        {userProfile && (
          <div className="profileModalOverlay" role="dialog" aria-modal="true">
            <div className="profileModal">
              <button
                className="profileModalClose"
                type="button"
                onClick={() => setUserProfile(null)}
              >
                ×
              </button>
              <div
                className="profileModalBanner"
                style={{
                  background:
                    userProfile.banner_color || "#5b1115"
                }}
              />
              <div className="profileModalBody">
                <AvatarWithStatus
                  user={userProfile}
                  className="profileModalAvatar"
                  alt="Profile avatar"
                />
                <h2 className="nameWithBadge">
                  <span className="displayNameText">
                    {userProfile.display_name || userProfile.username}
                  </span>
                  {userProfile.verified ? <VerifiedBadge /> : null}
                </h2>
                <div className="memberHandleLine">
                  <span>@{userProfile.username}</span>
                  {userProfile.pronouns ? (
                    <span>{userProfile.pronouns}</span>
                  ) : null}
                </div>

                {userProfile.bio ? (
                  <div className="profileModalSection">
                    <strong>About Me</strong>
                    <p>
                      {splitTextWithLinks(userProfile.bio).map((part, index) =>
                        part.type === "link" ? (
                          <button
                            key={`${part.value}_${index}`}
                            className="profileBioLink"
                            type="button"
                            onClick={() =>
                              setLinkWarning({
                                href: part.href,
                                label: part.value
                              })
                            }
                          >
                            {part.value}
                          </button>
                        ) : (
                          <span key={`${part.value}_${index}`}>
                            {part.value}
                          </span>
                        )
                      )}
                    </p>
                  </div>
                ) : null}

                {userProfile.id !== auth.user.id && (
                  <div className="profileModalActions">
                    {isFriend(userProfile.id) ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            openFriendChat(userProfile);
                            setUserProfile(null);
                          }}
                        >
                          Message
                        </button>
                        <button
                          className="secondary"
                          type="button"
                          onClick={() =>
                            setConfirmDialog({
                              title: "Remove Friend?",
                              text: `Remove ${
                                userProfile.display_name ||
                                userProfile.username
                              } from your friends?`,
                              confirmText: "Remove Friend",
                              action: () => removeFriend(userProfile)
                            })
                          }
                        >
                          Remove Friend
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => sendFriendRequest(userProfile)}
                        >
                          Add Friend
                        </button>
                        <button
                          className="secondary"
                          type="button"
                          onClick={() => {
                            const existing = chats.find(
                              (chat) =>
                                chat.other_user?.id === userProfile.id
                            );
                            if (existing) {
                              setActiveChat(existing);
                              setView("chat");
                              setUserProfile(null);
                            }
                          }}
                        >
                          Message
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {confirmDialog && (
          <div className="confirmOverlay" role="dialog" aria-modal="true">
            <div className="confirmModal">
              <h2>{confirmDialog.title}</h2>
              <p>{confirmDialog.text}</p>
              <div>
                <button type="button" onClick={() => setConfirmDialog(null)}>
                  Cancel
                </button>
                <button
                  className="danger"
                  type="button"
                  onClick={confirmDialog.action}
                >
                  {confirmDialog.confirmText}
                </button>
              </div>
            </div>
          </div>
        )}

        {socialToast && (
          <button
            className="socialToast"
            type="button"
            onClick={() => setSocialToast(null)}
          >
            <strong>{socialToast.title}</strong>
            <span>{socialToast.text}</span>
          </button>
        )}

        {linkWarning && (
          <div className="linkWarningOverlay" role="dialog" aria-modal="true">
            <div className="linkWarningModal">
              <h2>Open External Link?</h2>
              <p>
                Are you sure you want to open this link in another tab?
              </p>
              <code>{linkWarning.label}</code>
              <div>
                <button type="button" onClick={() => setLinkWarning(null)}>
                  Cancel
                </button>
                <button
                  className="primary"
                  type="button"
                  onClick={() => {
                    window.open(linkWarning.href, "_blank", "noopener,noreferrer");
                    setLinkWarning(null);
                  }}
                >
                  Open Link
                </button>
              </div>
            </div>
          </div>
        )}

        {settingsOpen && (
          <div className="settingsOverlay" role="dialog" aria-modal="true">
            <div className="settingsModal">
              <aside className="settingsModalNav">
                <div className="settingsNavUser">
                  <img src={getAvatar(auth.user)} alt="Profile avatar" />
                  <div>
                    <strong>{currentDisplayName}</strong>
                    <span>@{auth.user.username}</span>
                  </div>
                </div>

                <h2>User Settings</h2>
                <button
                  className={settingsTab === "account" ? "active" : ""}
                  type="button"
                  onClick={() => setSettingsTab("account")}
                >
                  <SettingsNavIcon type="account" />
                  My Account
                </button>
                <button
                  className={settingsTab === "notifications" ? "active" : ""}
                  type="button"
                  onClick={() => setSettingsTab("notifications")}
                >
                  <SettingsNavIcon type="notifications" />
                  Notifications
                </button>
                <button
                  className={settingsTab === "sessions" ? "active" : ""}
                  type="button"
                  onClick={() => {
                    setSettingsTab("sessions");
                    loadSessions();
                  }}
                >
                  <SettingsNavIcon type="sessions" />
                  Active Sessions
                </button>
                <div className="settingsNavDivider" />
                <button type="button" className="danger" onClick={logout}>
                  Log Out
                </button>
              </aside>

              <section className="settingsModalContent">
                <button
                  className="settingsCloseButton"
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  aria-label="Close settings"
                >
                  ×
                </button>

                {settingsTab === "account" && (
                  <form className="profileSettingsForm accountSettingsForm" onSubmit={saveProfileSettings}>
                    <h1>My Account</h1>

                    <div
                      className="settingsAccountHero"
                      style={{
                        "--account-banner":
                          profileForm.banner_color || "#5b1115"
                      }}
                    >
                      <div className="settingsAccountBanner" />
                      <div className="settingsAccountBody">
                        <div className="settingsAccountAvatarEditor">
                          <img
                            className="settingsAccountAvatarImage"
                            src={profileForm.avatar_url || "/default-avatar.png"}
                            alt="Profile avatar"
                            draggable="false"
                          />
                          <label className="settingsAvatarEditButton" title="Upload avatar">
                            <span className="customPencilIcon" aria-hidden="true" />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(event) =>
                                handleAvatarFile(event.target.files?.[0])
                              }
                            />
                          </label>
                          <button
                            className="settingsAvatarClearButton"
                            type="button"
                            onClick={() =>
                              setProfileForm((current) => ({
                                ...current,
                                avatar_url: null
                              }))
                            }
                          >
                            ×
                          </button>
                        </div>

                        <div className="settingsAccountIdentity">
                          <strong className="nameWithBadge">
                            <span className="displayNameText">
                              {profileForm.display_name ||
                                currentDisplayName}
                            </span>
                            {auth.user.verified ? <VerifiedBadge /> : null}
                          </strong>
                          <span>@{profileForm.username || auth.user.username}</span>
                          <small>{auth.user.email}</small>
                        </div>
                      </div>
                    </div>

                    <section className="accountSettingsSection">
                      <h2>Profile Information</h2>

                      <div className="settingsFormGrid">
                        <label>
                          <span>Username</span>
                          <input
                            value={profileForm.username}
                            onChange={(event) =>
                              setProfileForm((current) => ({
                                ...current,
                                username: event.target.value
                              }))
                            }
                            maxLength={16}
                            placeholder="username"
                          />
                        </label>

                        <label>
                          <span>Display Name</span>
                          <input
                            value={profileForm.display_name}
                            onChange={(event) =>
                              setProfileForm((current) => ({
                                ...current,
                                display_name: event.target.value
                              }))
                            }
                            maxLength={16}
                            placeholder="Display name"
                          />
                        </label>

                        <label>
                          <span>Pronouns</span>
                          <input
                            value={profileForm.pronouns}
                            onChange={(event) =>
                              setProfileForm((current) => ({
                                ...current,
                                pronouns: event.target.value
                              }))
                            }
                            maxLength={16}
                            placeholder="e.g. he/him"
                          />
                        </label>

                        <label>
                          <span>Banner Color</span>
                          <div className="bannerColorField">
                            <input
                              type="color"
                              value={profileForm.banner_color || "#5b1115"}
                              onChange={(event) =>
                                setProfileForm((current) => ({
                                  ...current,
                                  banner_color: event.target.value
                                }))
                              }
                            />
                            <code>
                              {profileForm.banner_color || "#5b1115"}
                            </code>
                          </div>
                        </label>
                      </div>

                      <label>
                        <span>About Me</span>
                        <textarea
                          value={profileForm.bio}
                          onChange={(event) =>
                            setProfileForm((current) => ({
                              ...current,
                              bio: event.target.value
                            }))
                          }
                          maxLength={190}
                          rows={6}
                          placeholder="Tell people a little about yourself"
                        />
                        <small>{profileForm.bio.length}/190</small>
                      </label>
                    </section>

                    <button type="submit" disabled={savingSettings}>
                      {savingSettings ? "Saving..." : "Save Changes"}
                    </button>
                  </form>
                )}

                {settingsTab === "sessions" && (
                  <>
                    <div className="sessionsHeader">
                      <div>
                        <h1>Active Sessions</h1>
                        <p>Devices currently signed in to your Vodkach account.</p>
                      </div>
                      <button type="button" onClick={revokeOtherSessions}>
                        Log Out All Other Sessions
                      </button>
                    </div>

                    <div className="sessionsList">
                      {loadingSessions && (
                        <div className="settingsEmptyState">Loading sessions...</div>
                      )}

                      {!loadingSessions && sessions.length === 0 && (
                        <div className="settingsEmptyState">No active sessions.</div>
                      )}

                      {sessions.map((session) => (
                        <article className="sessionCard" key={session.id}>
                          <div className="sessionDeviceIcon">
                            <SettingsNavIcon type="sessions" />
                          </div>
                          <div className="sessionDetails">
                            <strong>
                              {session.device_name || "Unknown Browser"}
                              {session.current ? (
                                <span className="currentSessionLabel">Current</span>
                              ) : null}
                            </strong>
                            <span>
                              {[
                                session.city,
                                session.region,
                                session.country
                              ].filter(Boolean).join(", ") || "Location unavailable"} ·{" "}
                              {session.last_seen_at
                                ? `Active ${formatLocalDate(session.last_seen_at)} ${formatLocalTime(session.last_seen_at)}`
                                : "Last activity unknown"}
                            </span>
                            <small>
                              {session.user_agent ||
                                navigator.userAgent ||
                                "Device information unavailable"}
                            </small>
                          </div>
                          {!session.current && (
                            <button
                              type="button"
                              onClick={() => revokeSession(session.id)}
                            >
                              Log Out
                            </button>
                          )}
                        </article>
                      ))}
                    </div>
                  </>
                )}

                {settingsTab === "notifications" && (
                  <>
                    <h1>Notifications</h1>
                    <label className="settingsToggleRow">
                      <div>
                        <strong>Message sounds</strong>
                        <span>
                          Play a sound for messages outside your active chat.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={soundEnabled}
                        onChange={(event) => {
                          const enabled = event.target.checked;
                          setSoundEnabled(enabled);
                          localStorage.setItem(
                            "vodkach_message_sound",
                            enabled ? "on" : "off"
                          );
                        }}
                      />
                    </label>
                  </>
                )}
              </section>
            </div>
          </div>
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
            <div
              className="profileBanner"
              style={{
                background:
                  activeChat.other_user.banner_color || "#5b1115"
              }}
            />
            <div className="memberProfileBody">
              <AvatarWithStatus
                user={activeChat.other_user}
                className="memberProfileAvatarWrap"
                alt="Profile avatar"
              />
              <h2 className="nameWithBadge">
                <span className="displayNameText">
                  {activeChat.other_user.display_name ||
                    activeChat.other_user.username}
                </span>
                {activeChat.other_user.verified ? <VerifiedBadge /> : null}
              </h2>
              <div className="memberHandleLine">
                <span>@{activeChat.other_user.username}</span>
                {activeChat.other_user.pronouns ? (
                  <span className="memberPronouns">
                    {activeChat.other_user.pronouns}
                  </span>
                ) : null}
              </div>
{activeChat.other_user.bio ? (
                <div className="memberProfileSection">
                  <strong>About Me</strong>
                  <p>
                    {splitTextWithLinks(activeChat.other_user.bio).map(
                      (part, index) =>
                        part.type === "link" ? (
                          <button
                            key={`${part.value}_${index}`}
                            className="profileBioLink"
                            type="button"
                            onClick={() =>
                              setLinkWarning({
                                href: part.href,
                                label: part.value
                              })
                            }
                          >
                            {part.value}
                          </button>
                        ) : (
                          <span key={`${part.value}_${index}`}>
                            {part.value}
                          </span>
                        )
                    )}
                  </p>
                </div>
              ) : null}

              <div className="memberProfileSection">
                <strong>Account Created</strong>
                <span>
                  {formatLocalDate(activeChat.other_user.created_at)}
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
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageMenu, setMessageMenu] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [settingsTab, setSettingsTab] = useState("account");
  const [soundEnabled, setSoundEnabled] = useState(
    localStorage.getItem("vodkach_message_sound") !== "off"
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    username: "",
    display_name: "",
    pronouns: "",
    bio: "",
    avatar_url: null
  });
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [linkWarning, setLinkWarning] = useState(null);
  const [socialToast, setSocialToast] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userMenu, setUserMenu] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [chatActionsOpen, setChatActionsOpen] = useState(false);
  const [saveCooldownUntil, setSaveCooldownUntil] = useState(0);
  const [clientLocation, setClientLocation] = useState({
    country: "",
    city: "",
    region: ""
  });
  const [profileFormInitialized, setProfileFormInitialized] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

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

  function openProfile(user) {
    if (!user) return;
    setUserProfile(user);
    setUserMenu(null);
  }

  function isFriend(userId) {
    return friends.some((friend) => friend.id === userId);
  }

  function scrollMessagesToBottom(behavior = "smooth") {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior,
        block: "end"
      });
    });
  }

  function jumpToMessage(messageId) {
    const element = document.getElementById(`message_${messageId}`);

    if (!element) {
      setUiError("The original message is not loaded.");
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

    element.classList.remove("messageJumpHighlight");
    void element.offsetWidth;
    element.classList.add("messageJumpHighlight");

    window.setTimeout(() => {
      element.classList.remove("messageJumpHighlight");
    }, 1400);
  }

  async function removeFriend(user) {
    setConfirmDialog(null);
    setUserMenu(null);
    setChatActionsOpen(false);

    try {
      await api("/api/friends/remove", {
        method: "POST",
        body: JSON.stringify({ user_id: user.id })
      });

      setFriends((current) =>
        current.filter((friend) => friend.id !== user.id)
      );

      setSocialToast({
        title: "Friend Removed",
        text: `${user.display_name || user.username} was removed from your friends.`
      });
    } catch (error) {
      setUiError(error.message);
    }
  }

  async function blockUser(user) {
    setConfirmDialog(null);
    setUserMenu(null);

    try {
      await api("/api/users/block", {
        method: "POST",
        body: JSON.stringify({ user_id: user.id })
      });

      setChats((current) =>
        current.filter((chat) => chat.other_user?.id !== user.id)
      );
      setFriends((current) =>
        current.filter((friend) => friend.id !== user.id)
      );

      if (activeChat?.other_user?.id === user.id) {
        setActiveChat(null);
        setView("friends");
      }

      setUserProfile(null);
      setSocialToast({
        title: "User Blocked",
        text: `${user.display_name || user.username} has been blocked.`
      });
    } catch (error) {
      setUiError(error.message);
    }
  }

  async function deleteChat(chat) {
    setConfirmDialog(null);
    setUserMenu(null);
    setChatActionsOpen(false);

    try {
      await api("/api/chats/delete", {
        method: "POST",
        body: JSON.stringify({ chat_id: chat.id })
      });

      setChats((current) => current.filter((item) => item.id !== chat.id));

      if (activeChat?.id === chat.id) {
        setActiveChat(null);
        setMessages([]);
        setView("friends");
      }
    } catch (error) {
      setUiError(error.message);
    }
  }

  function ensureSaveCooldown() {
    const now = Date.now();

    if (saveCooldownUntil > now) {
      const seconds = Math.ceil((saveCooldownUntil - now) / 1000);
      setUiError(`Please wait ${seconds} second${seconds === 1 ? "" : "s"} before saving again.`);
      return false;
    }

    setSaveCooldownUntil(now + 5000);
    return true;
  }

  async function resolveClientLocation() {
    try {
      const response = await fetch("https://www.cloudflare.com/cdn-cgi/trace", {
        cache: "no-store"
      });
      const text = await response.text();
      const values = Object.fromEntries(
        text
          .trim()
          .split("\\n")
          .map((line) => line.split("=", 2))
      );

      setClientLocation((current) => ({
        ...current,
        country: values.loc || current.country
      }));
    } catch {
      // Country fallback is optional.
    }

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      const parts = timezone.split("/");
      const city = parts.length > 1
        ? parts[parts.length - 1].replaceAll("_", " ")
        : "";

      setClientLocation((current) => ({
        ...current,
        city: current.city || city
      }));
    } catch {
      // Browser timezone fallback is optional.
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


function shouldGroupMessage(previous, current) {
  if (!previous || !current) return false;
  if (previous.sender_user_id !== current.sender_user_id) return false;

  const previousTime = parseServerDate(previous.created_at).getTime();
  const currentTime = parseServerDate(current.created_at).getTime();

  if (!Number.isFinite(previousTime) || !Number.isFinite(currentTime)) {
    return false;
  }

  return currentTime - previousTime <= 3 * 60 * 1000;
}

function AppMessage({
  message,
  avatarUrl,
  name,
  verified,
  time,
  text,
  grouped = false,
  onContextMenu,
  onOpenLink,
  onOpenProfile,
  onJumpToReply
}) {
  return (
    <div
      id={`message_${message.id}`}
      className={[
        grouped ? "appMessage grouped" : "appMessage",
        message.optimistic ? "optimisticMessage messageSendingAnimation" : ""
      ].join(" ")}
      onContextMenu={onContextMenu}
    >
      {!grouped && (
        <button
          className="messageAvatarButton"
          type="button"
          onClick={onOpenProfile}
        >
          <img
            className="messageAvatarImage"
            src={avatarUrl || "/default-avatar.png"}
            alt="User avatar"
            draggable="false"
          />
        </button>
      )}

      <div className="messageContent">
        {!grouped && (
          <div className="messageMeta">
            <button
              className="messageNameButton nameWithBadge"
              type="button"
              onClick={onOpenProfile}
            >
              <span className="displayNameText">{name}</span>
              {verified ? <VerifiedBadge /> : null}
            </button>
            <span>{time}</span>
          </div>
        )}

        {message.reply_to && (
          <button
            className="messageReplyPreview"
            type="button"
            onClick={onJumpToReply}
          >
            <strong>{message.reply_to.sender_name}</strong>
            <span>{message.reply_to.text}</span>
          </button>
        )}

        <p
          className={
            message.optimistic ? "pendingMessageText" : "sentMessageText"
          }
        >
          {splitTextWithLinks(text).map((part, index) =>
            part.type === "link" ? (
              <button
                key={`${part.value}_${index}`}
                className="messageLink"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenLink({
                    href: part.href,
                    label: part.value
                  });
                }}
              >
                {part.value}
              </button>
            ) : (
              <span key={`${part.value}_${index}`}>{part.value}</span>
            )
          )}
          {message.edited_at && (
            <span className="editedLabel">Edited</span>
          )}
        </p>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  isAdminPage ? <AdminApp /> : isWebApp ? <WebApp /> : <Landing />
);

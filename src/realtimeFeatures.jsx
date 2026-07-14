
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";

function IconBase({ children, className = "" }) {
  return (
    <svg
      className={`vodkachFeatureIcon ${className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function CustomSelect({ value, onChange, options, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const selected = options.find((option) => option.value === value) || options[0];

  const updateMenuPosition = () => {
    const trigger = rootRef.current?.querySelector(".vodkachSelectTrigger");
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportGap = 8;
    const estimatedHeight = Math.min(230, options.length * 44 + 12);
    const spaceBelow = window.innerHeight - rect.bottom - viewportGap;
    const placeAbove = spaceBelow < Math.min(estimatedHeight, 150) && rect.top > spaceBelow;
    setMenuStyle({
      "--select-left": `${Math.max(viewportGap, rect.left)}px`,
      "--select-width": `${Math.max(180, rect.width)}px`,
      "--select-top": placeAbove ? "auto" : `${rect.bottom + 6}px`,
      "--select-bottom": placeAbove ? `${window.innerHeight - rect.top + 6}px` : "auto",
      "--select-max-height": `${Math.max(96, Math.min(230, placeAbove ? rect.top - 18 : spaceBelow))}px`
    });
  };

  useEffect(() => {
    const close = (event) => {
      if (
        !rootRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    updateMenuPosition();
    const update = () => updateMenuPosition();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, options.length]);

  const menu = open && menuStyle ? createPortal(
    <div
      ref={menuRef}
      className="vodkachSelectMenu vodkachSelectPortalMenu"
      role="listbox"
      style={menuStyle}
    >
      {options.map((option) => (
        <button
          type="button"
          role="option"
          aria-selected={option.value === value}
          className={option.value === value ? "selected" : ""}
          key={option.value}
          onClick={() => {
            onChange(option.value);
            setOpen(false);
          }}
        >
          <span>{option.label}</span>
          {option.value === value ? <span className="vodkachSelectCheck">✓</span> : null}
        </button>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <div className={open ? "vodkachSelect open" : "vodkachSelect"} ref={rootRef}>
      <button
        type="button"
        className="vodkachSelectTrigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          window.requestAnimationFrame(updateMenuPosition);
        }}
      >
        <span>{selected?.label || "Select"}</span>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4" /></svg>
      </button>
      {menu}
    </div>
  );
}

export function CallIcon() {
  return (
    <IconBase>
      <path d="M7.4 3.8 9.8 8a1.4 1.4 0 0 1-.25 1.68l-1.3 1.3a14.8 14.8 0 0 0 4.77 4.77l1.3-1.3A1.4 1.4 0 0 1 16 14.2l4.2 2.4a1.45 1.45 0 0 1 .7 1.45v2.05a1.8 1.8 0 0 1-1.8 1.8C9.7 21.9 2.1 14.3 2.1 4.9a1.8 1.8 0 0 1 1.8-1.8h2.05a1.45 1.45 0 0 1 1.45.7Z" />
    </IconBase>
  );
}

function HangupIcon() {
  return (
    <svg className="callIcon callIconHangup" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.3 14.7c2.2-2.15 5.1-3.25 8.7-3.25s6.5 1.1 8.7 3.25c.44.43.5 1.1.14 1.6l-1.45 1.9c-.34.45-.96.59-1.47.32l-2.58-1.35a1.17 1.17 0 0 1-.63-1.04l.02-1.35a13 13 0 0 0-5.46 0l.02 1.35c0 .44-.24.84-.63 1.04l-2.58 1.35c-.51.27-1.13.13-1.47-.32l-1.45-1.9a1.17 1.17 0 0 1 .14-1.6Z" />
    </svg>
  );
}

function AcceptCallIcon() {
  return (
    <IconBase>
      <path d="M7.4 3.8 9.8 8a1.4 1.4 0 0 1-.25 1.68l-1.3 1.3a14.8 14.8 0 0 0 4.77 4.77l1.3-1.3A1.4 1.4 0 0 1 16 14.2l4.2 2.4a1.45 1.45 0 0 1 .7 1.45v2.05a1.8 1.8 0 0 1-1.8 1.8C9.7 21.9 2.1 14.3 2.1 4.9a1.8 1.8 0 0 1 1.8-1.8h2.05a1.45 1.45 0 0 1 1.45.7Z" />
    </IconBase>
  );
}


function MicrophoneIcon({ muted = false }) {
  if (muted) return <img className="callIcon callIconImage" src="/ui/mic-off.svg" alt="" aria-hidden="true" />;
  return (
    <svg className="callIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 14.4a3.9 3.9 0 0 0 3.9-3.9V6.9a3.9 3.9 0 1 0-7.8 0v3.6a3.9 3.9 0 0 0 3.9 3.9Z" />
      <path d="M5.6 10.5a6.4 6.4 0 0 0 12.8 0h-2a4.4 4.4 0 0 1-8.8 0h-2ZM11 16.8V20H8.3v2h7.4v-2H13v-3.2h-2Z" />
    </svg>
  );
}

function CameraIcon({ disabled = false }) {
  if (disabled) return <img className="callIcon callIconImage" src="/ui/camera-off.svg" alt="" aria-hidden="true" />;
  return (
    <svg className="callIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 6h9A2.5 2.5 0 0 1 16 8.5v7a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 2 15.5v-7A2.5 2.5 0 0 1 4.5 6ZM17 9l5-2.6v11.2L17 15V9Z" />
    </svg>
  );
}

function ScreenShareIcon({ active = false }) {
  return (
    <svg className="vodkachFeatureIcon callShareGlyph" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="13" rx="2.5" />
      <path d="M8 21h8M12 17v4" />
      <path d="m9 11 3-3 3 3M12 8v6" />
      {active ? <circle className="shareActiveDot" cx="19" cy="5" r="2" /> : null}
    </svg>
  );
}

function PollIcon() {
  return (
    <IconBase>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M7 15v2M12 11v6M17 8v9" />
    </IconBase>
  );
}

function PlusIcon() {
  return (
    <IconBase>
      <path d="M12 5v14M5 12h14" />
    </IconBase>
  );
}

function CloseIcon() {
  return (
    <IconBase>
      <path d="m6 6 12 12M18 6 6 18" />
    </IconBase>
  );
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-vodkach-sdk="${src}"]`);
    if (existing) {
      if (window.RealtimeKitClient) resolve();
      else existing.addEventListener("load", resolve, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.vodkachSdk = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Failed to load RealtimeKit SDK"));
    document.head.appendChild(script);
  });
}


let realtimeKitLoaderPromise = null;
const capturedPeerConnections = new Set();
let peerCaptureInstalled = false;

function installPeerConnectionCapture() {
  if (peerCaptureInstalled || typeof window === "undefined") return;
  if (!window.RTCPeerConnection) return;

  peerCaptureInstalled = true;
  const NativePeerConnection = window.RTCPeerConnection;

  window.RTCPeerConnection = new Proxy(NativePeerConnection, {
    construct(Target, args, NewTarget) {
      const peer = Reflect.construct(Target, args, NewTarget);
      capturedPeerConnections.add(peer);

      const cleanup = () => {
        if (peer.connectionState === "closed") {
          capturedPeerConnections.delete(peer);
        }
      };

      peer.addEventListener?.("connectionstatechange", cleanup);
      return peer;
    }
  });

  window.RTCPeerConnection.prototype = NativePeerConnection.prototype;
}

async function loadRealtimeKit() {
  if (window.RealtimeKitClient) return;

  installPeerConnectionCapture();

  if (!realtimeKitLoaderPromise) {
    realtimeKitLoaderPromise = loadScript(
      "https://cdn.jsdelivr.net/npm/@cloudflare/realtimekit@1.3.0/dist/browser.js"
    ).catch((error) => {
      realtimeKitLoaderPromise = null;
      throw error;
    });
  }

  await realtimeKitLoaderPromise;
}

function extractTrack(value, kind = null) {
  if (!value) return null;

  if (typeof MediaStreamTrack !== "undefined" && value instanceof MediaStreamTrack) {
    if (!kind || value.kind === kind) return value;
    return null;
  }

  if (value.track) {
    const nested = extractTrack(value.track, kind);
    if (nested) return nested;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = extractTrack(item, kind);
      if (nested) return nested;
    }
  }

  if (typeof value === "object") {
    for (const key of [
      "audio",
      "video",
      "screenShare",
      "screenShareVideo",
      "videoTrack",
      "audioTrack",
      "screenShareTrack"
    ]) {
      if (value[key]) {
        const nested = extractTrack(value[key], kind);
        if (nested) return nested;
      }
    }
  }

  return null;
}

function TrackVideo({ track, muted = false, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (!track) {
      element.srcObject = null;
      return;
    }

    const stream = new MediaStream([track]);
    element.srcObject = stream;
    element.play().catch(() => {});

    return () => {
      if (element.srcObject === stream) {
        element.srcObject = null;
      }
    };
  }, [track]);

  if (!track) return null;

  return (
    <video
      ref={ref}
      className={className}
      autoPlay
      playsInline
      muted={muted}
    />
  );
}

function TrackAudio({ track }) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (!track) {
      element.srcObject = null;
      return;
    }

    const stream = new MediaStream([track]);
    element.srcObject = stream;
    element.volume = 1;
    element.play().catch(() => {});

    const resume = () => {
      element.play().catch(() => {});
    };

    window.addEventListener("pointerdown", resume, { once: true });

    return () => {
      window.removeEventListener("pointerdown", resume);
      if (element.srcObject === stream) {
        element.srcObject = null;
      }
    };
  }, [track]);

  if (!track) return null;

  return <audio ref={ref} autoPlay playsInline />;
}

function getStoredDevice(key) {
  return localStorage.getItem(key) || "";
}

async function applyPreferredDevices(meeting) {
  const microphone = getStoredDevice("vodkach_voice_input");
  const camera = getStoredDevice("vodkach_camera_input");

  const attempts = [
    [meeting?.self?.setAudioDevice, microphone],
    [meeting?.self?.setMicrophoneDevice, microphone],
    [meeting?.self?.setVideoDevice, camera],
    [meeting?.self?.setCameraDevice, camera]
  ];

  for (const [method, deviceId] of attempts) {
    if (!deviceId || typeof method !== "function") continue;

    try {
      await method.call(meeting.self, deviceId);
    } catch {
      // Browsers and SDK releases expose different device switching APIs.
    }
  }
}



export const CallSystem = forwardRef(function CallSystem(
  { api, user, activeChat },
  ref
) {
  const [incoming, setIncoming] = useState(null);
  const [call, setCall] = useState(null);
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");

  const [muted, setMuted] = useState(false);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [remoteCameraEnabled, setRemoteCameraEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [remoteSharing, setRemoteSharing] = useState(false);
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [remoteSpeaking, setRemoteSpeaking] = useState(false);
  const [networkPing, setNetworkPing] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [callStartedAt, setCallStartedAt] = useState(null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [callPanelHeight, setCallPanelHeight] = useState(() => {
    const stored = Number(localStorage.getItem("vodkach_call_panel_height"));
    return Number.isFinite(stored) && stored >= 100 && stored <= 620
      ? stored
      : 140;
  });
  const resizeStateRef = useRef(null);

  const [localCameraTrack, setLocalCameraTrack] = useState(null);
  const [remoteCameraTrack, setRemoteCameraTrack] = useState(null);
  const [localShareTrack, setLocalShareTrack] = useState(null);
  const [remoteShareTrack, setRemoteShareTrack] = useState(null);
  const [remoteAudioTrack, setRemoteAudioTrack] = useState(null);

  const meetingRef = useRef(null);
  const currentCallRef = useRef(null);
  const localSpeakingCleanupRef = useRef(null);
  const remoteSpeakingTimerRef = useRef(null);
  const lastMediaPushRef = useRef({});

  useEffect(() => {
    currentCallRef.current = call;
  }, [call]);

  useEffect(() => {
    if (user?.id) {
      loadRealtimeKit().catch(() => {});
    }
  }, [user?.id]);

  async function pushMediaState(nextState) {
    const current = currentCallRef.current;
    if (!current?.id) return;

    const comparable = JSON.stringify(nextState);
    const key = Object.keys(nextState).sort().join(",");

    if (lastMediaPushRef.current[key] === comparable) return;
    lastMediaPushRef.current[key] = comparable;

    try {
      await api("/api/calls/media", {
        method: "POST",
        body: JSON.stringify({
          call_id: current.id,
          ...nextState
        })
      });
    } catch {
      // SDK events and next status poll remain the fallback.
    }
  }

  function updateLocalTracks(meeting) {
    setLocalCameraTrack(
      extractTrack(
        meeting?.self?.videoTrack ||
        meeting?.self?.videoTracks ||
        meeting?.self?.tracks?.video,
        "video"
      )
    );

    setLocalShareTrack(
      extractTrack(
        meeting?.self?.screenShareTracks ||
        meeting?.self?.screenShareTrack ||
        meeting?.self?.tracks?.screenShare,
        "video"
      )
    );
  }

  function bindParticipant(participant) {
    if (!participant) return;

    const updateAudio = (event) => {
      const enabled =
        event?.audioEnabled ??
        event?.enabled ??
        participant.audioEnabled;

      if (typeof enabled === "boolean") {
        setRemoteMuted(!enabled);
      }

      const audioTrack = extractTrack(
        event?.audioTrack ||
        event?.audioTracks ||
        participant.audioTrack ||
        participant.audioTracks ||
        participant.tracks?.audio,
        "audio"
      );

      if (audioTrack) {
        setRemoteAudioTrack(audioTrack);
      }
    };

    const updateVideo = (event) => {
      const enabled =
        event?.videoEnabled ??
        event?.enabled ??
        participant.videoEnabled;

      if (typeof enabled === "boolean") {
        setRemoteCameraEnabled(enabled);
      }

      setRemoteCameraTrack(
        extractTrack(
          event?.videoTrack ||
          event?.videoTracks ||
          participant.videoTrack ||
          participant.videoTracks ||
          participant.tracks?.video,
          "video"
        )
      );
    };

    const updateShare = (event) => {
      const enabled =
        event?.screenShareEnabled ??
        event?.enabled ??
        participant.screenShareEnabled;

      if (typeof enabled === "boolean") {
        setRemoteSharing(enabled);
      }

      setRemoteShareTrack(
        extractTrack(
          event?.screenShareTrack ||
          event?.screenShareTracks ||
          participant.screenShareTrack ||
          participant.screenShareTracks ||
          participant.tracks?.screenShare,
          "video"
        )
      );
    };

    updateAudio();
    updateVideo();
    updateShare();

    participant.on?.("audioUpdate", updateAudio);
    participant.on?.("videoUpdate", updateVideo);
    participant.on?.("screenShareUpdate", updateShare);
  }

  async function connectToMeeting(callData) {
    setCall(callData);
    setPhase("connecting");
    setError("");

    try {
      await loadRealtimeKit();

      const meeting = await window.RealtimeKitClient.init({
        authToken: callData.auth_token,
        defaults: {
          audio: true,
          video: false
        }
      });

      meetingRef.current = meeting;

      meeting.self.on?.("roomJoined", async () => {
        await applyPreferredDevices(meeting);
        updateLocalTracks(meeting);

        await pushMediaState({
          joined: true,
          muted: false,
          sharing: false,
          speaking: false
        });
      });

      meeting.self.on?.("audioUpdate", (event) => {
        const enabled = event?.audioEnabled ?? event?.enabled;
        if (typeof enabled === "boolean") {
          const nextMuted = !enabled;
          setMuted(nextMuted);
          pushMediaState({ muted: nextMuted });
        }
      });

      meeting.self.on?.("videoUpdate", (event) => {
        const enabled = event?.videoEnabled ?? event?.enabled;
        if (typeof enabled === "boolean") {
          setCameraEnabled(enabled);
        }

        window.setTimeout(() => updateLocalTracks(meeting), 40);
      });

      meeting.self.on?.("screenShareUpdate", (event) => {
        const enabled = event?.screenShareEnabled ?? event?.enabled;
        if (typeof enabled === "boolean") {
          setScreenSharing(enabled);
          pushMediaState({ sharing: enabled });
        }

        window.setTimeout(() => updateLocalTracks(meeting), 40);
      });

      meeting.self.on?.("roomLeft", () => {
        setPhase((current) =>
          current === "connected" ? "reconnecting" : current
        );
      });

      meeting.participants?.joined?.on?.("participantJoined", bindParticipant);

      meeting.participants?.joined?.on?.("participantLeft", () => {
        setRemoteMuted(false);
        setRemoteCameraEnabled(false);
        setRemoteSharing(false);
        setRemoteSpeaking(false);
        setRemoteAudioTrack(null);
        setRemoteCameraTrack(null);
        setRemoteShareTrack(null);
      });

      const joined = meeting.participants?.joined;
      const existing =
        joined?.toArray?.() ||
        (joined?.values ? Array.from(joined.values()) : []);

      for (const participant of existing || []) {
        bindParticipant(participant);
      }

      meeting.participants?.on?.("activeSpeaker", (speaker) => {
        const selfId =
          meeting.self?.id ||
          meeting.self?.peerId ||
          meeting.self?.customParticipantId;

        const speakerId =
          speaker?.id ||
          speaker?.peerId ||
          speaker?.customParticipantId;

        if (speakerId && selfId && speakerId === selfId) return;

        setRemoteSpeaking(Boolean(speaker));

        if (remoteSpeakingTimerRef.current) {
          clearTimeout(remoteSpeakingTimerRef.current);
        }

        remoteSpeakingTimerRef.current = setTimeout(() => {
          setRemoteSpeaking(false);
        }, 450);
      });

      await meeting.join();
      await applyPreferredDevices(meeting);
      updateLocalTracks(meeting);
    } catch (connectError) {
      setError(connectError.message || "Could not connect to the call");
      setCall(null);
      setPhase("idle");
    }
  }

  async function startCall() {
    if (!activeChat?.id || call || phase !== "idle") return;

    setPhase("starting");
    setError("");

    try {
      const data = await api("/api/calls/start", {
        method: "POST",
        body: JSON.stringify({ chat_id: activeChat.id })
      });

      await connectToMeeting({
        ...data.call,
        auth_token: data.auth_token
      });
    } catch (startError) {
      setError(startError.message || "Could not start the call");
      setPhase("idle");
      setCall(null);
    }
  }

  useImperativeHandle(ref, () => ({ start: startCall }), [
    activeChat?.id,
    call,
    phase
  ]);

  async function acceptCall() {
    const selected = incoming;
    if (!selected?.id) return;

    setIncoming(null);
    setPhase("connecting");
    setError("");

    try {
      let data = null;

      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          data = await api("/api/calls/respond", {
            method: "POST",
            body: JSON.stringify({
              call_id: selected.id,
              action: "accept"
            })
          });
          break;
        } catch (acceptError) {
          if (attempt === 3) throw acceptError;
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }

      await connectToMeeting({
        ...data.call,
        auth_token: data.auth_token
      });
    } catch (acceptError) {
      setError(acceptError.message || "Could not accept the call");
      setPhase("idle");
      setCall(null);
    }
  }

  async function declineCall() {
    const selected = incoming;
    setIncoming(null);

    if (!selected?.id) return;

    try {
      await api("/api/calls/respond", {
        method: "POST",
        body: JSON.stringify({
          call_id: selected.id,
          action: "decline"
        })
      });
    } catch {
      // Caller may already have ended the call.
    }
  }

  function resetCallState() {
    localSpeakingCleanupRef.current?.();
    localSpeakingCleanupRef.current = null;

    if (remoteSpeakingTimerRef.current) {
      clearTimeout(remoteSpeakingTimerRef.current);
      remoteSpeakingTimerRef.current = null;
    }

    meetingRef.current = null;
    currentCallRef.current = null;
    lastMediaPushRef.current = {};

    setCall(null);
    setPhase("idle");
    setMuted(false);
    setRemoteMuted(false);
    setCameraEnabled(false);
    setRemoteCameraEnabled(false);
    setScreenSharing(false);
    setRemoteSharing(false);
    setLocalSpeaking(false);
    setRemoteSpeaking(false);
    setNetworkPing(null);
    setElapsedSeconds(0);
    setCallStartedAt(null);
    setLocalCameraTrack(null);
    setRemoteCameraTrack(null);
    setLocalShareTrack(null);
    setRemoteShareTrack(null);
    setRemoteAudioTrack(null);
  }

  async function endCall() {
    const current = currentCallRef.current;

    try {
      await pushMediaState({
        joined: false,
        speaking: false,
        sharing: false
      });

      const meeting = meetingRef.current;
      await meeting?.self?.disableVideo?.().catch?.(() => {});
      await meeting?.self?.disableScreenShare?.().catch?.(() => {});
      await meeting?.self?.disableAudio?.().catch?.(() => {});
      await meeting?.leave?.();
    } catch {
      // Server cleanup still runs.
    }

    if (current?.id) {
      try {
        await api("/api/calls/end", {
          method: "POST",
          body: JSON.stringify({ call_id: current.id })
        });
      } catch {
        // Local UI still closes.
      }
    }

    resetCallState();
  }

  async function toggleMicrophone() {
    const meeting = meetingRef.current;
    if (!meeting || mediaBusy) return;

    setMediaBusy(true);

    try {
      if (muted) {
        await meeting.self.enableAudio();
      } else {
        await meeting.self.disableAudio();
      }

      const nextMuted = !muted;
      setMuted(nextMuted);
      await pushMediaState({ muted: nextMuted });
    } catch (mediaError) {
      setError(mediaError.message || "Could not change microphone state");
    } finally {
      setMediaBusy(false);
    }
  }

  async function toggleCamera() {
    const meeting = meetingRef.current;
    if (!meeting || mediaBusy) return;

    setMediaBusy(true);

    try {
      if (cameraEnabled) {
        await meeting.self.disableVideo();
      } else {
        await meeting.self.enableVideo();
      }

      const next = !cameraEnabled;
      setCameraEnabled(next);
      setTimeout(() => updateLocalTracks(meeting), 80);
    } catch (mediaError) {
      setError(mediaError.message || "Could not change camera state");
    } finally {
      setMediaBusy(false);
    }
  }

  async function toggleScreenShare() {
    const meeting = meetingRef.current;
    if (!meeting || mediaBusy) return;

    setMediaBusy(true);

    try {
      if (screenSharing) {
        await meeting.self.disableScreenShare();
      } else {
        await meeting.self.enableScreenShare();
      }

      const next = !screenSharing;
      setScreenSharing(next);
      await pushMediaState({ sharing: next });
      setTimeout(() => updateLocalTracks(meeting), 80);
    } catch (mediaError) {
      setError(mediaError.message || "Could not change screen share state");
    } finally {
      setMediaBusy(false);
    }
  }

  useEffect(() => {
    if (phase !== "connected" || muted) {
      setLocalSpeaking(false);
      localSpeakingCleanupRef.current?.();
      localSpeakingCleanupRef.current = null;
      return undefined;
    }

    const track = extractTrack(
      meetingRef.current?.self?.audioTrack ||
      meetingRef.current?.self?.audioTracks ||
      meetingRef.current?.self?.tracks?.audio,
      "audio"
    );

    if (!track) return undefined;

    let stopped = false;
    let frame = 0;
    let context = null;
    let lastSpeaking = false;

    try {
      context = new AudioContext();
      const source = context.createMediaStreamSource(new MediaStream([track]));
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.76;
      source.connect(analyser);

      const values = new Uint8Array(analyser.frequencyBinCount);

      const sample = () => {
        if (stopped) return;

        analyser.getByteTimeDomainData(values);
        let sum = 0;

        for (const value of values) {
          const normalized = (value - 128) / 128;
          sum += normalized * normalized;
        }

        const speaking = Math.sqrt(sum / values.length) > 0.035;

        if (speaking !== lastSpeaking) {
          lastSpeaking = speaking;
          setLocalSpeaking(speaking);
          pushMediaState({ speaking });
        }

        frame = requestAnimationFrame(sample);
      };

      sample();
    } catch {
      setLocalSpeaking(false);
    }

    const cleanup = () => {
      stopped = true;
      cancelAnimationFrame(frame);
      context?.close?.().catch?.(() => {});
      setLocalSpeaking(false);
      pushMediaState({ speaking: false });
    };

    localSpeakingCleanupRef.current = cleanup;
    return cleanup;
  }, [phase, muted]);

  useEffect(() => {
    if (!callStartedAt || phase !== "connected") return undefined;

    const update = () => {
      setElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - callStartedAt) / 1000))
      );
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [callStartedAt, phase]);

  useEffect(() => {
    if (phase !== "connected") {
      setNetworkPing(null);
      return undefined;
    }

    let stopped = false;

    async function samplePing() {
      let best = null;

      for (const peer of Array.from(capturedPeerConnections)) {
        if (peer.connectionState === "closed") {
          capturedPeerConnections.delete(peer);
          continue;
        }

        try {
          const stats = await peer.getStats();

          stats.forEach((item) => {
            if (
              item.type === "candidate-pair" &&
              (item.selected || item.nominated || item.state === "succeeded") &&
              Number.isFinite(item.currentRoundTripTime)
            ) {
              const value = Math.max(
                1,
                Math.round(item.currentRoundTripTime * 1000)
              );

              if (best == null || value < best) best = value;
            }
          });
        } catch {
          // Ignore stale peer connections.
        }
      }

      if (!stopped) setNetworkPing(best);
    }

    samplePing();
    const timer = setInterval(samplePing, 2000);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [phase]);

  useEffect(() => {
    if (!user?.id) return undefined;

    let stopped = false;

    async function checkCalls() {
      try {
        const current = currentCallRef.current;
        const query = current?.id
          ? `?call_id=${encodeURIComponent(current.id)}`
          : "";

        const data = await api(`/api/calls/status${query}`);

        if (stopped) return;

        if (!currentCallRef.current && data.incoming) {
          setIncoming(data.incoming);
        } else if (!data.incoming) {
          setIncoming(null);
        }

        const active = currentCallRef.current;
        const server = data.current;

        if (!active || !server || server.id !== active.id) return;

        setRemoteMuted(Boolean(server.media?.remote_muted));
        setRemoteSharing(Boolean(server.media?.remote_sharing));
        setRemoteSpeaking(Boolean(server.media?.remote_speaking));

        if (server.status === "ringing") {
          setPhase((currentPhase) =>
            currentPhase === "connecting" ? "connecting" : "ringing"
          );
        } else if (server.status === "active") {
          const ready =
            Boolean(server.media?.local_joined) &&
            Boolean(server.media?.remote_joined);

          setPhase(ready ? "connected" : "connecting");

          if (ready) {
            setCallStartedAt((value) => value || Date.now());
          }
        } else if (
          ["declined", "ended", "missed"].includes(server.status)
        ) {
          resetCallState();
        }
      } catch {
        // Never remove the call UI during a temporary polling failure.
      }
    }

    const handleRealtimeCall = (event) => {
      if (event.detail?.type === "call.changed") checkCalls();
    };
    const handleRealtimeConnected = () => checkCalls();

    checkCalls();
    window.addEventListener("vodkach:realtime", handleRealtimeCall);
    window.addEventListener("vodkach:realtime-connected", handleRealtimeConnected);
    document.addEventListener("visibilitychange", checkCalls);

    return () => {
      stopped = true;
      window.removeEventListener("vodkach:realtime", handleRealtimeCall);
      window.removeEventListener("vodkach:realtime-connected", handleRealtimeConnected);
      document.removeEventListener("visibilitychange", checkCalls);
    };
  }, [user?.id, call?.id, incoming?.id]);

  function formatDuration(total) {
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;

    if (hours) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function beginCallResize(event) {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    resizeStateRef.current = {
      startY: event.clientY,
      startHeight: callPanelHeight
    };

    const onMove = (moveEvent) => {
      const state = resizeStateRef.current;
      if (!state) return;

      const next = Math.max(
        100,
        Math.min(620, state.startHeight + moveEvent.clientY - state.startY)
      );

      setCallPanelHeight(next);
    };

    const onUp = () => {
      resizeStateRef.current = null;
      localStorage.setItem(
        "vodkach_call_panel_height",
        String(callPanelHeight)
      );
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const otherName =
    call?.other_display_name ||
    call?.other_username ||
    "Participant";

  const showScreenShare = screenSharing || remoteSharing;
  const shareTracks = [
    screenSharing
      ? {
          id: "local",
          label: user?.display_name || user?.username || "You",
          track: localShareTrack,
          muted: true
        }
      : null,
    remoteSharing
      ? {
          id: "remote",
          label: otherName,
          track: remoteShareTrack,
          muted: false
        }
      : null
  ].filter(Boolean);
  const showCamera = cameraEnabled || remoteCameraEnabled;
  const connected = phase === "connected";

  return (
    <>
      <TrackAudio track={remoteAudioTrack} />

      {incoming && !call && (
        <div className="finalIncomingCall">
          <img
            src={incoming.caller_avatar_url || "/default-avatar.png"}
            alt=""
          />

          <div>
            <strong>
              {incoming.caller_display_name ||
                incoming.caller_username ||
                "Incoming call"}
            </strong>
            <span>Incoming voice call</span>
          </div>

          <button
            className="finalIncomingDecline"
            type="button"
            title="Decline"
            onClick={declineCall}
          >
            <HangupIcon />
          </button>

          <button
            className="finalIncomingAccept"
            type="button"
            title="Accept"
            onClick={acceptCall}
          >
            <AcceptCallIcon />
          </button>
        </div>
      )}

      {call &&
        createPortal(
          <section
            className={
              showScreenShare
                ? "finalCallDock sharing"
                : showCamera
                  ? "finalCallDock camera"
                  : "finalCallDock"
            }
            style={{ "--call-panel-height": `${callPanelHeight}px` }}
          >
            <div className="finalCallMedia">
              {showScreenShare ? (
                <div
                  className={
                    shareTracks.length > 1
                      ? "finalShareLayout dual"
                      : "finalShareLayout"
                  }
                >
                  <div className="finalShareVideos">
                    {shareTracks.map((share) => (
                      <article key={share.id}>
                        {share.track ? (
                          <TrackVideo
                            track={share.track}
                            muted={share.muted}
                            className="finalShareVideo"
                          />
                        ) : (
                          <div className="finalMediaWaiting">
                            <ScreenShareIcon active />
                            <strong>{share.label} is sharing</strong>
                          </div>
                        )}
                        <span>{share.label}</span>
                      </article>
                    ))}
                  </div>

                  <div className="finalShareRail">
                    <img
                      src={user?.avatar_url || "/default-avatar.png"}
                      alt=""
                    />
                    <img
                      src={call.other_avatar_url || "/default-avatar.png"}
                      alt=""
                    />
                  </div>
                </div>
              ) : showCamera ? (
                <div className="finalCameraGrid">
                  <article>
                    {localCameraTrack ? (
                      <TrackVideo
                        track={localCameraTrack}
                        muted
                        className="finalCameraVideo mirrored"
                      />
                    ) : (
                      <img
                        src={user?.avatar_url || "/default-avatar.png"}
                        alt=""
                      />
                    )}
                    <span>{user?.display_name || user?.username || "You"}</span>
                  </article>

                  <article>
                    {remoteCameraTrack ? (
                      <TrackVideo
                        track={remoteCameraTrack}
                        className="finalCameraVideo"
                      />
                    ) : (
                      <img
                        src={call.other_avatar_url || "/default-avatar.png"}
                        alt=""
                      />
                    )}
                    <span>{otherName}</span>
                  </article>
                </div>
              ) : (
                <div className="finalVoiceInfo">
                  <div className="finalAvatarPair">
                    <div className={localSpeaking ? "finalCallAvatar speaking" : "finalCallAvatar"}>
                      <img
                        src={user?.avatar_url || "/default-avatar.png"}
                        alt=""
                      />
                      {muted ? (
                        <span><MicrophoneIcon muted /></span>
                      ) : null}
                    </div>

                    <div className={remoteSpeaking && !remoteMuted ? "finalCallAvatar speaking" : "finalCallAvatar"}>
                      <img
                        src={call.other_avatar_url || "/default-avatar.png"}
                        alt=""
                      />
                      {remoteMuted ? (
                        <span><MicrophoneIcon muted /></span>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <strong>{otherName}</strong>
                    <span>
                      {connected
                        ? `${formatDuration(elapsedSeconds)} · ${networkPing == null ? "RTC —" : `${networkPing} ms`}`
                        : phase === "ringing"
                          ? "Ringing..."
                          : phase === "starting"
                            ? "Starting call..."
                            : phase === "reconnecting"
                              ? "Reconnecting..."
                              : "Connecting..."}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="finalCallControls">
              <button
                className={muted ? "finalCallButton danger" : "finalCallButton"}
                type="button"
                title={muted ? "Unmute" : "Mute"}
                disabled={mediaBusy || !connected}
                onClick={toggleMicrophone}
              >
                <MicrophoneIcon muted={muted} />
              </button>

              <button
                className={cameraEnabled ? "finalCallButton active" : "finalCallButton"}
                type="button"
                title={cameraEnabled ? "Turn camera off" : "Turn camera on"}
                disabled={mediaBusy || !connected}
                onClick={toggleCamera}
              >
                <CameraIcon disabled={!cameraEnabled} />
              </button>

              <button
                className={screenSharing ? "finalCallButton active" : "finalCallButton"}
                type="button"
                title={screenSharing ? "Stop sharing" : "Share screen"}
                disabled={mediaBusy || !connected}
                onClick={toggleScreenShare}
              >
                <ScreenShareIcon active={screenSharing} />
              </button>

              <button
                className="finalCallButton disconnect"
                type="button"
                title="Disconnect"
                onClick={endCall}
              >
                <HangupIcon />
              </button>
            </div>

            <button
              className="callResizeHandle"
              type="button"
              aria-label="Resize call panel"
              title="Drag to resize"
              onPointerDown={beginCallResize}
            >
              <span>⌄</span>
            </button>
          </section>,
          document.getElementById("vodkach-call-slot") || document.body
        )}

      {error && (
        <button
          className="callErrorToast"
          type="button"
          onClick={() => setError("")}
        >
          {error}
        </button>
      )}
    </>
  );
});

export function VoiceCameraSettings() {
  const [devices, setDevices] = useState({
    audioinput: [],
    videoinput: [],
    audiooutput: []
  });
  const [microphone, setMicrophone] = useState(
    getStoredDevice("vodkach_voice_input")
  );
  const [camera, setCamera] = useState(
    getStoredDevice("vodkach_camera_input")
  );
  const [speaker, setSpeaker] = useState(
    getStoredDevice("vodkach_voice_output")
  );
  const [previewStream, setPreviewStream] = useState(null);
  const [micLevel, setMicLevel] = useState(0);
  const [error, setError] = useState("");
  const videoRef = useRef(null);
  const cleanupRef = useRef(null);

  async function refreshDevices() {
    const list = await navigator.mediaDevices.enumerateDevices();
    setDevices({
      audioinput: list.filter((device) => device.kind === "audioinput"),
      videoinput: list.filter((device) => device.kind === "videoinput"),
      audiooutput: list.filter((device) => device.kind === "audiooutput")
    });
  }

  async function startPreview() {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: microphone
          ? { deviceId: { exact: microphone } }
          : true,
        video: camera
          ? { deviceId: { exact: camera } }
          : true
      });

      setPreviewStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      await refreshDevices();

      const audioTrack = stream.getAudioTracks()[0];

      if (audioTrack) {
        const context = new AudioContext();
        const source = context.createMediaStreamSource(
          new MediaStream([audioTrack])
        );
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const values = new Uint8Array(analyser.frequencyBinCount);
        let stopped = false;
        let frame = 0;

        const sample = () => {
          if (stopped) return;
          analyser.getByteTimeDomainData(values);

          let sum = 0;
          for (const value of values) {
            const normalized = (value - 128) / 128;
            sum += normalized * normalized;
          }

          setMicLevel(
            Math.min(100, Math.round(Math.sqrt(sum / values.length) * 420))
          );
          frame = requestAnimationFrame(sample);
        };

        sample();

        cleanupRef.current = () => {
          stopped = true;
          cancelAnimationFrame(frame);
          context.close().catch(() => {});
          stream.getTracks().forEach((track) => track.stop());
          if (videoRef.current) videoRef.current.srcObject = null;
          setPreviewStream(null);
          setMicLevel(0);
        };
      } else {
        cleanupRef.current = () => {
          stream.getTracks().forEach((track) => track.stop());
          if (videoRef.current) videoRef.current.srcObject = null;
          setPreviewStream(null);
          setMicLevel(0);
        };
      }
    } catch (previewError) {
      setError(
        previewError.message ||
        "Could not access microphone or camera."
      );
    }
  }

  useEffect(() => {
    startPreview();

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [microphone, camera]);

  useEffect(() => {
    const stopWhenHidden = () => {
      if (document.visibilityState === "hidden") {
        cleanupRef.current?.();
        cleanupRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
      }
    };
    window.addEventListener("pagehide", stopWhenHidden);
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => {
      window.removeEventListener("pagehide", stopWhenHidden);
      document.removeEventListener("visibilitychange", stopWhenHidden);
    };
  }, []);

  function saveDevice(key, value, setter) {
    setter(value);

    if (value) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  }

  return (
    <div className="voiceCameraSettings">
      <h1>Voice & Camera</h1>
      <p className="settingsLead">
        Choose the devices Vodkach should use for calls.
      </p>

      <div className="voiceSettingsGrid">
        <section className="voiceDevicePanel">
          <label>
            <span>Input Device</span>
            <CustomSelect
              ariaLabel="Input device"
              value={microphone}
              onChange={(value) => saveDevice("vodkach_voice_input", value, setMicrophone)}
              options={[
                { value: "", label: "Default microphone" },
                ...devices.audioinput.map((device) => ({ value: device.deviceId, label: device.label || "Microphone" }))
              ]}
            />
          </label>

          <label>
            <span>Output Device</span>
            <CustomSelect
              ariaLabel="Output device"
              value={speaker}
              onChange={(value) => saveDevice("vodkach_voice_output", value, setSpeaker)}
              options={[
                { value: "", label: "Default speakers" },
                ...devices.audiooutput.map((device) => ({ value: device.deviceId, label: device.label || "Speakers" }))
              ]}
            />
          </label>

          <div className="microphoneTest">
            <div>
              <strong>Microphone Test</strong>
              <span>Speak to test your input level.</span>
            </div>
            <div className="microphoneMeter">
              <span style={{ width: `${micLevel}%` }} />
            </div>
          </div>
        </section>

        <section className="cameraDevicePanel">
          <label>
            <span>Camera</span>
            <CustomSelect
              ariaLabel="Camera"
              value={camera}
              onChange={(value) => saveDevice("vodkach_camera_input", value, setCamera)}
              options={[
                { value: "", label: "Default camera" },
                ...devices.videoinput.map((device) => ({ value: device.deviceId, label: device.label || "Camera" }))
              ]}
            />
          </label>

          <div className="cameraPreview">
            <video ref={videoRef} autoPlay playsInline muted />
            {!previewStream ? <span>Camera preview unavailable</span> : null}
          </div>
        </section>
      </div>

      {error ? <div className="voiceSettingsError">{error}</div> : null}
    </div>
  );
}

export function PollCard({ poll, api, reload, currentUserId }) {
  const [busyOption, setBusyOption] = useState("");
  const [actionError, setActionError] = useState("");
  const totalVotes = poll.options.reduce(
    (sum, option) => sum + Number(option.vote_count || 0),
    0
  );
  const canSeeResults =
    !poll.hide_results_until_vote ||
    poll.current_user_voted ||
    poll.creator_user_id === currentUserId ||
    poll.closed_at;
  const selected = new Set(poll.current_user_option_ids || []);

  async function vote(optionId) {
    if (busyOption) return; setBusyOption(optionId); setActionError("");
    try { await api("/api/polls/vote", { method: "POST", body: JSON.stringify({ poll_id: poll.id, option_id: optionId }) }); await reload?.(); window.dispatchEvent(new CustomEvent("vodkach:polls-changed")); }
    catch (e) { setActionError(e.message || "Could not vote"); } finally { setBusyOption(""); }
  }

  async function closePoll() {
    if (busyOption) return; setBusyOption("close"); setActionError("");
    try { await api("/api/polls/close", { method: "POST", body: JSON.stringify({ poll_id: poll.id }) }); await reload?.(); window.dispatchEvent(new CustomEvent("vodkach:polls-changed")); }
    catch (e) { setActionError(e.message || "Could not close poll"); } finally { setBusyOption(""); }
  }

  return (
    <article className="chatPollCard inlineChatPoll">
      <header className="inlinePollHeader">
        <div className="inlinePollAuthor">
          <img
            src={poll.creator_avatar_url || "/default-avatar.png"}
            alt=""
          />
          <div>
            <strong>
              {poll.creator_display_name ||
                poll.creator_username ||
                "Vodkach User"}
            </strong>
            <span className="chatPollEyebrow">
            <PollIcon />
              Poll
            </span>
          </div>
        </div>
        {poll.anonymous ? <span className="pollChip">Anonymous</span> : null}
      </header>
      <h3>{poll.question}</h3>

      <div className="chatPollOptions">
        {poll.options.map((option) => {
          const percent =
            canSeeResults && totalVotes
              ? Math.round((Number(option.vote_count || 0) / totalVotes) * 100)
              : 0;

          return (
            <button
              className={selected.has(option.id) ? "selected" : ""}
              type="button"
              key={option.id}
              disabled={Boolean(poll.closed_at) || Boolean(busyOption)}
              onClick={() => vote(option.id)}
            >
              <span
                className="pollOptionFill"
                style={{ width: canSeeResults ? `${percent}%` : "0%" }}
              />
              <span className="pollOptionMain">
                <span className="pollCheck">
                  {selected.has(option.id) ? "✓" : ""}
                </span>
                <span>{option.label}</span>
              </span>
              <span className="pollPercent">
                {canSeeResults ? `${percent}%` : "Vote"}
              </span>
            </button>
          );
        })}
      </div>

      <footer>
        <span>
          {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
          {poll.closed_at ? " - Poll closed" : ""}
        </span>
        {poll.creator_user_id === currentUserId && !poll.closed_at ? (
          <button type="button" onClick={closePoll}>
            Close Poll
          </button>
        ) : null}
      </footer>
      {actionError ? <div className="pollActionError">{actionError}</div> : null}
    </article>
  );
}


export function ChatPollFeed({ api, chatId, currentUserId }) {
  const [polls, setPolls] = useState([]);

  async function loadPolls() {
    if (!chatId) return;

    try {
      const data = await api(
        `/api/polls?chat_id=${encodeURIComponent(chatId)}`
      );
      setPolls(data.polls || []);
    } catch {
      // Keep the message stream usable when polls fail to refresh.
    }
  }

  useEffect(() => {
    setPolls([]);
    if (!chatId) return undefined;

    const onChanged = (event) => {
      if (!event.detail?.chatId || event.detail.chatId === chatId) {
        loadPolls();
      }
    };

    loadPolls();
    window.addEventListener("vodkach:polls-changed", onChanged);
    window.addEventListener("vodkach:realtime-connected", loadPolls);

    return () => {
      window.removeEventListener("vodkach:polls-changed", onChanged);
      window.removeEventListener("vodkach:realtime-connected", loadPolls);
    };
  }, [chatId]);

  if (!polls.length) return null;

  return (
    <div className="inlinePollFeed">
      {polls
        .slice()
        .reverse()
        .map((poll) => (
          <PollCard
            key={poll.id}
            poll={poll}
            api={api}
            reload={loadPolls}
            currentUserId={currentUserId}
          />
        ))}
    </div>
  );
}

export function ChatPollSystem({ api, chatId, currentUserId, open, onOpenChange }) {

  const [polls, setPolls] = useState([]);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [anonymous, setAnonymous] = useState(false);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [hideResults, setHideResults] = useState(false);
  const [duration, setDuration] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pollPanelRef = useRef(null);

  async function loadPolls() {
    if (!chatId) return;

    try {
      const data = await api(
        `/api/polls?chat_id=${encodeURIComponent(chatId)}`
      );
      setPolls(data.polls || []);
    } catch {
      // Silent background refresh failure.
    }
  }

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

  useEffect(() => {
    onOpenChange?.(false);
    setPolls([]);

    if (!chatId) return undefined;

    const onChanged = (event) => {
      if (!event.detail?.chatId || event.detail.chatId === chatId) loadPolls();
    };

    loadPolls();
    window.addEventListener("vodkach:polls-changed", onChanged);
    window.addEventListener("vodkach:realtime-connected", loadPolls);
    return () => {
      window.removeEventListener("vodkach:polls-changed", onChanged);
      window.removeEventListener("vodkach:realtime-connected", loadPolls);
    };
  }, [chatId]);

  function updateOption(index, value) {
    setOptions((current) =>
      current.map((option, optionIndex) =>
        optionIndex === index ? value : option
      )
    );
  }

  async function createPoll(event) {
    event?.preventDefault?.();
    if (busy) return;

    const cleanOptions = options.map((option) => option.trim()).filter(Boolean);

    if (!question.trim() || cleanOptions.length < 2) {
      setError("Add a question and at least two options.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await api("/api/polls", {
        method: "POST",
        body: JSON.stringify({
          chat_id: chatId,
          question: question.trim(),
          options: cleanOptions,
          anonymous,
          allow_multiple: allowMultiple,
          hide_results_until_vote: hideResults,
          duration_minutes: Number(duration || 0)
        })
      });

      setQuestion("");
      setOptions(["", ""]);
      setAnonymous(false);
      setAllowMultiple(false);
      setHideResults(false);
      setDuration("0");
      onOpenChange?.(false);
      await loadPolls();
      window.dispatchEvent(
        new CustomEvent("vodkach:polls-changed", {
          detail: { chatId }
        })
      );
    } catch (createError) {
      setError(createError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className={polls.length ? "composerPollButton hasPolls" : "composerPollButton"}
        type="button"
        aria-label="Polls"
        title="Polls"
        onClick={() => onOpenChange?.(!open)}
      >
        <img className="composerActionIcon" src="/ui/poll.svg" alt="" />
      </button>

      {open && (
          <div ref={pollPanelRef} className="pollCreatePopover pollCreateModal" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span className="chatPollEyebrow">
                  <PollIcon />
                  Create Poll
                </span>
                <h2>Ask the chat</h2>
              </div>
              <button type="button" className="composerPopoverClose" onClick={() => onOpenChange?.(false)} aria-label="Close poll creator">
                <CloseIcon />
              </button>
            </header>

            <div className="pollCreateBody">
            <label>
              <span>Question</span>
              <textarea
                value={question}
                maxLength={300}
                rows={2}
                placeholder="What should we do?"
                onChange={(event) => setQuestion(event.target.value)}
              />
            </label>

            <div className="pollOptionEditor">
              <span>Options</span>
              {options.map((option, index) => (
                <div key={index}>
                  <span>{index + 1}</span>
                  <input
                    value={option}
                    maxLength={100}
                    placeholder={`Option ${index + 1}`}
                    onChange={(event) => updateOption(index, event.target.value)}
                  />
                  {options.length > 2 ? (
                    <button
                      type="button"
                      aria-label="Remove option"
                      onClick={() =>
                        setOptions((current) =>
                          current.filter((_, optionIndex) => optionIndex !== index)
                        )
                      }
                    >
                      <img className="pollTrashIcon" src="/ui/trash.png" alt="" />
                    </button>
                  ) : null}
                </div>
              ))}
              {options.length < 10 ? (
                <button
                  className="addPollOption"
                  type="button"
                  onClick={() => setOptions((current) => [...current, ""])}
                >
                  <PlusIcon />
                  Add option
                </button>
              ) : null}
            </div>

            <div className="pollSettingsGrid">
              <label className="pollToggleRow">
                <div>
                  <strong>Anonymous voting</strong>
                  <span>Hide who selected each option.</span>
                </div>
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(event) => setAnonymous(event.target.checked)}
                />
              </label>

              <label className="pollToggleRow">
                <div>
                  <strong>Multiple answers</strong>
                  <span>Allow more than one selected option.</span>
                </div>
                <input
                  type="checkbox"
                  checked={allowMultiple}
                  onChange={(event) => setAllowMultiple(event.target.checked)}
                />
              </label>

              <label className="pollToggleRow">
                <div>
                  <strong>Hide results until vote</strong>
                  <span>Participants vote before seeing percentages.</span>
                </div>
                <input
                  type="checkbox"
                  checked={hideResults}
                  onChange={(event) => setHideResults(event.target.checked)}
                />
              </label>

              <label className="pollDurationField">
                <span>Duration</span>
                <CustomSelect
                  ariaLabel="Poll duration"
                  value={duration}
                  onChange={setDuration}
                  options={[
                    { value: "0", label: "No time limit" },
                    { value: "5", label: "5 minutes" },
                    { value: "15", label: "15 minutes" },
                    { value: "60", label: "1 hour" },
                    { value: "1440", label: "24 hours" },
                    { value: "10080", label: "7 days" }
                  ]}
                />
              </label>
            </div>

            {error ? <div className="pollFormError">{error}</div> : null}

            </div>
            <footer>
              <button type="button" onClick={() => onOpenChange?.(false)}>
                Cancel
              </button>
              <button type="button" disabled={busy} onClick={createPoll}>
                {busy ? "Creating..." : "Create Poll"}
              </button>
            </footer>
        </div>
      )}
    </>
  );
}

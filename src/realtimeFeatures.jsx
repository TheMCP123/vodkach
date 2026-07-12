
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
  return (
    <svg className="callIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 14.4a3.9 3.9 0 0 0 3.9-3.9V6.9a3.9 3.9 0 1 0-7.8 0v3.6a3.9 3.9 0 0 0 3.9 3.9Z" />
      <path d="M5.6 10.5a6.4 6.4 0 0 0 12.8 0h-2a4.4 4.4 0 0 1-8.8 0h-2ZM11 16.8V20H8.3v2h7.4v-2H13v-3.2h-2Z" />
      {muted ? <path className="callIconSlash" d="M3.8 2.9 21.1 20.2l-1.4 1.4L2.4 4.3l1.4-1.4Z" /> : null}
    </svg>
  );
}

function CameraIcon({ disabled = false }) {
  return (
    <svg className="callIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 6h9A2.5 2.5 0 0 1 16 8.5v7a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 2 15.5v-7A2.5 2.5 0 0 1 4.5 6ZM17 9l5-2.6v11.2L17 15V9Z" />
      {disabled ? <path className="callIconSlash" d="M3.8 2.9 21.1 20.2l-1.4 1.4L2.4 4.3l1.4-1.4Z" /> : null}
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

async function importRealtimeKitUi() {
  const sources = [
    "https://cdn.jsdelivr.net/npm/@cloudflare/realtimekit-ui@1.2.0/loader/index.es2017.js",
    "https://unpkg.com/@cloudflare/realtimekit-ui@1.2.0/loader/index.es2017.js"
  ];

  let lastError = null;

  for (const source of sources) {
    try {
      const module = await import(
        /* @vite-ignore */
        source
      );

      await module.defineCustomElements();
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Failed to load RealtimeKit UI");
}

async function loadRealtimeKit() {
  if (
    window.RealtimeKitClient &&
    customElements.get("rtk-participants-audio")
  ) {
    return;
  }

  if (!realtimeKitLoaderPromise) {
    realtimeKitLoaderPromise = Promise.all([
      loadScript(
        "https://cdn.jsdelivr.net/npm/@cloudflare/realtimekit@1.3.0/dist/browser.js"
      ),
      importRealtimeKitUi()
    ]).catch((error) => {
      realtimeKitLoaderPromise = null;
      throw error;
    });
  }

  await realtimeKitLoaderPromise;
}


function extractTrack(value) {
  if (!value) return null;
  if (value instanceof MediaStreamTrack) return value;
  if (value.track instanceof MediaStreamTrack) return value.track;
  if (value.video instanceof MediaStreamTrack) return value.video;
  if (value.video?.track instanceof MediaStreamTrack) return value.video.track;
  if (Array.isArray(value)) {
    for (const item of value) {
      const track = extractTrack(item);
      if (track) return track;
    }
  }
  return null;
}

function MediaTrackVideo({ track, muted = false }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    if (!track) {
      ref.current.srcObject = null;
      return;
    }

    const stream = new MediaStream([track]);
    ref.current.srcObject = stream;
    ref.current.play().catch(() => {});

    return () => {
      if (ref.current?.srcObject === stream) {
        ref.current.srcObject = null;
      }
    };
  }, [track]);

  if (!track) return null;

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className="callShareVideo"
    />
  );
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
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [remoteSharing, setRemoteSharing] = useState(false);
  const [localShareTrack, setLocalShareTrack] = useState(null);
  const [remoteShareTrack, setRemoteShareTrack] = useState(null);
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [remoteSpeaking, setRemoteSpeaking] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [networkPing, setNetworkPing] = useState(null);
  const [callStartedAt, setCallStartedAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const meetingRef = useRef(null);
  const participantAudioRef = useRef(null);
  const localAudioCleanupRef = useRef(null);
  const remoteSpeakingTimerRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const currentCallRef = useRef(null);

  useEffect(() => {
    currentCallRef.current = call;
  }, [call]);

  useEffect(() => {
    if (user?.id) {
      loadRealtimeKit().catch(() => {});
    }
  }, [user?.id]);

  async function pushMediaState(next) {
    const current = currentCallRef.current;
    if (!current?.id || String(current.id).startsWith("preparing_")) return;

    try {
      await api("/api/calls/media", {
        method: "POST",
        body: JSON.stringify({
          call_id: current.id,
          ...next
        })
      });
    } catch {
      // Polling and SDK events remain the fallback.
    }
  }

  function bindRemoteParticipant(participant) {
    if (!participant) return;

    const updateMute = (event) => {
      const enabled =
        event?.audioEnabled ??
        event?.enabled ??
        participant.audioEnabled;

      if (typeof enabled === "boolean") {
        setRemoteMuted(!enabled);
      }
    };

    const updateShare = (event) => {
      const enabled =
        event?.screenShareEnabled ??
        event?.enabled ??
        participant.screenShareEnabled;

      if (typeof enabled === "boolean") {
        setRemoteSharing(enabled);
      }

      const track = extractTrack(
        event?.screenShareTracks ||
        participant.screenShareTracks ||
        participant.screenShareTrack
      );
      setRemoteShareTrack(track);
    };

    updateMute();
    updateShare();

    participant.on?.("audioUpdate", updateMute);
    participant.on?.("screenShareUpdate", updateShare);
  }

  async function connectToMeeting(callData) {
    setError("");
    setPhase("connecting");
    setCall(callData);

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
      peerConnectionRef.current = null;

      meeting.self.on?.("roomJoined", () => {
        setPhase("connecting");
        pushMediaState({
          joined: true,
          muted: false,
          sharing: false,
          speaking: false
        });
      });

      meeting.self.on?.("audioUpdate", (event) => {
        const enabled = event?.audioEnabled ?? event?.enabled;
        if (typeof enabled === "boolean") {
          setMuted(!enabled);
          pushMediaState({ muted: !enabled });
        }
      });

      meeting.self.on?.("screenShareUpdate", (event) => {
        const enabled = event?.screenShareEnabled ?? event?.enabled;
        if (typeof enabled === "boolean") {
          setScreenSharing(enabled);
          pushMediaState({ sharing: enabled });
        }

        setLocalShareTrack(
          extractTrack(
            event?.screenShareTracks ||
            meeting.self.screenShareTracks ||
            meeting.self.screenShareTrack
          )
        );
      });

      meeting.participants?.joined?.on?.("participantJoined", (participant) => {
        bindRemoteParticipant(participant);
      });

      meeting.participants?.joined?.on?.("participantLeft", () => {
        setRemoteSpeaking(false);
        setRemoteMuted(false);
        setRemoteSharing(false);
        setRemoteShareTrack(null);
      });

      const joined = meeting.participants?.joined;
      const initialParticipants =
        joined?.toArray?.() ||
        (joined?.values ? Array.from(joined.values()) : []);

      for (const participant of initialParticipants || []) {
        bindRemoteParticipant(participant);
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
          window.clearTimeout(remoteSpeakingTimerRef.current);
        }

        remoteSpeakingTimerRef.current = window.setTimeout(() => {
          setRemoteSpeaking(false);
        }, 420);
      });

      meeting.self.on?.("roomLeft", () => {
        setPhase((value) =>
          value === "connected" ? "reconnecting" : value
        );
        pushMediaState({
          joined: false,
          speaking: false,
          sharing: false
        });
      });

      await meeting.join();

      requestAnimationFrame(() => {
        if (participantAudioRef.current) {
          participantAudioRef.current.meeting = meeting;
        }
      });

      setMuted(false);
      setVideoEnabled(false);
      setScreenSharing(false);
      setRemoteMuted(false);
      setRemoteSharing(false);
      setLocalShareTrack(null);
      setRemoteShareTrack(null);
    } catch (connectError) {
      setError(connectError.message || "Could not connect to the call");
      setCall(null);
      setPhase("idle");
    }
  }

  async function startCall() {
    if (!activeChat?.id || call || phase !== "idle") return;

    const other = activeChat.other_user || {};

    setCall({
      id: `preparing_${Date.now()}`,
      chat_id: activeChat.id,
      other_user_id: other.id,
      other_username: other.username,
      other_display_name: other.display_name,
      other_avatar_url: other.avatar_url
    });
    setPhase("preparing");
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
      setCall(null);
      setPhase("idle");
    }
  }

  useImperativeHandle(ref, () => ({ start: startCall }), [
    activeChat?.id,
    call,
    phase
  ]);

  async function acceptCall() {
    if (!incoming?.id) return;

    const acceptedIncoming = incoming;
    setIncoming(null);
    setCall(acceptedIncoming);
    setPhase("connecting");
    setError("");

    try {
      let data = null;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          data = await api("/api/calls/respond", {
            method: "POST",
            body: JSON.stringify({
              call_id: acceptedIncoming.id,
              action: "accept"
            })
          });
          break;
        } catch (acceptError) {
          if (attempt === 2) throw acceptError;
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      await connectToMeeting({
        ...data.call,
        auth_token: data.auth_token
      });
    } catch (acceptError) {
      setError(acceptError.message || "Could not accept the call");
      setCall(null);
      setPhase("idle");
    }
  }

  async function declineCall() {
    const current = incoming;
    setIncoming(null);

    if (!current?.id) return;

    try {
      await api("/api/calls/respond", {
        method: "POST",
        body: JSON.stringify({
          call_id: current.id,
          action: "decline"
        })
      });
    } catch {
      // Caller may already have ended it.
    }
  }

  async function closeLocalCall() {
    localAudioCleanupRef.current?.();
    localAudioCleanupRef.current = null;

    if (remoteSpeakingTimerRef.current) {
      window.clearTimeout(remoteSpeakingTimerRef.current);
      remoteSpeakingTimerRef.current = null;
    }

    meetingRef.current = null;
    peerConnectionRef.current = null;
    setCall(null);
    setPhase("idle");
    setMuted(false);
    setRemoteMuted(false);
    setVideoEnabled(false);
    setScreenSharing(false);
    setRemoteSharing(false);
    setLocalShareTrack(null);
    setRemoteShareTrack(null);
    setLocalSpeaking(false);
    setRemoteSpeaking(false);
    setMediaBusy(false);
    setNetworkPing(null);
    setCallStartedAt(null);
    setElapsedSeconds(0);
  }

  async function endCall() {
    const current = currentCallRef.current;

    await pushMediaState({
      joined: false,
      speaking: false,
      sharing: false
    });

    try {
      await meetingRef.current?.leave?.();
    } catch {
      // Server cleanup is still required.
    }

    if (current?.id && !String(current.id).startsWith("preparing_")) {
      try {
        await api("/api/calls/end", {
          method: "POST",
          body: JSON.stringify({ call_id: current.id })
        });
      } catch {
        // UI must still close locally.
      }
    }

    await closeLocalCall();
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

  async function toggleVideo() {
    const meeting = meetingRef.current;
    if (!meeting || mediaBusy) return;

    setMediaBusy(true);

    try {
      if (videoEnabled) {
        await meeting.self.disableVideo();
      } else {
        await meeting.self.enableVideo();
      }

      setVideoEnabled(!videoEnabled);
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

      window.setTimeout(() => {
        setLocalShareTrack(
          extractTrack(
            meeting.self.screenShareTracks ||
            meeting.self.screenShareTrack
          )
        );
      }, 120);
    } catch (mediaError) {
      setError(mediaError.message || "Could not change screen share state");
    } finally {
      setMediaBusy(false);
    }
  }

  useEffect(() => {
    if (phase !== "connected" || muted) {
      setLocalSpeaking(false);
      localAudioCleanupRef.current?.();
      localAudioCleanupRef.current = null;
      return undefined;
    }

    const track = extractTrack(
      meetingRef.current?.self?.audioTrack ||
      meetingRef.current?.self?.audioTracks ||
      meetingRef.current?.self?.tracks?.audio
    );

    if (!track) return undefined;

    let stopped = false;
    let frame = 0;
    let context = null;

    try {
      context = new AudioContext();
      const source = context.createMediaStreamSource(new MediaStream([track]));
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.76;
      source.connect(analyser);

      const values = new Uint8Array(analyser.frequencyBinCount);
      let last = false;

      const tick = () => {
        if (stopped) return;

        analyser.getByteTimeDomainData(values);
        let sum = 0;

        for (const value of values) {
          const normalized = (value - 128) / 128;
          sum += normalized * normalized;
        }

        const speaking = Math.sqrt(sum / values.length) > 0.035;

        if (speaking !== last) {
          last = speaking;
          setLocalSpeaking(speaking);
          pushMediaState({ speaking });
        }

        frame = requestAnimationFrame(tick);
      };

      tick();
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

    localAudioCleanupRef.current = cleanup;
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
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [callStartedAt, phase]);

  useEffect(() => {
    if (phase !== "connected") {
      setNetworkPing(null);
      return undefined;
    }

    let stopped = false;

    function findPeerConnectionOnce(root) {
      if (peerConnectionRef.current) return peerConnectionRef.current;

      const queue = [{ value: root, depth: 0 }];
      const seen = new WeakSet();

      while (queue.length) {
        const { value, depth } = queue.shift();

        if (!value || depth > 3) continue;
        if (typeof value !== "object" && typeof value !== "function") continue;
        if (seen.has(value)) continue;
        seen.add(value);

        if (
          typeof RTCPeerConnection !== "undefined" &&
          value instanceof RTCPeerConnection
        ) {
          peerConnectionRef.current = value;
          return value;
        }

        let keys = [];
        try {
          keys = Reflect.ownKeys(value).slice(0, 35);
        } catch {
          continue;
        }

        for (const key of keys) {
          try {
            queue.push({ value: value[key], depth: depth + 1 });
          } catch {
            // Ignore throwing SDK getters.
          }
        }
      }

      return null;
    }

    async function sampleRtt() {
      try {
        const peer = findPeerConnectionOnce(meetingRef.current);

        if (!peer) {
          if (!stopped) setNetworkPing(null);
          return;
        }

        const report = await peer.getStats();
        let rtt = null;

        report.forEach((item) => {
          if (
            item.type === "candidate-pair" &&
            (item.selected || item.nominated || item.state === "succeeded") &&
            Number.isFinite(item.currentRoundTripTime)
          ) {
            const value = Math.max(
              1,
              Math.round(item.currentRoundTripTime * 1000)
            );
            if (rtt == null || value < rtt) rtt = value;
          }
        });

        if (!stopped) setNetworkPing(rtt);
      } catch {
        if (!stopped) setNetworkPing(null);
      }
    }

    sampleRtt();
    const timer = window.setInterval(sampleRtt, 2000);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [phase, call?.id]);

  useEffect(() => {
    if (!user?.id) return undefined;

    let stopped = false;

    async function checkCalls() {
      try {
        const callId =
          currentCallRef.current?.id &&
          !String(currentCallRef.current.id).startsWith("preparing_")
            ? `?call_id=${encodeURIComponent(currentCallRef.current.id)}`
            : "";

        const data = await api(`/api/calls/status${callId}`);

        if (stopped) return;

        if (!currentCallRef.current && data.incoming) {
          setIncoming(data.incoming);
        } else if (!data.incoming) {
          setIncoming(null);
        }

        const current = currentCallRef.current;
        const server = data.current;

        if (!current || !server) return;
        if (
          !String(current.id).startsWith("preparing_") &&
          server.id !== current.id
        ) return;

        setCall((value) =>
          value
            ? {
                ...value,
                ...server,
                auth_token: value.auth_token
              }
            : value
        );

        setRemoteMuted(Boolean(server.media?.remote_muted));
        setRemoteSharing(Boolean(server.media?.remote_sharing));
        setRemoteSpeaking(Boolean(server.media?.remote_speaking));

        if (server.status === "ringing") {
          setPhase((value) =>
            ["preparing", "connecting"].includes(value)
              ? value
              : "ringing"
          );
        } else if (server.status === "active") {
          const ready =
            server.media?.local_joined &&
            server.media?.remote_joined;

          setPhase(ready ? "connected" : "connecting");

          if (ready) {
            setCallStartedAt((value) => value || Date.now());
          }
        } else if (
          ["declined", "ended", "missed"].includes(server.status)
        ) {
          await closeLocalCall();
        }
      } catch {
        // Keep the current UI during temporary network failures.
      }
    }

    checkCalls();
    const timer = window.setInterval(
      checkCalls,
      currentCallRef.current || incoming ? 500 : 700
    );

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [user?.id, call?.id, incoming?.id]);

  function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = seconds % 60;

    if (hours) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
    }

    return `${minutes}:${String(rest).padStart(2, "0")}`;
  }

  const showShare = screenSharing || remoteSharing;
  const displayedShareTrack = remoteShareTrack || localShareTrack;
  const otherName =
    call?.other_display_name ||
    call?.other_username ||
    "Participant";

  return (
    <>
      {incoming && !call && (
        <div className="discordIncomingBanner">
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
            <span>is calling you</span>
          </div>

          <button
            className="incomingDeclineButton"
            type="button"
            title="Decline"
            onClick={declineCall}
          >
            <HangupIcon />
          </button>

          <button
            className="incomingAcceptButton"
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
          <section className={showShare ? "discordCallBar sharing" : "discordCallBar"}>
            {showShare ? (
              <div className="discordShareStage">
                {displayedShareTrack ? (
                  <MediaTrackVideo
                    track={displayedShareTrack}
                    muted={!remoteShareTrack}
                  />
                ) : (
                  <div className="shareWaitingState">
                    <ScreenShareIcon active />
                    <strong>
                      {remoteSharing ? `${otherName} is sharing` : "You are sharing"}
                    </strong>
                    <span>Waiting for the video track...</span>
                  </div>
                )}

                <div className="shareParticipantRail">
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
            ) : (
              <div className="discordVoiceSummary">
                <div className="callAvatarStack">
                  <div className={localSpeaking ? "callAvatar speaking" : "callAvatar"}>
                    <img
                      src={user?.avatar_url || "/default-avatar.png"}
                      alt=""
                    />
                    {muted ? (
                      <span className="callMuteBadge">
                        <MicrophoneIcon muted />
                      </span>
                    ) : null}
                  </div>

                  <div className={remoteSpeaking && !remoteMuted ? "callAvatar speaking" : "callAvatar"}>
                    <img
                      src={call.other_avatar_url || "/default-avatar.png"}
                      alt=""
                    />
                    {remoteMuted ? (
                      <span className="callMuteBadge">
                        <MicrophoneIcon muted />
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="callPrimaryInfo">
                  <strong>{otherName}</strong>
                  <span>
                    {phase === "connected"
                      ? `${formatDuration(elapsedSeconds)} · ${networkPing == null ? "RTC —" : `${networkPing} ms`}`
                      : phase === "ringing"
                        ? "Ringing..."
                        : phase === "reconnecting"
                          ? "Reconnecting..."
                          : phase === "preparing"
                            ? "Starting call..."
                            : "Joining voice..."}
                  </span>
                </div>
              </div>
            )}

            <div className="discordCallControls">
              <button
                className={muted ? "callControl activeDanger" : "callControl"}
                type="button"
                title={muted ? "Unmute" : "Mute"}
                disabled={mediaBusy || phase !== "connected"}
                onClick={toggleMicrophone}
              >
                <MicrophoneIcon muted={muted} />
              </button>

              <button
                className={videoEnabled ? "callControl active" : "callControl"}
                type="button"
                title={videoEnabled ? "Turn camera off" : "Turn camera on"}
                disabled={mediaBusy || phase !== "connected"}
                onClick={toggleVideo}
              >
                <CameraIcon disabled={!videoEnabled} />
              </button>

              <button
                className={screenSharing ? "callControl active" : "callControl"}
                type="button"
                title={screenSharing ? "Stop sharing" : "Share screen"}
                disabled={mediaBusy || phase !== "connected"}
                onClick={toggleScreenShare}
              >
                <ScreenShareIcon active={screenSharing} />
              </button>

              <button
                className="callControl disconnect"
                type="button"
                title="Disconnect"
                onClick={endCall}
              >
                <HangupIcon />
              </button>
            </div>

            <div className="callAudioMount" aria-hidden="true">
              {React.createElement("rtk-participants-audio", {
                ref: participantAudioRef
              })}
            </div>
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

function PollCard({ poll, api, reload, currentUserId }) {
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
    await api("/api/polls/vote", {
      method: "POST",
      body: JSON.stringify({
        poll_id: poll.id,
        option_id: optionId
      })
    });
    reload();
    window.dispatchEvent(new CustomEvent("vodkach:polls-changed"));
  }

  async function closePoll() {
    await api("/api/polls/close", {
      method: "POST",
      body: JSON.stringify({ poll_id: poll.id })
    });
    reload();
    window.dispatchEvent(new CustomEvent("vodkach:polls-changed"));
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
              disabled={Boolean(poll.closed_at)}
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
    const timer = window.setInterval(loadPolls, 3500);
    window.addEventListener("vodkach:polls-changed", onChanged);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("vodkach:polls-changed", onChanged);
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

export function ChatPollSystem({ api, chatId, currentUserId }) {
  const [open, setOpen] = useState(false);

  const [polls, setPolls] = useState([]);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [anonymous, setAnonymous] = useState(false);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [hideResults, setHideResults] = useState(false);
  const [duration, setDuration] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
    setOpen(false);
    setPolls([]);

    if (!chatId) return undefined;

    loadPolls();
    const timer = window.setInterval(loadPolls, 3500);
    return () => window.clearInterval(timer);
  }, [chatId]);

  function updateOption(index, value) {
    setOptions((current) =>
      current.map((option, optionIndex) =>
        optionIndex === index ? value : option
      )
    );
  }

  async function createPoll(event) {
    event.preventDefault();
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
      setOpen(false);
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
        onClick={() => setOpen(true)}
      >
        <PollIcon />
      </button>

      {open &&
        createPortal(
          <div className="pollModalBackdrop" onMouseDown={() => setOpen(false)}>
          <form
            className="pollCreateModal"
            onSubmit={createPoll}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span className="chatPollEyebrow">
                  <PollIcon />
                  Create Poll
                </span>
                <h2>Ask the chat</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)}>
                <CloseIcon />
              </button>
            </header>

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
                      <CloseIcon />
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
                <select
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                >
                  <option value="0">No time limit</option>
                  <option value="5">5 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="1440">24 hours</option>
                  <option value="10080">7 days</option>
                </select>
              </label>
            </div>

            {error ? <div className="pollFormError">{error}</div> : null}

            <footer>
              <button type="button" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="submit" disabled={busy}>
                {busy ? "Creating..." : "Create Poll"}
              </button>
            </footer>
          </form>
        </div>,
          document.body
        )}
    </>
  );
}

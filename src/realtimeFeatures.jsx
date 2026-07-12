
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
    <IconBase>
      <path d="M4.1 15.6c2.25-2.15 4.9-3.2 7.9-3.2s5.65 1.05 7.9 3.2" />
      <path d="m6.9 14.2-1.1 4.1M17.1 14.2l1.1 4.1" />
      <path d="M9.2 12.9v3.4M14.8 12.9v3.4" />
    </IconBase>
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
    <IconBase>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 10.5a6.5 6.5 0 0 0 13 0M12 17v4M8.5 21h7" />
      {muted ? <path className="iconSlash" d="M4 4l16 16" /> : null}
    </IconBase>
  );
}

function CameraIcon({ disabled = false }) {
  return (
    <IconBase>
      <rect x="3" y="6" width="13" height="12" rx="2.5" />
      <path d="m16 10 5-3v10l-5-3" />
      {disabled ? <path className="iconSlash" d="M4 4l16 16" /> : null}
    </IconBase>
  );
}

function ScreenShareIcon({ active = false }) {
  return (
    <IconBase>
      <rect x="3" y="4" width="18" height="13" rx="2.5" />
      <path d="M8 21h8M12 17v4" />
      {active ? (
        <path d="m9 10 3-3 3 3M12 7v7" />
      ) : (
        <path d="m9 12 3-3 3 3M12 9v5" />
      )}
    </IconBase>
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

async function loadRealtimeKit() {
  if (window.RealtimeKitClient && customElements.get("rtk-meeting")) return;

  if (!realtimeKitLoaderPromise) {
    realtimeKitLoaderPromise = Promise.all([
      loadScript(
        "https://cdn.jsdelivr.net/npm/@cloudflare/realtimekit@latest/dist/browser.js"
      ),
      import(
        /* @vite-ignore */
        "https://cdn.jsdelivr.net/npm/@cloudflare/realtimekit-ui@latest/loader/index.es2017.js"
      ).then((module) => module.defineCustomElements())
    ]);
  }

  await realtimeKitLoaderPromise;
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
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [networkPing, setNetworkPing] = useState(null);
  const [connectionType, setConnectionType] = useState("Unknown");
  const [callStartedAt, setCallStartedAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const meetingRef = useRef(null);
  const meetingElementRef = useRef(null);

  async function connectToMeeting(callData) {
    setError("");
    setPhase("connecting");

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
      setCall(callData);

      meeting.self.on("roomJoined", () => setPhase("connected"));
      meeting.self.on("roomLeft", () => {
        setPhase("idle");
        setCall(null);
        meetingRef.current = null;
      });

      await meeting.join();

      requestAnimationFrame(() => {
        if (meetingElementRef.current) {
          meetingElementRef.current.meeting = meeting;
        }
      });

      setMuted(false);
      setVideoEnabled(false);
      setScreenSharing(false);
      setCallStartedAt(Date.now());
      setElapsedSeconds(0);
      setPhase("connected");
    } catch (connectError) {
      setError(connectError.message || "Could not connect to the call");
      setPhase("idle");
      setCall(null);
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

      setCall(data.call);
      await connectToMeeting({
        ...data.call,
        auth_token: data.auth_token
      });
    } catch (startError) {
      setError(startError.message);
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

    setPhase("connecting");
    setError("");

    try {
      const data = await api("/api/calls/respond", {
        method: "POST",
        body: JSON.stringify({
          call_id: incoming.id,
          action: "accept"
        })
      });

      setIncoming(null);
      await connectToMeeting({
        ...data.call,
        auth_token: data.auth_token
      });
    } catch (acceptError) {
      setError(acceptError.message);
      setPhase("idle");
    }
  }

  async function declineCall() {
    if (!incoming?.id) return;

    try {
      await api("/api/calls/respond", {
        method: "POST",
        body: JSON.stringify({
          call_id: incoming.id,
          action: "decline"
        })
      });
    } catch {
      // The caller may already have ended the call.
    }

    setIncoming(null);
  }

  async function endCall() {
    const active = call;

    try {
      if (meetingRef.current) {
        await meetingRef.current.leave();
      }
    } catch {
      // Continue with server cleanup.
    }

    if (active?.id) {
      try {
        await api("/api/calls/end", {
          method: "POST",
          body: JSON.stringify({ call_id: active.id })
        });
      } catch {
        // Local UI should still close.
      }
    }

    meetingRef.current = null;
    setCall(null);
    setMuted(false);
    setVideoEnabled(false);
    setScreenSharing(false);
    setMediaBusy(false);
    setCallStartedAt(null);
    setElapsedSeconds(0);
    setNetworkPing(null);
    setPhase("idle");
  }

  async function toggleMicrophone() {
    const meeting = meetingRef.current;
    if (!meeting || mediaBusy) return;

    setMediaBusy(true);
    setError("");

    try {
      if (muted) {
        await meeting.self.enableAudio();
        setMuted(false);
      } else {
        await meeting.self.disableAudio();
        setMuted(true);
      }
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
    setError("");

    try {
      if (videoEnabled) {
        await meeting.self.disableVideo();
        setVideoEnabled(false);
      } else {
        await meeting.self.enableVideo();
        setVideoEnabled(true);
      }
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
    setError("");

    try {
      if (screenSharing) {
        await meeting.self.disableScreenShare();
        setScreenSharing(false);
      } else {
        await meeting.self.enableScreenShare();
        setScreenSharing(true);
      }
    } catch (mediaError) {
      setError(mediaError.message || "Could not change screen share state");
    } finally {
      setMediaBusy(false);
    }
  }

  useEffect(() => {
    if (!callStartedAt || phase !== "connected") return undefined;

    const updateElapsed = () => {
      setElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - callStartedAt) / 1000))
      );
    };

    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [callStartedAt, phase]);

  useEffect(() => {
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    function updateConnectionType() {
      const effectiveType = connection?.effectiveType;
      const type = connection?.type;
      setConnectionType(
        effectiveType
          ? String(effectiveType).toUpperCase()
          : type
            ? String(type)
            : "Unknown"
      );
    }

    updateConnectionType();
    connection?.addEventListener?.("change", updateConnectionType);

    return () => {
      connection?.removeEventListener?.("change", updateConnectionType);
    };
  }, []);

  useEffect(() => {
    if (!call || phase !== "connected") return undefined;

    let stopped = false;

    async function measurePing() {
      const startedAt = performance.now();

      try {
        await api("/api/calls/status");
        if (!stopped) {
          setNetworkPing(Math.max(1, Math.round(performance.now() - startedAt)));
        }
      } catch {
        if (!stopped) setNetworkPing(null);
      }
    }

    measurePing();
    const timer = window.setInterval(measurePing, 5000);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [call?.id, phase]);

  function formatDuration(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(
        seconds
      ).padStart(2, "0")}`;
    }

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function connectionQuality() {
    if (networkPing == null) return "Checking";
    if (networkPing < 90) return "Excellent";
    if (networkPing < 180) return "Good";
    if (networkPing < 300) return "Fair";
    return "Poor";
  }

  useEffect(() => {
    if (!user?.id) return undefined;

    let stopped = false;

    async function checkCalls() {
      try {
        const data = await api("/api/calls/status");

        if (stopped) return;

        if (!call && data.incoming) {
          setIncoming(data.incoming);
        } else if (!data.incoming) {
          setIncoming(null);
        }

        if (
          call &&
          data.current &&
          ["declined", "ended", "missed"].includes(data.current.status)
        ) {
          endCall();
        }
      } catch {
        // Silent polling failure.
      }
    }

    checkCalls();
    const timer = window.setInterval(checkCalls, 1800);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [user?.id, call?.id]);

  return (
    <>
      {incoming && !call && (
        <div className="incomingCallCard">
          <img
            src={incoming.caller_avatar_url || "/default-avatar.png"}
            alt=""
          />
          <div className="incomingCallText">
            <strong>
              {incoming.caller_display_name ||
                incoming.caller_username ||
                "Incoming call"}
            </strong>
            <span>Incoming Vodkach call</span>
          </div>
          <div className="incomingCallActions">
            <button
              className="callDeclineButton"
              type="button"
              aria-label="Decline call"
              onClick={declineCall}
            >
              <HangupIcon />
            </button>
            <button
              className="callAcceptButton"
              type="button"
              aria-label="Accept call"
              onClick={acceptCall}
            >
              <AcceptCallIcon />
            </button>
          </div>
        </div>
      )}

      {call &&
        createPortal(
          <div className={screenSharing ? "inlineDiscordCall sharing" : "inlineDiscordCall"}>
            <header className="inlineDiscordCallTopbar">
              <div className="inlineCallIdentity">
                <span className="inlineVoiceBars">
                  <span />
                  <span />
                  <span />
                </span>
                <div>
                  <strong>
                    {call.other_display_name ||
                      call.other_username ||
                      "Vodkach Call"}
                  </strong>
                  <span>
                    {phase === "connected"
                      ? "Voice Connected"
                      : phase === "connecting"
                        ? "Connecting..."
                        : "Calling..."}
                  </span>
                </div>
              </div>

              <div className="inlineCallStats">
                <span>{formatDuration(elapsedSeconds)}</span>
                <span>{networkPing == null ? "-" : `${networkPing} ms`}</span>
                <span>{connectionQuality()}</span>
              </div>
            </header>

            <section className="inlineDiscordStage">
              {screenSharing ? (
                <div className="inlineScreenShareStage">
                  <div className="screenSharePlaceholder">
                    <ScreenShareIcon active />
                    <strong>Screen sharing is active</strong>
                    <span>Your shared screen is being broadcast</span>
                  </div>

                  <div className="inlineParticipantRail">
                    <article className="inlineParticipantMini">
                      <img
                        src={user?.avatar_url || "/default-avatar.png"}
                        alt=""
                      />
                      <span>{user?.display_name || user?.username || "You"}</span>
                      <small>{muted ? "Muted" : "You"}</small>
                    </article>

                    <article className="inlineParticipantMini">
                      <img
                        src={call.other_avatar_url || "/default-avatar.png"}
                        alt=""
                      />
                      <span>
                        {call.other_display_name ||
                          call.other_username ||
                          "Participant"}
                      </span>
                      <small>
                        {phase === "connected" ? "Connected" : "Waiting"}
                      </small>
                    </article>
                  </div>
                </div>
              ) : (
                <div className="inlineParticipantCanvas">
                  <article className="inlineParticipantCard">
                    <div className="inlineAvatarWrap">
                      <img
                        src={user?.avatar_url || "/default-avatar.png"}
                        alt=""
                      />
                      <span className={muted ? "inlineMicBadge muted" : "inlineMicBadge"}>
                        <MicrophoneIcon muted={muted} />
                      </span>
                    </div>
                    <strong>{user?.display_name || user?.username || "You"}</strong>
                    <span>{muted ? "Muted" : "Connected"}</span>
                  </article>

                  <article className="inlineParticipantCard">
                    <div className="inlineAvatarWrap">
                      <img
                        src={call.other_avatar_url || "/default-avatar.png"}
                        alt=""
                      />
                      <span
                        className={
                          phase === "connected"
                            ? "inlinePresenceBadge online"
                            : "inlinePresenceBadge"
                        }
                      />
                    </div>
                    <strong>
                      {call.other_display_name ||
                        call.other_username ||
                        "Participant"}
                    </strong>
                    <span>
                      {phase === "connected" ? "Connected" : "Waiting for answer"}
                    </span>
                  </article>
                </div>
              )}

              <div className="inlineDiscordControls">
                <div className="inlineControlGroup">
                  <button
                    className={muted ? "inlineCallButton dangerActive" : "inlineCallButton"}
                    type="button"
                    title={muted ? "Unmute" : "Mute"}
                    disabled={mediaBusy || phase !== "connected"}
                    onClick={toggleMicrophone}
                  >
                    <MicrophoneIcon muted={muted} />
                  </button>

                  <button
                    className={videoEnabled ? "inlineCallButton active" : "inlineCallButton"}
                    type="button"
                    title={videoEnabled ? "Turn camera off" : "Turn camera on"}
                    disabled={mediaBusy || phase !== "connected"}
                    onClick={toggleVideo}
                  >
                    <CameraIcon disabled={!videoEnabled} />
                  </button>
                </div>

                <div className="inlineControlGroup">
                  <button
                    className={screenSharing ? "inlineCallButton active" : "inlineCallButton"}
                    type="button"
                    title={screenSharing ? "Stop sharing" : "Share screen"}
                    disabled={mediaBusy || phase !== "connected"}
                    onClick={toggleScreenShare}
                  >
                    <ScreenShareIcon active={screenSharing} />
                  </button>
                </div>

                <button
                  className="inlineCallButton disconnect"
                  type="button"
                  title="Disconnect"
                  onClick={endCall}
                >
                  <HangupIcon />
                </button>
              </div>
            </section>

            <div className="hiddenRealtimeMeeting" aria-hidden="true">
              {React.createElement("rtk-meeting", {
                ref: meetingElementRef,
                mode: "fill",
                "show-setup-screen": "false"
              })}
            </div>
          </div>,
          document.querySelector(".appChat") || document.body
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

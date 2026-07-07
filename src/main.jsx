import React from "react";
import { createRoot } from "react-dom/client";
import { ShieldCheck, LockKeyhole, MessageCircle, ArrowRight } from "lucide-react";
import "./styles.css";

function App() {
  return (
    <main className="page">
      <div className="backgroundGlow backgroundGlowOne" />
      <div className="backgroundGlow backgroundGlowTwo" />

      <nav className="nav">
        <div className="brand">
          <div className="brandMark">W</div>
          <span>Vodkach</span>
        </div>

        <div className="navLinks">
          <a href="#security">Security</a>
          <a href="#private">Private</a>
          <a href="#start">Start</a>
        </div>
      </nav>

      <section className="hero">
        <div className="heroText">
          <div className="badge">
            <ShieldCheck size={16} />
            Private encrypted messenger
          </div>

          <h1>
            Vodkach is a private messenger for people who do not trust random servers.
          </h1>

          <p>
            Dark, fast, and built around encryption from the first day. Messages should belong to users — not to databases, logs, or leaked backups.
          </p>

          <div className="actions" id="start">
            <button className="primaryButton">
              Coming soon
              <ArrowRight size={18} />
            </button>
            <button className="secondaryButton">
              GitHub build
            </button>
          </div>
        </div>

        <div className="previewCard">
          <div className="windowHeader">
            <span className="dot red" />
            <span className="dot gray" />
            <span className="dot dark" />
          </div>

          <div className="messengerMock">
            <aside className="serverRail">
              <div className="serverIcon active">W</div>
              <div className="serverIcon">+</div>
              <div className="serverIcon dim">#</div>
            </aside>

            <aside className="chatRail">
              <h3>Vodkach</h3>
              <div className="channel active"># encrypted-chat</div>
              <div className="channel"># private-room</div>
              <div className="channel"># dev-log</div>
            </aside>

            <section className="chatArea">
              <div className="chatTop"># encrypted-chat</div>

              <div className="message">
                <div className="avatar">M</div>
                <div>
                  <strong>Max</strong>
                  <p>Server stores ciphertext only.</p>
                </div>
              </div>

              <div className="message">
                <div className="avatar redAvatar">W</div>
                <div>
                  <strong>Vodkach</strong>
                  <p>Database leak should not mean message leak.</p>
                </div>
              </div>

              <div className="inputMock">Message #encrypted-chat</div>
            </section>
          </div>
        </div>
      </section>

      <section className="cards" id="security">
        <article className="card">
          <LockKeyhole />
          <h2>Encrypted by design</h2>
          <p>No plain-text message storage. The future backend will store encrypted payloads, nonces, and metadata only.</p>
        </article>

        <article className="card" id="private">
          <ShieldCheck />
          <h2>Private first</h2>
          <p>Google login for identity, device keys for encryption, and no fake “magic recovery” promises.</p>
        </article>

        <article className="card">
          <MessageCircle />
          <h2>Discord-like feel</h2>
          <p>Servers, rooms, direct messages, and real-time chat — but with Vodkach’s own black, gray, and red style.</p>
        </article>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);

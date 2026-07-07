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
          <div className="brandMark">V</div>
          <span>Vodkach</span>
        </div>

        <div className="navStatus">Private Beta</div>
      </nav>

      <section className="hero">
        <div className="heroText">
          <div className="badge">
            <ShieldCheck size={16} />
            encrypted messenger
          </div>

          <h1>Private chat. No bullshit.</h1>

          <p>
            Vodkach is a dark encrypted messenger for private conversations.
            Fast, minimal, and built so leaked databases do not expose messages.
          </p>

          <div className="actions">
            <button className="primaryButton" type="button" disabled>
              Open in Web
              <ArrowRight size={18} />
            </button>

            <button className="secondaryButton" type="button">
              Coming soon
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
              <div className="serverIcon active">V</div>
              <div className="serverIcon">+</div>
            </aside>

            <aside className="chatRail">
              <h3>Vodkach</h3>
              <div className="channel active"># private</div>
              <div className="channel"># friends</div>
              <div className="channel"># files</div>
            </aside>

            <section className="chatArea">
              <div className="chatTop"># private</div>

              <div className="message">
                <div className="avatar">M</div>
                <div>
                  <strong>Max</strong>
                  <p>Plain text messages? Nah.</p>
                </div>
              </div>

              <div className="message">
                <div className="avatar redAvatar">V</div>
                <div>
                  <strong>Vodkach</strong>
                  <p>Only encrypted payloads hit the database.</p>
                </div>
              </div>

              <div className="encryptedLine">
                <LockKeyhole size={15} />
                encrypted storage enabled
              </div>

              <div className="inputMock">Message #private</div>
            </section>
          </div>
        </div>
      </section>

      <section className="cards">
        <article className="card">
          <LockKeyhole />
          <h2>Encrypted</h2>
          <p>Messages are planned to be stored as ciphertext, not readable text.</p>
        </article>

        <article className="card">
          <ShieldCheck />
          <h2>Private</h2>
          <p>No fake recovery promises. Lost keys mean lost history.</p>
        </article>

        <article className="card">
          <MessageCircle />
          <h2>Simple</h2>
          <p>Discord-like layout without copying Discord’s branding.</p>
        </article>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);

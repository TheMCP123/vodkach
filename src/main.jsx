import React from "react";
import { createRoot } from "react-dom/client";
import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import "./styles.css";

function App() {
  return (
    <main className="page">
      <nav className="nav">
        <div className="brand">
          <div className="brandMark">V</div>
          <span>Vodkach</span>
        </div>

        <div className="navRight">
          <span className="statusDot" />
          <span>Private beta</span>
        </div>
      </nav>

      <section className="hero">
        <div className="heroCopy">
          <div className="eyebrow">
            <LockKeyhole size={15} />
            encrypted messenger
          </div>

          <h1>Private messaging, built clean.</h1>

          <p className="lead">
            Vodkach is a secure web messenger focused on encrypted chats,
            simple design, and no unnecessary noise.
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

        <div className="productCard" aria-label="Vodkach interface preview">
          <div className="productTop">
            <div>
              <span className="label">Workspace</span>
              <strong>Vodkach</strong>
            </div>
            <span className="secureBadge">
              <ShieldCheck size={14} />
              secure
            </span>
          </div>

          <div className="productBody">
            <aside className="rooms">
              <span className="room active">private</span>
              <span className="room">friends</span>
              <span className="room">files</span>
            </aside>

            <section className="chat">
              <div className="message">
                <div className="avatar">M</div>
                <div>
                  <strong>Max</strong>
                  <p>Messages should never live as plain text.</p>
                </div>
              </div>

              <div className="message">
                <div className="avatar accent">V</div>
                <div>
                  <strong>Vodkach</strong>
                  <p>Encrypted payload stored. Nothing extra.</p>
                </div>
              </div>

              <div className="inputMock">Message private</div>
            </section>
          </div>
        </div>
      </section>

      <section className="principles">
        <article>
          <LockKeyhole size={20} />
          <h2>Encrypted storage</h2>
          <p>Messages are planned as ciphertext-first, not database-readable text.</p>
        </article>

        <article>
          <ShieldCheck size={20} />
          <h2>Private by default</h2>
          <p>No fake recovery promises. Lost keys mean lost history.</p>
        </article>

        <article>
          <Sparkles size={20} />
          <h2>Minimal interface</h2>
          <p>Only what matters: chats, people, files, and control.</p>
        </article>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);

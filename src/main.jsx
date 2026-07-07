import React from "react";
import { createRoot } from "react-dom/client";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import "./styles.css";

function App() {
  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Vodkach home">
          <span className="brandIcon">V</span>
          <span>Vodkach</span>
        </a>

        <nav className="nav">
          <a href="#security">Security</a>
          <a href="#status">Status</a>
        </nav>
      </header>

      <section className="hero">
        <div className="heroLeft">
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
            <button className="primaryButton" type="button" disabled>
              Open in Web
              <ArrowRight size={17} />
            </button>
            <button className="secondaryButton" type="button">
              Coming soon
            </button>
          </div>
        </div>

        <div className="appPreview" aria-label="Vodkach app preview">
          <aside className="serverBar">
            <div className="serverLogo">V</div>
            <div className="serverDot" />
            <div className="serverDot muted" />
          </aside>

          <aside className="sidebar">
            <div className="sidebarTitle">Vodkach</div>
            <button className="channel active">private</button>
            <button className="channel">friends</button>
            <button className="channel">files</button>
          </aside>

          <section className="chat">
            <div className="chatHeader">
              <span># private</span>
              <span className="chatStatus">
                <ShieldCheck size={14} />
                encrypted
              </span>
            </div>

            <div className="messages">
              <Message avatar="M" name="Max" text="No plain text in storage." />
              <Message avatar="V" name="Vodkach" text="Encrypted payload only." accent />
            </div>

            <div className="composer">Message #private</div>
          </section>
        </div>
      </section>

      <section className="info" id="security">
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

      <footer className="footer" id="status">
        <span>Vodkach</span>
        <span>Early private build</span>
      </footer>
    </main>
  );
}

function Message({ avatar, name, text, accent }) {
  return (
    <div className="message">
      <div className={accent ? "avatar accent" : "avatar"}>{avatar}</div>
      <div>
        <strong>{name}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function InfoItem({ title, text }) {
  return (
    <article className="infoItem">
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

createRoot(document.getElementById("root")).render(<App />);

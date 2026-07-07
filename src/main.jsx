import React from "react";
import { createRoot } from "react-dom/client";
import { ArrowRight, Check, LockKeyhole, ShieldCheck } from "lucide-react";
import "./styles.css";

function App() {
  return (
    <main className="page">
      <header className="header">
        <a className="brand" href="/" aria-label="Vodkach home">
          <span className="brandMark">V</span>
          <span>Vodkach</span>
        </a>

        <nav className="nav" aria-label="Main navigation">
          <a href="#security">Security</a>
          <a href="#principles">Principles</a>
          <a href="#status">Status</a>
        </nav>
      </header>

      <section className="hero">
        <div className="heroContent">
          <p className="kicker">Private encrypted messenger</p>

          <h1>Secure communication without the noise.</h1>

          <p className="lead">
            Vodkach is a browser-based private messenger designed around
            encrypted chats, clean infrastructure, and less unnecessary data.
          </p>

          <div className="actions">
            <button className="primaryButton" type="button" disabled>
              Open in Web
              <ArrowRight size={17} />
            </button>

            <button className="secondaryButton" type="button">
              Coming soon
            </button>
          </div>
        </div>

        <aside className="securityPanel" id="security">
          <div className="panelHeader">
            <div>
              <span className="panelLabel">Security model</span>
              <h2>Built for encrypted storage</h2>
            </div>
            <LockKeyhole size={22} />
          </div>

          <div className="securityList">
            <SecurityItem text="Messages stored as encrypted payloads" />
            <SecurityItem text="Google login planned for account identity" />
            <SecurityItem text="No password database for attackers to steal" />
            <SecurityItem text="No promise to recover lost encrypted history" />
          </div>
        </aside>
      </section>

      <section className="principles" id="principles">
        <article>
          <span>01</span>
          <h3>Privacy first</h3>
          <p>
            The product is designed so a database leak should not expose message
            content.
          </p>
        </article>

        <article>
          <span>02</span>
          <h3>Minimal data</h3>
          <p>
            Store what is required for the app to work. Avoid collecting useless
            information.
          </p>
        </article>

        <article>
          <span>03</span>
          <h3>Clean interface</h3>
          <p>
            Messaging should feel fast, readable, and focused — not overloaded.
          </p>
        </article>
      </section>

      <section className="statusSection" id="status">
        <div>
          <p className="sectionLabel">Project status</p>
          <h2>Early private build.</h2>
          <p>
            Vodkach is currently in development. The first public goal is a
            secure web client with Google login and encrypted direct messages.
          </p>
        </div>

        <div className="statusCard">
          <div className="statusRow">
            <ShieldCheck size={18} />
            <span>Domain setup in progress</span>
          </div>
          <div className="statusRow muted">
            <Check size={18} />
            <span>Landing page active</span>
          </div>
          <div className="statusRow muted">
            <Check size={18} />
            <span>Web app coming next</span>
          </div>
        </div>
      </section>

      <footer className="footer">
        <span>Vodkach</span>
        <span>Private encrypted messenger.</span>
      </footer>
    </main>
  );
}

function SecurityItem({ text }) {
  return (
    <div className="securityItem">
      <Check size={16} />
      <span>{text}</span>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

import React from "react";
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
        <div className="workspaceHeader">
          <div>
            <span>Workspace</span>
            <strong>Vodkach</strong>
          </div>
          <Settings size={18} />
        </div>

        <div className="searchBox">
          <Search size={15} />
          <span>Search</span>
        </div>

        <nav className="channelList">
          <p>Direct Messages</p>
          <button className="channelButton active">
            <AtSign size={16} />
            max
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
      </aside>

      <section className="appChat">
        <header className="appChatHeader">
          <div>
            <span className="chatHash">#</span>
            <strong>max</strong>
          </div>

          <div className="chatHeaderActions">
            <span className="lockedBadge">
              <LockKeyhole size={14} />
              encrypted preview
            </span>
            <Bell size={18} />
            <UserRound size={18} />
          </div>
        </header>

        <div className="appMessages">
          <AppMessage
            avatar="M"
            name="Max"
            time="Today"
            text="This is only the web shell. Auth, encryption keys, and real messages come next."
          />
          <AppMessage
            avatar="V"
            name="Vodkach"
            time="System"
            text="Database storage will receive encrypted payloads only."
            accent
          />
        </div>

        <div className="messageComposer">
          <span>Message #max</span>
        </div>
      </section>

      <aside className="appDetails">
        <div className="profileCard">
          <div className="profileAvatar">V</div>
          <strong>Vodkach Web</strong>
          <span>Private beta shell</span>
        </div>

        <div className="detailsBlock">
          <p>Status</p>
          <div className="statusLine">
            <span className="statusDot" />
            Web app interface ready
          </div>
          <div className="statusLine muted">
            <span className="statusDot muted" />
            Google login next
          </div>
        </div>
      </aside>
    </main>
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

function AppMessage({ avatar, name, time, text, accent }) {
  return (
    <div className="appMessage">
      <div className={accent ? "avatar accent" : "avatar"}>{avatar}</div>
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

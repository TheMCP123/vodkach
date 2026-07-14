import React, { useEffect, useMemo, useRef, useState } from "react";
import emojiData from "emojibase-data/en/compact.json";
import githubShortcodes from "emojibase-data/en/shortcodes/github.json";

const NOTO_EMOJI_CDN =
  "https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/svg";
const TONE_STORAGE_KEY = "vodkach:emoji-tone-preferences";

const GROUPS = [
  { id: "all", label: "All", group: null },
  { id: "smileys", label: "Smileys", group: 0 },
  { id: "people", label: "People", group: 1 },
  { id: "components", label: "Components", group: 2 },
  { id: "nature", label: "Nature", group: 3 },
  { id: "food", label: "Food", group: 4 },
  { id: "travel", label: "Travel", group: 5 },
  { id: "activities", label: "Activities", group: 6 },
  { id: "objects", label: "Objects", group: 7 },
  { id: "symbols", label: "Symbols", group: 8 },
  { id: "flags", label: "Flags", group: 9 }
];

function normalizeShortcode(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^\p{Letter}\p{Number}+\-]+/gu, "_")
    .replace(/^_+|_+$/g, "");
}

const BASE_EMOJIS = emojiData
  .filter((item) => item.unicode && item.hexcode)
  .map((item) => {
    const rawShortcodes = githubShortcodes[item.hexcode];
    const shortcodes = Array.isArray(rawShortcodes)
      ? rawShortcodes
      : rawShortcodes
        ? [rawShortcodes]
        : [];

    return {
      emoji: item.unicode,
      hexcode: item.hexcode,
      label: item.label,
      shortcode: normalizeShortcode(
        shortcodes[0] || item.label || item.hexcode
      ),
      aliases: [
        ...shortcodes.map(normalizeShortcode),
        ...(item.tags || []).map(normalizeShortcode)
      ].filter(Boolean),
      group: item.group,
      order: Number(item.order || 0),
      skins: (item.skins || [])
        .filter((skin) => skin.unicode && skin.hexcode)
        .map((skin) => ({
          emoji: skin.unicode,
          hexcode: skin.hexcode,
          label: skin.label
        }))
    };
  })
  .sort((a, b) => a.order - b.order);

const SHORTCODE_MAP = new Map();
for (const item of BASE_EMOJIS) {
  if (item.shortcode) SHORTCODE_MAP.set(item.shortcode, item.emoji);
  for (const alias of item.aliases) {
    if (alias && !SHORTCODE_MAP.has(alias)) {
      SHORTCODE_MAP.set(alias, item.emoji);
    }
  }
}

SHORTCODE_MAP.set("happy", "😊");
SHORTCODE_MAP.set("lol", "😂");
SHORTCODE_MAP.set("laugh", "😂");
SHORTCODE_MAP.set("sad", "😢");
SHORTCODE_MAP.set("angry", "😡");
SHORTCODE_MAP.set("cool", "😎");
SHORTCODE_MAP.set("fire", "🔥");

const emojiSegmenter =
  typeof Intl !== "undefined" && Intl.Segmenter
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

const EMOJI_GRAPHEME_RE =
  /(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|[#*0-9]\uFE0F?\u20E3)/u;

function splitGraphemes(value) {
  if (emojiSegmenter) {
    return Array.from(emojiSegmenter.segment(value), (part) => part.segment);
  }
  return Array.from(value);
}

function emojiCodepoints(emoji) {
  return Array.from(emoji)
    .map((symbol) => symbol.codePointAt(0))
    .filter((codepoint) => codepoint !== 0xfe0f && codepoint !== 0xfe0e)
    .map((codepoint) => codepoint.toString(16))
    .join("_");
}

function readTonePreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem(TONE_STORAGE_KEY) || "{}");
    return stored && typeof stored === "object" ? stored : {};
  } catch {
    return {};
  }
}

function writeTonePreferences(value) {
  try {
    localStorage.setItem(TONE_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // localStorage may be unavailable in private/locked contexts.
  }
}

export function notoEmojiUrl(emoji, hexcode = "") {
  const normalized = hexcode
    ? String(hexcode)
        .split("-")
        .filter((part) => !/^FE0[EF]$/i.test(part))
        .map((part) => part.toLowerCase())
        .join("_")
    : emojiCodepoints(emoji);

  return `${NOTO_EMOJI_CDN}/emoji_u${normalized}.svg`;
}

export function expandEmojiShortcodes(value) {
  return String(value || "").replace(
    /:([a-zA-Z0-9_+\-]{1,80}):/g,
    (match, name) => SHORTCODE_MAP.get(name.toLowerCase()) || match
  );
}

export function NotoEmoji({ emoji, hexcode = "", className = "", title }) {
  return (
    <span
      className={`notoEmoji notoEmojiGlyph ${className}`}
      title={title}
      role="img"
      aria-label={emoji}
      style={{ "--noto-emoji-image": `url("${notoEmojiUrl(emoji, hexcode)}")` }}
    >
      {emoji}
    </span>
  );
}

export function NotoEmojiText({ text, className = "" }) {
  const parts = splitGraphemes(String(text || ""));

  return (
    <span className={className}>
      {parts.map((part, index) =>
        EMOJI_GRAPHEME_RE.test(part) ? (
          <NotoEmoji emoji={part} key={`${part}-${index}`} />
        ) : (
          <React.Fragment key={`text-${index}`}>{part}</React.Fragment>
        )
      )}
    </span>
  );
}

export function EmojiPicker({ onPick, onClose }) {
  const [query, setQuery] = useState("");
  const [groupId, setGroupId] = useState("all");
  const [visibleCount, setVisibleCount] = useState(240);
  const [tonePreferences, setTonePreferences] = useState(readTonePreferences);
  const [toneMenu, setToneMenu] = useState(null);

  const categoryRef = useRef(null);
  const bodyRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const closeOutside = (event) => {
      if (!panelRef.current?.contains(event.target)) onClose?.();
    };
    const closeEscape = (event) => {
      if (event.key === "Escape") {
        if (toneMenu) setToneMenu(null);
        else onClose?.();
      }
    };
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", closeOutside);
      searchRef.current?.focus();
    }, 0);

    document.addEventListener("keydown", closeEscape);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [onClose, toneMenu]);

  useEffect(() => {
    setVisibleCount(240);
    setToneMenu(null);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [groupId, query]);

  const filtered = useMemo(() => {
    const normalized = normalizeShortcode(query);
    const selectedGroup = GROUPS.find((group) => group.id === groupId);

    return BASE_EMOJIS.filter((item) => {
      if (selectedGroup?.group !== null && item.group !== selectedGroup.group) {
        return false;
      }
      if (!normalized) return true;

      return [item.shortcode, item.label, ...item.aliases]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [groupId, query]);

  const visible = filtered.slice(0, visibleCount);

  function chosenVariant(item) {
    const preferredHexcode = tonePreferences[item.hexcode];
    if (!preferredHexcode) return item;

    return (
      item.skins.find((skin) => skin.hexcode === preferredHexcode) || item
    );
  }

  function chooseTone(item, variant) {
    const next = { ...tonePreferences };

    if (variant.hexcode === item.hexcode) delete next[item.hexcode];
    else next[item.hexcode] = variant.hexcode;

    setTonePreferences(next);
    writeTonePreferences(next);
    setToneMenu(null);
  }

  function onCategoryWheel(event) {
    const node = categoryRef.current;
    if (!node || node.scrollWidth <= node.clientWidth) return;

    const delta =
      Math.abs(event.deltaY) >= Math.abs(event.deltaX)
        ? event.deltaY
        : event.deltaX;

    if (!delta) return;
    event.preventDefault();
    event.stopPropagation();
    node.scrollBy({ left: delta, behavior: "auto" });
  }

  function onBodyScroll(event) {
    const node = event.currentTarget;
    if (
      visibleCount < filtered.length &&
      node.scrollHeight - node.scrollTop - node.clientHeight < 220
    ) {
      setVisibleCount((current) =>
        Math.min(current + 240, filtered.length)
      );
    }
  }

  return (
    <section
      className="emojiPicker composerPopover"
      ref={panelRef}
      role="dialog"
      aria-label="Emoji picker"
    >
      <header className="composerPopoverHeader">
        <div>
          <span className="composerPopoverEyebrow">NOTO EMOJI</span>
          <strong>Emoji</strong>
        </div>
        <button
          type="button"
          className="composerPopoverClose"
          onClick={onClose}
          aria-label="Close emoji picker"
        >
          ×
        </button>
      </header>

      <label className="emojiSearchField">
        <span aria-hidden="true">⌕</span>
        <input
          ref={searchRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search emoji or :shortcode:"
        />
      </label>

      <nav
        className="emojiCategoryTabs"
        ref={categoryRef}
        onWheel={onCategoryWheel}
        aria-label="Emoji categories"
      >
        {GROUPS.map((group) => (
          <button
            type="button"
            className={groupId === group.id && !query ? "active" : ""}
            onClick={() => {
              setGroupId(group.id);
              setQuery("");
            }}
            key={group.id}
          >
            {group.label}
          </button>
        ))}
      </nav>

      <div
        className="emojiGrid"
        ref={bodyRef}
        onScroll={onBodyScroll}
        onContextMenu={(event) => event.preventDefault()}
      >
        {visible.map((item) => {
          const selected = chosenVariant(item);

          return (
            <button
              type="button"
              className={item.skins.length ? "hasSkinTones" : ""}
              onClick={() => onPick?.(selected.emoji)}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (!item.skins.length) return;

                const bodyRect = bodyRef.current?.getBoundingClientRect();
                const buttonRect = event.currentTarget.getBoundingClientRect();

                setToneMenu({
                  item,
                  left: Math.max(
                    8,
                    Math.min(
                      buttonRect.left - (bodyRect?.left || 0),
                      (bodyRect?.width || 300) - 230
                    )
                  ),
                  top:
                    buttonRect.bottom -
                    (bodyRect?.top || 0) +
                    (bodyRef.current?.scrollTop || 0) +
                    5
                });
              }}
              title={
                item.skins.length
                  ? `:${item.shortcode}: · Right-click for skin tone`
                  : `:${item.shortcode}:`
              }
              aria-label={`Insert ${item.label}`}
              key={item.hexcode}
            >
              <NotoEmoji
                emoji={item.emoji}
                hexcode={item.hexcode}
                title={`:${item.shortcode}:`}
              />
              {item.skins.length ? <i aria-hidden="true" /> : null}
            </button>
          );
        })}

        {!visible.length && (
          <div className="emojiPickerEmpty">No emoji found</div>
        )}

        {visibleCount < filtered.length && (
          <div className="emojiPickerLoading">Loading more emoji…</div>
        )}

        {toneMenu ? (
          <div
            className="emojiToneMenu"
            style={{ left: toneMenu.left, top: toneMenu.top }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {[toneMenu.item, ...toneMenu.item.skins].map((variant) => (
              <button
                type="button"
                className={
                  chosenVariant(toneMenu.item).hexcode === variant.hexcode
                    ? "active"
                    : ""
                }
                onClick={() => chooseTone(toneMenu.item, variant)}
                aria-label={`Use ${variant.label || toneMenu.item.label}`}
                key={variant.hexcode}
              >
                <NotoEmoji
                  emoji={variant.emoji}
                  hexcode={variant.hexcode}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

import React, { useEffect, useMemo, useRef, useState } from "react";

const NOTO_EMOJI_CDN =
  "https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/svg";

const EMOJI_GROUPS = [
  {
    id: "smileys",
    label: "Smileys",
    items: [
      ["😀", "grinning", ["happy", "smile"]],
      ["😃", "smiley", ["happy"]],
      ["😄", "smile", ["happy"]],
      ["😁", "grin", ["happy"]],
      ["😂", "joy", ["laugh", "tears"]],
      ["🤣", "rofl", ["laugh"]],
      ["😊", "blush", ["happy"]],
      ["🙂", "slightly_smiling", ["smile"]],
      ["🙃", "upside_down", ["silly"]],
      ["😉", "wink", []],
      ["😍", "heart_eyes", ["love"]],
      ["🥰", "smiling_hearts", ["love"]],
      ["😘", "kissing_heart", ["kiss"]],
      ["😋", "yum", ["food"]],
      ["😎", "sunglasses", ["cool"]],
      ["🤩", "star_struck", ["wow"]],
      ["🥳", "partying", ["party", "celebration"]],
      ["😏", "smirk", []],
      ["😒", "unamused", []],
      ["😔", "pensive", ["sad"]],
      ["😢", "cry", ["sad"]],
      ["😭", "sob", ["sad"]],
      ["😡", "rage", ["angry"]],
      ["🤬", "cursing", ["angry"]],
      ["😱", "scream", ["shock"]],
      ["🤔", "thinking", []],
      ["🫡", "salute", []],
      ["🫠", "melting", []],
      ["💀", "skull", ["dead"]],
      ["🤡", "clown", []]
    ]
  },
  {
    id: "people",
    label: "People",
    items: [
      ["👋", "wave", ["hello", "bye"]],
      ["🤚", "raised_back_hand", []],
      ["🖐️", "hand", []],
      ["✋", "raised_hand", []],
      ["👌", "ok_hand", ["okay"]],
      ["🤌", "pinched_fingers", []],
      ["🤏", "pinching_hand", []],
      ["✌️", "v", ["peace"]],
      ["🤞", "crossed_fingers", ["luck"]],
      ["🤟", "love_you_gesture", []],
      ["🤘", "metal", ["rock"]],
      ["👍", "thumbsup", ["like", "+1"]],
      ["👎", "thumbsdown", ["dislike", "-1"]],
      ["👏", "clap", ["applause"]],
      ["🙌", "raised_hands", ["hooray"]],
      ["🫶", "heart_hands", ["love"]],
      ["🙏", "pray", ["please", "thanks"]],
      ["💪", "muscle", ["strong"]],
      ["🫵", "you", ["point"]],
      ["👀", "eyes", ["look"]],
      ["🧠", "brain", ["smart"]],
      ["🫂", "people_hugging", ["hug"]]
    ]
  },
  {
    id: "nature",
    label: "Nature",
    items: [
      ["🐶", "dog", []],
      ["🐱", "cat", []],
      ["🐭", "mouse", []],
      ["🐹", "hamster", []],
      ["🐰", "rabbit", []],
      ["🦊", "fox", []],
      ["🐻", "bear", []],
      ["🐼", "panda", []],
      ["🐸", "frog", []],
      ["🐵", "monkey", []],
      ["🦁", "lion", []],
      ["🐯", "tiger", []],
      ["🐺", "wolf", []],
      ["🦄", "unicorn", []],
      ["🐝", "bee", []],
      ["🦋", "butterfly", []],
      ["🌸", "cherry_blossom", ["flower"]],
      ["🌹", "rose", ["flower"]],
      ["🌻", "sunflower", ["flower"]],
      ["🔥", "fire", ["lit"]],
      ["✨", "sparkles", ["shine"]],
      ["⭐", "star", []],
      ["🌙", "crescent_moon", ["night"]],
      ["☀️", "sunny", ["sun"]]
    ]
  },
  {
    id: "food",
    label: "Food",
    items: [
      ["🍎", "apple", []],
      ["🍓", "strawberry", []],
      ["🍒", "cherries", []],
      ["🍉", "watermelon", []],
      ["🍕", "pizza", []],
      ["🍔", "hamburger", ["burger"]],
      ["🍟", "fries", []],
      ["🌭", "hotdog", []],
      ["🍿", "popcorn", []],
      ["🍣", "sushi", []],
      ["🍩", "doughnut", ["donut"]],
      ["🍪", "cookie", []],
      ["🎂", "birthday", ["cake"]],
      ["☕", "coffee", []],
      ["🥤", "cup_with_straw", ["soda"]],
      ["🍺", "beer", []],
      ["🍷", "wine_glass", ["wine"]],
      ["🍸", "cocktail", []]
    ]
  },
  {
    id: "activities",
    label: "Activities",
    items: [
      ["⚽", "soccer", ["football"]],
      ["🏀", "basketball", []],
      ["🏈", "football", []],
      ["⚾", "baseball", []],
      ["🎾", "tennis", []],
      ["🏐", "volleyball", []],
      ["🎮", "video_game", ["gaming"]],
      ["🕹️", "joystick", ["gaming"]],
      ["🎲", "game_die", ["dice"]],
      ["🎯", "dart", ["target"]],
      ["🏆", "trophy", ["win"]],
      ["🥇", "first_place", ["gold"]],
      ["🎵", "musical_note", ["music"]],
      ["🎧", "headphones", ["music"]],
      ["🎸", "guitar", ["music"]],
      ["🎨", "art", ["palette"]],
      ["🎬", "clapper", ["movie"]]
    ]
  },
  {
    id: "travel",
    label: "Travel",
    items: [
      ["🚗", "car", []],
      ["🏎️", "racing_car", []],
      ["🚕", "taxi", []],
      ["🚌", "bus", []],
      ["🚓", "police_car", []],
      ["🚑", "ambulance", []],
      ["🚒", "fire_engine", []],
      ["✈️", "airplane", ["plane"]],
      ["🚀", "rocket", []],
      ["🛸", "flying_saucer", ["ufo"]],
      ["🏠", "house", ["home"]],
      ["🏙️", "cityscape", ["city"]],
      ["🌍", "earth_africa", ["world"]],
      ["🌎", "earth_americas", ["world"]],
      ["🌏", "earth_asia", ["world"]]
    ]
  },
  {
    id: "objects",
    label: "Objects",
    items: [
      ["💡", "bulb", ["idea"]],
      ["📱", "iphone", ["phone"]],
      ["💻", "computer", ["laptop"]],
      ["⌨️", "keyboard", []],
      ["🖥️", "desktop", ["monitor"]],
      ["📷", "camera", []],
      ["🎥", "movie_camera", ["video"]],
      ["📺", "tv", ["television"]],
      ["🔔", "bell", ["notification"]],
      ["🔒", "lock", ["secure"]],
      ["🔑", "key", []],
      ["🛠️", "tools", []],
      ["⚙️", "gear", ["settings"]],
      ["🗑️", "wastebasket", ["trash"]],
      ["📌", "pushpin", ["pin"]],
      ["📎", "paperclip", ["attachment"]],
      ["💊", "pill", []],
      ["🧸", "teddy_bear", []]
    ]
  },
  {
    id: "symbols",
    label: "Symbols",
    items: [
      ["❤️", "heart", ["love"]],
      ["🧡", "orange_heart", []],
      ["💛", "yellow_heart", []],
      ["💚", "green_heart", []],
      ["💙", "blue_heart", []],
      ["💜", "purple_heart", []],
      ["🖤", "black_heart", []],
      ["🤍", "white_heart", []],
      ["💔", "broken_heart", []],
      ["💯", "100", ["hundred"]],
      ["✅", "white_check_mark", ["check"]],
      ["❌", "x", ["cross"]],
      ["⚠️", "warning", []],
      ["❓", "question", []],
      ["❗", "exclamation", []],
      ["‼️", "bangbang", []],
      ["♻️", "recycle", []],
      ["➕", "heavy_plus_sign", ["plus"]],
      ["➖", "heavy_minus_sign", ["minus"]],
      ["♾️", "infinity", []]
    ]
  }
];

const ALL_EMOJIS = EMOJI_GROUPS.flatMap((group) =>
  group.items.map(([emoji, shortcode, aliases]) => ({
    emoji,
    shortcode,
    aliases,
    group: group.id
  }))
);

const SHORTCODE_MAP = new Map();
for (const item of ALL_EMOJIS) {
  SHORTCODE_MAP.set(item.shortcode.toLowerCase(), item.emoji);
  for (const alias of item.aliases) {
    SHORTCODE_MAP.set(String(alias).toLowerCase(), item.emoji);
  }
}

/* A friendly alias explicitly requested for :happy:. */
SHORTCODE_MAP.set("happy", "😊");
SHORTCODE_MAP.set("lol", "😂");
SHORTCODE_MAP.set("laugh", "😂");
SHORTCODE_MAP.set("sad", "😢");
SHORTCODE_MAP.set("angry", "😡");
SHORTCODE_MAP.set("cool", "😎");

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

export function notoEmojiUrl(emoji) {
  return `${NOTO_EMOJI_CDN}/emoji_u${emojiCodepoints(emoji)}.svg`;
}

export function expandEmojiShortcodes(value) {
  return String(value || "").replace(
    /:([a-zA-Z0-9_+\-]{1,40}):/g,
    (match, name) => SHORTCODE_MAP.get(name.toLowerCase()) || match
  );
}

export function NotoEmoji({ emoji, className = "", title }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <span className={`notoEmojiFallback ${className}`}>{emoji}</span>;
  }

  return (
    <img
      className={`notoEmoji ${className}`}
      src={notoEmojiUrl(emoji)}
      alt={emoji}
      title={title}
      loading="lazy"
      decoding="async"
      draggable="false"
      onError={() => setFailed(true)}
    />
  );
}

export function NotoEmojiText({ text, className = "" }) {
  const value = String(text || "");
  const parts = splitGraphemes(value);

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
  const [group, setGroup] = useState("smileys");
  const panelRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const closeOutside = (event) => {
      if (!panelRef.current?.contains(event.target)) onClose?.();
    };
    const closeEscape = (event) => {
      if (event.key === "Escape") onClose?.();
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
  }, [onClose]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const source = normalized
      ? ALL_EMOJIS
      : ALL_EMOJIS.filter((item) => item.group === group);

    if (!normalized) return source;

    return source.filter((item) =>
      [item.shortcode, ...item.aliases, item.group]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [group, query]);

  return (
    <section className="emojiPicker composerPopover" ref={panelRef}>
      <header className="composerPopoverHeader">
        <div>
          <span className="composerPopoverEyebrow">NOTO EMOJI</span>
          <strong>Emoji</strong>
        </div>
        <button type="button" onClick={onClose} aria-label="Close emoji picker">
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

      <nav className="emojiCategoryTabs" aria-label="Emoji categories">
        {EMOJI_GROUPS.map((category) => (
          <button
            type="button"
            className={group === category.id && !query ? "active" : ""}
            onClick={() => {
              setGroup(category.id);
              setQuery("");
            }}
            key={category.id}
          >
            {category.label}
          </button>
        ))}
      </nav>

      <div className="emojiGrid">
        {visible.map((item) => (
          <button
            type="button"
            onClick={() => onPick?.(item.emoji)}
            title={`:${item.shortcode}:`}
            aria-label={`Insert ${item.shortcode}`}
            key={`${item.group}-${item.shortcode}`}
          >
            <NotoEmoji emoji={item.emoji} />
            <span>:{item.shortcode}:</span>
          </button>
        ))}
        {!visible.length && (
          <div className="emojiPickerEmpty">No emoji found</div>
        )}
      </div>
    </section>
  );
}

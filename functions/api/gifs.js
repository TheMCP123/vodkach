import { getCurrentUser, json } from "../_shared/auth.js";

function firstUrl(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.url || value.src || "";
}

function normalizeResult(item, index) {
  const formats = item?.media_formats || item?.media || {};
  const full = firstUrl(formats.gif) || firstUrl(formats.mediumgif) || firstUrl(formats.nanogif) || item?.url || "";
  const preview = firstUrl(formats.tinygif) || firstUrl(formats.nanogif) || firstUrl(formats.gifpreview) || full;
  if (!full) return null;
  return {
    id: String(item?.id || item?.content_description || `${index}-${full}`),
    url: full,
    preview,
    description: String(item?.content_description || item?.title || "GIF")
  };
}

export async function onRequestGet({ request, env }) {
  const user = await getCurrentUser(request, env);
  if (!user) return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  if (!env.KLIPY_API_KEY) return json({ ok: false, error: "KLIPY_API_KEY is not configured" }, { status: 503 });

  const input = new URL(request.url);
  const query = String(input.searchParams.get("q") || "").trim().slice(0, 80);
  const endpoint = query ? "search" : "featured";
  const target = new URL(`https://api.klipy.com/v2/${endpoint}`);
  target.searchParams.set("key", env.KLIPY_API_KEY);
  target.searchParams.set("limit", "30");
  target.searchParams.set("media_filter", "gif,tinygif,nanogif");
  target.searchParams.set("contentfilter", "medium");
  target.searchParams.set("locale", "en_US");
  target.searchParams.set("client_key", "vodkach_web");
  if (query) target.searchParams.set("q", query);
  const pos = input.searchParams.get("pos");
  if (pos) target.searchParams.set("pos", pos);

  let response;
  try {
    response = await fetch(target, { headers: { accept: "application/json" } });
  } catch {
    return json({ ok: false, error: "Could not reach KLIPY" }, { status: 502 });
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || `KLIPY request failed (${response.status})`;
    return json({ ok: false, error: message }, { status: 502 });
  }

  const raw = Array.isArray(payload?.results) ? payload.results : [];
  const items = raw.map(normalizeResult).filter(Boolean);
  return json({ ok: true, items, next: payload?.next || null });
}

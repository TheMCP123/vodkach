import { getCurrentUser } from "../functions/_shared/auth.js";
import { VodkachRealtime } from "./VodkachRealtime.js";
import * as r0 from "../functions/api/access/retry.js";
import * as r1 from "../functions/api/admin/banned-emails/index.js";
import * as r2 from "../functions/api/admin/banned-emails/unban.js";
import * as r3 from "../functions/api/admin/login.js";
import * as r4 from "../functions/api/admin/me.js";
import * as r5 from "../functions/api/admin/requests/approve.js";
import * as r6 from "../functions/api/admin/requests/index.js";
import * as r7 from "../functions/api/admin/requests/reject.js";
import * as r8 from "../functions/api/admin/users/block.js";
import * as r9 from "../functions/api/admin/users/delete.js";
import * as r10 from "../functions/api/admin/users/index.js";
import * as r11 from "../functions/api/admin/users/temp-ban.js";
import * as r12 from "../functions/api/admin/users/unban.js";
import * as r13 from "../functions/api/admin/users/verify.js";
import * as r14 from "../functions/api/auth/google/callback.js";
import * as r15 from "../functions/api/auth/google/start.js";
import * as r16 from "../functions/api/auth/logout.js";
import * as r17 from "../functions/api/auth/me.js";
import * as r18 from "../functions/api/calls/end.js";
import * as r19 from "../functions/api/calls/media.js";
import * as r20 from "../functions/api/calls/respond.js";
import * as r21 from "../functions/api/calls/start.js";
import * as r22 from "../functions/api/calls/status.js";
import * as r23 from "../functions/api/chats/delete.js";
import * as r24 from "../functions/api/chats/direct/index.js";
import * as r25 from "../functions/api/chats/index.js";
import * as r26 from "../functions/api/config/public.js";
import * as r27 from "../functions/api/db/check.js";
import * as r28 from "../functions/api/device/current.js";
import * as r29 from "../functions/api/device/register.js";
import * as r30 from "../functions/api/friends/index.js";
import * as r31 from "../functions/api/friends/remove.js";
import * as r32 from "../functions/api/friends/requests/index.js";
import * as r33 from "../functions/api/friends/requests/respond.js";
import * as r34 from "../functions/api/health.js";
import * as r35 from "../functions/api/messages/delete.js";
import * as r36 from "../functions/api/messages/edit.js";
import * as r37 from "../functions/api/messages/index.js";
import * as r38 from "../functions/api/notes/delete.js";
import * as r39 from "../functions/api/notes/index.js";
import * as r40 from "../functions/api/pins/index.js";
import * as r41 from "../functions/api/pins/toggle.js";
import * as r42 from "../functions/api/polls/close.js";
import * as r43 from "../functions/api/polls/index.js";
import * as r44 from "../functions/api/polls/vote.js";
import * as r45 from "../functions/api/presence/heartbeat.js";
import * as r46 from "../functions/api/presence/status.js";
import * as r47 from "../functions/api/sessions/index.js";
import * as r48 from "../functions/api/sessions/revoke-all.js";
import * as r49 from "../functions/api/sessions/revoke.js";
import * as r50 from "../functions/api/user/profile.js";
import * as r51 from "../functions/api/user/username.js";
import * as r52 from "../functions/api/users/block.js";
import * as r53 from "../functions/api/users/search.js";
import * as r54 from "../functions/api/servers/index.js";
import * as r55 from "../functions/api/servers/join.js";
import * as r56 from "../functions/api/servers/channels.js";
import * as r57 from "../functions/api/servers/messages.js";
import * as r58 from "../functions/api/servers/discovery.js";
import * as r59 from "../functions/api/servers/members.js";
import * as r60 from "../functions/api/servers/invites.js";
import * as r61 from "../functions/api/servers/settings.js";

const ROUTES = new Map([
  ["/api/access/retry", r0],
  ["/api/admin/banned-emails", r1],
  ["/api/admin/banned-emails/unban", r2],
  ["/api/admin/login", r3],
  ["/api/admin/me", r4],
  ["/api/admin/requests/approve", r5],
  ["/api/admin/requests", r6],
  ["/api/admin/requests/reject", r7],
  ["/api/admin/users/block", r8],
  ["/api/admin/users/delete", r9],
  ["/api/admin/users", r10],
  ["/api/admin/users/temp-ban", r11],
  ["/api/admin/users/unban", r12],
  ["/api/admin/users/verify", r13],
  ["/api/auth/google/callback", r14],
  ["/api/auth/google/start", r15],
  ["/api/auth/logout", r16],
  ["/api/auth/me", r17],
  ["/api/calls/end", r18],
  ["/api/calls/media", r19],
  ["/api/calls/respond", r20],
  ["/api/calls/start", r21],
  ["/api/calls/status", r22],
  ["/api/chats/delete", r23],
  ["/api/chats/direct", r24],
  ["/api/chats", r25],
  ["/api/config/public", r26],
  ["/api/db/check", r27],
  ["/api/device/current", r28],
  ["/api/device/register", r29],
  ["/api/friends", r30],
  ["/api/friends/remove", r31],
  ["/api/friends/requests", r32],
  ["/api/friends/requests/respond", r33],
  ["/api/health", r34],
  ["/api/messages/delete", r35],
  ["/api/messages/edit", r36],
  ["/api/messages", r37],
  ["/api/notes/delete", r38],
  ["/api/notes", r39],
  ["/api/pins", r40],
  ["/api/pins/toggle", r41],
  ["/api/polls/close", r42],
  ["/api/polls", r43],
  ["/api/polls/vote", r44],
  ["/api/presence/heartbeat", r45],
  ["/api/presence/status", r46],
  ["/api/sessions", r47],
  ["/api/sessions/revoke-all", r48],
  ["/api/sessions/revoke", r49],
  ["/api/user/profile", r50],
  ["/api/user/username", r51],
  ["/api/users/block", r52],
  ["/api/users/search", r53],
  ["/api/servers", r54],
  ["/api/servers/join", r55],
  ["/api/servers/channels", r56],
  ["/api/servers/messages", r57],
  ["/api/servers/discovery", r58],
  ["/api/servers/members", r59],
  ["/api/servers/invites", r60],
  ["/api/servers/settings", r61]
]);

function normalizePath(pathname) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

async function runPagesHandler(module, request, env, executionContext) {
  const methodHandler = module[`onRequest${request.method[0]}${request.method.slice(1).toLowerCase()}`];
  const handler = methodHandler || module.onRequest;

  if (typeof handler !== "function") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: Object.keys(module)
        .filter((key) => key.startsWith("onRequest") && key !== "onRequest")
        .map((key) => key.slice("onRequest".length).toUpperCase())
        .join(", ") }
    });
  }

  return handler({
    request,
    env,
    params: {},
    data: {},
    functionPath: new URL(request.url).pathname,
    waitUntil: executionContext.waitUntil.bind(executionContext),
    passThroughOnException: executionContext.passThroughOnException.bind(executionContext),
    next: () => env.ASSETS.fetch(request)
  });
}


async function parseJsonClone(response) {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
}

async function readRequestBody(request) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return {};
  try {
    return await request.clone().json();
  } catch {
    return {};
  }
}

async function publishRealtime(env, payload) {
  const id = env.REALTIME.idFromName("vodkach-global");
  const stub = env.REALTIME.get(id);
  await stub.fetch("https://realtime.internal/publish", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
}

async function beforeMutation(pathname, body, env) {
  if (["/api/messages/edit", "/api/messages/delete", "/api/pins/toggle"].includes(pathname) && body.message_id) {
    const row = await env.DB.prepare(
      `SELECT id, chat_id FROM messages WHERE id = ? LIMIT 1`
    ).bind(body.message_id).first();
    return { message: row || null };
  }
  if (pathname.startsWith("/api/polls/") && body.poll_id) {
    const row = await env.DB.prepare(
      `SELECT id, chat_id FROM polls WHERE id = ? LIMIT 1`
    ).bind(body.poll_id).first();
    return { poll: row || null };
  }
  if (pathname.startsWith("/api/calls/") && body.call_id) {
    const row = await env.DB.prepare(
      `SELECT id, chat_id FROM calls WHERE id = ? LIMIT 1`
    ).bind(body.call_id).first();
    return { call: row || null };
  }
  return {};
}

function realtimeEventFor(pathname, method) {
  if (method === "GET") return null;
  if (pathname === "/api/messages") return "message.created";
  if (pathname === "/api/messages/edit") return "message.edited";
  if (pathname === "/api/messages/delete") return "message.deleted";
  if (pathname === "/api/pins/toggle") return "pin.changed";
  if (pathname.startsWith("/api/polls")) return "poll.changed";
  if (pathname.startsWith("/api/calls")) return "call.changed";
  if (pathname.startsWith("/api/friends/requests")) return "friend-request.changed";
  if (pathname.startsWith("/api/friends")) return "friend.changed";
  if (pathname.startsWith("/api/chats")) return "chat.changed";
  if (pathname.startsWith("/api/presence")) return "presence.changed";
  if (pathname.startsWith("/api/notes")) return "note.changed";
  if (pathname.startsWith("/api/sessions")) return "session.changed";
  if (pathname.startsWith("/api/user/") || pathname.startsWith("/api/users/")) return "user.changed";
  if (pathname.startsWith("/api/admin/")) return "admin.changed";
  if (pathname.startsWith("/api/servers/" ) || pathname === "/api/servers") return "server.changed";
  if (pathname.startsWith("/api/device/")) return "device.changed";
  return "app.changed";
}

async function emitRealtimeMutation({ pathname, method, body, data, before, user, env }) {
  if (!data?.ok) return;
  const type = realtimeEventFor(pathname, method);
  if (!type) return;

  const chatId =
    body.chat_id ||
    data.message?.chat_id ||
    data.call?.chat_id ||
    data.poll?.chat_id ||
    before.message?.chat_id ||
    before.poll?.chat_id ||
    before.call?.chat_id ||
    null;

  let recipientUserIds = null;
  let serverId = body.server_id || data.server?.id || data.message?.server_id || null;
  if (!serverId && body.channel_id) {
    const serverRow = await env.DB.prepare(`SELECT server_id FROM server_channels WHERE id = ? LIMIT 1`).bind(body.channel_id).first();
    serverId = serverRow?.server_id || null;
  }
  if (chatId) {
    const members = await env.DB.prepare(
      `SELECT user_id FROM chat_members WHERE chat_id = ? AND left_at IS NULL`
    ).bind(chatId).all();
    recipientUserIds = (members.results || []).map((row) => row.user_id);
  } else if (serverId) {
    const members = await env.DB.prepare(`SELECT user_id FROM server_members WHERE server_id = ?`).bind(serverId).all();
    recipientUserIds = (members.results || []).map((row) => row.user_id);
  }

  await publishRealtime(env, {
    type,
    path: pathname,
    chatId,
    serverId,
    channelId: body.channel_id || data.message?.channel_id || data.channel?.id || null,
    recipientUserIds,
    messageId: body.message_id || data.message?.id || data.message_id || null,
    pollId: body.poll_id || data.poll?.id || null,
    callId: body.call_id || data.call?.id || null,
    noteId: body.note_id || data.note?.id || null,
    actorUserId: user?.id || null,
    at: Date.now()
  });
}

export { VodkachRealtime };

async function handleRealtimeConnect(request, env, executionContext) {
  if (request.headers.get("Upgrade") !== "websocket") {
    return new Response(JSON.stringify({ ok: false, error: "WebSocket upgrade required" }), {
      status: 426,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }

  const user = await getCurrentUser(request, env);
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: "Not authenticated" }), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }

  const id = env.REALTIME.idFromName("vodkach-global");
  const stub = env.REALTIME.get(id);
  const target = new URL(request.url);
  target.pathname = "/connect";
  target.searchParams.set("user_id", user.id);
  target.searchParams.set("username", user.username || "");
  target.searchParams.set("display_name", user.display_name || user.username || "Someone");
  target.searchParams.set("session_id", user.current_session_id || "");

  await env.DB.batch([
    env.DB.prepare(`UPDATE users SET last_seen_at = datetime('now') WHERE id = ?`).bind(user.id),
    env.DB.prepare(`UPDATE sessions SET last_seen_at = datetime('now') WHERE id = ?`).bind(user.current_session_id)
  ]);

  executionContext?.waitUntil?.(publishRealtime(env, {
    type: "presence.changed",
    actorUserId: user.id,
    status: user.status_preference || "online",
    at: Date.now()
  }).catch(() => {}));

  return stub.fetch(new Request(target, request));
}

export default {
  async fetch(request, env, executionContext) {
    const url = new URL(request.url);
    const pathname = normalizePath(url.pathname);

    if (pathname === "/api/realtime") {
      try {
        return await handleRealtimeConnect(request, env, executionContext);
      } catch (error) {
        console.error("Vodkach realtime connection error", error);
        return new Response(JSON.stringify({ ok: false, error: "Realtime connection failed" }), {
          status: 500,
          headers: { "content-type": "application/json; charset=utf-8" }
        });
      }
    }

    if (pathname.startsWith("/api/")) {
      const route = ROUTES.get(pathname);
      if (!route) {
        return new Response(JSON.stringify({ ok: false, error: "API route not found" }), {
          status: 404,
          headers: { "content-type": "application/json; charset=utf-8" }
        });
      }

      try {
        const body = await readRequestBody(request);
        const user = request.method === "GET" ? null : await getCurrentUser(request, env);
        const before = await beforeMutation(pathname, body, env);
        const response = await runPagesHandler(route, request, env, executionContext);

        if (response.ok && request.method !== "GET") {
          const data = await parseJsonClone(response);
          executionContext.waitUntil(
            emitRealtimeMutation({
              pathname,
              method: request.method,
              body,
              data,
              before,
              user,
              env
            }).catch((error) => console.error("Vodkach realtime publish error", pathname, error))
          );
        }

        return response;
      } catch (error) {
        console.error("Vodkach API error", pathname, error);
        return new Response(JSON.stringify({ ok: false, error: "Internal server error" }), {
          status: 500,
          headers: { "content-type": "application/json; charset=utf-8" }
        });
      }
    }

    return env.ASSETS.fetch(request);
  }
};

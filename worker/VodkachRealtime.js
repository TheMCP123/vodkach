export class VodkachRealtime {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/connect") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket upgrade", { status: 426 });
      }

      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];

      this.state.acceptWebSocket(server);
      server.serializeAttachment({
        connectedAt: Date.now(),
        userId: url.searchParams.get("user_id") || null,
        username: url.searchParams.get("username") || "",
        displayName: url.searchParams.get("display_name") || "Someone"
      });
      server.send(JSON.stringify({ type: "realtime.ready" }));

      return new Response(null, {
        status: 101,
        webSocket: client
      });
    }

    if (url.pathname === "/publish" && request.method === "POST") {
      const payload = await request.text();
      let parsed = null;
      try { parsed = JSON.parse(payload); } catch {}
      const recipientSet = Array.isArray(parsed?.recipientUserIds)
        ? new Set(parsed.recipientUserIds)
        : null;
      const sockets = this.state.getWebSockets();

      for (const socket of sockets) {
        const attachment = socket.deserializeAttachment() || {};
        if (recipientSet && !recipientSet.has(attachment.userId)) continue;
        try {
          socket.send(payload);
        } catch {
          try {
            socket.close(1011, "Delivery failed");
          } catch {
            // Socket may already be closed.
          }
        }
      }

      return Response.json({ ok: true, delivered: sockets.length });
    }

    return new Response("Not found", { status: 404 });
  }

  async webSocketMessage(socket, message) {
    if (message === "ping") {
      socket.send("pong");
      return;
    }

    let payload;
    try {
      payload = JSON.parse(String(message));
    } catch {
      return;
    }

    if (payload?.type === "presence.heartbeat") {
      socket.send(JSON.stringify({ type: "presence.ack", at: Date.now() }));
      return;
    }

    if (payload?.type !== "typing.start" && payload?.type !== "typing.stop") return;
    if (!payload.chatId) return;

    const attachment = socket.deserializeAttachment() || {};
    if (!attachment.userId) return;

    const membership = await this.env.DB.prepare(
      `SELECT 1 AS ok FROM chat_members WHERE chat_id = ? AND user_id = ? AND left_at IS NULL LIMIT 1`
    ).bind(String(payload.chatId), attachment.userId).first();
    if (!membership) return;

    const members = await this.env.DB.prepare(
      `SELECT user_id FROM chat_members WHERE chat_id = ? AND left_at IS NULL`
    ).bind(String(payload.chatId)).all();
    const recipientSet = new Set((members.results || []).map((row) => row.user_id));

    const outgoing = JSON.stringify({
      type: payload.type,
      chatId: String(payload.chatId),
      actorUserId: attachment.userId,
      actorUsername: attachment.username || "",
      actorDisplayName: attachment.displayName || attachment.username || "Someone",
      at: Date.now()
    });

    for (const peer of this.state.getWebSockets()) {
      if (peer === socket) continue;
      const peerAttachment = peer.deserializeAttachment() || {};
      if (!recipientSet.has(peerAttachment.userId)) continue;
      try {
        peer.send(outgoing);
      } catch {
        try { peer.close(1011, "Delivery failed"); } catch {}
      }
    }
  }

  async webSocketClose(socket, code, reason) {
    socket.close(code, reason);
  }

  async webSocketError(socket) {
    try {
      socket.close(1011, "WebSocket error");
    } catch {
      // Socket may already be closed.
    }
  }
}

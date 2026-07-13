export class VodkachRealtime {
  constructor(state) {
    this.state = state;
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
      server.serializeAttachment({ connectedAt: Date.now() });
      server.send(JSON.stringify({ type: "realtime.ready" }));

      return new Response(null, {
        status: 101,
        webSocket: client
      });
    }

    if (url.pathname === "/publish" && request.method === "POST") {
      const payload = await request.text();
      const sockets = this.state.getWebSockets();

      for (const socket of sockets) {
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

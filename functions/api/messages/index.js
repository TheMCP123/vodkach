import { getCurrentUser, json } from "../../_shared/auth.js";

function makeId(prefix) {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);

  let token = "";
  for (const byte of bytes) {
    token += byte.toString(16).padStart(2, "0");
  }

  return `${prefix}_${token}`;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function isChatMember(env, chatId, userId) {
  const row = await env.DB.prepare(
    `SELECT 1 AS ok
     FROM chat_members
     WHERE chat_id = ?
       AND user_id = ?
       AND left_at IS NULL
     LIMIT 1`
  )
    .bind(chatId, userId)
    .first();

  return Boolean(row);
}

export async function onRequestGet(context) {
  const user = await getCurrentUser(context.request, context.env);

  if (!user) {
    return json(
      {
        ok: false,
        error: "Not authenticated"
      },
      { status: 401 }
    );
  }

  const url = new URL(context.request.url);
  const chatId = String(url.searchParams.get("chat_id") || "").trim();
  const before = String(url.searchParams.get("before") || "").trim();
  const limitRaw = Number(url.searchParams.get("limit") || 50);
  const limit = Math.max(1, Math.min(100, Number.isFinite(limitRaw) ? limitRaw : 50));

  if (!chatId) {
    return json(
      {
        ok: false,
        error: "chat_id is required"
      },
      { status: 400 }
    );
  }

  const member = await isChatMember(context.env, chatId, user.id);

  if (!member) {
    return json(
      {
        ok: false,
        error: "Chat not found"
      },
      { status: 404 }
    );
  }

  const query = before
    ? `SELECT
        messages.id,
        messages.chat_id,
        messages.sender_user_id,
        messages.sender_device_id,
        messages.client_message_id,
        messages.body_ciphertext,
        messages.body_nonce,
        messages.body_algorithm,
        messages.body_version,
        messages.created_at,
        messages.edited_at,
        messages.deleted_at,
        users.username AS sender_username,
        users.display_name AS sender_display_name,
        users.avatar_url AS sender_avatar_url,
        users.verified AS sender_verified
      FROM messages
      JOIN users ON users.id = messages.sender_user_id
      WHERE messages.chat_id = ?
        AND datetime(messages.created_at) < datetime(?)
      ORDER BY datetime(messages.created_at) DESC
      LIMIT ?`
    : `SELECT
        messages.id,
        messages.chat_id,
        messages.sender_user_id,
        messages.sender_device_id,
        messages.client_message_id,
        messages.body_ciphertext,
        messages.body_nonce,
        messages.body_algorithm,
        messages.body_version,
        messages.created_at,
        messages.edited_at,
        messages.deleted_at,
        users.username AS sender_username,
        users.display_name AS sender_display_name,
        users.avatar_url AS sender_avatar_url,
        users.verified AS sender_verified
      FROM messages
      JOIN users ON users.id = messages.sender_user_id
      WHERE messages.chat_id = ?
      ORDER BY datetime(messages.created_at) DESC
      LIMIT ?`;

  const stmt = context.env.DB.prepare(query);
  const rows = before
    ? await stmt.bind(chatId, before, limit).all()
    : await stmt.bind(chatId, limit).all();

  const messages = (rows.results || []).reverse().map((row) => ({
    id: row.id,
    chat_id: row.chat_id,
    sender_user_id: row.sender_user_id,
    sender_device_id: row.sender_device_id,
    client_message_id: row.client_message_id,
    body_ciphertext: row.body_ciphertext,
    body_nonce: row.body_nonce,
    body_algorithm: row.body_algorithm,
    body_version: row.body_version,
    created_at: row.created_at,
    edited_at: row.edited_at,
    deleted_at: row.deleted_at,
    sender: {
      id: row.sender_user_id,
      username: row.sender_username,
      display_name: row.sender_display_name,
      avatar_url: row.sender_avatar_url,
      verified: Boolean(row.sender_verified)
    }
  }));

  return json({
    ok: true,
    messages
  });
}

export async function onRequestPost(context) {
  const user = await getCurrentUser(context.request, context.env);

  if (!user) {
    return json(
      {
        ok: false,
        error: "Not authenticated"
      },
      { status: 401 }
    );
  }

  const body = await readJson(context.request);

  if (!body) {
    return json(
      {
        ok: false,
        error: "Invalid JSON"
      },
      { status: 400 }
    );
  }

  const chatId = String(body.chat_id || "").trim();
  const ciphertext = String(body.body_ciphertext || body.ciphertext || "").trim();
  const nonce = body.body_nonce || body.nonce ? String(body.body_nonce || body.nonce) : null;
  const algorithm = String(body.body_algorithm || body.algorithm || "pending-client-e2ee").trim();
  const senderDeviceId = body.sender_device_id ? String(body.sender_device_id) : null;
  const clientMessageId = body.client_message_id ? String(body.client_message_id).slice(0, 120) : null;

  if (!chatId) {
    return json(
      {
        ok: false,
        error: "chat_id is required"
      },
      { status: 400 }
    );
  }

  if (!ciphertext || ciphertext.length > 12000) {
    return json(
      {
        ok: false,
        error: "body_ciphertext is required and must be under 12000 chars"
      },
      { status: 400 }
    );
  }

  const member = await isChatMember(context.env, chatId, user.id);

  if (!member) {
    return json(
      {
        ok: false,
        error: "Chat not found"
      },
      { status: 404 }
    );
  }

  if (senderDeviceId) {
    const device = await context.env.DB.prepare(
      `SELECT 1 AS ok
       FROM devices
       WHERE id = ?
         AND user_id = ?
         AND revoked_at IS NULL
       LIMIT 1`
    )
      .bind(senderDeviceId, user.id)
      .first();

    if (!device) {
      return json(
        {
          ok: false,
          error: "Invalid sender_device_id"
        },
        { status: 400 }
      );
    }
  }

  const messageId = makeId("msg");

  try {
    await context.env.DB.batch([
      context.env.DB.prepare(
        `INSERT INTO messages (
          id,
          chat_id,
          sender_user_id,
          sender_device_id,
          client_message_id,
          body_ciphertext,
          body_nonce,
          body_algorithm
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        messageId,
        chatId,
        user.id,
        senderDeviceId,
        clientMessageId,
        ciphertext,
        nonce,
        algorithm
      ),

      context.env.DB.prepare(
        `UPDATE chats
         SET
          updated_at = datetime('now'),
          last_message_at = datetime('now')
         WHERE id = ?`
      ).bind(chatId)
    ]);
  } catch (error) {
    if (clientMessageId) {
      const existing = await context.env.DB.prepare(
        `SELECT
          id,
          chat_id,
          sender_user_id,
          sender_device_id,
          client_message_id,
          body_ciphertext,
          body_nonce,
          body_algorithm,
          body_version,
          created_at,
          edited_at,
          deleted_at
         FROM messages
         WHERE chat_id = ?
           AND sender_user_id = ?
           AND client_message_id = ?
         LIMIT 1`
      )
        .bind(chatId, user.id, clientMessageId)
        .first();

      if (existing) {
        return json({
          ok: true,
          message: existing,
          deduped: true
        });
      }
    }

    throw error;
  }

  const message = await context.env.DB.prepare(
    `SELECT
      id,
      chat_id,
      sender_user_id,
      sender_device_id,
      client_message_id,
      body_ciphertext,
      body_nonce,
      body_algorithm,
      body_version,
      created_at,
      edited_at,
      deleted_at
     FROM messages
     WHERE id = ?
     LIMIT 1`
  )
    .bind(messageId)
    .first();

  return json({
    ok: true,
    message
  });
}
